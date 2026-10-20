import { defer, defineHandler, defineHead } from 'void';
import type { InferProps } from 'void';
import { handlePayload } from '../lib/mcp';
import { loadServers } from '../lib/servers-db';
import { siteUrlFrom } from '../lib/site';
import { loadUsage } from '../lib/usage-db';
import { INITIAL_PRESET, PRESETS } from '../lib/console-presets';

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const siteUrl = siteUrlFrom(c.req.url);
  const all = await loadServers(siteUrl);
  const servers = all.map((s) => ({
    slug: s.slug,
    name: s.name,
    summary: s.summary,
    transport: s.transport,
    status: s.status,
    language: s.language,
    tools: s.tools.map((t) => t.name),
  }));
  // コンソールの初期表示。JS なしでも読めるようサーバーで tools/list を処理しておく
  const initialResponse =
    handlePayload(PRESETS[INITIAL_PRESET].body, { servers: all }).body ?? null;
  // 回数は少し遅れてよいので、ページを先に返して後から届ける
  return { mcpUrl: `${siteUrl}/mcp`, servers, initialResponse, usage: defer(() => loadUsage()) };
});

export const head = defineHead(() => ({
  title: '自作 MCP サーバーのポートフォリオ',
  meta: [
    {
      name: 'description',
      content:
        '自作 MCP サーバーをツール定義と接続設定つきで紹介するサイト。サイト自体もリモート MCP サーバーとして動いています。',
    },
  ],
}));
