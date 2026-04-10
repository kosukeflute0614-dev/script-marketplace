import { Suspense } from "react";

import { SearchProvider } from "@/components/search/search-provider";
import { SearchBox } from "@/components/search/search-box";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchHits } from "@/components/search/search-hits";
import { SearchSort } from "@/components/search/search-sort";
import { SearchStats } from "@/components/search/search-stats";
import { SearchPagination } from "@/components/search/search-pagination";
import { MobileFilterSheet } from "@/components/search/mobile-filter-sheet";
import { StatusFilter } from "@/components/search/status-filter";

export const metadata = {
  title: "台本を探す | 脚本マーケット",
  description: "演劇台本をジャンル・人数・上演時間・価格・特性タグから検索できます",
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-heading mb-6 text-2xl font-bold">台本を探す</h1>
      <Suspense fallback={<div className="text-muted-foreground text-sm">読み込み中…</div>}>
        <SearchProvider>
          {/* 非公開台本を検索結果から除外 (Critical fix) */}
          <StatusFilter />
          <div className="mb-4">
            <SearchBox />
          </div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <SearchStats />
            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <MobileFilterSheet />
              </div>
              <SearchSort />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-[260px_1fr]">
            {/* PC サイドバーフィルター */}
            <aside className="hidden md:block">
              <SearchFilters />
            </aside>
            {/* 検索結果 */}
            <div>
              <SearchHits />
              <SearchPagination />
            </div>
          </div>
        </SearchProvider>
      </Suspense>
    </div>
  );
}
