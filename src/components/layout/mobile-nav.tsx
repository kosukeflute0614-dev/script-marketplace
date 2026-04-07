"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SerializedUser } from "@/types/user";
import { signOutAction } from "@/app/actions/auth";

type Props = {
  user: SerializedUser | null;
};

/**
 * スマホ用のハンバーガーメニュー。
 * - 右上のハンバーガーアイコンを押すと右からスライドイン
 * - リンクを押した時/外側を押した時に閉じる
 */
export function MobileNav({ user }: Props) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="メニューを開く">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-base">メニュー</SheetTitle>
          <SheetDescription className="sr-only">サイト内のリンクとアカウント操作</SheetDescription>
        </SheetHeader>
        <nav className="grid gap-1 px-2 py-4 text-sm">
          <NavLink href="/" onClick={close}>
            ホーム
          </NavLink>
          <NavLink href="/search" onClick={close}>
            台本を探す
          </NavLink>
          <NavLink href="/about" onClick={close}>
            脚本マーケットとは
          </NavLink>

          <div className="my-2 border-t border-border" />

          {user ? (
            <>
              <NavLink href="/mypage" onClick={close}>
                マイページ
              </NavLink>
              <NavLink href="/profile/edit" onClick={close}>
                プロフィール編集
              </NavLink>
              <div className="px-3 pt-2">
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" className="w-full">
                    ログアウト
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <>
              <NavLink href="/login" onClick={close}>
                ログイン
              </NavLink>
              <NavLink href="/register" onClick={close}>
                新規登録
              </NavLink>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function NavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-foreground hover:bg-muted block rounded-md px-3 py-2"
    >
      {children}
    </Link>
  );
}
