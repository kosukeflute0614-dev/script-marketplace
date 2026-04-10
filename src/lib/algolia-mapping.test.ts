import { describe, expect, it } from "vitest";

import { scriptToAlgoliaRecord } from "./algolia-mapping";
import { INITIAL_SCRIPT_STATS } from "@/types/script";

describe("scriptToAlgoliaRecord", () => {
  const base = {
    id: "test-id",
    authorUid: "uid-should-not-appear",
    authorUserId: "author-user-id",
    authorDisplayName: "Author Name",
    title: "Test Script",
    slug: "test-script",
    synopsis: "A test synopsis",
    genres: ["コメディ"],
    castTotal: { min: 3, max: 5 },
    castBreakdown: { male: 2, female: 2, unspecified: 1 },
    duration: 60,
    performanceType: ["ストレートプレイ"],
    targetAudience: ["一般"],
    themeTags: [],
    price: 1500,
    isFreeFullText: false,
    thumbnailUrl: "",
    pdfUrl: "scripts/test/v1/script.pdf",
    currentVersion: 1,
    feeSchedule: [{ condition: "1ステージ", amount: 5000 }],
    feeScheduleMin: 5000,
    performanceHistory: [],
    authorComment: "",
    hearingSheet: [],
    scriptTags: ["no-props"],
    badges: [],
    rankings: {},
    status: "published" as const,
    stats: { ...INITIAL_SCRIPT_STATS, favoriteCount: 10 },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
  };

  it("objectID に docId を使う", () => {
    const record = scriptToAlgoliaRecord(base, "doc-123");
    expect(record.objectID).toBe("doc-123");
  });

  it("authorUid を含まない (セキュリティ)", () => {
    const record = scriptToAlgoliaRecord(base, "doc-123");
    expect("authorUid" in record).toBe(false);
  });

  it("authorUserId を含む", () => {
    const record = scriptToAlgoliaRecord(base, "doc-123");
    expect(record.authorUserId).toBe("author-user-id");
  });

  it("createdAt を Unix エポック秒に変換する", () => {
    const record = scriptToAlgoliaRecord(base, "doc-123");
    expect(record.createdAt).toBe(Math.floor(new Date("2024-01-01").getTime() / 1000));
  });

  it("castTotal を castMin / castMax にフラット化する", () => {
    const record = scriptToAlgoliaRecord(base, "doc-123");
    expect(record.castMin).toBe(3);
    expect(record.castMax).toBe(5);
  });

  it("stats を viewCount 等のフラットフィールドに展開する", () => {
    const record = scriptToAlgoliaRecord(base, "doc-123");
    expect(record.favoriteCount).toBe(10);
    expect(record.purchaseCount).toBe(0);
  });
});
