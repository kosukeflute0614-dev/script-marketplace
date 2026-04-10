"use client";

import { useTransition } from "react";
import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDownloadUrl, type PurchaseListItem } from "@/app/actions/purchase";

type Props = { items: PurchaseListItem[] };

export function PurchasedList({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        まだ購入した台本はありません。
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PurchaseRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function PurchaseRow({ item }: { item: PurchaseListItem }) {
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await getDownloadUrl(item.scriptId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.open(result.data!.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/scripts/${item.scriptId}`}
            className="text-foreground line-clamp-1 text-sm font-medium hover:underline"
          >
            {item.scriptTitle}
          </Link>
          <p className="text-muted-foreground mt-1 text-xs">
            {item.amount === 0 ? "無料" : `¥${item.amount.toLocaleString()}`}
            {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
          </p>
        </div>
        <Button onClick={handleDownload} disabled={isPending} size="sm">
          <DownloadIcon /> {isPending ? "準備中…" : "ダウンロード"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}
