import { requireUserOrRedirect } from "@/lib/auth-server";
import { getMyPurchases } from "@/app/actions/purchase";
import { PurchasedList } from "@/components/checkout/purchased-list";

export const metadata = {
  title: "購入済み台本 | 脚本マーケット",
};

export default async function PurchasedPage() {
  await requireUserOrRedirect();
  const result = await getMyPurchases();
  const items = result.success ? (result.data ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">購入済み台本</h1>
      <PurchasedList items={items} />
    </div>
  );
}
