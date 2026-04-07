"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  clearScriptHearingSheet,
  updateDefaultHearingSheet,
  updateScriptHearingSheet,
} from "@/app/actions/hearing-sheet";
import type { HearingSheetItem } from "@/types/script";

type Mode =
  | { kind: "default" }
  | { kind: "script"; scriptId: string };

type Props = {
  mode: Mode;
  initial: HearingSheetItem[];
};

const MAX_QUESTIONS = 30;

export function HearingSheetEditor({ mode, initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<HearingSheetItem[]>(
    initial.length > 0 ? initial : [{ order: 1, question: "" }],
  );
  const [isPending, startTransition] = useTransition();

  function setQuestion(idx: number, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, question: value } : it)));
  }

  function addRow() {
    if (items.length >= MAX_QUESTIONS) {
      toast.warning(`質問は最大${MAX_QUESTIONS}件です`);
      return;
    }
    setItems((prev) => [...prev, { order: prev.length + 1, question: "" }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i + 1 })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = items.filter((it) => it.question.trim()).map((it, i) => ({ order: i + 1, question: it.question.trim() }));
    // default モードは空保存OK（無効化）/ script モードは少なくとも1件必要
    if (cleaned.length === 0 && mode.kind !== "default") {
      toast.error("少なくとも1つの質問を入力してください");
      return;
    }
    startTransition(async () => {
      const result =
        mode.kind === "default"
          ? await updateDefaultHearingSheet(cleaned)
          : await updateScriptHearingSheet(mode.scriptId, cleaned);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        cleaned.length === 0 ? "ヒアリングシートを無効化しました" : "ヒアリングシートを保存しました",
      );
      router.refresh();
    });
  }

  function handleClear() {
    if (mode.kind !== "script") return;
    startTransition(async () => {
      const result = await clearScriptHearingSheet(mode.scriptId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("台本個別シートをクリアしました");
      setItems([{ order: 1, question: "" }]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {items.map((it, idx) => (
          <Card key={idx}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-muted-foreground w-6 text-sm">{idx + 1}.</span>
              <Input
                value={it.question}
                onChange={(e) => setQuestion(idx, e.target.value)}
                placeholder="質問を入力"
                disabled={isPending}
                className="flex-1"
                maxLength={200}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
                disabled={isPending || items.length <= 1}
                aria-label="削除"
              >
                <TrashIcon />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={addRow} disabled={isPending}>
          <PlusIcon /> 質問を追加
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中…" : "保存する"}
        </Button>
        {mode.kind === "script" ? (
          <Button type="button" variant="destructive" onClick={handleClear} disabled={isPending}>
            個別設定をクリア
          </Button>
        ) : null}
      </div>
    </form>
  );
}
