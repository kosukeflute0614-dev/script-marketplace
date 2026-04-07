import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteShell } from "@/components/layout/site-shell";
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
 * 表示規則:
 * - /setup/user-id と /verify-email は AuthCard でフルスクリーン表示するため、
 *   ヘッダー/フッターを **付けず** に children をそのまま返す。
 * - それ以外（/mypage, /profile/edit, /author/*, /chat 等）は SiteShell でラップ。
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
  // x-pathname は middleware が必ずセットするはずだが、内部 RSC リクエストや
  // ビルド時評価などで欠落する可能性に備える。
  // ★ 認可リダイレクトは pathname が無くても **必ず実施する**。
  //   pathname が無い場合は「現在地不明」として扱い、リダイレクト先の判定にだけ
  //   使う（リダイレクト不要な状態なら children をそのまま返す）。
  const pathname = pathnameHeader ?? "";
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

  // /setup/user-id は AuthCard でフルスクリーン表示するためシェルなし
  if (isOnUserIdSetup) {
    return <>{children}</>;
  }

  return <SiteShell user={user}>{children}</SiteShell>;
}
