/// <reference types="node" />

// db/migrations を空の SQLite（node:sqlite のメモリ DB）に順に流し、掲載データを Server[] で返す。
// D1 を立てずに、マイグレーションの SQL と toServers の組み立てをまとめて確かめるため。

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { toServers, type Server } from '../../lib/servers';

const MIGRATIONS_DIR = new URL('../../db/migrations/', import.meta.url);

export function migratedServers(siteUrl: string): Server[] {
  const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', MIGRATIONS_DIR), 'utf8')) as {
    entries: { tag: string }[];
  };
  const db = new DatabaseSync(':memory:');
  for (const { tag } of journal.entries) {
    db.exec(readFileSync(new URL(`${tag}.sql`, MIGRATIONS_DIR), 'utf8').replaceAll('--> statement-breakpoint', ''));
  }
  // 列名は snake_case、JSON 列は文字列のまま返るので、Drizzle が返す形にそろえる
  const serverRows = db.prepare('SELECT * FROM servers').all().map((r) => ({
    ...(r as Record<string, unknown>),
    config: JSON.parse(String(r.config)),
  }));
  const toolRows = db.prepare('SELECT * FROM tools').all().map((r) => ({
    serverSlug: String(r.server_slug),
    name: String(r.name),
    position: Number(r.position),
    description: String(r.description),
    inputSchema: JSON.parse(String(r.input_schema)),
  }));
  db.close();
  return toServers(serverRows as Parameters<typeof toServers>[0], toolRows, siteUrl);
}
