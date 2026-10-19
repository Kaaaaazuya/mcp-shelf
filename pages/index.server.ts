import { defineHandler, defineHead } from 'void';
import type { InferProps } from 'void';
import { getServers } from '../data/servers';
import { handlePayload } from '../lib/mcp';
import { siteUrlFrom } from '../lib/site';
import { INITIAL_PRESET, PRESETS } from '../lib/console-presets';

export type Props = InferProps<typeof loader>;

export const loader = defineHandler((c) => {
  const siteUrl = siteUrlFrom(c.req.url);
  const servers = getServers(siteUrl).map((s) => ({
    slug: s.slug,
    name: s.name,
    summary: s.summary,
    transport: s.transport,
    status: s.status,
    language: s.language,
    tools: s.tools.map((t) => t.name),
  }));
  // コンソールの初期表示。JS なしでも読めるようサーバーで tools/list を処理しておく
  const initialResponse = handlePayload(PRESETS[INITIAL_PRESET].body, { siteUrl }).body ?? null;
  return { mcpUrl: `${siteUrl}/mcp`, servers, initialResponse };
});

export const head = defineHead(() => ({
  title: '自作 MCP サーバーのポートフォリオ',
  meta: [
    {
      name: 'description',
      content: '自作 MCP サーバーをツール定義と接続設定つきで紹介するサイト。サイト自体もリモート MCP サーバーとして動いています。',
    },
  ],
}));
