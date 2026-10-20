import { expect, test } from '@playwright/test';

// 「直近 30 日の呼び出し」の合計。defer で後から届くので、数字が出るまで待つ
async function totalCalls(page: import('@playwright/test').Page) {
  const total = page.locator('.live-usage b');
  await expect(total).toHaveText(/^[\d,]+ 回$/);
  return Number((await total.innerText()).replace(/[^\d]/g, ''));
}

test('トップに接続 URL と掲載サーバーが並ぶ', async ({ page, baseURL }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ポートフォリオ');
  await expect(page.locator('#mcp-url')).toHaveValue(`${baseURL}/mcp`);
  await expect(page.locator('.server-row')).toHaveCount(2);
});

test('一覧から詳細に進み、一覧に戻れる', async ({ page }) => {
  await page.goto('/');
  await page.locator('.server-row', { hasText: 'AgentGuard' }).click();
  await expect(page).toHaveURL(/\/servers\/agentguard/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AgentGuard');
  await page.getByRole('link', { name: /一覧に戻る/ }).click();
  await expect(page).toHaveURL('/');
});

test('存在しない slug は 404', async ({ page }) => {
  const res = await page.goto('/servers/nope');
  expect(res?.status()).toBe(404);
});

test('MCP を呼ぶとトップの呼び出し回数が増える', async ({ page, request }) => {
  await page.goto('/');
  const before = await totalCalls(page);
  const res = await request.post('/mcp', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'list_servers', arguments: {} },
    },
  });
  expect(res.ok()).toBe(true);
  await page.reload();
  expect(await totalCalls(page)).toBe(before + 1);
});
