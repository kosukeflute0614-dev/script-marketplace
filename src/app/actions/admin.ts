"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { removeScriptFromAlgolia } from "@/lib/algolia-sync";
import type { ScriptDoc } from "@/types/script";

import type { ActionResult } from "./auth";

async function requireAdmin() {
  const me = await requireUser();
  if (!me.isAdmin) {
    throw new Error("FORBIDDEN");
  }
  return me;
}

function adminGuard<T>(result: T | Promise<T>): Promise<T | { success: false; error: string }> {
  return Promise.resolve(result).catch((err) => {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return { success: false, error: "管理者権限が必要です" };
    }
    if (err instanceof Error && err.message.includes("ログイン")) {
      return { success: false, error: "ログインが必要です" };
    }
    throw err;
  });
}

/**
 * 手数料率の更新。spec.md §1-13 updateFeeRate。
 */
export async function updateFeeRate(rate: number): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        return { success: false as const, error: "手数料率は 0〜1 の範囲で入力してください" };
      }
      try {
        await getAdminDb().collection("config").doc("platform").update({
          feeRate: rate,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[updateFeeRate] failed", err);
        return { success: false as const, error: "手数料率の更新に失敗しました" };
      }
    })(),
  );
}

/**
 * 振込手数料の更新。
 */
export async function updatePayoutFee(amount: number): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!Number.isFinite(amount) || amount < 0) {
        return { success: false as const, error: "振込手数料は0以上で入力してください" };
      }
      try {
        await getAdminDb().collection("config").doc("platform").update({
          payoutFee: amount,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[updatePayoutFee] failed", err);
        return { success: false as const, error: "振込手数料の更新に失敗しました" };
      }
    })(),
  );
}

export type BadgeDefinition = {
  id: string;
  label: string;
  icon?: string;
  filterable: boolean;
};

/**
 * バッジ定義の上書き更新。spec.md §12。
 */
export async function updateBadgeDefinitions(
  badges: BadgeDefinition[],
): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!Array.isArray(badges)) {
        return { success: false as const, error: "形式が正しくありません" };
      }
      // バリデーション
      for (const b of badges) {
        if (!b.id || !b.label) {
          return { success: false as const, error: "id と label は必須です" };
        }
      }
      try {
        await getAdminDb().collection("config").doc("platform").update({
          badgeDefinitions: badges,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[updateBadgeDefinitions] failed", err);
        return { success: false as const, error: "バッジ定義の更新に失敗しました" };
      }
    })(),
  );
}

export type ScriptTagDefinitionInput = {
  id: string;
  label: string;
  category: string;
};

/**
 * 特性タグ定義の上書き更新。spec.md §12。
 */
export async function updateScriptTagDefinitions(
  tags: ScriptTagDefinitionInput[],
): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!Array.isArray(tags)) {
        return { success: false as const, error: "形式が正しくありません" };
      }
      for (const t of tags) {
        if (!t.id || !t.label || !t.category) {
          return {
            success: false as const,
            error: "id / label / category は必須です",
          };
        }
      }
      try {
        await getAdminDb().collection("config").doc("platform").update({
          scriptTagDefinitions: tags,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[updateScriptTagDefinitions] failed", err);
        return { success: false as const, error: "特性タグ定義の更新に失敗しました" };
      }
    })(),
  );
}

export type TopPageSectionInput = {
  type: string;
  title: string;
  limit: number;
};

export async function updateTopPageSections(
  sections: TopPageSectionInput[],
): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!Array.isArray(sections)) {
        return { success: false as const, error: "形式が正しくありません" };
      }
      for (const s of sections) {
        if (!s.type || !s.title || !Number.isFinite(s.limit) || s.limit <= 0) {
          return {
            success: false as const,
            error: "type / title / limit (1以上) は必須です",
          };
        }
      }
      try {
        await getAdminDb().collection("config").doc("platform").update({
          topPageSections: sections,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[updateTopPageSections] failed", err);
        return { success: false as const, error: "トップページ設定の更新に失敗しました" };
      }
    })(),
  );
}

/**
 * 強制非公開化。spec.md §1-13 forceUnlistScript。
 * Firestore の status を unlisted にし、Algolia インデックスからも削除する。
 */
