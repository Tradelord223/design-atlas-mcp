import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createImageAtlas } from '../src/image-atlas.js';

const chrome=process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test('a published edition links map selections and chapters, restores its URL and runs on a phone', {skip:!existsSync(chrome),timeout:30000}, async () => {
  const brief=JSON.parse(readFileSync(new URL('../examples/strata-edition.json',import.meta.url),'utf8'));
  const photo={src:'https://edition.test/image.svg',alt:'Test cover'};
  const html=createImageAtlas({...brief,image:photo,chapters:brief.chapters.map(chapter=>({...chapter,image:photo}))}).html;
  const browser=await chromium.launch({executablePath:chrome});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://edition.test/**',route=>route.request().url().endsWith('.svg')
      ? route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><rect width="100%" height="100%" fill="#284938"/></svg>'})
      : route.fulfill({contentType:'text/html',body:html}));
    await page.goto('https://edition.test/');
    await page.locator('[data-reading-marker="ndvi"]').click();
    assert.ok((await page.locator('[data-reading-tab="moisture"]').innerText()).includes('34.2%'));
    assert.equal(await page.locator('[data-reading-tab="ndvi"]').getAttribute('aria-selected'),'true');
    assert.ok(await page.locator('[data-reading-detail="ndvi"]').isVisible());
    await page.locator('[data-reading-tab="ndvi"]').focus();await page.keyboard.press('ArrowRight');
    assert.ok(await page.locator('[data-reading-detail="canopy"]').isVisible());
    await page.locator('[data-chapter="leaf"]').click();
    assert.ok(await page.locator('[data-chapter-detail="leaf"]').isVisible());
    const share=page.url();assert.ok(share.includes('canopy')&&share.includes('leaf'));
    await page.reload();
    assert.ok(await page.locator('[data-chapter-detail="leaf"]').isVisible());
    assert.equal(await page.locator('[data-reading-tab="canopy"]').getAttribute('aria-selected'),'true');
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-reading-tab="moisture"]').click();
    assert.ok(await page.locator('[data-reading-detail="moisture"]').isVisible());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    assert.deepEqual(errors,[]);
  } finally {await browser.close()}
});
