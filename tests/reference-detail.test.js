import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { applyReferenceDetail } from '../src/reference-detail.js';
import { inspectReference } from '../src/evidence.js';
import { searchLibrary } from '../src/search.js';

const html = ` \n<section><p id="original-help">Open the existing record for the complete explanation.</p><button type="button" class="reading water" aria-describedby="original-help">Water level</button><button class="reading light" type="button">Daylight</button><output aria-live="polite"></output></section>\n `;
const notes = [
  { selector: '.reading.water', title: 'Water record', body: 'An observation from the north plot. Its inspection action contains the complete record.' },
  { selector: 'button.light', title: 'Daylight record', body: 'A caller-supplied observation window.' }
];
const make = overrides => applyReferenceDetail({ referenceId: 'anchored-field-note', html, notes, ...overrides });

test('one supported reference generates scoped assets and preserves caller markup byte for byte', () => {
  const result = make();
  assert.equal(result.html, html);
  assert.equal(result.preservation.rewrittenElements, 0);
  assert.equal(result.matchedCount, 2);
  assert.deepEqual(result.matchedTargets.map(target => target.count), [1, 1]);
  assert.equal(result.matchedTargets[0].targets[0].labelText, 'Water level');
  assert.match(result.css, /prefers-reduced-motion/);
  assert.match(result.javascript, /textContent/);
  assert.ok(result.contrast.passes);
  assert.equal(result.reference.version, inspectReference({ id: 'anchored-field-note', includeImages: false }).data.version);
  assert.equal(searchLibrary({ query: 'existing site contextual tooltip' }).results[0].id, 'anchored-field-note');
  assert.throws(() => make({ referenceVersion: 'stale' }), /version changed/);
  assert.throws(() => make({ referenceId: 'different-pattern' }), /supports the anchored-field-note/);
});

