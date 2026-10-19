// vite.config.ts の Void プラグインは開発サーバーを立てるので、テストでは読み込まない
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
