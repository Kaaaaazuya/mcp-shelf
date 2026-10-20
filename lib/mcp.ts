// SDK を使わない最小の MCP 実装。Streamable HTTP のステートレス構成で、毎回 JSON を 1 回返す。

import { SELF_SLUG, toSummary, type Server } from './servers';
import type { ToolCall } from './usage';

export const LATEST_PROTOCOL_VERSION = '2025-06-18';
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const SERVER_INFO = { name: 'mcp-portfolio', version: '0.1.0' };

export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
} as const;

type JsonRpcId = string | number | null;

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface McpContext {
  /** 掲載データ。呼び出し側が DB から読んで渡す（lib/servers-db.ts） */
  servers: Server[];
  /** 成功した tools/call のたびに呼ばれる。エラーになった呼び出しは数えない */
  onToolCall?: (call: ToolCall) => void;
}

/** HTTP に載せる前の結果。body が undefined なら本文なし（通知だけのリクエスト） */
export interface McpHttpResult {
  status: number;
  body?: JsonRpcResponse | JsonRpcResponse[];
}

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidId(value: unknown): value is JsonRpcId {
  return typeof value === 'string' || typeof value === 'number' || value === null;
}

function errorResponse(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function textResult(value: unknown, isError = false) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return isError
    ? { content: [{ type: 'text', text }], isError: true }
    : { content: [{ type: 'text', text }] };
}

export function listTools(ctx: McpContext) {
  const self = ctx.servers.find((s) => s.slug === SELF_SLUG);
  return { tools: self?.tools ?? [] };
}

function callTool(params: unknown, ctx: McpContext) {
  if (!isObject(params) || typeof params.name !== 'string') {
    throw new RpcError(ErrorCode.InvalidParams, 'params.name is required');
  }
  const args = params.arguments ?? {};
  if (!isObject(args)) {
    throw new RpcError(ErrorCode.InvalidParams, 'params.arguments must be an object');
  }
  const { servers } = ctx;

  switch (params.name) {
    case 'list_servers':
      ctx.onToolCall?.({ tool: 'list_servers', slug: '' });
      return textResult(servers.map(toSummary));
    case 'get_server': {
      if (typeof args.slug !== 'string') {
        throw new RpcError(ErrorCode.InvalidParams, 'arguments.slug (string) is required');
      }
      const server = servers.find((s) => s.slug === args.slug);
      if (!server) {
        const known = servers.map((s) => s.slug).join(', ');
        return textResult(
          `Unknown slug "${args.slug}". Call list_servers to see available slugs: ${known}`,
          true,
        );
      }
      ctx.onToolCall?.({ tool: 'get_server', slug: server.slug });
      return textResult(server);
    }
    default:
      throw new RpcError(ErrorCode.InvalidParams, `Unknown tool: ${params.name}`);
  }
}

function dispatch(method: string, params: unknown, ctx: McpContext): unknown {
  switch (method) {
    case 'initialize': {
      const requested = isObject(params) ? params.protocolVersion : undefined;
      const protocolVersion =
        typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : LATEST_PROTOCOL_VERSION;
      return {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Portfolio of MCP servers. Use list_servers to see them and get_server for tool definitions and connection config.',
      };
    }
    case 'ping':
      return {};
    case 'tools/list':
      return listTools(ctx);
    case 'tools/call':
      return callTool(params, ctx);
    default:
      throw new RpcError(ErrorCode.MethodNotFound, `Method not found: ${method}`);
  }
}

/** 1 件のメッセージを処理する。通知とクライアントからの応答には undefined を返す */
export function handleMessage(message: unknown, ctx: McpContext): JsonRpcResponse | undefined {
  if (!isObject(message) || message.jsonrpc !== '2.0') {
    return errorResponse(null, ErrorCode.InvalidRequest, 'Invalid Request');
  }
  const hasId = 'id' in message;
  if (typeof message.method !== 'string') {
    // method のない result / error はクライアントからの応答。返すものはない
    if (hasId && ('result' in message || 'error' in message)) return undefined;
    return errorResponse(
      hasId && isValidId(message.id) ? message.id : null,
      ErrorCode.InvalidRequest,
      'Invalid Request',
    );
  }
  if (!hasId) {
    // 通知。処理するものはないので応答しない
    return undefined;
  }
  if (!isValidId(message.id)) {
    return errorResponse(null, ErrorCode.InvalidRequest, 'Invalid Request');
  }
  try {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: dispatch(message.method, message.params, ctx),
    };
  } catch (err) {
    if (err instanceof RpcError) return errorResponse(message.id, err.code, err.message);
    throw err;
  }
}

/** パース済みの本文（単体またはバッチ）を処理する */
export function handlePayload(payload: unknown, ctx: McpContext): McpHttpResult {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return {
        status: 200,
        body: errorResponse(null, ErrorCode.InvalidRequest, 'Invalid Request: empty batch'),
      };
    }
    const responses = payload
      .map((m) => handleMessage(m, ctx))
      .filter((r): r is JsonRpcResponse => r !== undefined);
    return responses.length ? { status: 200, body: responses } : { status: 202 };
  }
  const response = handleMessage(payload, ctx);
  return response ? { status: 200, body: response } : { status: 202 };
}

/** 生の本文文字列を処理する。JSON の解析に失敗したら 400 + -32700 */
export function handleBody(text: string, ctx: McpContext): McpHttpResult {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return { status: 400, body: errorResponse(null, ErrorCode.ParseError, 'Parse error') };
  }
  return handlePayload(payload, ctx);
}
