import "server-only";

import { algoliasearch, type Algoliasearch } from "algoliasearch";

let cached: Algoliasearch | null = null;

export const ALGOLIA_INDEX_SCRIPTS = "scripts";
export const ALGOLIA_REPLICAS = {
  newest: "scripts_newest",
  priceAsc: "scripts_price_asc",
  priceDesc: "scripts_price_desc",
  rating: "scripts_rating",
} as const;

/**
 * サーバーサイドの Algolia Admin クライアントを取得する。
 * 環境変数 NEXT_PUBLIC_ALGOLIA_APP_ID と ALGOLIA_ADMIN_API_KEY が必須。
 */
export function getAlgoliaAdmin(): Algoliasearch {
  if (cached) return cached;
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;
  if (!appId || !adminKey) {
    throw new Error(
      "NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY must be set in environment variables",
    );
  }
  cached = algoliasearch(appId, adminKey);
  return cached;
}
