import { requireUserOrRedirect } from "@/lib/auth-server";
import { getMyHistory } from "@/app/actions/history";
import { ScriptCard } from "@/components/script/script-card";

export const metadata = {
  title: "閲覧履歴 | 脚本マーケット",
};

export default async function HistoryPage() {
  await requireUserOrRedirect();
  const result = await getMyHistory();
  const scripts = result.success ? (result.data ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">閲覧履歴</h1>
      <p className="text-muted-foreground mb-4 text-xs">最大100件まで自動で記録されます。</p>
      {scripts.length === 0 ? (
        <p className="text-muted-foreground text-sm">まだ閲覧履歴はありません。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scripts.map((s) => (
            <ScriptCard key={s.id} script={s} />
          ))}
        </div>
      )}
    </div>
  );
}
