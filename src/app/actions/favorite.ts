"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import type { ScriptDoc } from "@/types/script";
import type { SerializedScript } from "@/app/actions/scripts";

import type { ActionResult } from "./auth";

const FAVORITES_PAGE_SIZE = 30;

function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}

/**
 * お気に入り追加。spec.md §1-9 addFavorite。
 * users/{uid}/favorites/{scriptId} に doc を作成し、scripts.stats.favoriteCount をインクリメント。
 */
export async function addFavorite(scriptId: string): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const favRef = db.collection("users").doc(me.uid).collection("favorites").doc(scriptId);
  const scriptRef = db.collection("scripts").doc(scriptId);

  try {
    await db.runTransaction(async (tx) => {
      const favSnap = await tx.get(favRef);
      if (favSnap.exists) return; // 既にお気に入り
      const scriptSnap = await tx.get(scriptRef);
      if (!scriptSnap.exists) throw new Error("SCRIPT_NOT_FOUND");
      tx.set(favRef, {
        scriptId,
        addedAt: FieldValue.serverTimestamp(),
      });
      tx.update(scriptRef, {
        "stats.favoriteCount": FieldValue.increment(1),
      });
    });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message === "SCRIPT_NOT_FOUND") {
      return { success: false, error: "台本が見つかりません" };
    }
    console.error("[addFavorite] failed", err);
    return { success: false, error: "お気に入り追加に失敗しました" };
  }
}

/**
 * お気に入り削除。spec.md §1-9 removeFavorite。
 */
export async function removeFavorite(scriptId: string): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const favRef = db.collection("users").doc(me.uid).collection("favorites").doc(scriptId);
  const scriptRef = db.collection("scripts").doc(scriptId);

  try {
    await db.runTransaction(async (tx) => {
      const favSnap = await tx.get(favRef);
      if (!favSnap.exists) return;
      tx.delete(favRef);
      tx.update(scriptRef, {
        "stats.favoriteCount": FieldValue.increment(-1),
      });
    });
    return { success: true };
  } catch (err) {
    console.error("[removeFavorite] failed", err);
    return { success: false, error: "お気に入り削除に失敗しました" };
  }
}

/**
 * 自分が指定の台本をお気に入りしているかチェック。
 */
export async function isFavorite(scriptId: string): Promise<boolean> {
  if (!scriptId) return false;
  let me;
  try {
    me = await requireUser();
  } catch {
    return false;
  }
  const snap = await getAdminDb()
    .collection("users")
    .doc(me.uid)
    .collection("favorites")
    .doc(scriptId)
    .get();
  return snap.exists;
}

/**
 * お気に入り一覧を取得する。spec.md §1-9 getMyFavorites。
 * scripts コレクションを join した結果を返す。
 */
export async function getMyFavorites(): Promise<ActionResult<SerializedScript[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const favSnap = await db
    .collection("users")
    .doc(me.uid)
    .collection("favorites")
    .orderBy("addedAt", "desc")
    .limit(FAVORITES_PAGE_SIZE)
    .get();

  if (favSnap.empty) return { success: true, data: [] };

  const scriptIds = favSnap.docs.map((d) => d.id);
  // Firestore の getAll で並列取得
  const refs = scriptIds.map((id) => db.collection("scripts").doc(id));
  const scriptSnaps = await db.getAll(...refs);
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
  return { success: true, data: items };
}
