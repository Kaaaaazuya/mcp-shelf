// POST /mcp。Streamable HTTP のステートレス構成。GET / DELETE は 405、OPTIONS は CORS の preflight。

import { defineHandler } from 'void';
import { handleBody } from '../lib/mcp';
import { loadServers } from '../lib/servers-db';
import { siteUrlFrom } from '../lib/site';
import type { ToolCall } from '../lib/usage';
import { recordCalls } from '../lib/usage-db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS_HEADERS } });
}

export const POST = defineHandler(async (c) => {
  const servers = await loadServers(siteUrlFrom(c.req.url));
  const calls: ToolCall[] = [];
  const result = handleBody(await c.req.text(), { servers, onToolCall: (call) => calls.push(call) });
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
export const OPTIONS = defineHandler(() => new Response(null, { status: 204, headers: CORS_HEADERS }));
