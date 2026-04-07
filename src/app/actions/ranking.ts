"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { calculateRankings } from "@/lib/ranking";
import type { ScriptDoc } from "@/types/script";

import type { ActionResult } from "./auth";

/**
 * 全 published 台本のランキングを再計算して scripts.rankings フィールドを更新する。
 * Cloud Functions の日次バッチに乗せる前提のロジックだが、Pass1 では管理画面 / 手動実行で
 * 動作確認できるよう Server Action として公開する。
 *
 * 認可: 管理者のみ実行可能 (isAdmin=true)
 */
export async function recalculateAllRankings(): Promise<ActionResult<{ updated: number }>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  if (!me.isAdmin) {
    return { success: false, error: "管理者権限が必要です" };
  }

  const db = getAdminDb();
  const snap = await db
    .collection("scripts")
    .where("status", "==", "published")
    .get();

  const scripts = snap.docs.map((doc) => {
    const data = doc.data() as ScriptDoc;
    return {
      id: doc.id,
      genres: data.genres ?? [],
      targetAudience: data.targetAudience ?? [],
      stats: data.stats,
      status: data.status,
    };
  });

  const rankings = calculateRankings(scripts);

  // 各 script に対して rankings フィールドを書き戻す
  const writeBatchSize = 400;
  let written = 0;
  let batch = db.batch();
  let opsInBatch = 0;
  for (const doc of snap.docs) {
    const r = rankings.get(doc.id) ?? {};
    batch.update(doc.ref, {
      rankings: r,
      updatedAt: FieldValue.serverTimestamp(),
    });
    opsInBatch += 1;
    written += 1;
    if (opsInBatch >= writeBatchSize) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) {
    await batch.commit();
  }

  return { success: true, data: { updated: written } };
}
