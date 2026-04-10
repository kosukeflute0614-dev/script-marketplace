"use client";

import { useSearchBox } from "react-instantsearch";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBox() {
  const { query, refine, clear } = useSearchBox();
  return (
    <div className="relative">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={query}
        onChange={(e) => refine(e.target.value)}
        placeholder="フリーワードで検索..."
        className="pl-9 pr-9"
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="クリア"
          onClick={clear}
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
