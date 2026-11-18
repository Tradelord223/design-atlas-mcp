import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importPack, validatePack } from '../scripts/add-pack.js';

const attribution = {
  sourceName: 'Contributor example', sourceUrl: 'https://example.com/design',
  provenance: 'An original authored example of a newsletter form.',
  rights: { kind: 'original', license: 'MIT' }
};
function manifest(suffix = 'one') {
  return {
    schemaVersion: 1,
    patterns: [{
      id: `contributor-form-${suffix}`, title: 'Newsletter form', summary: 'A labelled email field and a clear submission state.', category: 'forms', tags: ['newsletter'], platform: 'web', ...attribution,
      observedAt: '2026-11-18', html: '<section><label for="email">Email address</label><input id="email" type="email"><button>Subscribe</button></section>', css: 'section{padding:24px}button{min-height:44px}',
      implementation: ['Connect the form to the subscription endpoint.'], accessibility: ['Give the field a visible label.']
    }],
    packs: [{
      id: `contributor-editorial-${suffix}`, title: 'Contributor editorial', summary: 'An original direction for a readable publication.', tags: ['editorial'], ...attribution,
      patterns: [`contributor-form-${suffix}`], tokens: { colors: { background: '#ffffff', surface: '#ffffff', text: '#202820', muted: '#526052', accent: '#215c47', border: '#bcc8bc' } }, principles: ['Keep the reading measure comfortable.']
    }],
    flows: [{
      id: `contributor-subscribe-${suffix}`, title: 'Subscribe to a publication', summary: 'One useful step with a recoverable outcome.', ...attribution,
      steps: [{ title: 'Enter an address', pattern: `contributor-form-${suffix}`, goal: 'Subscribe using an email address.', failure: 'Keep the address when submission fails.' }], successMetric: 'Confirmed subscriptions per submitted form.'
    }]
  };
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-extension-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  await writeFile(join(root, 'src/catalog.js'), 'export const patterns=[]; export const packs=[]; export const flows=[];');
  await writeFile(join(root, 'src/extensions.js'), 'export const extensionPatterns=[]; export const extensionPacks=[]; export const extensionFlows=[];');
  const save = async (value, name = 'pack.json') => {
    const file = join(root, name);
    await writeFile(file, JSON.stringify(value));
    return file;
  };
  return { root, save };
}

test('import persists static offline data, preserving earlier imports', async t => {
  const { root, save } = await fixture(t);
  const first = await importPack(await save(manifest()), { root });
  assert.deepEqual(first.added.patterns, ['contributor-form-one']);
  assert.match(first.render, /npm run render -- contributor-form-one/);
  const second = await importPack(await save(manifest('two')), { root });
  assert.deepEqual(second.total, { patterns: 2, packs: 2, flows: 2 });
  const data = await import(pathToFileURL(join(root, 'src/extensions.js')).href);
  assert.equal(data.extensionPatterns.length, 2);
  assert.equal(data.extensionPatterns[0].html, manifest().patterns[0].html);
  assert.equal(data.extensionFlows[1].steps[0].pattern, 'contributor-form-two');
  assert.deepEqual((await readdir(join(root, 'src'))).sort(), ['catalog.js', 'extensions.js']);
});

test('validation failure leaves the original module intact', async t => {
  const { root, save } = await fixture(t);
  const destination = join(root, 'src/extensions.js');
  const before = await readFile(destination, 'utf8');
  const bad = manifest();
  bad.flows[0].steps[0].pattern = 'missing-reference';
  await assert.rejects(importPack(await save(bad), { root }), /unknown pattern/);
  assert.equal(await readFile(destination, 'utf8'), before);
  assert.deepEqual((await readdir(join(root, 'src'))).sort(), ['catalog.js', 'extensions.js']);
});

test('duplicates, existing core IDs and cross-collection collisions are rejected', async t => {
  const { root, save } = await fixture(t);
  const file = await save(manifest());
  await importPack(file, { root });
  const before = await readFile(join(root, 'src/extensions.js'), 'utf8');
  await assert.rejects(importPack(file, { root }), /Duplicate or colliding/);
  assert.equal(await readFile(join(root, 'src/extensions.js'), 'utf8'), before);
  const current = { patterns: [{ id: 'contributor-form-one' }], packs: [], flows: [] };
  assert.throws(() => validatePack(manifest(), current), /Duplicate or colliding/);
  const same = manifest(); same.packs[0].id = same.patterns[0].id;
  assert.throws(() => validatePack(same), /Duplicate or colliding/);
});

test('concurrent imports fail safely and successful import retains all data', async t => {
  const { root, save } = await fixture(t);
  const paths = await Promise.all([save(manifest('one'), 'one.json'), save(manifest('two'), 'two.json')]);
  const results = await Promise.allSettled(paths.map(file => importPack(file, { root })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const failed = results.findIndex(result => result.status === 'rejected');
  assert.match(results[failed].reason.message, /holds the lock/);
  await importPack(paths[failed], { root });
  const text = await readFile(join(root, 'src/extensions.js'), 'utf8');
  assert.match(text, /contributor-form-one/); assert.match(text, /contributor-form-two/);
});

test('rights, dates, links, schemas and source syntax are validated without execution', () => {
  const invalid = mutate => { const value = manifest(); mutate(value); return value; };
  assert.throws(() => validatePack(invalid(value => delete value.patterns[0].rights)), /rights/);
  assert.throws(() => validatePack(invalid(value => value.patterns[0].rights = { kind: 'licensed', license: 'MIT' })), /licenseText/);
  assert.throws(() => validatePack(invalid(value => value.patterns[0].sourceUrl = 'http://example.com')), /HTTPS/);
  assert.throws(() => validatePack(invalid(value => value.patterns[0].observedAt = '2026-02-30')), /valid/);
  assert.throws(() => validatePack(invalid(value => value.patterns[0].id = '../elsewhere')), /lowercase/);
  assert.throws(() => validatePack(invalid(value => value.patterns[0].js = 'function {')), /Unexpected/);
  assert.throws(() => validatePack(invalid(value => value.patterns[0].unknown = true)), /unsupported/);
  assert.throws(() => validatePack(invalid(value => value.packs[0].tokens.colors.accent = 'red')), /six-digit/);
  assert.throws(() => validatePack(invalid(value => value.packs = [])), /at least one/);
  const script = 'globalThis.__atlasImportedScriptExecuted = true;';
  const valid = manifest(); valid.patterns[0].js = script;
  assert.throws(() => validatePack(valid), /trustedJavaScript/);
  valid.trustedJavaScript = true;
  assert.equal(validatePack(valid).patterns[0].js, script);
  assert.equal(globalThis.__atlasImportedScriptExecuted, undefined);
});

test('an existing lock preserves destination and can be recovered explicitly', async t => {
  const { root, save } = await fixture(t);
  const lock = join(root, 'src/.extensions-import.lock');
  await mkdir(lock);
  const before = await readFile(join(root, 'src/extensions.js'), 'utf8');
  await assert.rejects(importPack(await save(manifest()), { root }), /holds the lock/);
  assert.equal(await readFile(join(root, 'src/extensions.js'), 'utf8'), before);
  await rm(lock, { recursive: true });
  assert.equal((await importPack(await save(manifest()), { root })).total.patterns, 1);
});
