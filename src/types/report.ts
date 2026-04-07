// Report types matching docs/spec.md §5

import type { Timestamp } from "firebase/firestore";

export type ReportTargetType = "script" | "review" | "message" | "user";
export type ReportStatus = "pending" | "resolved" | "dismissed";

export type ReportDoc = {
  id: string;
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description: string;
  status: ReportStatus;
  createdAt: Timestamp | Date;
  resolvedAt?: Timestamp | Date | null;
  /** 管理者がメモした内容 */
  adminNote?: string;
};

export type SerializedReport = Omit<ReportDoc, "createdAt" | "resolvedAt"> & {
  createdAt: string;
  resolvedAt: string | null;
};

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "スパム・宣伝" },
  { value: "inappropriate", label: "不適切なコンテンツ" },
  { value: "copyright", label: "著作権侵害" },
  { value: "harassment", label: "ハラスメント" },
  { value: "fraud", label: "詐欺・なりすまし" },
  { value: "other", label: "その他" },
];
