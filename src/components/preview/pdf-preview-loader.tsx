"use client";

import dynamic from "next/dynamic";

// react-pdf (pdfjs-dist) はブラウザ専用 API に依存するため、
// SSR を無効にして Client-only で読み込む (BUG-008 対応)。
const PdfPreview = dynamic(
  () => import("@/components/preview/pdf-preview").then((m) => m.PdfPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">PDFビューアを読み込み中…</p>
      </div>
    ),
  },
);

type Props = {
  scriptId: string;
  pdfUrl: string;
  maxPages: number;
  isFreeFullText: boolean;
  title: string;
};

export function PdfPreviewLoader(props: Props) {
  return <PdfPreview {...props} />;
}
