"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { updateBadgeDefinitions, type BadgeDefinition } from "@/app/actions/admin";

type Props = { initial: BadgeDefinition[] };

export function BadgesAdminEditor({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<BadgeDefinition[]>(initial);
  const [isPending, startTransition] = useTransition();

  function setField(idx: number, field: keyof BadgeDefinition, value: string | boolean) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { id: "", label: "", filterable: true }]);
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = items.filter((it) => it.id.trim() && it.label.trim());
    startTransition(async () => {
      const result = await updateBadgeDefinitions(cleaned);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("バッジ定義を保存しました");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {items.map((it, idx) => (
        <Card key={idx}>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[120px_1fr_auto]">
            <Input
              value={it.id}
              onChange={(e) => setField(idx, "id", e.target.value)}
              placeholder="id (英数字)"
              disabled={isPending}
            />
            <Input
              value={it.label}
              onChange={(e) => setField(idx, "label", e.target.value)}
              placeholder="表示名"
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
          <PlusIcon /> バッジを追加
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
