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
        startTransition(async () => {
          await syncStripeAccountStatus();
          router.refresh();
          toast.success("Stripe 連携の状態を更新しました");
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
