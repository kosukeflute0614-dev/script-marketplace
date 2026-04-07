"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
  getCurrentUser,
  requireUser,
  verifySession,
} from "@/lib/auth-server";
import { validateUserId, userIdErrorMessage } from "@/lib/user-id";
import { DEFAULT_NOTIFICATION_SETTINGS, type UserDoc } from "@/types/user";

/**
 * Server Actions の共通戻り値型（spec.md §15）
 */
export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * クライアントの Firebase Auth で取得した ID トークンから session cookie を発行する。
 *
 * 呼び出しタイミング: ログイン/新規登録の成功直後、クライアントから idToken を渡してもらう。
 * 副作用: __session cookie をセットする。初回ログインなら users ドキュメントを作成する。
 */
export async function createSession(idToken: string): Promise<ActionResult> {
  if (!idToken) {
    return { success: false, error: "認証情報が不正です" };
  }
  try {
    // 1. ID トークンを検証
    const decoded = await getAdminAuth().verifyIdToken(idToken, true);

    // 2. session cookie を発行
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE_MS,
    });

    // 3. cookie をセット
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE_MS / 1000, // seconds
      path: "/",
    });

    // 4. users ドキュメントを作成（初回ログイン時のみ）
    //    create() は対象ドキュメントが既に存在すれば ALREADY_EXISTS を投げるため、
    //    事前に get() で存在確認をする必要がない（余分な Read を回避）。
    //    並走の getCurrentUser() が先に作っていた場合の ALREADY_EXISTS は無視する。
    const db = getAdminDb();
    const userRef = db.collection("users").doc(decoded.uid);
    const authUser = await getAdminAuth().getUser(decoded.uid);
    const newDoc: Omit<UserDoc, "createdAt" | "updatedAt"> = {
      uid: decoded.uid,
      email: authUser.email ?? "",
      displayName: authUser.displayName ?? "ユーザー",
      userId: "",
      iconUrl: authUser.photoURL ?? undefined,
      notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    };
    const cleaned = Object.fromEntries(
      Object.entries(newDoc).filter(([, v]) => v !== undefined),
    );
    try {
      await userRef.create({
        ...cleaned,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      const code = (err as { code?: number | string } | null)?.code;
      if (code !== 6 && code !== "already-exists") {
        throw err;
      }
      // 既に存在 → 想定内（再ログインまたは getCurrentUser 側で作成済み）
    }

    return { success: true };
  } catch (err) {
    console.error("[createSession] failed", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください" };
  }
}

/**
 * ログアウト。session cookie を削除し、Firebase 側のトークンも revoke する。
 */
export async function destroySession(): Promise<ActionResult> {
  try {
    const decoded = await verifySession(false);
    if (decoded?.uid) {
      try {
        await getAdminAuth().revokeRefreshTokens(decoded.uid);
      } catch {
        // revoke 失敗は致命的ではない
      }
    }
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return { success: true };
  } catch (err) {
    console.error("[destroySession] failed", err);
    return { success: false, error: "ログアウトに失敗しました" };
  }
}

/**
 * ログアウト + リダイレクト（フォームから直接呼ぶ用）
 */
export async function signOutAction(): Promise<never> {
  await destroySession();
  redirect("/login");
}

/**
 * ユーザーID を初回設定する。spec.md §4 のバリデーションを満たしていること。
 * 既に設定済みの場合は変更不可。
 *
 * 一意性は `userIds/{userId}` という補助コレクションで担保する：
 * 1. Firestore トランザクション内で `userIds/{userId}` の存在を確認
 * 2. 存在しなければ create（uid を保存）+ users/{uid} を update
 * これにより「同時に2人が同じ userId を取得」の TOCTOU 競合を防ぐ。
 */
export async function setUserId(rawUserId: string): Promise<ActionResult> {
  const userId = (rawUserId ?? "").trim().toLowerCase();
  const validationError = validateUserId(userId);
  if (validationError) {
    return { success: false, error: userIdErrorMessage(validationError) };
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  if (user.userId) {
    return { success: false, error: "ユーザーIDは変更できません" };
  }

  const db = getAdminDb();
  const userIdRef = db.collection("userIds").doc(userId);
  const userRef = db.collection("users").doc(user.uid);

  try {
    await db.runTransaction(async (tx) => {
      const userIdSnap = await tx.get(userIdRef);
      if (userIdSnap.exists) {
        // 自分が再実行した場合（既に同じ userId を確保済み）は冪等で OK
        const data = userIdSnap.data() as { uid?: string } | undefined;
        if (data?.uid === user.uid) return;
        throw new Error("DUPLICATE_USER_ID");
      }
      // userIds の予約 + users の userId 更新を 1 トランザクションで実施
      tx.create(userIdRef, {
        uid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(userRef, {
        userId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_USER_ID") {
      return { success: false, error: "このユーザーIDは既に使用されています" };
    }
    // create() の ALREADY_EXISTS（並行実行で別ユーザーが先に取った場合）も同様に扱う
    const code = (err as { code?: number | string } | null)?.code;
    if (code === 6 || code === "already-exists") {
      return { success: false, error: "このユーザーIDは既に使用されています" };
    }
    console.error("[setUserId] failed", err);
    return { success: false, error: "ユーザーIDの設定に失敗しました" };
  }
}

/**
 * プロフィール更新（displayName / bio / iconUrl / snsLinks）
 */
export type UpdateProfileInput = {
  displayName?: string;
  bio?: string;
  iconUrl?: string;
  twitter?: string;
  website?: string;
};

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  // バリデーション
  const displayName = input.displayName?.trim();
  if (displayName !== undefined) {
    if (displayName.length === 0) {
      return { success: false, error: "表示名を入力してください" };
    }
    if (displayName.length > 50) {
      return { success: false, error: "表示名は50文字以下で入力してください" };
    }
  }
  const bio = input.bio?.trim();
  if (bio !== undefined && bio.length > 500) {
    return { success: false, error: "自己紹介は500文字以下で入力してください" };
  }

  // URL の簡易バリデーション
  function isValidHttpUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  const iconUrl = input.iconUrl?.trim();
  if (iconUrl && !isValidHttpUrl(iconUrl)) {
    return { success: false, error: "アイコンURLの形式が正しくありません" };
  }
  const website = input.website?.trim();
  if (website && !isValidHttpUrl(website)) {
    return { success: false, error: "WebサイトURLの形式が正しくありません" };
  }
  const twitter = input.twitter?.trim();
  if (twitter && !/^[A-Za-z0-9_]{1,15}$/.test(twitter.replace(/^@/, ""))) {
    return { success: false, error: "X(Twitter)のユーザー名の形式が正しくありません" };
  }

  const db = getAdminDb();

  // dot-notation update でフィールドごとに差分更新する。
  // これにより「片方の SNS だけ送信」しても他方の既存値が消えない。
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (displayName !== undefined) update.displayName = displayName;
  if (bio !== undefined) update.bio = bio;
  if (iconUrl !== undefined) {
    update.iconUrl = iconUrl ? iconUrl : FieldValue.delete();
  }
  if (twitter !== undefined) {
    update["snsLinks.twitter"] = twitter ? twitter.replace(/^@/, "") : FieldValue.delete();
  }
  if (website !== undefined) {
    update["snsLinks.website"] = website ? website : FieldValue.delete();
  }

  try {
    await db.collection("users").doc(user.uid).update(update);
    return { success: true };
  } catch (err) {
    console.error("[updateProfile] failed", err);
    return { success: false, error: "プロフィールの更新に失敗しました" };
  }
}

/**
 * アカウント削除。Auth から削除し、users ドキュメントも削除する。
 * （関連サブコレクションのクリーンアップは Pass2 以降の管理画面/Cloud Functions で実装予定）
 */
export async function deleteAccount(): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  try {
    await getAdminAuth().deleteUser(user.uid);
    await getAdminDb().collection("users").doc(user.uid).delete();
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return { success: true };
  } catch (err) {
    console.error("[deleteAccount] failed", err);
    return { success: false, error: "アカウントの削除に失敗しました" };
  }
}

/**
 * 現在ログイン中のユーザー情報を取得する Server Action（クライアントから呼ぶ用）
 */
export async function getMe(): Promise<ActionResult<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();
  return { success: true, data: user };
}
