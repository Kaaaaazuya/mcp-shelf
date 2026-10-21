# デプロイ

自分の Cloudflare アカウントの Workers に `void deploy` で出す。Worker のほかに、掲載データと呼び出し回数を置く D1 データベースが 1 つ作られる。

## 必要なもの

- Node 24.21.0 以上（Void 1.1.12 の要件。24.3 などでは `void deploy` が `setGlobalProxyFromEnv` の SyntaxError で落ちる）と npm 11.10 以上。`nvm install 24` で 24 系の最新を入れ、Node を入れ直したら `npm install -g npm@11` もやり直す（リポジトリの外で実行する）。どちらかが古いと `devEngines` で `npm ci` が止まる（[supply-chain.md](supply-chain.md)）。
- Cloudflare アカウント。Workers の無料プランで足りる。無料枠を超えたリクエストはエラーになるだけで、課金はされない。

## 初回デプロイ

初回だけはブラウザでの Cloudflare サインインが要るので、手元のターミナルで行う。

```sh
git clone https://github.com/Kaaaaazuya/mcp-shelf && cd mcp-shelf
npm ci
npx void deploy --platform cloudflare
```

1. ブラウザが開くので Cloudflare にサインインし、デプロイ先のアカウントを選ぶ。
2. 既存の Worker と紐づけるか聞かれたら、新規作成を選ぶ。
3. Void が D1 を作り、`db/migrations/` を流してから Worker を公開し、URL（`https://mcp-shelf.<アカウント>.workers.dev` など）を表示する。
4. 更新された `void.lock.json`（作ったリソースの ID とマイグレーション履歴）と `void.config.ts` をコミットして main に push する。これを忘れると、別のマシンや CI からのデプロイが同じリソースを使えない。

新しい Cloudflare のリソース（D1 のほか、`/mcp` のブロックの記録に使う KV など）を使うコードを入れたときも、最初の 1 回は手元から `npx void deploy` して、更新された `void.lock.json` をコミットする。CI はロックファイルを書き戻せないので、先にやらないとタグからのデプロイのたびに新しいリソースが作られる。

`env.ts` で必須にしたサーバーシークレット（今は `IP_HASH_SECRET`）が Cloudflare にないと、`void deploy` は止まる。手元から出すときは、GitHub の `production` の Secrets と同じ値を先に `npx void secret put IP_HASH_SECRET` で入れる（入力はマスクされる）。タグからのデプロイでは、ワークフローが GitHub Secrets から入れ直す。

初回デプロイは 1 台のマシンからだけ行う。並行して走らせると、リソースが二重に作られることがある。

## 2 回目以降

ふだんは下の「リリースタグで自動デプロイ」でタグを push する。手元から出すときは次のとおり。

```sh
git pull
npm ci
npx void deploy
```

選んだアカウントは保存されるので、`--platform cloudflare` は要らない。毎回、未適用のマイグレーションを本番の D1 に流してから公開する。

- **掲載内容を変えた**とき: `db/migrations/` に追加したデータ用マイグレーションが、このデプロイで本番に入る（書き方は [CLAUDE.md](../CLAUDE.md) の「掲載データ」）。
- マイグレーションを流す前に、D1 の復元ポイントが自動で作られ、戻すための `void db restore` コマンドが表示される。

## デプロイ後の確認

公開 URL を `<URL>` として、次の 3 つを確かめる。

```sh
# MCP エンドポイントが応答する（{"jsonrpc":"2.0","id":1,"result":{}} が返る）
curl -s <URL>/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'

# 掲載データが D1 から読める（list_servers の結果に portfolio と agentguard が出る）
curl -s <URL>/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_servers","arguments":{}}}'

# Claude Code から接続できる
claude mcp add --transport http portfolio <URL>/mcp
```

ブラウザでトップを開き、コンソールのボタンで応答が返ることと、サーバー一覧が出ることも見る。

## 障害調査とロールバック

