import "server-only";

/**
 * Resend SDK のスタブ実装。
 *
 * Pass1 では実際のメール送信を行わず、コンソールにログ出力する。
 * Pass2 (P2-7) で本物の Resend SDK 呼び出しに **このファイルだけ** を差し替える。
 *
 * シグネチャは Resend SDK の `resend.emails.send` に揃えてあるため、差し替え時の
 * 呼び出し側変更は不要 (from / to / subject / html を渡すだけ)。
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

const DEFAULT_FROM = "脚本マーケット <noreply@example.com>";

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
  // Pass1: コンソールに送信内容をログ出力するだけのスタブ
  // Pass2 で以下に置き換える:
  //   const { Resend } = await import("resend");
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   const { data, error } = await resend.emails.send({ from, to, subject, html });
  //   if (error) return { success: false, error: error.message };
  //   return { success: true, id: data.id };
  console.log(
    "[resend-stub] sendEmail",
    JSON.stringify(
      { from, to: params.to, subject: params.subject, htmlPreview: params.html.slice(0, 200) },
      null,
      2,
    ),
  );
  return { success: true, id: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
}
