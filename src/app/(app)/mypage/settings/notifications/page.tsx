import { requireUserOrRedirect } from "@/lib/auth-server";
import { getNotificationSettings } from "@/app/actions/notification";
import { NotificationSettingsForm } from "@/components/user/notification-settings-form";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/types/user";

export const metadata = {
  title: "通知設定 | 脚本マーケット",
};

export default async function NotificationSettingsPage() {
  await requireUserOrRedirect();
  const result = await getNotificationSettings();
  const initial = result.success
    ? (result.data ?? { ...DEFAULT_NOTIFICATION_SETTINGS })
    : { ...DEFAULT_NOTIFICATION_SETTINGS };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="font-heading mb-2 text-2xl font-bold">通知設定</h1>
      <p className="text-muted-foreground mb-6 text-xs">
        各種通知メールのオン/オフを切り替えられます。
      </p>
      <NotificationSettingsForm initial={initial} />
    </div>
  );
}
