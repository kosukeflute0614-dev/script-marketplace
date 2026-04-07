import { getAdminDb } from "@/lib/firebase-admin";
import { TopPageEditor } from "@/components/admin/top-page-editor";
import type { TopPageSectionInput } from "@/app/actions/admin";

export const metadata = {
  title: "トップページ設定 | 管理画面",
};

export default async function AdminTopPagePage() {
  const snap = await getAdminDb().collection("config").doc("platform").get();
  const data = snap.data() as { topPageSections?: TopPageSectionInput[] } | undefined;
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">トップページ設定</h1>
      <p className="text-muted-foreground mb-4 text-xs">
        トップページに表示するセクションを管理します。type は newest / popular が利用可能です。
      </p>
      <TopPageEditor initial={data?.topPageSections ?? []} />
    </div>
  );
}
