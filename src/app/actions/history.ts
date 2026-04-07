"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser, getCurrentUser } from "@/lib/auth-server";
import type { ScriptDoc } from "@/types/script";
import type { SerializedScript } from "@/app/actions/scripts";

import type { ActionResult } from "./auth";

const HISTORY_MAX_ENTRIES = 100;
const HISTORY_PAGE_SIZE = 50;

function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}

/**
 * 閲覧履歴を記録する（最大 100 件 / spec.md §5）。
 *
 * - 同じ scriptId の既存エントリは viewedAt を更新（重複は作らない）
 * - 100 件を超えたら最古を1件削除
 *
 * Server Component から呼ぶことを想定（fire-and-forget）。エラーは無視。
 */
export async function recordHistory(scriptId: string): Promise<void> {
  if (!scriptId) return;
  const me = await getCurrentUser();
  if (!me) return; // 未ログインなら何もしない
  const db = getAdminDb();
  const historyCol = db.collection("users").doc(me.uid).collection("history");
  const ref = historyCol.doc(scriptId);
  try {
    await ref.set({
      scriptId,
      viewedAt: FieldValue.serverTimestamp(),
    });
    // 100 件を超えていたら古いものを削除
    const allSnap = await historyCol.orderBy("viewedAt", "desc").get();
    if (allSnap.size > HISTORY_MAX_ENTRIES) {
      const toDelete = allSnap.docs.slice(HISTORY_MAX_ENTRIES);
      const batch = db.batch();
      toDelete.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error("[recordHistory] failed", err);
  }
}

/**
 * 自分の閲覧履歴を取得する（新しい順）。
 */
export async function getMyHistory(): Promise<ActionResult<SerializedScript[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const histSnap = await db
    .collection("users")
    .doc(me.uid)
    .collection("history")
    .orderBy("viewedAt", "desc")
    .limit(HISTORY_PAGE_SIZE)
    .get();

  if (histSnap.empty) return { success: true, data: [] };

  const scriptIds = histSnap.docs.map((d) => d.id);
  const refs = scriptIds.map((id) => db.collection("scripts").doc(id));
  const scriptSnaps = await db.getAll(...refs);

  // 履歴の順序を保つために id ごとに index を持っておく
  const orderMap = new Map(scriptIds.map((id, i) => [id, i]));
  const items: SerializedScript[] = [];
  for (const snap of scriptSnaps) {
    if (!snap.exists) continue;
    const data = snap.data() as ScriptDoc;
    items.push({
      ...data,
      id: snap.id,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    });
  }
  items.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  return { success: true, data: items };
}
