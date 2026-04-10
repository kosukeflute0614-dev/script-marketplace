"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createConnectAccount,
  getConnectDashboardUrl,
} from "@/app/actions/stripe";

type Props = {
  stripeOnboarded: boolean;
  hasStripeAccount: boolean;
};

export function StripeSetupCard({ stripeOnboarded, hasStripeAccount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function startOnboarding() {
    startTransition(async () => {
      const result = await createConnectAccount();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Stripe オンボーディングページへリダイレクト (同タブ)
      window.location.href = result.data!.url;
    });
  }

  function openDashboard() {
    startTransition(async () => {
      const result = await getConnectDashboardUrl();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.open(result.data!.url, "_blank", "noopener,noreferrer");
    });
  }

  function refresh() {
    router.refresh();
  }

  if (stripeOnboarded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe 連携: 完了 ✓</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            出品・売上の受取が可能な状態です。Express ダッシュボードで売上明細・振込履歴・本人情報を確認・編集できます。
          </p>
          <Button onClick={openDashboard} disabled={isPending}>
            <ExternalLinkIcon /> Express ダッシュボードを開く
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Stripe 連携: {hasStripeAccount ? "オンボーディング未完了" : "未連携"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          台本を出品して売上を受け取るには、Stripe Connect への連携が必要です。
          Stripe の画面で本人情報・銀行口座を登録すると完了します（テストモードではダミー情報で OK）。
        </p>
        <ul className="text-muted-foreground list-inside list-disc text-xs">
          <li>個人事業主・法人どちらも可</li>
          <li>登録には数分〜10分程度</li>
          <li>連携後はいつでも Express ダッシュボードから情報変更可能</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button onClick={startOnboarding} disabled={isPending}>
            {isPending
              ? "準備中…"
              : hasStripeAccount
                ? "オンボーディングを再開する"
                : "Stripe 連携を開始する"}
          </Button>
          {hasStripeAccount ? (
            <Button variant="outline" onClick={refresh} disabled={isPending}>
              状態を再取得
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
