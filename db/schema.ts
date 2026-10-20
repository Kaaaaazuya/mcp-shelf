// 掲載データのテーブル定義。中身（行）は db/migrations/ のデータ用マイグレーションで入れる。

import { integer, primaryKey, sqliteTable, text } from 'void/schema-d1';

export const servers = sqliteTable('servers', {
  slug: text('slug').primaryKey(),
  /** 一覧での並び順（昇順） */
  position: integer('position').notNull(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  description: text('description').notNull(),
  transport: text('transport', { enum: ['stdio', 'streamable-http'] }).notNull(),
  language: text('language').notNull(),
  repo: text('repo'),
  status: text('status', { enum: ['active', 'experimental', 'archived'] }).notNull(),
  /** 接続設定の JSON。{{MCP_URL}} はこのサイトの /mcp の URL に置き換えて返す */
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
});

export const tools = sqliteTable(
  'tools',
  {
    serverSlug: text('server_slug')
      .notNull()
      .references(() => servers.slug, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** サーバー内での並び順（昇順） */
    position: integer('position').notNull(),
    description: text('description').notNull(),
    inputSchema: text('input_schema', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.serverSlug, t.name] })],
);

/** /mcp の tools/call を、日・ツール・slug ごとに数えた回数。slug は get_server が読んだサーバー（それ以外は ''） */
export const callCounts = sqliteTable(
  'call_counts',
  {
    /** UTC の日付（YYYY-MM-DD） */
    day: text('day').notNull(),
    tool: text('tool').notNull(),
    slug: text('slug').notNull().default(''),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.tool, t.slug] })],
);
