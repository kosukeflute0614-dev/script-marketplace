# 脚本マーケット 開発仕様書

演劇台本を「探す・買う・上演許可を取る」C2Cマーケットプレイス。本ドキュメントはアプリの全仕様を1ファイルに集約したもの。

---

## 1. 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 15.x（App Router）/ React / TypeScript |
| DB | Firebase Firestore |
| 認証 | Firebase Authentication（Google認証 + メール＋パスワード） |
| ストレージ | Firebase Storage |
| サーバー処理 | Firebase Cloud Functions |
| 決済 | Stripe Connect Express |
| 検索 | Algolia（フリーワード検索・サジェスト・日本語形態素解析） |
| PDFプレビュー | pdf.js（ブラウザ側レンダリング） |
| メール送信 | Resend |
| ホスティング | Firebase App Hosting（asia-northeast1） |
| テスト | Vitest |
| CSS | Tailwind CSS + shadcn/ui |

---

## 2. アーキテクチャ

```
ブラウザ（React + pdf.js + Algolia InstantSearch + Stripe.js）
    ↓
Firebase App Hosting（Next.js SSR + Server Actions）
    ↓
Firestore / Auth / Storage / Stripe Connect / Algolia
    ↓
Cloud Functions（Algolia同期、メール通知）
```

### 設計原則
- **Server Actions中心**: フォーム・ボタン操作は `app/actions/` で処理。API Routesは Stripe Webhook のみ
- **クライアント/サーバーFirebase分離**: `lib/firebase.ts`（クライアント）と `lib/firebase-admin.ts`（サーバー）を明確に分離
- **ロールベースURL構造**: `(public)/` は認証不要、`(app)/` は認証必須

---

## 3. ディレクトリ構成

```
src/
├── app/
│   ├── (public)/                    # 認証不要
│   │   ├── page.tsx                 # トップページ
│   │   ├── search/                  # 検索結果一覧
│   │   ├── scripts/[scriptId]/      # 台本詳細ページ
│   │   ├── users/[userId]/          # ユーザープロフィールページ
│   │   ├── login/                   # ログイン
│   │   ├── register/                # アカウント登録
│   │   └── about/                   # サービス紹介
│   ├── (app)/                       # 認証必須
│   │   ├── setup/user-id/           # ユーザーID設定（初回のみ）
│   │   ├── mypage/                  # マイページ
│   │   │   ├── purchased/           # 購入済み台本
│   │   │   ├── favorites/           # お気に入り
│   │   │   ├── history/             # 閲覧履歴
│   │   │   ├── saved-searches/      # 保存済み検索条件
│   │   │   ├── consultations/       # 相談管理
│   │   │   └── settings/            # アカウント設定・通知設定
│   │   ├── author/                  # 作家向け機能
│   │   │   ├── scripts/             # 出品管理
│   │   │   ├── scripts/new/         # 新規出品
│   │   │   ├── hearing-sheet/       # ヒアリングシート設定
│   │   │   ├── stripe-setup/        # Stripe Connect連携
│   │   │   └── dashboard/           # 売上ダッシュボード
│   │   ├── chat/                    # チャット
│   │   │   ├── page.tsx             # チャット一覧
│   │   │   └── [chatId]/            # チャットルーム
│   │   ├── hearing-sheet/[scriptId]/ # ヒアリングシート回答画面
│   │   ├── preview/[scriptId]/      # プレビュー（pdf.js）
│   │   ├── checkout/[scriptId]/     # チェックアウト
│   │   ├── profile/edit/            # プロフィール編集
│   │   └── admin/                   # 管理画面（管理者のみ）
│   ├── actions/                     # Server Actions
│   │   ├── auth.ts / scripts.ts / search.ts / purchase.ts
│   │   ├── chat.ts / consultation.ts / invoice.ts / hearing-sheet.ts
│   │   ├── review.ts / favorite.ts / notification.ts
│   │   ├── stripe.ts / report.ts / admin.ts
│   └── api/webhooks/stripe/route.ts # Stripe Webhook
├── components/                      # UIコンポーネント
│   ├── ui/ / layout/ / auth/ / search/ / script/
│   ├── preview/ / chat/ / invoice/ / hearing-sheet/
│   ├── review/ / user/ / checkout/ / admin/
├── hooks/                           # use-auth.ts / use-chat.ts / use-search.ts
├── lib/                             # firebase.ts / firebase-admin.ts / stripe.ts / algolia.ts / resend.ts
├── types/                           # script.ts / user.ts / chat.ts / consultation.ts / invoice.ts / review.ts / payment.ts
└── styles/globals.css
```

---

## 4. 認証

### 認証方式
- Google認証（メイン）+ メール＋パスワード（Googleアカウントがない人用）
- メール＋パスワードの場合はメール確認必須（確認前は主要操作不可）

