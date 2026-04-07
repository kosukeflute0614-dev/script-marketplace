"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import type { HearingSheetItem, ScriptDoc } from "@/types/script";
import type { UserDoc, HearingSheetQuestion } from "@/types/user";

import type { ActionResult } from "./auth";

const MAX_QUESTIONS = 30;
const MAX_QUESTION_LENGTH = 200;

function sanitizeQuestions(
  input: unknown[],
  options: { allowEmpty?: boolean } = {},
): HearingSheetQuestion[] | string {
  if (!Array.isArray(input)) {
    return "質問リストの形式が正しくありません";
  }
  if (input.length > MAX_QUESTIONS) {
    return `質問は${MAX_QUESTIONS}件以下にしてください`;
  }
  const cleaned: HearingSheetQuestion[] = [];
  input.forEach((q, idx) => {
    if (typeof q !== "object" || q === null) return;
    const obj = q as { question?: unknown; order?: unknown };
    const question = String(obj.question ?? "").trim();
    if (!question) return;
    if (question.length > MAX_QUESTION_LENGTH) return;
    const order = typeof obj.order === "number" ? obj.order : idx + 1;
    cleaned.push({ question, order });
  });
  if (cleaned.length === 0 && !options.allowEmpty) {
    return "少なくとも1つの質問を入力してください";
  }
  // order を 1 から振り直す
  cleaned.sort((a, b) => a.order - b.order);
  cleaned.forEach((q, i) => {
    q.order = i + 1;
  });
  return cleaned;
}

/**
 * デフォルトヒアリングシート（作家共通）の更新。
 * spec.md §1-7 updateDefaultHearingSheet。
 *
 * 全質問を空のままで保存すると「ヒアリングシート未設定」状態になり、
 * spec.md §9「作家未設定の場合はスキップして直接チャット開設」フローに入る。
 */
export async function updateDefaultHearingSheet(
  questions: HearingSheetQuestion[],
): Promise<ActionResult> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  // デフォルトシートは「クリア（無効化）」を許容するため allowEmpty=true
  const sanitized = sanitizeQuestions(questions, { allowEmpty: true });
  if (typeof sanitized === "string") {
    return { success: false, error: sanitized };
  }
  try {
    await getAdminDb().collection("users").doc(me.uid).update({
      hearingSheet: sanitized,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error("[updateDefaultHearingSheet] failed", err);
    return { success: false, error: "デフォルトヒアリングシートの更新に失敗しました" };
  }
}

/**
 * 台本個別ヒアリングシートの更新。
 * spec.md §1-7 updateScriptHearingSheet。台本作家本人のみ更新可。
 */
export async function updateScriptHearingSheet(
  scriptId: string,
  questions: HearingSheetQuestion[],
): Promise<ActionResult> {
  if (!scriptId) {
    return { success: false, error: "台本IDが指定されていません" };
  }
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const sanitized = sanitizeQuestions(questions);
  if (typeof sanitized === "string") {
    return { success: false, error: sanitized };
  }

  const db = getAdminDb();
  const scriptRef = db.collection("scripts").doc(scriptId);
  const snap = await scriptRef.get();
  if (!snap.exists) {
    return { success: false, error: "台本が見つかりません" };
  }
  const script = snap.data() as ScriptDoc;
  if (script.authorUid !== me.uid) {
    return { success: false, error: "この操作を行う権限がありません" };
  }

  try {
    await scriptRef.update({
      hearingSheet: sanitized,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error("[updateScriptHearingSheet] failed", err);
    return { success: false, error: "ヒアリングシートの更新に失敗しました" };
  }
}

/**
 * 台本個別ヒアリングシートをクリア（デフォルトに戻す）。
 * spec.md §1-7 clearScriptHearingSheet。
 */
export async function clearScriptHearingSheet(scriptId: string): Promise<ActionResult> {
  if (!scriptId) {
    return { success: false, error: "台本IDが指定されていません" };
  }
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const scriptRef = db.collection("scripts").doc(scriptId);
  const snap = await scriptRef.get();
  if (!snap.exists) {
    return { success: false, error: "台本が見つかりません" };
  }
  const script = snap.data() as ScriptDoc;
  if (script.authorUid !== me.uid) {
    return { success: false, error: "この操作を行う権限がありません" };
  }
  try {
    await scriptRef.update({
      hearingSheet: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error("[clearScriptHearingSheet] failed", err);
    return { success: false, error: "ヒアリングシートのクリアに失敗しました" };
  }
}

/**
 * ヒアリングシートを取得する。spec.md §1-7 getHearingSheet。
 *
 * 優先順位: 台本個別 > 作家デフォルト
 *
 * @param scriptId 台本ID（指定されていれば個別優先）
 * @param authorUid 作家UID（個別がない時の fallback として使う）
 */
export async function getHearingSheet(
  scriptId: string | null,
  authorUid: string,
): Promise<ActionResult<{ source: "script" | "author" | "none"; questions: HearingSheetItem[] }>> {
  if (!authorUid) {
    return { success: false, error: "作家IDが指定されていません" };
  }
  try {
    const db = getAdminDb();

    if (scriptId) {
      const scriptSnap = await db.collection("scripts").doc(scriptId).get();
      if (scriptSnap.exists) {
        const script = scriptSnap.data() as ScriptDoc;
        if (script.hearingSheet && script.hearingSheet.length > 0) {
          return { success: true, data: { source: "script", questions: script.hearingSheet } };
        }
      }
    }

    const userSnap = await db.collection("users").doc(authorUid).get();
    if (userSnap.exists) {
      const user = userSnap.data() as UserDoc;
      if (user.hearingSheet && user.hearingSheet.length > 0) {
        return { success: true, data: { source: "author", questions: user.hearingSheet } };
      }
    }

    return { success: true, data: { source: "none", questions: [] } };
  } catch (err) {
    console.error("[getHearingSheet] failed", err);
    return { success: false, error: "ヒアリングシートの取得に失敗しました" };
  }
}
