"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { generateSlug, slugCandidates } from "@/lib/slug";
import { GENRES, PERFORMANCE_TYPES, TARGET_AUDIENCES } from "@/lib/script-tags";
import {
  INITIAL_SCRIPT_STATS,
  type CastBreakdown,
  type CastTotal,
  type FeeScheduleItem,
  type PerformanceHistoryItem,
  type ScriptDoc,
} from "@/types/script";

import type { ActionResult } from "./auth";

const MAX_PDF_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_TITLE = 100;
const MIN_SYNOPSIS = 300;
const MAX_SYNOPSIS = 1000;
const MAX_AUTHOR_COMMENT = 2000;
const MAX_DURATION = 600;
const MIN_DURATION = 1;

// ----------------------------------------------------------------------------
// バリデーション
// ----------------------------------------------------------------------------

export type ScriptFormInput = {
  title: string;
  slug?: string;
  synopsis: string;
  genres: string[];
  castMin: number;
  castMax: number;
  castMale: number;
  castFemale: number;
  castUnspecified: number;
  duration: number;
  performanceType: string[];
  targetAudience: string[];
  themeTags: string[];
  scriptTags: string[];
  price: number;
  isFreeFullText: boolean;
  thumbnailUrl?: string;
  feeSchedule: FeeScheduleItem[];
  performanceHistory: PerformanceHistoryItem[];
  authorComment?: string;
};

function validateInput(input: ScriptFormInput): string | null {
  if (!input.title || input.title.trim().length === 0) return "タイトルを入力してください";
  if (input.title.length > MAX_TITLE) return `タイトルは${MAX_TITLE}文字以下にしてください`;

  if (!input.synopsis || input.synopsis.length < MIN_SYNOPSIS) {
    return `あらすじは${MIN_SYNOPSIS}文字以上で入力してください`;
  }
  if (input.synopsis.length > MAX_SYNOPSIS) {
    return `あらすじは${MAX_SYNOPSIS}文字以下で入力してください`;
  }

  if (!Array.isArray(input.genres) || input.genres.length === 0) {
    return "ジャンルを1つ以上選択してください";
  }
  for (const g of input.genres) {
    if (!(GENRES as readonly string[]).includes(g)) {
      return `ジャンルが不正です: ${g}`;
    }
  }

  if (!Array.isArray(input.performanceType) || input.performanceType.length === 0) {
    return "上演形態を1つ以上選択してください";
  }
  for (const p of input.performanceType) {
    if (!(PERFORMANCE_TYPES as readonly string[]).includes(p)) {
      return `上演形態が不正です: ${p}`;
    }
  }

  for (const t of input.targetAudience) {
    if (!(TARGET_AUDIENCES as readonly string[]).includes(t)) {
      return `対象層が不正です: ${t}`;
    }
  }

  if (!Number.isFinite(input.castMin) || input.castMin < 1) return "キャスト最小人数は1人以上にしてください";
  if (!Number.isFinite(input.castMax) || input.castMax < input.castMin) {
    return "キャスト最大人数は最小人数以上にしてください";
  }
  const breakdown =
    Math.max(0, input.castMale) + Math.max(0, input.castFemale) + Math.max(0, input.castUnspecified);
  if (breakdown !== input.castMax) {
    return "キャスト構成 (男+女+不問) は最大人数と一致させてください";
  }

  if (!Number.isFinite(input.duration) || input.duration < MIN_DURATION || input.duration > MAX_DURATION) {
    return `上演時間は${MIN_DURATION}〜${MAX_DURATION}分の範囲で入力してください`;
  }

  if (!Number.isFinite(input.price) || input.price < 0) {
    return "価格は0以上で入力してください";
  }

  if (input.authorComment && input.authorComment.length > MAX_AUTHOR_COMMENT) {
    return `作家コメントは${MAX_AUTHOR_COMMENT}文字以下にしてください`;
  }

  return null;
}

// ----------------------------------------------------------------------------
// スラッグ確保
// ----------------------------------------------------------------------------

