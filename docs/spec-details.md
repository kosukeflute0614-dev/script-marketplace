# 脚本マーケット 開発仕様書（詳細）

spec.md の補足ドキュメント。Server Actions の全入出力定義、画面ワイヤーフレーム、初期データを収録。

---

## 1. Server Actions 全一覧

### 1-1. auth.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| registerWithEmail | メール＋パスワードで登録 | 不要 | email, password, displayName | uid |
| setUserId | ユーザーID設定（初回のみ。変更不可） | 必須 | userId | success |
| updateProfile | プロフィール更新 | 必須 | displayName?, bio?, iconUrl?, snsLinks? | success |
| deleteAccount | アカウント削除 | 必須 | — | success |

### 1-2. scripts.ts

| アクション | 概要 | 認証 | 権限 | 入力 | 出力 |
|-----------|------|------|------|------|------|
| createScript | 新規出品 | 必須 | Stripe連携済み | 全メタデータ + PDF | scriptId |
| updateScript | メタデータ更新 | 必須 | 出品者本人 | 更新フィールド | success |
| updateScriptPdf | PDF差し替え | 必須 | 出品者本人 | PDF | 新バージョン番号 |
| unlistScript | 非公開化 | 必須 | 出品者本人 | scriptId | success |
| relistScript | 再公開 | 必須 | 出品者本人 | scriptId | success |
| getScript | 台本詳細取得 | 不要 | — | scriptId | 台本データ |
| getScriptsByAuthor | 作家の台本一覧 | 不要 | — | authorUid, pagination | 台本リスト |
| getMyScripts | 自分の出品一覧 | 必須 | 本人 | pagination | 台本リスト + 売上 |

**createScript の処理:**
1. Stripe連携済みチェック
2. バリデーション
3. PDFをStorageにアップロード
4. スラッグ生成（タイトルから。重複時は末尾に連番: `ロミオとジュリエット`, `ロミオとジュリエット-2`）
5. scriptsドキュメント作成（statsは初期値ゼロ）
6. versions/1 サブドキュメント作成
7. Algolia同期はCloud Functionsトリガーで自動

**updateScriptPdf の処理:**
1. 新PDFをStorageアップロード
2. currentVersionインクリメント
3. versions/{version} 作成
4. pdfUrl更新
5. 購入者に「台本が更新されました」通知

### 1-3. search.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| saveSearch | 検索条件保存 | 必須 | name, filters | savedSearchId |
| getSavedSearches | 保存済み一覧 | 必須 | — | リスト |
| deleteSavedSearch | 保存済み削除 | 必須 | savedSearchId | success |

検索実行はAlgolia InstantSearchがクライアント側で直接実行。Server Action不要。

### 1-4. purchase.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| createCheckoutSession | 有料台本の決済セッション作成 | 必須 | scriptId | sessionUrl |
| createFreePurchase | 無料台本の購入記録作成 | 必須 | scriptId | success |
| getMyPurchases | 購入済み一覧 | 必須 | pagination | リスト |
| getDownloadUrl | PDFダウンロードURL取得 | 必須 | scriptId | signedUrl |

**createCheckoutSession:**
1. 台本存在・価格確認
2. 二重購入チェック
3. Stripe Checkout Session作成（application_fee_amount = amount × feeRate）
4. sessionURLを返す

**createFreePurchase:**
1. 無料台本であることを確認
2. 二重購入チェック
3. purchases作成（amount: 0, platformFee: 0）
4. stats.purchaseCountインクリメント

**getDownloadUrl:**
1. purchases で購入記録確認
2. Firebase Storage の署名付きURL生成（有効期限1時間）

### 1-5. chat.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| startChat | チャット開設（相手1人につき1ルーム） | 必須 | targetUid | chatId |
| sendMessage | テキスト送信 | 必須 | chatId, text | messageId |
| getMyChats | チャット一覧 | 必須 | — | リスト |

**startChat:**
1. 同じ相手とのチャットルームが既にあるか確認
   - あり: 既存のchatIdを返す
   - なし: 新規作成
2. chatIdを返す

