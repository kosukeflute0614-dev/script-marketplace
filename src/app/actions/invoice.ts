"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { getStripe } from "@/lib/stripe";
import { notify } from "@/lib/notifications";
import { emailOnInvoicePaid } from "@/lib/email-templates";
import type { ChatDoc } from "@/types/chat";

import type { ActionResult } from "./auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getFeeRate(): Promise<number> {
  const snap = await getAdminDb().collection("config").doc("platform").get();
  return (snap.data() as { feeRate?: number } | undefined)?.feeRate ?? 0.165;
}

// ----------------------------------------------------------------------------
// createInvoice
// ----------------------------------------------------------------------------

/**
 * 請求を作成する。spec.md §1-6 createInvoice。
 * チャット参加者（出品者側）のみ実行可能。
 *
 * 処理:
 * 1. チャット参加者確認
 * 2. invoices ドキュメント作成 (status: pending)
 * 3. チャットに type=invoice メッセージ投稿
 * 4. 相手にメール通知 (onNewMessage)
 */
export async function createInvoice(input: {
  chatId: string;
  amount: number;
  label: string;
  consultationId?: string;
  memo?: string;
}): Promise<ActionResult<{ invoiceId: string }>> {
  if (!input.chatId) return { success: false, error: "チャットIDが指定されていません" };
  if (!Number.isFinite(input.amount) || input.amount < 1) {
    return { success: false, error: "金額は1円以上で入力してください" };
  }
  if (!input.label?.trim()) return { success: false, error: "ラベルを入力してください" };

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const chatRef = db.collection("chats").doc(input.chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) return { success: false, error: "チャットが見つかりません" };
  const chat = chatSnap.data() as ChatDoc;
  if (!chat.participants.includes(me.uid)) {
    return { success: false, error: "このチャットに参加していません" };
  }

  const payerUid = chat.participants.find((uid) => uid !== me.uid) ?? "";
  const feeRate = await getFeeRate();
  const platformFee = Math.floor(input.amount * feeRate);

  const invoiceRef = db.collection("invoices").doc();
  const messageRef = chatRef.collection("messages").doc();

  try {
    const batch = db.batch();
    batch.set(invoiceRef, {
      id: invoiceRef.id,
      chatId: input.chatId,
      consultationId: input.consultationId ?? "",
      creatorUid: me.uid,
      payerUid,
      amount: input.amount,
      label: input.label.trim(),
      memo: input.memo?.trim() ?? "",
      status: "pending",
      platformFee,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(messageRef, {
      senderUid: me.uid,
      type: "invoice",
      text: "",
      invoiceId: invoiceRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(chatRef, {
      lastMessage: `請求: ¥${input.amount.toLocaleString()} (${input.label.trim()})`,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: me.uid,
    });
    await batch.commit();
  } catch (err) {
    console.error("[createInvoice] failed", err);
    return { success: false, error: "請求の作成に失敗しました" };
  }

  // 相手にメール通知
  const partnerName = chat.participantNames[payerUid] ?? "ユーザー";
  const { emailOnNewMessage } = await import("@/lib/email-templates");
  const tpl = emailOnNewMessage({
    recipientName: partnerName,
    senderName: me.displayName,
    preview: `請求: ¥${input.amount.toLocaleString()} (${input.label.trim()})`,
    chatId: input.chatId,
  });
  void notify(payerUid, "onNewMessage", tpl.subject, tpl.html, {
    isChatNotification: true,
    throttleKey: `chat:${input.chatId}`,
  });

  return { success: true, data: { invoiceId: invoiceRef.id } };
}

// ----------------------------------------------------------------------------
// payInvoice
// ----------------------------------------------------------------------------

/**
 * 請求を支払う (Stripe Checkout)。spec.md §1-6 payInvoice。
 * チャット参加者（支払い側）のみ。
 */
export async function payInvoice(
  invoiceId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!invoiceId) return { success: false, error: "請求IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const invoiceSnap = await db.collection("invoices").doc(invoiceId).get();
  if (!invoiceSnap.exists) return { success: false, error: "請求が見つかりません" };
  const invoice = invoiceSnap.data() as {
    chatId: string;
    creatorUid: string;
    payerUid: string;
    amount: number;
    label: string;
    platformFee: number;
    status: string;
  };
  if (invoice.payerUid !== me.uid) {
    return { success: false, error: "この請求を支払う権限がありません" };
  }
  if (invoice.status !== "pending") {
    return { success: false, error: "この請求は既に処理済みです" };
  }

  // 出品者 (creatorUid) の Stripe アカウント
  const creatorSnap = await db.collection("users").doc(invoice.creatorUid).get();
  const creatorData = creatorSnap.data() as { stripeAccountId?: string } | undefined;
  if (!creatorData?.stripeAccountId) {
    return { success: false, error: "請求者の決済アカウントが未設定です" };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: invoice.label,
              description: `請求: ${invoice.label}`,
            },
            unit_amount: invoice.amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: invoice.platformFee,
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
      },
      metadata: {
        type: "invoice_payment",
        invoiceId,
        chatId: invoice.chatId,
        creatorUid: invoice.creatorUid,
        payerUid: me.uid,
        amount: String(invoice.amount),
        platformFee: String(invoice.platformFee),
      },
      success_url: `${APP_URL}/chat/${invoice.chatId}?paid=${invoiceId}`,
      cancel_url: `${APP_URL}/chat/${invoice.chatId}`,
    });

    if (!session.url) return { success: false, error: "チェックアウトURLの生成に失敗しました" };
    return { success: true, data: { url: session.url } };
  } catch (err) {
    console.error("[payInvoice] failed", err);
    return { success: false, error: "支払い処理の開始に失敗しました" };
  }
}

