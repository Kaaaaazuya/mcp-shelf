// サーバー側の環境変数。ローカルは .env、本番は `npx void secret put <名前>` で入れる。

import { defineEnv, string } from 'void/env';

export default defineEnv({
  /** /mcp で違反した IP を KV に記録するときの HMAC の鍵。IP そのものは保存しない（lib/penalty.ts） */
  IP_HASH_SECRET: string(),
});
