/**
 * Algolia インデックスの初期化スクリプト
 *
 * 実行: `npx tsx scripts/algolia-init.ts`
 *
 * 処理:
 * 1. メインインデックス `scripts` の設定を更新
 *    - searchableAttributes: title, synopsis, authorDisplayName
 *    - attributesForFaceting: genres, performanceType, targetAudience, themeTags, scriptTags, badges,
 *      price, feeScheduleMin, castMin, castMax, castMale, castFemale, castUnspecified, duration, status
 *    - customRanking: desc(favoriteCount), desc(purchaseCount), desc(createdAt)
 *    - queryLanguages: ["ja"]  (Kuromoji 形態素解析)
 *    - replicas: scripts_newest, scripts_price_asc, scripts_price_desc, scripts_rating
 * 2. レプリカインデックスの設定を更新 (各 ranking)
 * 3. Firestore の published な台本を全件取得して Algolia に upsert
 */

import { config as loadDotenv } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { algoliasearch } from "algoliasearch";

import { scriptToAlgoliaRecord } from "../src/lib/algolia-mapping";
import type { ScriptDoc } from "../src/types/script";

loadDotenv({ path: ".env.local" });

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

if (!APP_ID || !ADMIN_KEY) {
  console.error("[algolia-init] NEXT_PUBLIC_ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY not set");
  process.exit(1);
}

const ALLOWED_PROJECT_ID = "script-marcketplace";
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== ALLOWED_PROJECT_ID) {
  console.error("[algolia-init] このスクリプトは開発プロジェクトでのみ実行可能");
  process.exit(1);
}

// Firebase Admin
function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_* env vars required");
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}
initAdmin();
const db = getFirestore();

const algolia = algoliasearch(APP_ID, ADMIN_KEY);

const INDEX = "scripts";
const REPLICAS = ["scripts_newest", "scripts_price_asc", "scripts_price_desc", "scripts_rating"];

// メインインデックスの設定
const MAIN_SETTINGS = {
  searchableAttributes: [
    "unordered(title)",
    "unordered(synopsis)",
    "unordered(authorDisplayName)",
  ],
  // useRefinementList (UI に件数を出す) ファセットは filterOnly ではなく通常指定。
  // filterOnly は「UI に表示不要だがフィルタとして使う」属性のみに使う。
  attributesForFaceting: [
    "genres",                   // useRefinementList (UI 表示)
    "performanceType",          // useRefinementList (UI 表示)
    "targetAudience",           // useRefinementList (UI 表示)
    "scriptTags",               // useRefinementList (UI 表示)
    "filterOnly(themeTags)",
    "filterOnly(badges)",
    "filterOnly(price)",
    "filterOnly(feeScheduleMin)",
    "filterOnly(castMin)",
    "filterOnly(castMax)",
    "filterOnly(castMale)",
    "filterOnly(castFemale)",
    "filterOnly(castUnspecified)",
    "filterOnly(duration)",
    "filterOnly(status)",
    "filterOnly(isFreeFullText)",
  ],
  customRanking: ["desc(favoriteCount)", "desc(purchaseCount)", "desc(createdAt)"],
  queryLanguages: ["ja"],
  indexLanguages: ["ja"],
  removeStopWords: true,
  // ja モードでは Algolia が Kuromoji 互換のトークナイザを自動で使う
  ranking: ["typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"],
  replicas: REPLICAS,
};

// レプリカ用の共通設定（attributesForFaceting は親から自動継承されないため明示）
const REPLICA_COMMON_SETTINGS = {
  attributesForFaceting: MAIN_SETTINGS.attributesForFaceting,
};

// レプリカ別の ranking 設定
const REPLICA_SETTINGS: Record<string, Record<string, unknown>> = {
  scripts_newest: { ...REPLICA_COMMON_SETTINGS, customRanking: ["desc(createdAt)"] },
  scripts_price_asc: { ...REPLICA_COMMON_SETTINGS, customRanking: ["asc(price)", "desc(favoriteCount)"] },
  scripts_price_desc: { ...REPLICA_COMMON_SETTINGS, customRanking: ["desc(price)", "desc(favoriteCount)"] },
  scripts_rating: { ...REPLICA_COMMON_SETTINGS, customRanking: ["desc(reviewAverage)", "desc(reviewCount)"] },
};

async function setMainSettings() {
  console.log(`[algolia-init] setting main index ${INDEX}`);
  // SDK の SupportedLanguage 型は厳密だが ja は実際にサポートされているため as any キャスト
  await algolia.setSettings({
    indexName: INDEX,
    indexSettings: MAIN_SETTINGS as Parameters<typeof algolia.setSettings>[0]["indexSettings"],
  });
  console.log(`[algolia-init] main index settings applied`);
}

async function setReplicaSettings() {
  for (const replica of REPLICAS) {
    const settings = REPLICA_SETTINGS[replica] ?? {};
    console.log(`[algolia-init] setting replica ${replica}`);
    await algolia.setSettings({
      indexName: replica,
      indexSettings: settings as Parameters<typeof algolia.setSettings>[0]["indexSettings"],
    });
  }
}

async function indexAllScripts() {
  console.log(`[algolia-init] fetching all published scripts from Firestore`);
  const snap = await db.collection("scripts").where("status", "==", "published").get();
  console.log(`[algolia-init] found ${snap.size} published scripts`);
  if (snap.empty) return;
  const records = snap.docs.map((doc) => scriptToAlgoliaRecord(doc.data() as ScriptDoc, doc.id));
  await algolia.saveObjects({ indexName: INDEX, objects: records });
  console.log(`[algolia-init] saved ${records.length} records to ${INDEX}`);
}

async function main() {
  await setMainSettings();
  await setReplicaSettings();
  await indexAllScripts();
  console.log(`[algolia-init] all done`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[algolia-init] failed", err);
    process.exit(1);
  });
