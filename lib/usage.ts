// 呼び出し回数の集計。DB への読み書きは lib/usage-db.ts。

/** 表示する期間（日）。今日を含む */
export const WINDOW_DAYS = 30;

/** /mcp で成功した tools/call 1 回分。slug は get_server が読んだサーバー（それ以外は ''） */
export interface ToolCall {
  tool: string;
  slug: string;
}

/** UTC の日付（YYYY-MM-DD）。call_counts.day の形 */
export function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 表示期間の最初の日（今日を含めて WINDOW_DAYS 日ぶん） */
export function windowStart(now: Date): string {
  return dayOf(new Date(now.getTime() - (WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000));
}

export interface CountRow {
  tool: string;
  slug: string;
  count: number;
}

export interface Usage {
  /** 期間内の tools/call の合計 */
  total: number;
  /** サーバーごとの参照回数（get_server で読まれた回数） */
  views: Record<string, number>;
  /** ツールごとの呼び出し回数 */
  tools: Record<string, number>;
}

export function summarize(rows: CountRow[]): Usage {
  const usage: Usage = { total: 0, views: {}, tools: {} };
  for (const { tool, slug, count } of rows) {
    usage.total += count;
    usage.tools[tool] = (usage.tools[tool] ?? 0) + count;
    if (tool === 'get_server' && slug) usage.views[slug] = (usage.views[slug] ?? 0) + count;
  }
  return usage;
}

/** 回数の表示（1,204 回）。サーバーとブラウザーで同じ見た目にするため、ロケールを固定する */
export function formatCount(n: number): string {
  return `${n.toLocaleString('en-US')} 回`;
}
