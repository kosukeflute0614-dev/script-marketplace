import { cn } from "@/lib/utils";
import type { RealtimeMessage } from "@/hooks/use-chat-messages";

type Props = {
  message: RealtimeMessage;
  /** 自分が送信したメッセージなら右寄せにする */
  isMine: boolean;
};

export function MessageBubble({ message, isMine }: Props) {
  if (message.type === "system") {
    return (
      <div className="text-muted-foreground my-2 text-center text-xs">── {message.text} ──</div>
    );
  }
  if (message.type === "text") {
    return (
      <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
            isMine
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border-border border",
          )}
        >
          {message.text ?? ""}
          <div
            className={cn(
              "mt-1 text-[10px]",
              isMine ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {formatTime(message.createdAtMs)}
          </div>
        </div>
      </div>
    );
  }
  // hearingSheetResponse / invoice などの特殊メッセージ（後続 Step で本実装）
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div className="border-border bg-muted text-muted-foreground max-w-[75%] rounded-lg border px-3 py-2 text-xs">
        {message.type === "hearingSheetResponse"
          ? "ヒアリングシートの回答（後続 Step で表示対応）"
          : "請求カード（後続 Step で表示対応）"}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}
