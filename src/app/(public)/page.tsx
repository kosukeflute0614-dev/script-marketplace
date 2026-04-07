import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ヒーロー */}
      <section className="bg-card border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            条件で探せる。すぐ読める。
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
            演劇台本を「探す・買う・上演許可を取る」ワンストップ・プラットフォーム
          </p>
          <Button asChild size="lg">
            <Link href="/search">台本を探す →</Link>
          </Button>
        </div>
      </section>

      {/* 仮セクション（後続 Step で実装） */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <p className="text-muted-foreground text-center text-sm">
          新着台本・人気の台本セクションはフェーズ6で実装します。
        </p>
      </section>
    </div>
  );
}
