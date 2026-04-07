# 既知の問題（放置分）

CLAUDE.md のルールに従い、Medium/Low で「修正試行したが詰まった」または「現状あえて放置」の指摘をここに記録する。

## フェーズ1 Step 1

### Low: tsconfig.json の `target` が ES2017

- **指摘元**: 2026-04-07 フェーズ1 Step 1 フルレビュー
- **内容**: React 19 / Next.js 15 を使用しているにもかかわらず `target: "ES2017"` のまま
- **状態**: 放置
- **理由**: Next.js 15 のデフォルトが ES2017。動作上の問題なし。create-next-app の出力をそのまま採用しているため、独自ルールで上書きする必要性が薄い

### Low（補足記録）: Noto Sans JP の `subsets` に `japanese` を指定できない

- **指摘元**: 2026-04-07 フェーズ1 Step 1 フルレビュー
- **内容**: `next/font/google` の `Noto_Sans_JP` は `japanese` サブセットを直接指定できない（型エラー）。日本語グリフは Google Fonts の unicode-range で配信される
- **状態**: 修正不要と判定
- **理由**: Google Fonts 側で unicode-range によるサブセット配信が行われるため、`subsets: ["latin"]` 指定でも日本語ページは正しくレンダリングされる。`layout.tsx` にコメントで意図を明記済み
