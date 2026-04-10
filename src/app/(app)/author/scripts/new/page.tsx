import { redirect } from "next/navigation";

import { requireUserOrRedirect } from "@/lib/auth-server";
import { Card, CardContent } from "@/components/ui/card";
import { ScriptForm } from "@/components/script/script-form";

export const metadata = {
  title: "新規出品 | 脚本マーケット",
};

export default async function NewScriptPage() {
  const me = await requireUserOrRedirect();
  // Stripe 連携が完了していない場合は連携ページへ誘導
  if (!me.stripeOnboarded) {
    redirect("/author/stripe-setup");
  }
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">台本を出品する</h1>
      <Card className="mb-6">
        <CardContent className="text-muted-foreground p-4 text-xs">
          PDF・タイトル・あらすじ・キャスト・価格などを入力して出品します。出品後も編集や PDF 差し替えが可能です。
        </CardContent>
      </Card>
      <ScriptForm mode={{ kind: "create" }} />
    </div>
  );
}