test('selectors, counts, target semantics and color inputs are validated before generation', () => {
  for (const selector of ['button,script', '.reading:hover', '.reading [type=button]', 'button:nth-child(1)', 'button>span', '', '#x);alert(1)//']) {
    assert.throws(() => make({ notes: [{ ...notes[0], selector }] }), /selector|tag|ID|class|compound/);
  }
  assert.throws(() => make({ notes: [{ ...notes[0], selector: '.reading' }] }), /matched 2 elements/);
  assert.throws(() => make({ notes: [notes[0], notes[0]] }), /more than one/);
  assert.throws(() => make({ notes: [{ ...notes[0], selector: '.absent' }] }), /matched 0/);
  assert.throws(() => make({ html: '<div class="reading water">Water</div>', notes: [notes[0]] }), /not already keyboard focusable/);
  assert.throws(() => make({ html: '<button disabled class="reading water">Water</button>', notes: [notes[0]] }), /not already keyboard focusable/);
  assert.throws(() => make({ html: '<section hidden><button class="reading water">Water</button></section>', notes: [notes[0]] }), /not already keyboard focusable/);
  assert.throws(() => make({ appearance: { background: '#ffffff', text: '#ffff00' } }), /contrast/);
  assert.throws(() => make({ appearance: { accent: 'red;display:none' } }), /hexadecimal/);
  assert.throws(() => make({ appearance: { other: '#ffffff' } }), /Appearance supports/);
});

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test('generated behavior retains existing actions, keyboard focus, hoverability, touch and layout', { skip: !existsSync(chrome), timeout: 30000 }, async () => {
  const contextText = '</script><script>window.noteInjection=true</script> & exact caller text';
  const result = make({ notes: [{ ...notes[0], body: contextText }, notes[1]] });
  assert.ok(!result.javascript.includes('</script>'));
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 650 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.setContent('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><style>body{padding:180px 80px}button{padding:14px;margin:10px}</style><body>' + html + '<script>window.clicks=0;window.escapes=0;document.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{window.clicks++;document.querySelector("output").textContent="Original record opened"}));document.addEventListener("keydown",e=>{if(e.key==="Escape")window.escapes++});</script></body></html>');
    const before = await page.locator('.water').boundingBox();
    const tabStops = await page.locator('button,a[href],input,[tabindex]').count();
    await page.addStyleTag({ content: result.css });
    await page.addScriptTag({ content: result.javascript });
    assert.deepEqual(await page.locator('.water').boundingBox(), before);
    assert.equal(await page.locator('button,a[href],input,[tabindex]').count(), tabStops);
    await page.locator('.water').focus();
    const note = page.getByRole('tooltip');
    await note.waitFor({ state: 'visible' });
    assert.equal(await note.locator('p').textContent(), contextText);
    assert.equal(await page.evaluate(() => window.noteInjection), undefined);
    assert.match(await page.locator('.water').getAttribute('aria-describedby'), /^original-help atlas-field-note-/);
    assert.equal(await page.evaluate(() => document.activeElement.className), 'reading water');
    await page.keyboard.press('Escape');
    assert.equal(await note.isVisible(), false);
    assert.equal(await page.locator('.water').getAttribute('aria-describedby'), 'original-help');
    assert.equal(await page.evaluate(() => window.escapes), 1);
    assert.equal(await page.evaluate(() => document.activeElement.className), 'reading water');
    await page.locator('.water').click();
    assert.equal(await page.evaluate(() => window.clicks), 1);
    assert.equal(await page.locator('output').textContent(), 'Original record opened');
    await page.locator('.light').focus();
    await page.locator('.light').blur();
    await page.mouse.move(20, 20);
    await page.locator('.water').hover();
    await note.waitFor({ state: 'visible' });
    await note.hover();
    await page.waitForTimeout(220);
    assert.equal(await note.isVisible(), true);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(220);
    assert.equal(await note.isVisible(), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.water').focus();
    assert.equal(await note.evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.locator('.water').evaluate(el => el.setAttribute('aria-describedby', el.getAttribute('aria-describedby') + ' external-late-description'));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.water').getAttribute('aria-describedby'), 'original-help external-late-description');
    await page.evaluate(id => window[Symbol.for('design-atlas.field-notes')].get(id).setEnabled(false), result.controller.id);
    await page.locator('.light').focus();
    assert.equal(await note.isVisible(), false);
    await page.evaluate(id => window[Symbol.for('design-atlas.field-notes')].get(id).setEnabled(true), result.controller.id);
    await page.locator('.water').focus();
    assert.equal(await note.isVisible(), true);
    await page.evaluate(id => window[Symbol.for('design-atlas.field-notes')].get(id).dismiss(), result.controller.id);
    assert.equal(await note.isVisible(), false);
    await page.locator('.light').focus();
    assert.equal(await note.isVisible(), true);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await note.isVisible(), false);
    assert.equal(await page.locator('.light').getAttribute('aria-describedby'), null);
    await page.addScriptTag({ content: result.javascript });
    assert.equal(await page.locator('[role=tooltip]').count(), 1);
    await page.locator('.water').click();
    assert.equal(await page.evaluate(() => window.clicks), 2);
    await page.locator('.water').evaluate(el => { const replacement = el.cloneNode(true); el.replaceWith(replacement); replacement.addEventListener('click', () => window.clicks++); });
    await page.addScriptTag({ content: result.javascript });
    await page.locator('.water').focus();
    assert.equal(await note.isVisible(), true);
    await page.locator('.water').click();
    assert.equal(await page.evaluate(() => window.clicks), 3);
    await page.evaluate(id => window[Symbol.for('design-atlas.field-notes')].get(id).destroy(), result.controller.id);
    assert.equal(await page.locator('[role=tooltip]').count(), 0);
    await page.locator('.water').click();
    assert.equal(await page.evaluate(() => window.clicks), 4);

    const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await touch.setContent('<!doctype html><meta name="viewport" content="width=device-width"><body>' + html + '<script>window.taps=0;document.querySelector(".water").addEventListener("click",()=>window.taps++)</script>');
    await touch.addStyleTag({ content: result.css });
    await touch.addScriptTag({ content: result.javascript });
    await touch.locator('.water').tap();
    assert.equal(await touch.evaluate(() => window.taps), 1);
    assert.equal(await touch.getByRole('tooltip').isVisible(), false);
    assert.equal(await touch.locator('.water').getAttribute('aria-describedby'), 'original-help');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('aperture export targets a unique existing media layer and runs without a page scaffold', async () => {
  const html = '<section id="cover"><div class="photo"></div><a href="#charts">Field readings</a></section><section id="charts">Charts</section>';
  const hero = {hostSelector:'#cover', mediaSelector:'.photo', treatment:'horizon', duration:1200};
  const apply = overrides => applyReferenceDetail({html, referenceId:'aperture-hero-reveal', hero, ...overrides});
  const exported = apply();
  assert.equal(exported.html, html);
  assert.deepEqual(exported.matchedTargets.map(t => t.tag), ['section','div']);
  assert.equal(exported.reference.version, inspectReference({id:'aperture-hero-reveal',includeImages:false}).data.version);
  assert.throws(() => apply({referenceVersion:'stale'}), /version changed/);
  assert.throws(() => apply({html:html.replace('class="photo"></div>', 'class="photo"><button>Sensor</button></div>')}), /dedicated image/);
  assert.throws(() => apply({hero:{...hero,mediaSelector:'#charts'}}), /descendant/);
  assert.throws(() => apply({html:html.replace('</div>', '</div><img class="photo">')}), /Matched 2/);
  assert.throws(() => apply({hero:{...hero,treatment:'arbitrary'}}), /Choose/);
  if (!existsSync(chrome)) return;
  const browser = await chromium.launch({executablePath:chrome, headless:true});
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.evaluate(async code => {
      const url = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
      try { window.reveal = (await import(url)).attachHeroReveal(); } finally { URL.revokeObjectURL(url); }
    }, exported.javascript);
    assert.equal(await page.evaluate(() => window.reveal.state), 'idle');
    assert.equal(await page.evaluate(() => window.reveal.play()), true);
    assert.match(await page.locator('.photo').evaluate(el => el.getAnimations()[0].effect.getKeyframes()[0].clipPath), /46% 8%/);
    assert.equal(await page.getByRole('link').evaluate(el=>el.getAnimations().length), 0);
    await page.getByRole('link').click();
    assert.equal(await page.evaluate(()=>location.hash), '#charts');
    await page.evaluate(()=>window.reveal.skip());
    assert.equal(await page.locator('.photo').evaluate(el=>el.style.willChange), '');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>window.reveal.play()), false);
    await page.evaluate(()=>window.reveal.destroy());
  } finally { await browser.close(); }
});
