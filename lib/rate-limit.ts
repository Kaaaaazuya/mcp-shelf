// POST /mcp の IP 単位のレート制限。Cloudflare の Rate Limiting バインディングで数える（void.config.ts）。
// カウントは拠点ごと・結果整合なので、厳密な上限ではなく、1 つの IP が連打し続けるのを止めるためのもの。

import { ErrorCode, type JsonRpcResponse } from './mcp';

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

/** 制限を超えたときの本文。サイトのコンソールにもこのまま表示される */
export function tooManyRequestsBody(): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: ErrorCode.TooManyRequests,
      message: `Too many requests: up to ${RATE_LIMIT.limit} requests per ${RATE_LIMIT.period} seconds per IP. Retry after ${RATE_LIMIT.period} seconds.`,
    },
  };
}
