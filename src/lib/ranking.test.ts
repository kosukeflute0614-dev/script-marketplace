import { describe, expect, it } from "vitest";

import { calculateRankings, calculateScore, type ScriptForRanking } from "./ranking";

const baseStats = {
  viewCount: 0,
  favoriteCount: 0,
  purchaseCount: 0,
  reviewCount: 0,
  reviewAverage: 0,
  consultationCount: 0,
};

describe("calculateScore", () => {
  it("仕様通り favoriteCount + purchaseCount*3 + viewCount*0.1 を返す", () => {
    expect(
      calculateScore({ favoriteCount: 10, purchaseCount: 5, viewCount: 100 }),
    ).toBe(10 + 5 * 3 + 100 * 0.1);
  });

  it("ゼロでも安全に動作する", () => {
    expect(calculateScore({ favoriteCount: 0, purchaseCount: 0, viewCount: 0 })).toBe(0);
  });
});

describe("calculateRankings", () => {
  it("ジャンル別に正しい順位を返す", () => {
    const scripts: ScriptForRanking[] = [
      {
        id: "a",
        genres: ["コメディ"],
        targetAudience: [],
        status: "published",
        stats: { ...baseStats, favoriteCount: 50 },
      },
      {
        id: "b",
        genres: ["コメディ"],
        targetAudience: [],
        status: "published",
        stats: { ...baseStats, favoriteCount: 100 },
      },
      {
        id: "c",
        genres: ["悲劇"],
        targetAudience: [],
        status: "published",
        stats: { ...baseStats, favoriteCount: 200 },
      },
    ];
    const result = calculateRankings(scripts);
    expect(result.get("a")).toEqual({ "genre:コメディ": { rank: 2, total: 2 } });
    expect(result.get("b")).toEqual({ "genre:コメディ": { rank: 1, total: 2 } });
    expect(result.get("c")).toEqual({ "genre:悲劇": { rank: 1, total: 1 } });
  });

  it("複数ジャンルを持つ台本は各ジャンルでランキングされる", () => {
    const scripts: ScriptForRanking[] = [
      {
        id: "x",
        genres: ["コメディ", "恋愛"],
        targetAudience: [],
        status: "published",
        stats: { ...baseStats, favoriteCount: 10 },
      },
      {
        id: "y",
        genres: ["コメディ"],
        targetAudience: [],
        status: "published",
        stats: { ...baseStats, favoriteCount: 5 },
      },
    ];
    const result = calculateRankings(scripts);
    expect(result.get("x")).toEqual({
      "genre:コメディ": { rank: 1, total: 2 },
      "genre:恋愛": { rank: 1, total: 1 },
    });
    expect(result.get("y")).toEqual({ "genre:コメディ": { rank: 2, total: 2 } });
  });

  it("対象層別にもランキングを計算する", () => {
    const scripts: ScriptForRanking[] = [
      {
        id: "p",
        genres: ["青春"],
        targetAudience: ["高校演劇向け"],
        status: "published",
        stats: { ...baseStats, favoriteCount: 30 },
      },
      {
        id: "q",
        genres: ["青春"],
        targetAudience: ["高校演劇向け"],
        status: "published",
        stats: { ...baseStats, favoriteCount: 20 },
      },
    ];
    const result = calculateRankings(scripts);
    expect(result.get("p")?.["audience:高校演劇向け"]).toEqual({ rank: 1, total: 2 });
    expect(result.get("q")?.["audience:高校演劇向け"]).toEqual({ rank: 2, total: 2 });
  });

  it("unlisted な台本はランキングから除外する", () => {
    const scripts: ScriptForRanking[] = [
      {
        id: "a",
        genres: ["コメディ"],
        targetAudience: [],
        status: "published",
        stats: { ...baseStats, favoriteCount: 5 },
      },
      {
        id: "b",
        genres: ["コメディ"],
        targetAudience: [],
        status: "unlisted",
        stats: { ...baseStats, favoriteCount: 100 },
      },
    ];
    const result = calculateRankings(scripts);
    expect(result.get("a")).toEqual({ "genre:コメディ": { rank: 1, total: 1 } });
    expect(result.get("b")).toBeUndefined();
  });
});
