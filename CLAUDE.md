# mcp-shelf

自作 MCP サーバーのポートフォリオサイト。サイト自体もリモート MCP サーバー（`POST /mcp`）として動く。Void 1.1.12 + Cloudflare Workers。

## コマンド

- `npm run dev`: 開発サーバー（http://localhost:5173）。Void のプラグインが `@cloudflare/vite-plugin` 経由で Miniflare（workerd）を立て、ローカルの D1 に未適用のマイグレーションを流してから Worker を動かす。データは `.wrangler/` に残る
- `npm test`: `lib/mcp.ts` などのユニットテスト（vitest）。掲載データは Miniflare の D1 から読む
- `npm run test:e2e`: e2e（Playwright。`e2e/`）。先に `npm run build` が要り、ブラウザが無ければ `npx playwright install chromium`。`vite preview` を立てる前にローカル D1 へマイグレーションを流し、HTTP（`/mcp`）と画面（一覧・詳細・呼び出し回数）を確かめる。呼び出し回数は D1 に残るので、増えたかどうかで見ている。ブラウザの版が合わない環境では `PLAYWRIGHT_CHROMIUM_EXECUTABLE` に Chromium のパスを渡す
- `npm run typecheck`: 型チェック
- `npm run lint`: oxlint（警告も失敗扱い。設定は `.oxlintrc.json`）
- `npm run format`: oxfmt で整形する（`npm run format:check` は確認だけ。設定は `.oxfmtrc.json`）
- `npm run build`: 本番ビルド
- `npx void db migrate`: ローカルの D1 に未適用のマイグレーションを流す（初回や pull の後）
- `npx void db status`: マイグレーションの適用状況（ローカルと本番）

## 掲載データ

掲載サーバーとツール定義は D1 の `servers` / `tools` テーブルにある。テーブル定義は `db/schema.ts`、行は `db/migrations/` のデータ用マイグレーションで入れる。`void db seed` はローカルしか作り直さないので、本番にも載る内容はマイグレーションで書く。

- **掲載内容を追加・修正する**: `db/migrations/` に `<タイムスタンプ>_<内容>.sql` を手書きし（`INSERT` / `UPDATE`、文ごとに `--> statement-breakpoint` で区切る）、`meta/_journal.json` に entry を足して、直前の snapshot を `<タイムスタンプ>_snapshot.json` に複製する（`id` を新しい UUID に、`prevId` を直前の `id` にする）。手順の根拠は `node_modules/void/docs/guide/database.md` の「Hand-written migrations」。
- **列を変える**: `db/schema.ts` を直して `npx void db generate` でマイグレーションを作る。
- 接続設定の JSON に書く自サイトの URL は `{{MCP_URL}}` にしておく。読み出し時にリクエストの origin から組み立てた `/mcp` の URL に置き換わる。
- `npm test` は `db/migrations/` を Miniflare の空の D1 に流し、`lib/servers-db.ts` と同じ Drizzle の問い合わせで掲載データを読んで確かめる（`test/helpers/migrated-servers.ts`）。データ用マイグレーションの SQL の誤りもここで気づける。
- devDependencies の `miniflare` と `drizzle-orm` は `void` が固定している版に合わせる。ずれると workerd がもう 1 つ入る。`void` を上げたら `npm ls miniflare drizzle-orm` で確かめてそろえる。
- 本番への反映は `void deploy`（未適用のマイグレーションを流してから公開する）。

## 呼び出し回数

`POST /mcp` で成功した `tools/call` は、`call_counts` テーブルに日（UTC）・ツール・slug ごとに数える（`lib/usage-db.ts`、記録は `routes/mcp.ts`）。slug は `get_server` が読んだサーバーで、それ以外は空文字。トップと詳細ページは直近 30 日ぶんを `defer()` で遅れて表示する。記録や集計に失敗しても、`/mcp` の応答とページ本体には影響させない。エラーになった呼び出し（未知の slug など）と `tools/list` は数えない。

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
