import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { sendEmail, type SendEmailResult } from "@/lib/resend";
import type { NotificationSettings, UserDoc } from "@/types/user";

// オンライン判定の閾値: 直近 N 秒以内に lastActiveAt が更新されていればオンライン
const ONLINE_THRESHOLD_SEC = 120;
// チャット通知のスロットリング: 同じ送信者から N 秒以内の通知は抑制
const CHAT_THROTTLE_SEC = 5 * 60;

type NotificationKey = keyof NotificationSettings;

/**
 * 通知を送るかどうかを判定して送信する高水準ヘルパー。
 *
 * - 受信者の users ドキュメントから notificationSettings を読む
 * - 該当キーが OFF なら何もしない
 * - オンライン中（lastActiveAt 直近 2 分以内）なら、チャット通知のみ抑制
 * - チャット通知 (onNewMessage) は throttleKey ベースのスロットリングを適用
 *
 * @param recipientUid 受信者の Firebase Auth UID
 * @param settingKey 通知設定キー (notificationSettings の key)
 * @param subject メール件名
 * @param html メール本文 HTML
 * @param options.throttleKey スロットリング用のキー（同じキーで N 秒以内の重複送信を抑制）
 */
export async function notify(
  recipientUid: string,
  settingKey: NotificationKey,
  subject: string,
  html: string,
  options: { throttleKey?: string; isChatNotification?: boolean } = {},
): Promise<SendEmailResult | { success: false; error: string; reason: "skipped" }> {
  if (!recipientUid) {
    return { success: false, error: "recipientUid required", reason: "skipped" };
  }
  const db = getAdminDb();
  const userSnap = await db.collection("users").doc(recipientUid).get();
  if (!userSnap.exists) {
    return { success: false, error: "recipient not found", reason: "skipped" };
  }
  const user = userSnap.data() as UserDoc;

  // 1. 設定 OFF なら送らない
  const settings = user.notificationSettings ?? {};
  if (settings[settingKey] === false) {
    return { success: false, error: "setting disabled", reason: "skipped" };
  }

  // 2. オンライン判定 (チャット通知のみ抑制 / spec.md §9)
  if (options.isChatNotification) {
    const lastActiveMs = toMillis(user.lastActiveAt);
    if (lastActiveMs && Date.now() - lastActiveMs < ONLINE_THRESHOLD_SEC * 1000) {
      return { success: false, error: "recipient online", reason: "skipped" };
    }
  }

  // 3. スロットリング (throttleKey ベース)
  if (options.throttleKey) {
    const throttleRef = db
      .collection("users")
      .doc(recipientUid)
      .collection("notificationThrottles")
      .doc(options.throttleKey);
    const throttleSnap = await throttleRef.get();
    if (throttleSnap.exists) {
      const data = throttleSnap.data() as { sentAt?: FirebaseFirestore.Timestamp };
      const sentAtMs = data.sentAt?.toMillis() ?? 0;
      const elapsed = Date.now() - sentAtMs;
      if (elapsed < CHAT_THROTTLE_SEC * 1000) {
        return { success: false, error: "throttled", reason: "skipped" };
      }
    }
    await throttleRef.set({ sentAt: FieldValue.serverTimestamp() });
  }

  // 4. 送信
  const result = await sendEmail({
    to: user.email,
    subject,
    html,
  });
  return result;
}

/**
 * users.lastActiveAt を更新する（オンライン判定用）。
 * クライアントから定期的に呼ぶ前提。
 */
export async function updateLastActive(uid: string): Promise<void> {
  if (!uid) return;
  try {
    await getAdminDb().collection("users").doc(uid).update({
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // 該当 user が存在しない等のレースは無視
    console.error("[updateLastActive] failed", err);
  }
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as { toMillis(): number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}
