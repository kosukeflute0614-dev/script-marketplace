import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "通報管理 | 管理画面",
};

export default function AdminReportsPage() {
  // 通報機能 (Step 23) の実装は P1-16 で対応するため、ここではプレースホルダー。
  // 実装後は reports コレクションを一覧 + 対応操作を提供する。
  return (
    <div>
      <h1 className="font-heading mb-6 text-2xl font-bold">通報管理</h1>
      <Card>
        <CardContent className="text-muted-foreground p-5 text-sm">
          通報機能は P1-16 で実装します。実装後にこのページが一覧 + 対応操作を提供します。
        </CardContent>
      </Card>
    </div>
  );
}
