import { getAdminDb } from "@/lib/firebase-admin";
import { requireUserOrRedirect } from "@/lib/auth-server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HearingSheetEditor } from "@/components/hearing-sheet/hearing-sheet-editor";
import type { UserDoc, HearingSheetQuestion } from "@/types/user";

export const metadata = {
  title: "デフォルトヒアリングシート | 脚本マーケット",
};

export default async function DefaultHearingSheetPage() {
  const me = await requireUserOrRedirect();

  const userSnap = await getAdminDb().collection("users").doc(me.uid).get();
  const userData = userSnap.data() as UserDoc | undefined;
  const initial: HearingSheetQuestion[] = userData?.hearingSheet ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">デフォルトヒアリングシート</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">これは何？</CardTitle>
          <CardDescription>
            上演許可の相談を受ける際に、利用者に最初に答えてもらう質問のテンプレートです。
            台本ごとに個別に設定することもできます（個別設定が優先されます）。
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
      <HearingSheetEditor mode={{ kind: "default" }} initial={initial} />
    </div>
  );
}
