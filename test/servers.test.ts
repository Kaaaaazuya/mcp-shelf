import { describe, expect, it } from 'vitest';
import { MCP_URL_PLACEHOLDER, toServers } from '../lib/servers';
import { migratedServers } from './helpers/migrated-servers';

const row = (slug: string, position: number, repo: string | null = null) => ({
  slug,
  position,
  name: slug,
  summary: '',
  description: '',
  transport: 'stdio' as const,
  language: 'Go',
  repo,
  status: 'active' as const,
  config: { url: MCP_URL_PLACEHOLDER },
});

const tool = (serverSlug: string, name: string, position: number) => ({
  serverSlug,
  name,
  position,
  description: '',
  inputSchema: {},
});

describe('toServers', () => {
  it('サーバーもツールも position の順に並べる', () => {
    const servers = toServers(
      [row('b', 1), row('a', 0)],
      [tool('a', 'y', 1), tool('a', 'x', 0), tool('b', 'z', 0)],
      'https://s.test',
    );
    expect(servers.map((s) => s.slug)).toEqual(['a', 'b']);
    expect(servers[0].tools.map((t) => t.name)).toEqual(['x', 'y']);
    expect(servers[1].tools.map((t) => t.name)).toEqual(['z']);
  });

  it('config の {{MCP_URL}} をサイトの /mcp に置き換える', () => {
    expect(toServers([row('a', 0)], [], 'https://s.test')[0].config).toEqual({
      url: 'https://s.test/mcp',
    });
  });

  it('repo が NULL ならキーごと省く', () => {
    const [withRepo, without] = toServers(
      [row('a', 0, 'https://github.com/x/a'), row('b', 1)],
      [],
      'https://s.test',
    );
    expect(withRepo.repo).toBe('https://github.com/x/a');
    expect('repo' in without).toBe(false);
  });
});

describe('マイグレーションの掲載データ', async () => {
  const servers = await migratedServers('https://s.test');

  it('サーバーが 1 件以上ある', () => {
    expect(servers.length).toBeGreaterThan(0);
  });

  it('どのサーバーにもツールが 1 つ以上ある', () => {
    for (const s of servers) expect(s.tools.length).toBeGreaterThan(0);
  });

  it('置き換え忘れの {{MCP_URL}} が残らない', () => {
    expect(JSON.stringify(servers)).not.toContain(MCP_URL_PLACEHOLDER);
  });
});