export async function forceUnlistScript(scriptId: string): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!scriptId) return { success: false as const, error: "台本IDが指定されていません" };
      try {
        await getAdminDb().collection("scripts").doc(scriptId).update({
          status: "unlisted",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("[forceUnlistScript] failed", err);
        return { success: false as const, error: "強制非公開化に失敗しました" };
      }
      // Algolia から削除 (失敗しても throw しない設計)
      await removeScriptFromAlgolia(scriptId);
      return { success: true as const };
    })(),
  );
}

/**
 * 売上レポート: purchases と invoices.paid を集計。
 */
export type SalesReport = {
  period: string;
  totalGmv: number;
  totalFee: number;
  purchaseCount: number;
  invoiceCount: number;
};

export async function getSalesReport(
  periodDays = 30,
): Promise<ActionResult<SalesReport>> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      const since = new Date(Date.now() - periodDays * 86400 * 1000);
      const db = getAdminDb();
      const [purchaseSnap, invoiceSnap] = await Promise.all([
        db.collection("purchases").where("createdAt", ">=", since).get(),
        db
          .collection("invoices")
          .where("status", "==", "paid")
          .where("paidAt", ">=", since)
          .get(),
      ]);
      let totalGmv = 0;
      let totalFee = 0;
      let purchaseCount = 0;
      for (const doc of purchaseSnap.docs) {
        const d = doc.data() as { amount?: number; platformFee?: number };
        totalGmv += d.amount ?? 0;
        totalFee += d.platformFee ?? 0;
        purchaseCount += 1;
      }
      let invoiceCount = 0;
      for (const doc of invoiceSnap.docs) {
        const d = doc.data() as { amount?: number; platformFee?: number };
        totalGmv += d.amount ?? 0;
        totalFee += d.platformFee ?? 0;
        invoiceCount += 1;
      }
      return {
        success: true as const,
        data: {
          period: `直近${periodDays}日`,
          totalGmv,
          totalFee,
          purchaseCount,
          invoiceCount,
        },
      };
    })(),
  );
}

/**
 * ユーザー一時停止。Pass1 では Firebase Auth の disabled フラグだけ立てる。
 */
export async function suspendUser(uid: string): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!uid) return { success: false as const, error: "uid が指定されていません" };
      try {
        await getAdminAuth().updateUser(uid, { disabled: true });
        await getAdminDb().collection("users").doc(uid).update({
          suspended: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[suspendUser] failed", err);
        return { success: false as const, error: "停止に失敗しました" };
      }
    })(),
  );
}

export async function unsuspendUser(uid: string): Promise<ActionResult> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      if (!uid) return { success: false as const, error: "uid が指定されていません" };
      try {
        await getAdminAuth().updateUser(uid, { disabled: false });
        await getAdminDb().collection("users").doc(uid).update({
          suspended: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { success: true as const };
      } catch (err) {
        console.error("[unsuspendUser] failed", err);
        return { success: false as const, error: "停止解除に失敗しました" };
      }
    })(),
  );
}

/**
 * 全 published scripts のリスト取得（管理画面用、簡易ページネーション）
 */
export async function getAllScriptsForAdmin(
  limit = 100,
): Promise<ActionResult<Array<Pick<ScriptDoc, "id" | "title" | "authorDisplayName" | "status" | "price">>>> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      const snap = await getAdminDb()
        .collection("scripts")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      return {
        success: true as const,
        data: snap.docs.map((doc) => {
          const d = doc.data() as ScriptDoc;
          return {
            id: doc.id,
            title: d.title,
            authorDisplayName: d.authorDisplayName,
            status: d.status,
            price: d.price,
          };
        }),
      };
    })(),
  );
}

/**
 * 全 users のリスト取得（管理画面用）
 */
export async function getAllUsersForAdmin(
  limit = 100,
): Promise<ActionResult<Array<{ uid: string; email: string; userId: string; displayName: string; isAdmin: boolean; suspended: boolean }>>> {
  return adminGuard(
    (async () => {
      await requireAdmin();
      const snap = await getAdminDb()
        .collection("users")
        .limit(limit)
        .get();
      return {
        success: true as const,
        data: snap.docs.map((doc) => {
          const d = doc.data() as {
            email?: string;
            userId?: string;
            displayName?: string;
            isAdmin?: boolean;
            suspended?: boolean;
          };
          return {
            uid: doc.id,
            email: d.email ?? "",
            userId: d.userId ?? "",
            displayName: d.displayName ?? "",
            isAdmin: d.isAdmin === true,
            suspended: d.suspended === true,
          };
        }),
      };
    })(),
  );
}
