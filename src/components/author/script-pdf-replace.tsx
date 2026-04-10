"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { updateScriptPdf } from "@/app/actions/scripts-edit";

type Props = { scriptId: string; currentVersion: number };

export function ScriptPdfReplace({ scriptId, currentVersion }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("PDF を選択してください");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pdf", file);
      const result = await updateScriptPdf(scriptId, fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`v${result.data?.version} に更新しました`);
      setFile(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-sm font-medium">PDF 差し替え</p>
        <p className="text-muted-foreground text-xs">
          現在のバージョン: v{currentVersion}。新しい PDF をアップロードすると v{currentVersion + 1} として保存されます。
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !file}>
            {isPending ? "送信中…" : "差し替える"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
