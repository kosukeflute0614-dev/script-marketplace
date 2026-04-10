# バグ記録 (Bug Log)

発見されたバグ・修正内容・なぜテストで防げなかったかを記録する。

---

## BUG-001: `.next` キャッシュ汚染でトップページが開けない

- **発見日**: 2026-04-10
- **発見者**: 社長（実機確認）
- **ページ**: `/` （全ページ）
- **エラー**: `Cannot find module './5611.js'` (webpack runtime error)
- **原因**: セッション中に `npm run build`（本番ビルド）を何度も実行した結果、`.next/` ディレクトリに本番用チャンクと開発サーバ用チャンクが混在。開発サーバが存在しないチャンク ID を参照して起動不能に
- **修正**: `rm -rf .next` で `.next` を削除し、dev サーバを冷起動
- **なぜテストで防げなかったか**:
  - Vitest は Node.js 直接実行で Next.js の webpack を通らない → `.next` の状態とは無関係
  - `npm run build` の成否チェックは「本番ビルドが成功するか」であり「dev サーバが正常起動するか」ではない
  - ブラウザテストは各 Step の実装直後に走るが、**全 Step 完了後の最終 E2E 冷起動テストが無かった**
- **再発防止**: `npm run build` 実行後は必ず `.next` を削除してから dev サーバを再起動する手順を追加

---

## BUG-002: Firestore 複合インデックス不足で出品管理ページが 500

- **発見日**: 2026-04-10
- **発見者**: @browser-tester（P2-2 ブラウザテスト TC-5）
- **ページ**: `/author/scripts`
- **エラー**: `9 FAILED_PRECONDITION: The query requires an index`
- **原因**: `getMyScripts()` が `scripts.where("authorUid", "==", ...).orderBy("createdAt", "desc")` という複合クエリを使うが、Firestore 複合インデックスが未作成
- **修正**: `firestore.indexes.json` に必要なインデックス 11 個をまとめて定義し `firebase deploy --only firestore:indexes`
- **なぜテストで防げなかったか**:
  - Vitest はモックなしの純粋関数テストのみ → Firestore クエリは対象外
  - `npm run build` は TypeScript コンパイルまでで、実際の Firestore クエリは実行しない
  - @reviewer はコードレビューのみで Firestore のインデックス要件までは見ない
  - 初めて実際のデータで Firestore にクエリを飛ばしたのが @browser-tester のテスト時
- **再発防止**: `where` + `orderBy` が異なるフィールドの複合クエリを書いたら、その場で `firestore.indexes.json` に追加する

---

## BUG-003: Algolia の `filterOnly` ファセットでフィルターボタンの selected 状態が反映されない

- **発見日**: 2026-04-10
- **発見者**: @browser-tester（P2-4 ブラウザテスト TC-3r）
- **ページ**: `/search`
- **症状**: ジャンル「コメディ」をクリックすると件数は絞り込まれるが、ボタンが dark 状態にならない
- **原因**: Algolia インデックス設定で `genres` を `filterOnly(genres)` にしていたため、ファセットカウント（件数）が返らず `useRefinementList` の `items` が空配列。`items` が空 → `refinedSet` も空 → ボタンの selected スタイルが付かない
- **修正**: `algolia-init.ts` で `genres` / `performanceType` / `targetAudience` / `scriptTags` を `filterOnly` から通常ファセットに変更し再実行
- **なぜテストで防げなかったか**:
  - Algolia のファセット設定は外部サービスの設定であり、コードレビューの対象外
  - Vitest は Algolia API をモックしていない
  - `algolia-init.ts` の設定値を検証するテストが無かった
- **再発防止**: UI で `useRefinementList` を使うファセットは `filterOnly` ではなく通常ファセットにする（コメントで区別を明記済み）

---

## BUG-004: Algolia レプリカに `attributesForFaceting` が継承されず、並び替えで 0 件になる

- **発見日**: 2026-04-10
- **発見者**: @browser-tester（P2-4 ブラウザテスト TC-4r）
- **ページ**: `/search`（並び替え「新着」選択時）
- **症状**: 並び替えを「新着」に変えると件数が 18 → 0 になる
- **原因**: Algolia の Standard Replica は `attributesForFaceting` を親インデックスから **自動継承しない**。レプリカに `status` ファセットが無いため、`Configure filters="status:published"` が「該当なし」として 0 件を返した
- **修正**: `algolia-init.ts` のレプリカ設定に親と同じ `attributesForFaceting` を明示的に追加し再実行
- **なぜテストで防げなかったか**:
  - Algolia API を直接叩いた確認（`npx tsx -e "..."` で `scripts_newest` に 18 件返る）は filter なしで実行していた
  - `Configure filters="status:published"` が付与される実際のフロントエンド経由でしか再現しない
  - Algolia SDK のレプリカ継承動作に対する理解不足
