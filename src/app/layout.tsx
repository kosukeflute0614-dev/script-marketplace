import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// Noto Sans JP は next/font/google で `japanese` サブセットを直接指定できないため、
// `latin` のみを subsets に指定し、日本語グリフは Google Fonts の unicode-range で配信される。
// CSS 変数名は Tailwind v4 の `--font-sans` と衝突しないよう別名にし、
// globals.css 側の `@theme inline { --font-sans: var(--font-noto-sans-jp); }` で橋渡しする。
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "脚本マーケット",
  description: "演劇台本を「探す・買う・上演許可を取る」ワンストップ・プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
