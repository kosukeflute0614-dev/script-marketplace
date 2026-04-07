import { getMyChats } from "@/app/actions/chat";
import { ChatList } from "@/components/chat/chat-list";

export const metadata = {
  title: "メッセージ | 脚本マーケット",
};

export default async function ChatListPage() {
  const result = await getMyChats();
  if (!result.success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="font-heading mb-6 text-2xl font-bold">メッセージ</h1>
        <p className="text-destructive text-sm">{result.error}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">メッセージ</h1>
      <ChatList chats={result.data ?? []} />
    </div>
  );
}
