# 脚本マーケット 開発実行計画書（Pass1 / Pass2 方式）

`docs/implementation-guide.md` は仕様としてのフェーズ定義書、本ドキュメントは **「APIキーが揃うまでに何をどの順番でやるか」を定めた実行計画書** です。

---

## 1. 戦略

**目的**: Stripe / Algolia / Resend のAPIキーが社長から提供される前に、安全に進められる開発を最大限こなす。キー受領後にやる作業を最小化しつつ、「最後にバグが噴出する」リスクを避ける。

**判定基準（厳格）**:

ある Step が **Pass 1** に入る条件は以下の **両方** を満たすこと：

1. Stripe / Algolia の SDK を呼ぶコードが含まれない
2. 「あとで差し替える前提の暫定バイパスフラグ」を持ち込まない

**Resend は例外扱い**: Resend は「メール送信」という単純なHTTPリクエスト1本のサービスで差し替えリスクが極めて低いため、`sendEmail(to, subject, html)` という関数のスタブ（コンソールログ出力）で先行実装する。Pass 2 では関数の中身だけ Resend SDK 呼び出しに置き換える（シグネチャは変わらない）。

**社長提供のキー**: Stripe（テスト用キー3つ）/ Algolia（App ID + Search Key + Admin Key）/ Resend（API Key）。**3種まとめて一括提供** する方針で社長と合意済み。

---

## 2. Pass 1: APIキー受領前に完了させる作業

### 2-0. 既に完了済み

- ✅ **Step 1** プロジェクト初期化
- ✅ **Step 2** Firebase 基盤
- ✅ **Phase1 Step1+2 commit**: `a54e47c chore(phase1): Step 1+2 完了`

### 2-1. Pass 1 実行順

依存関係に基づき、以下の順序で **Step 単位で commit** しながら進める。各 Step ごとに `[実装 → @reviewer フルレビュー → 修正ループ → @browser-tester 機能テスト → 修正ループ → @reviewer 最終差分チェック → commit & push]` のサイクルを回す。

| 実行順 | Step | 内容 | 主要成果物 |
|---|---|---|---|
| **P1-1** | Step 3 | 認証・ユーザーID | `(public)/login`, `(public)/register`, `(app)/setup/user-id`, `(app)/profile/edit`, `app/actions/auth.ts`, `users` 初回作成、ミドルウェア、メール確認フロー |
| **P1-2** | Step 4 | 共通レイアウト | `components/layout/header.tsx`, `components/layout/footer.tsx`, ハンバーガーメニュー、レスポンシブ |
| **P1-3** | **seed スクリプト** | 開発用テストデータ投入 | `scripts/seed.ts`（Admin SDK経由で users / scripts / chats / consultations / invoices / purchases にサンプル投入） |
| **P1-4** | Step 12 | チャット基盤 | `app/actions/chat.ts`（startChat, sendMessage, getMyChats）、`(app)/chat/page.tsx`、`(app)/chat/[chatId]/page.tsx`、`hooks/use-chat.ts`（onSnapshot） |
| **P1-5** | Step 7 | 台本詳細ページ | `(public)/scripts/[scriptId]/page.tsx`、`app/actions/scripts.ts` の `getScript`/`getScriptsByAuthor`、SEO（メタ・OGP・JSON-LD）、短縮URL→スラッグURLリダイレクト、`(public)/users/[userId]/page.tsx` |
| **P1-6** | Step 8 | PDFプレビュー | `(app)/preview/[scriptId]/page.tsx`、pdf.js 統合、冒頭5ページ制限、無料公開時の全ページ表示 |
| **P1-7** | Step 13 | ヒアリングシート・相談 | `app/actions/hearing-sheet.ts`, `app/actions/consultation.ts`、`(app)/hearing-sheet/[scriptId]/page.tsx`、デフォルト/個別シート設定画面、createConsultation（Resendスタブ呼び出し含む） |
| **P1-8** | Step 15 | 相談ステータス管理 | consultations ステータス自動遷移、completeConsultation、`(app)/mypage/consultations/page.tsx`（作家側・利用者側） |
| **P1-9** | Step 16 | レビュー | `app/actions/review.ts`、台本詳細ページへのレビュー表示、stats.reviewCount/reviewAverage 自動更新 |
| **P1-10** | Step 17 | お気に入り・閲覧履歴 | `app/actions/favorite.ts`、`(app)/mypage/favorites/page.tsx`、閲覧履歴自動記録（最大100件）、`(app)/mypage/history/page.tsx`、stats.favoriteCount 更新 |
| **P1-11** | Step 18 | メール通知（Resendスタブ） | `lib/resend.ts`（スタブ実装：`sendEmail()` がconsole.logするだけ。シグネチャはResend SDKと一致）、5種類のメールテンプレ、通知設定画面（`(app)/mypage/settings/notifications/page.tsx`）、スロットリング、オンライン判定（lastActiveAt）、各トリガーポイント（Step 13/14/16 等）への埋め込み |
| **P1-12** | Step 19 | トップページ | `(public)/page.tsx`、ヒーロー、新着、人気、CTA、config.topPageSections に基づく動的表示 |
| **P1-13** | Step 20 | ランキング（バッチロジック） | `lib/ranking.ts`（純粋関数として実装）、台本詳細ページにランキング表示。Cloud Functions へのデプロイは Pass 2 |
| **P1-14** | Step 21 | 関連台本レコメンド | `lib/recommendation.ts`、コンテンツベース（同ジャンル・近いキャスト数）、同作家の他作品 |
| **P1-15** | Step 22 | 管理画面 | `(app)/admin/`配下、手数料設定 / 振込手数料 / 通報管理 / ユーザー管理 / 台本管理 / バッジ管理 / 特性タグ管理 / トップページ設定 / 売上レポート（内部 purchases/invoices から集計）/ 取引一覧、`app/actions/admin.ts` |
| **P1-16** | Step 23 | 通報機能 | `app/actions/report.ts`、通報フォーム（台本/レビュー/メッセージ/ユーザー）、管理画面側の対応 UI |
| **P1-17** | Step 24 | SEO・パフォーマンス | `app/sitemap.ts`、全ページのメタタグ確認、画像最適化、Lighthouse スコア確認 |
| **P1-18** | Step 25（一部） | Firestoreセキュリティルール | spec-details.md §5 のルールを `firestore.rules` に反映、Firebase CLI で deploy |
| **P1-19** | Step 27（一部） | テスト（Pass 1 機能のみ） | Vitest 導入、ユニットテスト・統合テスト |

