import { describe, expect, it } from 'vitest';
import {
  MAX_BLOCK_MS,
  STRIKE_RESET_MS,
  blockDuration,
  hashIp,
  nextPenalty,
  retryAfterSeconds,
} from '../lib/penalty';
import { kvPenaltyStore } from '../lib/penalty-kv';

const MINUTE = 60_000;
const t0 = Date.parse('2026-10-20T00:00:00Z');

describe('blockDuration', () => {
  it('1 分から倍々に延びる', () => {
    expect([1, 2, 3, 4, 5].map(blockDuration)).toEqual([1, 2, 4, 8, 16].map((m) => m * MINUTE));
  });

  it('24 時間で頭打ちになる', () => {
    expect(blockDuration(11)).toBe(1024 * MINUTE);
    expect(blockDuration(12)).toBe(MAX_BLOCK_MS);
    expect(blockDuration(100)).toBe(MAX_BLOCK_MS);
  });
});

describe('nextPenalty', () => {
  it('初めての違反は 1 回目', () => {
    expect(nextPenalty(undefined, t0)).toEqual({
      strikes: 1,
      blockedUntil: t0 + MINUTE,
      lastViolationAt: t0,
    });
  });

  it('24 時間以内の違反は回数を足す', () => {
    const prev = { strikes: 3, blockedUntil: t0, lastViolationAt: t0 - 4 * MINUTE };
    expect(nextPenalty(prev, t0)).toMatchObject({ strikes: 4, blockedUntil: t0 + 8 * MINUTE });
  });

  it('最後の違反から 24 時間空いたら数え直す', () => {
    const prev = { strikes: 5, blockedUntil: t0, lastViolationAt: t0 - STRIKE_RESET_MS };
    expect(nextPenalty(prev, t0).strikes).toBe(1);
  });
});

describe('retryAfterSeconds', () => {
  it('ブロック中なら残りの秒数を切り上げて返す', () => {
    const penalty = { strikes: 1, blockedUntil: t0 + 1500, lastViolationAt: t0 };
    expect(retryAfterSeconds(penalty, t0)).toBe(2);
  });

  it('ブロックが解けていれば 0', () => {
    expect(retryAfterSeconds(undefined, t0)).toBe(0);
    expect(retryAfterSeconds({ strikes: 1, blockedUntil: t0, lastViolationAt: t0 }, t0)).toBe(0);
  });
});

describe('hashIp', () => {
  it('同じ鍵と IP なら同じ値、鍵が違えば別の値', async () => {
    const a = await hashIp('203.0.113.1', 'k1');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp('203.0.113.1', 'k1')).toBe(a);
    expect(await hashIp('203.0.113.1', 'k2')).not.toBe(a);
    expect(await hashIp('203.0.113.2', 'k1')).not.toBe(a);
  });
});

describe('kvPenaltyStore', () => {
  it('ip-penalty: のキーに JSON で入れ、24 時間の TTL を付ける', async () => {
    const puts: { key: string; value: string; options: unknown }[] = [];
    const namespace = {
      get: async (key: string) => {
        const hit = puts.find((p) => p.key === key);
        return hit ? JSON.parse(hit.value) : null;
      },
      put: async (key: string, value: string, options: unknown) => {
        puts.push({ key, value, options });
      },
    } as unknown as KVNamespace;
    const store = kvPenaltyStore(namespace);
    const penalty = { strikes: 1, blockedUntil: t0 + MINUTE, lastViolationAt: t0 };

    expect(await store.load('abc')).toBeUndefined();
    await store.save('abc', penalty);
    expect(puts[0]).toMatchObject({
      key: 'ip-penalty:abc',
      options: { expirationTtl: STRIKE_RESET_MS / 1000 },
    });
    expect(await store.load('abc')).toEqual(penalty);
  });
});
