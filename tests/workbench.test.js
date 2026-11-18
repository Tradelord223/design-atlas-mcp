import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { buildWorkbench } from '../scripts/workbench.js';
import { contrastRatio } from '../src/brand.js';

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('built workbench generates a different brand, downloads usable files, and reflows on mobile', { skip: !existsSync(chrome), timeout: 60000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-workbench-'));
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = join(directory, pathname === '/' ? 'workbench.html' : pathname);
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
      response.setHeader('Content-Type', types[extname(file)] || 'text/plain');
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  let browser;
  try {
    await buildWorkbench(new URL(`file://${directory}/`));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const errors = [];
    const externalRequests = [];
    page.on('pageerror', failure => errors.push(failure.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && !request.url().startsWith(origin)) externalRequests.push(request.url());
    });
    await page.goto(`${origin}/workbench.html`);
    await page.locator('#kit-details').waitFor({ state: 'visible' });
    assert.match(await page.locator('#result-status').textContent(), /Morrow/);
    await page.locator('.identity-import > summary').click();
    await page.locator('#identity-html').fill('<meta property="og:site_name" content="Imported Studio"><meta name="description" content="Meeting notes for careful teams."><script>fetch("https://invalid.example/")</script>');
    await page.locator('#identity-css').fill(':root { --accent: #ffff00; --font-body: "Avenir Next", sans-serif; --radius: .5rem; }');
    await page.getByRole('button', { name: 'Read brand identity' }).click();
    assert.equal(await page.locator('#brand-name').inputValue(), 'Imported Studio');
    assert.ok((await page.locator('#generated-code').textContent()).includes('--radius: .5rem'));
    await page.frameLocator('#brand-preview').getByRole('heading', { name: 'Imported Studio', exact: true }).waitFor();
    await page.locator('#brand-name').fill('Harbor Ledger');
    await page.locator('#brand-description').fill('Banking, accounting, and clear budget tracking for small businesses.');
    await page.locator('#brand-headline').fill('Know where the money goes.');
    await page.locator('#brand-accent').fill('#ffff00');
    await page.getByRole('button', { name: 'Build the kit' }).click();
    assert.equal(await page.locator('#direction-title').textContent(), 'Financial clarity');
    await page.frameLocator('#brand-preview').getByRole('heading', { name: 'Know where the money goes.' }).waitFor();
    assert.equal(await page.locator('.swatch').count(), 5);
    const rendered = await page.frameLocator('#brand-preview').locator('body').evaluate(body => {
      const hex = color => '#' + color.match(/\d+/g).slice(0, 3).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
      const action = body.querySelector('a.button');
      action.focus();
      return {
        background: hex(getComputedStyle(body).backgroundColor),
        link: hex(getComputedStyle(body.querySelector('nav a')).color),
        actionBackground: hex(getComputedStyle(action).backgroundColor),
        actionText: hex(getComputedStyle(action).color),
        focus: hex(getComputedStyle(action).outlineColor)
      };
    });
    assert.ok(contrastRatio(rendered.link, rendered.background) >= 4.5);
    assert.ok(contrastRatio(rendered.actionBackground, rendered.background) >= 3);
    assert.ok(contrastRatio(rendered.actionText, rendered.actionBackground) >= 4.5);
    assert.ok(contrastRatio(rendered.focus, rendered.background) >= 3);
    for (const type of ['html', 'css', 'tokens']) {
      const waiting = page.waitForEvent('download');
      await page.locator(`[data-download="${type}"]`).click();
      const download = await waiting;
      const content = await readFile(await download.path(), 'utf8');
      if (type === 'html') assert.ok(content.includes('Harbor Ledger'));
      if (type === 'css') assert.ok(content.includes('--accent: #ffff00'));
      if (type === 'tokens') assert.equal(JSON.parse(content).colors.accent, '#ffff00');
    }
    await page.getByRole('button', { name: 'Mobile', exact: true }).click();
    assert.equal(await page.locator('#mobile-preview').getAttribute('aria-pressed'), 'true');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