**sendMessage 補足:**
作家が初めてtextメッセージを送信した時、該当チャットに紐づくconsultationで作家側statusを自動で `in_progress` に遷移。

リアルタイムメッセージ受信はFirestoreの `onSnapshot` でクライアント側実装（`use-chat.ts`）。

### 1-5b. consultation.ts（新規）

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| createConsultation | 上演許可の相談を送信（ヒアリングシート回答と同時） | 必須 | chatId, scriptId, hearingSheetResponses | consultationId |
| getMyConsultations | 相談管理一覧 | 必須 | status? | リスト |
| completeConsultation | 相談を完了 | 必須 | consultationId | success |

**createConsultation:**
1. ヒアリングシート取得（台本個別 > 作家デフォルト）
2. 作家とのチャットルームがあるか確認 → なければ新規作成
3. consultationsドキュメント作成（status: 作家=unresponded、利用者=consulting）
4. チャットに type: system メッセージ投稿（「{ユーザー名}さんが『{台本名}』の上演許可について相談を送りました」）
5. チャットに type: hearingSheetResponse メッセージ投稿（回答データ）
6. scripts.stats.consultationCountインクリメント
7. 作家にメール通知

**completeConsultation:**
1. 相談の参加者確認（requesterUid または authorUid）
2. 自分のstatusを `completed` に更新（相手は変わらない）
3. チャットに type: system メッセージ投稿（「{ユーザー名}さんがやり取りを完了しました」）

### 1-6. invoice.ts

| アクション | 概要 | 認証 | 権限 | 入力 | 出力 |
|-----------|------|------|------|------|------|
| createInvoice | 請求作成 | 必須 | チャット参加者（出品者側） | chatId, amount, label, consultationId?, memo? | invoiceId |
| payInvoice | 請求支払い | 必須 | チャット参加者（支払い側） | invoiceId | sessionUrl |
| cancelInvoice | 請求キャンセル | 必須 | 請求作成者 | invoiceId | success |
| getInvoicesByChat | チャット内請求一覧 | 必須 | チャット参加者 | chatId | リスト |

**createInvoice:**
1. チャット参加者確認
2. invoicesドキュメント作成（status: pending。consultationId が指定された場合は保存）
3. チャットに type: invoice メッセージ投稿
4. 相手にメール通知

**payInvoice:**
1. invoice存在・status確認（pendingのみ）
2. Stripe Checkout Session作成
3. sessionURL返す

### 1-7. hearing-sheet.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| updateDefaultHearingSheet | デフォルト更新 | 必須 | questions[] | success |
| updateScriptHearingSheet | 台本個別更新 | 必須 | scriptId, questions[] | success |
| clearScriptHearingSheet | 個別設定クリア | 必須 | scriptId | success |
| getHearingSheet | 取得（個別 > デフォルト） | 必須 | scriptId?, authorUid | 質問リスト |

### 1-8. review.ts

| アクション | 概要 | 認証 | 権限 | 入力 | 出力 |
|-----------|------|------|------|------|------|
| createReview | 投稿 | 必須 | 購入者 | scriptId, rating, comment? | reviewId |
| updateReview | 編集 | 必須 | 投稿者 | scriptId, rating?, comment? | success |
| deleteReview | 削除 | 必須 | 投稿者 | scriptId | success |
| getReviews | 一覧取得 | 不要 | — | scriptId, pagination | リスト |

createReview 時に stats.reviewCount / reviewAverage を再計算。

### 1-9. favorite.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| addFavorite | 追加 | 必須 | scriptId | success |
| removeFavorite | 削除 | 必須 | scriptId | success |
| getMyFavorites | 一覧 | 必須 | pagination | リスト |

追加・削除時に stats.favoriteCount を更新。

### 1-10. notification.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| updateNotificationSettings | 設定更新 | 必須 | settings | success |
| getNotificationSettings | 設定取得 | 必須 | — | settings |

### 1-11. stripe.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| createConnectAccount | Stripe連携開始 | 必須 | — | onboardingUrl |
| getConnectDashboardUrl | Expressダッシュボードリンク | 必須 | — | dashboardUrl |
| getPayoutSummary | 売上サマリー | 必須 | period? | 売上データ |

