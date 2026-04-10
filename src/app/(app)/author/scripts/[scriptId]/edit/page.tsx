import { notFound } from "next/navigation";

import { requireUserOrRedirect } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { ScriptForm } from "@/components/script/script-form";
import { ScriptPdfReplace } from "@/components/author/script-pdf-replace";
import type { ScriptDoc } from "@/types/script";

export const metadata = {
  title: "出品編集 | 脚本マーケット",
};

type Props = {
  params: Promise<{ scriptId: string }>;
};

export default async function EditScriptPage({ params }: Props) {
  const me = await requireUserOrRedirect();
  const { scriptId } = await params;

  const snap = await getAdminDb().collection("scripts").doc(scriptId).get();
  if (!snap.exists) notFound();
  const script = snap.data() as ScriptDoc;
  if (script.authorUid !== me.uid) notFound();

  const initial = {
    title: script.title,
    slug: script.slug,
    synopsis: script.synopsis,
    genres: script.genres ?? [],
    castMin: script.castTotal?.min ?? 1,
    castMax: script.castTotal?.max ?? 1,
    castMale: script.castBreakdown?.male ?? 0,
    castFemale: script.castBreakdown?.female ?? 0,
    castUnspecified: script.castBreakdown?.unspecified ?? 1,
    duration: script.duration,
    performanceType: script.performanceType ?? [],
    targetAudience: script.targetAudience ?? [],
    themeTags: script.themeTags ?? [],
    scriptTags: script.scriptTags ?? [],
    price: script.price,
    isFreeFullText: script.isFreeFullText,
    thumbnailUrl: script.thumbnailUrl ?? "",
    feeSchedule: script.feeSchedule ?? [],
    performanceHistory: script.performanceHistory ?? [],
    authorComment: script.authorComment ?? "",
    pdfUrl: script.pdfUrl,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">{script.title} を編集</h1>
      <div className="mb-6">
        <ScriptPdfReplace scriptId={scriptId} currentVersion={script.currentVersion ?? 1} />
      </div>
      <ScriptForm mode={{ kind: "edit", scriptId, initial }} />
    </div>
  );
}
