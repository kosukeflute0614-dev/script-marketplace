import { notFound, redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUserOrRedirect } from "@/lib/auth-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import type { ScriptDoc } from "@/types/script";
import { canonicalScriptPath } from "@/lib/script-url";

export const metadata = {
  title: "チェックアウト | 脚本マーケット",
};

type Props = {
  params: Promise<{ scriptId: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const me = await requireUserOrRedirect();
  const { scriptId } = await params;

  const db = getAdminDb();
  const scriptSnap = await db.collection("scripts").doc(scriptId).get();
  if (!scriptSnap.exists) notFound();
  const script = scriptSnap.data() as ScriptDoc;
  if (script.status !== "published") notFound();

  // 自分の台本は購入不可
  if (script.authorUid === me.uid) {
    redirect(canonicalScriptPath(script.slug, scriptId));
  }

  // 二重購入チェック
  const dupSnap = await db
    .collection("purchases")
    .where("buyerUid", "==", me.uid)
    .where("scriptId", "==", scriptId)
    .limit(1)
    .get();
  if (!dupSnap.empty) {
    redirect(`/mypage/purchased`);
  }

  const isFree = script.price === 0;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="font-heading mb-6 text-2xl font-bold">チェックアウト</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{script.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{script.authorDisplayName}</p>
          <div className="flex items-baseline justify-between">
            <p className="text-foreground text-2xl font-bold">
              {isFree ? "無料" : `¥${script.price.toLocaleString()}`}
            </p>
          </div>
          <CheckoutButton scriptId={scriptId} isFree={isFree} />
        </CardContent>
      </Card>
    </div>
  );
}
