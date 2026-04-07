# 脚本マーケット 進捗管理

## 現在のステータス

**フェーズ**: フェーズ1 Step 2 完了。次は Step 3（認証・ユーザーID）。

## 前回の作業内容（2026-04-07）

### フェーズ1 Step 2: Firebase セットアップ（完了）

- ✅ Firebase プロジェクト `script-marcketplace`（Project Number: 993556142733）を使用
- ✅ Authentication 有効化（Google + メール/パスワード。社長作業）
- ✅ Firestore データベース作成（`(default)` / asia-northeast1 / 本番モード。Firebase CLI で作成）
- ✅ プロジェクトを Blaze プランへアップグレード（請求先アカウント `0176AF-7D6F3D-37560A` を Cloud Billing API でリンク）
- ✅ Cloud Storage for Firebase API 有効化＋デフォルトバケット `script-marcketplace.firebasestorage.app` を asia-northeast1 に作成（Firebase Storage REST API）
- ✅ Web アプリ登録 → `firebaseConfig` 取得（App ID: `1:993556142733:web:0043535cb9b14f4bc6a0c4`）
- ✅ サービスアカウントキー発行（`firebase-adminsdk-fbsvc@script-marcketplace.iam.gserviceaccount.com`、IAM REST API 経由）
- ✅ `.env.local` 作成（NEXT_PUBLIC_FIREBASE_* 6項目 + FIREBASE_ADMIN_* 3項目 + NEXT_PUBLIC_APP_URL）。`.gitignore` の `.env*` でカバー済み
- ✅ `firebase`, `firebase-admin`, `server-only` を npm install
- ✅ `src/lib/firebase.ts`（クライアント側）— 環境変数の必須チェック付き、重複初期化防止
- ✅ `src/lib/firebase-admin.ts`（サーバー側）— `import "server-only"`、遅延初期化（`getAdminAuth/getAdminDb/getAdminStorage`）、storageBucket 必須チェック
- ✅ フルレビュー: High 1 / Medium 2 / Low 1 を全て修正
- ✅ 最終差分チェック: クリーン
- ✅ npm run lint / npm run build クリーン

### Step 2 メモ

- gcloud CLI を Homebrew でインストール済み（`/opt/homebrew/share/google-cloud-sdk/bin`）。ただし以降は Firebase CLI の OAuth トークンを refresh して REST 直叩きで進めた経緯あり
- Firebase Admin の `getAdminAuth/getAdminDb/getAdminStorage` 関数経由パターンに統一されている。Server Action からは `import { getAdminAuth } from "@/lib/firebase-admin"` で取得すること

### フェーズ1 Step 1: プロジェクト初期化（完了）

- ✅ Next.js 15.5.14 プロジェクト作成（App Router、TypeScript、`src/`、import alias `@/*`）
- ✅ Tailwind CSS 4 セットアップ
- ✅ ESLint 設定（Flat Config + FlatCompat で `next/core-web-vitals` + `next/typescript` を読み込み。前回の設定は実は壊れており拡張子なしimportで lint がスキップされていたため修正）
- ✅ git リポジトリ初期化
- ✅ shadcn/ui セットアップ（`npx shadcn@latest init -b radix -p nova`、`components.json` / `src/lib/utils.ts` / `tw-animate-css` 導入）
- ✅ Noto Sans JP 導入（`next/font/google` で `--font-sans` に注入。weight 400/500/700）
- ✅ トンマナ適用（`src/app/globals.css`）
  - shadcn の design token を CLAUDE.md のカラーへマッピング
  - `--background: #FAFAF8` `--foreground: #333333` `--card: #F5F3EE` `--accent: #EDEBE6 / #555555` `--primary: #333333 / #FFFFFF` `--destructive: #C0392B` `--border: #DDDDDD` `--radius: 0.5rem (8px)`
  - ダークモード非対応のため `.dark` ブロックは削除
  - 見出し `h1`–`h6` を 700、本文 400 に設定
  - hover transition のみ許可（`a, button` に色/背景/ボーダー/opacity の transition）
