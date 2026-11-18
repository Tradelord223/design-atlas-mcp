#!/usr/bin/env node
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Script } from 'node:vm';

const identifier = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const maximumFileBytes = 2_000_000;
const patternFields = new Set(['id', 'title', 'summary', 'category', 'tags', 'platform', 'sourceName', 'sourceUrl', 'provenance', 'rights', 'observedAt', 'html', 'css', 'js', 'implementation', 'accessibility', 'states', 'responsive', 'specimenBehavior']);
const packFields = new Set(['id', 'title', 'summary', 'tags', 'patterns', 'tokens', 'principles', 'sourceName', 'sourceUrl', 'provenance', 'rights', 'acceptance']);
const flowFields = new Set(['id', 'title', 'summary', 'tags', 'steps', 'sourceName', 'sourceUrl', 'provenance', 'rights', 'successMetric']);

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  return value;
}

function text(value, field, maximum = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new TypeError(`${field} must be nonempty text up to ${maximum} characters`);
  return value.trim();
}

function id(value, field) {
  const result = text(value, field, 100);
  if (!identifier.test(result)) throw new TypeError(`${field} must use lowercase words separated by hyphens`);
  return result;
}

function strings(value, field, maximum = 40) {
  if (!Array.isArray(value) || value.length > maximum) throw new TypeError(`${field} must be an array with at most ${maximum} entries`);
  return value.map((entry, index) => text(entry, `${field}[${index}]`));
}

function url(value, field) {
  const result = text(value, field, 2000);
  const parsed = new URL(result);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new TypeError(`${field} must be an HTTPS source URL without credentials`);
  return parsed.href;
}

function knownFields(value, allowed, field) {
  object(value, field);
  const unknown = Object.keys(value).filter(key => !allowed.has(key));
  if (unknown.length) throw new TypeError(`${field} has unsupported fields: ${unknown.join(', ')}`);
}

function attribution(value, field) {
  const rights = object(value.rights, `${field}.rights`);
  knownFields(rights, new Set(['kind', 'license', 'licenseText']), `${field}.rights`);
  if (!['original', 'licensed'].includes(rights.kind)) throw new TypeError(`${field}.rights.kind must be original or licensed`);
  const license = text(rights.license, `${field}.rights.license`, 200);
  if (rights.kind === 'licensed' && !rights.licenseText) throw new TypeError(`${field}.rights.licenseText is required for licensed material`);
  return {
    sourceName: text(value.sourceName, `${field}.sourceName`, 200),
    sourceUrl: url(value.sourceUrl, `${field}.sourceUrl`),
    provenance: text(value.provenance, `${field}.provenance`),
    rights: { kind: rights.kind, license, ...(rights.licenseText ? { licenseText: text(rights.licenseText, `${field}.rights.licenseText`, 100_000) } : {}) }
  };
}

function common(value, field, allowed) {
  knownFields(value, allowed, field);
  return { id: id(value.id, `${field}.id`), title: text(value.title, `${field}.title`, 200), summary: text(value.summary, `${field}.summary`), tags: strings(value.tags || [], `${field}.tags`), ...attribution(value, field) };
}

function normalizePattern(value, index) {
  const field = `patterns[${index}]`;
  const base = common(value, field, patternFields);
  if (value.js !== undefined) new Script(text(value.js, `${field}.js`, 100_000), { filename: `${base.id}.js` });
  if (!['web', 'mobile'].includes(value.platform)) throw new TypeError(`${field}.platform must be web or mobile`);
  const observedAt = text(value.observedAt, `${field}.observedAt`, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observedAt) || new Date(`${observedAt}T00:00:00Z`).toISOString().slice(0, 10) !== observedAt) throw new TypeError(`${field}.observedAt must be a valid YYYY-MM-DD date`);
  return {
    ...base, category: text(value.category, `${field}.category`, 100), platform: value.platform, observedAt,
    html: text(value.html, `${field}.html`, 200_000), css: text(value.css, `${field}.css`, 200_000),
    ...(value.js === undefined ? {} : { js: text(value.js, `${field}.js`, 100_000) }),
    implementation: strings(value.implementation, `${field}.implementation`),
    accessibility: strings(value.accessibility, `${field}.accessibility`),
    states: strings(value.states || ['default'], `${field}.states`),
    responsive: value.responsive ? text(value.responsive, `${field}.responsive`) : 'Check at narrow and wide viewports with real content.',
    specimenBehavior: value.specimenBehavior ? text(value.specimenBehavior, `${field}.specimenBehavior`) : (value.js ? 'Trusted contributor JavaScript executes in the specimen. Review behavior before integration.' : 'Original HTML and CSS specimen with native browser controls.'),
    codeType: value.js ? 'html-css-js' : 'html-css'
  };
}

