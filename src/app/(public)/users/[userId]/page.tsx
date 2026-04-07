import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { getPublicUserByUserId } from "@/app/actions/users";
import { getScriptsByAuthor } from "@/app/actions/scripts";
import { ScriptCard } from "@/components/script/script-card";

type Props = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const result = await getPublicUserByUserId(userId);
  if (!result.success || !result.data) {
    return { title: "ユーザーが見つかりません | 脚本マーケット" };
  }
  const u = result.data;
  const description = u.bio || `${u.displayName} のプロフィール`;
  return {
    title: `${u.displayName} (@${u.userId}) | 脚本マーケット`,
    description,
    openGraph: {
      title: `${u.displayName} (@${u.userId})`,
      description,
      type: "profile",
      ...(u.iconUrl ? { images: [{ url: u.iconUrl }] } : {}),
    },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  const result = await getPublicUserByUserId(userId);
  if (!result.success || !result.data) {
    notFound();
  }
  const user = result.data;
  const scriptsResult = await getScriptsByAuthor(user.uid, undefined, 12);
  const scripts = scriptsResult.success ? (scriptsResult.data ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      {/* プロフィールヘッダー */}
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
          <div
            className="bg-accent relative size-24 shrink-0 overflow-hidden rounded-full"
            aria-label={user.displayName}
          >
            {user.iconUrl ? (
              <Image
                src={user.iconUrl}
                alt={user.displayName}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div aria-hidden="true" className="flex h-full w-full items-center justify-center text-3xl">
                {user.displayName[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-heading text-2xl font-bold">{user.displayName}</h1>
            <p className="text-muted-foreground font-mono text-xs">@{user.userId}</p>
            {user.bio ? (
              <p className="text-foreground mt-3 text-sm whitespace-pre-wrap">{user.bio}</p>
            ) : null}
            <div className="text-muted-foreground mt-3 flex flex-wrap justify-center gap-3 text-xs sm:justify-start">
              {user.twitter ? (
                <Link
                  href={`https://x.com/${user.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  X (Twitter): @{user.twitter}
                </Link>
              ) : null}
              {user.website ? (
                <Link
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Website
                </Link>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 出品台本一覧 */}
      <section className="mt-10">
        <h2 className="font-heading mb-4 text-lg font-bold">出品中の台本</h2>
        {scripts.length === 0 ? (
          <p className="text-muted-foreground text-sm">まだ出品されている台本はありません。</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {scripts.map((s) => (
              <ScriptCard key={s.id} script={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
