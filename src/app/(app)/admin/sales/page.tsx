import { Card, CardContent } from "@/components/ui/card";
import { getSalesReport } from "@/app/actions/admin";

export const metadata = {
  title: "売上レポート | 管理画面",
};

export default async function AdminSalesPage() {
  const periods = [7, 30, 90];
  const reports = await Promise.all(periods.map((p) => getSalesReport(p)));

  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">売上レポート</h1>
      <div className="space-y-4">
        {reports.map((r, i) => {
          if (!r.success || !r.data) return null;
          return (
            <Card key={periods[i]}>
              <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <Stat label={r.data.period} value="" />
                <Stat label="GMV" value={`¥${r.data.totalGmv.toLocaleString()}`} />
                <Stat label="手数料" value={`¥${r.data.totalFee.toLocaleString()}`} />
                <Stat label="件数" value={`${r.data.purchaseCount + r.data.invoiceCount}件`} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-heading mt-1 text-base font-bold">{value}</p>
    </div>
  );
}