function normalizePack(value, index) {
  const field = `packs[${index}]`;
  const base = common(value, field, packFields);
  const references = strings(value.patterns, `${field}.patterns`, 200).map((value, index) => id(value, `${field}.patterns[${index}]`));
  if (!references.length || new Set(references).size !== references.length) throw new TypeError(`${field}.patterns must contain unique reference IDs`);
  const tokens = object(value.tokens, `${field}.tokens`);
  object(tokens.colors, `${field}.tokens.colors`);
  for (const color of ['background', 'surface', 'text', 'muted', 'accent', 'border']) {
    if (typeof tokens.colors[color] !== 'string' || !/^#[0-9a-f]{6}$/i.test(tokens.colors[color])) throw new TypeError(`${field}.tokens.colors.${color} must be a six-digit hex color`);
  }
  if (tokens.radius?.control && !/^\d+(?:\.\d+)?(?:px|rem|em)$/.test(tokens.radius.control)) throw new TypeError(`${field}.tokens.radius.control must be a CSS length in px, rem or em`);
  return { ...base, patterns: references, tokens, principles: strings(value.principles, `${field}.principles`), acceptance: strings(value.acceptance || [], `${field}.acceptance`) };
}

function normalizeFlow(value, index) {
  const field = `flows[${index}]`;
  const base = common(value, field, flowFields);
  if (!Array.isArray(value.steps) || !value.steps.length || value.steps.length > 40) throw new TypeError(`${field}.steps must contain 1–40 steps`);
  const steps = value.steps.map((step, index) => {
    const name = `${field}.steps[${index}]`;
    knownFields(step, new Set(['title', 'pattern', 'goal', 'failure']), name);
    return { title: text(step.title, `${name}.title`, 200), pattern: id(step.pattern, `${name}.pattern`), goal: text(step.goal, `${name}.goal`), failure: text(step.failure, `${name}.failure`) };
  });
  return { ...base, steps, successMetric: text(value.successMetric, `${field}.successMetric`) };
}

/** Validate JSON declarations and references without executing imported HTML or JS. */
export function validatePack(manifest, current = { patterns: [], packs: [], flows: [] }) {
  knownFields(manifest, new Set(['schemaVersion', 'trustedJavaScript', 'patterns', 'packs', 'flows']), 'manifest');
  if (manifest.schemaVersion !== 1) throw new TypeError('schemaVersion must be 1');
  if (manifest.trustedJavaScript !== undefined && typeof manifest.trustedJavaScript !== 'boolean') throw new TypeError('trustedJavaScript must be a boolean');
  const collection = name => {
    const values = manifest[name] || [];
    if (!Array.isArray(values) || values.length > 200) throw new TypeError(`${name} must be an array with at most 200 entries`);
    return values;
  };
  const patterns = collection('patterns').map(normalizePattern);
  const active = patterns.some(pattern => pattern.js || /<script\b|\bon[a-z]+\s*=|javascript\s*:/i.test(pattern.html));
  if (active && manifest.trustedJavaScript !== true) throw new TypeError('Set trustedJavaScript to true only after reviewing every script and HTML event handler. Contributor code executes when rendered.');
  const packs = collection('packs').map(normalizePack);
  const flows = collection('flows').map(normalizeFlow);
  if (!packs.length) throw new TypeError('Include at least one design pack');
  const allIds = new Set([...current.patterns, ...current.packs, ...current.flows].map(item => item.id));
  for (const item of [...patterns, ...packs, ...flows]) {
    if (allIds.has(item.id)) throw new Error(`Duplicate or colliding ID: ${item.id}`);
    allIds.add(item.id);
  }
  const referenceIds = new Set([...current.patterns, ...patterns].map(pattern => pattern.id));
  for (const pack of packs) for (const ref of pack.patterns) if (!referenceIds.has(ref)) throw new Error(`Pack ${pack.id} links to unknown pattern ${ref}`);
  for (const flow of flows) for (const step of flow.steps) if (!referenceIds.has(step.pattern)) throw new Error(`Flow ${flow.id} links to unknown pattern ${step.pattern}`);
  for (const pattern of patterns) if (![...current.packs, ...packs].some(pack => pack.patterns.includes(pattern.id))) throw new Error(`Pattern ${pattern.id} must belong to a design pack`);
  return { patterns, packs, flows };
}

function moduleText(data) {
  const encode = value => JSON.stringify(value, null, 2).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return '// Contributor data is validated by scripts/add-pack.js before this module is replaced.\n'
    + `export const extensionPatterns = ${encode(data.patterns)};\n`
    + `export const extensionPacks = ${encode(data.packs)};\n`
    + `export const extensionFlows = ${encode(data.flows)};\n`;
}

/** root is injectable so tests exercise isolated source checkouts. */
export async function importPack(manifestPath, { root = fileURLToPath(new URL('../', import.meta.url)) } = {}) {
  if (typeof manifestPath !== 'string' || !isAbsolute(manifestPath)) throw new TypeError('Provide an absolute path to the pack JSON');
  const location = resolve(manifestPath);
  const bytes = await readFile(location);
  if (bytes.length > maximumFileBytes) throw new RangeError(`Pack JSON must be at most ${maximumFileBytes} bytes`);
  const manifest = JSON.parse(bytes.toString('utf8'));
  const destination = join(resolve(root), 'src/extensions.js');
  const lock = join(dirname(destination), '.extensions-import.lock');
  try { await mkdir(lock); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another pack import holds the lock. Wait for it to finish. Remove src/.extensions-import.lock only after confirming that importer has stopped.');
    throw error;
  }
  const temporary = join(dirname(destination), `.extensions-${randomUUID()}.tmp`);
  try {
    const nonce = randomUUID();
    const catalog = await import(`${pathToFileURL(join(resolve(root), 'src/catalog.js')).href}?import=${nonce}`);
    const prior = await import(`${pathToFileURL(destination).href}?import=${nonce}`);
    // Include prior imports explicitly, including when a test catalog has no extension wiring.
    const merge = (base, extensions) => [...new Map([...base, ...extensions].map(item => [item.id, item])).values()];
    const current = { patterns: merge(catalog.patterns, prior.extensionPatterns), packs: merge(catalog.packs, prior.extensionPacks), flows: merge(catalog.flows, prior.extensionFlows) };
    const additions = validatePack(manifest, current);
    const data = { patterns: [...prior.extensionPatterns, ...additions.patterns], packs: [...prior.extensionPacks, ...additions.packs], flows: [...prior.extensionFlows, ...additions.flows] };
    await writeFile(temporary, moduleText(data), { flag: 'wx' });
    await rename(temporary, destination);
    return { added: { patterns: additions.patterns.map(item => item.id), packs: additions.packs.map(item => item.id), flows: additions.flows.map(item => item.id) }, render: additions.patterns.length ? `npm run render -- ${additions.patterns.map(item => item.id).join(' ')}` : null, total: { patterns: data.patterns.length, packs: data.packs.length, flows: data.flows.length } };
  } finally {
    await rm(temporary, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error('Usage: node scripts/add-pack.js /absolute/path/to/pack.json');
    process.exitCode = 1;
  } else {
    importPack(process.argv[2]).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
