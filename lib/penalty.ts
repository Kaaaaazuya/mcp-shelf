// レート制限を超えた IP へのブロック。違反のたびにブロックを 1 分 → 2 分 → 4 分 …… と倍にして、
// 1 つの IP が上限ぎりぎりで呼び続けて Workers の 1 日の回数を食い尽くすのを防ぐ。DB の読み書きは lib/penalty-db.ts。

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** 1 回目の違反でのブロック時間 */
export const FIRST_BLOCK_MS = MINUTE;
/** ブロック時間の上限 */
export const MAX_BLOCK_MS = DAY;
/** 最後の違反からこれだけ空いたら、違反回数を数え直す */
export const STRIKE_RESET_MS = DAY;

export interface Penalty {
  strikes: number;
  /** Unix ミリ秒 */
  blockedUntil: number;
  /** Unix ミリ秒 */
  lastViolationAt: number;
}

/** strikes 回目の違反でのブロック時間（ミリ秒） */
export function blockDuration(strikes: number): number {
  return Math.min(FIRST_BLOCK_MS * 2 ** Math.max(strikes - 1, 0), MAX_BLOCK_MS);
}

/** 今ブロック中なら、解けるまでの秒数（切り上げ）。ブロック中でなければ 0 */
export function retryAfterSeconds(penalty: Penalty | undefined, now: number): number {
  if (!penalty || penalty.blockedUntil <= now) return 0;
  return Math.ceil((penalty.blockedUntil - now) / 1000);
}

/** 上限を超えたときの、次の違反回数とブロック期限 */
export function nextPenalty(prev: Penalty | undefined, now: number): Penalty {
  const strikes = prev && now - prev.lastViolationAt < STRIKE_RESET_MS ? prev.strikes + 1 : 1;
  return { strikes, blockedUntil: now + blockDuration(strikes), lastViolationAt: now };
}

/** IP を D1 に残さないための鍵付きハッシュ（HMAC-SHA256 の 16 進） */
export async function hashIp(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(ip));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('');
}
