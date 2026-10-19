# npm サプライチェーン対策

乗っ取られたパッケージや悪意のあるインストールスクリプトから、手元の環境と CI を守るための設定。

## 何をしているか

| 対策 | 場所 | 防ぐもの |
| --- | --- | --- |
| `ignore-scripts=true` | `.npmrc` | 依存の `preinstall` / `install` / `postinstall` が `npm install` 時に任意コードを実行すること |
| `min-release-age=7` | `.npmrc` | 公開されたばかりの（乗っ取りで出された可能性のある）版を取り込むこと |
| `allow-git=none` | `.npmrc` | git リポジトリを指す依存が入ること |
| `save-exact=true` + `check:deps` | `.npmrc`, `scripts/check-deps.mjs` | `^` や `~` で知らない版に上がること、npm 公式レジストリ以外の取得元や integrity のない依存がロックファイルに入ること |
| `devEngines.packageManager` | `package.json` | 上の設定を理解しない古い npm（11.10 未満）でインストールして、対策が黙って効かなくなること |
| `npm ci` / `npm audit signatures` / `npm audit` | `.github/workflows/ci.yml` | ロックファイルとずれた依存、レジストリ署名の合わない tarball、既知の high 以上の脆弱性 |
| アクションを SHA で固定、`permissions: contents: read` | `.github/workflows/ci.yml` | タグを付け替えられたアクションの実行、CI トークンの悪用 |
| Dependabot（7 日のクールダウン付き） | `.github/dependabot.yml` | 更新が止まって既知の脆弱性が残ること |

## 普段の使い方

- Node 24 系（同梱 npm 11.10 以上）を使う。`nvm use` で `.nvmrc` が効く。
- 依存を足すときは `npm install <pkg>@<version>`。完全一致で保存され、7 日以内の版は選ばれない。
- インストール後に `npm run check:deps` を通す（CI でも走る）。

## インストールスクリプトが必要になったら

今の依存（esbuild、workerd など）はスクリプトなしで動くことを確認済み（`npm ci` → typecheck / test / build）。
スクリプトが本当に必要なパッケージが出てきたら、`ignore-scripts` を外すのではなく、そのパッケージだけ手で実行する。

```sh
npm rebuild <pkg> --ignore-scripts=false
```

## 注意

- 7 日待てない緊急の修正版を入れるときだけ、`npm install <pkg>@<version> --min-release-age=0` で一時的に外す。
- Cloudflare の Workers Builds など別の環境で `npm ci` するなら、そこでも Node 24 系を指定する（npm 10 だと `devEngines` で止まる）。
