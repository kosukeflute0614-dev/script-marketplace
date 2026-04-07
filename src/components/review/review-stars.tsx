"use client";

import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  rating: number;
  size?: "sm" | "md";
  /** 編集可能ならクリックで onChange */
  onChange?: (rating: number) => void;
};

export function ReviewStars({ rating, size = "md", onChange }: Props) {
  const stars = [1, 2, 3, 4, 5];
  const isInteractive = !!onChange;
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={!isInteractive}
          onClick={() => onChange?.(n)}
          className={cn(
            "shrink-0",
            isInteractive && "cursor-pointer hover:scale-110",
            !isInteractive && "cursor-default",
          )}
          aria-label={`${n}つ星`}
        >
          <StarIcon
            className={cn(
              size === "md" ? "size-5" : "size-4",
              n <= rating ? "fill-foreground text-foreground" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}
