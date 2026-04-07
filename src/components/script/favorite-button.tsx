"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addFavorite, removeFavorite } from "@/app/actions/favorite";
import { cn } from "@/lib/utils";

type Props = {
  scriptId: string;
  initialFavorited: boolean;
  initialCount: number;
};

export function FavoriteButton({ scriptId, initialFavorited, initialCount }: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    // Optimistic update
    const next = !favorited;
    setFavorited(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    startTransition(async () => {
      const result = next
        ? await addFavorite(scriptId)
        : await removeFavorite(scriptId);
      if (!result.success) {
        // ロールバック
        setFavorited(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggle}
      disabled={isPending}
      aria-label={favorited ? "お気に入りから外す" : "お気に入りに追加"}
      aria-pressed={favorited}
    >
      <HeartIcon
        className={cn(
          "size-4",
          favorited ? "fill-destructive text-destructive" : "text-foreground",
        )}
      />
      <span>{count}</span>
    </Button>
  );
}
