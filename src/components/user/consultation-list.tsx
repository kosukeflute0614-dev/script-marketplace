"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeConsultation, type SerializedConsultation } from "@/app/actions/consultation";
import type { ConsultationStatus } from "@/types/consultation";

type Props = {
  myUid: string;
  consultations: SerializedConsultation[];
};

const STATUS_LABELS: Record<ConsultationStatus, string> = {
  unresponded: "未対応",
  in_progress: "対応中",
  consulting: "相談中",
  completed: "完了",
};

export function ConsultationList({ myUid, consultations }: Props) {
  // 自分の役割でグループ化
  const grouped: Record<ConsultationStatus, SerializedConsultation[]> = {
    unresponded: [],
    in_progress: [],
    consulting: [],
    completed: [],
  };
  for (const c of consultations) {
    const myStatus = (c.status[myUid] ?? "consulting") as ConsultationStatus;
    grouped[myStatus].push(c);
  }

  if (consultations.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        相談はまだありません。台本詳細から「上演許可の相談をする」を押すと開始できます。
      </p>
    );
  }

  // 表示順: 未対応 → 相談中 → 対応中 → 完了
  const sections: { key: ConsultationStatus; title: string }[] = [
    { key: "unresponded", title: "未対応" },
    { key: "consulting", title: "相談中" },
    { key: "in_progress", title: "対応中" },
    { key: "completed", title: "完了" },
  ];

  return (
    <div className="space-y-8">
      {sections.map(({ key, title }) =>
        grouped[key].length > 0 ? (
          <section key={key}>
            <h2 className="font-heading mb-3 text-base font-bold">
              {title}（{grouped[key].length}件）
            </h2>
            <div className="space-y-2">
              {grouped[key].map((c) => (
                <ConsultationItem key={c.id} consultation={c} myUid={myUid} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}

function ConsultationItem({
  consultation,
  myUid,
}: {
  consultation: SerializedConsultation;
  myUid: string;
}) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAuthor = consultation.authorUid === myUid;
  const partnerName = isAuthor ? "利用者" : "作家"; // 表示は最低限。リッチ化は別 Step
  const myStatus = (consultation.status[myUid] ?? "consulting") as ConsultationStatus;

  function handleComplete() {
    startTransition(async () => {
      const result = await completeConsultation(consultation.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("やり取りを完了しました");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-foreground line-clamp-1 text-sm font-medium">
            {consultation.scriptTitle}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {partnerName}との相談 · {STATUS_LABELS[myStatus]}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/chat/${consultation.chatId}`}>チャットを開く</Link>
          </Button>
          {myStatus !== "completed" ? (
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={isPending}>
              完了する
            </Button>
          ) : null}
        </div>
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>やり取りを完了しますか？</DialogTitle>
            <DialogDescription>
              この相談を完了として記録します。チャット自体は引き続き利用できます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              キャンセル
            </Button>
            <Button onClick={handleComplete} disabled={isPending}>
              {isPending ? "処理中…" : "完了する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