### 1-12. report.ts

| アクション | 概要 | 認証 | 入力 | 出力 |
|-----------|------|------|------|------|
| createReport | 通報送信 | 必須 | targetType, targetId, reason, description? | reportId |

### 1-13. admin.ts

| アクション | 概要 | 認証 | 権限 | 入力 | 出力 |
|-----------|------|------|------|------|------|
| updateFeeRate | 手数料率変更 | 必須 | 管理者 | feeRate | success |
| getReports | 通報一覧 | 必須 | 管理者 | status?, pagination | リスト |
| resolveReport | 通報対応済み | 必須 | 管理者 | reportId, action | success |
| suspendUser | アカウント停止 | 必須 | 管理者 | uid | success |
| unsuspendUser | 停止解除 | 必須 | 管理者 | uid | success |
| getSalesReport | 売上レポート | 必須 | 管理者 | period | GMV, 手数料, 件数 |
| forceUnlistScript | 強制非公開 | 必須 | 管理者 | scriptId | success |

### 1-14. Webhook（app/api/webhooks/stripe/route.ts）

| イベント | 処理 |
|---------|------|
| checkout.session.completed | 台本購入: purchases作成、stats更新、通知。請求支払い: invoices.status→paid、通知 |
| account.updated | users.stripeAccountId保存、stripeOnboarded更新 |

Webhook処理: 署名検証必須。冪等性確保（Event IDチェック）。

---

## 2. 画面ワイヤーフレーム

### 2-1. トップページ

```
┌──────────────────────────┐
│ [ヘッダー]                 │
├──────────────────────────┤
│  ヒーローセクション          │
│  「条件で探せる。すぐ読める。」│
│  [台本を探す →]            │
├──────────────────────────┤
│ 新着台本                   │
│ [カード][カード][カード][→]  │
├──────────────────────────┤
│ 人気の台本                  │
│ [カード][カード][カード][→]  │
├──────────────────────────┤
│ 脚本マーケットとは           │
│ ・条件検索で台本が見つかる   │
│ ・冒頭5ページをプレビュー   │
│ ・上演許可もこの場で        │
├──────────────────────────┤
│ [出品してみませんか？]       │
│ 劇作家向けCTAセクション      │
├──────────────────────────┤
│ [フッター]                 │
└──────────────────────────┘
```

### 2-2. 検索結果一覧

**スマホ版:**
```
┌──────────────────────────┐
│ [🔍 フリーワード検索      ] │
│ [ジャンル] [人数] [時間] → │  ← 横スクロール ピルタグ
│ [絞り込み]    [並び替え ▼] │
│ ○件の台本が見つかりました    │
│ ┌─────┐ ┌─────┐          │  ← 2列グリッド
│ │ 台本 │ │ 台本 │          │
│ └─────┘ └─────┘          │
└──────────────────────────┘
```

**PC版:**
```
┌──────────┬─────────────────┐
│ サイドバー │ 検索結果（3〜4列）  │
│ フィルター │ [カード][カード]... │
└──────────┴─────────────────┘
```

**絞り込みモーダル（スマホ版）:**
```
┌──────────────────────────┐
│ ✕ 絞り込み条件    [リセット] │
│ ジャンル: [タグ選択]        │
│ キャスト総人数: [  ]〜[  ]人 │
│ キャスト構成: 男[  ]女[  ]  │
│ 上演時間: [ドロップダウン]   │
│ 台本価格: [  ]〜[  ]円     │
│ 上演料の目安: 〜[  ]円     │
│ 上演形態: [チェックボックス] │
│ 対象層: [チェックボックス]   │
│ 特性タグ: [カテゴリ別表示]   │
│ [ ○件の台本を表示する ]     │
└──────────────────────────┘
```

