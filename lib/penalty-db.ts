import { ipPenalties } from '@schema';
import { db, eq, lte } from 'void/db';
import type { Penalty } from './penalty';

export async function loadPenalty(ipHash: string): Promise<Penalty | undefined> {
  const [row] = await db
    .select({
      strikes: ipPenalties.strikes,
      blockedUntil: ipPenalties.blockedUntil,
      lastViolationAt: ipPenalties.lastViolationAt,
    })
    .from(ipPenalties)
    .where(eq(ipPenalties.ipHash, ipHash));
  return row;
}

/**
 * 違反を記録する。すでにブロック中の行は書き換えない。
 * 同じ IP の同時リクエストが重なって違反回数が一度に何回も増えるのを防ぐため。
 */
export async function savePenalty(ipHash: string, penalty: Penalty, now: number): Promise<void> {
  await db
    .insert(ipPenalties)
    .values({ ipHash, ...penalty })
    .onConflictDoUpdate({
      target: ipPenalties.ipHash,
      set: penalty,
      setWhere: lte(ipPenalties.blockedUntil, now),
    });
}
