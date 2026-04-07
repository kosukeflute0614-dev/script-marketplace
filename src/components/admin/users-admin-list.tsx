"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { suspendUser, unsuspendUser } from "@/app/actions/admin";

type Item = {
  uid: string;
  email: string;
  userId: string;
  displayName: string;
  isAdmin: boolean;
  suspended: boolean;
};

export function UsersAdminList({ items }: { items: Item[] }) {
  const [list, setList] = useState(items);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function toggleSuspend(uid: string, currentlySuspended: boolean) {
    setPendingUid(uid);
    startTransition(async () => {
      const r = currentlySuspended ? await unsuspendUser(uid) : await suspendUser(uid);
      setPendingUid(null);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(currentlySuspended ? "停止解除しました" : "停止しました");
      setList((prev) =>
        prev.map((it) => (it.uid === uid ? { ...it, suspended: !currentlySuspended } : it)),
      );
      router.refresh();
    });
  }

  if (list.length === 0) return <p className="text-muted-foreground text-sm">ユーザーがありません。</p>;

  return (
    <div className="space-y-2">
      {list.map((u) => (
        <Card key={u.uid}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">
                {u.displayName}
                {u.isAdmin ? <span className="text-muted-foreground ml-2 text-xs">(管理者)</span> : null}
              </p>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                @{u.userId} · {u.email}
                {u.suspended ? <span className="text-destructive ml-2">停止中</span> : null}
              </p>
            </div>
            <Button
              variant={u.suspended ? "outline" : "destructive"}
              size="sm"
              disabled={u.isAdmin || pendingUid === u.uid}
              onClick={() => toggleSuspend(u.uid, u.suspended)}
            >
              {pendingUid === u.uid ? "処理中…" : u.suspended ? "停止解除" : "停止"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