**検索結果カード:**
```
┌──────────────────────┐
│ [サムネイル画像]        │
│ タイトル               │
│ 著者名                │
│ コメディ               │
│ 5人（男2/女2/不問1）    │
│ 90分                  │
│ ¥1,500               │
│ 上演料 5,000円〜       │
│ あらすじの冒頭2〜3行... │
│ ★4.2(12)    ♡ 45    │
└──────────────────────┘
```

### 2-3. 台本詳細ページ

```
┌──────────────────────────┐
│ [サムネイル画像]            │
│ タイトル                   │
│ 作家名（リンク）            │
│ ジャンル / キャスト / 時間   │
│ [バッジ] [特性タグ]         │
│ 価格: ¥1,500              │
│ [プレビューを見る] [購入する] │
│ 上演許可の相談: 5件          │
│ [上演許可の相談をする]       │
├──────────────────────────┤
│ あらすじ（全文）            │
├──────────────────────────┤
│ 上演料の目安（テーブル）     │
├──────────────────────────┤
│ 上演履歴（リスト）          │
├──────────────────────────┤
│ 作家コメント               │
├──────────────────────────┤
│ ランキング（コメディ3位等）  │
├──────────────────────────┤
│ レビュー ★4.2（12件）      │
│ [レビューカード]            │
├──────────────────────────┤
│ 似た条件の台本 [カード]...  │
├──────────────────────────┤
│ この作家の他の作品 [カード]  │
└──────────────────────────┘
```

### 2-4. プレビュー画面

```
┌──────────────────────────┐
│ ← 戻る   {タイトル}   1/5  │
│ [PDFページ表示 (pdf.js)]   │
│ [← 前] [次 →] [🔍±]       │
│ [購入する ¥1,500]          │
└──────────────────────────┘
```

5ページ目の後:「続きは購入してお読みください」

### 2-5. チャット一覧

```
┌──────────────────────────┐
│ メッセージ                  │
│ ┌────┐ 田中さん            │
│ │icon│ 上演料の件、承知...   │
│ └────┘ 3分前               │
│ ┌────┐ 佐藤さん            │
│ │icon│ ヒアリングシート回答... │
│ └────┘ 昨日                │
└──────────────────────────┘
```

### 2-6. チャットルーム

```
┌──────────────────────────┐
│ ← {相手の名前}             │
├──────────────────────────┤
│ [ヒアリングシート回答カード]  │
│                           │
│      [相手のメッセージ]     │
│ [自分のメッセージ]          │
│                           │
│ [請求カード ¥10,000]       │
│ [支払う]                   │
│                           │
│ ── 請求が支払われました ──  │
├──────────────────────────┤
│ [メッセージ入力] [送信]     │
│ [やり取りを完了する]        │
│ [請求を作成する] ← 出品者のみ│
└──────────────────────────┘
```

### 2-7. マイページ

```
┌──────────────────────────┐
│ [アイコン] 表示名           │
│ [プロフィールを編集]        │
├──────────────────────────┤
│ [購入済み][出品管理][お気に入り][相談管理] │
├──────────────────────────┤
│ （タブの内容）              │
├──────────────────────────┤
│ その他: 閲覧履歴 / 検索条件  │
│ 通知設定 / ヒアリングシート   │
│ Stripe連携 / アカウント設定  │
└──────────────────────────┘
```

### 2-8. 出品画面

```
┌──────────────────────────┐
│ 台本を出品する              │
│ [台本PDF選択]              │
│ タイトル *: [          ]   │
│ あらすじ *: [          ]   │
│ ジャンル *: [タグ選択]      │
│ キャスト *: 最小[  ]〜最大[  ]│
│ 構成 *: 男[  ]女[  ]不問[  ]│
│ 上演時間 *: [    ]分       │
│ 上演形態 *: [チェックボックス]│
│ 対象層: [チェックボックス]   │
│ テーマタグ: [タグ選択]      │
│ 特性タグ:                  │
│  舞台設備: □大道具なし...   │
│  演出: □ダンスあり...       │
│  柔軟性: □改変OK...        │
│ 価格 *: [    ]円           │
│ □全文を無料公開する         │
│ サムネイル: [画像選択]      │
│ 上演料の目安:               │
│ [条件][金額][補足] [+追加]  │
│ 上演履歴:                  │
│ [年][団体][会場][備考] [+]  │
│ 作家コメント: [          ]  │
│ [プレビュー確認]            │
│ [出品する]                 │
└──────────────────────────┘
```

