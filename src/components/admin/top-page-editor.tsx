"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { updateTopPageSections, type TopPageSectionInput } from "@/app/actions/admin";

type Props = { initial: TopPageSectionInput[] };

export function TopPageEditor({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<TopPageSectionInput[]>(initial);
  const [isPending, startTransition] = useTransition();

  function setField(idx: number, field: keyof TopPageSectionInput, value: string | number) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );
  }

  function addRow() {
    setItems((prev) => [...prev, { type: "newest", title: "新着台本", limit: 8 }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTopPageSections(items);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("トップページ設定を保存しました");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {items.map((it, idx) => (
        <Card key={idx}>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[140px_1fr_100px_auto]">
            <Input
              value={it.type}
              onChange={(e) => setField(idx, "type", e.target.value)}
              placeholder="type (newest/popular)"
              disabled={isPending}
            />
            <Input
              value={it.title}
              onChange={(e) => setField(idx, "title", e.target.value)}
              placeholder="表示タイトル"
              disabled={isPending}
            />
            <Input
              type="number"
              value={it.limit}
              onChange={(e) => setField(idx, "limit", Number(e.target.value))}
              placeholder="件数"
              min={1}
              disabled={isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(idx)}
              disabled={isPending}
              aria-label="削除"
            >
              <TrashIcon />
            </Button>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={addRow} disabled={isPending}>
          <PlusIcon /> セクションを追加
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
