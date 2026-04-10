import "server-only";

import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * サーバーサイドの Stripe SDK インスタンスを取得する。
 * 環境変数 STRIPE_SECRET_KEY が必須。
 */
export function getStripe(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  cached = new Stripe(secretKey, {
    // SDK バージョンに同梱されている API バージョンを使う
    typescript: true,
  });
  return cached;
}

/**
 * Webhook 署名検証用シークレット
 */
export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set in environment variables");
  }
  return secret;
}
