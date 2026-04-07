import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getRelatedScripts, getScript, getScriptsByAuthor } from "@/app/actions/scripts";
import { getMyReview, getReviews } from "@/app/actions/review";
import { isFavorite } from "@/app/actions/favorite";
import { recordHistory } from "@/app/actions/history";
import { ScriptDetail } from "@/components/script/script-detail";
import { canonicalScriptPath, parseScriptHandle } from "@/lib/script-url";
import { getCurrentUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";

type Props = {
  // 動的セグメント名は /scripts/[scriptId] のまま（URL は実際は handle）
  params: Promise<{ scriptId: string }>;
};

/**
 * 台本詳細ページ。
 *
 * URL 仕様 (spec.md §6):
 * - SEO 用: `/scripts/{slug}-{id}`
 * - 短縮: `/scripts/{id}` → 正規 URL にリダイレクト
 *
 * id は英数字のみ（ハイフンなし）を前提に、handle の最後の `-` で slug と id を分割する。
 */
async function loadScript(handle: string) {
  const parsed = parseScriptHandle(handle);

  // 1. handle 全文を id とみなして直接取得
  const direct = await getScript(parsed.raw);
  if (direct.success && direct.data) {
    return { script: direct.data, parsed };
  }

  // 2. SEO 形式の場合: 末尾分割した id でリトライ
  if (!parsed.isShortForm && parsed.id) {
    const r = await getScript(parsed.id);
    if (r.success && r.data) {
      return { script: r.data, parsed };
    }
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scriptId } = await params;
  const loaded = await loadScript(scriptId);
  if (!loaded) {
    return { title: "台本が見つかりません | 脚本マーケット" };
  }
  const { script } = loaded;
  // 非公開 (unlisted) の台本のメタデータが OGP/タイトル経由で外部に漏れるのを防ぐ
  if (script.status !== "published") {
    return {
      title: "台本が見つかりません | 脚本マーケット",
      robots: { index: false, follow: false },
    };
  }
  const description = script.synopsis.slice(0, 120);
  return {
    title: `${script.title} | ${script.authorDisplayName} | 脚本マーケット`,
    description,
    openGraph: {
      title: `${script.title} | 脚本マーケット`,
      description,
      type: "article",
      ...(script.thumbnailUrl ? { images: [{ url: script.thumbnailUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: script.title,
      description,
      ...(script.thumbnailUrl ? { images: [script.thumbnailUrl] } : {}),
    },
  };
}

export default async function ScriptPage({ params }: Props) {
  const { scriptId } = await params;
  const loaded = await loadScript(scriptId);
  if (!loaded) {
    notFound();
  }
  const { script, parsed } = loaded;

  // 公開されていない台本は 404 として扱う（spec §4 アクセス権限）
  if (script.status !== "published") {
    notFound();
  }

  // 短縮 URL → SEO URL にリダイレクト
  const canonical = canonicalScriptPath(script.slug, script.id);
  const currentPath = `/scripts/${parsed.raw}`;
  if (currentPath !== canonical) {
    redirect(canonical);
  }

  // 関連台本・同作家の他作品・レビュー一覧を並列取得
  const [authorRes, relatedRes, reviewsRes, me] = await Promise.all([
    getScriptsByAuthor(script.authorUid, script.id, 4),
    getRelatedScripts(script.id, 4),
    getReviews(script.id, 20),
    getCurrentUser(),
  ]);
  const authorScripts = authorRes.success ? (authorRes.data ?? []) : [];
  const relatedScripts = relatedRes.success ? (relatedRes.data ?? []) : [];
  const reviews = reviewsRes.success ? (reviewsRes.data ?? []) : [];

  // ログインユーザーがこの台本を購入済みなら canReview = true
  let canReview = false;
  let myReview = null;
  let isFavorited = false;
  if (me) {
    isFavorited = await isFavorite(script.id);
    if (me.uid !== script.authorUid) {
      const purchaseSnap = await getAdminDb()
        .collection("purchases")
        .where("buyerUid", "==", me.uid)
        .where("scriptId", "==", script.id)
        .limit(1)
        .get();
      canReview = !purchaseSnap.empty;
      if (canReview) {
        const myRes = await getMyReview(script.id);
        if (myRes.success) myReview = myRes.data ?? null;
      }
    }
    // 閲覧履歴の記録 (fire-and-forget、エラーは無視)
    void recordHistory(script.id);
  }

  // JSON-LD CreativeWork
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: script.title,
    description: script.synopsis,
    author: {
      "@type": "Person",
      name: script.authorDisplayName,
    },
    genre: script.genres,
    timeRequired: `PT${script.duration}M`,
    offers:
      script.price > 0
        ? {
            "@type": "Offer",
            price: script.price,
            priceCurrency: "JPY",
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // dangerouslySetInnerHTML は SEO 用 JSON-LD の標準パターン
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScriptDetail
        script={script}
        authorScripts={authorScripts}
        relatedScripts={relatedScripts}
        reviews={reviews}
        myReview={myReview}
        canReview={canReview}
        isFavorited={isFavorited}
        isLoggedIn={!!me}
      />
    </>
  );
}