async function reserveSlug(rawBase: string): Promise<string> {
  const base = generateSlug(rawBase);
  const db = getAdminDb();
  for (const candidate of slugCandidates(base)) {
    // eslint-disable-next-line no-await-in-loop
    const dup = await db.collection("scripts").where("slug", "==", candidate).limit(1).get();
    if (dup.empty) return candidate;
  }
  // フォールバック: タイムスタンプ付与
  return `${base}-${Date.now().toString(36)}`;
}

// ----------------------------------------------------------------------------
// PDF アップロード
// ----------------------------------------------------------------------------

async function uploadPdfFromForm(file: File, scriptId: string, version: number): Promise<string> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`PDF サイズが上限 (${MAX_PDF_BYTES / 1024 / 1024}MB) を超えています`);
  }
  if (file.type && file.type !== "application/pdf") {
    throw new Error("アップロード可能なのは PDF ファイルのみです");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `scripts/${scriptId}/v${version}/script.pdf`;
  const bucket = getAdminStorage().bucket();
  await bucket.file(path).save(buffer, {
    contentType: "application/pdf",
    resumable: false,
  });
  return path;
}

// ----------------------------------------------------------------------------
// createScript
// ----------------------------------------------------------------------------

/**
 * 新規出品。spec.md §1-2 createScript / spec-details.md §1-2。
 *
 * 処理:
 * 1. Stripe 連携済みチェック
 * 2. バリデーション
 * 3. PDF を Storage にアップロード
 * 4. スラッグ生成（重複時は末尾連番）
 * 5. scripts ドキュメント作成
 * 6. versions/1 サブドキュメント作成
 *
 * @param formData PDF ファイル + JSON 化したメタデータ ("data" フィールド)
 */
