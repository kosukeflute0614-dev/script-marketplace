// 台本ランキングのスコア算出 + ジャンル/対象層別ランキング計算
//
// 仕様 (spec.md §11):
// - スコア = favoriteCount + purchaseCount * 3 + viewCount * 0.1
// - ジャンル・対象層ごとに順位を計算
// - 日次バッチで scripts.rankings を更新（Cloud Functions デプロイは Pass2）

import type { ScriptDoc, ScriptStats } from "@/types/script";

/** 純粋関数: スコア算出 */
export function calculateScore(stats: Pick<ScriptStats, "favoriteCount" | "purchaseCount" | "viewCount">): number {
  return stats.favoriteCount + stats.purchaseCount * 3 + stats.viewCount * 0.1;
}

export type ScriptForRanking = Pick<
  ScriptDoc,
  "id" | "genres" | "targetAudience" | "stats" | "status"
>;

export type RankingsByCategory = Record<string, { rank: number; total: number }>;

/**
 * 台本リスト全体から、ジャンル別 / 対象層別の各カテゴリでのランキング (rank, total) を計算する。
 *
 * 結果は scriptId → {category: {rank, total}} の Map で返す。
 * status が published 以外の台本はランキングから除外する。
 *
 * @returns Map<scriptId, RankingsByCategory>
 */
export function calculateRankings(scripts: ScriptForRanking[]): Map<string, RankingsByCategory> {
  // published のみを対象
  const published = scripts.filter((s) => s.status === "published");

  // カテゴリ → [{ id, score }] のグループ
  const groups = new Map<string, { id: string; score: number }[]>();
  for (const s of published) {
    const score = calculateScore(s.stats);
    for (const genre of s.genres ?? []) {
      const key = `genre:${genre}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ id: s.id, score });
    }
    for (const audience of s.targetAudience ?? []) {
      const key = `audience:${audience}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ id: s.id, score });
    }
  }

  // 各グループを score 降順でソートして順位を割り当てる
  const result = new Map<string, RankingsByCategory>();
  for (const [category, list] of groups.entries()) {
    list.sort((a, b) => b.score - a.score);
    list.forEach((item, idx) => {
      const rank = idx + 1;
      const total = list.length;
      const existing = result.get(item.id) ?? {};
      existing[category] = { rank, total };
      result.set(item.id, existing);
    });
  }
  return result;
}
