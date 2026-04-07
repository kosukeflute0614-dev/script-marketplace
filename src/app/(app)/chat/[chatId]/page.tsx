import { notFound } from "next/navigation";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireUserOrRedirect } from "@/lib/auth-server";
import { ChatRoom } from "@/components/chat/chat-room";
import type { ChatDoc } from "@/types/chat";

export const metadata = {
  title: "チャット | 脚本マーケット",
};

type Props = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatRoomPage({ params }: Props) {
  const { chatId } = await params;
  const me = await requireUserOrRedirect();

  // チャットを取得し、自分が参加者であることを確認
  const db = getAdminDb();
  const snap = await db.collection("chats").doc(chatId).get();
  if (!snap.exists) {
    notFound();
  }
  const chat = snap.data() as ChatDoc;
  if (!chat.participants.includes(me.uid)) {
    notFound();
  }

  const partnerUid = chat.participants.find((p) => p !== me.uid) ?? "";
  const partnerName = chat.participantNames[partnerUid] ?? "ユーザー";

  return <ChatRoom chatId={chatId} myUid={me.uid} partnerName={partnerName} />;
}