export async function createScript(formData: FormData): Promise<ActionResult<{ id: string }>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  // 1. Stripe 連携済みチェック
  if (!me.stripeOnboarded) {
    return {
      success: false,
      error: "出品には Stripe 連携が必要です。マイページから設定してください",
    };
  }

  // 2. PDF ファイル取得
  const file = formData.get("pdf");
  if (!(file instanceof File)) {
    return { success: false, error: "PDF ファイルを指定してください" };
  }
  if (file.size === 0) {
    return { success: false, error: "PDF ファイルが空です" };
  }

  // 3. メタデータ取得 + バリデーション
  const dataStr = formData.get("data");
  if (typeof dataStr !== "string") {
    return { success: false, error: "メタデータが指定されていません" };
  }
  let input: ScriptFormInput;
  try {
    input = JSON.parse(dataStr) as ScriptFormInput;
  } catch {
    return { success: false, error: "メタデータの形式が不正です" };
  }
  const validationError = validateInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const db = getAdminDb();
  const scriptRef = db.collection("scripts").doc();
  const scriptId = scriptRef.id;

  // 4. PDF アップロード
  let pdfPath: string;
  try {
    pdfPath = await uploadPdfFromForm(file, scriptId, 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF のアップロードに失敗しました";
    return { success: false, error: message };
  }

  // 5. スラッグ確保
  const slug = await reserveSlug(input.slug && input.slug.trim() ? input.slug : input.title);

  // 6. ドキュメント作成
  const castTotal: CastTotal = { min: input.castMin, max: input.castMax };
  const castBreakdown: CastBreakdown = {
    male: input.castMale,
    female: input.castFemale,
    unspecified: input.castUnspecified,
  };
  const feeSchedule = input.feeSchedule ?? [];
  const docData: Record<string, unknown> = {
    id: scriptId,
    authorUid: me.uid,
    authorUserId: me.userId,
    authorDisplayName: me.displayName,
    title: input.title.trim(),
    slug,
    synopsis: input.synopsis.trim(),
    genres: input.genres,
    castTotal,
    castBreakdown,
    duration: input.duration,
    performanceType: input.performanceType,
    targetAudience: input.targetAudience,
    themeTags: input.themeTags,
    price: input.price,
    isFreeFullText: input.isFreeFullText,
    thumbnailUrl: input.thumbnailUrl ?? "",
    pdfUrl: pdfPath,
    currentVersion: 1,
    feeSchedule,
    ...(feeSchedule.length > 0
      ? { feeScheduleMin: Math.min(...feeSchedule.map((f) => f.amount)) }
      : {}),
    performanceHistory: input.performanceHistory ?? [],
    authorComment: input.authorComment?.trim() ?? "",
    hearingSheet: [],
    scriptTags: input.scriptTags,
    badges: [],
    rankings: {},
    status: "published",
    stats: { ...INITIAL_SCRIPT_STATS },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    const batch = db.batch();
    batch.set(scriptRef, docData);
    batch.set(scriptRef.collection("versions").doc("1"), {
      version: 1,
      pdfUrl: pdfPath,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { success: true, data: { id: scriptId } };
  } catch (err) {
    console.error("[createScript] failed", err);
    return { success: false, error: "出品の保存に失敗しました" };
  }
}

// ----------------------------------------------------------------------------
// updateScript (PDF 以外のメタデータ更新)
// ----------------------------------------------------------------------------

export type UpdateScriptInput = Partial<ScriptFormInput>;

export async function updateScript(
  scriptId: string,
  input: UpdateScriptInput,
): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const ref = db.collection("scripts").doc(scriptId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "台本が見つかりません" };
  const script = snap.data() as ScriptDoc;
  if (script.authorUid !== me.uid) return { success: false, error: "権限がありません" };

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.title !== undefined) {
    if (input.title.length === 0 || input.title.length > MAX_TITLE) {
      return { success: false, error: `タイトルは1〜${MAX_TITLE}文字で入力してください` };
    }
    update.title = input.title.trim();
  }
  if (input.synopsis !== undefined) {
    if (input.synopsis.length < MIN_SYNOPSIS || input.synopsis.length > MAX_SYNOPSIS) {
      return {
        success: false,
        error: `あらすじは${MIN_SYNOPSIS}〜${MAX_SYNOPSIS}文字で入力してください`,
      };
    }
    update.synopsis = input.synopsis.trim();
  }
  if (input.genres !== undefined) {
    if (input.genres.length === 0) {
      return { success: false, error: "ジャンルは1つ以上選択してください" };
    }
    update.genres = input.genres;
  }
  if (input.performanceType !== undefined) {
    if (input.performanceType.length === 0) {
      return { success: false, error: "上演形態は1つ以上選択してください" };
    }
    update.performanceType = input.performanceType;
  }
  if (input.targetAudience !== undefined) update.targetAudience = input.targetAudience;
  if (input.themeTags !== undefined) update.themeTags = input.themeTags;
  if (input.scriptTags !== undefined) update.scriptTags = input.scriptTags;
  if (input.castMin !== undefined && input.castMax !== undefined) {
    update.castTotal = { min: input.castMin, max: input.castMax };
  }
  if (input.castMale !== undefined && input.castFemale !== undefined && input.castUnspecified !== undefined) {
    update.castBreakdown = {
      male: input.castMale,
      female: input.castFemale,
      unspecified: input.castUnspecified,
    };
  }
  if (input.duration !== undefined) update.duration = input.duration;
  if (input.price !== undefined) update.price = input.price;
  if (input.isFreeFullText !== undefined) update.isFreeFullText = input.isFreeFullText;
  if (input.thumbnailUrl !== undefined) update.thumbnailUrl = input.thumbnailUrl;
  if (input.feeSchedule !== undefined) {
    update.feeSchedule = input.feeSchedule;
    if (input.feeSchedule.length > 0) {
      update.feeScheduleMin = Math.min(...input.feeSchedule.map((f) => f.amount));
    } else {
      update.feeScheduleMin = FieldValue.delete();
    }
  }
  if (input.performanceHistory !== undefined) update.performanceHistory = input.performanceHistory;
  if (input.authorComment !== undefined) update.authorComment = input.authorComment;

  try {
    await ref.update(update);
    return { success: true };
  } catch (err) {
    console.error("[updateScript] failed", err);
    return { success: false, error: "更新に失敗しました" };
  }
}

// ----------------------------------------------------------------------------
// updateScriptPdf (PDF 差し替え + バージョンアップ)
// ----------------------------------------------------------------------------

