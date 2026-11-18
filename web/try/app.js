import { embeddedPreview } from './embedded.js';
import { searchLibrary } from './search.js';
import { buildBrandKit } from './brand.js';
import { escapeHtml } from './catalog.js';

const examples = {
  'meeting-note': { query: 'meeting notes', name: 'Morrow', description: 'Meeting notes that keep decisions and next actions together.', accent: '#34664b', hint: 'Check an action to mark it complete. These native checkboxes work with a mouse or the Space key. Changes last for this preview.' },
  'service-fold': { query: 'accordion disclosure', name: 'Civic Library', description: 'Clear borrowing information and practical services for a neighborhood library.', accent: '#2459aa', hint: 'Open a question and watch the answer enter. Enter and Space operate the native disclosure. Motion follows the device’s reduced-motion preference.' },
  'press-ticket': { query: 'reservation feedback', name: 'Night Ferry', description: 'A passenger booking desk for local ferry crossings.', accent: '#375d47', hint: 'Hold the berth, then release it. The button, live status, and folded corner change together. This example reservation stays within the preview.' }
};
const palettes = {
  morrow: { name: 'Morrow', color: '#34664b' },
  cobalt: { name: 'Cobalt', color: '#2459aa' },
  saffron: { name: 'Saffron', color: '#ffcc33' }
};
const liveSection = document.querySelector('#live-mcp');
const syncLiveLink = () => { document.querySelector('#live-test-link').hidden = liveSection.hidden; };
new MutationObserver(syncLiveLink).observe(liveSection, { attributes: true, attributeFilter: ['hidden'] });
syncLiveLink();

const frame = document.querySelector('#specimen');
frame.addEventListener('load', () => frame.setAttribute('aria-busy', 'false'));
const query = document.querySelector('#reference-search');
const name = document.querySelector('#brand-name');
const description = document.querySelector('#brand-description');
const color = document.querySelector('#brand-color');
let records = new Map();
let selected;
let currentArtifact;
let sourceTab = 'guidance';
let currentMode = 'original';

function preview(document, title) {
  frame.setAttribute('aria-busy', 'true');
  frame.srcdoc = embeddedPreview(document, true);
  frame.title = title;
}

function setMode(mode) {
  currentMode = mode;
  document.querySelector('#original-view').setAttribute('aria-pressed', String(mode === 'original'));
  document.querySelector('#brand-view').setAttribute('aria-pressed', String(mode === 'brand'));
  preview(mode === 'brand' ? currentArtifact.html : selected.document,
    `${mode === 'brand' ? currentArtifact.name + ' — ' : ''}${selected.title} interactive specimen`);
}

function showSource(mode) {
  sourceTab = mode;
  const code = mode === 'guidance' ? selected.sourceExcerpt : selected[mode] || '';
  const filename = { guidance: selected.sourceFile, html: 'component.html', css: 'styles.css', js: 'behavior.js' }[mode];
  document.querySelector('#source-code').textContent = code;
  document.querySelector('#source-file').textContent = `${filename} · Atlas bundle ${selected.version}`;
  for (const tab of document.querySelectorAll('[data-source]')) tab.setAttribute('aria-pressed', String(tab.dataset.source === mode));
}

function clearBrand() {
  currentArtifact = undefined;
  document.querySelector('#brand-result').hidden = true;
  document.querySelector('#brand-view').disabled = true;
  document.querySelector('#brand-error').hidden = true;
}

