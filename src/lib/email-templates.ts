import "server-only";

// 5種類のメールテンプレート（spec.md §10）
//
// すべて純粋関数: 引数を受け取り subject / html を返す。
// HTML は最低限の構造で、Pass2 で Resend のテンプレート機能を使うように置き換え可能。

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333; background: #fafaf8;">
    <h2 style="font-size: 18px; margin-bottom: 16px;">${escape(title)}</h2>
    ${body}
    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">脚本マーケット<br/><a href="${APP_URL}" style="color: #888;">${APP_URL}</a></p>
  </body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Template = {
  subject: string;
  html: string;
};

/** 1. 台本購入 → 出品者 */
export function emailOnPurchased(args: {
  authorName: string;
  buyerName: string;
  scriptTitle: string;
  scriptId: string;
  amount: number;
}): Template {
  const url = `${APP_URL}/scripts/${args.scriptId}`;
  return {
    subject: `[脚本マーケット] 『${args.scriptTitle}』が購入されました`,
    html: wrap(
      "台本が購入されました",
      `<p>${escape(args.authorName)} 様</p>
       <p>『<a href="${url}">${escape(args.scriptTitle)}</a>』が ${escape(args.buyerName)} さんに購入されました（¥${args.amount.toLocaleString()}）。</p>`,
    ),
  };
}

/** 2. 請求支払い → 出品者 */
export function emailOnInvoicePaid(args: {
  recipientName: string;
  payerName: string;
  amount: number;
  chatId: string;
}): Template {
  const url = `${APP_URL}/chat/${args.chatId}`;
  return {
    subject: `[脚本マーケット] 請求 ¥${args.amount.toLocaleString()} が支払われました`,
    html: wrap(
      "請求が支払われました",
      `<p>${escape(args.recipientName)} 様</p>
       <p>${escape(args.payerName)} さんから ¥${args.amount.toLocaleString()} の支払いがありました。</p>
       <p><a href="${url}">チャットを開く</a></p>`,
    ),
  };
}

/** 3. チャット新着 → 受信者 */
export function emailOnNewMessage(args: {
  recipientName: string;
  senderName: string;
  preview: string;
  chatId: string;
}): Template {
  const url = `${APP_URL}/chat/${args.chatId}`;
  return {
    subject: `[脚本マーケット] ${args.senderName} さんからメッセージが届きました`,
    html: wrap(
      "新着メッセージ",
      `<p>${escape(args.recipientName)} 様</p>
       <p>${escape(args.senderName)} さんからメッセージが届きました。</p>
       <blockquote style="border-left: 3px solid #ddd; margin: 12px 0; padding-left: 12px; color: #555;">${escape(args.preview)}</blockquote>
       <p><a href="${url}">チャットを開く</a></p>`,
    ),
  };
}

/** 4. 台本更新 → 購入者 */
export function emailOnScriptUpdated(args: {
  recipientName: string;
  scriptTitle: string;
  scriptId: string;
}): Template {
  const url = `${APP_URL}/scripts/${args.scriptId}`;
  return {
    subject: `[脚本マーケット] 『${args.scriptTitle}』が更新されました`,
    html: wrap(
      "購入済み台本が更新されました",
      `<p>${escape(args.recipientName)} 様</p>
       <p>購入済みの『<a href="${url}">${escape(args.scriptTitle)}</a>』に新しいバージョンが公開されました。</p>`,
    ),
  };
}

/** 5. レビュー投稿 → 出品者 */
export function emailOnNewReview(args: {
  authorName: string;
  reviewerName: string;
  scriptTitle: string;
  scriptId: string;
  rating: number;
}): Template {
  const url = `${APP_URL}/scripts/${args.scriptId}`;
  const stars = "★".repeat(args.rating) + "☆".repeat(5 - args.rating);
  return {
    subject: `[脚本マーケット] 『${args.scriptTitle}』に新しいレビューが投稿されました`,
    html: wrap(
      "新しいレビュー",
      `<p>${escape(args.authorName)} 様</p>
       <p>『<a href="${url}">${escape(args.scriptTitle)}</a>』に ${escape(args.reviewerName)} さんからレビュー (${stars}) が投稿されました。</p>`,
    ),
  };
}
