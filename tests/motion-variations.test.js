import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {remix} from '../src/remix.js';
import {inspectReference} from '../src/evidence.js';
import {searchLibrary} from '../src/search.js';

const ids = ['opening-imprint', 'service-fold', 'press-ticket', 'reading-tide', 'aperture-hero-reveal', 'plate-index', 'directional-link'];
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('a motion selection reproduces the source HTML with the chosen, reference-specific treatment', () => {
  for (const id of ids) {
    const args = {ids:[id], mode:'variations'};
    const comparison = remix(args);
    assert.equal(comparison.scope, 'motion');
    assert.equal(comparison.variants.length, 4);
    assert.equal(comparison.version, inspectReference({id,includeImages:false}).data.version);
    const original = remix({ids:[id], mode:'rebuild'}).html;
    for (const variant of comparison.variants) {
      const selected = remix({...args, variant:variant.id});
      assert.deepEqual(selected.selected, variant);
      assert.equal(selected.html.replace(variant.css,''),original);
    }
    assert.throws(() => remix({...args, variant:'missing'}), /variant IDs/);
  }
  assert.equal(remix({ids:['service-fold'],mode:'variations'}).variants[0].id, 'short-lift');
  assert.equal(remix({ids:['meeting-note'],mode:'variations'}).variants.length, 3);
  assert.throws(() => remix({ids:['meeting-note'],mode:'rebuild',variant:'print-measure'}), /variations mode/);
});

test('Vault navigation previews on focus, follows destinations and preserves native disclosure', {skip:!existsSync(chrome)}, async () => {
  const browser = await chromium.launch({executablePath:chrome});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    const hits=searchLibrary({query:'destination preview navigation dropdown'}).results;
    assert.equal(hits[0].id,'plate-index');
    await page.setContent(remix({ids:['plate-index'],mode:'rebuild'}).html);
    await page.locator('summary').click();
    const link=page.getByRole('link', {name:/The estuary/});
    await link.focus();
    assert.ok(await page.locator('[data-plate-thumb=estuary]').isVisible());
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('summary').evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Enter');
    await link.click();
    assert.ok(await page.locator('#atlas-estuary').isVisible());
    assert.equal(await page.locator('details').getAttribute('open'),null);
    assert.ok(await page.locator('#atlas-estuary').evaluate(el=>el===document.activeElement));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setContent(remix({ids:['press-ticket'],mode:'variations',variant:'hinge'}).html);
    const button=page.getByRole('button',{name:'Hold berth'});
    await button.click();
    assert.equal(await page.getByRole('button',{name:'Release berth'}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.stub').evaluate(el=>getComputedStyle(el,'::after').transform),'none');
    assert.deepEqual(errors,[]);
  } finally {await browser.close()}
});


test('the original reveal has no stagger delay under reduced motion', {skip:!existsSync(chrome)}, async () => {
  const browser = await chromium.launch({executablePath:chrome});
  try {
    const page = await browser.newPage({reducedMotion:'reduce'});
    await page.setContent(remix({ids:['opening-imprint'],mode:'rebuild'}).html);
    const timing = await page.locator('.imprint h2 b').evaluateAll(lines=>lines.map(line=>({delay:getComputedStyle(line).animationDelay,transitionDelay:getComputedStyle(line).transitionDelay})));
    assert.deepEqual(timing,[{delay:'0s',transitionDelay:'0s'},{delay:'0s',transitionDelay:'0s'}]);
    await page.waitForTimeout(40);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(animation=>animation.playState==='running').length),0);
    assert.ok(await page.locator('.imprint h2 b').evaluateAll(lines=>lines.every(line=>new DOMMatrix(getComputedStyle(line).transform).m42===0)));
  } finally {await browser.close()}
});

test('a destination chosen inside a hosted comparison stays inside the specimen', {skip:!existsSync(chrome)}, async () => {
  const browser = await chromium.launch({executablePath:chrome});
  try {
    const page = await browser.newPage();
    const comparison = remix({ids:['plate-index'],mode:'variations'}).html;
    await page.route('https://atlas.test/**', route => route.fulfill({contentType:'text/html',body:comparison}));
    await page.goto('https://atlas.test/comparison');
    const study = page.frameLocator('iframe').first();
    await study.locator('summary').click();
    await study.getByRole('link',{name:/The basin/}).focus();
    await page.keyboard.press('Enter');
    await study.locator('#atlas-basin').waitFor({state:'visible'});
    assert.equal(await study.locator('#atlas-basin').evaluate(el=>el.ownerDocument.URL), 'about:srcdoc#atlas-basin');
    assert.equal(page.url(), 'https://atlas.test/comparison');
  } finally {await browser.close()}
});
