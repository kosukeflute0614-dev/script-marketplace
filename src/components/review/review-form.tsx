"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createReview, deleteReview, updateReview } from "@/app/actions/review";
import type { SerializedReview } from "@/types/review";

import { ReviewStars } from "./review-stars";

type Props = {
  scriptId: string;
  initial: SerializedReview | null;
};

export function ReviewForm({ scriptId, initial }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [comment, setComment] = useState<string>(initial?.comment ?? "");
  const [isPending, startTransition] = useTransition();
  const isEditing = !!initial;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("評価を選択してください");
      return;
    }
    startTransition(async () => {
      const result = isEditing
        ? await updateReview(scriptId, rating, comment)
        : await createReview(scriptId, rating, comment);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEditing ? "レビューを更新しました" : "レビューを投稿しました");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteReview(scriptId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("レビューを削除しました");
      setRating(0);
      setComment("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">あなたの評価</p>
            <ReviewStars rating={rating} onChange={setRating} />
          </div>
          <div>
            <label htmlFor="review-comment" className="mb-2 block text-sm font-medium">
              コメント（任意）
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              className="border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "送信中…" : isEditing ? "更新する" : "投稿する"}
            </Button>
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                削除する
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
