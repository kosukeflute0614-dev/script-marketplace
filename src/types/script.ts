// Script-related types matching docs/spec.md §5
//
// 注意: Timestamp はクライアントサイド (firebase/firestore) と
// サーバーサイド (firebase-admin/firestore) で別の型。
// この型ファイルはクライアント・サーバー両方から import されるため、
// クライアント版を import しつつ、サーバー側では構造的に互換のある
// firebase-admin の Timestamp も受け取れるよう Date を併記する。

import type { Timestamp } from "firebase/firestore";

export type CastTotal = { min: number; max: number };
export type CastBreakdown = { male: number; female: number; unspecified: number };

export type FeeScheduleItem = {
  condition: string;
  amount: number;
  note?: string;
};

export type PerformanceHistoryItem = {
  year: number;
  groupName: string;
  venue?: string;
  note?: string;
};

export type HearingSheetItem = {
  question: string;
  order: number;
};

export type ScriptStats = {
  viewCount: number;
  favoriteCount: number;
  purchaseCount: number;
  reviewCount: number;
  reviewAverage: number;
  consultationCount: number;
};

export const INITIAL_SCRIPT_STATS: ScriptStats = {
  viewCount: 0,
  favoriteCount: 0,
  purchaseCount: 0,
  reviewCount: 0,
  reviewAverage: 0,
  consultationCount: 0,
};

export type ScriptStatus = "published" | "unlisted";

export type ScriptDoc = {
  id: string;
  authorUid: string;
  authorUserId: string;
  authorDisplayName: string;
  title: string;
  slug: string;
  synopsis: string;
  genres: string[];
  castTotal: CastTotal;
  castBreakdown: CastBreakdown;
  duration: number; // 分
  performanceType: string[];
  targetAudience?: string[];
  themeTags?: string[];
  price: number;
  isFreeFullText: boolean;
  thumbnailUrl?: string;
  pdfUrl: string;
  currentVersion: number;
  feeSchedule?: FeeScheduleItem[];
  feeScheduleMin?: number;
  performanceHistory?: PerformanceHistoryItem[];
  authorComment?: string;
  hearingSheet?: HearingSheetItem[];
  scriptTags?: string[];
  badges?: string[];
  rankings?: Record<string, { rank: number; total: number }>;
  status: ScriptStatus;
  stats: ScriptStats;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};
