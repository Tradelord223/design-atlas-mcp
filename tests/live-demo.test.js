import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { startHttp } from '../src/http.js';

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('live demo searches and inspects real motion images over MCP', { skip: !existsSync(chrome), timeout: 45000 }, async () => {
  const server = startHttp({ port: 0 });
  await once(server, 'listening');
  let browser;
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    const methods = [];
    page.on('request', req => {
      if (req.url() === origin + '/mcp' && req.method() === 'POST') methods.push(req.postDataJSON().method);
    });
    const shell = '<meta name="viewport" content="width=device-width,initial-scale=1"><section id="live-mcp" hidden></section><script type="module" src="/live-demo.js"></script>';
    await page.route(origin + '/demo', route => route.fulfill({ contentType: 'text/html', body: shell }));
    const js = await readFile(new URL('../web/live-demo.js', import.meta.url), 'utf8');
    await page.route(origin + '/live-demo.js', route => route.fulfill({ contentType: 'application/javascript', body: js }));
    await page.route(origin + '/hosting.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: 'export const hostedMcpUrl=' + JSON.stringify(origin + '/mcp')
    }));
    await page.goto(origin + '/demo');
    await page.getByLabel('What are you designing?').fill('opening imprint text reveal');
    await page.getByRole('button', { name: 'Run live search' }).click();
    const result = page.locator('.atlas-live-results article').filter({ hasText: 'An imprint comes into focus' });
    await result.getByRole('button', { name: 'Inspect reference' }).click();
    await result.getByText(/7 frames/).waitFor();
    assert.equal(await result.locator('img').count(), 7);
    assert.ok(await result.locator('img').first().evaluate(img => img.src.startsWith('data:image/png;base64,')));
    assert.deepEqual(methods, ['initialize','notifications/initialized','tools/call','tools/call']);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
