"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveReport } from "@/app/actions/report";
import type { SerializedReport } from "@/types/report";

const STATUS_LABEL: Record<string, string> = {
  pending: "未対応",
  resolved: "対応済み",
  dismissed: "却下",
};

const TYPE_LABEL: Record<string, string> = {
  script: "台本",
  review: "レビュー",
  message: "メッセージ",
  user: "ユーザー",
};

type Props = { reports: SerializedReport[] };

export function ReportsAdminList({ reports }: Props) {
  const [list, setList] = useState(reports);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleResolve(id: string, action: "resolved" | "dismissed") {
    setPendingId(id);
    startTransition(async () => {
      const r = await resolveReport(id, action);
      setPendingId(null);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(action === "resolved" ? "対応済みにしました" : "却下しました");
      setList((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: action } : it)),
      );
      router.refresh();
    });
  }

  if (list.length === 0) {
    return <p className="text-muted-foreground text-sm">通報はありません。</p>;
  }

  return (
    <div className="space-y-3">
      {list.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-foreground text-sm font-medium">
                  {TYPE_LABEL[r.targetType] ?? r.targetType}
                </span>
                <span className="text-muted-foreground text-xs">id: {r.targetId}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "pending"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{formatDate(r.createdAt)}</p>
            </div>
            <div className="text-sm">
              <p>
                <span className="text-muted-foreground">理由:</span> {r.reason}
              </p>
              {r.description ? (
                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{r.description}</p>
              ) : null}
            </div>
            {r.status === "pending" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleResolve(r.id, "resolved")}
                  disabled={pendingId === r.id}
                >
                  対応済みにする
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(r.id, "dismissed")}
                  disabled={pendingId === r.id}
                >
                  却下する
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ja-JP");
}
