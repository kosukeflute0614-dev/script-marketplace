// 特性タグの定義（spec-details.md §3-1）と config/platform への投入用初期値

export type ScriptTagCategory =
  | "stage-equipment"
  | "performance-style"
  | "flexibility"
  | "feature"
  | "venue-size"
  | "protagonist"
  | "cast-age";

export type ScriptTagDefinition = {
  id: string;
  label: string;
  category: ScriptTagCategory;
};

export const SCRIPT_TAG_DEFINITIONS: ScriptTagDefinition[] = [
  // 舞台設備（5）
  { id: "no-props", label: "大道具なし", category: "stage-equipment" },
  { id: "basic-lighting", label: "照明シンプル", category: "stage-equipment" },
  { id: "no-sound", label: "音響なし", category: "stage-equipment" },
  { id: "simple-costume", label: "衣装シンプル", category: "stage-equipment" },
  { id: "single-scene", label: "一場転換なし", category: "stage-equipment" },
  // 演出・表現（5）
  { id: "dance", label: "ダンスあり", category: "performance-style" },
  { id: "swordplay", label: "殺陣あり", category: "performance-style" },
  { id: "video-production", label: "映像演出あり", category: "performance-style" },
  { id: "audience-participation", label: "観客参加型", category: "performance-style" },
  { id: "dialect", label: "方言活用", category: "performance-style" },
  // 上演の柔軟性（3）
  { id: "adaptation-ok", label: "改変・抜粋OK", category: "flexibility" },
  { id: "cast-adjustable", label: "人数調整可", category: "flexibility" },
  { id: "gender-swap-ok", label: "男女入替可", category: "flexibility" },
  // 作品の特徴（3）
  { id: "reading-ok", label: "朗読劇対応", category: "feature" },
  { id: "monologue", label: "モノローグ", category: "feature" },
  { id: "tearjerker", label: "泣ける", category: "feature" },
  // 会場規模（2）
  { id: "small-theater", label: "小劇場向き", category: "venue-size" },
  { id: "large-theater", label: "大劇場向き", category: "venue-size" },
  // 主人公（3）
  { id: "protagonist-male", label: "主人公男性", category: "protagonist" },
  { id: "protagonist-female", label: "主人公女性", category: "protagonist" },
  { id: "protagonist-any", label: "主人公性別不問", category: "protagonist" },
  // 主要キャスト年齢層（5）
  { id: "age-junior-high", label: "中学生", category: "cast-age" },
  { id: "age-high-school", label: "高校生", category: "cast-age" },
  { id: "age-young-adult", label: "大学生・若者", category: "cast-age" },
  { id: "age-adult", label: "大人", category: "cast-age" },
  { id: "age-senior", label: "シニア", category: "cast-age" },
];

export const GENRES = [
  "現代劇",
  "時代劇",
  "不条理劇",
  "ポストドラマ演劇",
  "悲劇",
  "喜劇",
  "コメディ",
  "人情劇",
  "恋愛",
  "翻案戯曲",
  "SF・近未来",
  "ホラー",
  "ミステリー",
  "サスペンス",
  "ファンタジー",
  "学園モノ",
  "アングラ",
  "評伝劇",
  "政治・社会問題",
  "アヴァンギャルド・前衛",
  "お茶の間",
  "ナンセンス",
  "青春",
  "群像劇",
  "実験演劇",
] as const;

export const PERFORMANCE_TYPES = [
  "ストレートプレイ",
  "ミュージカル",
  "朗読劇",
  "一人芝居",
  "短編（30分以下）",
] as const;

export const TARGET_AUDIENCES = [
  "一般",
  "高校演劇向け",
  "大学演劇向け",
  "子供向け",
  "シニア向け",
] as const;

/** デフォルトヒアリングシートのテンプレート（spec-details.md §3-2） */
import type { HearingSheetQuestion } from "@/types/user";

export const DEFAULT_HEARING_SHEET_TEMPLATE: HearingSheetQuestion[] = [
  { order: 1, question: "団体名を教えてください" },
  { order: 2, question: "公演形態を教えてください（本公演 / ワークショップ / 大会 / 授業）" },
  { order: 3, question: "出演人数を教えてください" },
  { order: 4, question: "公演日程を教えてください" },
  { order: 5, question: "公演回数を教えてください" },
  { order: 6, question: "会場名・客席数を教えてください" },
  { order: 7, question: "チケット料金を教えてください（有料の場合）" },
  { order: 8, question: "台本の改変はありますか？" },
  { order: 9, question: "映像配信・録画の予定はありますか？" },
];

/** トップページの初期セクション（spec-details.md §3-3） */
export const INITIAL_TOP_PAGE_SECTIONS = [
  { type: "newest", title: "新着台本", limit: 8 },
  { type: "popular", title: "人気の台本", limit: 8 },
];

// 通知設定の初期値は src/types/user.ts の DEFAULT_NOTIFICATION_SETTINGS を参照
