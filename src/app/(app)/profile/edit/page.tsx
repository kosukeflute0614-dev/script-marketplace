import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditForm } from "@/components/user/profile-edit-form";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata = {
  title: "プロフィール編集 | 脚本マーケット",
};

export default async function ProfileEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="bg-background mx-auto max-w-xl px-4 py-12">
      <h1 className="font-heading mb-6 text-2xl font-bold">プロフィール編集</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール情報</CardTitle>
          <CardDescription>
            ユーザーID: <span className="text-foreground font-mono">{user.userId}</span>（変更不可）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
