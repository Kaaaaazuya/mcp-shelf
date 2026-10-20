# /mcp のレート制限

`POST /mcp` は誰でも呼べるので、2 段で回数を絞る。どちらも Cloudflare の無料プランの範囲で動く。

| 段                           | どこで止めるか           | 単位 | 上限                                    | 設定場所                                |
| ---------------------------- | ------------------------ | ---- | --------------------------------------- | --------------------------------------- |
| WAF のレート制限ルール       | Worker の手前            | IP   | 20 回 / 10 秒（超えたら 10 秒ブロック） | Cloudflare のダッシュボード（下の手順） |
| Rate Limiting バインディング | Worker の中、D1 を読む前 | IP   | 20 回 / 60 秒（超えたら 429）           | `void.config.ts` と `lib/rate-limit.ts` |

## なぜ 2 段か

- Workers の無料プランは 1 日 10 万リクエストまでで、ページの表示もこの枠を使う。超えると UTC 0 時までサイト全体がエラー 1027 になる（[Workers の制限](https://developers.cloudflare.com/workers/platform/limits/)）。
- Worker の中で 429 を返しても、そのリクエストは 10 万回に数えられる。枠そのものを守れるのは、Worker より手前で止める WAF だけ。
- WAF の無料ルールは 1 本、期間 10 秒、IP 単位のみ（[WAF レート制限ルール](https://developers.cloudflare.com/waf/rate-limiting-rules/)）。短時間の連打は WAF で、それより長い期間の使いすぎはバインディングで止める。
- バインディングのカウントは Cloudflare の拠点ごと・結果整合で、上限をわずかに超えることがある（[Rate Limiting バインディング](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)）。厳密な上限ではない。

## バインディング（コードで管理）

- 上限を変えるときは `void.config.ts` の `ratelimits` と `lib/rate-limit.ts` の `RATE_LIMIT` を両方直す（`test/rate-limit.test.ts` が一致を確かめる）。期間は 10 か 60 秒しか選べない。
- キーは `CF-Connecting-IP`。バインディングがない、IP が取れない、バインディングが失敗した場合は通す（制限の不具合で `/mcp` 全体を止めないため）。
- 超えたときは HTTP 429、`Retry-After: 60`、本文は JSON-RPC のエラー（code `-32029`）。サイトのコンソールにもそのまま表示される。
- `npm run dev` でもバインディングは動く。同じ `CF-Connecting-IP` ヘッダーで 21 回続けて送ると 429 になる。

## WAF のルール（ダッシュボードで設定）

WAF はゾーン（自分のドメイン）に対する機能なので、`*.workers.dev` のままでは使えない。独自ドメインを Cloudflare に追加し、Worker にカスタムドメインを割り当ててから設定する。

1. Cloudflare ダッシュボードでそのドメインを開き、Security → Security rules（WAF）→ Rate limiting rules で新しいルールを作る。
2. 名前は `mcp-ip-burst` など。条件は「URI Path が `/mcp` と等しい」。
3. 数える単位は IP（無料プランでは IP のみ）。
4. 上限は 10 秒あたり 20 リクエスト。超えたときの動作は Block、期間は 10 秒。
5. 保存して有効にする。

ダッシュボードの項目名は変わることがあるので、見つからなければ上のドキュメントで現在の名前を確かめる。
