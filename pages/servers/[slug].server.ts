import { HTTPException } from 'hono/http-exception';
import { defer, defineHandler, defineHead } from 'void';
import type { InferProps } from 'void';
import { loadServers } from '../../lib/servers-db';
import { SELF_SLUG } from '../../lib/servers';
import { siteUrlFrom } from '../../lib/site';
import { loadUsage } from '../../lib/usage-db';

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const servers = await loadServers(siteUrlFrom(c.req.url));
  const position = servers.findIndex((s) => s.slug === c.req.param('slug'));
  const server = servers[position];
  if (!server) {
    throw new HTTPException(404, { message: 'Server not found' });
  }
  return {
    server,
    // 一覧と同じ「01 / slug」の番号を出すための並び順
    position,
    usage: defer(async () => {
      const usage = await loadUsage();
      return {
        views: usage.views[server.slug] ?? 0,
        // ツールの回数は、このサイトが提供するツール（サイト自身の掲載分）にだけある
        tools: server.slug === SELF_SLUG ? usage.tools : null,
      };
    }),
  };
});

export const head = defineHead<Props>((_c, { server }) => ({
  title: server.name,
  meta: [{ name: 'description', content: server.summary }],
}));
