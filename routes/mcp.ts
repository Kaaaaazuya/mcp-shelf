// POST /mcp。Streamable HTTP のステートレス構成。GET / DELETE は 405、OPTIONS は CORS の preflight。
// POST は IP 単位のレート制限を超えると 429（lib/rate-limit.ts）。

import { defineHandler } from 'void';
import { handleBody } from '../lib/mcp';
import { allowRequest, RATE_LIMIT, tooManyRequestsBody } from '../lib/rate-limit';
import { loadServers } from '../lib/servers-db';
import { siteUrlFrom } from '../lib/site';
import type { ToolCall } from '../lib/usage';
import { recordCalls } from '../lib/usage-db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Retry-After',
  'Access-Control-Max-Age': '86400',
};

function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS_HEADERS } });
}

export const POST = defineHandler(async (c) => {
  // D1 を読む前に断る。断ったリクエストも Workers の 1 日の回数には数えられる
  if (!(await allowRequest(c.env.MCP_RATE_LIMITER, c.req.header('CF-Connecting-IP') ?? null))) {
    return new Response(JSON.stringify(tooManyRequestsBody()), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(RATE_LIMIT.period),
        ...CORS_HEADERS,
      },
    });
  }
  const servers = await loadServers(siteUrlFrom(c.req.url));
  const calls: ToolCall[] = [];
  const result = handleBody(await c.req.text(), {
    servers,
    onToolCall: (call) => calls.push(call),
  });
  // 回数の記録に失敗しても、MCP の応答は返す
  await recordCalls(calls).catch((err) => console.error('failed to record tool calls', err));
  if (result.body === undefined) {
    return new Response(null, { status: result.status, headers: CORS_HEADERS });
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
});

export const GET = defineHandler(methodNotAllowed);
export const DELETE = defineHandler(methodNotAllowed);
export const OPTIONS = defineHandler(
  () => new Response(null, { status: 204, headers: CORS_HEADERS }),
);