// ----------------------------------------------------------------------------
// cancelInvoice
// ----------------------------------------------------------------------------

/**
 * 請求をキャンセルする。spec.md §1-6 cancelInvoice。
 * 請求作成者のみ。pending 状態の請求のみ。
 */
export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  if (!invoiceId) return { success: false, error: "請求IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const ref = db.collection("invoices").doc(invoiceId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "請求が見つかりません" };
  const inv = snap.data() as { creatorUid: string; status: string; chatId: string };
  if (inv.creatorUid !== me.uid) return { success: false, error: "権限がありません" };
  if (inv.status !== "pending") return { success: false, error: "この請求は既に処理済みです" };

  try {
    const chatRef = db.collection("chats").doc(inv.chatId);
    const msgRef = chatRef.collection("messages").doc();
    const batch = db.batch();
    batch.update(ref, {
      status: "cancelled",
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(msgRef, {
      senderUid: me.uid,
      type: "system",
      text: `${me.displayName}さんが請求をキャンセルしました`,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(chatRef, {
      lastMessage: "請求がキャンセルされました",
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: me.uid,
    });
    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error("[cancelInvoice] failed", err);
    return { success: false, error: "キャンセルに失敗しました" };
  }
}

// ----------------------------------------------------------------------------
// getInvoicesByChat
// ----------------------------------------------------------------------------

export type InvoiceListItem = {
  id: string;
  creatorUid: string;
  payerUid: string;
  amount: number;
  label: string;
  memo: string;
  status: string;
  platformFee: number;
  createdAt: string;
};

export async function getInvoicesByChat(
  chatId: string,
): Promise<ActionResult<InvoiceListItem[]>> {
  if (!chatId) return { success: false, error: "チャットIDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const chatSnap = await db.collection("chats").doc(chatId).get();
  if (!chatSnap.exists) return { success: false, error: "チャットが見つかりません" };
  const chat = chatSnap.data() as ChatDoc;
  if (!chat.participants.includes(me.uid)) {
    return { success: false, error: "このチャットに参加していません" };
  }
  const snap = await db
    .collection("invoices")
    .where("chatId", "==", chatId)
    .orderBy("createdAt", "desc")
    .get();
  const items: InvoiceListItem[] = snap.docs.map((d) => {
    const data = d.data();
    let createdAt = "";
    const ts = data.createdAt;
    if (ts && typeof ts === "object" && "toDate" in ts) {
      createdAt = (ts as { toDate(): Date }).toDate().toISOString();
    }
    return {
      id: d.id,
      creatorUid: data.creatorUid ?? "",
      payerUid: data.payerUid ?? "",
      amount: data.amount ?? 0,
      label: data.label ?? "",
      memo: data.memo ?? "",
      status: data.status ?? "pending",
      platformFee: data.platformFee ?? 0,
      createdAt,
    };
  });
  return { success: true, data: items };
}

// ----------------------------------------------------------------------------
// Webhook: handleInvoicePaymentWebhook
// ----------------------------------------------------------------------------

/**
 * checkout.session.completed の invoice_payment タイプを処理する。
 * route.ts から呼ばれる。
 */
export async function handleInvoicePaymentWebhook(metadata: {
  invoiceId: string;
  chatId: string;
  creatorUid: string;
  payerUid: string;
  amount: string;
  platformFee: string;
}): Promise<void> {
  const db = getAdminDb();
  const invoiceRef = db.collection("invoices").doc(metadata.invoiceId);
  const invoiceSnap = await invoiceRef.get();
  if (!invoiceSnap.exists) {
    console.warn(`[handleInvoicePaymentWebhook] invoice ${metadata.invoiceId} not found`);
    return;
  }
  const inv = invoiceSnap.data() as { status?: string };
  if (inv.status === "paid") {
    console.log(`[handleInvoicePaymentWebhook] invoice ${metadata.invoiceId} already paid`);
    return; // 冪等
  }

  const chatRef = db.collection("chats").doc(metadata.chatId);
  const msgRef = chatRef.collection("messages").doc();

  const batch = db.batch();
  batch.update(invoiceRef, {
    status: "paid",
    paidAt: FieldValue.serverTimestamp(),
  });
  batch.set(msgRef, {
    senderUid: metadata.payerUid,
    type: "system",
    text: "請求が支払われました",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(chatRef, {
    lastMessage: "請求が支払われました",
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageBy: metadata.payerUid,
  });
  await batch.commit();

  // 作成者にメール通知 (onInvoicePaid)
  const creatorSnap = await db.collection("users").doc(metadata.creatorUid).get();
  const creatorName = (creatorSnap.data() as { displayName?: string } | undefined)?.displayName ?? "";
  const payerSnap = await db.collection("users").doc(metadata.payerUid).get();
  const payerName = (payerSnap.data() as { displayName?: string } | undefined)?.displayName ?? "";

  const tpl = emailOnInvoicePaid({
    recipientName: creatorName,
    payerName,
    amount: Number(metadata.amount),
    chatId: metadata.chatId,
  });
  void notify(metadata.creatorUid, "onInvoicePaid", tpl.subject, tpl.html);
}
