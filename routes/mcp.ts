// POST /mcp。Streamable HTTP のステートレス構成。GET / DELETE は 405、OPTIONS は CORS の preflight。

import { defineHandler } from 'void';
import { handleBody } from '../lib/mcp';
import { loadServers } from '../lib/servers-db';
import { siteUrlFrom } from '../lib/site';

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
  const result = handleBody(await c.req.text(), { servers });
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
