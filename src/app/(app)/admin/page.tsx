import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSalesReport } from "@/app/actions/admin";

export const metadata = {
  title: "管理ダッシュボード | 脚本マーケット",
};

export default async function AdminDashboardPage() {
  const result = await getSalesReport(30);
  const report = result.success ? result.data : null;

  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">管理ダッシュボード</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV (30日)" value={report ? `¥${report.totalGmv.toLocaleString()}` : "-"} />
        <StatCard label="手数料 (30日)" value={report ? `¥${report.totalFee.toLocaleString()}` : "-"} />
        <StatCard label="購入件数" value={report ? `${report.purchaseCount}件` : "-"} />
        <StatCard label="請求支払い件数" value={report ? `${report.invoiceCount}件` : "-"} />
      </div>
      <p className="text-muted-foreground mt-6 text-xs">
        左メニューから各管理機能にアクセスできます。
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
