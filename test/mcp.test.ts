import { describe, expect, it } from 'vitest';
import {
  ErrorCode,
  LATEST_PROTOCOL_VERSION,
  handleBody,
  handlePayload,
  type JsonRpcResponse,
} from '../lib/mcp';
import { siteUrlFrom } from '../lib/site';
import type { ToolCall } from '../lib/usage';
import { migratedServers } from './helpers/migrated-servers';

// Miniflare の D1 にマイグレーションを流して読んだ掲載データ（ファイルの最初に 1 回だけ）
const ctx = { servers: await migratedServers('https://example.test') };

function call(method: string, params?: unknown, id: number | string = 1) {
  const res = handlePayload({ jsonrpc: '2.0', id, method, params }, ctx);
  expect(res.status).toBe(200);
  return res.body as JsonRpcResponse;
}

function toolText(res: JsonRpcResponse) {
  const result = res.result as { content: { type: string; text: string }[]; isError?: boolean };
  return { text: result.content[0].text, isError: result.isError };
}

describe('initialize', () => {
  it('対応している版はそのまま返す', () => {
    const res = call('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 't', version: '0' },
    });
    expect(res.result).toMatchObject({
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
    });
  });

  it('未対応の版には最新版を返す', () => {
    const res = call('initialize', { protocolVersion: '1999-01-01' });
    expect((res.result as { protocolVersion: string }).protocolVersion).toBe(
      LATEST_PROTOCOL_VERSION,
    );
  });

  it('protocolVersion がなくても最新版を返す', () => {
    const res = call('initialize');
    expect((res.result as { protocolVersion: string }).protocolVersion).toBe(
      LATEST_PROTOCOL_VERSION,
    );
  });

  it('capabilities は tools のみ', () => {
    const res = call('initialize', { protocolVersion: LATEST_PROTOCOL_VERSION });
    expect(Object.keys((res.result as { capabilities: object }).capabilities)).toEqual(['tools']);
  });
});

describe('ping / 未知メソッド', () => {
  it('ping は空オブジェクト', () => {
    expect(call('ping')).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
  });

  it('未知メソッドは -32601 で、id を引き継ぐ', () => {
    const res = call('resources/list', undefined, 'abc');
    expect(res.id).toBe('abc');
    expect(res.error?.code).toBe(ErrorCode.MethodNotFound);
  });
});

describe('tools', () => {
  it('tools/list は list_servers と get_server', () => {
    const res = call('tools/list');
    const names = (res.result as { tools: { name: string }[] }).tools.map((t) => t.name);
    expect(names).toEqual(['list_servers', 'get_server']);
  });

  it('list_servers は要約の配列を JSON 文字列で返す', () => {
    const { text, isError } = toolText(call('tools/call', { name: 'list_servers', arguments: {} }));
    expect(isError).toBeUndefined();
    const list = JSON.parse(text);
    expect(list[0]).toEqual({
      slug: 'portfolio',
      name: 'MCP Shelf',
      summary: expect.any(String),
      transport: 'streamable-http',
      status: 'active',
    });
  });

  it('list_servers は掲載中の全サーバーを返す', () => {
    const { text } = toolText(call('tools/call', { name: 'list_servers', arguments: {} }));
    expect(JSON.parse(text).map((s: { slug: string }) => s.slug)).toEqual([
      'portfolio',
      'agentguard',
    ]);
  });

  it('get_server の接続設定 URL はリクエストの origin から組み立てる', () => {
    const { text } = toolText(
      call('tools/call', { name: 'get_server', arguments: { slug: 'portfolio' } }),
    );
    expect(JSON.parse(text).config.mcpServers['mcp-shelf'].url).toBe('https://example.test/mcp');
  });

  it('get_server の未知 slug は isError: true と案内文', () => {
    const { text, isError } = toolText(
      call('tools/call', { name: 'get_server', arguments: { slug: 'nope' } }),
    );
    expect(isError).toBe(true);
    expect(text).toContain('list_servers');
  });

  it('get_server の slug 抜けは -32602', () => {
    expect(call('tools/call', { name: 'get_server', arguments: {} }).error?.code).toBe(
      ErrorCode.InvalidParams,
    );
  });

  it('未知のツールは -32602', () => {
    expect(call('tools/call', { name: 'delete_everything' }).error?.code).toBe(
      ErrorCode.InvalidParams,
    );
  });
});

