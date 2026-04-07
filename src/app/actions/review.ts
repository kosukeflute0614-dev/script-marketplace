"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import type { ReviewDoc, SerializedReview } from "@/types/review";

import type { ActionResult } from "./auth";

const MAX_COMMENT_LENGTH = 2000;

function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return "";
}

function serializeReview(data: ReviewDoc): SerializedReview {
  return {
    ...data,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function validateRating(rating: unknown): number | string {
  const n = Number(rating);
  if (!Number.isFinite(n)) return "評価は数値で入力してください";
  if (n < 1 || n > 5) return "評価は1〜5の範囲で入力してください";
  return Math.round(n);
}

/**
 * 購入者かどうかを確認する。
 * scripts/{scriptId} を購入した記録 (purchases) があるかで判定。
 */
async function isPurchaser(uid: string, scriptId: string): Promise<boolean> {
  const db = getAdminDb();
  const snap = await db
    .collection("purchases")
    .where("buyerUid", "==", uid)
    .where("scriptId", "==", scriptId)
    .limit(1)
    .get();
  return !snap.empty;
}

/**
 * scripts/{scriptId}/reviews を全件読み込み、stats.reviewCount と reviewAverage を再計算する。
 */
async function recalculateScriptStats(scriptId: string): Promise<void> {
  const db = getAdminDb();
  const reviewsSnap = await db.collection("scripts").doc(scriptId).collection("reviews").get();
  const total = reviewsSnap.size;
  const sum = reviewsSnap.docs.reduce((acc, doc) => acc + (doc.data() as ReviewDoc).rating, 0);
  const average = total > 0 ? sum / total : 0;
  await db.collection("scripts").doc(scriptId).update({
    "stats.reviewCount": total,
    "stats.reviewAverage": Math.round(average * 10) / 10,
  });
}

/**
 * レビューを投稿する。spec.md §1-8 createReview。
 * 購入者のみ。1ユーザー1台本につき1レビュー（reviewerUid をキーに upsert）。
 */
export async function createReview(
  scriptId: string,
  rating: number,
  comment?: string,
): Promise<ActionResult<{ reviewId: string }>> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  const ratingResult = validateRating(rating);
  if (typeof ratingResult === "string") return { success: false, error: ratingResult };
  const trimmedComment = (comment ?? "").trim();
  if (trimmedComment.length > MAX_COMMENT_LENGTH) {
    return { success: false, error: `コメントは${MAX_COMMENT_LENGTH}文字以下で入力してください` };
  }

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  // 購入者チェック
  const purchased = await isPurchaser(me.uid, scriptId);
  if (!purchased) {
    return { success: false, error: "購入した台本のみレビューできます" };
  }

  const db = getAdminDb();
  // 自分の台本へのレビューは禁止
  const scriptSnap = await db.collection("scripts").doc(scriptId).get();
  if (!scriptSnap.exists) {
    return { success: false, error: "台本が見つかりません" };
  }
  const script = scriptSnap.data() as { authorUid: string; status: string };
  if (script.authorUid === me.uid) {
    return { success: false, error: "自分の台本にはレビューできません" };
  }

  const reviewRef = db
    .collection("scripts")
    .doc(scriptId)
    .collection("reviews")
    .doc(me.uid);

  try {
    await reviewRef.set({
      reviewerUid: me.uid,
      reviewerDisplayName: me.displayName,
      rating: ratingResult,
      comment: trimmedComment,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await recalculateScriptStats(scriptId);
    return { success: true, data: { reviewId: me.uid } };
  } catch (err) {
    console.error("[createReview] failed", err);
    return { success: false, error: "レビューの投稿に失敗しました" };
  }
}

/**
 * 自分のレビューを更新する。spec.md §1-8 updateReview。
 */
export async function updateReview(
  scriptId: string,
  rating?: number,
  comment?: string,
): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const ref = db.collection("scripts").doc(scriptId).collection("reviews").doc(me.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return { success: false, error: "レビューが見つかりません" };
  }

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (rating !== undefined) {
    const ratingResult = validateRating(rating);
    if (typeof ratingResult === "string") return { success: false, error: ratingResult };
    update.rating = ratingResult;
  }
  if (comment !== undefined) {
    const trimmed = comment.trim();
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      return { success: false, error: `コメントは${MAX_COMMENT_LENGTH}文字以下で入力してください` };
    }
    update.comment = trimmed;
  }

  try {
    await ref.update(update);
    await recalculateScriptStats(scriptId);
    return { success: true };
  } catch (err) {
    console.error("[updateReview] failed", err);
    return { success: false, error: "レビューの更新に失敗しました" };
  }
}

/**
 * 自分のレビューを削除する。spec.md §1-8 deleteReview。
 */
export async function deleteReview(scriptId: string): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const ref = db.collection("scripts").doc(scriptId).collection("reviews").doc(me.uid);
  try {
    await ref.delete();
    await recalculateScriptStats(scriptId);
    return { success: true };
  } catch (err) {
    console.error("[deleteReview] failed", err);
    return { success: false, error: "レビューの削除に失敗しました" };
  }
}

/**
 * レビュー一覧を取得する。spec.md §1-8 getReviews。公開エンドポイント。
 */
export async function getReviews(
  scriptId: string,
  limit = 20,
): Promise<ActionResult<SerializedReview[]>> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("scripts")
      .doc(scriptId)
      .collection("reviews")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const items = snap.docs.map((doc) => serializeReview(doc.data() as ReviewDoc));
    return { success: true, data: items };
  } catch (err) {
    console.error("[getReviews] failed", err);
    return { success: false, error: "レビューの取得に失敗しました" };
  }
}

/**
 * 自分が指定台本に投稿したレビューを取得する（編集 UI 用）。
 */
export async function getMyReview(
  scriptId: string,
): Promise<ActionResult<SerializedReview | null>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  try {
    const snap = await getAdminDb()
      .collection("scripts")
      .doc(scriptId)
      .collection("reviews")
      .doc(me.uid)
      .get();
    if (!snap.exists) return { success: true, data: null };
    return { success: true, data: serializeReview(snap.data() as ReviewDoc) };
  } catch (err) {
    console.error("[getMyReview] failed", err);
    return { success: false, error: "レビューの取得に失敗しました" };
  }
}
