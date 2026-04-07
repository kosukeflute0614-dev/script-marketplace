# 脚本マーケット 進捗管理

## 現在のステータス

**Pass**: Pass 1（APIキー受領前の作業）
**Step**: P1-4 完了。次は P1-5「Step 7 台本詳細ページ」
**開発計画書**: `docs/development-plan.md`

## 直近の作業内容（2026-04-07）

### Pass 1 P1-4: フェーズ4 Step 12「チャット基盤」（完了）

- ✅ Server Actions: `startChat` / `sendMessage` / `getMyChats` (`src/app/actions/chat.ts`)
- ✅ 決定論的 chatId 方式（`[uidA, uidB].sort().join("_")`）+ Admin SDK の `create()` ALREADY_EXISTS catch で重複防止
- ✅ `useChatMessages` hook — Firestore onSnapshot リアルタイム購読、Firebase Auth 認証状態確定後に subscribe
- ✅ チャット一覧画面 (`(app)/chat/page.tsx`) と チャットルーム画面 (`(app)/chat/[chatId]/page.tsx`)
- ✅ メッセージバブル UI（自分/相手の左右配置、text/system/特殊メッセージ分岐）
- ✅ Server Component で参加者チェック → 不正アクセスは notFound
- ✅ Firebase セキュリティルール初版を deploy
  - `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
  - chats / messages の create はクライアント禁止（Server Actions 経由のみ）
  - chats / messages の read は参加者のみ（onSnapshot 用に許可）
  - users public read, scripts published public read, userIds は client write 禁止
- ✅ `requireUserOrRedirect()` を新設して Server Component の認証フェイルセーフを統一（mypage/profile/edit/chat[id] 全てに適用）
- ✅ フルレビュー: Critical 0 / High 2 / Medium 3 / Low 3 → High 全修正、Medium 1 (rules) も修正
- ✅ 最終差分チェック: Critical 0 / High 0 クリーン
- ✅ `npm run lint` / `npx tsc --noEmit` / `npm run build` 全 pass
- ⏭ ブラウザテストは P1-5/P1-6 完了後にまとめて統合テスト

### Pass 1 P1-3: 開発用 seed スクリプト（完了）

- ✅ `scripts/seed.ts` — 全コレクション (config/users/userIds/scripts(+versions)/chats(+messages)/consultations/invoices/purchases/favorites/history) を冪等に投入
- ✅ pdf-lib で英語プレースホルダー PDF を生成し Storage の `scripts/{id}/v1/script.pdf` にアップロード
- ✅ `src/types/script.ts` — spec §5 準拠の `ScriptDoc` 型定義 + `INITIAL_SCRIPT_STATS`
- ✅ `src/lib/script-tags.ts` — 26特性タグ・25ジャンル・5上演形態・5対象層・デフォルトヒアリングシート・トップページ初期セクション
- ✅ 安全装置: `NEXT_PUBLIC_FIREBASE_PROJECT_ID === "script-marcketplace"` でないと exit(1)（typo は意図的）
- ✅ 冪等性: cleanup → write の順序、固定 ID で管理
- ✅ pdf-lib / dotenv を devDependencies に追加
- ✅ レビュー: Critical 0 / High 2 (typo クラリファイ + thumbnailUrl 追加) / Medium 4 (feeScheduleMin null 修正、lastMessage フォールバック、duration 整合、HearingSheetQuestion 型注釈) → 主要な指摘を全て修正
- ✅ `npx tsx scripts/seed.ts` 実行成功（cleanup → write 全て完了）
- ✅ `npm run lint` / `npx tsc --noEmit` / `npm run build` 全て pass

投入されるサンプルデータ（後続 Step での動作確認に利用）:
- users: sato-misaki / tanaka-shunsuke / yamamoto-sensei / hiroko / kenji（前3者は作家、stripeOnboarded=true）
- scripts: 8件（コメディ・青春・一人芝居・ミステリー・悲劇・喜劇・SF無料・恋愛）
- chats × 3 / consultations × 3（unresponded/in_progress/completed のそれぞれ）
- invoices × 2 (pending + paid) / purchases × 2 (有料 + 無料) / favorites + history

### Pass 1 P1-2: フェーズ1 Step 4「共通レイアウト」（完了）

- ✅ `SiteHeader`（Server Component）— ロゴ + PCナビ + 右側アクション、ログイン状態で表示切替
- ✅ `MobileNav`（Client Component）— shadcn/ui sheet によるハンバーガードロワー
- ✅ `SiteFooter` — リンク集 + コピーライト
- ✅ `SiteShell` — ヘッダー + main + フッター の共通レイアウトラッパー
- ✅ `(public)/layout.tsx` 新規作成 — `/login` `/register` 以外を SiteShell でラップ
- ✅ `(app)/layout.tsx` 拡張 — `/setup/user-id` `/verify-email` 以外を SiteShell でラップ。認可判定は pathname 欠落時も必ず実施
- ✅ `(public)/page.tsx` をプレースホルダーからヒーロー入りトップへ
- ✅ `mypage/page.tsx` `profile/edit/page.tsx` を `requireUser()` 経由に統一
- ✅ shadcn/ui sheet を追加 + dialog/sheet の XIcon に aria-hidden 付与
- ✅ ボーダー色をトンマナの `--border` (#dddddd) に統一
- ✅ フルレビュー: Critical 0 / High 1 / Medium 2 / Low 3 → High と Medium 全修正、Low の修正可能なものも対応
- ✅ ブラウザテスト観点1: 全13ケース パス（PC/モバイル/レスポンシブ/認証フロー/リダイレクト/バリデーション）
- ✅ 最終差分チェック: Critical 0 / High 0 クリーン
- ✅ `npm run lint` / `npx tsc --noEmit` / `npm run build` 全て pass

### 開発支援ツール

- ✅ `scripts/create-test-user.ts` — Admin SDK で `test-user@example.com` (emailVerified=true) を作成。`npx tsx scripts/create-test-user.ts` で実行
- ✅ `tsx` `dotenv` を devDependencies に追加

### Pass 1 P1-1: フェーズ1 Step 3「認証・ユーザーID」（完了）

- ✅ Firebase Auth クライアント（Google Popup / Email Password）
- ✅ Server Actions: `createSession` / `destroySession` / `signOutAction` / `setUserId` / `updateProfile` / `deleteAccount` / `getMe`
- ✅ Session cookie 方式（`__session`、HttpOnly、14日有効、Admin SDK の `createSessionCookie` で発行）
- ✅ 認証ミドルウェア（`src/middleware.ts`）— Edge Runtime で cookie 存在チェック + `x-pathname` ヘッダ伝播
- ✅ `(app)/layout.tsx` での厳密な認可判定（未ログイン/メール未確認/userId 未設定/setup 完了後の追い払い）
- ✅ `users` ドキュメント自動作成（`createSession` と `getCurrentUser` の二重ロジック、`create()` + `ALREADY_EXISTS` catch で並走対策）
- ✅ ユーザーID 一意性: `userIds/{userId}` 補助コレクション + Firestore トランザクションで TOCTOU 競合を排除
- ✅ ユーザーIDバリデーション（`src/lib/user-id.ts`）— 正規表現・長さ・予約語
- ✅ メール確認フロー（password ユーザーは `/verify-email` で待機。`reload` + `createSession` 再発行で確認後遷移）
- ✅ 画面: `(public)/login`, `(public)/register`, `(app)/setup/user-id`, `(app)/profile/edit`, `(app)/verify-email`, `(app)/mypage`（暫定マイページ）
- ✅ 共通: `Toaster`（sonner、右上スライドイン4秒）を root layout にマウント、shadcn/ui の form/button/input/label/card/separator/sonner/dialog を導入、`form.tsx` は手書き
- ✅ パッケージ追加: `react-hook-form` `zod` `@hookform/resolvers` `sonner`
- ✅ フルレビュー: Critical 1 / High 2 / Medium 4 / Low 3 → 全て修正
- ✅ 再レビュー: Critical 0 / High 0 / Medium 1 / Low 1 → さらに修正
- ✅ 最終差分チェック: Critical 0 / High 0（クリーン）
- ✅ `npm run lint` / `npx tsc --noEmit` / `npm run build` 全て pass
- ⏭ ブラウザテストは Step 4 完了後に「ブラウザテスト観点1」として統合実施

## 過去の作業内容（2026-04-07）

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
