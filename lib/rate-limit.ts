// POST /mcp の IP 単位のレート制限。Cloudflare の Rate Limiting バインディングで数える（void.config.ts）。
// カウントは拠点ごと・結果整合なので、厳密な上限ではなく、1 つの IP が連打し続けるのを止めるためのもの。
// 上限を超えた IP は、違反のたびに倍に延びる時間だけブロックする（lib/penalty.ts）。

import { ErrorCode, type JsonRpcResponse } from './mcp';
import { blockDuration, hashIp, nextPenalty, retryAfterSeconds, type Penalty } from './penalty';

/** void.config.ts の ratelimits と同じ値。期間は 10 か 60 秒しか選べない */
export const RATE_LIMIT = { limit: 20, period: 60 } as const;

/** Workers の RateLimit バインディングのうち、使う部分だけ */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * この IP からの呼び出しを通してよいか。
 * バインディングや IP がない（ローカルやテスト）か、バインディングが失敗したときは通す。
 * 制限の不具合で /mcp 全体を止めないため。
 */
export async function allowRequest(limiter: unknown, ip: string | null): Promise<boolean> {
  if (!ip || !isRateLimiter(limiter)) return true;
  try {
    return (await limiter.limit({ key: ip })).success;
  } catch (err) {
    console.error('rate limiter failed', err);
    return true;
  }
}

function isRateLimiter(value: unknown): value is RateLimiter {
  return typeof (value as RateLimiter | undefined)?.limit === 'function';
}

/** 違反回数の読み書き。本番は lib/penalty-db.ts、テストではメモリ上の実装を渡す */
export interface PenaltyStore {
  load(ipHash: string): Promise<Penalty | undefined>;
  save(ipHash: string, penalty: Penalty, now: number): Promise<void>;
}

export interface GateOptions {
  limiter: unknown;
  ip: string | null;
  /** IP をハッシュする鍵。なければブロックは使わず、バインディングの制限だけにする */
  secret: string | undefined;
  store: PenaltyStore;
  now: number;
}

/**
 * このリクエストを断るなら、待つべき秒数を返す。通すなら 0。
 * ブロック中ならバインディングに聞かずに断る。上限を超えたら違反を記録してブロックする。
 * D1 の読み書きに失敗したときは、バインディングの制限だけで判断する。
 */
export async function secondsToWait(options: GateOptions): Promise<number> {
  const { limiter, ip, secret, store, now } = options;
  if (!ip) return 0;
  const ipHash = secret ? await hashIp(ip, secret) : undefined;
  let penalty: Penalty | undefined;
  if (ipHash) {
    penalty = await store.load(ipHash).catch((err) => {
      console.error('failed to load ip penalty', err);
      return undefined;
    });
    const wait = retryAfterSeconds(penalty, now);
    if (wait > 0) return wait;
  }
  if (await allowRequest(limiter, ip)) return 0;
  if (!ipHash) return RATE_LIMIT.period;
  const next = nextPenalty(penalty, now);
  await store
    .save(ipHash, next, now)
    .catch((err) => console.error('failed to save ip penalty', err));
  return Math.ceil(blockDuration(next.strikes) / 1000);
}

/** 制限を超えたときの本文。サイトのコンソールにもこのまま表示される */
export function tooManyRequestsBody(retryAfter: number): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: ErrorCode.TooManyRequests,
      message: `Too many requests: up to ${RATE_LIMIT.limit} requests per ${RATE_LIMIT.period} seconds per IP. Each violation doubles the block time (up to 24 hours). Retry after ${retryAfter} seconds.`,
    },
  };
}