- ✅ ディレクトリ構成作成（spec.md §3 準拠。空ディレクトリは `.gitkeep` で track）
  - `src/app/(public)/{search,scripts/[scriptId],users/[userId],login,register,about}`
  - `src/app/(app)/{setup/user-id,mypage/{purchased,favorites,history,saved-searches,consultations,settings},author/{scripts/new,hearing-sheet,stripe-setup,dashboard},chat/[chatId],hearing-sheet/[scriptId],preview/[scriptId],checkout/[scriptId],profile/edit,admin}`
  - `src/app/actions`、`src/app/api/webhooks/stripe`
  - `src/components/{ui,layout,auth,search,script,preview,chat,invoice,hearing-sheet,review,user,checkout,admin}`
  - `src/hooks`、`src/lib`、`src/types`
- ✅ Prettier 設定（`.prettierrc.json` + `prettier-plugin-tailwindcss` + `eslint-config-prettier`、`npm run format` / `format:check` 追加。全ファイル整形済み）
- ✅ `src/app/page.tsx` をスターターから簡易プレースホルダに置き換え
- ✅ ビルド検証（`npm run build` 成功、`npm run lint` クリーン）

### 体制の再設計（前々回からの継続）

- 開発AIの体制を **3体構成（メイン開発AI + @reviewer + @browser-tester）** に再設計
- Playwright MCP インストール完了（プロジェクトスコープ、接続確認済み）

## 次にやること

### フェーズ1 Step 3 / Step 4

- Step 3: 認証・ユーザーID（Google + メール/パスワード、ユーザーID設定画面、ミドルウェア）
- Step 4: 共通レイアウト（ヘッダー・フッター、レスポンシブ）
- → ブラウザテスト観点1 で @browser-tester に検証依頼 → フェーズ1完了

## フェーズ別進捗

| フェーズ  | 内容                                                   | ステータス                          |
| --------- | ------------------------------------------------------ | ----------------------------------- |
| フェーズ1 | 基盤構築（初期化・認証・レイアウト）                   | 着手中（Step 1-2 完了 / Step 3 着手前）  |
| フェーズ2 | 台本出品・表示（Stripe・出品・詳細・プレビュー）       | 未着手                              |
| フェーズ3 | 検索・購入（Algolia・検索・決済）                      | 未着手                              |
| フェーズ4 | チャット・上演許可（チャット・ヒアリングシート・請求） | 未着手                              |
| フェーズ5 | レビュー・お気に入り・通知                             | 未着手                              |
| フェーズ6 | トップページ・ランキング・管理画面                     | 未着手                              |
| フェーズ7 | 仕上げ・デプロイ                                       | 未着手                              |

## 仕様変更・決定事項

- **2026-04-07**: Next.js のバージョンを 15.x に確定（spec.md の指定通り）。`create-next-app@latest` は 16.2.2 を引いてくるが、AIの学習データとの整合性を優先してダウングレード
- **2026-04-07**: 開発フローを3体構成の自動ループに変更。「テストチェックポイント」という言葉を `implementation-guide.md` で「ブラウザテスト観点」に書き換え。社長確認は全フェーズ完了後のみ
- **2026-04-07**: globals.css のパスを `src/styles/globals.css`（spec.md 旧記載）から `src/app/globals.css`（Next.js 15 デフォルト）に変更。spec.md §3 を更新済み
- **2026-04-07**: shadcn/ui プリセットは `radix-nova`（base: radix, preset: nova、icon: lucide、css variables 有効）。base color は neutral
- **2026-04-07**: ESLint 設定を Flat Config + FlatCompat に書き換え。前セッションで作成された `eslint.config.mjs` は拡張子なしimportで実は壊れていた（lint がスキップ状態）ため修正
- **2026-04-07**: Firebase プロジェクトを Blaze プランに変更（Storage 利用のため必須）。請求先アカウント `0176AF-7D6F3D-37560A`（社長指定）をリンク
- **2026-04-07**: Firebase Admin の API パターンを「即時 export された定数」から「関数経由の遅延初期化」（`getAdminAuth/getAdminDb/getAdminStorage`）に変更。理由: Next.js のビルド時にモジュール評価で資格情報未設定エラーが出ないようにするため
