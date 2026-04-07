// Consultation types matching docs/spec.md §5

import type { Timestamp } from "firebase/firestore";

export type ConsultationStatus =
  | "unresponded" // 作家側初期値
  | "in_progress" // 作家が返信開始
  | "consulting" // 利用者側初期値
  | "completed";

export type HearingSheetResponse = {
  question: string;
  order: number;
  answer: string;
};

/**
 * チャット内の hearingSheetResponse メッセージで使う回答エントリ。
 * order を持つ配列形式で保存し、表示順を保証する。
 */
export type HearingSheetResponseEntry = {
  question: string;
  answer: string;
  order: number;
};

export type ConsultationDoc = {
  id: string;
  scriptId: string;
  scriptTitle: string;
  requesterUid: string;
  authorUid: string;
  chatId: string;
  /** 配列形式 (order 順)。空配列ならヒアリングシートなし。 */
  hearingSheetData: HearingSheetResponseEntry[];
  /** 各参加者ごとの状態 */
  status: Record<string, ConsultationStatus>;
  createdAt: Timestamp | Date;
};
