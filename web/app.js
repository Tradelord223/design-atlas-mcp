import { embeddedPreview } from './embedded.js';
const $ = selector => document.querySelector(selector);
const grid = $('#grid');
const detail = $('#detail');
const search = $('#search');
const tagSelect = $('#tag');
const state = { view: 'patterns', query: '', tag: '', iconLimit: 84 };
let catalog;
let toastTimer;
let lastDetailTrigger;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(text, url, className = '') {
  const node = element('a', className, text);
  node.href = url;
  return node;
}

function button(text, callback, className = '') {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', callback);
  return node;
}

function tags(item) {
  return [...new Set([item.category, ...(Array.isArray(item.tags) ? item.tags : [])].filter(Boolean))];
}

function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2400);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify('Copied to clipboard');
  } catch {
    const area = element('textarea');
    area.value = text;
    area.className = 'copy-fallback';
    area.setAttribute('aria-label', 'Text to copy');
    (document.querySelector('dialog[open]') || document.body).append(area);
    area.focus();
    area.select();
    notify('Select and copy the text below');
  }
}

function download(text, filename, type = 'text/html') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = link('', url);
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function card(item, type = 'patterns') {
  const article = element('article', 'card');
  const open = button('', () => openItem(item, type), 'card-open');
  open.setAttribute('aria-label', `Open ${item.title}`);
  if (type === 'patterns') {
    const thumb = element('div', 'thumb');
    const image = element('img');
    image.src = `previews/${encodeURIComponent(item.id)}/poster.png`;
    image.alt = `${item.title} implementation preview`;
    image.loading = 'lazy';
    image.width = 1000;
    image.height = 700;
    thumb.append(image);
    if (item.motion) thumb.append(element('span', 'motion', '↗ Motion'));
    open.append(thumb);
  } else {
    const cover = element('div', `pack-cover ${type === 'flows' ? 'flow-cover' : ''}`);
    cover.append(element('strong', '', item.title));
    if (type === 'packs') {
      const swatches = element('div', 'swatches');
      const colors = JSON.stringify(item.tokens || {}).match(/#[0-9a-f]{3,8}\b/gi) || ['#2a4835', '#c8d1b5', '#f2eedf', '#ae754d'];
      for (const color of [...new Set(colors)].slice(0, 5)) {
        const swatch = element('span');
        swatch.style.background = color;
        swatches.append(swatch);
      }
      cover.append(swatches, element('small', '', `${item.patterns?.length || 0} patterns · Tokens included`));
    } else {
      const steps = element('div', 'flow-steps');
      for (let index = 0; index < Math.min(item.steps?.length || 0, 6); index++) steps.append(element('span', '', String(index + 1)));
      cover.append(steps, element('small', '', `${item.steps?.length || 0} steps`));
    }
    open.append(cover);
  }
  const meta = element('div', 'card-meta');
  const title = element('div');
  title.append(element('h2', '', item.title), element('p', 'source', type === 'patterns' ? (item.sourceName || 'Authored specimen') : item.summary));
  meta.append(title, element('span', 'arrow', '↗'));
  open.append(meta);
  const tagRow = element('div', 'tag-row');
  for (const tag of tags(item).slice(0, 3)) tagRow.append(element('span', 'tag', tag));
  article.append(open, tagRow);
  return article;
}

function refreshFilters() {
  const collection = state.view === 'icons' ? catalog.iconPacks : catalog[state.view];
  tagSelect.replaceChildren(new Option(state.view === 'icons' ? 'All icon packs' : 'All categories', ''));
  const values = state.view === 'icons' ? collection.map(item => item.id) : [...new Set(collection.flatMap(tags))].sort();
  for (const value of values) tagSelect.add(new Option(value, value));
  tagSelect.value = state.tag;
}

function setView(view) {
  if (!catalog) return;
  state.view = view;
  state.tag = '';
  state.iconLimit = 84;
  for (const tab of document.querySelectorAll('[data-view]')) {
    if (tab.dataset.view === view) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  search.placeholder = view === 'icons' ? 'Search icons by name…' : 'Search references, patterns, ideas…';
  refreshFilters();
  render();
}

function render() {
  if (!catalog) return;
  const collection = state.view === 'icons' ? catalog.icons : catalog[state.view];
  const words = state.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = collection.filter(item => {
    const haystack = [item.title, item.name, item.summary, item.sourceName, item.pack, ...tags(item)].join(' ').toLowerCase();
    const category = !state.tag || (state.view === 'icons' ? item.pack === state.tag : tags(item).includes(state.tag));
    return category && words.every(word => haystack.includes(word));
  });
  grid.replaceChildren();
  grid.className = state.view === 'icons' ? 'grid icon-grid' : 'grid';
  document.querySelectorAll('.icon-family, .load-more').forEach(node => node.remove());
  if (state.view === 'icons') {
    const families = state.tag ? catalog.iconPacks.filter(item => item.id === state.tag) : catalog.iconPacks;
    for (const pack of families) {
      const intro = element('div', 'icon-family');
      const text = element('div');
      text.append(element('h2', '', pack.title), element('p', '', `${pack.count.toLocaleString()} icons · ${pack.license} · ${pack.version || ''}`));
      const actions = element('div', 'detail-actions');
      actions.append(link('Pack source & download ↗', pack.sourceUrl, 'button outline'), link('License ↗', `icons/${encodeURIComponent(pack.id)}/LICENSE`, 'button outline'));
      intro.append(text, actions);
      grid.before(intro);
    }
    for (const icon of matches.slice(0, state.iconLimit)) {
      const anchor = link('', `icons/${encodeURIComponent(icon.pack)}/${encodeURIComponent(icon.name)}.svg`, 'icon-card');
      anchor.download = `${icon.pack}-${icon.name}.svg`;
      anchor.title = `Download ${icon.name} · ${icon.pack} · ${icon.license}`;
      const image = element('img');
      image.src = anchor.href;
      image.alt = '';
      image.loading = 'lazy';
      anchor.append(image, element('span', '', icon.name), element('small', '', icon.pack));
      grid.append(anchor);
    }
    if (matches.length > state.iconLimit) {
      grid.after(button('Show more icons', () => { state.iconLimit += 84; render(); }, 'button outline load-more'));
    }
  } else {
    for (const item of matches) grid.append(card(item, state.view));
  }
  $('#results').textContent = `${matches.length.toLocaleString()} ${state.view === 'patterns' ? 'references' : state.view === 'packs' ? 'design packs' : state.view}`;
  $('#collection-note').textContent = state.view === 'icons' ? 'Download SVGs. Retain the included license.' : '';
  $('#empty').hidden = matches.length > 0;
  $('#reset').hidden = !state.query && !state.tag;
}

function updateUrl(key, value, mode = 'push') {
  const url = new URL(location.href);
  url.search = '';
  if (key) url.searchParams.set(key, value);
  if (url.href !== location.href) history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', url);
}

function closeDetail() {
  detail.close();
  $('#detail-body').replaceChildren();
  updateUrl();
  lastDetailTrigger?.focus();
}

function addList(parent, title, values) {
  if (!values?.length) return;
  parent.append(element('h3', '', title));
  const list = element('ul', 'detail-list');
  for (const value of values) list.append(element('li', '', typeof value === 'string' ? value : JSON.stringify(value)));
  parent.append(list);
}

function openPattern(pattern, body) {
  const layout = element('div', 'detail-layout');
  const visual = element('div');
  const wrapper = element('div', 'specimen-wrap');
  const tools = element('div', 'preview-tools');
  tools.append(element('span', '', 'Interactive specimen'));
  const sizes = element('div');
  const stage = element('div', 'iframe-stage');
  const desktop = button('Desktop', () => {
    stage.classList.remove('mobile');
    desktop.setAttribute('aria-pressed', 'true');
    mobile.setAttribute('aria-pressed', 'false');
  });
  const mobile = button('Phone', () => {
    stage.classList.add('mobile');
    desktop.setAttribute('aria-pressed', 'false');
    mobile.setAttribute('aria-pressed', 'true');
  });
  desktop.setAttribute('aria-pressed', 'true');
  mobile.setAttribute('aria-pressed', 'false');
  sizes.append(desktop, mobile);
  tools.append(sizes);
  const iframe = element('iframe');
  iframe.title = `${pattern.title} interactive specimen`;
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.srcdoc = embeddedPreview(pattern.document);
  stage.append(iframe);
  wrapper.append(tools, stage);
  visual.append(wrapper);
  let selectedVariation = null;
  if (pattern.variations?.length) {
    const group = element('div', 'variation-controls');
    const picker = element('select');
    const label = element('label', '', 'Motion treatment');
    picker.id = 'motion-treatment';
    label.htmlFor = picker.id;
    picker.add(new Option('Original study', ''));
    for (const item of pattern.variations) picker.add(new Option(item.name, item.id));
    const note = element('p', 'variation-note', pattern.variationTrigger + ' in the preview.');
    note.setAttribute('role', 'status');
    picker.addEventListener('change', () => {
      selectedVariation = pattern.variations.find(item => item.id === picker.value) ?? null;
      iframe.srcdoc = embeddedPreview(selectedVariation?.document ?? pattern.document);
      note.textContent = [selectedVariation?.change, pattern.variationTrigger + ' in the preview.'].filter(Boolean).join(' ');
    });
    group.append(label, picker, note);
    visual.append(group);
  }
  if (pattern.motion) {
    const frames = element('div', 'frames');
    for (let frame = 1; frame <= 7; frame++) {
      const image = element('img');
      image.src = `previews/${encodeURIComponent(pattern.id)}/frame-${frame}.png`;
      image.alt = `Original study, motion frame ${frame} of 7`;
      image.loading = 'lazy';
      frames.append(image);
    }
    visual.append(frames);
  }
  const info = element('div');
  info.append(element('h2', '', pattern.title), element('p', '', pattern.summary));
  const actions = element('div', 'detail-actions');
  actions.append(
    button('Copy HTML', () => copy(pattern.html), 'button outline'),
    button('Copy CSS', () => copy([pattern.css, selectedVariation?.css].filter(Boolean).join('\n')), 'button outline'),
    button('Export specimen ↓', () => download(selectedVariation?.document ?? pattern.document, [pattern.id, selectedVariation?.id].filter(Boolean).join('-') + '.html'), 'button dark')
  );
  if (pattern.js) actions.append(button('Copy JavaScript', () => copy(pattern.js), 'button outline'));
  info.append(actions);
  if (pattern.specimenBehavior) info.append(element('p', 'specimen-note', pattern.specimenBehavior));
  addList(info, 'Implementation', Array.isArray(pattern.implementation) ? pattern.implementation : [pattern.implementation].filter(Boolean));
  addList(info, 'Accessibility', Array.isArray(pattern.accessibility) ? pattern.accessibility : [pattern.accessibility].filter(Boolean));
  const provenance = element('div', 'provenance');
  provenance.append(element('p', '', 'Original implementation specimen. Study the primary reference for its shipped context.'));
  if (pattern.sourceUrl) provenance.append(link(`${pattern.sourceName || 'Primary reference'} ↗`, pattern.sourceUrl));
  if (pattern.provenance) provenance.append(element('p', '', typeof pattern.provenance === 'string' ? pattern.provenance : JSON.stringify(pattern.provenance)));
  if (pattern.observedAt || pattern.observedDate) provenance.append(element('p', '', `Reference observed ${pattern.observedAt || pattern.observedDate}`));
  provenance.append(link('Evidence & reconstruction scope ↗', 'https://github.com/Tradelord223/design-atlas-mcp/blob/main/docs/reconstruction.md'));
  info.append(provenance);
  layout.append(visual, info);
  body.append(layout);
}

function openPack(pack, body) {
  body.append(element('h2', '', pack.title), element('p', '', pack.summary));
  const actions = element('div', 'detail-actions');
  if (pack.composer?.tool === 'create_image_atlas') {
    actions.append(link('Open the edition editor ↗', pack.composer.editor), link('Explore STRATA ↗', pack.composer.example));
  }
  actions.append(button('Copy tokens', () => copy(JSON.stringify(pack.tokens, null, 2)), 'button dark'), button('Download pack ↓', () => download(JSON.stringify(pack, null, 2), `${pack.id}.json`, 'application/json'), 'button outline'));
  body.append(actions);
  addList(body, 'Design principles', pack.principles);
  if (pack.sourceUrl) body.append(link(`${pack.sourceName || 'Primary reference'} ↗`, pack.sourceUrl));
  if (pack.provenance) body.append(element('p', '', pack.provenance));
  body.append(element('h3', '', 'Design tokens'), element('pre', 'token-code', JSON.stringify(pack.tokens, null, 2)));
  const references = element('section', 'grid pack-patterns');
  for (const id of pack.patterns || []) {
    const pattern = catalog.patterns.find(item => item.id === id);
    if (pattern) references.append(card(pattern));
  }
  body.append(references);
}

function openFlow(flow, body) {
  body.append(element('h2', '', flow.title), element('p', '', flow.summary));
  body.append(button('Download flow ↓', () => download(JSON.stringify(flow, null, 2), `${flow.id}.json`, 'application/json'), 'button outline'));
  (flow.steps || []).forEach((step, index) => {
    const row = element('section', 'flow-step');
    const content = element('div');
    content.append(element('h3', '', typeof step === 'string' ? step : (step.title || step.name || `Step ${index + 1}`)));
    if (typeof step === 'object') {
      if (step.summary || step.description || step.purpose) content.append(element('p', '', step.summary || step.description || step.purpose));
      const patternId = step.pattern || step.patternId || step.reference;
      const pattern = catalog.patterns.find(item => item.id === patternId);
      if (pattern) content.append(button(`Open ${pattern.title} ↗`, () => openItem(pattern, 'patterns'), 'text-button'));
      for (const [key, value] of Object.entries(step)) {
        if (['title', 'name', 'summary', 'description', 'purpose', 'pattern', 'patternId', 'reference'].includes(key)) continue;
        content.append(element('p', '', `${key.replace(/([A-Z])/g, ' $1')} — ${Array.isArray(value) ? value.join(' · ') : String(value)}`));
      }
    }
    row.append(element('span', '', String(index + 1)), content);
    body.append(row);
  });
  addList(body, 'Implementation guidance', flow.principles || flow.guidance);
  if (flow.successMetric) body.append(element('h3', '', 'Success measure'), element('p', '', flow.successMetric));
  if (flow.sourceUrl) body.append(link(`${flow.sourceName || 'Primary reference'} ↗`, flow.sourceUrl));
}

function openItem(item, type, updateHistory = true) {
  if (!detail.open) lastDetailTrigger = document.activeElement;
  const body = $('#detail-body');
  body.replaceChildren();
  $('#detail-type').textContent = type === 'patterns' ? 'Reference & implementation' : type === 'packs' ? 'Design pack' : 'Experience flow';
  if (type === 'patterns') openPattern(item, body);
  if (type === 'packs') openPack(item, body);
  if (type === 'flows') openFlow(item, body);
  if (updateHistory) updateUrl(type === 'patterns' ? 'id' : type === 'packs' ? 'pack' : 'flow', item.id);
  if (!detail.open) detail.showModal();
  detail.scrollTop = 0;
  $('#detail-close').focus();
}

const clientConfigurations = {
  codex: { command: 'codex mcp add design-atlas -- design-atlas-mcp', help: 'Run this in your terminal, then open a fresh chat.' },
  claude: { command: 'claude mcp add --transport stdio design-atlas -- design-atlas-mcp', help: 'Run this in your terminal, then start a fresh Claude Code session.' },
  desktop: { command: JSON.stringify({ mcpServers: { 'design-atlas': { command: 'design-atlas-mcp', args: [] } } }, null, 2), help: 'Add this entry to the MCP configuration in Cursor or Claude Desktop, then restart the client.' }
};
const clientTabs = [...document.querySelectorAll('[data-client]')];
function selectClient(tab) {
  for (const item of clientTabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  }
  const config = clientConfigurations[tab.dataset.client];
  $('#client-command').textContent = config.command;
  $('#client-help').textContent = config.help;
  $('#client-instructions').setAttribute('aria-labelledby', tab.id);
}
for (const tab of clientTabs) {
  tab.addEventListener('click', () => selectClient(tab));
  tab.addEventListener('keydown', event => {
    const index = clientTabs.indexOf(tab);
    const positions = { ArrowRight: (index + 1) % clientTabs.length, ArrowLeft: (index + clientTabs.length - 1) % clientTabs.length, Home: 0, End: clientTabs.length - 1 };
    if (!(event.key in positions)) return;
    event.preventDefault();
    const next = clientTabs[positions[event.key]];
    selectClient(next);
    next.focus();
  });
}
for (const control of document.querySelectorAll('[data-copy]')) {
  control.addEventListener('click', () => copy(document.getElementById(control.dataset.copy).textContent));
}
const featuredHints = {
  'service-fold': 'Open a question to try the disclosure.',
  'command-launcher': 'Search for “projects”, then choose a command.',
  'cart-edit': 'Change the quantity, remove an item, or undo.'
};
function selectFeatured() {
  if (!catalog) return;
  const id = $('#featured-select').value;
  const edition = id === 'strata-edition';
  $('#featured-edition').hidden = !edition;
  $('#featured-film').hidden = !edition;
  $('#featured-preview').hidden = edition;
  $('#featured-inspect').hidden = edition;
  if (edition) {
    $('#featured-preview').removeAttribute('srcdoc');
    $('#featured-hint').textContent = 'Explore the map and its photographic chapters.';
    return;
  }
  const pattern = catalog.patterns.find(item => item.id === id);
  if (!pattern) return;
  $('#featured-preview').srcdoc = embeddedPreview(pattern.document);
  $('#featured-preview').title = `${pattern.title} live specimen`;
  $('#featured-hint').textContent = featuredHints[id] || pattern.summary;
}
$('#featured-select').addEventListener('change', selectFeatured);
$('#featured-inspect').addEventListener('click', () => {
  const pattern = catalog?.patterns.find(item => item.id === $('#featured-select').value);
  if (pattern) openItem(pattern, 'patterns');
});
function configureConnection() {
  if (catalog.packageUrl && catalog.packageVersion) {
    $('#package-download').href = catalog.packageUrl;
    $('#install-command').textContent = `npm install -g ./design-atlas-mcp-${catalog.packageVersion}.tgz`;
  }
  if (catalog.hostedMcpUrl) {
    const url = new URL(catalog.hostedMcpUrl);
    if (url.protocol !== 'https:') throw new Error('Hosted MCP connection requires a verified HTTPS URL');
    $('#hosted-url').textContent = url.href;
    $('#hosted-connection').append(link('Test the live connection →', './try.html#live-mcp', 'hosted-test-link'));
    $('#hosted-connection').hidden = false;
  }
}

$('#detail-close').addEventListener('click', closeDetail);
detail.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
$('#install-open').addEventListener('click', () => $('#install').showModal());
$('#install-close').addEventListener('click', () => $('#install').close());
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      if (dialog === detail) closeDetail();
      else dialog.close();
    }
  });
}
search.addEventListener('input', () => { state.query = search.value; state.iconLimit = 84; render(); });
tagSelect.addEventListener('change', () => { state.tag = tagSelect.value; state.iconLimit = 84; render(); });
$('#reset').addEventListener('click', () => { state.query = ''; state.tag = ''; search.value = ''; tagSelect.value = ''; render(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !detail.open && !$('#install').open) {
    event.preventDefault(); search.focus();
  }
});
for (const tab of document.querySelectorAll('[data-view]')) tab.addEventListener('click', () => { setView(tab.dataset.view); updateUrl(); });

