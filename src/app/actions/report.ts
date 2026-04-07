"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import type {
  ReportDoc,
  ReportStatus,
  ReportTargetType,
  SerializedReport,
} from "@/types/report";

import type { ActionResult } from "./auth";

const VALID_TYPES: ReportTargetType[] = ["script", "review", "message", "user"];
const MAX_DESCRIPTION = 1000;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function serialize(doc: { id: string; data: () => ReportDoc }): SerializedReport {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: toIso(data.createdAt) ?? "",
    resolvedAt: toIso(data.resolvedAt),
  };
}

/**
 * 通報を作成する。spec.md §1-12 createReport。
 * ログインユーザーなら誰でも作成可能。
 */
export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
};

export async function createReport(
  input: CreateReportInput,
): Promise<ActionResult<{ reportId: string }>> {
  if (!input.targetType || !VALID_TYPES.includes(input.targetType)) {
    return { success: false, error: "通報種別が正しくありません" };
  }
  if (!input.targetId) {
    return { success: false, error: "通報対象が指定されていません" };
  }
  if (!input.reason) {
    return { success: false, error: "通報理由を選択してください" };
  }
  const description = (input.description ?? "").trim();
  if (description.length > MAX_DESCRIPTION) {
    return { success: false, error: `説明は${MAX_DESCRIPTION}文字以下で入力してください` };
  }

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const ref = db.collection("reports").doc();
  try {
    await ref.set({
      id: ref.id,
      reporterUid: me.uid,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, data: { reportId: ref.id } };
  } catch (err) {
    console.error("[createReport] failed", err);
    return { success: false, error: "通報の送信に失敗しました" };
  }
}

/**
 * 通報一覧（管理者のみ）。spec.md §1-13 getReports。
 */
export async function getReports(
  status?: ReportStatus,
  limit = 100,
): Promise<ActionResult<SerializedReport[]>> {
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
  let query = db.collection("reports").orderBy("createdAt", "desc").limit(limit);
  if (status) {
    query = db
      .collection("reports")
      .where("status", "==", status)
      .orderBy("createdAt", "desc")
      .limit(limit);
  }
  const snap = await query.get();
  const items = snap.docs.map((d) => serialize({ id: d.id, data: () => d.data() as ReportDoc }));
  return { success: true, data: items };
}

/**
 * 通報を解決する（管理者のみ）。spec.md §1-13 resolveReport。
 *
 * @param reportId
 * @param action "resolved" | "dismissed"
 * @param adminNote 管理者のメモ
 */
export async function resolveReport(
  reportId: string,
  action: "resolved" | "dismissed",
  adminNote?: string,
): Promise<ActionResult> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  if (!me.isAdmin) {
    return { success: false, error: "管理者権限が必要です" };
  }
  if (action !== "resolved" && action !== "dismissed") {
    return { success: false, error: "アクションが正しくありません" };
  }
  try {
    await getAdminDb().collection("reports").doc(reportId).update({
      status: action,
      resolvedAt: FieldValue.serverTimestamp(),
      adminNote: adminNote ?? "",
    });
    return { success: true };
  } catch (err) {
    console.error("[resolveReport] failed", err);
    return { success: false, error: "通報の処理に失敗しました" };
  }
}
