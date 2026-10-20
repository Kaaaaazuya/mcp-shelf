// e2e: `npm run build` した成果物を `vite preview`（Miniflare 上の Worker とローカル D1）で立てて、HTTP と画面から確かめる。
// 先に `npm run build` と、ブラウザが無ければ `npx playwright install chromium` が要る。
// `vite dev` と違って `vite preview` は D1 のマイグレーションを流さないので、起動の前に流す。
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  // 呼び出し回数のようにサーバー側の状態を見るテストがあるので、1 本ずつ流す
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // 同梱のブラウザと版が合わない環境では、入っている Chromium を指定する
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `npx void db migrate && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
