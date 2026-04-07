import { AuthCard } from "@/components/auth/auth-card";
import { UserIdSetupForm } from "@/components/auth/user-id-setup-form";

export const metadata = {
  title: "ユーザーID設定 | 脚本マーケット",
};

export default function SetupUserIdPage() {
  return (
    <AuthCard
      title="ユーザーIDを設定"
      description="サービス内であなたを識別する固有のIDを決めてください"
    >
      <UserIdSetupForm />
    </AuthCard>
  );
}
