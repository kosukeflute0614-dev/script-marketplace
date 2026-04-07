/**
 * 開発用テストユーザーを Firebase Auth に作成する。
 *
 * 実行: `npx tsx scripts/create-test-user.ts`
 *
 * - emailVerified=true で作成するため、メール確認フローをスキップしてログインできる
 * - 既に同じメールで存在する場合はパスワードと verified だけ更新する
 * - 開発プロジェクトでのみ実行可能（NEXT_PUBLIC_FIREBASE_PROJECT_ID で判定）
 */

import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const ALLOWED_PROJECT_ID = "script-marcketplace";

if (PROJECT_ID !== ALLOWED_PROJECT_ID) {
  console.error(
    `[create-test-user] このスクリプトは開発プロジェクト (${ALLOWED_PROJECT_ID}) でしか実行できません。現在のプロジェクト: ${PROJECT_ID ?? "(undefined)"}`,
  );
  process.exit(1);
}

const TEST_USER_EMAIL = "test-user@example.com";
const TEST_USER_PASSWORD = "TestPass123!";
const TEST_USER_DISPLAY_NAME = "テストユーザー";

async function main() {
  const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!adminProjectId || !clientEmail || !privateKey) {
    throw new Error("FIREBASE_ADMIN_* env vars are required");
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId: adminProjectId, clientEmail, privateKey }),
    });
  }

  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(TEST_USER_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: TEST_USER_PASSWORD,
      emailVerified: true,
      displayName: TEST_USER_DISPLAY_NAME,
    });
    console.log(`[create-test-user] updated existing test user uid=${uid}`);
  } catch {
    const created = await auth.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      emailVerified: true,
      displayName: TEST_USER_DISPLAY_NAME,
    });
    uid = created.uid;
    console.log(`[create-test-user] created new test user uid=${uid}`);
  }

  // Firestore 上の users ドキュメントは敢えて作らない。
  // → ブラウザテストで「初回ログイン → users 自動作成 → setUserId 画面」のフローを検証できる
  //   ようにするため。検証後に ID を確定するなら、テスターが UI で操作する。
  //
  // ただし2回目以降のログインで userId が既に "" のままでも問題なくフローが動くので、
  // フロー再テストのためにあえて users ドキュメントは削除しておく。
  await db.collection("users").doc(uid).delete().catch(() => {
    /* not exists */
  });

  // userIds 補助コレクション側の予約も解除（同じ userId でフローを再現できるように）
  // 補足: 実運用では userId は変更不可・解放不可だが、テスト用途では再利用可能にしたい。
  const TEST_USER_ID = "tester-001";
  await db.collection("userIds").doc(TEST_USER_ID).delete().catch(() => {
    /* not exists */
  });

  console.log("");
  console.log("============================================");
  console.log("テストユーザー作成完了");
  console.log(`  Email:    ${TEST_USER_EMAIL}`);
  console.log(`  Password: ${TEST_USER_PASSWORD}`);
  console.log(`  UID:      ${uid}`);
  console.log(`  推奨ユーザーID: ${TEST_USER_ID}`);
  console.log("============================================");

  void FieldValue.serverTimestamp; // ESLint 用ダミー（将来 seed で使う想定）
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[create-test-user] failed", err);
    process.exit(1);
  });
