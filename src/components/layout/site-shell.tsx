import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import type { SerializedUser } from "@/types/user";

type SiteShellProps = {
  user: SerializedUser | null;
  children: React.ReactNode;
};

/**
 * ヘッダー + メインコンテンツ + フッターの共通シェル。
 * (public)/layout.tsx と (app)/layout.tsx の通常画面パスから利用する。
 */
export function SiteShell({ user, children }: SiteShellProps) {
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
