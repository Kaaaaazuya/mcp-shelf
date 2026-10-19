// 掲載データ。サイトと /mcp の両方がここを読む。追加・修正はこのファイルだけで済む。

export type Transport = 'stdio' | 'streamable-http';
export type Status = 'active' | 'experimental' | 'archived';

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface Server {
  slug: string;
  name: string;
  summary: string;
  description: string;
  transport: Transport;
  language: string;
  repo?: string;
  status: Status;
  tools: Tool[];
  config: Record<string, unknown>;
}

/** 一覧表示と list_servers が返す項目 */
export type ServerSummary = Pick<Server, 'slug' | 'name' | 'summary' | 'transport' | 'status'>;

// このサイト自身の URL はデプロイ先で変わるので、リクエストの origin を受け取って組み立てる
export function getServers(siteUrl: string): Server[] {
  const mcpUrl = `${siteUrl}/mcp`;
  return [
    {
      slug: 'portfolio',
      name: 'mcp-portfolio',
      summary: 'このサイト自身。掲載している MCP サーバーの一覧と詳細を返す',
      description:
        'このポートフォリオサイトはリモート MCP サーバーでもあります。Claude に URL を渡すと、ここに載っているサーバーの一覧やツール定義を読めます。Streamable HTTP のステートレス構成で、読み取り専用のツールを 2 つ提供します。',
      transport: 'streamable-http',
      language: 'TypeScript',
      repo: 'https://github.com/Kaaaaazuya/mcp-shelf',
      status: 'active',
      tools: [
        {
          name: 'list_servers',
          description: '掲載している MCP サーバーの一覧（slug、名前、要約、トランスポート、状態）を返す',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
        {
          name: 'get_server',
          description: 'slug で指定した MCP サーバーの詳細（説明、ツール定義、接続設定）を返す',
          inputSchema: {
            type: 'object',
            properties: {
              slug: { type: 'string', description: 'list_servers が返す slug' },
            },
            required: ['slug'],
            additionalProperties: false,
          },
        },
      ],
      config: { mcpServers: { portfolio: { type: 'http', url: mcpUrl } } },
    },
    {
      slug: 'agentguard',
      name: 'AgentGuard FS',
      summary: 'CUE で書いたポリシーに従って、AI エージェントのローカルファイル操作を操作ごとに許可・拒否する',
      description:
        'AI エージェントにローカルファイル操作（read_file、write_file、list_files、delete_file）を提供し、CUE で書いたポリシーに従って操作ごとに許可・拒否する MCP サーバーです。デフォルト拒否・拒否優先で、deny ルールは大文字小文字と Unicode 正規化の違いを無視して照合します。操作は --root のディレクトリ内に限られ、symlink はパスのどこにあっても拒否します（Linux は openat2、macOS は O_NOFOLLOW_ANY）。読み書きはサイズ上限付きの UTF-8 テキストのみです。Linux 5.6 以上または macOS 11 以上で動きます。',
      transport: 'stdio',
      language: 'Go',
      repo: 'https://github.com/Kaaaaazuya/agent-guard-fs',
      status: 'experimental',
      tools: [
        {
          name: 'read_file',
          description: 'Read a UTF-8 text file that the policy allows.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'the path relative to the root, such as src/main.go' },
            },
            required: ['path'],
            additionalProperties: false,
          },
        },
        {
          name: 'write_file',
          description: 'Create or replace a UTF-8 text file that the policy allows. Parent directories are not created.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'the path relative to the root, such as src/main.go' },
              content: { type: 'string', description: 'the full UTF-8 text to store at the path' },
            },
            required: ['path', 'content'],
            additionalProperties: false,
          },
        },
        {
          name: 'list_files',
          description:
            'List the direct children of a directory that the policy allows. Entries the policy hides are omitted.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'the path relative to the root, such as src/main.go' },
            },
            required: ['path'],
            additionalProperties: false,
          },
        },
        {
          name: 'delete_file',
          description: 'Delete a regular file that the policy allows. Directories and links are not deleted.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'the path relative to the root, such as src/main.go' },
            },
            required: ['path'],
            additionalProperties: false,
          },
        },
      ],
      config: {
        mcpServers: {
          agentguard: {
            command: '/absolute/path/to/agent-guard-fs/bin/agentguard',
            args: ['--root', '/absolute/path/to/project', '--policy', '/absolute/path/to/policy.cue'],
          },
        },
      },
    },
  ];
}

export function toSummary({ slug, name, summary, transport, status }: Server): ServerSummary {
  return { slug, name, summary, transport, status };
}
