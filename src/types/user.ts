// User-related types matching docs/spec.md §5

import type { Timestamp } from "firebase/firestore";

/**
 * notificationSettings の各キー（spec.md §10）
 */
export type NotificationSettings = {
  onPurchased: boolean;
  onInvoicePaid: boolean;
  onNewMessage: boolean;
  onScriptUpdated: boolean;
  onNewReview: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  onPurchased: true,
  onInvoicePaid: true,
  onNewMessage: true,
  onScriptUpdated: true,
  onNewReview: true,
};

export type UserSnsLinks = {
  twitter?: string;
  website?: string;
};

export type HearingSheetQuestion = {
  question: string;
  order: number;
};

/**
 * Firestore の users ドキュメント（spec.md §5）
 * createdAt/updatedAt はクライアント側で扱うときに Date | Timestamp 両方ありうる
 */
export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  /** ユーザーID（URL用、変更不可、未設定時は空文字） */
  userId: string;
  bio?: string;
  iconUrl?: string;
  snsLinks?: UserSnsLinks;
  stripeAccountId?: string;
  stripeOnboarded?: boolean;
  isAdmin?: boolean;
  hearingSheet?: HearingSheetQuestion[];
  notificationSettings: NotificationSettings;
  /** Online判定用（spec §9 チャット通知のオンライン判定） */
  lastActiveAt?: Timestamp | Date | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};

/**
 * クライアント Server Component から Client Component へ受け渡すとき用の
 * シリアライズ済みユーザーデータ（Timestamp を ISO string にしたもの）
 */
export type SerializedUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** Firebase Auth の sign_in_provider（"password" / "google.com" 等） */
  signInProvider: string;
  displayName: string;
  userId: string;
  bio?: string;
  iconUrl?: string;
  snsLinks?: UserSnsLinks;
  stripeOnboarded: boolean;
  isAdmin: boolean;
  notificationSettings: NotificationSettings;
};
