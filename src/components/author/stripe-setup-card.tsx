"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLinkIcon } from "lucide-react";
import {
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/connect-js";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createConnectAccount,
  getConnectDashboardUrl,
  resetStripeConnection,
  syncStripeAccountStatus,
} from "@/app/actions/stripe";

type Props = {
  stripeOnboarded: boolean;
  hasStripeAccount: boolean;
};

export function StripeSetupCard({ stripeOnboarded, hasStripeAccount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [embeddedStarted, setEmbeddedStarted] = useState(false);
  const embeddedContainerRef = useRef<HTMLDivElement>(null);
  const connectInstanceRef = useRef<StripeConnectInstance | null>(null);

  const startEmbeddedOnboarding = useCallback(() => {
    startTransition(async () => {
      const result = await createConnectAccount();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const { clientSecret } = result.data!;
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk) {
        toast.error("Stripe の設定が見つかりません");
        return;
      }

      setEmbeddedStarted(true);

      const connectInstance = loadConnectAndInitialize({
        publishableKey: pk,
        fetchClientSecret: async () => clientSecret,
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#333333",
            fontFamily: "Noto Sans JP, sans-serif",
            borderRadius: "8px",
          },
        },
      });
      connectInstanceRef.current = connectInstance;

      const onboardingElement = connectInstance.create("account-onboarding");
      onboardingElement.setOnExit(() => {
        // Stripe 側のステータス反映に数秒かかる場合があるため、
        // 少し待ってからリトライ付きで同期する
        startTransition(async () => {
          toast.info("Stripe の状態を確認中…");
          let synced = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            // 1回目: 2秒待ち、2回目: 4秒、3回目: 6秒
            await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
            const result = await syncStripeAccountStatus();
            if (result.success && result.data?.stripeOnboarded) {
              synced = true;
              break;
            }
          }
          router.refresh();
          if (synced) {
            toast.success("Stripe 連携が完了しました！出品が可能です。");
          } else {
            toast.info("反映に時間がかかっています。数秒後にページを再読み込みしてください。");
          }
        });
      });

      if (embeddedContainerRef.current) {
        embeddedContainerRef.current.innerHTML = "";
        embeddedContainerRef.current.appendChild(onboardingElement);
      }
    });
  }, [router]);

  useEffect(() => {
    return () => {
      if (connectInstanceRef.current) {
        connectInstanceRef.current.logout();
        connectInstanceRef.current = null;
      }
    };
  }, []);

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

  function handleReset() {
    if (!window.confirm("Stripe 連携をリセットします。テスト用です。よろしいですか？")) return;
    startTransition(async () => {
      const result = await resetStripeConnection();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Stripe 連携をリセットしました");
      router.refresh();
    });
  }

  if (stripeOnboarded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe 連携: 完了 ✓</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            出品・売上の受取が可能な状態です。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openDashboard} disabled={isPending}>
              <ExternalLinkIcon /> Express ダッシュボードを開く
            </Button>
            <Button onClick={handleReset} variant="destructive" size="sm" disabled={isPending}>
              🧪 リセット（テスト用）
            </Button>
          </div>
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
      <CardContent className="space-y-4">
        {!embeddedStarted ? (
          <>
            <p className="text-muted-foreground text-sm">
              台本を出品して売上を受け取るには、決済アカウントの設定が必要です。
              <strong className="text-foreground">初回のみの手続き</strong>で、数分で完了します。
            </p>
            <ul className="text-muted-foreground list-inside list-disc text-xs">
              <li>この画面の中で手続きが完結します（別サイトには飛びません）</li>
              <li>テストモードではダミー情報で OK</li>
              <li>一度完了すればこの手続きは二度と不要です</li>
            </ul>
            <Button onClick={startEmbeddedOnboarding} disabled={isPending}>
              {isPending
                ? "準備中…"
                : hasStripeAccount
                  ? "オンボーディングを再開する"
                  : "決済アカウントを設定する"}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">
            下のフォームに必要事項を入力してください。完了したらこのページが自動で更新されます。
          </p>
        )}

        <div ref={embeddedContainerRef} className="min-h-[200px]" />
      </CardContent>
    </Card>
  );
}