- **再発防止**: レプリカのインデックス設定テストは「メインインデックスと同じ filter を付けて検索」で検証する

---

## BUG-005: `next/image` の `fill` で画像がページ全体を覆い操作不能になる

- **発見日**: 2026-04-10
- **発見者**: @browser-tester（P2-4 ブラウザテスト TC-3r, TC-5r）
- **ページ**: `/search`、`/` (トップページ)
- **症状**: 検索ボックスに入力できない、フィルターボタンが押せない、モバイルメニューが開かない
- **原因**: `<Image fill>` を使った台本カードの画像コンテナに `overflow-hidden` が無く、`position: absolute` の画像が親の `overflow: visible` を超えてページ全体を覆った
- **修正**: `search-hits.tsx` と `script-card.tsx` の画像コンテナに `overflow-hidden` を追加
- **なぜテストで防げなかったか**:
  - @reviewer のコードレビューは CSS の視覚的な overflow 問題を検出しにくい
  - Pass 1 のブラウザテスト時はサムネイル付きの台本が少なかったため再現しなかった
  - Vitest は DOM レンダリングをしないため CSS レイアウト問題は対象外
- **再発防止**: `<Image fill>` を使う場合は親コンテナに必ず `overflow-hidden` を付ける（チェックリスト化）

---

## BUG-006: `useRange` のデフォルト値がフィルタとして常時適用され全件表示できない

- **発見日**: 2026-04-10
- **発見者**: @browser-tester（P2-4 ブラウザテスト TC-1r）
- **ページ**: `/search`
- **症状**: 検索ページを開くと 18 件あるはずが 4 件しか表示されない
- **原因**: `useRange({ attribute: "castMax", min: 1, max: 20 })` と `useRange({ attribute: "feeScheduleMin", min: 0, max: 50000 })` がデフォルトで `numericRefinements` をセットし、`feeScheduleMin` が null の台本を除外
- **修正**: `useRange` (NumericRange) を `useNumericMenu` (NumericFacetGroup) に置き換え。プリセット範囲のボタン選択方式に変更
- **なぜテストで防げなかったか**:
  - react-instantsearch の `useRange` のデフォルト挙動（min/max 指定するとそれ自体がフィルタになる）を把握していなかった
  - Algolia API を直接叩いたテスト（`npx tsx -e "..."` 18 件返る）は `useRange` が付与する numericRefinements を含んでいなかった
  - ブラウザテスト TC-1 で初めて実際の件数表示を確認して発覚
- **再発防止**: Algolia の `useRange` は「ユーザーが明示的に操作するまでフィルタを適用しない」前提で使えないため、プリセット範囲式 (`useNumericMenu`) を優先する

---

## BUG-007: 検索ボックスで日本語 IME 入力が壊れる（「春」→「HあRう」になる）

- **発見日**: 2026-04-10
- **発見者**: 社長（実機確認）
- **ページ**: `/search`
- **症状**: 検索ボックスに日本語を入力しようとすると、IME 変換中にキーストロークが分断される。「春」と打ちたいのに「HあRう」になる
- **原因**: `useSearchBox` の `refine()` が `onChange` のたびに即座に呼ばれ、IME の composing 状態を無視して Algolia に中間値を送信。Algolia がクエリ結果を返すたびに React が input の `value` を上書きし、IME の変換候補がリセットされる
- **修正**: `onCompositionStart` / `onCompositionEnd` イベントで IME 変換中フラグ (`isComposing`) を管理。変換中は `refine` を呼ばず `localValue` state だけ更新、変換確定時に一括で `refine` を実行する方式に変更
- **なぜテストで防げなかったか**:
  - @browser-tester (Playwright) は `page.fill()` や `page.type()` で入力するが、これらは IME を経由しない直接入力 → IME 変換の問題は再現しない
  - Vitest は DOM を持たないため入力イベントをテストできない
  - React + IME の競合は **実際に日本語キーボードで入力しないと発覚しない** 典型的なバグで、自動テストでの検出が構造的に困難
  - 日本語対応のサービスを開発する場合、`<input>` / `<textarea>` に `value` + `onChange` を使う箇所はすべて IME 対応が必要と認識すべきだった
- **再発防止**: テキスト入力コンポーネントでは `onCompositionStart` / `onCompositionEnd` を標準装備する。Algolia の `useSearchBox` を直接 `<input onChange>` に接続する場合は必ず IME ガードを入れる

