"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { getStripe } from "@/lib/stripe";
import { notify } from "@/lib/notifications";
import { emailOnPurchased } from "@/lib/email-templates";
import type { ScriptDoc } from "@/types/script";

import type { ActionResult } from "./auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getFeeRate(): Promise<number> {
  const snap = await getAdminDb().collection("config").doc("platform").get();
  return (snap.data() as { feeRate?: number } | undefined)?.feeRate ?? 0.165;
}

/**
 * 有料台本の Stripe Checkout セッションを作成する。
 * spec.md §1-4 createCheckoutSession。
 *
 * 処理:
 * 1. 台本の存在・公開・価格確認
 * 2. 二重購入チェック
 * 3. 出品者の Stripe Connected Account を取得
 * 4. Stripe Checkout Session 作成（application_fee_amount = price × feeRate）
 * 5. sessionURL を返す
 */
export async function createCheckoutSession(
  scriptId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const scriptSnap = await db.collection("scripts").doc(scriptId).get();
  if (!scriptSnap.exists) return { success: false, error: "台本が見つかりません" };
  const script = scriptSnap.data() as ScriptDoc;
  if (script.status !== "published") return { success: false, error: "この台本は購入できません" };
  if (script.price <= 0) return { success: false, error: "無料台本は createFreePurchase を使ってください" };
  if (script.authorUid === me.uid) return { success: false, error: "自分の台本は購入できません" };

  // 二重購入チェック
  const dupSnap = await db
    .collection("purchases")
    .where("buyerUid", "==", me.uid)
    .where("scriptId", "==", scriptId)
    .limit(1)
    .get();
  if (!dupSnap.empty) return { success: false, error: "この台本は既に購入済みです" };

  // 出品者の Stripe アカウント
  const authorSnap = await db.collection("users").doc(script.authorUid).get();
  const authorData = authorSnap.data() as { stripeAccountId?: string } | undefined;
  if (!authorData?.stripeAccountId) {
    return { success: false, error: "出品者の決済アカウントが未設定です" };
  }

  const feeRate = await getFeeRate();
  const applicationFee = Math.floor(script.price * feeRate);

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
              name: script.title,
              description: `台本「${script.title}」の購入`,
            },
            unit_amount: script.price,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: authorData.stripeAccountId,
        },
      },
      metadata: {
        type: "purchase",
        scriptId,
        buyerUid: me.uid,
        authorUid: script.authorUid,
        amount: String(script.price),
        platformFee: String(applicationFee),
      },
      success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/scripts/${scriptId}`,
    });

    if (!session.url) {
      return { success: false, error: "チェックアウトURLの生成に失敗しました" };
    }
    return { success: true, data: { url: session.url } };
  } catch (err) {
    console.error("[createCheckoutSession] failed", err);
    return { success: false, error: "チェックアウトの作成に失敗しました" };
  }
}

/**
 * 無料台本の購入記録を作成する。
 * spec.md §1-4 createFreePurchase。
 */
export async function createFreePurchase(
  scriptId: string,
): Promise<ActionResult> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const scriptSnap = await db.collection("scripts").doc(scriptId).get();
  if (!scriptSnap.exists) return { success: false, error: "台本が見つかりません" };
  const script = scriptSnap.data() as ScriptDoc;
  if (script.status !== "published") return { success: false, error: "この台本は購入できません" };
  if (script.price !== 0) return { success: false, error: "有料台本は createCheckoutSession を使ってください" };
  if (script.authorUid === me.uid) return { success: false, error: "自分の台本は購入できません" };

  // 二重購入チェック
  const dupSnap = await db
    .collection("purchases")
    .where("buyerUid", "==", me.uid)
    .where("scriptId", "==", scriptId)
    .limit(1)
    .get();
  if (!dupSnap.empty) return { success: false, error: "この台本は既に購入済みです" };

  try {
    const ref = db.collection("purchases").doc();
    const batch = db.batch();
    batch.set(ref, {
      id: ref.id,
      buyerUid: me.uid,
      scriptId,
      authorUid: script.authorUid,
      amount: 0,
      platformFee: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(db.collection("scripts").doc(scriptId), {
      "stats.purchaseCount": FieldValue.increment(1),
    });
    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error("[createFreePurchase] failed", err);
    return { success: false, error: "購入に失敗しました" };
  }
}

/**
 * 購入済み台本の PDF ダウンロード URL を取得する。
 * spec.md §1-4 getDownloadUrl。
 * 署名付きURL（有効期限1時間）を返す。
 */
export async function getDownloadUrl(
  scriptId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!scriptId) return { success: false, error: "台本IDが指定されていません" };
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  // 購入記録チェック
  const purchaseSnap = await db
    .collection("purchases")
    .where("buyerUid", "==", me.uid)
    .where("scriptId", "==", scriptId)
    .limit(1)
    .get();
  if (purchaseSnap.empty) {
    return { success: false, error: "この台本は購入されていません" };
  }

  const scriptSnap = await db.collection("scripts").doc(scriptId).get();
  if (!scriptSnap.exists) return { success: false, error: "台本が見つかりません" };
  const script = scriptSnap.data() as ScriptDoc;

  try {
    const bucket = getAdminStorage().bucket();
    const file = bucket.file(script.pdfUrl);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    return { success: true, data: { url } };
  } catch (err) {
    console.error("[getDownloadUrl] failed", err);
    return { success: false, error: "ダウンロードURLの生成に失敗しました" };
  }
}

export type PurchaseListItem = {
  id: string;
  scriptId: string;
  scriptTitle: string;
  amount: number;
  createdAt: string;
};

/**
 * 購入済み台本一覧を取得する。
 * spec.md §1-4 getMyPurchases。
 */
export async function getMyPurchases(): Promise<ActionResult<PurchaseListItem[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const snap = await db
    .collection("purchases")
    .where("buyerUid", "==", me.uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  // scriptId → title を取得
  const scriptIds = [...new Set(snap.docs.map((d) => d.data().scriptId as string))];
  const scriptRefs = scriptIds.map((id) => db.collection("scripts").doc(id));
  const scriptSnaps = scriptRefs.length > 0 ? await db.getAll(...scriptRefs) : [];
  const titleMap = new Map<string, string>();
  for (const s of scriptSnaps) {
    if (s.exists) titleMap.set(s.id, (s.data() as ScriptDoc).title);
  }

  const items: PurchaseListItem[] = snap.docs.map((doc) => {
    const d = doc.data() as {
      scriptId: string;
      amount: number;
      createdAt: unknown;
    };
    let createdAt = "";
    const ts = d.createdAt;
    if (ts && typeof ts === "object" && "toDate" in ts) {
      createdAt = (ts as { toDate(): Date }).toDate().toISOString();
    }
    return {
      id: doc.id,
      scriptId: d.scriptId,
      scriptTitle: titleMap.get(d.scriptId) ?? "（削除済み）",
      amount: d.amount ?? 0,
      createdAt,
    };
  });
  return { success: true, data: items };
}

/**
 * Webhook 用: checkout.session.completed の台本購入処理。
 * route.ts から呼ばれる。
 */
export async function handlePurchaseWebhook(metadata: {
  scriptId: string;
  buyerUid: string;
  authorUid: string;
  amount: string;
  platformFee: string;
  stripePaymentIntentId?: string;
}): Promise<void> {
  const db = getAdminDb();
  const scriptId = metadata.scriptId;
  const buyerUid = metadata.buyerUid;
  const authorUid = metadata.authorUid;
  const amount = Number(metadata.amount);
  const platformFee = Number(metadata.platformFee);

  // 二重購入チェック (冪等)
  const dupSnap = await db
    .collection("purchases")
    .where("buyerUid", "==", buyerUid)
    .where("scriptId", "==", scriptId)
    .limit(1)
    .get();
  if (!dupSnap.empty) {
    console.log(`[handlePurchaseWebhook] duplicate purchase for script=${scriptId} buyer=${buyerUid}`);
    return;
  }

  const ref = db.collection("purchases").doc();
  const batch = db.batch();
  batch.set(ref, {
    id: ref.id,
    buyerUid,
    scriptId,
    authorUid,
    amount,
    platformFee,
    stripePaymentIntentId: metadata.stripePaymentIntentId ?? "",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(db.collection("scripts").doc(scriptId), {
    "stats.purchaseCount": FieldValue.increment(1),
  });
  await batch.commit();

  // 出品者にメール通知 (onPurchased)
  const [scriptSnap, authorSnap, buyerSnap] = await Promise.all([
    db.collection("scripts").doc(scriptId).get(),
    db.collection("users").doc(authorUid).get(),
    db.collection("users").doc(buyerUid).get(),
  ]);
  const scriptTitle = (scriptSnap.data() as ScriptDoc | undefined)?.title ?? "";
  const authorName = (authorSnap.data() as { displayName?: string } | undefined)?.displayName ?? "";
  const buyerName = (buyerSnap.data() as { displayName?: string } | undefined)?.displayName ?? "";

  const tpl = emailOnPurchased({
    authorName,
    buyerName,
    scriptTitle,
    scriptId,
    amount,
  });
  void notify(authorUid, "onPurchased", tpl.subject, tpl.html);
}
