import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser, needsEmailVerification } from "@/lib/auth-server";

/**
 * 認証必須エリアの共通レイアウト。
 *
 * リダイレクト規則:
 * 1. 未ログイン → /login
 * 2. メール/パスワード認証 + emailVerified=false → /verify-email
 * 3. ログイン済みで userId 未設定 → /setup/user-id（既に /setup/user-id にいる場合を除く）
 * 4. ログイン済みで userId 設定済み + /setup/user-id にいる → /mypage
 * 5. emailVerified 済みで /verify-email にいる → /mypage（または /setup/user-id）
 *
 * 注意: getCurrentUser() の中で verifySession() が呼ばれるため、ここでは
 * getCurrentUser() のみを呼ぶ。Admin SDK のセッション検証コストを 1 回に抑えるため。
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const headerStore = await headers();
  const pathnameHeader = headerStore.get("x-pathname");
  // x-pathname が欠落するケース（middleware 未通過の内部呼び出し等）に備え、
  // フォールバックは「リダイレクト判定をスキップして children を返す」。
  // children 側のページコンポーネント自体が必要に応じて getCurrentUser を呼んで
  // 自衛しているため、二重保護で安全。
  if (!pathnameHeader) {
    return <>{children}</>;
  }
  const pathname = pathnameHeader;

  const isOnUserIdSetup = pathname.startsWith("/setup/user-id");
  const isOnVerifyEmail = pathname.startsWith("/verify-email");

  // メール/パスワード認証はメール確認必須
  const requiresVerification = needsEmailVerification(user);

  if (requiresVerification) {
    if (!isOnVerifyEmail) {
      redirect("/verify-email");
    }
    return <>{children}</>;
  }

  // ここから requiresVerification === false
  if (isOnVerifyEmail) {
    // 確認済みなのに /verify-email にいる → 通常フローへ
    if (!user.userId) {
      redirect("/setup/user-id");
    }
    redirect("/mypage");
  }

  if (!user.userId && !isOnUserIdSetup) {
    redirect("/setup/user-id");
  }
  if (user.userId && isOnUserIdSetup) {
    redirect("/mypage");
  }

  return <>{children}</>;
}
