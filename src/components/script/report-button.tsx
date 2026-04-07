"use client";

import { useState, useTransition } from "react";
import { FlagIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createReport } from "@/app/actions/report";
import { REPORT_REASONS, type ReportTargetType } from "@/types/report";

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  size?: "sm" | "default";
};

export function ReportButton({ targetType, targetId, size = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason) {
      toast.error("理由を選択してください");
      return;
    }
    startTransition(async () => {
      const result = await createReport({ targetType, targetId, reason, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("通報を送信しました。確認後対応します。");
      setOpen(false);
      setReason("");
      setDescription("");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={() => setOpen(true)}
        aria-label="通報する"
        className="text-muted-foreground"
      >
        <FlagIcon /> 通報する
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>通報する</DialogTitle>
            <DialogDescription>
              不適切なコンテンツや規約違反を発見した場合、運営にご報告ください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">理由</label>
              <div className="grid gap-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">詳細（任意）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                className="border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "送信中…" : "送信する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
