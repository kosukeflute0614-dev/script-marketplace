import { getAllScriptsForAdmin } from "@/app/actions/admin";
import { ScriptsAdminList } from "@/components/admin/scripts-admin-list";

export const metadata = {
  title: "台本管理 | 管理画面",
};

export default async function AdminScriptsPage() {
  const result = await getAllScriptsForAdmin();
  const items = result.success ? (result.data ?? []) : [];
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">台本管理</h1>
      <ScriptsAdminList items={items} />
    </div>
  );
}
