import Link from "next/link";

/**
 * 全ページ共通のフッター。
 * - リンク集 + コピーライト
 * - 控えめな見た目（demo-site の参考デザイン準拠）
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border py-8">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 text-xs sm:flex-row sm:justify-between sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-foreground">
            脚本マーケットとは
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            プライバシーポリシー
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            お問い合わせ
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} 脚本マーケット</p>
      </div>
    </footer>
  );
}
