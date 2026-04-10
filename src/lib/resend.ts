import "server-only";

import { Resend } from "resend";

/**
 * Resend SDK を使った実メール送信。
 *
 * Pass1 ではスタブ (console.log のみ) だったが、P2-7 で実 SDK 呼び出しに置き換え。
 * シグネチャは変えていないため、呼び出し側の変更は不要。
 *
 * 環境変数:
 * - RESEND_API_KEY: Resend ダッシュボードで発行した API キー
 * - RESEND_FROM_EMAIL: 送信元アドレス (デフォルト: onboarding@resend.dev)
 */

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  /** 省略時は環境変数 RESEND_FROM_EMAIL or デフォルト値 */
  from?: string;
};

export type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

const DEFAULT_FROM = "脚本マーケット <onboarding@resend.dev>";

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }
  cached = new Resend(apiKey);
  return cached;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;

  // RESEND_API_KEY が未設定の場合はスタブモードにフォールバック
  if (!process.env.RESEND_API_KEY) {
    console.log(
      "[resend-fallback] sendEmail (no API key)",
      JSON.stringify(
        { from, to: params.to, subject: params.subject },
        null,
        2,
      ),
    );
    return { success: true, id: `fallback-${Date.now()}` };
  }

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[resend] send error", error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("[resend] unexpected error", err);
    return { success: false, error: err instanceof Error ? err.message : "Resend error" };
  }
}
