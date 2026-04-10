// 台本タイトルから URL スラッグを生成するユーティリティ
//
// 仕様 (spec.md §6 / spec-details.md §1-2):
// - SEO 用 URL は /scripts/{slug}-{id} の形
// - 重複時は末尾に連番を付ける（呼び出し側で対応）
//
// このモジュールは「単一スラッグの生成」だけを担当する。

const ASCII_ONLY_REGEX = /^[\x00-\x7F]+$/;

/**
 * タイトルから単一スラッグを生成する。
 *
 * - ASCII のみ → 小文字化 + 非英数字をハイフンに置換 + 連続ハイフンを1つに
 * - 非 ASCII (日本語等) を含む → タイトルを除いた汎用スラッグを返す
 *
 * id 部分にはハイフンを含まない英数字を使う前提。スラッグ末尾に -id を結合する都合上、
 * id がハイフンを含まない限り URL の lastIndexOf("-") 分割は安全。
 */
export function generateSlug(title: string): string {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return "untitled";
  if (ASCII_ONLY_REGEX.test(trimmed)) {
    const ascii = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
    return ascii || "untitled";
  }
  // 非 ASCII (日本語など) → タイトルから推測できる romaji 変換は本来必要だが
  // pure JS で正確に行うのは困難なので、ここでは汎用スラッグを返す。
  // ユーザーが手動で設定したい場合は createScript の slug パラメータで override 可能。
  return "script";
}

/**
 * 重複しない slug を確保するため、ベース slug に対して連番付き候補を順次返すジェネレータ。
 * 呼び出し側で「Firestore に既に存在するか」をチェックしながら使う。
 *
 * 例: base="romeo" → "romeo", "romeo-2", "romeo-3", ...
 */
export function* slugCandidates(base: string): Generator<string> {
  yield base;
  let i = 2;
  while (i <= 999) {
    yield `${base}-${i}`;
    i += 1;
  }
}
