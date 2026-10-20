// 掲載データの型と、DB の行からの組み立て。DB への問い合わせは lib/servers-db.ts。

import type { servers, tools } from '../db/schema';

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

/** config の中でこのサイトの /mcp の URL に置き換える文字列。URL はデプロイ先で変わるので DB には持たない */
export const MCP_URL_PLACEHOLDER = '{{MCP_URL}}';

type ServerRow = typeof servers.$inferSelect;
type ToolRow = typeof tools.$inferSelect;

function fillMcpUrl(config: Record<string, unknown>, mcpUrl: string): Record<string, unknown> {
  return JSON.parse(JSON.stringify(config).replaceAll(MCP_URL_PLACEHOLDER, mcpUrl));
}

/** servers と tools の行を、position 順に並べた Server[] にまとめる */
export function toServers(serverRows: ServerRow[], toolRows: ToolRow[], siteUrl: string): Server[] {
  const mcpUrl = `${siteUrl}/mcp`;
  const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;
  return [...serverRows].sort(byPosition).map((row) => ({
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    transport: row.transport,
    language: row.language,
    ...(row.repo ? { repo: row.repo } : {}),
    status: row.status,
    tools: toolRows
      .filter((t) => t.serverSlug === row.slug)
      .sort(byPosition)
      .map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    config: fillMcpUrl(row.config, mcpUrl),
  }));
}

export function toSummary({ slug, name, summary, transport, status }: Server): ServerSummary {
  return { slug, name, summary, transport, status };
}
