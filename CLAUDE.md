# mcp-shelf

自作 MCP サーバーのポートフォリオサイト。サイト自体もリモート MCP サーバー（`POST /mcp`）として動く。Void 1.1.12 + Cloudflare Workers。

## コマンド

- `npm run dev`: 開発サーバー（http://localhost:5173）
- `npm test`: `lib/mcp.ts` などのユニットテスト（vitest）
- `npm run typecheck`: 型チェック
- `npm run build`: 本番ビルド

## 画面を変える PR には変更前後のキャプチャを載せる

`pages/`、`components/`、`styles/` など、見た目が変わる変更を含む PR では、PR の説明に変更前（ベースブランチ）と変更後（PR ブランチ）のスクリーンショットを並べて載せる。レビューする人がコードを動かさなくても見た目の差を確認できるようにするため。

- **撮る画面**: 変更で見た目が変わる画面すべて。変更前に存在しない画面は、変更前の欄に「なし」と理由（例: 404 だった）を書く。
- **撮り方**: ベースブランチと PR ブランチのそれぞれで `npm run dev` を起動し、Chromium で同じ URL を撮る。
  - 幅は PC 1280px とスマホ 390px の 2 種類。高さはフルページ。
  - ライトモードで撮る。配色やダークモードに関わる変更なら、ダークモードも追加で撮る。
  - 動き（開閉、タブ切り替えなど）が変わる場合は、その操作後の状態も撮る。
- **置き場所**: 画像はコードと混ぜず、`screenshots` ブランチの `pr-<PR 番号>/before/` と `pr-<PR 番号>/after/` に置く。ファイル名は `<画面>-pc.png` / `<画面>-sp.png`（例: `top-pc.png`、`servers-agentguard-sp.png`）。
- **載せ方**: PR 説明の「Screenshots」節に、変更前・変更後 × PC・スマホの表で並べる。画像 URL は後から差し替わらないよう、`screenshots` ブランチのコミット SHA を固定した `https://raw.githubusercontent.com/Kaaaaazuya/mcp-shelf/<SHA>/pr-<番号>/...` を使う。
- **更新**: PR の途中で見た目がさらに変わったら、撮り直して表を更新する。
- 画面に変更がない PR は、この節に「画面の変更なし」とだけ書く。
