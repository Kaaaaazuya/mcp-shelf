// 違反回数を Workers KV に読み書きする。KV のバインディングは routes/mcp.ts で c.env.KV から渡す
// （Void は routes/ などで c.env.KV を参照していると KV を用意する。lib/ は検出の対象外）。

import { STRIKE_RESET_MS, type Penalty } from './penalty';
import type { PenaltyStore } from './rate-limit';

const key = (ipHash: string) => `ip-penalty:${ipHash}`;

/**
 * 違反は、違反回数を数え直すまでの 24 時間で自動的に消える（ブロックも最長 24 時間なので、先に消えることはない）。
 * KV は条件付きの書き込みができないので、同じ IP の同時リクエストが重なると違反回数が余計に増えることがある。
 */
export function kvPenaltyStore(namespace: KVNamespace): PenaltyStore {
  return {
    load: async (ipHash) => (await namespace.get<Penalty>(key(ipHash), 'json')) ?? undefined,
    save: async (ipHash, penalty) => {
      await namespace.put(key(ipHash), JSON.stringify(penalty), {
        expirationTtl: STRIKE_RESET_MS / 1000,
      });
    },
  };
}
