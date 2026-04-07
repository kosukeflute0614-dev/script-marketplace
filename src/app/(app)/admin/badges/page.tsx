import { getAdminDb } from "@/lib/firebase-admin";
import { Card, CardContent } from "@/components/ui/card";
import { BadgesAdminEditor } from "@/components/admin/badges-admin-editor";
import type { BadgeDefinition } from "@/app/actions/admin";

export const metadata = {
  title: "バッジ管理 | 管理画面",
};

export default async function AdminBadgesPage() {
  const snap = await getAdminDb().collection("config").doc("platform").get();
  const data = snap.data() as { badgeDefinitions?: BadgeDefinition[] } | undefined;
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">バッジ管理</h1>
      <Card className="mb-4">
        <CardContent className="text-muted-foreground p-4 text-xs">
          管理者が手動で台本に付与する公式バッジを追加・編集できます。
        </CardContent>
      </Card>
      <BadgesAdminEditor initial={data?.badgeDefinitions ?? []} />
    </div>
  );
}
