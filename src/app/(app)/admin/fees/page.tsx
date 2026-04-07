import { getAdminDb } from "@/lib/firebase-admin";
import { FeesForm } from "@/components/admin/fees-form";

export const metadata = {
  title: "手数料設定 | 管理画面",
};

export default async function AdminFeesPage() {
  const snap = await getAdminDb().collection("config").doc("platform").get();
  const data = snap.data() as { feeRate?: number; payoutFee?: number } | undefined;
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">手数料設定</h1>
      <FeesForm
        initialFeeRate={data?.feeRate ?? 0.165}
        initialPayoutFee={data?.payoutFee ?? 250}
      />
    </div>
  );
}
