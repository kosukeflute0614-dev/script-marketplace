"use client";

import { useStats } from "react-instantsearch";

export function SearchStats() {
  const { nbHits, processingTimeMS } = useStats();
  return (
    <p className="text-muted-foreground text-xs">
      {nbHits.toLocaleString()}件 ({processingTimeMS}ms)
    </p>
  );
}