function syncRoute() {
  if (!catalog) return;
  const params = new URLSearchParams(location.search);
  for (const [key, type] of [['id', 'patterns'], ['pack', 'packs'], ['flow', 'flows']]) {
    if (!params.has(key)) continue;
    const item = catalog[type].find(entry => entry.id === params.get(key));
    if (item) { setView(type); openItem(item, type, false); }
    else notify('That entry is unavailable. Browse the library below.');
    return;
  }
  if (detail.open) {
    detail.close();
    $('#detail-body').replaceChildren();
    lastDetailTrigger?.focus();
  }
}
window.addEventListener('popstate', syncRoute);

try {
  const response = await fetch('catalog.json');
  if (!response.ok) throw new Error(`Catalog request failed with ${response.status}`);
  catalog = await response.json();
  const featured=['opening-imprint','issue-list','calm-product-hero','commerce-product','mobile-daily-log','studio-case-study'];
  const rank=id=>featured.includes(id)?featured.indexOf(id):featured.length;
  catalog.patterns.sort((a,b)=>rank(a.id)-rank(b.id));
  $('#pattern-count').textContent = catalog.patterns.length;
  configureConnection();
  selectFeatured();
  refreshFilters();
  render();
  syncRoute();
} catch (error) {
  console.error(error);
  $('#load-error').hidden = false;
  $('#results').textContent = 'Library unavailable';
}
