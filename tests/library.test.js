import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { patterns, packs, flows } from '../src/library.js';
import { specimenDocument } from '../src/catalog.js';

test('all library cross-references resolve and scripts parse', () => {
  const ids = new Set(patterns.map(p => p.id));
  assert.equal(ids.size, patterns.length);
  for (const pack of packs) for (const id of pack.patterns) assert.ok(ids.has(id), id);
  for (const flow of flows) for (const step of flow.steps) assert.ok(ids.has(step.pattern), step.pattern);
  for (const pattern of patterns) if (pattern.js) assert.doesNotThrow(() => new Function(pattern.js), pattern.id);
});

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test('local studies support concrete user workflows in Chromium', {skip: !existsSync(chrome)}, async () => {
  const browser = await chromium.launch({executablePath:chrome,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [];
    page.on('pageerror',error => errors.push(error.message));
    const load = async id => { await page.goto('about:blank'); await page.setContent(specimenDocument(patterns.find(p=>p.id===id))); };
    await load('command-launcher');
    await page.getByLabel('Search commands').fill('projects');
    assert.equal(await page.locator('.row:visible').count(),1);
    await page.getByLabel('Search commands').press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Open projects');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('[role=status]').textContent(),/Selected Open projects/);

    await load('cart-edit');
    await page.getByLabel('Quantity').fill('3');
    assert.equal(await page.locator('.card strong').textContent(),'$144.00');
    await page.getByRole('button',{name:'Remove vessel'}).click();
    assert.ok(await page.getByText('Your bag is empty.').isVisible());
    await page.getByRole('button',{name:'Undo removal'}).click();
    assert.ok(await page.getByLabel('Quantity').isVisible());

    await load('plan-comparison');
    await page.getByRole('button',{name:'Annual',exact:true}).click();
    assert.equal(await page.locator('.price').first().textContent(),'$120/year');
    await page.getByRole('button',{name:'Choose Studio'}).click();
    assert.match(await page.locator('[role=status]').textContent(),/annually/);

    await load('calm-onboarding');
    await page.getByLabel('Notebook name').fill('Collection');
    await page.getByRole('button',{name:'Create notebook'}).click();
    await page.getByLabel('First note').fill('Review the glaze samples.');
    await page.getByRole('button',{name:'Save note'}).click();
    assert.match(await page.locator('[role=status]').textContent(),/Note saved/);

    await load('error-recovery');
    await page.getByLabel('Email address').fill('mira@example.org');
    await page.getByRole('button',{name:'Check address'}).click();
    assert.ok(await page.getByRole('heading',{name:'Email address accepted'}).isVisible());
    assert.equal(await page.getByLabel('Email address').getAttribute('aria-invalid'),null);

    await load('destructive-confirmation');
    await page.getByRole('button',{name:'Keep active'}).click();
    assert.ok(await page.getByRole('heading',{name:'Project kept active'}).isVisible());
    await load('destructive-confirmation');
    await page.getByRole('button',{name:'Archive project'}).click();
    assert.ok(await page.getByRole('heading',{name:'Project archived in this demo'}).isVisible());

    await load('mobile-onboarding');
    await page.getByRole('button',{name:'Set this later'}).click();
    await page.getByLabel('What would you like to notice?').fill('Small daily improvements');
    await page.getByRole('button',{name:'Finish setup'}).click();
    assert.ok(await page.getByRole('heading',{name:'You’re ready'}).isVisible());

    for (const pattern of patterns.filter(p=>p.js)) {
      await load(pattern.id);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),pattern.id+' horizontal overflow');
    }
    assert.deepEqual(errors,[]);
    await page.close();
  } finally {
    await browser.close();
  }
});
