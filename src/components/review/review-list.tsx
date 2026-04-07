import { Card, CardContent } from "@/components/ui/card";
import type { SerializedReview } from "@/types/review";

import { ReviewStars } from "./review-stars";

type Props = {
  reviews: SerializedReview[];
};

export function ReviewList({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">まだレビューはありません。</p>
    );
  }
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <Card key={r.reviewerUid}>
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-foreground text-sm font-medium">{r.reviewerDisplayName}</p>
              <p className="text-muted-foreground text-xs">{formatDate(r.createdAt)}</p>
            </div>
            <div className="mt-1">
              <ReviewStars rating={r.rating} size="sm" />
            </div>
            {r.comment ? (
              <p className="text-foreground mt-2 text-sm whitespace-pre-wrap">{r.comment}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}
