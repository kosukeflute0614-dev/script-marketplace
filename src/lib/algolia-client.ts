"use client";

import { algoliasearch, type Algoliasearch } from "algoliasearch";

let cached: Algoliasearch | null = null;

/**
 * クライアントサイドの Algolia 検索クライアント (Search-Only Key)。
 */
export function getAlgoliaClient(): Algoliasearch | null {
  if (cached) return cached;
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  if (!appId || !searchKey) {
    console.error("Algolia client env vars are not set");
    return null;
  }
  cached = algoliasearch(appId, searchKey);
  return cached;
}