---

## BUG-008: PDFプレビューページで `Object.defineProperty called on non-object`

- **発見日**: 2026-04-10
- **発見者**: 社長（実機確認）
- **ページ**: `/preview/[scriptId]`
- **症状**: プレビューページを開くと `Object.defineProperty called on non-object` の RuntimeTypeError
- **原因**: `react-pdf` が内部で使う `pdfjs-dist` はブラウザ専用 API（`globalThis.window` 等）に依存する。Next.js の Server Component からそのまま import すると、SSR 時（Node.js）で `pdfjs-dist` のモジュール初期化コードが走り、ブラウザ上にしか存在しないオブジェクトに `defineProperty` しようとして爆発する
- **修正**:
  - `PdfPreviewLoader` という Client Component ラッパーを新規作成 (`"use client"`)
  - その中で `next/dynamic` + `ssr: false` を使って `PdfPreview` を遅延読み込み
  - Server Component (page.tsx) は `PdfPreviewLoader` だけを import する
  - ※ Next.js 15 では Server Component 内で直接 `dynamic({ ssr: false })` が使えないため、Client Component でラップする必要がある
- **なぜテストで防げなかったか**:
  - `npm run build` は webpack バンドルとページプリレンダリングを行うが、`/preview/[scriptId]` は動的ページ（`params` 依存）のためビルド時にプリレンダリングされず、SSR エラーが顕在化しなかった
  - Vitest は Next.js webpack を経由しないため pdfjs-dist の互換性問題は対象外
  - @browser-tester は P1-6 時に placeholder PDF で動作確認済みだったが、その時はたまたまクライアント JS のみで動作していた可能性（SSR パスとの競合タイミング依存）
  - `react-pdf` + Next.js App Router の `ssr: false` 必須パターンは公式ドキュメントに明記されているが見落とした
- **再発防止**: ブラウザ専用ライブラリ（pdfjs-dist, canvas 系, WebGL 系）を使う場合は必ず `dynamic({ ssr: false })` で Client Component から読み込む
- **追加修正 (2回目)**: `ssr: false` + webpack alias (`canvas: false`) でも解消せず。根本原因は `pdfjs-dist` **v5** と Next.js 15 webpack のモジュール初期化の非互換。`react-pdf` を v10 → **v9** にダウングレードし `pdfjs-dist` を v5 → **v4** に戻すことで解消。Worker URL も `.mjs` → `.js` に変更

---

## BUG-009: 出品管理・各機能へのナビゲーションリンクが存在しない

- **発見日**: 2026-04-10
- **発見者**: 社長（実機確認）
- **ページ**: ヘッダー / マイページ / モバイルメニュー 全般
- **症状**: 出品管理 (`/author/scripts`) や新規出品 (`/author/scripts/new`) へのリンクが UI 上に存在せず、URL を直接入力しないと到達できない。購入済み台本・お気に入り・相談管理・メッセージ・通知設定・管理画面も同様にマイページからのリンクがない
- **原因**: 各 Step でページ本体は実装したが、既存のナビゲーション（ヘッダー・マイページ・モバイルメニュー）にリンクを追加するのを忘れていた。各 Step が独立して実装されるため「ページを作ったらナビにもリンクを足す」というチェックが漏れた
- **修正**:
  - PC ヘッダー: Stripe 連携済みユーザーに「出品管理」リンク追加
  - モバイルメニュー: 出品管理 / 新規出品 / 出品を始める（Stripe連携）を追加
  - マイページ: 出品管理 / 新規出品 / 購入済み台本 / お気に入り / 相談管理 / メッセージ / 通知設定 / 管理画面 のリンクをまとめて追加
- **なぜテストで防げなかったか**:
  - @reviewer はページ単体のコードレビューをしており、「他のページからのナビゲーション導線」を横断的に見るチェック観点がなかった
  - @browser-tester は各 TC で URL を直接指定してテストしており、「ユーザーがどうやってそのページにたどり着くか」のナビゲーション導線テストをしていなかった
  - Vitest はユニットテストのみで UI の導線は対象外
  - 仕様書のワイヤーフレーム (spec-details.md §2-7 マイページ) にはリンク一覧が明記されていたが、実装時に参照し忘れた
- **再発防止**: 新しいページを作ったら必ず「どこからリンクするか」を確認し、ヘッダー / マイページ / モバイルメニューのいずれかにリンクを追加する。@reviewer のチェック観点に「ナビゲーション導線の存在確認」を追加

---

## (以下、社長の動作確認で新たに発見されたバグを追記)

