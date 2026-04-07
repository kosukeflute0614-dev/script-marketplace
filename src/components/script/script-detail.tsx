import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SerializedScript } from "@/app/actions/scripts";
import { ScriptCard } from "@/components/script/script-card";
import { FavoriteButton } from "@/components/script/favorite-button";
import { ReportButton } from "@/components/script/report-button";
import { ReviewList } from "@/components/review/review-list";
import { ReviewForm } from "@/components/review/review-form";
import { SCRIPT_TAG_DEFINITIONS } from "@/lib/script-tags";
import type { SerializedReview } from "@/types/review";

type Props = {
  script: SerializedScript;
  authorScripts: SerializedScript[];
  relatedScripts: SerializedScript[];
  reviews: SerializedReview[];
  /** 自分のレビュー (購入済みかつログイン時のみ) */
  myReview: SerializedReview | null;
  /** ログインユーザーが購入済みなら true */
  canReview: boolean;
  /** ログインユーザーがこの台本をお気に入り済みか */
  isFavorited: boolean;
  /** ログイン中なら true（FavoriteButton 表示制御） */
  isLoggedIn: boolean;
};

const TAG_LABEL_MAP = new Map(SCRIPT_TAG_DEFINITIONS.map((t) => [t.id, t.label]));

export function ScriptDetail({
  script,
  authorScripts,
  relatedScripts,
  reviews,
  myReview,
  canReview,
  isFavorited,
  isLoggedIn,
}: Props) {
  const cast = `${script.castTotal.min === script.castTotal.max ? script.castTotal.min : `${script.castTotal.min}〜${script.castTotal.max}`}人`;
  const breakdown = `男${script.castBreakdown.male}/女${script.castBreakdown.female}/不問${script.castBreakdown.unspecified}`;
  const priceLabel =
    script.price === 0
      ? script.isFreeFullText
        ? "無料（全文公開）"
        : "無料"
      : `¥${script.price.toLocaleString()}`;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* サムネ */}
      <div className="bg-card relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-lg">
        {script.thumbnailUrl ? (
          <Image
            src={script.thumbnailUrl}
            alt={script.title}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-5xl">
            🎭
          </div>
        )}
      </div>

      {/* タイトルと作家 */}
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{script.title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        <Link href={`/users/${script.authorUserId}`} className="hover:text-foreground underline-offset-4 hover:underline">
          {script.authorDisplayName}
        </Link>
      </p>

      {/* メタ情報グリッド */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <MetaItem label="ジャンル" value={script.genres.join(" / ")} />
        <MetaItem label="上演形態" value={script.performanceType.join(" / ")} />
        <MetaItem label="キャスト" value={`${cast}（${breakdown}）`} />
        <MetaItem label="上演時間" value={`${script.duration}分`} />
      </div>

      {/* 特性タグ + バッジ */}
      {(script.scriptTags?.length ?? 0) + (script.badges?.length ?? 0) > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {(script.badges ?? []).map((b) => (
            <span key={b} className="bg-foreground text-background rounded-full px-2.5 py-1 text-xs">
              {b}
            </span>
          ))}
          {(script.scriptTags ?? []).map((tagId) => (
            <span
              key={tagId}
              className="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-xs"
            >
              {TAG_LABEL_MAP.get(tagId) ?? tagId}
            </span>
          ))}
        </div>
      ) : null}

      {/* 価格と CTA */}
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground text-xs">価格</p>
            <p className="font-heading text-2xl font-bold">{priceLabel}</p>
            {script.stats.reviewCount > 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                ★ {script.stats.reviewAverage.toFixed(1)} ({script.stats.reviewCount}件)
                {script.stats.favoriteCount > 0 ? ` · ♡ ${script.stats.favoriteCount}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isLoggedIn ? (
              <FavoriteButton
                scriptId={script.id}
                initialFavorited={isFavorited}
                initialCount={script.stats.favoriteCount}
              />
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/preview/${script.id}`}>プレビューを見る</Link>
            </Button>
            <Button disabled title="購入機能は Pass2 で実装">購入する（準備中）</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-3">
        <p className="text-muted-foreground text-xs">
          上演許可の相談: {script.stats.consultationCount}件
        </p>
        <div className="-ml-2 mt-1 flex flex-wrap items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/hearing-sheet/${script.id}`}>上演許可の相談をする →</Link>
          </Button>
          {isLoggedIn ? (
            <ReportButton targetType="script" targetId={script.id} size="sm" />
          ) : null}
        </div>
      </div>

      <Separator className="my-8" />

      {/* あらすじ */}
      <Section title="あらすじ">
        <p className="leading-relaxed whitespace-pre-wrap">{script.synopsis}</p>
      </Section>

      {/* 上演料の目安 */}
      {script.feeSchedule && script.feeSchedule.length > 0 ? (
        <Section title="上演料の目安">
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-card text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">条件</th>
                  <th className="px-4 py-2 text-right font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {script.feeSchedule.map((f, i) => (
                  <tr key={i} className="border-border border-t">
                    <td className="px-4 py-2">
                      {f.condition}
                      {f.note ? <span className="text-muted-foreground ml-2 text-xs">({f.note})</span> : null}
                    </td>
                    <td className="px-4 py-2 text-right">¥{f.amount.toLocaleString()}〜</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* 上演履歴 */}
      {script.performanceHistory && script.performanceHistory.length > 0 ? (
        <Section title="上演履歴">
          <ul className="space-y-2 text-sm">
            {script.performanceHistory.map((p, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="text-foreground font-medium">{p.year}年</span>: {p.groupName}
                {p.venue ? `（${p.venue}）` : ""}
                {p.note ? ` - ${p.note}` : ""}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* 作家コメント */}
      {script.authorComment ? (
        <Section title="作家コメント">
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {script.authorComment}
          </p>
        </Section>
      ) : null}

      {/* ランキング */}
      {script.rankings && Object.keys(script.rankings).length > 0 ? (
        <Section title="ランキング">
          <ul className="text-foreground space-y-1 text-sm">
            {Object.entries(script.rankings).map(([category, info]) => {
              const label = category.startsWith("genre:")
                ? category.replace("genre:", "")
                : category.startsWith("audience:")
                  ? category.replace("audience:", "")
                  : category;
              return (
                <li key={category}>
                  {label} 部門: <span className="font-medium">{info.rank}位</span>
                  <span className="text-muted-foreground"> / {info.total}作品中</span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {/* レビュー */}
      <Section
        title={
          script.stats.reviewCount > 0
            ? `レビュー ★${script.stats.reviewAverage.toFixed(1)}（${script.stats.reviewCount}件）`
            : "レビュー"
        }
      >
        {canReview ? (
          <div className="mb-4">
            <ReviewForm scriptId={script.id} initial={myReview} />
          </div>
        ) : (
          <p className="text-muted-foreground mb-4 text-xs">
            購入済みの方はレビューを投稿できます。
          </p>
        )}
        <ReviewList reviews={reviews} />
      </Section>

      {/* 同じ作家の他作品 */}
      {authorScripts.length > 0 ? (
        <Section title={`${script.authorDisplayName} の他の作品`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {authorScripts.map((s) => (
              <ScriptCard key={s.id} script={s} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* 関連台本 */}
      {relatedScripts.length > 0 ? (
        <Section title="似た条件の台本">
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedScripts.map((s) => (
              <ScriptCard key={s.id} script={s} />
            ))}
          </div>
        </Section>
      ) : null}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
