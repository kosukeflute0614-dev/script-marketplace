"use client";

import Link from "next/link";
import Image from "next/image";
import { useHits } from "react-instantsearch";

import { Card, CardContent } from "@/components/ui/card";
import { canonicalScriptPath } from "@/lib/script-url";

type AlgoliaHit = {
  objectID: string;
  title: string;
  slug: string;
  synopsis: string;
  authorDisplayName: string;
  authorUserId: string;
  genres: string[];
  duration: number;
  castMin: number;
  castMax: number;
  castMale: number;
  castFemale: number;
  castUnspecified: number;
  price: number;
  isFreeFullText: boolean;
  thumbnailUrl: string;
  feeScheduleMin: number | null;
  reviewAverage: number;
  reviewCount: number;
  favoriteCount: number;
};

export function SearchHits() {
  const { items } = useHits<AlgoliaHit>();
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground text-sm">該当する台本が見つかりませんでした。</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((hit) => (
        <Hit key={hit.objectID} hit={hit} />
      ))}
    </div>
  );
}

function Hit({ hit }: { hit: AlgoliaHit }) {
  const href = canonicalScriptPath(hit.slug, hit.objectID);
  const cast = hit.castMin === hit.castMax ? `${hit.castMin}人` : `${hit.castMin}〜${hit.castMax}人`;
  const breakdown = `男${hit.castMale}/女${hit.castFemale}/不問${hit.castUnspecified}`;
  const priceLabel =
    hit.price === 0 ? (hit.isFreeFullText ? "無料（全文公開）" : "無料") : `¥${hit.price.toLocaleString()}`;
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-muted/40 h-full overflow-hidden p-0 transition-colors">
        <div className="bg-card relative aspect-[16/9] w-full overflow-hidden">
          {hit.thumbnailUrl ? (
            <Image
              src={hit.thumbnailUrl}
              alt={hit.title}
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
          <h3 className="text-foreground line-clamp-2 text-sm font-bold">{hit.title}</h3>
          <p className="text-muted-foreground text-xs">{hit.authorDisplayName}</p>
          <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 text-xs">
            <span>{hit.genres?.[0] ?? ""}</span>
            <span>·</span>
            <span>
              {cast}（{breakdown}）
            </span>
            <span>·</span>
            <span>{hit.duration}分</span>
          </div>
          <div className="text-foreground mt-1 text-sm font-medium">{priceLabel}</div>
          {hit.feeScheduleMin ? (
            <p className="text-muted-foreground text-xs">上演料 ¥{hit.feeScheduleMin.toLocaleString()}〜</p>
          ) : null}
          {hit.synopsis ? (
            <p className="text-muted-foreground line-clamp-2 text-xs">{hit.synopsis}</p>
          ) : null}
          {hit.reviewCount > 0 ? (
            <div className="text-muted-foreground text-xs">
              ★ {hit.reviewAverage.toFixed(1)} ({hit.reviewCount})
              {hit.favoriteCount > 0 ? ` · ♡ ${hit.favoriteCount}` : ""}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
