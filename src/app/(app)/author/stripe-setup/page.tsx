import { redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUserOrRedirect } from "@/lib/auth-server";
import { syncStripeAccountStatus } from "@/app/actions/stripe";
import { StripeSetupCard } from "@/components/author/stripe-setup-card";
import type { UserDoc } from "@/types/user";

export const metadata = {
  title: "Stripe 連携 | 脚本マーケット",
};

type Props = {
  searchParams: Promise<{ completed?: string; refresh?: string; sync?: string }>;
};

/**
 * Stripe Connect オンボーディング ページ。
 *
 * 戻り URL からのリダイレクト処理:
 * - ?completed=1 → Stripe オンボーディング完了 → syncStripeAccountStatus を呼んで stripeOnboarded を最新化
 *   結果を ?sync=ok|error で UI に伝える
 * - ?refresh=1 → AccountLink 期限切れ → 再度オンボーディングを開始するよう促す
 */
export default async function StripeSetupPage({ searchParams }: Props) {
  const me = await requireUserOrRedirect();
  const params = await searchParams;

  // 戻り URL からの場合は Stripe API を直接叩いて状態を最新化
  if (params.completed === "1") {
    const sync = await syncStripeAccountStatus();
    redirect(`/author/stripe-setup?sync=${sync.success ? "ok" : "error"}`);
  }

  const userSnap = await getAdminDb().collection("users").doc(me.uid).get();
  const userData = userSnap.data() as UserDoc | undefined;
  const stripeOnboarded = userData?.stripeOnboarded === true;
  const hasStripeAccount = !!userData?.stripeAccountId;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading mb-2 text-2xl font-bold">Stripe 連携</h1>
      <p className="text-muted-foreground mb-6 text-xs">
        出品と売上受取に必要な決済アカウントを設定します。
      </p>
      {params.sync === "error" ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm">
          Stripe との状態同期に失敗しました。Webhook が反映されるまで数分お待ちいただくか、
          ページを再読み込みしてください。
        </div>
      ) : params.sync === "ok" ? (
        <div className="border-border bg-card text-muted-foreground mb-4 rounded-lg border px-4 py-3 text-sm">
          Stripe との状態を同期しました。
        </div>
      ) : null}
      <StripeSetupCard
        stripeOnboarded={stripeOnboarded}
        hasStripeAccount={hasStripeAccount}
      />
    </div>
  );
}
