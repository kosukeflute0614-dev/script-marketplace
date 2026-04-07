import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { ChatListItem } from "@/app/actions/chat";

type Props = {
  chats: ChatListItem[];
};

export function ChatList({ chats }: Props) {
  if (chats.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        まだチャットはありません。台本詳細やユーザープロフィールから「メッセージを送る」を押してください。
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {chats.map((chat) => (
        <Link key={chat.id} href={`/chat/${chat.id}`} className="block">
          <Card className="hover:bg-muted/40 transition-colors">
            <CardContent className="flex items-start gap-4 py-4">
              <Avatar name={chat.partnerName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-foreground truncate text-sm font-medium">
                    {chat.partnerName}
                  </p>
                  <p className="text-muted-foreground shrink-0 text-xs">
                    {formatRelative(chat.lastMessageAt)}
                  </p>
                </div>
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {chat.lastMessage || "（メッセージはまだありません）"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name?.[0] ?? "?";
  return (
    <div className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
      {initial}
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "たった今";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}日前`;
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}
