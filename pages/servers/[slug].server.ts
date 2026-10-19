import { HTTPException } from 'hono/http-exception';
import { defineHandler, defineHead } from 'void';
import type { InferProps } from 'void';
import { getServers } from '../../data/servers';
import { siteUrlFrom } from '../../lib/site';

export type Props = InferProps<typeof loader>;

export const loader = defineHandler((c) => {
  const server = getServers(siteUrlFrom(c.req.url)).find((s) => s.slug === c.req.param('slug'));
  if (!server) {
    throw new HTTPException(404, { message: 'Server not found' });
  }
  return { server };
});

export const head = defineHead<Props>((_c, { server }) => ({
  title: server.name,
  meta: [{ name: 'description', content: server.summary }],
}));