### ユーザーID
- 全ユーザーが初回ログイン後に設定（`/setup/user-id/`にリダイレクト）
- 半角英数字（小文字）＋ハイフン、3〜30文字、変更不可
- 正規表現: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`
- 予約語: admin, system, support, help, about, search, login, register, api, settings

### アクセス権限

| 操作 | 未ログイン | ログイン済み | Stripe連携済み |
|------|----------|------------|-------------|
| 台本一覧・詳細・検索の閲覧 | ○ | ○ | ○ |
| プレビュー・購入・チャット・レビュー | × | ○ | ○ |
| 台本の出品・請求作成 | × | × | ○ |
| 管理画面 | × | × | 管理者のみ |

管理者: Firestoreの `users` ドキュメントで `isAdmin: true` を手動設定。

---

## 5. DBスキーマ（Firestore）

### users
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| uid | string | ○ | Firebase Auth UID（ドキュメントID） |
| email | string | ○ | メールアドレス |
| displayName | string | ○ | 表示名 |
| userId | string | ○ | ユーザーID（URL用。変更不可） |
| bio | string | — | 自己紹介 |
| iconUrl | string | — | プロフィール画像URL |
| snsLinks | map | — | `{ twitter?, website? }` |
| stripeAccountId | string | — | Stripe Connect Express ID |
| stripeOnboarded | boolean | — | Stripe連携完了フラグ |
| isAdmin | boolean | — | 管理者フラグ |
| hearingSheet | array\<map\> | — | デフォルトヒアリングシート `[{ question, order }]` |
| notificationSettings | map | ○ | `{ onPurchased, onInvoicePaid, onNewMessage, onScriptUpdated, onNewReview }` 各boolean |
| createdAt / updatedAt | timestamp | ○ | |

サブコレクション: `favorites`（scriptId, addedAt）、`history`（scriptId, viewedAt。最大100件）、`savedSearches`（name, filters。最大20件）

### scripts
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | 自動生成ID |
| authorUid | string | ○ | 出品者UID |
| authorUserId | string | ○ | 出品者ユーザーID（非正規化） |
| authorDisplayName | string | ○ | 出品者表示名（非正規化） |
| title | string | ○ | タイトル |
| slug | string | ○ | URLスラッグ（タイトルから自動生成） |
| synopsis | string | ○ | あらすじ（300〜1,000文字） |
| genres | array | ○ | ジャンル |
| castTotal | map | ○ | `{ min, max }` |
| castBreakdown | map | ○ | `{ male, female, unspecified }` |
| duration | number | ○ | 上演時間（分） |
| performanceType | array | ○ | 上演形態 |
| targetAudience | array | — | 対象層 |
| themeTags | array | — | テーマタグ |
| price | number | ○ | 台本価格（円。0＝無料） |
| isFreeFullText | boolean | ○ | 全文無料公開フラグ |
| thumbnailUrl | string | — | サムネイル画像URL |
| pdfUrl | string | ○ | PDFのStorageパス |
| currentVersion | number | ○ | バージョン番号（初期値1） |
| feeSchedule | array\<map\> | — | 上演料の目安 `[{ condition, amount, note }]` |
| feeScheduleMin | number | — | 上演料の最低金額（検索フィルター用） |
| performanceHistory | array\<map\> | — | 上演履歴 `[{ year, groupName, venue?, note? }]` |
| authorComment | string | — | 作家コメント |
| hearingSheet | array\<map\> | — | 台本個別ヒアリングシート（デフォルトより優先） |
| scriptTags | array | — | 特性タグIDリスト |
| badges | array | — | バッジIDリスト |
| rankings | map | — | `{ [カテゴリ]: { rank, total } }` 日次バッチ更新 |
| status | string | ○ | `published` / `unlisted` |
| stats | map | ○ | `{ viewCount, favoriteCount, purchaseCount, reviewCount, reviewAverage, consultationCount }` |
| createdAt / updatedAt | timestamp | ○ | |

サブコレクション: `versions`（version, pdfUrl, createdAt）、`reviews`（reviewerUid, rating, comment, createdAt, updatedAt）

### chats
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 自動生成ID |
| participants | array | 参加者UID（2名） |
| participantNames | map | `{ [uid]: displayName }` |
| lastMessage / lastMessageAt / lastMessageBy | | チャット一覧表示用 |
| createdAt | timestamp | |

サブコレクション: `messages`（id, senderUid, type[text/hearingSheetResponse/invoice/system], text, hearingSheetData, invoiceId, createdAt）

### consultations
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 自動生成ID |
| scriptId | string | 相談対象の台本ID |
| scriptTitle | string | 台本タイトル（非正規化） |
| requesterUid | string | 相談者のUID |
| authorUid | string | 作家のUID |
| chatId | string | 紐づくチャットルームID |
| hearingSheetData | map | ヒアリングシート回答データ |
| status | map | `{ [uid]: "unresponded"/"in_progress"/"consulting"/"completed" }` |
| createdAt | timestamp | |

### invoices
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 自動生成ID |
| chatId | string | 関連チャットID |
| consultationId | string（任意） | 関連する相談ID |
| creatorUid / payerUid | string | 作成者/支払い者UID |
| amount | number | 金額（円） |
| label | string | 「上演許可料」「その他」等 |
| memo | string | メモ |
| status | string | `pending` / `paid` / `cancelled` |
| stripePaymentIntentId | string | |
| platformFee | number | PF手数料額 |
| createdAt / paidAt | timestamp | |

### purchases
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 自動生成ID |
| buyerUid / scriptId / authorUid | string | |
| amount / platformFee | number | |
| stripePaymentIntentId | string | |
| createdAt | timestamp | |

### reports
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id / reporterUid | string | |
| targetType | string | script/review/message/user |
| targetId / reason / description | string | |
| status | string | pending/resolved/dismissed |
| createdAt / resolvedAt | timestamp | |

### config（ドキュメントID: `platform`）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| feeRate | number | 手数料率（0.165） |
| payoutFee | number | 振込手数料（円。未定） |
| autoPayoutDay | number | 自動振込日（15） |
| minPayoutAmount | number | 最低振込額（1000） |
| badgeDefinitions | array | バッジ定義 `[{ id, label, icon, filterable }]` |
| scriptTagDefinitions | array | 特性タグ定義 `[{ id, label, category }]` |
| topPageSections | array | トップページセクション `[{ type, title, limit }]` |

---

## 6. URL設計

| ページ | URL |
|--------|-----|
| 台本詳細（SEO用） | `/scripts/{slug}-{id}` |
| 台本詳細（短縮・共有用） | `/scripts/{id}` → スラッグ付きURLにリダイレクト |
| ユーザープロフィール | `/users/{userId}` |
| 検索結果 | `/search?q=...&genre=...` |

---

## 7. 検索（Algolia）

### インデックス: `scripts`
- searchableAttributes: title, synopsis, authorDisplayName
- ファセット: genres, performanceType, targetAudience, themeTags, price, feeScheduleMin, castTotal.min/max, castBreakdown.male/female/unspecified, duration, scriptTags, badges
- customRanking: desc(stats.favoriteCount), desc(stats.purchaseCount), desc(createdAt)
- queryLanguages: ja（Kuromoji）

### レプリカ
- scripts_newest（createdAt desc）
- scripts_price_asc / scripts_price_desc
- scripts_rating（reviewAverage desc）

### 同期: Firebase Extension（firestore-algolia-search）で自動同期

---

## 8. 決済（Stripe Connect Express）

### 台本購入フロー
1. `createCheckoutSession`（有料）or `createFreePurchase`（無料）
2. Stripe Checkout → Webhook `checkout.session.completed`
3. purchases作成、stats.purchaseCount更新、出品者にメール通知

### 都度請求フロー
1. 作家が `createInvoice`（チャット内）
2. 利用者が `payInvoice` → Stripe Checkout
3. Webhook → invoices.status更新、作家にメール通知

### 手数料: 一律16.5%（config.feeRateから取得。管理画面で変更可能）

### 出金
- 月末締め翌月15日自動振込（デフォルト）
- 手動振込もいつでも可能
- 振込手数料は出品者負担（自動・手動共通。金額は管理画面で設定）
- 最低振込額: 1,000円

### Webhook処理
| イベント | 処理 |
|---------|------|
| checkout.session.completed | purchases or invoices の作成/更新、stats更新、メール通知 |
| account.updated | users.stripeAccountId保存、stripeOnboarded更新 |

---

## 9. チャット・上演許可

### 「仲介しない」設計
- PFは場と決済手段の提供のみ。申請ボタン・承認フローは作らない
- 契約は当事者間で完結。チャットは自由なやり取りの場

### フロー
1. 「上演許可の相談をする」→ ヒアリングシート回答画面
2. 回答送信 → 相談（consultations）作成 + 作家との既存チャットがあればそこへ、なければ新規チャット開設 + 作家にメール通知
3. テキストでやり取り → 合意したら作家が「請求を作成する」
4. 支払い → 決済完了

### ヒアリングシート
- 作家がデフォルトを設定。台本ごとの個別設定も可能（個別が優先）
- 作家未設定の場合はスキップして直接チャット開設

### 相談ステータス管理（個人の管理ツール）
- 相談ステータスはchatsではなくconsultationsコレクションで独立管理
- 作家側: 未対応 → 対応中（初回返信で自動）→ 完了（手動）
- 利用者側: 相談中 → 完了（手動）
- 各自が独立して操作。チャットは完了後も利用可能

### 上演許可の相談件数
- createConsultation実行時にscripts.stats.consultationCountを自動カウント
- 台本詳細ページに表示（事実の記録。成立の判定ではない）

### チャットの既読管理
チャットの既読管理は実装しない。チャット一覧には最終メッセージと日時のみ表示する。

### チャット通知のオンライン判定
Firestoreの users/{uid} に lastActiveAt フィールドを定期更新（1分間隔）。lastActiveAt が直近2分以内ならオンラインとみなし、メール通知をスキップする。

---

## 10. メール通知

| トリガー | 宛先 | 設定キー |
|---------|------|---------|
| 台本購入 | 出品者 | onPurchased |
| 請求支払い | 出品者 | onInvoicePaid |
| チャット新着 / ヒアリングシート回答 | 受信者 | onNewMessage |
| 台本更新 | 購入者 | onScriptUpdated |
| レビュー投稿 | 出品者 | onNewReview |

- 送信前にnotificationSettingsをチェック。OFFなら送信しない
- チャット通知はスロットリング（最短5分間隔、オンライン時は抑制）
- Resend経由で送信

---

## 11. トップページ・ランキング・レコメンド

### トップページ
- configの `topPageSections` に基づいてセクションを表示
- 初期: 「新着台本」「人気の台本」の2セクション

### ジャンル内ランキング
- 日次バッチでジャンル・対象層ごとの順位を計算
- スコア: お気に入り数 + 購入数×3 + 閲覧数×0.1
- 台本詳細ページに「○○部門 X位 / Y作品中」と表示

### 関連台本レコメンド
- フェーズ1（初期）: コンテンツベース（同ジャンル・近いキャスト数）+ 同じ作家の他作品
- フェーズ2以降: 閲覧/購入の協調フィルタリング、パーソナライゼーション

---

## 12. 汎用バッジ・特性タグ

### バッジ（管理者付与）
- config.badgeDefinitionsで種類を定義
- scripts.badgesにIDリストで保持
- 検索フィルター・カード表示に反映

### 特性タグ（出品者が設定）
- config.scriptTagDefinitionsで選択肢を定義（7カテゴリ26タグ）
- scripts.scriptTagsにIDリストで保持
- 管理画面から種類を追加するだけで出品フォーム・検索に自動反映

初期タグ: 舞台設備5 / 演出・表現5 / 上演の柔軟性3 / 作品の特徴3 / 会場規模2 / 主人公3 / 主要キャスト年齢層5

---

## 13. SEO対応

- 台本詳細ページは `(public)/` に配置（未ログインでもクロール可能）
- メタタグ: title, description, OGP
- JSON-LD: CreativeWorkスキーマ
- sitemap.xml: Next.jsの `app/sitemap.ts` で動的生成
- 台本URLは `{slug}-{id}` でSEOフレンドリー

---

## 14. 管理画面

手数料設定 / 振込手数料設定 / 通報管理 / ユーザー管理 / 台本管理 / バッジ管理 / 特性タグ管理 / トップページ設定 / 売上レポート / 取引一覧

---

## 15. コーディング規約（要点）

- TypeScript strict mode。`any` 禁止
- コンポーネント: PascalCase、ファイル名: kebab-case
- Server Componentsデフォルト。`'use client'` は必要な場合のみ
- Server Actionsの戻り値: `{ success: boolean, error?: string, data?: any }`
- Tailwind CSSのユーティリティクラスのみ。カスタムCSS禁止
- フォント: Noto Sans JP（全体統一）

---

## 16. 選択肢マスター

### genres（25種）
現代劇, 時代劇, 不条理劇, ポストドラマ演劇, 悲劇, 喜劇, コメディ, 人情劇, 恋愛, 翻案戯曲, SF・近未来, ホラー, ミステリー, サスペンス, ファンタジー, 学園モノ, アングラ, 評伝劇, 政治・社会問題, アヴァンギャルド・前衛, お茶の間, ナンセンス, 青春, 群像劇, 実験演劇

### performanceType（5種）
ストレートプレイ, ミュージカル, 朗読劇, 一人芝居, 短編（30分以下）

### targetAudience（5種）
一般, 高校演劇向け, 大学演劇向け, 子供向け, シニア向け

---

## 17. 環境変数

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=
ALGOLIA_ADMIN_API_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 18. StorageパスとURL方針

pdfUrl, thumbnailUrl, iconUrl にはFirebase Storageのパス（例: scripts/{scriptId}/script.pdf）を保存する。ダウンロード/表示時にサーバー側で署名付きURL（有効期限1時間）を生成して返す。
