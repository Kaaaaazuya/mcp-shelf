/// <reference types="node" />

// db/migrations を Miniflare（workerd）の空の D1 に順に流し、本番と同じ Drizzle の問い合わせで
// 掲載データを Server[] で返す。本番と同じ D1 で、マイグレーションの SQL と組み立てをまとめて確かめるため。

import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/d1';
import { Miniflare } from 'miniflare';
import * as schema from '../../db/schema';
import { toServers, type Server } from '../../lib/servers';

const MIGRATIONS_DIR = new URL('../../db/migrations/', import.meta.url);

export async function migratedServers(siteUrl: string): Promise<Server[]> {
  const journal = JSON.parse(
    readFileSync(new URL('meta/_journal.json', MIGRATIONS_DIR), 'utf8'),
  ) as {
    entries: { tag: string }[];
  };
  // D1 を使うだけなので Worker は空。永続化しないので毎回まっさらな DB になる
  const mf = new Miniflare({
    workers: [
      {
        config: {
          name: 'test',
          compatibilityDate: '2026-02-24',
          manifest: {
            mainModule: 'index.mjs',
            modules: { 'index.mjs': { type: 'esm', contents: 'export default {}' } },
          },
          env: { DB: { type: 'd1', id: 'DB' } },
        },
      },
    ],
  });
  try {
    const d1 = await mf.getD1Database('DB');
    // void db migrate と同じく `--> statement-breakpoint` の行で区切り、文ごとに流す
    for (const { tag } of journal.entries) {
      const sql = readFileSync(new URL(`${tag}.sql`, MIGRATIONS_DIR), 'utf8');
      for (const statement of sql.split(/^\s*-->\s*statement-breakpoint\s*$/m)) {
        // コメントだけの区切り（ファイル先頭の説明など）は D1 が文として受け付けないので飛ばす
        if (statement.replace(/^\s*--.*$/gm, '').trim()) await d1.prepare(statement).run();
      }
    }
    // lib/servers-db.ts の loadServers と同じ問い合わせ
    const db = drizzle(d1, { schema });
    const [serverRows, toolRows] = await db.batch([
      db.select().from(schema.servers),
      db.select().from(schema.tools),
    ]);
    return toServers(serverRows, toolRows, siteUrl);
  } finally {
    await mf.dispose();
  }
}
