import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
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

  // 冪等性チェック (events コレクションに event.id を保存)
  const db = getAdminDb();
  const eventRef = db.collection("stripeEvents").doc(event.id);
  try {
    await eventRef.create({
      type: event.type,
      receivedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    const code = (err as { code?: number | string } | null)?.code;
    if (code === 6 || code === "already-exists") {
      // 既に処理済み
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] event log create failed", err);
    return new NextResponse("Event log error", { status: 500 });
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event);
        break;
      case "checkout.session.completed":
        // P2-5 (台本購入) と P2-6 (請求支払い) で実装する
        // 現時点ではログだけ出して成功扱い
        console.log("[stripe-webhook] checkout.session.completed (handler deferred to P2-5/P2-6)");
        break;
      default:
        // 未対応イベントは ack だけして無視
        console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}`, err);
    // Stripe にリトライしてもらえるよう 500 を返す。冪等チェックがあるので重複処理は安全。
    return new NextResponse("Handler error", { status: 500 });
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
