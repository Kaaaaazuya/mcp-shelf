import { HTTPException } from 'hono/http-exception';
import { defineHandler, defineHead } from 'void';
import type { InferProps } from 'void';
import { loadServers } from '../../lib/servers-db';
import { siteUrlFrom } from '../../lib/site';

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const servers = await loadServers(siteUrlFrom(c.req.url));
  const server = servers.find((s) => s.slug === c.req.param('slug'));
  if (!server) {
    throw new HTTPException(404, { message: 'Server not found' });
  }
  return { server };
});

export const head = defineHead<Props>((_c, { server }) => ({
  title: server.name,
  meta: [{ name: 'description', content: server.summary }],
}));
