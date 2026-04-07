"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import type { MessageDoc } from "@/types/chat";

export type RealtimeMessage = MessageDoc & { id: string; createdAtMs: number };

/**
 * Firestore の onSnapshot を使ってチャットメッセージをリアルタイム購読する。
 *
 * - Firebase Auth client SDK の認証状態が確定するまで購読を遅延させる
 *   （onSnapshot がセキュリティルールで拒否されないように）
 *
 * @param chatId - チャットルーム ID。空文字なら購読しない。
 * @returns ロード状態とメッセージ配列（createdAt 昇順）
 */
export function useChatMessages(chatId: string) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let snapshotUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(
      auth,
      (user) => {
        // 既存の購読を解除（auth state 変化時）
        if (snapshotUnsub) {
          snapshotUnsub();
          snapshotUnsub = null;
        }
        if (!user) {
          // 未認証 → 何も購読しない
          setMessages([]);
          setLoading(false);
          return;
        }
        const q = query(
          collection(db, "chats", chatId, "messages"),
          orderBy("createdAt", "asc"),
        );
        snapshotUnsub = onSnapshot(
          q,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const next: RealtimeMessage[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              const ts = data.createdAt;
              const createdAtMs =
                ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function"
                  ? (ts.toDate() as Date).getTime()
                  : ts instanceof Date
                    ? ts.getTime()
                    : 0;
              return {
                id: doc.id,
                senderUid: data.senderUid,
                type: data.type ?? "text",
                text: data.text,
                hearingSheetData: data.hearingSheetData,
                invoiceId: data.invoiceId,
                createdAt: ts ?? new Date(0),
                createdAtMs,
              } as RealtimeMessage;
            });
            setMessages(next);
            setLoading(false);
          },
          (err) => {
            console.error("[useChatMessages] onSnapshot error", err);
            setError(err);
            setLoading(false);
          },
        );
      },
      (err) => {
        console.error("[useChatMessages] onAuthStateChanged error", err);
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      authUnsub();
      if (snapshotUnsub) snapshotUnsub();
    };
  }, [chatId]);

  return { messages, loading, error };
}
