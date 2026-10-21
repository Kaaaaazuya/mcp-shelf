import { Link } from '@void/react';
import { CopyButton } from '../components/CopyButton';
import { Loaded } from '../components/Loaded';
import { McpConsole } from '../components/McpConsole';
import { STATUS_LABELS } from '../lib/labels';
import { formatCount } from '../lib/usage';
import type { Props } from './index.server';

export default function Home({ mcpUrl, servers, initialResponse, usage }: Props) {
  return (
    <main className="container">
      <section className="hero">
        <div className="hero-text">
          <p className="live">
            <span className="nowrap">● 稼働中 · この棚も MCP サーバーです</span>
            <span className="live-usage nowrap">
              直近 30 日の呼び出し{' '}
              <Loaded value={usage}>{(u) => <b>{formatCount(u.total)}</b>}</Loaded>
            </span>
          </p>
          <h1>
            <span>Claude につなぐ道具を、</span>
            <span>棚に並べています。</span>
          </h1>
          <p className="lead">
            Kazuya が作った MCP
            サーバーを、ツール定義と接続設定つきで置いています。この棚自体もリモート MCP
            サーバーなので、URL を Claude に渡せば同じ中身をそのまま読めます。
          </p>
          <div id="connect" className="connect">
            <label htmlFor="mcp-url">この棚を Claude につなぐ</label>
            <div className="connect-row">
              <input id="mcp-url" readOnly value={mcpUrl} />
              <CopyButton text={mcpUrl} className="btn" label="URL をコピー" />
            </div>
            <code className="connect-cmd">
              $ claude mcp add --transport http mcp-shelf {mcpUrl}
            </code>
          </div>
        </div>
        <McpConsole initialResponse={initialResponse} />
      </section>

      <section id="servers" className="servers" aria-labelledby="servers-title">
        <div className="section-head">
          <h2 id="servers-title">
            棚にあるサーバー <span className="count mono">{servers.length} 台</span>
          </h2>
          <span>「読まれた回数」は直近 30 日に get_server で詳細を取得された回数</span>
        </div>
        <ul className="server-list">
          {servers.map((s, i) => (
            <li key={s.slug}>
              <Link href={`/servers/${s.slug}`} className="server-row">
                <div className="server-label mono">
                  <span>
                    {String(i + 1).padStart(2, '0')} / {s.slug}
                  </span>
                  <span className={`status status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
                </div>
                <span className="server-name">{s.name}</span>
                <span className="server-summary">{s.summary}</span>
                <ul className="server-tools" aria-label="ツール">
                  {s.tools.map((t) => (
                    <li key={t} className="chip mono">
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="meta">
                  <span className="mono">{s.transport}</span>
                  <span>{s.language}</span>
                  <span className="views">
                    30 日で
                    <Loaded value={usage}>
                      {(u) => <b className="mono">{formatCount(u.views[s.slug] ?? 0)}</b>}
                    </Loaded>
                    読まれた<span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
