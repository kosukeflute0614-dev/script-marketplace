"use client";

import { useSortBy } from "react-instantsearch";

const SORT_OPTIONS = [
  { value: "scripts", label: "おすすめ" },
  { value: "scripts_newest", label: "新着" },
  { value: "scripts_price_asc", label: "価格 (安い順)" },
  { value: "scripts_price_desc", label: "価格 (高い順)" },
  { value: "scripts_rating", label: "評価が高い順" },
];

export function SearchSort() {
  const { currentRefinement, refine, options } = useSortBy({
    items: SORT_OPTIONS,
  });
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="search-sort-select" className="text-muted-foreground text-xs">並び替え:</label>
      <select
        id="search-sort-select"
        value={currentRefinement}
        onChange={(e) => refine(e.target.value)}
        className="border-border bg-background rounded-md border px-2 py-1 text-xs"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