function selectReference(id) {
  selected = records.get(id);
  if (!selected) return;
  clearBrand();
  document.querySelector('#reference-category').textContent = `${selected.platform} · ${selected.motion ? 'Interactive motion study' : selected.category}`;
  document.querySelector('#reference-title').textContent = selected.title;
  document.querySelector('#reference-summary').textContent = selected.summary;
  document.querySelector('#gallery-link').href = `./?id=${encodeURIComponent(id)}`;
  document.querySelector('#source-title').textContent = selected.sourceName || 'Authored Atlas specimen';
  const source = document.querySelector('#source-link');
  source.hidden = !selected.sourceUrl;
  if (selected.sourceUrl) source.href = selected.sourceUrl;
  document.querySelector('#provenance-note').textContent = selected.provenance || 'Original Atlas implementation study, informed by the linked public reference. The live preview runs the shipped HTML, CSS, and behavior.';
  document.querySelector('#interaction-hint').textContent = examples[id]?.hint || selected.specimenBehavior || 'This local specimen demonstrates the authored interaction. Connect application data and persistence when integrating it into a product.';
  document.querySelector('#javascript-tab').hidden = !selected.js;
  for (const result of document.querySelectorAll('[data-result]')) result.setAttribute('aria-pressed', String(result.dataset.result === id));
  for (const example of document.querySelectorAll('[data-example]')) example.setAttribute('aria-pressed', String(example.dataset.example === id));
  showSource(sourceTab === 'js' && !selected.js ? 'guidance' : sourceTab);
  setMode('original');
}

function search(preferredId) {
  const result = searchLibrary({ query: query.value, limit: 4 });
  const list = document.querySelector('#search-results');
  list.replaceChildren();
  for (const reference of result.results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    button.dataset.result = reference.id;
    button.setAttribute('aria-pressed', 'false');
    const title = document.createElement('strong');
    title.textContent = reference.title;
    const source = document.createElement('span');
    source.textContent = `${reference.sourceName || 'Atlas'} · ${reference.visual}`;
    button.append(title, source);
    button.addEventListener('click', () => selectReference(reference.id));
    list.append(button);
  }
  document.querySelector('#search-status').textContent = result.results.length ? `${result.results.length} reference${result.results.length === 1 ? '' : 's'} shown from the shipped catalog` : 'No references found. Try meeting notes, accordion, or reservation.';
  if (result.results.length) selectReference(result.results.some(item => item.id === preferredId) ? preferredId : result.results[0].id);
}

function updateColor() {
  document.querySelector('#color-swatch').style.backgroundColor = /^#[0-9a-f]{6}$/i.test(color.value) ? color.value : '#ffffff';
  for (const option of document.querySelectorAll('[data-palette]')) {
    const preset = palettes[option.dataset.palette];
    option.setAttribute('aria-pressed', String(preset.name === name.value && preset.color.toLowerCase() === color.value.toLowerCase()));
  }
}

