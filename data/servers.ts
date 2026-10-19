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
    // 以下 2 件はダミー。自作 MCP に差し替える
    {
      slug: 'sample-bookshelf',
      name: 'bookshelf-mcp',
      summary: '読書記録を検索・追加する（サンプル）',
      description:
        'ローカルの SQLite に保存した読書記録を、タイトルや著者で検索したり、読了日つきで追加したりするサンプルです。',
      transport: 'stdio',
      language: 'TypeScript',
      status: 'experimental',
      tools: [
        {
          name: 'search_books',
          description: 'タイトルまたは著者名で読書記録を検索する',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: '検索語' },
              limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
          },
        },
        {
          name: 'add_book',
          description: '読書記録を 1 件追加する',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              author: { type: 'string' },
              finishedAt: { type: 'string', format: 'date' },
            },
            required: ['title'],
          },
        },
      ],
      config: { mcpServers: { bookshelf: { command: 'npx', args: ['-y', 'bookshelf-mcp'] } } },
    },
    {
      slug: 'sample-rss-digest',
      name: 'rss-digest-mcp',
      summary: '登録した RSS フィードの新着をまとめて返す（サンプル）',
      description:
        '登録済みの RSS / Atom フィードから指定期間の新着記事を集め、タイトルと URL の一覧として返すサンプルです。',
      transport: 'stdio',
      language: 'Python',
      status: 'archived',
      tools: [
        {
          name: 'get_digest',
          description: '指定した日数ぶんの新着記事を返す',
          inputSchema: {
            type: 'object',
            properties: { days: { type: 'integer', minimum: 1, maximum: 30, default: 1 } },
          },
        },
      ],
      config: { mcpServers: { 'rss-digest': { command: 'uvx', args: ['rss-digest-mcp'] } } },
    },
  ];
}

export function toSummary({ slug, name, summary, transport, status }: Server): ServerSummary {
  return { slug, name, summary, transport, status };
}
