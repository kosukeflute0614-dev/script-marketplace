import { getAdminDb } from "@/lib/firebase-admin";
import { ScriptTagsAdminEditor } from "@/components/admin/script-tags-admin-editor";
import type { ScriptTagDefinitionInput } from "@/app/actions/admin";

export const metadata = {
  title: "特性タグ管理 | 管理画面",
};

export default async function AdminScriptTagsPage() {
  const snap = await getAdminDb().collection("config").doc("platform").get();
  const data = snap.data() as { scriptTagDefinitions?: ScriptTagDefinitionInput[] } | undefined;
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">特性タグ管理</h1>
      <p className="text-muted-foreground mb-4 text-xs">
        出品時に選択できる特性タグを管理します。同じ id を持つタグを変更すると、既存の台本に反映されます。
      </p>
      <ScriptTagsAdminEditor initial={data?.scriptTagDefinitions ?? []} />
    </div>
  );
}
