import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { handlePurchaseWebhook } from "@/app/actions/purchase";
import type Stripe from "stripe";

// Next.js Route Handler の設定
// - 動的: 毎回サーバーで実行
// - Node.js runtime: stripe SDK は Node.js 専用 (Edge では動かない)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe Webhook ハンドラ
 *
 * 処理対象イベント:
 * - account.updated → users.stripeOnboarded を更新
 * - checkout.session.completed → P2-5/P2-6 で実装
 *
 * 冪等性確保: events サブコレクションに event.id を保存し、重複処理を防ぐ。
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // raw body を取得して署名検証
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // 冪等性チェック:
  // 各ハンドラ自体が冪等に設計されている (purchases 重複チェック、set merge:true 等)。
  // stripeEvents コレクションは処理完了 **後** に書き込む。
  // こうすることで「ハンドラ失敗 → Stripe リトライ → stripeEvents に already-exists で弾かれる」
  // という Critical な状況を防ぐ。
  const db = getAdminDb();
  const eventRef = db.collection("stripeEvents").doc(event.id);

  // まず既に処理済みかチェック (get のみ、create はまだしない)
  const eventSnap = await eventRef.get();
  if (eventSnap.exists && (eventSnap.data() as { processed?: boolean })?.processed === true) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event);
        break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      default:
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}`, err);
    // ハンドラ失敗 → 500 を返して Stripe にリトライさせる
    // stripeEvents は書き込まないので、次回リトライ時にハンドラが再実行される
    return new NextResponse("Handler error", { status: 500 });
  }

  // ハンドラ成功後に processed: true で記録 (次回リトライ時にスキップ)
  try {
    await eventRef.set({
      type: event.type,
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // ログ書き込み失敗は致命的ではない (ハンドラ自体は冪等)
  }

  return NextResponse.json({ received: true });
}

/**
 * account.updated イベントの処理
 * - account.metadata.uid から users ドキュメントを特定
 * - charges_enabled && details_submitted && payouts_enabled で stripeOnboarded を更新
 *
 * NOTE: users ドキュメントが存在しない競合状態 (例: 新規登録直後で createSession 完了前)
 *       でも壊れないように set({ merge: true }) を使う。
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  const uid = account.metadata?.uid;
  if (!uid) {
    console.warn("[stripe-webhook] account.updated without metadata.uid", account.id);
    return;
  }
  const onboarded =
    Boolean(account.charges_enabled) &&
    Boolean(account.details_submitted) &&
    Boolean(account.payouts_enabled);
  await getAdminDb()
    .collection("users")
    .doc(uid)
    .set(
      {
        stripeAccountId: account.id,
        stripeOnboarded: onboarded,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  console.log(
    `[stripe-webhook] account.updated synced uid=${uid} accountId=${account.id} onboarded=${onboarded}`,
  );
}

/**
 * checkout.session.completed イベントの処理
 * metadata.type で購入 / 請求支払い を分岐する。
 */
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const type = metadata.type;

  if (type === "purchase") {
    await handlePurchaseWebhook({
      scriptId: metadata.scriptId ?? "",
      buyerUid: metadata.buyerUid ?? "",
      authorUid: metadata.authorUid ?? "",
      amount: metadata.amount ?? "0",
      platformFee: metadata.platformFee ?? "0",
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? "",
    });
    console.log(
      `[stripe-webhook] purchase completed script=${metadata.scriptId} buyer=${metadata.buyerUid}`,
    );
  } else if (type === "invoice_payment") {
    // P2-6 で実装
    console.log("[stripe-webhook] invoice_payment completed (handler deferred to P2-6)");
  } else {
    console.warn(`[stripe-webhook] checkout.session.completed with unknown type: ${type}`);
  }
}
