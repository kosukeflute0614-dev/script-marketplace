"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { unlistScript, relistScript, type MyScriptListItem } from "@/app/actions/scripts-edit";
import { canonicalScriptPath } from "@/lib/script-url";

type Props = { items: MyScriptListItem[] };

export function MyScriptsList({ items }: Props) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggleStatus(id: string, currentStatus: string) {
    setPendingId(id);
    startTransition(async () => {
      const r = currentStatus === "published" ? await unlistScript(id) : await relistScript(id);
      setPendingId(null);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(currentStatus === "published" ? "非公開にしました" : "再公開しました");
      setList((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: currentStatus === "published" ? "unlisted" : "published" }
            : it,
        ),
      );
      router.refresh();
    });
  }

  if (list.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        まだ出品している台本はありません。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-foreground line-clamp-1 text-sm font-medium">{s.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                ¥{s.price.toLocaleString()} · v{s.currentVersion} ·{" "}
                <span
                  className={
                    s.status === "published" ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {s.status === "published" ? "公開中" : "非公開"}
                </span>
                {" · "}閲覧 {s.stats.viewCount} · 購入 {s.stats.purchaseCount} · ♡ {s.stats.favoriteCount}
                {s.stats.reviewCount > 0
                  ? ` · ★${s.stats.reviewAverage.toFixed(1)} (${s.stats.reviewCount})`
                  : ""}
                {s.totalRevenue > 0 ? ` · 売上 ¥${s.totalRevenue.toLocaleString()}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={canonicalScriptPath(s.slug, s.id)}>表示</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/author/scripts/${s.id}/edit`}>編集</Link>
              </Button>
              <Button
                size="sm"
                variant={s.status === "published" ? "destructive" : "default"}
                onClick={() => toggleStatus(s.id, s.status)}
                disabled={pendingId === s.id}
              >
                {pendingId === s.id
                  ? "処理中…"
                  : s.status === "published"
                    ? "非公開にする"
                    : "再公開する"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
