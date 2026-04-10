import Link from "next/link";

import { requireUserOrRedirect } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { getMyScripts } from "@/app/actions/scripts-edit";
import { MyScriptsList } from "@/components/author/my-scripts-list";

export const metadata = {
  title: "出品管理 | 脚本マーケット",
};

export default async function MyScriptsPage() {
  await requireUserOrRedirect();
  const result = await getMyScripts();
  const items = result.success ? (result.data ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">出品管理</h1>
        <Button asChild>
          <Link href="/author/scripts/new">新規出品</Link>
        </Button>
      </div>
      <MyScriptsList items={items} />
    </div>
  );
}
