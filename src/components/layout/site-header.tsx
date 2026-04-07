import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SerializedUser } from "@/types/user";
import { signOutAction } from "@/app/actions/auth";

import { MobileNav } from "./mobile-nav";

type SiteHeaderProps = {
  user: SerializedUser | null;
};

/**
 * Common site header (Server Component).
 * - Logo (left)
 * - PC: nav + user actions on the right
 * - Mobile: hamburger drawer (MobileNav, Client Component)
 *
 * Tonality: light background, bottom border, sticky (CLAUDE.md / docs/demo-site)
 */
export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-heading text-foreground text-lg font-bold">
          脚本マーケット
        </Link>

        {/* PC ナビ */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/search" className="text-muted-foreground hover:text-foreground">
            台本を探す
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">
            脚本マーケットとは
          </Link>
          {user ? (
            <>
              <Link href="/mypage" className="text-muted-foreground hover:text-foreground">
                マイページ
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  ログアウト
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">ログイン</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">新規登録</Link>
              </Button>
            </>
          )}
        </nav>

        {/* スマホ: ハンバーガー */}
        <div className="md:hidden">
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
