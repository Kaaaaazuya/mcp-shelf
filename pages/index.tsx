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
            <span className="nowrap">● このサイトは MCP サーバーとして稼働中</span>
            <span className="live-usage nowrap">
              直近 30 日の呼び出し <Loaded value={usage}>{(u) => <b>{formatCount(u.total)}</b>}</Loaded>
            </span>
          </p>
          <h1>
            自作 MCP サーバーの
            <br />
            ポートフォリオ
          </h1>
          <p className="lead">
            作った MCP サーバーを、ツール定義と接続設定つきで載せています。サイト自体もリモート MCP
            サーバーなので、Claude に URL を渡すだけで同じ内容を読めます。
          </p>
          <div className="connect">
            <label htmlFor="mcp-url">接続 URL（Streamable HTTP）</label>
            <div className="connect-row">
              <input id="mcp-url" readOnly value={mcpUrl} />
              <CopyButton text={mcpUrl} className="btn" />
            </div>
            <code className="connect-cmd">claude mcp add --transport http portfolio {mcpUrl}</code>
          </div>
        </div>
        <McpConsole initialResponse={initialResponse} />
      </section>

      <section id="servers" className="servers" aria-labelledby="servers-title">
        <div className="section-head">
          <h2 id="servers-title">サーバー一覧</h2>
          <span>{servers.length} 件 · 参照回数は直近 30 日に get_server で読まれた回数</span>
        </div>
        <ul className="server-list">
          {servers.map((s) => (
            <li key={s.slug}>
              <Link href={`/servers/${s.slug}`} className="server-row">
                <div className="server-main">
                  <span className="server-name">{s.name}</span>
                  <span className="server-summary">{s.summary}</span>
                  <span className="server-tools mono">{s.tools.join(' · ')}</span>
                </div>
                <div className="meta">
                  <span className={`status status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
                  <span className="mono">{s.transport}</span>
                  <span>{s.language}</span>
                  <span className="views">
                    参照 <Loaded value={usage}>{(u) => <b className="mono">{formatCount(u.views[s.slug] ?? 0)}</b>}</Loaded>
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
