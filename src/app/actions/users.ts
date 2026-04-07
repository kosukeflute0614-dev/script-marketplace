"use server";

import { getAdminDb } from "@/lib/firebase-admin";
import type { UserDoc } from "@/types/user";

import type { ActionResult } from "./auth";

export type PublicUser = {
  uid: string;
  userId: string;
  displayName: string;
  bio: string;
  iconUrl: string;
  twitter: string;
  website: string;
  isAuthor: boolean;
};

/**
 * userId からユーザーのプロフィール情報を取得する（公開情報のみ）。
 *
 * userIds 補助コレクションを索引として使い、対応する uid を引いてから
 * users ドキュメントを取得する。
 */
export async function getPublicUserByUserId(
  userId: string,
): Promise<ActionResult<PublicUser | null>> {
  const trimmed = (userId ?? "").trim().toLowerCase();
  if (!trimmed) {
    return { success: false, error: "ユーザーIDが指定されていません" };
  }
  try {
    const db = getAdminDb();
    const userIdSnap = await db.collection("userIds").doc(trimmed).get();
    if (!userIdSnap.exists) {
      return { success: true, data: null };
    }
    const { uid } = userIdSnap.data() as { uid?: string };
    if (!uid) {
      return { success: true, data: null };
    }
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return { success: true, data: null };
    }
    const data = userSnap.data() as UserDoc;
    return {
      success: true,
      data: {
        uid: data.uid,
        userId: data.userId,
        displayName: data.displayName,
        bio: data.bio ?? "",
        iconUrl: data.iconUrl ?? "",
        twitter: data.snsLinks?.twitter ?? "",
        website: data.snsLinks?.website ?? "",
        isAuthor: data.stripeOnboarded === true,
      },
    };
  } catch (err) {
    console.error("[getPublicUserByUserId] failed", err);
    return { success: false, error: "ユーザー情報の取得に失敗しました" };
  }
}
