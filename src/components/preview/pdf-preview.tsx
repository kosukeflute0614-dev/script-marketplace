"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// pdf.js v4 の Web Worker は CDN 配信版を使う
// v4 は .mjs ではなく .js を使う
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

type Props = {
  scriptId: string;
  pdfUrl: string;
  maxPages: number;
  isFreeFullText: boolean;
  title: string;
};

// 6段階の拡大率（spec ワイヤーフレーム §2-4 準拠）
const ZOOM_LEVELS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export function PdfPreview({ scriptId, pdfUrl, maxPages, isFreeFullText, title }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomIdx, setZoomIdx] = useState<number>(1); // 1.0 (6段階の中で2番目)
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // ビューポート幅追跡
  useEffect(() => {
    function updateWidth() {
      const w = Math.min(900, window.innerWidth - 48);
      setContainerWidth(Math.max(280, w));
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const effectiveMaxPages = Math.min(numPages, maxPages);
  const isLastAllowedPage = currentPage >= effectiveMaxPages;
  // ロックされた次ページが存在するか（=「冒頭5ページまで」の案内を出すかの判定）
  const hasLockedNextPages = !isFreeFullText && currentPage >= maxPages && numPages > maxPages;

  function onLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setCurrentPage(1);
  }

  function onLoadError(e: Error) {
    console.error("[PdfPreview] load error", e);
    setError("PDF の読み込みに失敗しました");
  }

  return (
    <div className="bg-background flex h-[calc(100svh-3.5rem)] flex-col">
      {/* ヘッダー */}
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="戻る">
            <Link href={`/scripts/${scriptId}`}>
              <ArrowLeftIcon />
            </Link>
          </Button>
          <h1 className="text-foreground line-clamp-1 text-sm font-medium sm:text-base">{title}</h1>
        </div>
        <div className="text-muted-foreground text-xs">
          {numPages > 0 ? `${currentPage} / ${effectiveMaxPages}` : ""}
        </div>
      </div>

      {/* PDF 表示 - サブ背景色 (#F5F3EE) を使用 */}
      <div className="bg-card flex flex-1 items-start justify-center overflow-auto py-6">
        {error ? (
          <p className="text-destructive py-12 text-sm">{error}</p>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading={<p className="text-muted-foreground py-12 text-sm">読み込み中…</p>}
          >
            <Page
              pageNumber={Math.min(currentPage, effectiveMaxPages || 1)}
              width={containerWidth * ZOOM_LEVELS[zoomIdx]}
              renderTextLayer
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>

      {/* 5ページ制限の案内 */}
      {hasLockedNextPages && isLastAllowedPage ? (
        <div className="border-border bg-card border-t px-4 py-4 text-center text-xs">
          <p className="text-muted-foreground">
            プレビューは冒頭{maxPages}ページまでです。続きは購入してお読みください。
          </p>
          <Button asChild className="mt-2">
            <Link href={`/scripts/${scriptId}`}>購入ページへ戻る</Link>
          </Button>
        </div>
      ) : null}

      {/* コントロール */}
      <div className="border-border bg-background flex items-center justify-between gap-3 border-t px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="前のページ"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isLastAllowedPage}
            onClick={() => setCurrentPage((p) => Math.min(effectiveMaxPages, p + 1))}
            aria-label="次のページ"
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={zoomIdx <= 0}
            onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
            aria-label="縮小"
          >
            <ZoomOutIcon />
          </Button>
          <span className="text-muted-foreground w-12 text-center text-xs">
            {Math.round(ZOOM_LEVELS[zoomIdx] * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
            onClick={() => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
            aria-label="拡大"
          >
            <ZoomInIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
