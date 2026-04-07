import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-server";
import { signOutAction } from "@/app/actions/auth";

export const metadata = {
  title: "マイページ | 脚本マーケット",
};

/**
 * マイページの最小実装。
 * フェーズ1 Step3 時点ではログイン後の着地点として「ようこそ画面」だけを置く。
 * 購入済み/お気に入り/相談管理などの本機能は後続の Step で実装する。
 */
export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
