// トップのコンソールで送るリクエスト。初期表示はサーバー側でも同じものを処理する

export interface Preset {
  label: string;
  body: Record<string, unknown>;
}

export const PRESETS: Preset[] = [
  {
    label: 'initialize',
    body: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'web-console', version: '1.0.0' } },
    },
  },
  { label: 'tools/list', body: { jsonrpc: '2.0', id: 2, method: 'tools/list' } },
  {
    label: 'list_servers',
    body: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_servers', arguments: {} } },
  },
  {
    label: 'get_server',
    body: { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_server', arguments: { slug: 'portfolio' } } },
  },
];

export const INITIAL_PRESET = 1;
