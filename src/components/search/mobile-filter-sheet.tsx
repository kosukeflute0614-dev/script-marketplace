"use client";

import { useState } from "react";
import { useClearRefinements, useStats } from "react-instantsearch";
import { SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { SearchFilters } from "./search-filters";

/**
 * スマホ用の絞り込みモーダル (右からスライドイン)。
 * - 件数プレビューを上部に常時表示
 * - 「リセット」と「○件の台本を表示する」ボタン
 */
export function MobileFilterSheet() {
  const [open, setOpen] = useState(false);
  const { refine: clear } = useClearRefinements();
  const { nbHits } = useStats();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontalIcon /> 絞り込み
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] max-w-md p-0 sm:w-96">
        <SheetHeader className="border-border border-b px-6 py-4">
          <SheetTitle className="text-base">絞り込み条件</SheetTitle>
          <SheetDescription className="sr-only">検索フィルター</SheetDescription>
        </SheetHeader>
        <div className="max-h-[calc(100svh-9rem)] overflow-y-auto px-6 py-4">
          <SearchFilters />
        </div>
        <SheetFooter className="border-border bg-card border-t p-4">
          <Button type="button" variant="outline" onClick={() => clear()} className="w-full">
            リセット
          </Button>
          <Button type="button" onClick={() => setOpen(false)} className="w-full">
            {nbHits.toLocaleString()}件の台本を表示する
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
