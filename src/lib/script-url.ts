// 台本詳細ページの URL パースと正規化（spec.md §6）
//
// 仕様:
// - SEO 用 URL: `/scripts/{slug}-{id}`
// - 短縮 URL: `/scripts/{id}` → スラッグ付き URL にリダイレクト
//
// 制約: id はハイフンを含まない英数字（Firestore auto ID は20文字英数字、seed も英数字のみ）。
// この前提により、handle を末尾の `-` で分割すれば slug と id を一意に取り出せる。

export type ParsedScriptHandle = {
  /** URL 末尾のセグメント全文 */
  raw: string;
  /** URL に含まれていた slug。短縮形なら空文字 */
  slugFromUrl: string;
  /** URL に含まれていた id（必須） */
  id: string;
  /** 短縮形 (`/scripts/{id}`) なら true */
  isShortForm: boolean;
};

export function parseScriptHandle(handle: string): ParsedScriptHandle {
  const raw = (handle ?? "").trim();
  const lastDash = raw.lastIndexOf("-");
  if (lastDash === -1) {
    // 短縮形
    return { raw, slugFromUrl: "", id: raw, isShortForm: true };
  }
  // SEO 形式: 末尾 `-` 以降が id
  const slugFromUrl = raw.slice(0, lastDash);
  const id = raw.slice(lastDash + 1);
  return { raw, slugFromUrl, id, isShortForm: false };
}

/**
 * 正規の SEO URL を生成する。
 */
export function canonicalScriptPath(slug: string, id: string): string {
  if (!slug) return `/scripts/${id}`;
  return `/scripts/${slug}-${id}`;
}
