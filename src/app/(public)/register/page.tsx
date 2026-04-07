import Link from "next/link";

import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser, needsEmailVerification } from "@/lib/auth-server";

export const metadata = {
  title: "新規登録 | 脚本マーケット",
};

export default async function RegisterPage() {
  // ログイン済みは追い払う。メール未確認ユーザーは /verify-email へ。
  const user = await getCurrentUser();
  if (user) {
    if (needsEmailVerification(user)) redirect("/verify-email");
    if (!user.userId) redirect("/setup/user-id");
    redirect("/mypage");
  }
  return (
    <AuthCard
      title="新規登録"
      description="脚本マーケットへようこそ"
      footer={
        <p>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            ログイン
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
