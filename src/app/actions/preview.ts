"use server";

import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import type { ScriptDoc } from "@/types/script";

import type { ActionResult } from "./auth";

const PREVIEW_URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export type PreviewInfo = {
  pdfUrl: string;
  /** プレビュー可能なページ数（無料公開なら全ページ、それ以外は5ページまで） */
  maxPages: number;
  isFreeFullText: boolean;
  title: string;
  scriptId: string;
};

/**
 * 台本プレビュー用の署名付き URL を発行する。
 *
 * 注意: Pass1 では full PDF の signed URL を返し、クライアント (react-pdf) 側で
 * `maxPages` までしか描画しない。理論上 URL を直接叩けば全ページダウンロード可能だが、
 * Pass1 は seed PDF (placeholder) であり実害なし。
 * Pass2 で実台本を扱う前にサーバー側で最初の N ページのみを抽出する仕組みに置き換える予定
 * （docs/known-issues.md に記録）。
 */
export async function getPreviewInfo(
  scriptId: string,
): Promise<ActionResult<PreviewInfo | null>> {
  const trimmed = (scriptId ?? "").trim();
  if (!trimmed) {
    return { success: false, error: "台本IDが指定されていません" };
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("scripts").doc(trimmed).get();
    if (!snap.exists) {
      return { success: true, data: null };
    }
    const script = snap.data() as ScriptDoc;
    if (script.status !== "published") {
      // 非公開台本は「存在しない」扱いにして情報漏洩を防ぐ
      return { success: true, data: null };
    }

    const bucket = getAdminStorage().bucket();
    const file = bucket.file(script.pdfUrl);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + PREVIEW_URL_EXPIRY_MS,
    });

    return {
      success: true,
      data: {
        pdfUrl: url,
        maxPages: script.isFreeFullText ? Number.MAX_SAFE_INTEGER : 5,
        isFreeFullText: script.isFreeFullText,
        title: script.title,
        scriptId: snap.id,
      },
    };
  } catch (err) {
    console.error("[getPreviewInfo] failed", err);
    return { success: false, error: "プレビュー情報の取得に失敗しました" };
  }
}
