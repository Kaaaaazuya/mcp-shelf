import type { Status } from '../data/servers';

export const STATUS_LABELS: Record<Status, string> = {
  active: '稼働中',
  experimental: '試作',
  archived: '停止',
};

/** Claude Code に追加するコマンド。リモートなら URL、stdio なら mcpServers の command と args を使う */
export function claudeAddCommand(name: string, entry: Record<string, unknown>): string {
  if (typeof entry.url === 'string') {
    return `claude mcp add --transport http ${name} ${entry.url}`;
  }
  const args = Array.isArray(entry.args) ? entry.args.map(String) : [];
  return ['claude mcp add', name, '--', String(entry.command ?? ''), ...args].join(' ');
}
