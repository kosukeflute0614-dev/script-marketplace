import { notFound } from "next/navigation";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUserOrRedirect } from "@/lib/auth-server";
import { getHearingSheet } from "@/app/actions/hearing-sheet";
import { HearingSheetForm } from "@/components/hearing-sheet/hearing-sheet-form";
import type { ScriptDoc } from "@/types/script";

export const metadata = {
  title: "上演許可の相談 | 脚本マーケット",
};

type Props = {
  params: Promise<{ scriptId: string }>;
};

export default async function HearingSheetPage({ params }: Props) {
  const { scriptId } = await params;
  await requireUserOrRedirect();

  const db = getAdminDb();
  const snap = await db.collection("scripts").doc(scriptId).get();
  if (!snap.exists) {
    notFound();
  }
  const script = snap.data() as ScriptDoc;
  if (script.status !== "published") {
    notFound();
  }

  const sheetResult = await getHearingSheet(scriptId, script.authorUid);
  const questions = sheetResult.success ? (sheetResult.data?.questions ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">上演許可の相談</h1>
      <HearingSheetForm
        scriptId={snap.id}
        scriptTitle={script.title}
        authorDisplayName={script.authorDisplayName}
        questions={questions}
      />
    </div>
  );
}
