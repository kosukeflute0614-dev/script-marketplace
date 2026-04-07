"use server";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { chatIdFor } from "@/types/chat";
import type { ConsultationDoc, ConsultationStatus } from "@/types/consultation";
import type { ScriptDoc } from "@/types/script";

import type { ActionResult } from "./auth";
// NOTE: メール通知 (Resend) の呼び出しは P1-11 で追加する。
//       Step 13 では Firestore 操作のみを実装し、通知トリガーポイントを TODO で記録する。

/**
 * 上演許可の相談を作成する。spec.md §1-5b createConsultation。
 *
 * 処理:
 * 1. 該当台本を取得し、作家UIDを確定
 * 2. 自分自身の台本には相談できない（作家本人）
 * 3. 作家とのチャットルームを取得 or 新規作成（決定論的 chatId）
 * 4. consultations ドキュメント作成
 *    - status: 作家=unresponded, 利用者=consulting
 * 5. チャットに type=system メッセージと type=hearingSheetResponse メッセージを投稿
 * 6. scripts.stats.consultationCount をインクリメント
 * 7. 作家へメール通知 (TODO: P1-11 で実装)
 *
 * @param input.scriptId
 * @param input.responses - { questionText: answerText }
 */
export type CreateConsultationInput = {
  scriptId: string;
  responses: Record<string, string>;
};

