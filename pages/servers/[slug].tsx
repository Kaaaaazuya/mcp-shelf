import { Link } from '@void/react';
import { CopyBlock } from '../../components/CopyBlock';
import { Loaded } from '../../components/Loaded';
import { STATUS_LABELS, claudeAddCommand } from '../../lib/labels';
import { SELF_SLUG } from '../../lib/servers';
import { formatCount } from '../../lib/usage';
import type { Props } from './[slug].server';

export default function ServerDetail({ server, usage }: Props) {
  const entries = Object.entries((server.config.mcpServers ?? {}) as Record<string, Record<string, unknown>>);
  const [name, entry] = entries[0] ?? [server.slug, {}];

  return (
    <main className="container detail">
      <Link href="/" className="back-link">
        ← 一覧に戻る
      </Link>
      <h1>{server.name}</h1>
      <p className="lead">{server.summary}</p>

      <dl className="facts">
        <div>
          <dt>状態</dt>
          <dd>
            <span className={`status status-${server.status}`}>{STATUS_LABELS[server.status]}</span>
          </dd>
        </div>
        <div>
          <dt>トランスポート</dt>
          <dd className="mono">{server.transport}</dd>
        </div>
        <div>
          <dt>言語</dt>
          <dd>{server.language}</dd>
        </div>
        <div>
          <dt>リポジトリ</dt>
          <dd>{server.repo ? <a href={server.repo}>{server.repo.replace(/^https?:\/\//, '')}</a> : 'なし'}</dd>
        </div>
        <div>
          <dt>参照（直近 30 日）</dt>
          <dd className="mono">
            <Loaded value={usage}>{(u) => formatCount(u.views)}</Loaded>
          </dd>
        </div>
      </dl>

      <div className="detail-body">
        <div className="detail-main">
          <p className="description">{server.description}</p>
          <h2>ツール</h2>
          <p className="hint">
            {server.tools.length} 件。名前を押すと inputSchema を開閉します
            {server.slug === SELF_SLUG && '。右の数字は直近 30 日に呼ばれた回数です'}
          </p>
          {server.tools.map((tool) => (
            <details key={tool.name} className="tool">
              <summary>
                <span className="tool-name">{tool.name}</span>
                <span className="tool-desc">{tool.description}</span>
                {server.slug === SELF_SLUG && (
                  <span className="tool-calls mono">
                    <Loaded value={usage}>{(u) => formatCount(u.tools?.[tool.name] ?? 0)}</Loaded>
                  </span>
                )}
              </summary>
              <pre className="codeblock">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
            </details>
          ))}
        </div>
        <aside className="detail-side" aria-label="接続設定">
          <CopyBlock title="Claude Code で追加" text={claudeAddCommand(name, entry)} />
          <CopyBlock title="mcpServers 設定" text={JSON.stringify(server.config, null, 2)} />
        </aside>
      </div>
    </main>
  );
}
