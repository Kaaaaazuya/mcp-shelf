import { callCounts } from '@schema';
import { db, gte, sql } from 'void/db';
import { dayOf, summarize, windowStart, type ToolCall, type Usage } from './usage';

/** 呼び出しを今日の行に足す。同じ日・ツール・slug の行があれば回数を 1 増やす */
export async function recordCalls(calls: ToolCall[], now = new Date()): Promise<void> {
  if (calls.length === 0) return;
  const day = dayOf(now);
  const [first, ...rest] = calls.map(({ tool, slug }) =>
    db
      .insert(callCounts)
      .values({ day, tool, slug, count: 1 })
      .onConflictDoUpdate({
        target: [callCounts.day, callCounts.tool, callCounts.slug],
        set: { count: sql`${callCounts.count} + 1` },
      }),
  );
  await db.batch([first, ...rest]);
}

/** 直近の期間の回数を読んで集計する */
export async function loadUsage(now = new Date()): Promise<Usage> {
  const rows = await db
    .select({
      tool: callCounts.tool,
      slug: callCounts.slug,
      count: sql<number>`sum(${callCounts.count})`.mapWith(Number),
    })
    .from(callCounts)
    .where(gte(callCounts.day, windowStart(now)))
    .groupBy(callCounts.tool, callCounts.slug);
  return summarize(rows);
}
