import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailPending } from "@/components/auth/verify-email-pending";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata = {
  title: "メール確認 | 脚本マーケット",
};

export default async function VerifyEmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AuthCard title="メールアドレスの確認" description="登録されたメールアドレスを確認してください">
      <VerifyEmailPending email={user.email} />
    </AuthCard>
  );
}
