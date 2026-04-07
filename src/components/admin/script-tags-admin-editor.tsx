"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateScriptTagDefinitions,
  type ScriptTagDefinitionInput,
} from "@/app/actions/admin";

type Props = { initial: ScriptTagDefinitionInput[] };

export function ScriptTagsAdminEditor({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ScriptTagDefinitionInput[]>(initial);
  const [isPending, startTransition] = useTransition();

  function setField(idx: number, field: keyof ScriptTagDefinitionInput, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { id: "", label: "", category: "" }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = items.filter((it) => it.id.trim() && it.label.trim() && it.category.trim());
    startTransition(async () => {
      const result = await updateScriptTagDefinitions(cleaned);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("特性タグ定義を保存しました");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {items.map((it, idx) => (
        <Card key={idx}>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_120px_auto]">
            <Input
              value={it.id}
              onChange={(e) => setField(idx, "id", e.target.value)}
              placeholder="id"
              disabled={isPending}
            />
            <Input
              value={it.label}
              onChange={(e) => setField(idx, "label", e.target.value)}
              placeholder="表示名"
              disabled={isPending}
            />
            <Input
              value={it.category}
              onChange={(e) => setField(idx, "category", e.target.value)}
              placeholder="カテゴリ"
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
          <PlusIcon /> タグを追加
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
