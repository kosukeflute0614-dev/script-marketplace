import { getAllUsersForAdmin } from "@/app/actions/admin";
import { UsersAdminList } from "@/components/admin/users-admin-list";

export const metadata = {
  title: "ユーザー管理 | 管理画面",
};

export default async function AdminUsersPage() {
  const result = await getAllUsersForAdmin();
  const items = result.success ? (result.data ?? []) : [];
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">ユーザー管理</h1>
      <UsersAdminList items={items} />
    </div>
  );
}