export async function updateScriptPdf(
  scriptId: string,
  formData: FormData,
): Promise<ActionResult<{ version: number }>> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "PDF ファイルを指定してください" };
  }

  const db = getAdminDb();
  const ref = db.collection("scripts").doc(scriptId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "台本が見つかりません" };
  const script = snap.data() as ScriptDoc;
  if (script.authorUid !== me.uid) return { success: false, error: "権限がありません" };

  const newVersion = (script.currentVersion ?? 1) + 1;
  let pdfPath: string;
  try {
    pdfPath = await uploadPdfFromForm(file, scriptId, newVersion);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF のアップロードに失敗しました";
    return { success: false, error: message };
  }

  try {
    const batch = db.batch();
    batch.update(ref, {
      currentVersion: newVersion,
      pdfUrl: pdfPath,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(ref.collection("versions").doc(String(newVersion)), {
      version: newVersion,
      pdfUrl: pdfPath,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    // TODO(後続): 購入者への「台本が更新されました」通知 (P2-7 で wire up)
    return { success: true, data: { version: newVersion } };
  } catch (err) {
    console.error("[updateScriptPdf] failed", err);
    return { success: false, error: "PDF 差し替えに失敗しました" };
  }
}

// ----------------------------------------------------------------------------
// unlistScript / relistScript
// ----------------------------------------------------------------------------

async function setStatus(scriptId: string, status: "published" | "unlisted"): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const ref = db.collection("scripts").doc(scriptId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "台本が見つかりません" };
  const script = snap.data() as ScriptDoc;
  if (script.authorUid !== me.uid) return { success: false, error: "権限がありません" };
  try {
    await ref.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error(`[setStatus(${status})] failed`, err);
    return { success: false, error: "ステータス変更に失敗しました" };
  }
}

export async function unlistScript(scriptId: string): Promise<ActionResult> {
  return setStatus(scriptId, "unlisted");
}

export async function relistScript(scriptId: string): Promise<ActionResult> {
  return setStatus(scriptId, "published");
}

// ----------------------------------------------------------------------------
// getMyScripts
// ----------------------------------------------------------------------------

export type MyScriptListItem = {
  id: string;
  title: string;
  slug: string;
  status: "published" | "unlisted";
  price: number;
  thumbnailUrl: string;
  currentVersion: number;
  stats: {
    viewCount: number;
    purchaseCount: number;
    favoriteCount: number;
    reviewCount: number;
    reviewAverage: number;
  };
  totalRevenue: number;
};

export async function getMyScripts(): Promise<ActionResult<MyScriptListItem[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const snap = await db
    .collection("scripts")
    .where("authorUid", "==", me.uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  // 売上計算は purchases から各 script の合計を集計
  // ※ N+1 にならないように purchases を一括取得
  const purchaseSnap = await db.collection("purchases").where("authorUid", "==", me.uid).get();
  const revenueByScript = new Map<string, number>();
  for (const p of purchaseSnap.docs) {
    const d = p.data() as { scriptId?: string; amount?: number };
    if (!d.scriptId || !d.amount) continue;
    revenueByScript.set(d.scriptId, (revenueByScript.get(d.scriptId) ?? 0) + d.amount);
  }

  const items: MyScriptListItem[] = snap.docs.map((doc) => {
    const data = doc.data() as ScriptDoc;
    return {
      id: doc.id,
      title: data.title,
      slug: data.slug,
      status: data.status,
      price: data.price,
      thumbnailUrl: data.thumbnailUrl ?? "",
      currentVersion: data.currentVersion,
      stats: {
        viewCount: data.stats?.viewCount ?? 0,
        purchaseCount: data.stats?.purchaseCount ?? 0,
        favoriteCount: data.stats?.favoriteCount ?? 0,
        reviewCount: data.stats?.reviewCount ?? 0,
        reviewAverage: data.stats?.reviewAverage ?? 0,
      },
      totalRevenue: revenueByScript.get(doc.id) ?? 0,
    };
  });
  return { success: true, data: items };
}
