"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { forceUnlistScript } from "@/app/actions/admin";

type Item = {
  id: string;
  title: string;
  authorDisplayName: string;
  status: string;
  price: number;
};

type Props = { items: Item[] };

export function ScriptsAdminList({ items }: Props) {
  const [list, setList] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleUnlist(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await forceUnlistScript(id);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("台本を強制非公開化しました");
      setList((prev) => prev.map((it) => (it.id === id ? { ...it, status: "unlisted" } : it)));
      router.refresh();
    });
  }

  if (list.length === 0) return <p className="text-muted-foreground text-sm">台本がありません。</p>;

  return (
    <div className="space-y-2">
      {list.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-foreground line-clamp-1 text-sm font-medium">{s.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {s.authorDisplayName} · ¥{s.price.toLocaleString()} ·{" "}
                <span className={s.status === "published" ? "text-foreground" : "text-destructive"}>
                  {s.status}
                </span>
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={s.status !== "published" || pendingId === s.id}
              onClick={() => handleUnlist(s.id)}
            >
              {pendingId === s.id ? "処理中…" : "強制非公開"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
