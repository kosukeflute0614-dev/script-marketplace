"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const googleProvider = new GoogleAuthProvider();

export type AuthClientResult =
  | { success: true; idToken: string; user: FirebaseUser }
  | { success: false; error: string };

/** Firebase Auth エラーコードを日本語メッセージへ変換 */
function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに登録されています";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません";
    case "auth/operation-not-allowed":
      return "この認証方式は現在利用できません";
    case "auth/weak-password":
      return "パスワードは6文字以上で入力してください";
    case "auth/user-disabled":
      return "このアカウントは停止されています";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません";
    case "auth/popup-closed-by-user":
      return "ログインがキャンセルされました";
    case "auth/popup-blocked":
      return "ポップアップがブロックされました。ブラウザの設定をご確認ください";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく経ってから再度お試しください";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました";
    default:
      return "認証エラーが発生しました。時間をおいて再度お試しください";
  }
}

function toError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return authErrorMessage(String((err as { code: string }).code));
  }
  return "予期しないエラーが発生しました";
}

export async function signInWithGoogle(): Promise<AuthClientResult> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const idToken = await credential.user.getIdToken(true);
    return { success: true, idToken, user: credential.user };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthClientResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken(true);
    return { success: true, idToken, user: credential.user };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}

export async function registerWithEmailClient(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthClientResult> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await firebaseUpdateProfile(credential.user, { displayName });
    }
    // 自動でメール確認メールを送信
    try {
      await firebaseSendEmailVerification(credential.user);
    } catch {
      // 確認メール送信に失敗しても登録自体は成功とする
    }
    const idToken = await credential.user.getIdToken(true);
    return { success: true, idToken, user: credential.user };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}

export async function resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: "ログイン状態を取得できませんでした" };
    }
    await firebaseSendEmailVerification(user);
    return { success: true };
  } catch (err) {
    return { success: false, error: toError(err) };
  }
}

export async function signOutClient(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    // 失敗しても Server 側 cookie は別途消される
  }
}

/** 現在の Firebase User を強制リフレッシュして emailVerified を再取得する */
export async function reloadCurrentUser(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
}

/** 現在の ID トークンを取得する（必要に応じて Server 側に送る用） */
export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
