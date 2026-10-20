# /mcp のレート制限

`POST /mcp` は誰でも呼べるので、2 段で回数を絞る。どちらも Cloudflare の無料プランの範囲で動く。

| 段                           | どこで止めるか           | 単位 | 上限                                    | 設定場所                                |
| ---------------------------- | ------------------------ | ---- | --------------------------------------- | --------------------------------------- |
| WAF のレート制限ルール       | Worker の手前            | IP   | 20 回 / 10 秒（超えたら 10 秒ブロック） | Cloudflare のダッシュボード（下の手順） |
| Rate Limiting バインディング | Worker の中、D1 を読む前 | IP   | 20 回 / 60 秒（超えたら 429）           | `void.config.ts` と `lib/rate-limit.ts` |
| 違反のたびに延びるブロック   | Worker の中、D1 を読む前 | IP   | 1 分 → 2 分 → 4 分 …（最大 24 時間）    | `lib/penalty.ts`（保存は Workers KV）   |

## なぜ 2 段か

- Workers の無料プランは 1 日 10 万リクエストまでで、ページの表示もこの枠を使う。超えると UTC 0 時までサイト全体がエラー 1027 になる（[Workers の制限](https://developers.cloudflare.com/workers/platform/limits/)）。
- Worker の中で 429 を返しても、そのリクエストは 10 万回に数えられる。枠そのものを守れるのは、Worker より手前で止める WAF だけ。
- WAF の無料ルールは 1 本、期間 10 秒、IP 単位のみ（[WAF レート制限ルール](https://developers.cloudflare.com/waf/rate-limiting-rules/)）。短時間の連打は WAF で、それより長い期間の使いすぎはバインディングで止める。
- バインディングのカウントは Cloudflare の拠点ごと・結果整合で、上限をわずかに超えることがある（[Rate Limiting バインディング](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)）。厳密な上限ではない。

## バインディング（コードで管理）

- 上限を変えるときは `void.config.ts` の `ratelimits` と `lib/rate-limit.ts` の `RATE_LIMIT` を両方直す（`test/rate-limit.test.ts` が一致を確かめる）。期間は 10 か 60 秒しか選べない。
- キーは `CF-Connecting-IP`。バインディングがない、IP が取れない、バインディングが失敗した場合は通す（制限の不具合で `/mcp` 全体を止めないため）。
- 超えたときは HTTP 429、`Retry-After: 60`、本文は JSON-RPC のエラー（code `-32029`）。サイトのコンソールにもそのまま表示される。
- `npm run dev` でもバインディングは動く。同じ `CF-Connecting-IP` ヘッダーで 21 回続けて送ると 429 になり、そこから 1 分ブロックされる。

## 違反のたびに延びるブロック

バインディングだけだと、上限ぎりぎりで呼び続ける IP は 1 日 28,800 回呼べてしまい、4 IP で Workers の 1 日の枠を使い切れる。そこで上限を超えた IP は、違反のたびに倍に延びる時間だけ、バインディングに聞く前に断る。

- 1 回目の違反で 1 分、2 回目で 2 分、3 回目で 4 分 …… とブロックする。上限は 24 時間（12 回目以降）。
- 最後の違反から 24 時間空いたら、違反回数を数え直す。
- 違反回数とブロック期限は Workers KV に入れる（`lib/penalty-kv.ts`）。キーは IP そのものではなく `HMAC-SHA256(IP_HASH_SECRET, IP)`。最後の違反から 24 時間で自動的に消える（TTL）ので、掃除はいらない。
- KV の無料枠は 1 日に読み取り 10 万回・書き込み 1,000 回（[KV の制限](https://developers.cloudflare.com/kv/platform/limits/)）。読み取りは毎リクエスト 1 回、書き込みは違反したときだけ。
- KV の書き込みが全拠点に届くまで最大 60 秒ほどかかる。その間、別の拠点からのリクエストはブロックをすり抜けることがある。条件付きの書き込みもできないので、同時に違反したリクエストが重なると違反回数が余計に増えることがある。
- 429 の `Retry-After` はブロックが解けるまでの秒数。
- `IP_HASH_SECRET` がない、または KV の読み書きに失敗したときは、ブロックを使わずバインディングの制限だけで判断する。
- IP は 1 人と一致しない。会社や携帯回線では大勢が同じ IP を共有するので、巻き込まれる人が出うる。

### 鍵の設定

`IP_HASH_SECRET` は `env.ts` で必須にしてあり、本番にないと `void deploy` が止まる。初回だけ次を実行する。

```sh
openssl rand -hex 32 | tr -d '\n' | npx void secret put IP_HASH_SECRET
```

ローカルは `.env` に `IP_HASH_SECRET=<適当な文字列>` を書く。鍵を変えると、それまでの違反回数は引けなくなる（実害はなく、数え直しになるだけ）。

ブロックを手で解くときは、Cloudflare ダッシュボードの KV で `ip-penalty:` で始まるキーを消す（どの IP のキーかは分からないので全部消す）。

## WAF のルール（ダッシュボードで設定）

WAF はゾーン（自分のドメイン）に対する機能なので、`*.workers.dev` のままでは使えない。独自ドメインを Cloudflare に追加し、Worker にカスタムドメインを割り当ててから設定する。

1. Cloudflare ダッシュボードでそのドメインを開き、Security → Security rules（WAF）→ Rate limiting rules で新しいルールを作る。
2. 名前は `mcp-ip-burst` など。条件は「URI Path が `/mcp` と等しい」。
3. 数える単位は IP（無料プランでは IP のみ）。
4. 上限は 10 秒あたり 20 リクエスト。超えたときの動作は Block、期間は 10 秒。
5. 保存して有効にする。

ダッシュボードの項目名は変わることがあるので、見つからなければ上のドキュメントで現在の名前を確かめる。
