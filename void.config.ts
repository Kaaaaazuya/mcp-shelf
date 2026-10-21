import { defineConfig } from 'void/config';

export default defineConfig({
  cloudflare: {
    // 公開先の設定。書かないと Void は Cloudflare 側の現在値を引き継ごうとし、引き継ぎ元の記録がないと
    // 「dashboard-managed routes or visibility」で止まる。独自ドメインを割り当てたら routes に足す
    workers_dev: true,
    preview_urls: true,
    routes: [],
    // POST /mcp の IP 単位のレート制限（lib/rate-limit.ts の RATE_LIMIT と同じ値にする）。
    // namespace_id はアカウント内で一意な正の整数。同じ値のバインディングはカウンターを共有する
    ratelimits: [
      { name: 'MCP_RATE_LIMITER', namespace_id: '1001', simple: { limit: 20, period: 60 } },
    ],
  },
  head: {
    titleTemplate: '%s | mcp-portfolio',
    htmlAttrs: { lang: 'ja' },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
      },
    ],
  },
});
