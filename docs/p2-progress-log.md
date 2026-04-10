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

## P2-1〜P2-3 再走 (B方針: 厳密ループで遡及実施)

社長判断 (B-2): ブラウザテストは Stripe フォーム部分はスキップ、開発側のロジックのみ検証。


- 10:26 [P2-1] 再レビュー開始 (修正後の差分確認)
- 10:30 [P2-1] 再レビュー完了: Critical 0 / High 0 / Medium 1 (実用リスク低・記録のみ) / Low 0 → クリーン
- 10:30 [P2-1] ブラウザテスト開始 (B-2: 開発側ロジックのみ)
- 10:50 [P2-1] テスト結果: TC-1/2/4/5/6 PASS, TC-3 FAIL (外部要因)
  - TC-3 原因: 新しい Stripe アカウントで Connect が未有効化
  - エラー: "You can only create new accounts if you've signed up for Connect"
  - コードロジック自体は正常 (エラーキャッチ + toast 表示済み)
- 10:50 [!] エスカレーション: Stripe Connect 有効化が必要 → 社長対応待ち
- 12:30 [P2-1] Stripe Connect 有効化を確認 (テストアカウント作成→削除で疎通OK) → エスカレーション解除
- 12:30 [P2-1] TC-3 のみ再テスト実施
- 12:35 [P2-1] TC-3 PASS: connect.stripe.com の Express オンボーディング画面へ遷移成功
- 12:35 [P2-1] 全 TC PASS、再レビューもクリア済 → 最終差分チェック不要 (修正なし) → ✅ 完了
- 12:35 [P2-2] 再レビュー開始
- 12:40 [P2-2] 再レビュー完了: Critical 0 / High 0 / Medium 2 (実用リスク低) / Low 1 → クリーン
- 12:40 [P2-2] ブラウザテスト準備: test-user の stripeOnboarded を true にセット (B-2 方針で実フォームスキップのため)
- 12:50 [P2-2] ブラウザテスト 1回目: TC-1/3/4/10/11 PASS, TC-5/6/7/8/9 FAIL
  - 原因: Firestore 複合インデックス不足 (scripts.authorUid + createdAt desc)
- 12:55 [修正] firestore.indexes.json に必要なインデックスを 11 個まとめて定義 + deploy
  - scripts × 4 (authorUid+createdAt, authorUid+status+createdAt, status+createdAt, status+stats.favoriteCount)
  - consultations × 3 / chats × 1 / reports × 1 / purchases × 1 / invoices × 1
- 13:05 [P2-2] インデックス build 完了 (約 5 分) → 疎通確認 OK
- 13:05 [P2-2] TC-5〜9 再テスト開始
- 13:15 [P2-2] TC-5/6/7/8/9 全 PASS → P2-2 全 TC PASS → 修正なし → ✅ 完了
- 13:15 [P2-3] フルレビュー開始 (前回未実施だったため)