export async function createConsultation(
  input: CreateConsultationInput,
): Promise<ActionResult<{ consultationId: string; chatId: string }>> {
  const scriptId = (input.scriptId ?? "").trim();
  const responses = input.responses ?? {};
  if (!scriptId) {
    return { success: false, error: "台本IDが指定されていません" };
  }

  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();

  // 1. 台本取得
  const scriptRef = db.collection("scripts").doc(scriptId);
  const scriptSnap = await scriptRef.get();
  if (!scriptSnap.exists) {
    return { success: false, error: "台本が見つかりません" };
  }
  const script = scriptSnap.data() as ScriptDoc;
  if (script.status !== "published") {
    return { success: false, error: "この台本は閲覧できません" };
  }
  if (script.authorUid === me.uid) {
    return { success: false, error: "自分の台本には相談を送れません" };
  }

  // 2. チャットルーム取得 or 作成のための準備
  const chatId = chatIdFor(me.uid, script.authorUid);
  const chatRef = db.collection("chats").doc(chatId);

  // 作家の displayName を取得
  const authorSnap = await db.collection("users").doc(script.authorUid).get();
  const authorDisplayName =
    (authorSnap.data() as { displayName?: string } | undefined)?.displayName ??
    script.authorDisplayName;

  // 3-6. 全操作をトランザクションでまとめて原子性を保証する。
  // (chat 作成 + consultation + system / hearingSheetResponse メッセージ + chat 更新 + script.stats)
  // 並走による「孤立 chat」「消費されない consultation」を防ぐ。
  const consultationRef = db.collection("consultations").doc();
  const systemMessageRef = chatRef.collection("messages").doc();
  const responseMessageRef = chatRef.collection("messages").doc();
  const systemText = `${me.displayName}さんが『${script.title}』の上演許可について相談を送りました`;

  // hearingSheetData は表示順を保つために order を含む配列形式で保存する。
  // 仕様 spec.md §5 messages.hearingSheetData は構造を厳密に規定していないため
  // 配列形式を採用 (object key の列挙順保証がない問題を回避)。
  const responseEntries: { question: string; answer: string; order: number }[] = Object.entries(
    responses,
  ).map(([question, answer], i) => ({ question, answer, order: i + 1 }));

  const status: Record<string, ConsultationStatus> = {
    [me.uid]: "consulting",
    [script.authorUid]: "unresponded",
  };

  try {
    await db.runTransaction(async (tx) => {
      const chatTxSnap = await tx.get(chatRef);

      // chat 作成 (存在しなければ)
      if (!chatTxSnap.exists) {
        tx.set(chatRef, {
          id: chatId,
          participants: [me.uid, script.authorUid],
          participantNames: {
            [me.uid]: me.displayName,
            [script.authorUid]: authorDisplayName,
          },
          lastMessage: systemText,
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessageBy: me.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.update(chatRef, {
          lastMessage: systemText,
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessageBy: me.uid,
        });
      }

      // consultation
      tx.set(consultationRef, {
        id: consultationRef.id,
        scriptId,
        scriptTitle: script.title,
        requesterUid: me.uid,
        authorUid: script.authorUid,
        chatId,
        hearingSheetData: responseEntries,
        status,
        createdAt: FieldValue.serverTimestamp(),
      } satisfies Omit<ConsultationDoc, "createdAt" | "hearingSheetData"> & {
        createdAt: FirebaseFirestore.FieldValue;
        hearingSheetData: typeof responseEntries;
      });

      // system + hearingSheetResponse メッセージ
      tx.set(systemMessageRef, {
        senderUid: me.uid,
        type: "system",
        text: systemText,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(responseMessageRef, {
        senderUid: me.uid,
        type: "hearingSheetResponse",
        text: "",
        hearingSheetData: responseEntries,
        createdAt: FieldValue.serverTimestamp(),
      });

      // scripts.stats.consultationCount インクリメント
      tx.update(scriptRef, {
        "stats.consultationCount": FieldValue.increment(1),
      });
    });
  } catch (err) {
    console.error("[createConsultation] transaction failed", err);
    return { success: false, error: "相談の送信に失敗しました" };
  }

  // TODO(P1-11): 作家へメール通知 (sendEmail with onPurchased を流用しないこと)
  //              docs/notification-triggers.md に「createConsultation 後に onNewMessage 通知」を記録予定

  return {
    success: true,
    data: { consultationId: consultationRef.id, chatId },
  };
}

export type SerializedConsultation = {
  id: string;
  scriptId: string;
  scriptTitle: string;
  requesterUid: string;
  authorUid: string;
  chatId: string;
  hearingSheetData: { question: string; answer: string; order: number }[];
  status: Record<string, ConsultationStatus>;
  createdAt: string;
};

function serializeConsultation(data: ConsultationDoc, id: string): SerializedConsultation {
  const ts = data.createdAt;
  let createdAt = "";
  if (ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function") {
    createdAt = (ts.toDate() as Date).toISOString();
  } else if (ts instanceof Date) {
    createdAt = ts.toISOString();
  }
  return {
    id,
    scriptId: data.scriptId,
    scriptTitle: data.scriptTitle,
    requesterUid: data.requesterUid,
    authorUid: data.authorUid,
    chatId: data.chatId,
    hearingSheetData: Array.isArray(data.hearingSheetData) ? data.hearingSheetData : [],
    status: data.status ?? {},
    createdAt,
  };
}

/**
 * 自分が関与する相談の一覧を取得する。spec.md §1-5b getMyConsultations。
 *
 * 関与: requesterUid または authorUid が自分。
 *
 * @param statusFilter "unresponded" / "in_progress" / "consulting" / "completed" / undefined（全件）
 */
export async function getMyConsultations(
  statusFilter?: ConsultationStatus,
): Promise<ActionResult<SerializedConsultation[]>> {
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();

  // requesterUid と authorUid の両方を 2 クエリで取得
  const [asRequester, asAuthor] = await Promise.all([
    db
      .collection("consultations")
      .where("requesterUid", "==", me.uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get(),
    db
      .collection("consultations")
      .where("authorUid", "==", me.uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get(),
  ]);

  const map = new Map<string, SerializedConsultation>();
  for (const doc of [...asRequester.docs, ...asAuthor.docs]) {
    const data = doc.data() as ConsultationDoc;
    map.set(doc.id, serializeConsultation(data, doc.id));
  }
  let items = Array.from(map.values());
  // ソート: createdAt 降順
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (statusFilter) {
    items = items.filter((c) => c.status[me.uid] === statusFilter);
  }
  return { success: true, data: items };
}

/**
 * 相談を完了にする。spec.md §1-5b completeConsultation。
 *
 * - 自分の status を completed に更新
 * - 相手の status は変えない
 * - チャットに type=system メッセージ「{ユーザー名}さんがやり取りを完了しました」
 */
export async function completeConsultation(
  consultationId: string,
): Promise<ActionResult> {
  if (!consultationId) {
    return { success: false, error: "相談IDが指定されていません" };
  }
  let me;
  try {
    me = await requireUser();
  } catch {
    return { success: false, error: "ログインが必要です" };
  }

  const db = getAdminDb();
  const ref = db.collection("consultations").doc(consultationId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { success: false, error: "相談が見つかりません" };
  }
  const data = snap.data() as ConsultationDoc;
  if (data.requesterUid !== me.uid && data.authorUid !== me.uid) {
    return { success: false, error: "この操作を行う権限がありません" };
  }

  const chatRef = db.collection("chats").doc(data.chatId);
  const systemMessageRef = chatRef.collection("messages").doc();
  const systemText = `${me.displayName}さんがやり取りを完了しました`;

  const batch = db.batch();
  batch.update(ref, {
    [`status.${me.uid}`]: "completed",
  });
  batch.set(systemMessageRef, {
    senderUid: me.uid,
    type: "system",
    text: systemText,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(chatRef, {
    lastMessage: systemText,
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageBy: me.uid,
  });

  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error("[completeConsultation] failed", err);
    return { success: false, error: "完了処理に失敗しました" };
  }
}
