import { getReports } from "@/app/actions/report";
import { ReportsAdminList } from "@/components/admin/reports-admin-list";

export const metadata = {
  title: "通報管理 | 管理画面",
};

export default async function AdminReportsPage() {
  const result = await getReports();
  const reports = result.success ? (result.data ?? []) : [];
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">通報管理</h1>
      <ReportsAdminList reports={reports} />
    </div>
  );
}