### 2-2. Pass 1 で **意図的に作らないもの**

以下は Pass 2 で実装するため、Pass 1 では一切コードを書かない（暫定実装も書かない）。仕様が見えるよう型定義やインターフェースだけ先行で書くのは可。

- Step 5: Stripe Connect オンボーディング
- Step 6: 台本出品（PDFアップロード以下すべて）
- Step 9: Algolia インデックス・Firebase Extension
- Step 10: 検索画面（フリーワード・フィルター・ソート・保存検索）
- Step 11: 台本購入（無料・有料の両方）
- Step 14: 都度請求（createInvoice / payInvoice / Webhook / 請求カード）

### 2-3. seed スクリプトの仕様（P1-3）

**配置**: `scripts/seed.ts`（プロジェクトルートの `scripts/` ディレクトリ。`src/` ではない）。実行は `npx tsx scripts/seed.ts`。

**目的**: Pass 1 の各機能を実データで動作確認するため、Firestore に開発用のサンプルデータを投入する。

**投入内容**（spec.md §5 / spec-details.md §3 のスキーマに準拠）:

- **users**: 5件（うち作家3件、購入者2件。`stripeOnboarded: true` を作家に設定。`notificationSettings` 全 true）
- **scripts**: 8〜10件（ジャンル・キャスト・価格を分散。うち2件は無料、1件は `isFreeFullText: true`）
  - 各 scripts に versions/1 サブドキュメント
  - サンプル PDF（1ファイル使い回し）を Storage の `scripts/{id}/v1/script.pdf` にアップロード
- **chats**: 3件（作家×購入者の組み合わせ）
  - 各 chats の messages サブコレクションにテキスト/system/hearingSheetResponse メッセージを数件
- **consultations**: 3件（status を未対応/対応中/完了に分散）
- **invoices**: 2件（pending と paid）
- **purchases**: 2件（無料台本1件、有料台本1件）
- **users/{uid}/favorites, history**: 数件
- **config/platform**: spec-details.md §3-1（特性タグ26種）/ §3-3（topPageSections）/ §3-2（ヒアリングシート参考例）/ feeRate 0.165 等の初期値を投入

**冪等性**: 何度実行しても同じ状態になるよう、固定 ID で upsert する。

**注意**: seed スクリプトは **本番には絶対に流さない**。`if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "script-marcketplace") throw` で開発プロジェクト以外への実行を防ぐ。

### 2-4. Resend スタブの仕様（P1-11）

**配置**: `src/lib/resend.ts`

**シグネチャ**:

```ts
export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  // Resend の API に合わせて from は環境変数で固定
};

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  // Pass 1: コンソールに出力するだけのスタブ
  console.log("[resend-stub] sendEmail", params);
  return { id: `stub-${Date.now()}` };
}
```

**テンプレート関数**: spec.md §10 の5種類（`onPurchased`, `onInvoicePaid`, `onNewMessage`, `onScriptUpdated`, `onNewReview`）を `src/lib/email-templates.ts` に純粋関数として定義し、`sendEmail` に渡す HTML を組み立てる。これは Pass 2 でも完全にそのまま使えるので、テンプレート部分は本実装。

**Pass 2 での差し替え**: `sendEmail` の中身だけ Resend SDK 呼び出しに置き換える。シグネチャは変えない。

