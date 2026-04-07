import Link from "next/link";

import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser, needsEmailVerification } from "@/lib/auth-server";

export const metadata = {
  title: "ログイン | 脚本マーケット",
};

export default async function LoginPage() {
  // すでにログイン済みなら追い払う。リダイレクト先は (app)/layout.tsx と
  // 同じ規則に揃える（メール未確認ユーザーが /setup/user-id に飛ばされて
  // 二重リダイレクトになる問題を避ける）。
  const user = await getCurrentUser();
  if (user) {
    if (needsEmailVerification(user)) redirect("/verify-email");
    if (!user.userId) redirect("/setup/user-id");
    redirect("/mypage");
  }
  return (
    <AuthCard
      title="ログイン"
      description="アカウントにログインしてください"
      footer={
        <p>
          アカウントをお持ちでない方は{" "}
          <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
            新規登録
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
