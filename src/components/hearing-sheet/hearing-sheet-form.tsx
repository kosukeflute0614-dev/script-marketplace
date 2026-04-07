"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createConsultation } from "@/app/actions/consultation";
import type { HearingSheetItem } from "@/types/script";

type Props = {
  scriptId: string;
  scriptTitle: string;
  authorDisplayName: string;
  questions: HearingSheetItem[];
};

export function HearingSheetForm({ scriptId, scriptTitle, authorDisplayName, questions }: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function setAnswer(question: string, value: string) {
    setResponses((prev) => ({ ...prev, [question]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 必須チェック: すべての質問に回答
    const missing = questions.filter((q) => !(responses[q.question] ?? "").trim());
    if (missing.length > 0) {
      toast.error("すべての質問に回答してください");
      return;
    }
    startTransition(async () => {
      const result = await createConsultation({ scriptId, responses });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("相談を送信しました");
      router.replace(`/chat/${result.data?.chatId}`);
      router.refresh();
    });
  }

  if (questions.length === 0) {
    // ヒアリングシート未設定 → 直接チャット開設を案内する
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ヒアリングシート未設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            この作家はヒアリングシートを設定していません。直接チャットで相談を開始できます。
          </p>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await createConsultation({ scriptId, responses: {} });
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                toast.success("チャットを開設しました");
                router.replace(`/chat/${result.data?.chatId}`);
                router.refresh();
              });
            }}
          >
            {isPending ? "作成中…" : "チャットを開始する"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">『{scriptTitle}』の上演許可相談</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {authorDisplayName} さんが設定したヒアリングシートです。すべての項目に回答すると、
          作家とのチャットルームが開設されます。
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.order}>
            <CardContent className="space-y-2 p-5">
              <label className="block text-sm font-medium">
                {q.order}. {q.question}
              </label>
              <Input
                value={responses[q.question] ?? ""}
                onChange={(e) => setAnswer(q.question, e.target.value)}
                disabled={isPending}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "送信中…" : "回答を送信して相談する"}
      </Button>
    </form>
  );
}
