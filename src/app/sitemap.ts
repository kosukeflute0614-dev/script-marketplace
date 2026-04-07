import type { MetadataRoute } from "next";

import { getAdminDb } from "@/lib/firebase-admin";
import { canonicalScriptPath } from "@/lib/script-url";
import type { ScriptDoc } from "@/types/script";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * 動的 sitemap (spec.md §13)
 * - 静的ページ (/, /search, /about)
 * - 公開中の台本詳細
 * - 公開ユーザープロフィール
 *
 * 5000 件 / 1 sitemap までは Next.js が単一ファイルで返す。
 * これを超える場合は generateSitemaps API での分割を検討する。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${APP_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const db = getAdminDb();
    const [scriptsSnap, usersSnap] = await Promise.all([
      db.collection("scripts").where("status", "==", "published").limit(2000).get(),
      db.collection("users").limit(2000).get(),
    ]);

    const scriptEntries: MetadataRoute.Sitemap = scriptsSnap.docs.map((doc) => {
      const data = doc.data() as ScriptDoc;
      const updatedAt = toDate(data.updatedAt) ?? now;
      return {
        url: `${APP_URL}${canonicalScriptPath(data.slug, doc.id)}`,
        lastModified: updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      };
    });

    const userEntries: MetadataRoute.Sitemap = usersSnap.docs
      .map((doc): MetadataRoute.Sitemap[number] | null => {
        const data = doc.data() as { userId?: string; updatedAt?: unknown };
        if (!data.userId) return null;
        return {
          url: `${APP_URL}/users/${data.userId}`,
          lastModified: toDate(data.updatedAt) ?? now,
          changeFrequency: "weekly" as const,
          priority: 0.4,
        };
      })
      .filter((e): e is MetadataRoute.Sitemap[number] => e !== null);

    return [...staticEntries, ...scriptEntries, ...userEntries];
  } catch (err) {
    console.error("[sitemap] failed to fetch dynamic entries", err);
    return staticEntries;
  }
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate(): Date }).toDate();
  }
  return null;
}
