"use client";

import { usePagination } from "react-instantsearch";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SearchPagination() {
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine } = usePagination();
  if (nbPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isFirstPage}
        onClick={() => refine(currentRefinement - 1)}
        aria-label="前のページ"
      >
        <ChevronLeftIcon />
      </Button>
      <p className="text-muted-foreground text-xs">
        {currentRefinement + 1} / {nbPages}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLastPage}
        onClick={() => refine(currentRefinement + 1)}
        aria-label="次のページ"
      >
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
