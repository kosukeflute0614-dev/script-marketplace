import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "購入完了 | 脚本マーケット",
};

/**
 * Stripe Checkout 完了後の成功画面。
 * session_id クエリはサーバー側での検証には使わない（Webhook で処理済み）。
 * ユーザーに「購入ありがとうございました」を表示するだけ。
 */
export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-lg">購入が完了しました</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            ご購入ありがとうございます。購入した台本は「購入済み台本」ページからダウンロードできます。
          </p>
          <p className="text-muted-foreground text-xs">
            ※ 台本の反映に数秒〜数十秒かかる場合があります。表示されない場合はページを再読み込みしてください。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/mypage/purchased">購入済み台本を見る</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">他の台本を探す</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
