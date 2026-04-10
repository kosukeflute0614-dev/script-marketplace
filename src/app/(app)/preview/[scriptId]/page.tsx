import { notFound } from "next/navigation";

import { getPreviewInfo } from "@/app/actions/preview";
import { PdfPreviewLoader } from "@/components/preview/pdf-preview-loader";

export const metadata = {
  title: "プレビュー | 脚本マーケット",
};

type Props = {
  params: Promise<{ scriptId: string }>;
};

export default async function PreviewPage({ params }: Props) {
  const { scriptId } = await params;
  const result = await getPreviewInfo(scriptId);
  if (!result.success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-destructive text-sm">{result.error}</p>
      </div>
    );
  }
  if (!result.data) {
    notFound();
  }
  const info = result.data;
  return (
    <PdfPreviewLoader
      scriptId={info.scriptId}
      pdfUrl={info.pdfUrl}
      maxPages={info.maxPages}
      isFreeFullText={info.isFreeFullText}
      title={info.title}
    />
  );
}
