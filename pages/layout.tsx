import { Link } from '@void/react';
import type { ReactNode } from 'react';
import '../styles/site.css';

export const GITHUB_URL = 'https://github.com/Kaaaaazuya';

/** 棚板と、そこに立つ道具を模したロゴマーク */
function ShelfMark() {
  return (
    <svg
      className="site-mark"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 7h16M3 13h16M3 19h16" />
      <path d="M6 7V3M10 7V4M15 13V9M7 19v-4" />
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link href="/" className="site-logo">
            <ShelfMark />
            mcp shelf
          </Link>
          <nav className="site-nav" aria-label="サイト">
            <Link href="/#servers">サーバー</Link>
            <Link href="/#connect">つなぎ方</Link>
            <a href={GITHUB_URL}>GitHub</a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container">
          <span>© 2026 Kazuya</span>
          <span>Void と Cloudflare Workers で動いています</span>
        </div>
      </footer>
    </>
  );
}
