import "server-only";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type SerializedUser,
  type UserDoc,
} from "@/types/user";

/** Session cookie name. Firebase Hosting と互換のため `__session` を使う。 */
export const SESSION_COOKIE_NAME = "__session";
/** Session 有効期限: 14日（Firebase Admin の上限）。ミリ秒。 */
export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

type DecodedSession = {
  uid: string;
  email: string;
  emailVerified: boolean;
  // Firebase の providerData は session cookie には載らないため、
  // firebase 側 sign_in_provider を読む
  signInProvider: string;
};

/**
 * リクエストの session cookie を検証して、デコード済みクレームを返す。
 * 無効/未ログインの場合は null。
 *
 * @param checkRevoked - 強制ログアウト後に拒否したい場合は true。デフォルト true（安全側）。
 */
export async function verifySession(checkRevoked = true): Promise<DecodedSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, checkRevoked);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      emailVerified: decoded.email_verified ?? false,
      signInProvider:
        (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider ?? "",
    };
  } catch {
    // 期限切れ・改ざん・revoke 済み等
    return null;
  }
}

/**
 * 現在ログイン中のユーザー（Firestore users ドキュメント + Auth クレームの結合）を返す。
 * ドキュメントが存在しない場合は **作成して** 返す（初回ログイン時の自動作成）。
 *
 * 未ログインの場合は null。
 *
 * 実装メモ:
 * - 内部で verifySession を呼ぶため、呼び出し側はこの関数のみを呼べばよい
 *   （verifySession を別途呼ぶと Admin SDK のセッション検証が二重に走る）。
 * - users ドキュメントの作成は冪等にするため `set({ ... }, { merge: true })` ではなく
 *   存在チェック → なければ create する形を取る（createSession 側との二重作成は両者ともに
 *   `exists` チェックを通すので安全）。
 */
export async function getCurrentUser(): Promise<SerializedUser | null> {
  const decoded = await verifySession();
  if (!decoded) return null;

  const db = getAdminDb();
  const userRef = db.collection("users").doc(decoded.uid);
  const snap = await userRef.get();

  let data: UserDoc;
  if (!snap.exists) {
    // 初回ログイン: Auth から取れる情報でドキュメントを生成
    const authUser = await getAdminAuth().getUser(decoded.uid);
    data = {
      uid: decoded.uid,
      email: authUser.email ?? decoded.email ?? "",
      displayName: authUser.displayName ?? "ユーザー",
      userId: "",
      iconUrl: authUser.photoURL ?? undefined,
      notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
      // FieldValue はクライアントに返さない（直後の get では不要）
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      // create() を使うことで、createSession と並走しても二重書き込みを防ぐ
      await userRef.create({
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        userId: data.userId,
        ...(data.iconUrl ? { iconUrl: data.iconUrl } : {}),
        notificationSettings: data.notificationSettings,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // create が ALREADY_EXISTS で失敗した場合は競合相手が先に作ったので、
      // もう一度 get して内容を採用する
      const code = (err as { code?: number | string } | null)?.code;
      if (code === 6 || code === "already-exists") {
        const retried = await userRef.get();
        if (retried.exists) {
          data = retried.data() as UserDoc;
        }
      } else {
        throw err;
      }
    }
  } else {
    data = snap.data() as UserDoc;
  }

  return {
    uid: data.uid,
    email: data.email,
    emailVerified: decoded.emailVerified,
    signInProvider: decoded.signInProvider,
    displayName: data.displayName,
    userId: data.userId,
    bio: data.bio,
    iconUrl: data.iconUrl,
    snsLinks: data.snsLinks,
    stripeOnboarded: data.stripeOnboarded ?? false,
    isAdmin: data.isAdmin ?? false,
    notificationSettings: data.notificationSettings ?? { ...DEFAULT_NOTIFICATION_SETTINGS },
  };
}

/**
 * ログイン必須のページ・Server Action から呼ぶ。
 * 未ログインの場合は例外を投げる（Server Action 用）。
 * Server Component では `redirect("/login")` を直接呼ぶこと。
 */
export async function requireUser(): Promise<SerializedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("ログインが必要です");
  }
  return user;
}

/**
 * メール確認が必要なユーザーかどうかを判定するヘルパー。
 * Google 等の OAuth 認証では `signInProvider !== "password"` のため常に false。
 *
 * (app)/layout.tsx, login/page.tsx, register/page.tsx 等で利用する。
 */
export function needsEmailVerification(user: SerializedUser): boolean {
  return user.signInProvider === "password" && !user.emailVerified;
}
