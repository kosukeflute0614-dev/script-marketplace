"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { updateFeeRate, updatePayoutFee } from "@/app/actions/admin";

type Props = {
  initialFeeRate: number;
  initialPayoutFee: number;
};

export function FeesForm({ initialFeeRate, initialPayoutFee }: Props) {
  const router = useRouter();
  const [feeRate, setFeeRate] = useState(String(initialFeeRate));
  const [payoutFee, setPayoutFee] = useState(String(initialPayoutFee));
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r1 = await updateFeeRate(Number(feeRate));
      if (!r1.success) {
        toast.error(r1.error);
        return;
      }
      const r2 = await updatePayoutFee(Number(payoutFee));
      if (!r2.success) {
        toast.error(r2.error);
        return;
      }
      toast.success("手数料設定を保存しました");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium">プラットフォーム手数料率（0〜1）</label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              disabled={isPending}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              現在: {(Number(feeRate) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">振込手数料（円）</label>
            <Input
              type="number"
              step="1"
              min="0"
              value={payoutFee}
              onChange={(e) => setPayoutFee(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中…" : "保存する"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
