"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { chatIdFor, type ChatDoc } from "@/types/chat";
import type { ConsultationDoc } from "@/types/consultation";

import type { ActionResult } from "./auth";

const MAX_TEXT_LENGTH = 4000;

/**
 * チャットルームを開設する。spec.md §1-5 startChat。
 *
 * - 同じ相手とのチャットルームが既にあるか確認
 *   - あり: 既存の chatId を返す
 *   - なし: 新規作成（chatId は2名の uid をソートして join した決定論的 ID）
 * - 自分自身とのチャットは禁止
 *
 * @param targetUid 相手のユーザー UID
 */
export async function startChat(targetUid: string): Promise<ActionResult<{ chatId: string }>> {
  const trimmed = (targetUid ?? "").trim();
  if (!trimmed) {
    return { success: false, error: "相手を指定してください" };
  }

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  if (trimmed === me.uid) {
    return { success: false, error: "自分自身とのチャットは作成できません" };
  }

  const db = getAdminDb();

  // 相手ユーザーの存在確認 + displayName 取得
  const targetSnap = await db.collection("users").doc(trimmed).get();
  if (!targetSnap.exists) {
    return { success: false, error: "指定されたユーザーが存在しません" };
  }
  const targetData = targetSnap.data() as { displayName?: string } | undefined;
  const targetDisplayName = targetData?.displayName ?? "ユーザー";

  const chatId = chatIdFor(me.uid, trimmed);
  const chatRef = db.collection("chats").doc(chatId);

  try {
    await chatRef.create({
      id: chatId,
      participants: [me.uid, trimmed],
      participantNames: {
        [me.uid]: me.displayName,
        [trimmed]: targetDisplayName,
      },
      lastMessage: "",
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: "",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    const code = (err as { code?: number | string } | null)?.code;
    if (code !== 6 && code !== "already-exists") {
      console.error("[startChat] failed", err);
      return { success: false, error: "チャットの開設に失敗しました" };
    }
    // 既に存在 → そのまま既存の chatId を返す
  }

  return { success: true, data: { chatId } };
}

/**
 * テキストメッセージを送信する。spec.md §1-5 sendMessage。
 *
 * - チャット参加者でなければ拒否
 * - messages サブコレクションに追加
 * - 親 chats ドキュメントの lastMessage / lastMessageAt / lastMessageBy を更新
 * - **作家が初めて text を送信した時**に該当 consultation の作家側 status を
 *   unresponded → in_progress に自動遷移する (spec.md §1-5 sendMessage 補足)
 */
export async function sendMessage(
  chatId: string,
  text: string,
): Promise<ActionResult<{ messageId: string }>> {
  const trimmedText = (text ?? "").trim();
  if (!trimmedText) {
    return { success: false, error: "メッセージを入力してください" };
  }
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return { success: false, error: `メッセージは${MAX_TEXT_LENGTH}文字以下で入力してください` };
  }

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const chatRef = db.collection("chats").doc(chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    return { success: false, error: "チャットが見つかりません" };
  }
  const chatData = chatSnap.data() as ChatDoc | undefined;
  if (!chatData || !chatData.participants.includes(me.uid)) {
    return { success: false, error: "このチャットに参加していません" };
  }

  // 自分が作家として参加している consultation を検索（unresponded のものだけ status 更新）
  // chatId == ? AND authorUid == me.uid で取れる
  const myAuthorConsultationsSnap = await db
    .collection("consultations")
    .where("chatId", "==", chatId)
    .where("authorUid", "==", me.uid)
    .get();

  // メッセージ作成 + 親ドキュメント更新 + consultation status 更新を 1 batch で
  const messageRef = chatRef.collection("messages").doc();
  const batch = db.batch();
  batch.set(messageRef, {
    senderUid: me.uid,
    type: "text",
    text: trimmedText,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(chatRef, {
    lastMessage: trimmedText,
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageBy: me.uid,
  });

  // 「初回返信」: 作家側 status が unresponded のものを in_progress に遷移
  for (const cdoc of myAuthorConsultationsSnap.docs) {
    const cdata = cdoc.data() as ConsultationDoc;
    if (cdata.status?.[me.uid] === "unresponded") {
      batch.update(cdoc.ref, {
        [`status.${me.uid}`]: "in_progress",
      });
    }
  }

  try {
    await batch.commit();
  } catch (err) {
    console.error("[sendMessage] failed", err);
    return { success: false, error: "メッセージの送信に失敗しました" };
  }

  return { success: true, data: { messageId: messageRef.id } };
}

export type ChatListItem = {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  /** 自分を除く相手の uid */
  partnerUid: string;
  partnerName: string;
  lastMessage: string;
  lastMessageAt: string | null; // ISO string にシリアライズ
  lastMessageBy: string;
};

/**
 * 自分のチャット一覧を取得する。spec.md §1-5 getMyChats。
 * 最終メッセージ日時の降順でソート。
 */
export async function getMyChats(): Promise<ActionResult<ChatListItem[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const snap = await db
    .collection("chats")
    .where("participants", "array-contains", me.uid)
    .orderBy("lastMessageAt", "desc")
    .limit(100)
    .get();

  const items: ChatListItem[] = snap.docs.map((doc) => {
    const data = doc.data() as ChatDoc;
    const partnerUid = data.participants.find((p) => p !== me.uid) ?? "";
    const partnerName = data.participantNames[partnerUid] ?? "ユーザー";
    const lastMessageAt =
      data.lastMessageAt && "toDate" in data.lastMessageAt
        ? (data.lastMessageAt as { toDate(): Date }).toDate().toISOString()
        : data.lastMessageAt instanceof Date
          ? data.lastMessageAt.toISOString()
          : null;
    return {
      id: doc.id,
      participants: data.participants,
      participantNames: data.participantNames,
      partnerUid,
      partnerName,
      lastMessage: data.lastMessage ?? "",
      lastMessageAt,
      lastMessageBy: data.lastMessageBy ?? "",
    };
  });

  return { success: true, data: items };
}
