"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { getStripe } from "@/lib/stripe";
import type { UserDoc } from "@/types/user";

import type { ActionResult } from "./auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Stripe Connect Express アカウントのオンボーディングを開始する。
 * spec.md §1-11 createConnectAccount。
 *
 * 処理:
 * 1. 既に Stripe アカウントがあれば再利用、なければ Stripe.accounts.create
 * 2. AccountLink を作成して onboarding URL を発行
 * 3. users.stripeAccountId を保存
 *
 * 戻り値: onboardingUrl
 */
export async function createConnectAccount(): Promise<ActionResult<{ clientSecret: string; accountId: string }>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const stripe = getStripe();
  const db = getAdminDb();
  const userRef = db.collection("users").doc(me.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() as UserDoc | undefined;

  let accountId = userData?.stripeAccountId;

  try {
    // 1. アカウント未作成なら新規作成
    //    Stripe API でアカウント作成 → Firestore 保存の間でクラッシュした場合に
    //    Stripe 側に孤立アカウントが残るのを防ぐため、metadata.uid で既存アカウントを
    //    検索するリカバリ処理を入れる。
    if (!accountId) {
      // リカバリ: metadata.uid で既存アカウントを検索 (1ページ目だけで十分)
      const existing = await stripe.accounts.list({ limit: 100 });
      const recovered = existing.data.find((a) => a.metadata?.uid === me.uid);
      if (recovered) {
        accountId = recovered.id;
        console.log(`[createConnectAccount] recovered orphan account ${accountId} for uid=${me.uid}`);
      } else {
        const account = await stripe.accounts.create({
          type: "express",
          country: "JP",
          email: me.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual",
          metadata: { uid: me.uid },
        });
        accountId = account.id;
      }
      // 必ず Firestore に保存してから次へ進む
      await userRef.set(
        {
          stripeAccountId: accountId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    // 2. Embedded Onboarding 用の Account Session を作成
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return {
      success: true,
      data: {
        clientSecret: accountSession.client_secret,
        accountId,
      },
    };
  } catch (err) {
    console.error("[createConnectAccount] failed", err);
    return { success: false, error: "Stripe 連携の開始に失敗しました" };
  }
}

/**
 * Stripe Express ダッシュボードのリンクを取得する。
 * spec.md §1-11 getConnectDashboardUrl。
 */
export async function getConnectDashboardUrl(): Promise<ActionResult<{ url: string }>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const userSnap = await getAdminDb().collection("users").doc(me.uid).get();
  const userData = userSnap.data() as UserDoc | undefined;
  if (!userData?.stripeAccountId) {
    return { success: false, error: "Stripe 連携が完了していません" };
  }
  try {
    const link = await getStripe().accounts.createLoginLink(userData.stripeAccountId);
    return { success: true, data: { url: link.url } };
  } catch (err) {
    console.error("[getConnectDashboardUrl] failed", err);
    return { success: false, error: "ダッシュボード URL の取得に失敗しました" };
  }
}

/**
 * 売上サマリーを取得する。spec.md §1-11 getPayoutSummary。
 *
 * Stripe API から残高 (available + pending) を取得して返す。
 */
export type PayoutSummary = {
  availableJpy: number;
  pendingJpy: number;
  currency: string;
};

export async function getPayoutSummary(): Promise<ActionResult<PayoutSummary>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const userSnap = await getAdminDb().collection("users").doc(me.uid).get();
  const userData = userSnap.data() as UserDoc | undefined;
  if (!userData?.stripeAccountId) {
    return { success: false, error: "Stripe 連携が完了していません" };
  }
  try {
    const stripe = getStripe();
    // Connected account の残高は2番目の RequestOptions で stripeAccount を指定する
    const balance = await stripe.balance.retrieve(
      {},
      { stripeAccount: userData.stripeAccountId },
    );
    const availableJpy = (balance.available ?? [])
      .filter((b) => b.currency === "jpy")
      .reduce((sum, b) => sum + b.amount, 0);
    const pendingJpy = (balance.pending ?? [])
      .filter((b) => b.currency === "jpy")
      .reduce((sum, b) => sum + b.amount, 0);
    return {
      success: true,
      data: { availableJpy, pendingJpy, currency: "jpy" },
    };
  } catch (err) {
    console.error("[getPayoutSummary] failed", err);
    return { success: false, error: "売上サマリーの取得に失敗しました" };
  }
}

/**
 * Stripe アカウントの現在の状態を Stripe API から取得して
 * users.stripeOnboarded を最新化する。
 *
 * Webhook が遅延した場合の補償として戻り URL から呼ぶ用途。
 */
export async function syncStripeAccountStatus(): Promise<
  ActionResult<{ stripeOnboarded: boolean }>
> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }
  const db = getAdminDb();
  const userRef = db.collection("users").doc(me.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() as UserDoc | undefined;
  if (!userData?.stripeAccountId) {
    return { success: false, error: "Stripe アカウントが未作成です" };
  }
  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(userData.stripeAccountId);
    // charges_enabled / details_submitted / payouts_enabled の3つ全てで完全連携と判定
    const onboarded =
      Boolean(account.charges_enabled) &&
      Boolean(account.details_submitted) &&
      Boolean(account.payouts_enabled);
    if (onboarded !== userData.stripeOnboarded) {
      await userRef.update({
        stripeOnboarded: onboarded,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { success: true, data: { stripeOnboarded: onboarded } };
  } catch (err) {
    console.error("[syncStripeAccountStatus] failed", err);
    return { success: false, error: "Stripe アカウント状態の同期に失敗しました" };
  }
}
