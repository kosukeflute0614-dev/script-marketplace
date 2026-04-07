"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser, getCurrentUser } from "@/lib/auth-server";
import { updateLastActive } from "@/lib/notifications";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
  type UserDoc,
} from "@/types/user";

import type { ActionResult } from "./auth";

const NOTIFICATION_KEYS: (keyof NotificationSettings)[] = [
  "onPurchased",
  "onInvoicePaid",
  "onNewMessage",
  "onScriptUpdated",
  "onNewReview",
];

/**
 * 通知設定を取得する。spec.md §1-10 getNotificationSettings。
 */
export async function getNotificationSettings(): Promise<ActionResult<NotificationSettings>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  try {
    const snap = await getAdminDb().collection("users").doc(me.uid).get();
    const data = snap.data() as UserDoc | undefined;
    return {
      success: true,
      data: data?.notificationSettings ?? { ...DEFAULT_NOTIFICATION_SETTINGS },
    };
  } catch (err) {
    console.error("[getNotificationSettings] failed", err);
    return { success: false, error: "通知設定の取得に失敗しました" };
  }
}

/**
 * 通知設定を更新する。spec.md §1-10 updateNotificationSettings。
 *
 * @param settings 部分更新可。送信されたキーのみ更新する。
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<ActionResult> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  // バリデーション: 既知のキーのみ受け付ける
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const key of NOTIFICATION_KEYS) {
    if (key in settings) {
      const value = settings[key];
      if (typeof value !== "boolean") {
        return { success: false, error: `${key} は boolean で指定してください` };
      }
      update[`notificationSettings.${key}`] = value;
    }
  }

  try {
    await getAdminDb().collection("users").doc(me.uid).update(update);
    return { success: true };
  } catch (err) {
    console.error("[updateNotificationSettings] failed", err);
    return { success: false, error: "通知設定の更新に失敗しました" };
  }
}

/**
 * クライアントから定期的に呼ぶ「アクティブ ping」。
 * users.lastActiveAt を更新し、オンライン判定の根拠にする。
 */
export async function pingActivity(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "未ログイン" };
  await updateLastActive(me.uid);
  return { success: true };
}