describe('通知', () => {
  it('通知だけのリクエストは 202 で本文なし', () => {
    expect(handlePayload({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx)).toEqual({
      status: 202,
    });
  });

  it('クライアントからの応答も 202', () => {
    expect(handlePayload({ jsonrpc: '2.0', id: 9, result: {} }, ctx)).toEqual({ status: 202 });
  });
});

describe('バッチ', () => {
  it('リクエストの応答だけを順に返し、通知は除く', () => {
    const res = handlePayload(
      [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', id: 2, method: 'nope' },
      ],
      ctx,
    );
    expect(res.status).toBe(200);
    const body = res.body as JsonRpcResponse[];
    expect(body.map((r) => r.id)).toEqual([1, 2]);
    expect(body[1].error?.code).toBe(ErrorCode.MethodNotFound);
  });

  it('通知だけのバッチは 202', () => {
    expect(handlePayload([{ jsonrpc: '2.0', method: 'notifications/initialized' }], ctx)).toEqual({
      status: 202,
    });
  });

  it('空のバッチは -32600', () => {
    const res = handlePayload([], ctx);
    expect((res.body as JsonRpcResponse).error?.code).toBe(ErrorCode.InvalidRequest);
  });
});

describe('不正な入力', () => {
  it('JSON の解析失敗は 400 + -32700', () => {
    const res = handleBody('{not json', ctx);
    expect(res.status).toBe(400);
    expect((res.body as JsonRpcResponse).error?.code).toBe(ErrorCode.ParseError);
  });

  it('jsonrpc がないものは -32600', () => {
    const res = handlePayload({ id: 1, method: 'ping' }, ctx);
    expect((res.body as JsonRpcResponse).error).toMatchObject({ code: ErrorCode.InvalidRequest });
  });

  it('id がオブジェクトのものは -32600', () => {
    const res = handlePayload({ jsonrpc: '2.0', id: { x: 1 }, method: 'ping' }, ctx);
    expect((res.body as JsonRpcResponse).error?.code).toBe(ErrorCode.InvalidRequest);
  });
});

describe('siteUrlFrom', () => {
  it('パスとクエリを落として origin だけ返す', () => {
    expect(siteUrlFrom('https://foo.void.app/mcp?x=1')).toBe('https://foo.void.app');
    expect(siteUrlFrom('http://localhost:5173/')).toBe('http://localhost:5173');
  });
});

function record(messages: unknown[]) {
  const calls: ToolCall[] = [];
  handlePayload(messages, { ...ctx, onToolCall: (c) => calls.push(c) });
  return calls;
}

const toolsCall = (id: number, name: string, args?: unknown) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name, arguments: args },
});

describe('呼び出しの記録（onToolCall）', () => {
  it('list_servers と、既知の slug の get_server を数える', () => {
    expect(
      record([
        toolsCall(1, 'list_servers', {}),
        toolsCall(2, 'get_server', { slug: 'agentguard' }),
      ]),
    ).toEqual([
      { tool: 'list_servers', slug: '' },
      { tool: 'get_server', slug: 'agentguard' },
    ]);
  });

  it('エラーになった呼び出しと tools/call 以外は数えない', () => {
    expect(
      record([
        toolsCall(1, 'get_server', { slug: 'nope' }),
        toolsCall(2, 'get_server', {}),
        toolsCall(3, 'delete_everything'),
        { jsonrpc: '2.0', id: 4, method: 'tools/list' },
        { jsonrpc: '2.0', id: 5, method: 'ping' },
      ]),
    ).toEqual([]);
  });

  it('onToolCall がなくても動く', () => {
    expect(call('tools/call', { name: 'list_servers', arguments: {} }).error).toBeUndefined();
  });
});
