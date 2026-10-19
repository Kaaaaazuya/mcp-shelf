import { voidReact } from '@void/react/plugin';
import { defineConfig } from 'vite';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin(), voidReact()],
  // 開発サーバーの CORS ミドルウェアが preflight に先に答えてしまうので切り、routes/mcp.ts の OPTIONS に任せる
  server: { cors: false },
});
