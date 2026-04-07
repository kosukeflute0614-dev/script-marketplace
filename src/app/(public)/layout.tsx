import { headers } from "next/headers";

import { SiteShell } from "@/components/layout/site-shell";
import { getCurrentUser } from "@/lib/auth-server";

/**
 * (public) 配下の共通レイアウト。
 * - /login と /register は AuthCard 自身がフルスクリーンの中央寄せ表示なので、
 *   ヘッダー/フッターを **付けず** に children をそのまま返す。
 * - それ以外の (public) 配下（トップ・検索・台本詳細・ユーザープロフィール・about）は
 *   SiteShell（ヘッダー + フッター）でラップする。
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (isAuthRoute) {
    return <>{children}</>;
  }

  const user = await getCurrentUser();
  return <SiteShell user={user}>{children}</SiteShell>;
}
