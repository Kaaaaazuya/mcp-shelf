import { describe, expect, it } from 'vitest';
import { WINDOW_DAYS, dayOf, formatCount, summarize, windowStart } from '../lib/usage';

describe('dayOf / windowStart', () => {
  it('日付は UTC で数える', () => {
    expect(dayOf(new Date('2026-10-20T23:59:59Z'))).toBe('2026-10-20');
    expect(dayOf(new Date('2026-10-21T00:00:00Z'))).toBe('2026-10-21');
  });

  it('期間は今日を含めて 30 日ぶん', () => {
    expect(WINDOW_DAYS).toBe(30);
    expect(windowStart(new Date('2026-10-20T08:00:00Z'))).toBe('2026-09-21');
    expect(windowStart(new Date('2026-03-01T00:00:00Z'))).toBe('2026-01-31');
  });
});

describe('summarize', () => {
  it('行がなければ全部 0', () => {
    expect(summarize([])).toEqual({ total: 0, views: {}, tools: {} });
  });

  it('合計、ツールごと、get_server の slug ごとに足す', () => {
    const usage = summarize([
      { tool: 'list_servers', slug: '', count: 5 },
      { tool: 'get_server', slug: 'portfolio', count: 3 },
      { tool: 'get_server', slug: 'agentguard', count: 2 },
    ]);
    expect(usage.total).toBe(10);
    expect(usage.tools).toEqual({ list_servers: 5, get_server: 5 });
    expect(usage.views).toEqual({ portfolio: 3, agentguard: 2 });
  });

  it('get_server 以外の slug は参照回数に入れない', () => {
    expect(summarize([{ tool: 'list_servers', slug: 'portfolio', count: 4 }]).views).toEqual({});
  });
});

describe('formatCount', () => {
  it('3 桁ごとに区切って「回」をつける', () => {
    expect(formatCount(0)).toBe('0 回');
    expect(formatCount(1204)).toBe('1,204 回');
  });
});
