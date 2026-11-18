import test from 'node:test';
import assert from 'node:assert/strict';
import { importBrandIdentity } from '../src/identity.js';
import { buildBrandKit, contrastRatio } from '../src/brand.js';

test('identity uses supplied metadata and resolves declared custom property chains', () => {
  const identity = importBrandIdentity({ html: '<title>Harbor — Home</title><meta property="og:site_name" content="Harbor &amp; Co"><meta name="description" content="Bookkeeping for independent shops."><meta name="theme-color" content="#ffffff"><style>:root { --gold: #fc3; --brand-accent: var(--gold); --font-body: "Avenir Next", sans-serif; --font-display: var(--display, Georgia, serif); --radius: 0.5rem; --background: #fff; --text: #222; } h1 { font-family: var(--font-display); }</style>' });
  assert.equal(identity.brief.name, 'Harbor & Co');
  assert.equal(identity.brief.accent, '#ffcc33');
  assert.equal(identity.brief.typography.heading, 'Georgia, serif');
  assert.equal(identity.brief.typography.body, '"Avenir Next", sans-serif');
  assert.equal(identity.brief.radius.control, '0.5rem');
  assert.ok(identity.evidence.some(item => item.field === 'accent' && item.excerpt.includes('--gold')));
  assert.equal(identity.readyForKit, true);
  const kit = buildBrandKit(identity.brief);
  assert.equal(kit.tokens.typography.body, '"Avenir Next", sans-serif');
  assert.equal(kit.tokens.radius.control, '0.5rem');
  assert.equal(kit.tokens.colors.accent, '#ffcc33');
  assert.equal(kit.tokens.colors.background, '#ffffff');
});

test('identity records explicit overrides and leaves unsupported values unknown', () => {
  const identity = importBrandIdentity({ html: '<title>A site</title>', css: ':root{--accent: var(--cyclic);--cyclic:var(--accent);--font-body:url(https://example.com/font);--radius:calc(1px + 1rem)}', overrides: { name: 'Actual name', description: 'A useful product.', accent: '#123456', typography: { body: 'Geist, sans-serif' }, radius: { panel: '12px' } } });
  assert.equal(identity.brief.name, 'Actual name');
  assert.equal(identity.confidence.name, 'explicit');
  assert.equal(identity.brief.accent, '#123456');
  assert.equal(identity.brief.radius.panel, '12px');
  assert.ok(identity.unknowns.some(item => item.includes('radius.control')));
  assert.equal(identity.evidence.at(-1).source, 'Explicit override');
  assert.throws(() => importBrandIdentity({ overrides: { typography: { body: 'Geist; background:url(x)' } } }), /font family/);
});

test('brand tokens reject CSS injection and preserve safe typography and radius', () => {
  const base = { name: 'Brand', description: 'A specific product for a specific audience.' };
  for (const bad of ['Arial; color:red', 'url(https://evil.example)', '</style><script>1</script>', 'Arial\\3b color:red', 'var(--font)', 'Arial\n}@import x']) {
    assert.throws(() => buildBrandKit({ ...base, typography: { heading: bad } }), /font family/);
  }
  for (const bad of ['99px', '-1px', '1px; color:red', 'calc(1px)', 'url(x)', '100%']) assert.throws(() => buildBrandKit({ ...base, radius: { control: bad } }), /radius/);
  assert.throws(() => buildBrandKit({ ...base, colors: { surface: 'white; color:red' } }), /six-digit/);
  const kit = buildBrandKit({ ...base, typography: { heading: '"Space Grotesk", sans-serif', body: 'Arial, sans-serif' }, radius: { control: '0', panel: '1.5rem' } });
  assert.equal(kit.tokens.typography.heading, '"Space Grotesk", sans-serif');
  assert.equal(kit.tokens.radius.panel, '1.5rem');
  assert.ok(kit.css.includes('--panel-radius: 1.5rem'));
});

test('semantic palette meets every stated contrast threshold for light accents and neutral grays', () => {
  for (const accent of ['#ffff00', '#ffffff', '#777777', '#787878', '#000000', '#ffcc33']) {
    for (const colors of [{ background: '#ffffff', surface: '#111111', text: '#777777' }, { background: '#111111', surface: '#ffffff', text: '#787878' }]) {
      const kit = buildBrandKit({ name: 'Brand', description: 'A useful product.', accent, colors });
      assert.equal(kit.tokens.colors.accent, accent);
      assert.ok(contrastRatio(kit.tokens.colors.onAccent, accent) >= 4.5);
      for (const pair of kit.accessibility.contrast) {
        assert.equal(pair.passes, true, `${accent} ${pair.pair}`);
        assert.ok(contrastRatio(pair.foreground, pair.background) >= pair.minimum, `${accent} ${pair.pair}`);
      }
      assert.ok(kit.css.includes('background: var(--action-background); color: var(--on-action)'));
      assert.ok(kit.components.every(component => component.css.includes(`--accent: ${kit.tokens.colors.accentInk}`)));
    }
  }
});