| やりたいこと                     | コマンド                                   |
| -------------------------------- | ------------------------------------------ |
| 今のデプロイの状態を見る         | `npx void project status`                  |
| ログを見る（ライブ tail）        | `npx void project logs`                    |
| 前のデプロイに戻す               | `npx void project rollback`                |
| マイグレーションの適用状況を見る | `npx void db status`                       |
| D1 を復元ポイントに戻す          | デプロイ時に表示された `void db restore …` |

- ロールバックはコードだけを戻し、D1 のマイグレーションは戻さない。戻す前に、前のコードが今のテーブル定義で動くか確かめる。
- D1 の復元は、復元ポイント以降の書き込み（呼び出し回数を含む）を消す。悪いマイグレーションを出したときは、コードをロールバックしてから D1 を復元し、マイグレーションを直して再デプロイする。
- 復元ポイントは無料プランで 7 日、有料プランで 30 日で消える。それより後は、打ち消すマイグレーションを新しく書く。

## リリースタグで自動デプロイ

`v1.2.3` のようなタグを push すると、`.github/workflows/release-deploy.yml` が本番にデプロイする。

```sh
git switch main && git pull
git tag v1.2.3
git push origin v1.2.3
```

ワークフローは次の順に進み、どこかで失敗したらデプロイしない。

1. **タグを確かめる**（`scripts/check-release-tag.ts`）。次のどれかに当たるとエラーにする。
   - タグ名が `v` + [セマンティックバージョニング](https://semver.org/lang/ja/) ではない（`v1.2`、`1.2.3`、`release-1` など）
   - 同じバージョンを指す別のタグがある（`1.2.3` と `v1.2.3`、`v1.2.3+a` と `v1.2.3+b` は同じとみなす）
   - 同じバージョンの GitHub Release がある（デプロイ済み。タグの付け直しやワークフローの再実行もここで止まる）
   - タグのコミットが `main` に入っていない
2. **CI と同じ確認**（`ci.yml` を呼ぶ。lint、型、テスト、ビルドなど）
3. **デプロイ**（`npx void deploy --platform cloudflare`。GitHub の Environment `production` の Secrets を使う）
4. **GitHub Release を作る**（自動生成のリリースノートつき。`v1.2.3-rc.1` のようなプレリリースは Pre-release にする）。これがデプロイ済みの印になる。

デプロイが失敗したときは Release ができないので、原因を直してから同じ実行を「Re-run」すればよい。タグのコミットごと直す必要があるなら、次のバージョンのタグを切る。

### 事前準備（1 回だけ）

1. 上の「初回デプロイ」を手元で済ませ、`void.lock.json` と `void.config.ts` を `main` にコミットする。CI はこの `void.lock.json` で同じ Worker と D1 を指す。
2. Cloudflare で API トークンを作る。権限は Workers Scripts: Edit、D1: Edit、Workers KV Storage: Edit（`/mcp` のブロックの記録に KV を使うため）。
3. GitHub の Settings → Environments で `production` を作り、Secrets に `CLOUDFLARE_API_TOKEN` と `IP_HASH_SECRET`（`openssl rand -hex 32` の出力。[rate-limit.md](rate-limit.md)）を登録する。トークンが複数のアカウントに触れるなら `CLOUDFLARE_ACCOUNT_ID` も登録する。Worker のバージョンにプレビュー URL がない場合だけ、Variables に `CLOUDFLARE_WORKERS_SUBDOMAIN`（例: `my-team`）を登録する。
4. 必要なら同じ画面で承認者（Required reviewers）を付ける。付けると、タグを push してもデプロイの前に承認待ちになる。
5. タグを勝手に動かせないようにするなら、Settings → Rules → Rulesets でタグ `v*` の更新と削除を禁止する。

ワークフローのアクションは `.github/workflows/ci.yml` と同じくコミット SHA で固定し、Node は `.nvmrc`（Node 24）を使う（[supply-chain.md](supply-chain.md)）。

## 参考

Void 同梱のドキュメント（`node_modules/void/docs/`）の次のページを元にしている。Void を上げたら差分を確認する。

- `guide/deployment.md`
- `reference/cli/deploy.md`
- `integrations/cloudflare.md`（「Deploying from CI」）
