import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../lib/mcp';
import type { Penalty } from '../lib/penalty';
import {
  RATE_LIMIT,
  allowRequest,
  secondsToWait,
  tooManyRequestsBody,
  type PenaltyStore,
} from '../lib/rate-limit';

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

/** メモリ上の PenaltyStore。savePenalty と同じく、ブロック中の行は書き換えない */
function memoryStore() {
  const rows = new Map<string, Penalty>();
  const store: PenaltyStore = {
    load: async (ipHash) => rows.get(ipHash),
    save: async (ipHash, penalty, now) => {
      const prev = rows.get(ipHash);
      if (!prev || prev.blockedUntil <= now) rows.set(ipHash, penalty);
    },
  };
  return { rows, store };
}

describe('secondsToWait', () => {
  const ip = '203.0.113.1';
  const secret = 'test-secret';
  const t0 = Date.parse('2026-10-20T00:00:00Z');

  it('上限内なら通し、何も記録しない', async () => {
    const { rows, store } = memoryStore();
    expect(await secondsToWait({ limiter: limiter(true), ip, secret, store, now: t0 })).toBe(0);
    expect(rows.size).toBe(0);
  });

  it('上限を超えるたびにブロックが 1 分 → 2 分 → 4 分と倍に延びる', async () => {
    const { rows, store } = memoryStore();
    const ng = limiter(false);
    expect(await secondsToWait({ limiter: ng, ip, secret, store, now: t0 })).toBe(60);
    // ブロック中はバインディングに聞かずに残り時間を返す
    expect(await secondsToWait({ limiter: ng, ip, secret, store, now: t0 + 30_000 })).toBe(30);
    expect(ng.keys).toHaveLength(1);

    expect(await secondsToWait({ limiter: ng, ip, secret, store, now: t0 + 60_000 })).toBe(120);
    expect(await secondsToWait({ limiter: ng, ip, secret, store, now: t0 + 180_000 })).toBe(240);
    expect([...rows.values()][0].strikes).toBe(3);
  });

  it('D1 には IP そのものではなくハッシュを保存する', async () => {
    const { rows, store } = memoryStore();
    await secondsToWait({ limiter: limiter(false), ip, secret, store, now: t0 });
    const [key] = rows.keys();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain(ip);
  });

  it('鍵がなければブロックせず、バインディングの期間だけ待たせる', async () => {
    const { rows, store } = memoryStore();
    expect(
      await secondsToWait({ limiter: limiter(false), ip, secret: undefined, store, now: t0 }),
    ).toBe(RATE_LIMIT.period);
    expect(rows.size).toBe(0);
  });

  it('D1 が失敗してもバインディングの判断で動く', async () => {
    const broken: PenaltyStore = {
      load: async () => {
        throw new Error('d1 down');
      },
      save: async () => {
        throw new Error('d1 down');
      },
    };
    expect(
      await secondsToWait({ limiter: limiter(true), ip, secret, store: broken, now: t0 }),
    ).toBe(0);
    expect(
      await secondsToWait({ limiter: limiter(false), ip, secret, store: broken, now: t0 }),
    ).toBe(60);
  });

  it('IP が分からなければ通す', async () => {
    const { store } = memoryStore();
    expect(await secondsToWait({ limiter: limiter(false), ip: null, secret, store, now: t0 })).toBe(
      0,
    );
  });
});

describe('tooManyRequestsBody', () => {
  it('JSON-RPC のエラーとして、上限と待つ秒数を伝える', () => {
    const body = tooManyRequestsBody(120);
    expect(body).toMatchObject({ jsonrpc: '2.0', id: null });
    expect(body.error?.code).toBe(ErrorCode.TooManyRequests);
    expect(body.error?.message).toContain(
      `${RATE_LIMIT.limit} requests per ${RATE_LIMIT.period} seconds`,
    );
    expect(body.error?.message).toContain('Retry after 120 seconds');
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
