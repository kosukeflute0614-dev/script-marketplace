import "server-only";

import { getAlgoliaAdmin, ALGOLIA_INDEX_SCRIPTS } from "@/lib/algolia";
import { scriptToAlgoliaRecord } from "@/lib/algolia-mapping";
import type { ScriptDoc } from "@/types/script";

/**
 * 単一の scripts ドキュメントを Algolia インデックスへ upsert する。
 * 失敗しても呼び出し側の処理を止めないよう、エラーは log だけにして throw しない。
 *
 * 仕様 (spec.md §7): firestore-algolia-search Extension を使う想定だが、
 * Pass1 では Server Action から直接 saveObject を呼ぶ簡易同期方式を採用する。
 * 本番運用で必要なら Cloud Functions onWrite trigger に移行可能。
 */
export async function syncScriptToAlgolia(doc: ScriptDoc, docId: string): Promise<void> {
  try {
    const algolia = getAlgoliaAdmin();
    const record = scriptToAlgoliaRecord(doc, docId);
    await algolia.saveObject({ indexName: ALGOLIA_INDEX_SCRIPTS, body: record });
  } catch (err) {
    console.error(`[algolia-sync] failed to sync script ${docId}`, err);
  }
}

/**
 * Algolia インデックスから scripts レコードを削除する。
 * unlistScript / forceUnlistScript / 削除時に呼ぶ。
 */
export async function removeScriptFromAlgolia(docId: string): Promise<void> {
  try {
    const algolia = getAlgoliaAdmin();
    await algolia.deleteObject({
      indexName: ALGOLIA_INDEX_SCRIPTS,
      objectID: docId,
    });
  } catch (err) {
    console.error(`[algolia-sync] failed to delete script ${docId}`, err);
  }
}
