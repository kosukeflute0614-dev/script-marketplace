"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateNotificationSettings } from "@/app/actions/notification";
import type { NotificationSettings } from "@/types/user";

const LABELS: Record<keyof NotificationSettings, { title: string; description: string }> = {
  onPurchased: { title: "台本購入の通知", description: "出品した台本が購入されたとき" },
  onInvoicePaid: { title: "請求支払いの通知", description: "送付した請求が支払われたとき" },
  onNewMessage: { title: "チャット新着の通知", description: "チャットに新着メッセージが届いたとき" },
  onScriptUpdated: { title: "台本更新の通知", description: "購入済みの台本がアップデートされたとき" },
  onNewReview: { title: "レビュー投稿の通知", description: "出品した台本に新しいレビューが投稿されたとき" },
};

const KEYS: (keyof NotificationSettings)[] = [
  "onPurchased",
  "onInvoicePaid",
  "onNewMessage",
  "onScriptUpdated",
  "onNewReview",
];

type Props = {
  initial: NotificationSettings;
};

export function NotificationSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof NotificationSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateNotificationSettings(settings);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("通知設定を保存しました");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {KEYS.map((key) => (
          <Card key={key}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">{LABELS[key].title}</p>
                <p className="text-muted-foreground mt-1 text-xs">{LABELS[key].description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings[key]}
                aria-label={LABELS[key].title}
                onClick={() => toggle(key)}
                disabled={isPending}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  settings[key] ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                    settings[key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : "設定を保存"}
      </Button>
    </form>
  );
}