---

## 3. Pass 2: APIキー受領後にやる作業

社長から Stripe / Algolia / Resend のキーを受け取った後、以下の順序で実装。

### 3-1. 着手前にやること

- `.env.local` に受領したキーを追加（Stripe 3つ、Algolia 3つ、Resend 1つ）
- `git status` で `.env.local` が追跡されていないことを再確認

### 3-2. Pass 2 実行順

| 実行順 | Step | 内容 | 依存 |
|---|---|---|---|
| **P2-1** | Step 5 | Stripe Connect Express オンボーディング、`account.updated` Webhook、`lib/stripe.ts` / `lib/stripe-client.ts` 初期化 | — |
| **P2-2** | Step 6 | 台本出品（PDFアップロード、メタデータ、特性タグ、スラッグ生成、versions サブコレクション、出品管理画面） | P2-1 |
| **P2-3** | Step 9 | Algolia インデックス設定、Firebase Extension `firestore-algolia-search` インストール、Kuromoji 設定、レプリカ作成 | — |
| **P2-4** | Step 10 | Algolia InstantSearch 導入、フリーワード検索、全フィルター、並び替え、URL反映、保存検索、スマホモーダル / PCサイドバー | P2-3 |
| **P2-5** | Step 11 | 台本購入（`createCheckoutSession`、`createFreePurchase`、`getDownloadUrl`、Webhook処理、購入完了画面、二重購入防止、購入済み一覧） | P2-1, P2-2 |
| **P2-6** | Step 14 | 都度請求（`createInvoice`、`payInvoice`、`cancelInvoice`、Webhook処理、請求カード UI、システムメッセージ） | P2-1（チャット基盤は Pass 1 で完成済み） |
| **P2-7** | Step 18 swap | `lib/resend.ts` のスタブを Resend SDK 呼び出しに差し替え | — |
| **P2-8** | Step 25 残り | Stripe Webhook 署名検証、本番用環境変数の確認 | P2-1 |
| **P2-9** | Step 26 | デプロイ（Firebase App Hosting、本番 Firebase / Stripe ライブモード / Algolia 本番、独自ドメイン判断） | 全部 |
| **P2-10** | Step 27 全機能 | Vitest による全機能の統合テスト・最終リリース前チェック | 全部 |

### 3-3. 独自ドメインについて

P2-9（デプロイ）の時点で社長と相談。Firebase App Hosting のデフォルトドメイン（`xxx.web.app`）でも本番運用は可能。独自ドメインは後付け可能なので、急がない方針。

---

## 4. 各 Step の自動ループ手順

CLAUDE.md「フェーズループ」セクションに準拠。Pass 1 / Pass 2 共通：

```
[Step 開始]
  ↓
[1] 実装
  ↓
[2] @reviewer フルレビュー
  ↓
[3] Critical/High 修正ループ（最大2回）
  ↓ 突破不可 → デバッグ修正モード
  ↓
[4] @browser-tester 機能テスト
  ↓
[5] テスト修正ループ（最大2回）
  ↓ 突破不可 → デバッグ修正モード
  ↓
[6] @reviewer 最終差分チェック
  ↓
[7] 差分修正ループ（最大2回）
  ↓
[8] git commit & push（Step 単位）
  ↓
[9] progress.md 更新
  ↓
[次の Step へ]
```

**コミットメッセージ規約**:

```
<type>(P1-NN or P2-NN): Step <N> <タイトル>

- 実装した機能
- 自動レビュー結果
- 既知の問題（あれば）

Co-Authored-By: ...
```

例: `feat(P1-1): Step 3 認証・ユーザーID実装`

---

## 5. エスカレーション条件

CLAUDE.md「エスカレーション条件」セクションに準拠。以下に該当したら即停止して `docs/escalation.md` に状況を書き、社長を待つ：

- デバッグ修正モードで仮説3回外し
- 同じバグが修正後も5回再発
- 仕様書に書いていない判断が必要になった
- 外部要因疑い（DB状態、環境変数、外部APIエラー）
- レビュアー指摘の Critical/High が修正不可能と判明

**Pass 2 着手の追加条件**: Pass 1 を完走した時点で **必ず社長に「キーをお願いします」と報告して停止** する。社長からキーを受領するまで Pass 2 には進まない。

---

## 6. 進捗トラッキング

`docs/progress.md` に以下を記録する：

- 現在の Pass / Step
- 完了した Step のリスト（commit hash 付き）
- 次にやる Step
- 既知の問題（→ `docs/known-issues.md`）

---

## 7. 変更履歴

- **2026-04-07**: 初版作成。Pass1/Pass2 方式に開発戦略を確定。Stripe/Algolia は Pass 2、Resend は Pass 1（スタブ）で先行実装の方針。seed スクリプトを Pass 1 序盤に追加。社長から「APIキー3種は一括提供」で合意。
