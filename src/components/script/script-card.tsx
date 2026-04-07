import Link from "next/link";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import type { SerializedScript } from "@/app/actions/scripts";
import { canonicalScriptPath } from "@/lib/script-url";

type Props = {
  script: SerializedScript;
};

/**
 * 検索結果やトップページで使う台本カード。
 */
export function ScriptCard({ script }: Props) {
  const href = canonicalScriptPath(script.slug, script.id);
  const cast = `${script.castTotal.min}〜${script.castTotal.max}人`;
  const duration = `${script.duration}分`;
  const priceLabel =
    script.price === 0
      ? script.isFreeFullText
        ? "無料（全文公開）"
        : "無料"
      : `¥${script.price.toLocaleString()}`;
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-muted/40 h-full overflow-hidden p-0 transition-colors">
        <div className="bg-card relative aspect-[16/9] w-full">
          {script.thumbnailUrl ? (
            <Image
              src={script.thumbnailUrl}
              alt={script.title}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-2xl">
              🎭
            </div>
          )}
        </div>
        <CardContent className="flex flex-col gap-2 p-4">
          <h3 className="text-foreground line-clamp-2 text-sm font-bold">{script.title}</h3>
          <p className="text-muted-foreground text-xs">{script.authorDisplayName}</p>
          <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 text-xs">
            <span>{script.genres[0] ?? ""}</span>
            <span>·</span>
            <span>{cast}</span>
            <span>·</span>
            <span>{duration}</span>
          </div>
          <div className="text-foreground mt-1 text-sm font-medium">{priceLabel}</div>
          {script.stats.reviewCount > 0 ? (
            <div className="text-muted-foreground text-xs">
              ★ {script.stats.reviewAverage.toFixed(1)} ({script.stats.reviewCount})
              {script.stats.favoriteCount > 0 ? `  ♡ ${script.stats.favoriteCount}` : ""}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
