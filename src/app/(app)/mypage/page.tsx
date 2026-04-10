import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUserOrRedirect } from "@/lib/auth-server";
import { signOutAction } from "@/app/actions/auth";

export const metadata = {
  title: "マイページ | 脚本マーケット",
};

/**
 * マイページの最小実装。
 * フェーズ1 Step3 時点ではログイン後の着地点として「ようこそ画面」だけを置く。
 * 購入済み/お気に入り/相談管理などの本機能は後続の Step で実装する。
 *
 * 未ログイン保護は (app)/layout.tsx で実施済み。requireUserOrRedirect は二重保護用。
 */
export default async function MyPage() {
  const user = await requireUserOrRedirect();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading mb-2 text-2xl font-bold">マイページ</h1>
      <p className="text-muted-foreground mb-8 text-sm">ようこそ、{user.displayName} さん</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="表示名" value={user.displayName} />
          <Row label="ユーザーID" value={user.userId} mono />
          <Row label="メール" value={user.email} />
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/profile/edit">プロフィールを編集</Link>
        </Button>
        {user.stripeOnboarded ? (
          <>
            <Button asChild>
              <Link href="/author/scripts">出品管理</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/author/scripts/new">新規出品</Link>
            </Button>
          </>
        ) : (
          <Button asChild variant="outline">
            <Link href="/author/stripe-setup">出品を始める（Stripe連携）</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/mypage/purchased">購入済み台本</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/mypage/favorites">お気に入り</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/mypage/consultations">相談管理</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/chat">メッセージ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/mypage/settings/notifications">通知設定</Link>
        </Button>
        {user.isAdmin ? (
          <Button asChild variant="outline">
            <Link href="/admin">管理画面</Link>
          </Button>
        ) : null}
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            ログアウト
          </Button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value || "（未設定）"}</span>
    </div>
  );
}
