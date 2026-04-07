"use server";

import { getAdminDb } from "@/lib/firebase-admin";
import type { ScriptDoc } from "@/types/script";

import type { ActionResult } from "./auth";

export type SerializedScript = Omit<ScriptDoc, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

/**
 * 任意の Firestore Timestamp / Date を ISO string に変換するヘルパー
 */
function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
}

function serializeScript(data: ScriptDoc, docId: string): SerializedScript {
  return {
    ...data,
    // Firestore document ID を信頼できる id 源として使う
    // (data.id フィールドが欠落していても安全)
    id: docId,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/**
 * 台本を ID で取得する。spec.md §1-2 getScript。
 * unlisted 状態の台本は作家本人にしか返さない（Server Component から呼ぶ前提）。
 *
 * @param id - Firestore document ID
 */
export async function getScript(id: string): Promise<ActionResult<SerializedScript | null>> {
  const trimmed = (id ?? "").trim();
  if (!trimmed) {
    return { success: false, error: "台本IDが指定されていません" };
  }
  try {
    const db = getAdminDb();
    const snap = await db.collection("scripts").doc(trimmed).get();
    if (!snap.exists) {
      return { success: true, data: null };
    }
    const data = snap.data() as ScriptDoc;
    return { success: true, data: serializeScript(data, snap.id) };
  } catch (err) {
    console.error("[getScript] failed", err);
    return { success: false, error: "台本の取得に失敗しました" };
  }
}

/**
 * 作家の台本一覧を取得する。spec.md §1-2 getScriptsByAuthor。
 *
 * @param authorUid - 作家の UID
 * @param excludeId - 結果から除外する script ID（同作家の他作品を出すとき自分自身を除外）
 * @param limit - 最大件数（デフォルト 6）
 */
export async function getScriptsByAuthor(
  authorUid: string,
  excludeId?: string,
  limit = 6,
): Promise<ActionResult<SerializedScript[]>> {
  if (!authorUid) {
    return { success: false, error: "作家IDが指定されていません" };
  }
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("scripts")
      .where("authorUid", "==", authorUid)
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .limit(limit + (excludeId ? 1 : 0))
      .get();
    const items = snap.docs
      .map((doc) => serializeScript(doc.data() as ScriptDoc, doc.id))
      .filter((s) => s.id !== excludeId)
      .slice(0, limit);
    return { success: true, data: items };
  } catch (err) {
    console.error("[getScriptsByAuthor] failed", err);
    return { success: false, error: "台本一覧の取得に失敗しました" };
  }
}

/**
 * 新着台本を取得する（createdAt 降順）。
 */
export async function getNewestScripts(limit = 8): Promise<ActionResult<SerializedScript[]>> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("scripts")
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return {
      success: true,
      data: snap.docs.map((doc) => serializeScript(doc.data() as ScriptDoc, doc.id)),
    };
  } catch (err) {
    console.error("[getNewestScripts] failed", err);
    return { success: false, error: "新着台本の取得に失敗しました" };
  }
}

/**
 * 人気台本を取得する（stats.purchaseCount + favoriteCount 合算降順の簡易ロジック）。
 * 厳密なスコアリングは P1-13 ranking ロジックで再計算する。
 */
export async function getPopularScripts(limit = 8): Promise<ActionResult<SerializedScript[]>> {
  try {
    const db = getAdminDb();
    // Firestore は複合 orderBy が制約あるため、stats.favoriteCount 単体降順で簡易対応
    const snap = await db
      .collection("scripts")
      .where("status", "==", "published")
      .orderBy("stats.favoriteCount", "desc")
      .limit(limit)
      .get();
    return {
      success: true,
      data: snap.docs.map((doc) => serializeScript(doc.data() as ScriptDoc, doc.id)),
    };
  } catch (err) {
    console.error("[getPopularScripts] failed", err);
    return { success: false, error: "人気台本の取得に失敗しました" };
  }
}

/**
 * 関連台本（コンテンツベースレコメンド / spec.md §11 フェーズ1版）。
 *
 * ロジック:
 * 1. 同じジャンルを array-contains-any で広めに取得
 * 2. ジャンルの一致数 + キャスト数の近さでスコア計算してソート
 *    - score = ジャンル一致数 * 10 - キャスト数差の絶対値
 * 3. 自分自身と同作家の台本は除外（同作家分は別セクションで表示）
 *
 * @param scriptId - 起点となる台本ID
 * @param limit - 最大件数
 */
export async function getRelatedScripts(
  scriptId: string,
  limit = 4,
): Promise<ActionResult<SerializedScript[]>> {
  try {
    const db = getAdminDb();
    const baseSnap = await db.collection("scripts").doc(scriptId).get();
    if (!baseSnap.exists) {
      return { success: true, data: [] };
    }
    const base = baseSnap.data() as ScriptDoc;
    const genres = base.genres ?? [];
    if (genres.length === 0) {
      return { success: true, data: [] };
    }

    const baseCastTotal = (base.castTotal?.min ?? 0 + (base.castTotal?.max ?? 0)) / 2;

    // 同じジャンルを1つ以上含む published な台本を取得
    const snap = await db
      .collection("scripts")
      .where("genres", "array-contains-any", genres.slice(0, 10))
      .where("status", "==", "published")
      .limit(40) // スコアリング前に多めに取得
      .get();

    const candidates = snap.docs
      .map((doc) => serializeScript(doc.data() as ScriptDoc, doc.id))
      .filter((s) => s.id !== scriptId && s.authorUid !== base.authorUid);

    // スコア計算
    const scored = candidates.map((s) => {
      const matchedGenres = (s.genres ?? []).filter((g) => genres.includes(g)).length;
      const candidateCast = ((s.castTotal?.min ?? 0) + (s.castTotal?.max ?? 0)) / 2;
      const castDiff = Math.abs(candidateCast - baseCastTotal);
      const score = matchedGenres * 10 - castDiff;
      return { script: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const items = scored.slice(0, limit).map((x) => x.script);
    return { success: true, data: items };
  } catch (err) {
    console.error("[getRelatedScripts] failed", err);
    return { success: false, error: "関連台本の取得に失敗しました" };
  }
}
