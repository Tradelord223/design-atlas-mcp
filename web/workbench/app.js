import { embeddedPreview } from './embedded.js';
import { buildBrandKit } from './brand.js';
import { packs } from './catalog.js';
import { importBrandIdentity } from './identity.js';

const form = document.querySelector('#brand-form');
const preview = document.querySelector('#brand-preview');
const canvas = document.querySelector('#preview-canvas');
const status = document.querySelector('#result-status');
const error = document.querySelector('#form-error');
const packSelect = document.querySelector('#brand-pack');
let currentKit;
let importedTokens = {};

for (const pack of packs) {
  const option = document.createElement('option');
  option.value = pack.id;
  option.textContent = pack.title;
  packSelect.append(option);
}

function updatePalette(kit) {
  const palette = document.querySelector('#palette');
  palette.replaceChildren();
  for (const key of ['background', 'surface', 'text', 'accent', 'onAccent']) {
    const value = kit.tokens.colors[key];
    const item = document.createElement('div');
    item.className = 'swatch';
    const color = document.createElement('div');
    color.className = 'swatch-color';
    color.style.backgroundColor = value;
    color.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'swatch-label';
    label.textContent = { background: 'Background', surface: 'Surface', text: 'Text', accent: 'Accent', onAccent: 'On accent' }[key];
    const code = document.createElement('span');
    code.className = 'swatch-value';
    code.textContent = value;
    item.append(color, label, code);
    palette.append(item);
  }
  const ratios = kit.accessibility.contrast;
  document.querySelector('#contrast-status').textContent = `Body ${ratios[0].ratio}:1 · Action ${ratios[1].ratio}:1 contrast`;
}

function updateReferences(kit) {
  const list = document.querySelector('#source-list');
  list.replaceChildren();
  const pack = packs.find(item => item.id === kit.selectedPack.id);
  const references = [
    ...(pack.sourceUrl ? [{ title: pack.sourceName || pack.title, url: pack.sourceUrl }] : []),
    ...kit.components.map(component => ({ title: component.title, url: component.sourceUrl }))
  ];
  const seen = new Set();
  for (const reference of references) {
    if (!reference.url || seen.has(reference.url)) continue;
    seen.add(reference.url);
    const url = new URL(reference.url);
    if (url.protocol !== 'https:') continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${reference.title} ↗`;
    item.append(link);
    list.append(item);
  }
}

function generate() {
  error.hidden = true;
  const fields = Object.fromEntries(new FormData(form).entries());
  const brief = Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
  try {
    const kit = buildBrandKit({ ...importedTokens, ...brief });
    currentKit = kit;
    // The preview executes only local specimen code and cannot request network resources.
    preview.srcdoc = embeddedPreview(kit.html, true);
    document.querySelector('#kit-details').hidden = false;
    document.querySelector('#direction-title').textContent = kit.selectedPack.title;
    const pack = packs.find(item => item.id === kit.selectedPack.id);
    document.querySelector('#direction-summary').textContent = pack.summary;
    const principles = document.querySelector('#direction-principles');
    principles.replaceChildren();
    for (const principle of kit.selectedPack.principles || []) {
      const item = document.createElement('li');
      item.textContent = principle;
      principles.append(item);
    }
    document.querySelector('#generated-code').textContent = kit.html;
    updatePalette(kit);
    updateReferences(kit);
    status.textContent = `${kit.brand.name} · ${kit.selectedPack.title}`;
  } catch (failure) {
    error.textContent = failure.message;
    error.hidden = false;
    status.textContent = 'Review the brief to build your kit.';
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  generate();
});

const accentField = document.querySelector('#brand-accent');
accentField.addEventListener('input', () => {
  document.querySelector('#color-swatch').style.backgroundColor = /^#[0-9a-f]{6}$/i.test(accentField.value) ? accentField.value : '#315d43';
});

for (const mode of ['desktop', 'mobile']) {
  document.querySelector(`#${mode}-preview`).addEventListener('click', () => {
    canvas.classList.toggle('mobile', mode === 'mobile');
    document.querySelector('#desktop-preview').setAttribute('aria-pressed', String(mode === 'desktop'));
    document.querySelector('#mobile-preview').setAttribute('aria-pressed', String(mode === 'mobile'));
  });
}

for (const button of document.querySelectorAll('[data-download]')) {
  button.addEventListener('click', () => {
    if (!currentKit) return;
    const stem = currentKit.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
    const downloads = {
      html: { name: `${stem}.html`, type: 'text/html', content: currentKit.html },
      css: { name: `${stem}.css`, type: 'text/css', content: [currentKit.css, ...currentKit.components.map(component => component.css)].join('\n\n') },
      tokens: { name: `${stem}-tokens.json`, type: 'application/json', content: JSON.stringify(currentKit.tokens, null, 2) + '\n' }
    };
    const file = downloads[button.dataset.download];
    const url = URL.createObjectURL(new Blob([file.content], { type: `${file.type};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Downloaded ${file.name}`;
  });
}

document.querySelector('#import-identity').addEventListener('click', () => {
  const message = document.querySelector('#import-status');
  try {
    const result = importBrandIdentity({ html: document.querySelector('#identity-html').value, css: document.querySelector('#identity-css').value });
    importedTokens = Object.fromEntries(['typography', 'radius', 'colors'].filter(key => result.brief[key]).map(key => [key, result.brief[key]]));
    for (const [key, selector] of [['name', '#brand-name'], ['description', '#brand-description'], ['accent', '#brand-accent']]) {
      if (result.brief[key]) document.querySelector(selector).value = result.brief[key];
    }
    if (result.brief.name) document.querySelector('#brand-headline').value = '';
    document.querySelector('#brand-accent').dispatchEvent(new Event('input'));
    document.querySelector('#import-evidence').hidden = false;
    const evidenceList = document.querySelector('#identity-evidence');
    evidenceList.replaceChildren();
    for (const evidence of result.evidence) {
      const item = document.createElement('li');
      item.textContent = `${evidence.field}: ${evidence.value} — ${evidence.source}. ${evidence.excerpt}`;
      evidenceList.append(item);
    }
    const unknownList = document.querySelector('#identity-unknowns');
    unknownList.replaceChildren();
    for (const unknown of result.unknowns) {
      const item = document.createElement('li');
      item.textContent = unknown;
      unknownList.append(item);
    }
    message.textContent = `Read ${result.evidence.length} declarations. Review the populated brief and imported values below.`;
    if (form.checkValidity()) generate();
  } catch (failure) {
    message.textContent = failure.message;
  }
});

generate();