function createArtifact() {
  const kit = buildBrandKit({ name: name.value.trim(), description: description.value.trim(), accent: color.value.trim(), packId: selected.packId });
  const c = kit.tokens.colors;
  const t = kit.tokens.typography;
  const r = kit.tokens.radius;
  const brand = escapeHtml(kit.brand.name);
  const body = selected.html.replaceAll('Team notebook · Today', `${brand} · Today`).replaceAll('Library services', brand).replaceAll('Night ferry / Passenger desk', `${brand} / Passenger desk`);
  const theme = `
body{margin:0;background:${c.background};color:${c.text};font:16px/1.6 ${t.body}}.brand-header{max-width:880px;margin:auto;padding:30px clamp(20px,5vw,50px) 24px;border-bottom:1px solid ${c.border}}.brand-header h1{font:400 clamp(30px,5vw,48px)/1.1 ${t.heading};letter-spacing:-.035em;margin:0 0 10px;overflow-wrap:anywhere}.brand-header p{margin:0;max-width:65ch;color:${c.muted}}.brand-footer{max-width:880px;margin:auto;padding:22px clamp(20px,5vw,50px);font-size:12px;color:${c.muted}}.brand-footer a{color:${c.accentInk};text-underline-offset:3px}.brand-footer a:focus-visible{outline:3px solid ${c.focus};outline-offset:4px}
:is(.atlas-specimen,.motion-study){--paper:${c.background}!important;--ink:${c.text}!important;--accent:${c.accentInk}!important;--muted:${c.muted}!important;--line:${c.border}!important;font-family:${t.body}}
:is(.atlas-specimen,.motion-study) h2{font-family:${t.heading}}.atlas-specimen :is(.card,.phone),.ticket .stub{background:${c.surface};color:${c.surfaceText};--ink:${c.surfaceText};--muted:${c.surfaceMuted};--accent:${c.surfaceAccentInk};border-radius:${r.panel}}
.atlas-specimen button:not(.secondary),.atlas-specimen .action{background:${c.actionBackground};color:${c.onAction};border-radius:${r.control}}.atlas-specimen :is(.card,.phone) :is(button:not(.secondary),.action),.ticket .stub button{background:${c.surfaceActionBackground};color:${c.onSurfaceAction};border-radius:${r.control}}
:is(.atlas-specimen,.motion-study) :focus-visible{outline:3px solid ${c.focus};outline-offset:4px}.atlas-specimen :is(.card,.phone) :focus-visible,.ticket .stub :focus-visible{outline-color:${c.surfaceFocus}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;transition:none!important;scroll-behavior:auto!important}}`;
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${brand} — ${escapeHtml(selected.title)}</title><style>${selected.css}\n${theme}</style></head><body><header class="brand-header"><h1>${brand}</h1><p>${escapeHtml(kit.brand.description)}</p></header><main>${body}</main><footer class="brand-footer">Original Atlas specimen adapted for ${brand}. Sample operational facts require review. <a href="${escapeHtml(selected.sourceUrl)}">Primary reference</a> · <a href="https://tradelord223.github.io/design-atlas-mcp/?id=${encodeURIComponent(selected.id)}">Atlas study</a></footer>${selected.js ? `<script>${selected.js}</script>` : ''}</body></html>\n`;
  return { html, name: kit.brand.name, tokens: kit.tokens, contrast: kit.accessibility.contrast };
}

function applyBrand() {
  const error = document.querySelector('#brand-error');
  error.hidden = true;
  try {
    currentArtifact = createArtifact();
    document.querySelector('#brand-result').hidden = false;
    document.querySelector('#brand-view').disabled = false;
    document.querySelector('#brand-status').textContent = `${currentArtifact.name} applied to this study.`;
    const body = currentArtifact.contrast.find(pair => pair.pair === 'body text / background');
    const link = currentArtifact.contrast.find(pair => pair.pair === 'link and eyebrow / background');
    document.querySelector('#contrast-status').textContent = `Generated palette · Body ${body.ratio}:1 · Links ${link.ratio}:1. Action colors are adapted for contrast.`;
    setMode('brand');
  } catch (failure) {
    error.textContent = failure.message;
    error.hidden = false;
  }
}

document.querySelector('#search-form').addEventListener('submit', event => { event.preventDefault(); search(); });
document.querySelector('#brand-form').addEventListener('submit', event => { event.preventDefault(); applyBrand(); });
for (const example of document.querySelectorAll('[data-example]')) example.addEventListener('click', () => {
  const settings = examples[example.dataset.example];
  query.value = settings.query;
  name.value = settings.name;
  description.value = settings.description;
  color.value = settings.accent;
  updateColor();
  search(example.dataset.example);
});
for (const palette of document.querySelectorAll('[data-palette]')) palette.addEventListener('click', () => {
  const settings = palettes[palette.dataset.palette];
  name.value = settings.name;
  color.value = settings.color;
  updateColor();
  for (const option of document.querySelectorAll('[data-palette]')) option.setAttribute('aria-pressed', String(option === palette));
  applyBrand();
});
for (const tab of document.querySelectorAll('[data-source]')) tab.addEventListener('click', () => showSource(tab.dataset.source));
color.addEventListener('input', updateColor);
name.addEventListener('input', updateColor);
document.querySelector('#original-view').addEventListener('click', () => setMode('original'));
document.querySelector('#brand-view').addEventListener('click', () => setMode('brand'));
document.querySelector('#replay').addEventListener('click', () => setMode(currentMode));
document.querySelector('#download').addEventListener('click', () => {
  if (!currentArtifact) return;
  const filename = `${currentArtifact.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand'}-${selected.id}.html`;
  const url = URL.createObjectURL(new Blob([currentArtifact.html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector('#brand-status').textContent = `Downloaded ${filename}`;
});

try {
  const response = await fetch(new URL('./catalog.json', import.meta.url));
  if (!response.ok) throw new Error('The example catalog could not load. Reload this page to try again.');
  const catalog = await response.json();
  records = new Map(catalog.records.map(record => [record.id, record]));
  search('meeting-note');
} catch (failure) {
  const message = document.querySelector('#load-error');
  message.textContent = failure.message;
  message.hidden = false;
}
