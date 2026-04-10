"use client";

import { InstantSearchNext } from "react-instantsearch-nextjs";
import { algoliasearch } from "algoliasearch";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? "";

const searchClient = algoliasearch(APP_ID, SEARCH_KEY);

export const SCRIPTS_INDEX = "scripts";

type Props = {
  children: React.ReactNode;
  initialUiState?: Record<string, unknown>;
};

/**
 * Algolia InstantSearch のプロバイダ。
 * URL 状態と同期するため react-instantsearch-nextjs を使う。
 * Search-Only Key で初期化済み。
 */
export function SearchProvider({ children, initialUiState }: Props) {
  return (
    <InstantSearchNext
      searchClient={searchClient}
      indexName={SCRIPTS_INDEX}
      routing
      future={{
        preserveSharedStateOnUnmount: true,
        persistHierarchicalRootCount: true,
      }}
      initialUiState={
        initialUiState as Parameters<typeof InstantSearchNext>[0]["initialUiState"]
      }
    >
      {children}
    </InstantSearchNext>
  );
}
