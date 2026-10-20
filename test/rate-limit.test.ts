import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../lib/mcp';
import { RATE_LIMIT, allowRequest, tooManyRequestsBody } from '../lib/rate-limit';

/** 呼ばれたキーを覚え、決まった結果を返すバインディング */
function limiter(success: boolean) {
  const keys: string[] = [];
  return {
    keys,
    limit: async ({ key }: { key: string }) => {
      keys.push(key);
      return { success };
    },
  };
}

describe('allowRequest', () => {
  it('IP をキーにしてバインディングに聞く', async () => {
    const ok = limiter(true);
    expect(await allowRequest(ok, '203.0.113.1')).toBe(true);
    expect(ok.keys).toEqual(['203.0.113.1']);

    expect(await allowRequest(limiter(false), '203.0.113.1')).toBe(false);
  });

  it('バインディングがなければ通す（ローカルやテスト）', async () => {
    expect(await allowRequest(undefined, '203.0.113.1')).toBe(true);
    expect(await allowRequest({}, '203.0.113.1')).toBe(true);
  });

  it('IP が分からなければ通す', async () => {
    const ng = limiter(false);
    expect(await allowRequest(ng, null)).toBe(true);
    expect(ng.keys).toEqual([]);
  });

  it('バインディングが失敗したら通す', async () => {
    const broken = {
      limit: async () => {
        throw new Error('boom');
      },
    };
    expect(await allowRequest(broken, '203.0.113.1')).toBe(true);
  });
});

describe('tooManyRequestsBody', () => {
  it('JSON-RPC のエラーとして、上限と待つ秒数を伝える', () => {
    const body = tooManyRequestsBody();
    expect(body).toMatchObject({ jsonrpc: '2.0', id: null });
    expect(body.error?.code).toBe(ErrorCode.TooManyRequests);
    expect(body.error?.message).toContain(
      `${RATE_LIMIT.limit} requests per ${RATE_LIMIT.period} seconds`,
    );
  });
});

describe('void.config.ts', () => {
  it('バインディングの設定が RATE_LIMIT と同じ', async () => {
    const { default: config } = await import('../void.config');
    expect(config.cloudflare.ratelimits).toContainEqual(
      expect.objectContaining({ name: 'MCP_RATE_LIMITER', simple: RATE_LIMIT }),
    );
  });
});
