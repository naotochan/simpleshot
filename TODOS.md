# SimpleSHOT TODOs

| # | Priority | Task | Cost | Details | Status |
|---|----------|------|------|---------|--------|
| 1 | P1 | ⚡ Toolbar 構造リファクタ | M | sub-components 分割、bg state オブジェクト化、セマンティックカラートークン導入。30 props モノリスを解消し React.memo を有効化 | |
| 2 | P2 | Toolbar overflow handling | S | ウィンドウ幅を超えた場合の flex-wrap or 横スクロール対応。フレーム UI 追加で要素増加時に必要 | |
| 3 | P3 | CSS theme() → CSS custom properties | S | index.css の theme("colors.tb.text") 等を var(--tb-text) に移行。Tailwind v4 準備 | |
| 4 | P2 | テストフレームワーク導入 | M | Vitest + React Testing Library セットアップ。Toolbar/Editor のスモークテスト追加 | |
