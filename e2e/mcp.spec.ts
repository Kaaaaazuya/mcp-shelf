import { expect, test, type APIRequestContext } from '@playwright/test';

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

async function rpc(request: APIRequestContext, method: string, params?: unknown) {
  const res = await request.post('/mcp', {
    headers: HEADERS,
    data: { jsonrpc: '2.0', id: 1, method, params },
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as { result?: any; error?: { code: number } };
}

test.describe('POST /mcp', () => {
  test('initialize でサーバー情報を返す', async ({ request }) => {
    const { result } = await rpc(request, 'initialize', { protocolVersion: '2025-03-26' });
    expect(result.protocolVersion).toBe('2025-03-26');
    expect(Object.keys(result.capabilities)).toEqual(['tools']);
  });

  test('tools/list に list_servers と get_server がある', async ({ request }) => {
    const { result } = await rpc(request, 'tools/list');
    expect(result.tools.map((t: { name: string }) => t.name)).toEqual([
      'list_servers',
      'get_server',
    ]);
  });

  test('D1 の掲載データを返し、接続設定の URL がこのサイトの /mcp になる', async ({
    request,
    baseURL,
  }) => {
    const { result } = await rpc(request, 'tools/call', {
      name: 'get_server',
      arguments: { slug: 'portfolio' },
    });
    const server = JSON.parse(result.content[0].text);
    expect(server.slug).toBe('portfolio');
    expect(server.tools.length).toBeGreaterThan(0);
    expect(JSON.stringify(server.config)).toContain(`${baseURL}/mcp`);
    expect(JSON.stringify(server.config)).not.toContain('{{MCP_URL}}');
  });

  test('未知の slug はツールのエラーで返る', async ({ request }) => {
    const { result } = await rpc(request, 'tools/call', {
      name: 'get_server',
      arguments: { slug: 'nope' },
    });
    expect(result.isError).toBe(true);
  });

  test('GET は 405、OPTIONS は CORS の preflight に答える', async ({ request }) => {
    expect((await request.get('/mcp')).status()).toBe(405);
    const res = await request.fetch('/mcp', { method: 'OPTIONS' });
    expect(res.status()).toBe(204);
    expect(res.headers()['access-control-allow-origin']).toBe('*');
  });
});
