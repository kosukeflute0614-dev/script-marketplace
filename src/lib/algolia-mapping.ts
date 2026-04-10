// Firestore scripts ドキュメント → Algolia レコードへの変換ロジック
//
// 使う場所:
// - scripts/algolia-init.ts (初期インデックス時)
// - src/app/actions/scripts-edit.ts (createScript / updateScript / unlistScript)

import type { ScriptDoc } from "@/types/script";

export type AlgoliaScriptRecord = {
  objectID: string;
  title: string;
  slug: string;
  synopsis: string;
  authorUid: string;
  authorUserId: string;
  authorDisplayName: string;
  genres: string[];
  performanceType: string[];
  targetAudience: string[];
  themeTags: string[];
  scriptTags: string[];
  badges: string[];
  castMin: number;
  castMax: number;
  castMale: number;
  castFemale: number;
  castUnspecified: number;
  duration: number;
  price: number;
  isFreeFullText: boolean;
  thumbnailUrl: string;
  feeScheduleMin: number | null;
  status: string;
  viewCount: number;
  favoriteCount: number;
  purchaseCount: number;
  reviewCount: number;
  reviewAverage: number;
  consultationCount: number;
  /** Unix エポック秒 (Algolia の数値ファセット用) */
  createdAt: number;
};

function toEpochSeconds(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return Math.floor((value as { toMillis(): number }).toMillis() / 1000);
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return (value as { _seconds: number })._seconds;
  }
  if (typeof value === "number") return value;
  return 0;
}

export function scriptToAlgoliaRecord(
  doc: ScriptDoc,
  docId: string,
): AlgoliaScriptRecord {
  return {
    objectID: docId,
    title: doc.title ?? "",
    slug: doc.slug ?? "",
    synopsis: doc.synopsis ?? "",
    authorUid: doc.authorUid ?? "",
    authorUserId: doc.authorUserId ?? "",
    authorDisplayName: doc.authorDisplayName ?? "",
    genres: doc.genres ?? [],
    performanceType: doc.performanceType ?? [],
    targetAudience: doc.targetAudience ?? [],
    themeTags: doc.themeTags ?? [],
    scriptTags: doc.scriptTags ?? [],
    badges: doc.badges ?? [],
    castMin: doc.castTotal?.min ?? 0,
    castMax: doc.castTotal?.max ?? 0,
    castMale: doc.castBreakdown?.male ?? 0,
    castFemale: doc.castBreakdown?.female ?? 0,
    castUnspecified: doc.castBreakdown?.unspecified ?? 0,
    duration: doc.duration ?? 0,
    price: doc.price ?? 0,
    isFreeFullText: doc.isFreeFullText ?? false,
    thumbnailUrl: doc.thumbnailUrl ?? "",
    feeScheduleMin: doc.feeScheduleMin ?? null,
    status: doc.status ?? "published",
    viewCount: doc.stats?.viewCount ?? 0,
    favoriteCount: doc.stats?.favoriteCount ?? 0,
    purchaseCount: doc.stats?.purchaseCount ?? 0,
    reviewCount: doc.stats?.reviewCount ?? 0,
    reviewAverage: doc.stats?.reviewAverage ?? 0,
    consultationCount: doc.stats?.consultationCount ?? 0,
    createdAt: toEpochSeconds(doc.createdAt),
  };
}
