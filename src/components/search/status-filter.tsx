"use client";

import { Configure } from "react-instantsearch";

/**
 * published な台本のみを検索結果に含めるフィルター。
 * unlisted な台本が検索に出るのを防ぐ (Critical security fix)。
 *
 * InstantSearch の <Configure> はレンダリング不要のヘッドレスコンポーネントで、
 * Algolia API に送るクエリパラメータに filters を付与する。
 */
export function StatusFilter() {
  return <Configure filters="status:published" />;
}