### 2-9. 相談管理（作家側）

```
┌──────────────────────────┐
│ 未対応（2件）               │
│ 田中さん → ロミオとジュリエット│
│ [チャット] 2時間前          │
│ 山本先生 → 夏の約束         │
│ [チャット] 昨日             │
├──────────────────────────┤
│ 対応中（1件）               │
│ 小林さん → ロミオとジュリエット│
│ [チャット] [完了する]       │
├──────────────────────────┤
│ 完了（3件）                │
└──────────────────────────┘
```

### 2-10. 管理画面

```
┌──────────────────────────┐
│ 管理画面                   │
│ サイドメニュー:             │
│ ├ 売上レポート             │
│ ├ 取引一覧                │
│ ├ 手数料設定              │
│ ├ 振込手数料設定           │
│ ├ 通報管理                │
│ ├ ユーザー管理             │
│ ├ 台本管理                │
│ ├ バッジ管理              │
│ ├ 特性タグ管理             │
│ └ トップページ設定          │
│ （メニュー内容表示エリア）   │
└──────────────────────────┘
```

### 2-11. 請求作成画面

```
┌──────────────────────────┐
│ 請求を作成する              │
│                           │
│ 金額（円）: [        ]     │
│ ラベル: [上演許可料 ▼]     │
│ 関連する相談:              │
│ [ロミオとジュリエット（田中さん） ▼] ← 任意 │
│ メモ（任意）: [        ]   │
│                           │
│ 手数料（16.5%）: ¥X,XXX   │
│ お受取額: ¥X,XXX          │
│                           │
│ [請求を送信する]           │
└──────────────────────────┘
```

---

## 3. 初期データ

### 3-0. 選択肢マスター

#### genres（25種）
現代劇, 時代劇, 不条理劇, ポストドラマ演劇, 悲劇, 喜劇, コメディ, 人情劇, 恋愛, 翻案戯曲, SF・近未来, ホラー, ミステリー, サスペンス, ファンタジー, 学園モノ, アングラ, 評伝劇, 政治・社会問題, アヴァンギャルド・前衛, お茶の間, ナンセンス, 青春, 群像劇, 実験演劇

#### performanceType（5種）
ストレートプレイ, ミュージカル, 朗読劇, 一人芝居, 短編（30分以下）

#### targetAudience（5種）
一般, 高校演劇向け, 大学演劇向け, 子供向け, シニア向け

### 3-1. 特性タグ（7カテゴリ26種）

config/platform の scriptTagDefinitions に設定する初期値。

**舞台設備（5種）**
| id | label |
|----|-------|
| no-props | 大道具なし |
| basic-lighting | 照明シンプル |
| no-sound | 音響なし |
| simple-costume | 衣装シンプル |
| single-scene | 一場転換なし |

**演出・表現（5種）**
| id | label |
|----|-------|
| dance | ダンスあり |
| swordplay | 殺陣あり |
| video-production | 映像演出あり |
| audience-participation | 観客参加型 |
| dialect | 方言活用 |

**上演の柔軟性（3種）**
| id | label |
|----|-------|
| adaptation-ok | 改変・抜粋OK |
| cast-adjustable | 人数調整可 |
| gender-swap-ok | 男女入替可 |

**作品の特徴（3種）**
| id | label |
|----|-------|
| reading-ok | 朗読劇対応 |
| monologue | モノローグ |
| tearjerker | 泣ける |

**会場規模（2種）**
| id | label |
|----|-------|
| small-theater | 小劇場向き |
| large-theater | 大劇場向き |

**主人公（3種）**
| id | label |
|----|-------|
| protagonist-male | 主人公男性 |
| protagonist-female | 主人公女性 |
| protagonist-any | 主人公性別不問 |

