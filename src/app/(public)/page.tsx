import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScriptCard } from "@/components/script/script-card";
import { getNewestScripts, getPopularScripts } from "@/app/actions/scripts";
import type { SerializedScript } from "@/app/actions/scripts";
import { getAdminDb } from "@/lib/firebase-admin";

type TopPageSection = { type: string; title: string; limit: number };

async function loadTopPageSections(): Promise<TopPageSection[]> {
  try {
    const snap = await getAdminDb().collection("config").doc("platform").get();
    const data = snap.data() as { topPageSections?: TopPageSection[] } | undefined;
    return data?.topPageSections ?? [
      { type: "newest", title: "新着台本", limit: 8 },
      { type: "popular", title: "人気の台本", limit: 8 },
    ];
  } catch {
    return [
      { type: "newest", title: "新着台本", limit: 8 },
      { type: "popular", title: "人気の台本", limit: 8 },
    ];
  }
}

async function fetchSection(section: TopPageSection): Promise<SerializedScript[]> {
  switch (section.type) {
    case "newest": {
      const r = await getNewestScripts(section.limit);
      return r.success ? (r.data ?? []) : [];
    }
    case "popular": {
      const r = await getPopularScripts(section.limit);
      return r.success ? (r.data ?? []) : [];
    }
    default:
      return [];
  }
}

export default async function HomePage() {
  const sections = await loadTopPageSections();
  // 並列にすべてのセクションを取得
  const sectionsWithData = await Promise.all(
    sections.map(async (s) => ({ section: s, scripts: await fetchSection(s) })),
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* ヒーロー */}
      <section className="bg-card border-border border-b">
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

      {/* config 駆動のセクション */}
      {sectionsWithData.map(({ section, scripts }) => (
        <section key={section.type} className="mx-auto w-full max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-heading text-xl font-bold">{section.title}</h2>
            <Link
              href="/search"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              もっと見る →
            </Link>
          </div>
          {scripts.length === 0 ? (
            <p className="text-muted-foreground text-sm">まだ台本がありません。</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {scripts.map((s) => (
                <ScriptCard key={s.id} script={s} />
              ))}
            </div>
          )}
        </section>
      ))}

      {/* About */}
      <section className="bg-card border-border border-t">
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <h2 className="font-heading mb-6 text-center text-xl font-bold">脚本マーケットとは</h2>
          <ul className="text-foreground space-y-3 text-sm">
            <li>・条件検索で自分にぴったりの台本が見つかる</li>
            <li>・冒頭5ページを無料でプレビューしてから購入できる</li>
            <li>・上演許可の相談から請求書発行までこの場で完結</li>
          </ul>
        </div>
      </section>

      {/* 出品者向け CTA */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h2 className="font-heading mb-4 text-xl font-bold">出品してみませんか？</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          自身の脚本を多くの劇団・教育機関に届けましょう。
        </p>
        <Button asChild variant="outline">
          <Link href="/about">詳しくはこちら</Link>
        </Button>
      </section>
    </div>
  );
}
