"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import type { SavedSearchDoc, SavedSearchFilters, SerializedSavedSearch } from "@/types/saved-search";

import type { ActionResult } from "./auth";

const SAVED_SEARCHES_LIMIT = 20;

function serialize(doc: { id: string; data: () => SavedSearchDoc }): SerializedSavedSearch {
  const data = doc.data();
  let createdAt = "";
  const ts = data.createdAt;
  if (ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function") {
    createdAt = (ts.toDate() as Date).toISOString();
  } else if (ts instanceof Date) {
    createdAt = ts.toISOString();
  }
  return { id: doc.id, name: data.name, filters: data.filters ?? {}, createdAt };
}

/**
 * 検索条件を保存する。spec.md §1-3 saveSearch。
 * 1ユーザーあたり最大 20件 (spec §5)。
 */
export async function saveSearch(
  name: string,
  filters: SavedSearchFilters,
): Promise<ActionResult<{ savedSearchId: string }>> {
  const trimmedName = (name ?? "").trim();
  if (!trimmedName) return { success: false, error: "保存名を入力してください" };
  if (trimmedName.length > 50) return { success: false, error: "保存名は50文字以下で入力してください" };

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const col = db.collection("users").doc(me.uid).collection("savedSearches");
  // 上限チェック + 追加をトランザクション内で原子化 (レース条件対策)
  const ref = col.doc();
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(col);
      if (snap.size >= SAVED_SEARCHES_LIMIT) {
        throw new Error("LIMIT_EXCEEDED");
      }
      tx.set(ref, {
        id: ref.id,
        name: trimmedName,
        filters,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return { success: true, data: { savedSearchId: ref.id } };
  } catch (err) {
    if (err instanceof Error && err.message === "LIMIT_EXCEEDED") {
      return {
        success: false,
        error: `保存検索は${SAVED_SEARCHES_LIMIT}件までです。古いものを削除してください`,
      };
    }
    console.error("[saveSearch] failed", err);
    return { success: false, error: "保存に失敗しました" };
  }
}

/**
 * 保存された検索条件一覧を取得する。spec.md §1-3 getSavedSearches。
 */
export async function getSavedSearches(): Promise<ActionResult<SerializedSavedSearch[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const snap = await getAdminDb()
    .collection("users")
    .doc(me.uid)
    .collection("savedSearches")
    .orderBy("createdAt", "desc")
    .get();
  const items = snap.docs.map((d) =>
    serialize({ id: d.id, data: () => d.data() as SavedSearchDoc }),
  );
  return { success: true, data: items };
}

/**
 * 保存された検索条件を削除する。spec.md §1-3 deleteSavedSearch。
 */
export async function deleteSavedSearch(savedSearchId: string): Promise<ActionResult> {
  if (!savedSearchId) return { success: false, error: "ID が指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  try {
    await getAdminDb()
      .collection("users")
      .doc(me.uid)
      .collection("savedSearches")
      .doc(savedSearchId)
      .delete();
    return { success: true };
  } catch (err) {
    console.error("[deleteSavedSearch] failed", err);
    return { success: false, error: "削除に失敗しました" };
  }
}
