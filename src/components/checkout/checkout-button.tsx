"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createCheckoutSession, createFreePurchase } from "@/app/actions/purchase";

type Props = {
  scriptId: string;
  isFree: boolean;
};

export function CheckoutButton({ scriptId, isFree }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isFree) {
        const result = await createFreePurchase(scriptId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("台本を取得しました");
        router.replace("/mypage/purchased");
        router.refresh();
      } else {
        const result = await createCheckoutSession(scriptId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        // Stripe Checkout ページへリダイレクト
        window.location.href = result.data!.url;
      }
    });
  }

  return (
    <Button onClick={handleClick} size="lg" className="w-full" disabled={isPending}>
      {isPending
        ? "処理中…"
        : isFree
          ? "無料で取得する"
          : "クレジットカードで購入する"}
    </Button>
  );
}
