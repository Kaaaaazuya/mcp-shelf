import { Link } from '@void/react';
import { CopyBlock } from '../../components/CopyBlock';
import { Loaded } from '../../components/Loaded';
import { STATUS_LABELS, claudeAddCommand } from '../../lib/labels';
import { SELF_SLUG } from '../../lib/servers';
import { formatCount } from '../../lib/usage';
import type { Props } from './[slug].server';

export default function ServerDetail({ server, position, usage }: Props) {
  const entries = Object.entries(
    (server.config.mcpServers ?? {}) as Record<string, Record<string, unknown>>,
  );
  const [name, entry] = entries[0] ?? [server.slug, {}];

  return (
    <main className="container detail">
      <Link href="/" className="back-link">
        ← 棚に戻る
      </Link>
      <p className="detail-label mono">
        {String(position + 1).padStart(2, '0')} / {server.slug}
      </p>
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
          <dt>つなぎ方</dt>
          <dd className="mono">{server.transport}</dd>
        </div>
        <div>
          <dt>言語</dt>
          <dd>{server.language}</dd>
        </div>
        <div>
          <dt>ソースコード</dt>
          <dd>
            {server.repo ? (
              <a href={server.repo}>{server.repo.replace(/^https?:\/\//, '')}</a>
            ) : (
              'なし'
            )}
          </dd>
        </div>
        <div>
          <dt>30 日で読まれた回数</dt>
          <dd className="mono">
            <Loaded value={usage}>{(u) => formatCount(u.views)}</Loaded>
          </dd>
        </div>
      </dl>

      <div className="detail-body">
        <div className="detail-main">
          <h2>どんなサーバーか</h2>
          <p className="description">{server.description}</p>
          <h2>
            ツール <span className="count mono">{server.tools.length}</span>
          </h2>
          <p className="hint">
            名前を押すと入力の形（inputSchema）を開きます
            {server.slug === SELF_SLUG && '。右の数字は直近 30 日に呼ばれた回数です'}
          </p>
          <div className="tool-list">
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
        </div>
        <aside className="detail-side" aria-labelledby="connect-title">
          <h2 id="connect-title">つなぎ方</h2>
          <CopyBlock title="Claude Code に追加する" text={claudeAddCommand(name, entry)} />
          <CopyBlock
            title="設定ファイル（mcpServers）"
            text={JSON.stringify(server.config, null, 2)}
          />
        </aside>
      </div>
    </main>
  );
}
