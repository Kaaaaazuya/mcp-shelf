import { Link } from '@void/react';
import type { ReactNode } from 'react';
import '../styles/site.css';

export const GITHUB_URL = 'https://github.com/Kaaaaazuya';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="site-logo">
            mcp-portfolio
          </Link>
          <nav className="site-nav" aria-label="サイト">
            <Link href="/#servers">サーバー一覧</Link>
            <a href={GITHUB_URL}>GitHub</a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container">
          <span>© 2026 Kazuya</span>
          <span>Void + Cloudflare Workers で動いています</span>
        </div>
      </footer>
    </>
  );
}
