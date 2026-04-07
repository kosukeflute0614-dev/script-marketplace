"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { sendMessage } from "@/app/actions/chat";

import { MessageBubble } from "./message-bubble";

type Props = {
  chatId: string;
  myUid: string;
  partnerName: string;
};

export function ChatRoom({ chatId, myUid, partnerName }: Props) {
  const { messages, loading, error } = useChatMessages(chatId);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // メッセージ更新時に自動スクロール
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await sendMessage(chatId, value);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setText("");
    });
  }

  return (
    <div className="bg-background flex h-[calc(100svh-3.5rem)] flex-col">
      {/* ヘッダー */}
      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="戻る">
          <Link href="/chat">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <h1 className="text-base font-medium">{partnerName}</h1>
      </div>

      {/* メッセージ一覧 */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-muted-foreground py-12 text-center text-xs">読み込み中…</p>
        ) : error ? (
          <p className="text-destructive py-12 text-center text-xs">
            メッセージの読み込みに失敗しました
          </p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-xs">
            メッセージはまだありません。最初のメッセージを送ってみましょう。
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isMine={m.senderUid === myUid} />
          ))
        )}
      </div>

      {/* 入力フォーム */}
      <form
        onSubmit={handleSubmit}
        className="border-border bg-card flex items-center gap-2 border-t px-4 py-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力…"
          disabled={isPending}
          maxLength={4000}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isPending || !text.trim()} aria-label="送信">
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}
