"use client";

import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

let cached: Promise<StripeClient | null> | null = null;

/**
 * クライアントサイドの Stripe.js を取得する。
 * 1度だけ loadStripe を呼んでキャッシュする。
 */
export function getStripeClient(): Promise<StripeClient | null> {
  if (cached) return cached;
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) {
    console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
    return Promise.resolve(null);
  }
  cached = loadStripe(pk);
  return cached;
}
