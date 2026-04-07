import { requireUserOrRedirect } from "@/lib/auth-server";
import { getMyFavorites } from "@/app/actions/favorite";
import { ScriptCard } from "@/components/script/script-card";

export const metadata = {
  title: "お気に入り | 脚本マーケット",
};

export default async function FavoritesPage() {
  await requireUserOrRedirect();
  const result = await getMyFavorites();
  const scripts = result.success ? (result.data ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-heading mb-6 text-2xl font-bold">お気に入り</h1>
      {scripts.length === 0 ? (
        <p className="text-muted-foreground text-sm">まだお気に入りはありません。</p>
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
