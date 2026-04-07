// Chat types matching docs/spec.md §5

import type { Timestamp } from "firebase/firestore";

export type ChatDoc = {
  id: string;
  participants: string[]; // 2名の uid
  participantNames: Record<string, string>; // uid → displayName
  lastMessage: string;
  lastMessageAt: Timestamp | Date;
  lastMessageBy: string;
  createdAt: Timestamp | Date;
};

export type MessageType = "text" | "hearingSheetResponse" | "invoice" | "system";

export type MessageDoc = {
  id: string;
  senderUid: string;
  type: MessageType;
  /** type=text の場合のみ意味を持つ */
  text?: string;
  /** type=hearingSheetResponse の場合（配列形式・order 順） */
  hearingSheetData?: { question: string; answer: string; order: number }[];
  /** type=invoice の場合 */
  invoiceId?: string;
  createdAt: Timestamp | Date;
};

/**
 * 2名の uid からチャットルーム ID を生成する（一意性のため）。
 * 同じペアに対しては常に同じ chatId が返るため、二重作成を避けられる。
 */
export function chatIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}
