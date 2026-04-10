"use client";

import { useRef, useState } from "react";
import { useSearchBox } from "react-instantsearch";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * IME 対応のフリーワード検索ボックス。
 *
 * 日本語 IME の変換中 (composing) は refine を呼ばず、
 * 変換確定 (compositionEnd) 時に一括で refine する。
 * これにより「春」を打とうとして「HあRう」になるバグを防ぐ。
 */
export function SearchBox() {
  const { query, refine, clear } = useSearchBox();
  const [localValue, setLocalValue] = useState(query);
  const isComposing = useRef(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLocalValue(v);
    // IME 変換中は Algolia に送らない
    if (!isComposing.current) {
      refine(v);
    }
  }

  function handleCompositionStart() {
    isComposing.current = true;
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
    isComposing.current = false;
    // 変換確定後の値で Algolia 検索を実行
    const v = e.currentTarget.value;
    setLocalValue(v);
    refine(v);
  }

  function handleClear() {
    setLocalValue("");
    clear();
  }

  // query が外部から変わった場合（URL 遷移等）に同期
  if (!isComposing.current && query !== localValue && query !== undefined) {
    setLocalValue(query);
  }

  return (
    <div className="relative">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={localValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="フリーワードで検索..."
        className="pl-9 pr-9"
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="クリア"
          onClick={handleClear}
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
