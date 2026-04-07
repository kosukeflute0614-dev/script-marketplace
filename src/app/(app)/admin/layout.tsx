import Link from "next/link";

import { requireUserOrRedirect } from "@/lib/auth-server";
import { notFound } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/fees", label: "手数料設定" },
  { href: "/admin/badges", label: "バッジ管理" },
  { href: "/admin/script-tags", label: "特性タグ管理" },
  { href: "/admin/top-page", label: "トップページ設定" },
  { href: "/admin/sales", label: "売上レポート" },
  { href: "/admin/scripts", label: "台本管理" },
  { href: "/admin/users", label: "ユーザー管理" },
  { href: "/admin/reports", label: "通報管理" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUserOrRedirect();
  if (!me.isAdmin) {
    // 管理者でなければ存在しないページとして扱う (情報漏洩防止)
    notFound();
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside>
          <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
            管理メニュー
          </h2>
          <nav className="space-y-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground hover:bg-muted block rounded-md px-3 py-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
