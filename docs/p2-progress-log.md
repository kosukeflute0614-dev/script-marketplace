# Pass 2 リアルタイム進捗ログ

社長がリアルタイムで開発の流れを追えるよう、各イベント発生時に追記していく簡易ログ。

凡例:
- `[実装]` 実装が一段落
- `[レビューN]` @reviewer のフルレビュー結果（N回目）
- `[修正]` レビュー指摘の修正完了
- `[テスト]` @browser-tester の機能テスト結果
- `[差分]` @reviewer の最終差分チェック
- `[commit]` git commit
- `[!]` エスカレーションや要相談

---

## P2-1 Stripe Connect オンボーディング

- [実装] stripe.ts / actions/stripe.ts / api/webhooks/stripe / stripe-setup ページ
- [レビュー1] Critical 1 / High 2 / Medium 3 / Low 2
  - C: webhook handler が users なし時に詰まる → set merge:true へ
  - H1: 孤立 Stripe アカウント防止 → accounts.list でリカバリ
  - H2: sync 失敗の無視 → ?sync=ok|error クエリで UI 通知
- [修正] 上記 + payouts_enabled も判定に追加
- [commit] 5cf3e78

## P2-2 台本出品 (createScript / 編集 / バージョン管理)

- [実装] scripts-edit.ts / script-form.tsx / 出品管理 UI / PDF 差し替え
- [commit] c0c8145
- [レビュー1] Critical 1 / High 2 / Medium 3 / Low 3
  - C: PDF MIME バイパス（type 空文字）→ マジックバイト検証追加
  - H1: スラッグ競合 → slugs 補助コレクションで原子的予約に変更
  - H2: getMyScripts 売上集計の amount=0 ambiguity → typeof === "number" 明示
  - M: updateScript の castTotal/castBreakdown 整合性、カスタム slug バリデーション
- [修正] 上記すべて
- [commit] fa88c0d

## P2-3 Algolia インデックス + 自動同期

- [実装] algolia.ts / algolia-mapping.ts / algolia-sync.ts / scripts/algolia-init.ts
- [動作確認] npx tsx scripts/algolia-init.ts → 16 scripts indexed
- [配線] createScript / updateScript / unlistScript / relistScript から Algolia 同期
- [commit] 4fac851
- (注: P2-3 単独レビューは未実施。P2-4 完了後の検索画面と一緒に検証する流れ)

---

## P2-4 検索画面 (InstantSearch + 全フィルター)