**主要キャスト年齢層（5種）**
| id | label |
|----|-------|
| age-junior-high | 中学生 |
| age-high-school | 高校生 |
| age-young-adult | 大学生・若者 |
| age-adult | 大人 |
| age-senior | シニア |

### 3-2. ヒアリングシートのデフォルトテンプレート

初めてヒアリングシートを設定する作家に表示する参考例。

| order | question |
|-------|----------|
| 1 | 団体名を教えてください |
| 2 | 公演形態を教えてください（本公演 / ワークショップ / 大会 / 授業） |
| 3 | 出演人数を教えてください |
| 4 | 公演日程を教えてください |
| 5 | 公演回数を教えてください |
| 6 | 会場名・客席数を教えてください |
| 7 | チケット料金を教えてください（有料の場合） |
| 8 | 台本の改変はありますか？ |
| 9 | 映像配信・録画の予定はありますか？ |

### 3-3. トップページ初期セクション

config/platform の topPageSections の初期値。

```json
[
  { "type": "newest", "title": "新着台本", "limit": 8 },
  { "type": "popular", "title": "人気の台本", "limit": 8 }
]
```

### 3-4. 通知設定のデフォルト値

ユーザー作成時の notificationSettings 初期値。

```json
{
  "onPurchased": true,
  "onInvoicePaid": true,
  "onNewMessage": true,
  "onScriptUpdated": true,
  "onNewReview": true
}
```

---

## 4. バリデーションルール

| フィールド | ルール |
|-----------|--------|
| title | 必須。1〜100文字 |
| synopsis | 必須。300〜1,000文字 |
| price | 0以上。上限なし（0 = 無料） |
| castTotal.min | 1以上。max以下 |
| castTotal.max | min以上 |
| castBreakdown | male + female + unspecified = castTotal.max |
| duration | 1〜600（分） |
| genres | 1つ以上選択必須 |
| performanceType | 1つ以上選択必須 |
| invoice.amount | 1円以上 |
| userId | 3〜30文字。正規表現: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ |

---

## 5. Firestoreセキュリティルール

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // users: 本人のみ書き込み。プロフィール公開フィールドは全員読み取り可
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
      
      match /favorites/{docId} { allow read, write: if request.auth != null && request.auth.uid == uid; }
      match /history/{docId} { allow read, write: if request.auth != null && request.auth.uid == uid; }
      match /savedSearches/{docId} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    }
    
    // scripts: publishedは全員読み取り。作家本人のみ書き込み
    match /scripts/{scriptId} {
      allow read: if resource.data.status == 'published' || (request.auth != null && request.auth.uid == resource.data.authorUid);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorUid;
      
      match /versions/{versionId} { allow read: if true; allow write: if request.auth != null && request.auth.uid == get(/databases/$(database)/documents/scripts/$(scriptId)).data.authorUid; }
      match /reviews/{reviewerUid} { allow read: if true; allow write: if request.auth != null && request.auth.uid == reviewerUid; }
    }
    
    // chats: 参加者のみ
    match /chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid in resource.data.participants;
      match /messages/{messageId} { allow read, write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants; }
    }
    
    // consultations: 相談者または作家のみ
    match /consultations/{consultationId} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.requesterUid || request.auth.uid == resource.data.authorUid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && (request.auth.uid == resource.data.requesterUid || request.auth.uid == resource.data.authorUid);
    }
    
    // invoices: 作成者または支払い者のみ
    match /invoices/{invoiceId} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.creatorUid || request.auth.uid == resource.data.payerUid);
      allow create: if request.auth != null;
      // ステータス更新はServer Actions/Webhook経由のみ（Admin SDK使用）
    }
    
    // purchases: 購入者のみ読み取り。作成はServer Actions経由のみ
    match /purchases/{purchaseId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.buyerUid;
    }
    
    // reports: ログインユーザーなら作成可能。読み取りは管理者のみ（Admin SDK）
    match /reports/{reportId} {
      allow create: if request.auth != null;
    }
    
    // config: 読み取りのみ（更新は管理者がAdmin SDK経由）
    match /config/{docId} {
      allow read: if true;
    }
  }
}
```
