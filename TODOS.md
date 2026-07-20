# SimpleSHOT TODOs

| # | Priority | Task | Cost | Details | Status |
|---|----------|------|------|---------|--------|
| 1 | P1 | ⚡ Toolbar 構造リファクタ | M | sub-components 分割、bg state オブジェクト化、セマンティックカラートークン導入。30 props モノリスを解消し React.memo を有効化 | ✅ Done |
| 2 | P2 | Toolbar overflow handling | S | ウィンドウ幅を超えた場合の横スクロール対応 | ✅ Done |
| 3 | P3 | CSS theme() → CSS custom properties | S | index.css の theme("colors.tb.text") 等を var(--tb-*) に移行。Tailwind v4 準備 | ✅ Done |
| 4 | P2 | テストフレームワーク導入 | M | Vitest + React Testing Library セットアップ。Toolbar/Editor のスモークテスト追加 | ✅ Done |
| 5 | P2 | Editor 分割 | L | useEditorHistory / useCanvasPanZoom / useCrop / useEyedropper / useAnnotationLayer / useEditorExport にフック分割 | ✅ Done |
| 6 | P3 | Annotation 判別ユニオン化 | S | optional fields の Blob 型から ArrowAnn \| TextAnn \| … へ | ✅ Done |
| 7 | P3 | Overlay 描画最適化 | M | mousemove 毎の React state 更新をやめ、rAF + ref 描画に。失敗時のユーザーフィードバック追加 | |
| 8 | P3 | Settings / Editor テーマ統一 | S | Settings の gray-* を tb-* トークンに寄せる | ✅ Done |
| 9 | P2 | 太さの画像ピクセル基準化 | M | プレビュー相対 → 画像 native px + UI に px 表示 | ✅ Done |
| 10 | P2 | ツール別サイズ表示 / ブラシプレビュー | M | 実効サイズヒント、塗りつぶし時非表示、カーソル下プレビュー | ✅ Done |
