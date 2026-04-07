import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditForm } from "@/components/user/profile-edit-form";
import { requireUser } from "@/lib/auth-server";

export const metadata = {
  title: "プロフィール編集 | 脚本マーケット",
};

export default async function ProfileEditPage() {
  // (app)/layout.tsx で getCurrentUser を実行済みかつ未ログインなら /login にリダイレクト済み。
  // ここでは requireUser（throw 版）を使い、念のためのフェイルセーフ + user 取得を行う。
  const user = await requireUser();
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
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
