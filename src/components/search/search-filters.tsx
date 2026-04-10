"use client";

import { useRefinementList, useNumericMenu } from "react-instantsearch";

import {
  GENRES,
  PERFORMANCE_TYPES,
  TARGET_AUDIENCES,
  SCRIPT_TAG_DEFINITIONS,
} from "@/lib/script-tags";

const PRICE_RANGES = [
  { label: "無料", end: 0 },
  { label: "〜¥1,000", end: 1000 },
  { label: "〜¥3,000", end: 3000 },
  { label: "〜¥5,000", end: 5000 },
  { label: "¥5,000以上", start: 5000 },
];

const DURATION_RANGES = [
  { label: "30分以下", end: 30 },
  { label: "30〜60分", start: 30, end: 60 },
  { label: "60〜120分", start: 60, end: 120 },
  { label: "120分以上", start: 120 },
];

/**
 * 検索フィルター UI 全体。
 * - PC: サイドバー表示
 * - スマホ: モーダル内に同じ内容を表示
 */
export function SearchFilters() {
  return (
    <div className="space-y-6">
      <FacetCheckList attribute="genres" label="ジャンル" options={GENRES as readonly string[]} />
      <FacetCheckList
        attribute="performanceType"
        label="上演形態"
        options={PERFORMANCE_TYPES as readonly string[]}
      />
      <FacetCheckList
        attribute="targetAudience"
        label="対象層"
        options={TARGET_AUDIENCES as readonly string[]}
      />
      <NumericFacetGroup attribute="price" label="価格" ranges={PRICE_RANGES} />
      <NumericFacetGroup attribute="duration" label="上演時間" ranges={DURATION_RANGES} />
      {/* NumericRange (castMax / feeScheduleMin) は useRange のデフォルト値が
          フィルタとして常時適用されてしまう問題 (BUG-A) のため、一旦 NumericMenu 方式に変更。
          将来 useRange の挙動を調整して精密な数値入力に戻す。 */}
      <NumericFacetGroup
        attribute="castMax"
        label="キャスト最大人数"
        ranges={[
          { label: "1〜3人", end: 3 },
          { label: "4〜6人", start: 4, end: 6 },
          { label: "7〜10人", start: 7, end: 10 },
          { label: "11人以上", start: 11 },
        ]}
      />
      <ScriptTagsFacet />
    </div>
  );
}

function FacetCheckList({
  attribute,
  label,
  options,
}: {
  attribute: string;
  label: string;
  options: readonly string[];
}) {
  const { items, refine } = useRefinementList({
    attribute,
    limit: 30,
    operator: "or",
  });
  const refinedSet = new Set(items.filter((i) => i.isRefined).map((i) => i.value));
  return (
    <div>
      <p className="text-foreground mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = refinedSet.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => refine(opt)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-pressed={selected}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NumericFacetGroup({
  attribute,
  label,
  ranges,
}: {
  attribute: string;
  label: string;
  ranges: { label: string; start?: number; end?: number }[];
}) {
  const { items, refine } = useNumericMenu({
    attribute,
    items: ranges.map((r) => ({
      label: r.label,
      start: r.start,
      end: r.end,
    })),
  });
  return (
    <div>
      <p className="text-foreground mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => refine(item.value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              item.isRefined
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
            aria-pressed={item.isRefined}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// NumericRange (useRange) は BUG-A の原因だったため削除。
// 代わりに NumericFacetGroup (useNumericMenu) でプリセット範囲を使う。

function ScriptTagsFacet() {
  const { items, refine } = useRefinementList({
    attribute: "scriptTags",
    limit: 100,
    operator: "or",
  });
  const refinedSet = new Set(items.filter((i) => i.isRefined).map((i) => i.value));

  // カテゴリ別にグループ化
  const byCategory = new Map<string, typeof SCRIPT_TAG_DEFINITIONS>();
  for (const tag of SCRIPT_TAG_DEFINITIONS) {
    if (!byCategory.has(tag.category)) byCategory.set(tag.category, []);
    byCategory.get(tag.category)!.push(tag);
  }
  const CATEGORY_LABELS: Record<string, string> = {
    "stage-equipment": "舞台設備",
    "performance-style": "演出・表現",
    flexibility: "上演の柔軟性",
    feature: "作品の特徴",
    "venue-size": "会場規模",
    protagonist: "主人公",
    "cast-age": "主要キャスト年齢層",
  };

  return (
    <div>
      <p className="text-foreground mb-2 text-sm font-medium">特性タグ</p>
      <div className="space-y-3">
        {[...byCategory.entries()].map(([category, tags]) => (
          <div key={category}>
            <p className="text-muted-foreground mb-1 text-xs">
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const selected = refinedSet.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => refine(t.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                    aria-pressed={selected}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
