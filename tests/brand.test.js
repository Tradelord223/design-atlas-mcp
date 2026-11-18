import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrandKit, auditDesign, contrastRatio } from '../src/brand.js';
import { getIcon, searchIcons, iconPacks } from '../src/icons.js';
import { packs } from '../src/catalog.js';

test('brand kit escapes user content and computes accessible action text', () => {
  const kit = buildBrandKit({ name: '<script>alert(1)</script>', description: 'A quiet note-taking product for research teams.', accent: '#ffff00' });
  assert.ok(!kit.html.includes('<script>'));
  assert.ok(kit.html.includes('&lt;script&gt;'));
  assert.ok(kit.accessibility.contrast.every(pair => pair.passes));
  assert.ok(kit.implementation.files.find(file => file.path === 'index.html').content.startsWith('<!doctype html>'));
  assert.ok(kit.selectedPack.id);
});

test('brief chooses a relevant pack and returns sourced reusable components', () => {
  const kit = buildBrandKit({ name: 'North Ledger', description: 'Banking and accounting for small businesses.' });
  assert.equal(kit.selectedPack.id, 'financial-clarity');
  assert.ok(kit.components.length > 0);
  assert.ok(kit.html.includes('brand-example'));
  assert.ok(kit.components.every(component => component.sourceUrl));
});

test('brand inputs reject invalid colors and missing pack identifiers', () => {
  assert.throws(() => buildBrandKit({ name: 'New', description: 'Brand', accent: 'red; background: url(x)' }), /six-digit/);
  assert.throws(() => buildBrandKit({ name: 'New', description: 'Brand', packId: '../../' }), /Unknown design pack/);
  assert.throws(() => buildBrandKit({ name: '', description: 'Brand' }), /nonempty/);
});

test('every pack produces a usable specimen with body contrast', () => {
  for (const pack of packs) {
    const kit = buildBrandKit({ name: 'Example', description: 'A product with clear priorities.', packId: pack.id });
    assert.equal(kit.selectedPack.id, pack.id);
    assert.ok(kit.html.includes('prefers-reduced-motion'));
    assert.ok(kit.html.includes('href="#main"'));
    assert.ok(contrastRatio(kit.tokens.colors.text, kit.tokens.colors.background) >= 4.5);
  }
});

test('audit reports evidence for concrete markup regressions', () => {
  const result = auditDesign({ html: '<html><img src="photo.png"><button><svg></svg></button><a href="/docs">Click here</a></html>', css: 'button:focus{outline:none}.card{transition:transform 200ms}', copy: 'Our revolutionary seamless product' });
  for (const id of ['image-alt', 'button-name', 'document-language', 'viewport', 'focus-indicator', 'reduced-motion', 'link-purpose', 'generic-copy']) {
    assert.ok(result.issues.some(issue => issue.id === id), id);
  }
  assert.match(result.scope, /Static/);
  assert.throws(() => auditDesign({}), /Provide/);
});

test('offline icon catalogs are complete, paginated, and path safe', () => {
  assert.ok(iconPacks.length >= 3);
  for (const family of iconPacks) {
    const first = searchIcons({ pack: family.id, limit: 2 });
    const second = searchIcons({ pack: family.id, limit: 2, offset: 2 });
    assert.equal(first.total, family.count);
    assert.equal(first.items.length, 2);
    assert.notEqual(first.items[0].name, second.items[0].name);
    const icon = getIcon({ pack: family.id, name: first.items[0].name });
    assert.match(icon.svg, /<svg/);
    assert.match(icon.licenseText, /Copyright/);
  }
  assert.throws(() => getIcon({ pack: 'lucide', name: '../../package' }), /Unknown icon/);
  assert.throws(() => searchIcons({ limit: -1 }), /limit/);
  assert.throws(() => searchIcons({ pack: '../' }), /Unknown icon pack/);
});
