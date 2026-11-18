import {themeControls} from './theme-controls.js';
import { createImageAtlas, editionLimits } from './lib/image-atlas.js';
import { embeddedPreview } from './lib/embedded.js';
import { readingIconNames } from './lib/atlas-spread-icons.js';

const $ = selector => document.querySelector(selector);
const form = $('#editor-form');
const sourceExamples = new Map();
const drafts = new Map();
const limits = { readings: editionLimits.count, chapters: editionLimits.count };
const photoInfo = new WeakMap();
const photoRequests = new WeakMap();
const positionMaps = [];
let pendingImages = 0;
let photoQueue = Promise.resolve();
const fields = [];
let current;
let selectedExample = 'strata';
let artifact;
let refreshTimer;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function button(text, className, action) {
  const element = node('button', className, text);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
function announcement(text, error = false) {
  const status = $('#load-state');
  status.textContent = text;
  status.classList.toggle('error', error);
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = node('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function filename() {
  return (current.brand.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image-atlas').slice(0, 70);
}
function schedulePreview() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refreshPreview(), 180);
}
function makeField(object, key, label, options = {}) {
  const wrapper = node('label', 'field');
  const caption = node('span', '', label);
  const input = node(options.multiline ? 'textarea' : 'input', options.short ? 'short' : '');
  if (!options.multiline) input.type = options.type || 'text';
  caption.id = 'editor-field-label-' + fields.length;
  input.setAttribute('aria-labelledby', caption.id);
  input.value = object[key] ?? '';
  input.required = options.required !== false;
  if (options.max) input.maxLength = options.max;
  if (options.min !== undefined) input.min = String(options.min);
  if (options.maxNumber !== undefined) input.max = String(options.maxNumber);
  if (options.type === 'number') input.step = 'any';
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.type === 'url') {
    input.inputMode = 'url';
    input.spellcheck = false;
  }
  input.addEventListener('input', () => {
    object[key] = options.type === 'number' ? (input.value === '' ? NaN : Number(input.value)) : input.value;
    options.changed?.(input.value);
    schedulePreview();
  });
  wrapper.append(caption, input);
  if (options.hint) { const hint = node('small', '', options.hint); hint.id = caption.id + '-hint'; input.setAttribute('aria-describedby', hint.id); wrapper.append(hint); }
  fields.push({ input, label, type: options.type });
  return wrapper;
}
function section(title, open = false) {
  const details = node('details');
  details.open = open;
  const summary = node('summary', '', title);
  const content = node('div', 'section-content');
  details.append(summary, content);
  form.append(details);
  return { details, summary, content };
}
function row(...children) {
  const element = node('div', 'field-row');
  element.append(...children);
  return element;
}
function embedded(src) {
  return typeof src === 'string' && /^data:image\/(?:jpeg|png|webp);base64,/i.test(src);
}
function editionImages() {
  return [current.image, ...current.chapters.map(chapter => chapter.image)];
}
async function preparePhoto(file, image, compact = false) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photograph.');
  if (file.size > 24 * 1024 * 1024) throw new Error('Choose a photo smaller than 24 MB.');
  const used = editionImages().reduce((total, item) => total + (item !== image && embedded(item.src) ? item.src.length : 0), 0);
  const available = editionLimits.embeddedTotal - used;
  if (available < 12000) throw new Error('There is little photo space left. Replace other local photos using Compact copies, or use image addresses.');
  const target = Math.min(compact ? 44000 : 130000, editionLimits.embeddedImage, available);
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo. Use its public image address instead.');
    for (const edge of compact ? [640, 560, 420, 320] : [1100, 900, 720, 560, 420, 320]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [.8, .68, .56]) {
        const data = canvas.toDataURL('image/webp', quality);
        if (!data.startsWith('data:image/webp;base64,')) throw new Error('This browser could not encode a WebP photo. Use an image address instead.');
        if (data.length <= target) return { src: data, width: canvas.width, height: canvas.height, bytes: Math.floor((data.length - data.indexOf(',') - 1) * .75) };
      }
    }
    throw new Error('This photo could not fit the remaining edition space. Try a simpler or smaller photograph.');
  } finally { bitmap.close(); }
}
function imageFields(parent, image, prefix) {
  const controls = node('div', 'photo-controls');
  const urlField = makeField(image, 'src', prefix + ' image address', { type: 'url', max: editionLimits.url, hint: 'A public HTTPS address, or choose a photo from your device.' });
  const urlInput = urlField.querySelector('input');
  const summary = node('p', 'embedded-photo');
  const localInput = node('input');
  localInput.type = 'file';
  localInput.accept = 'image/jpeg,image/png,image/webp';
  localInput.hidden = true;
  const sizeLabel = node('label', 'photo-size');
  sizeLabel.append(node('span', '', 'Local copy'));
  const size = node('select');
  size.setAttribute('aria-label', prefix + ' local copy size');
  size.add(new Option('Standard', 'standard'));
  size.add(new Option('Compact · more photos', 'compact'));
  sizeLabel.append(size);
  const feedback = node('p', 'photo-feedback');
  feedback.setAttribute('role', 'status');
  const choose = button('Use a local photo', 'photo-button', () => localInput.click());
  const useUrl = button('Use image address', 'text-button', () => {
    image.src = photoInfo.get(image)?.previousUrl || '';
    update();
    urlInput.focus();
    refreshPreview();
  });
  function update() {
    const isEmbedded = embedded(image.src);
    urlField.hidden = isEmbedded;
    urlInput.disabled = isEmbedded;
    urlInput.value = isEmbedded ? '' : image.src;
    summary.hidden = !isEmbedded;
    useUrl.hidden = !isEmbedded;
    const info = photoInfo.get(image);
    summary.textContent = info ? info.name + ' · embedded WebP · ' + Math.round(info.bytes / 1024) + ' KB' : 'Embedded photo · travels with the downloaded page';
    choose.textContent = isEmbedded ? 'Replace local photo' : 'Use a local photo';
  }
  localInput.addEventListener('change', async () => {
    const file = localInput.files?.[0];
    if (!file) return;
    const request = Symbol('photo');
    const source = current;
    photoRequests.set(image, request);
    pendingImages++;
    choose.disabled = true;
    feedback.textContent = 'Preparing a local copy…';
    feedback.classList.remove('error');
    refreshPreview();
    try {
      const task = photoQueue.then(async () => {
        if (source !== current || photoRequests.get(image) !== request || !editionImages().includes(image)) return;
        const result = await preparePhoto(file, image, size.value === 'compact');
        if (source !== current || photoRequests.get(image) !== request || !editionImages().includes(image)) return;
        const previousUrl = embedded(image.src) ? photoInfo.get(image)?.previousUrl : image.src;
        image.src = result.src;
        photoInfo.set(image, { name: file.name, bytes: result.bytes, previousUrl });
        update();
        feedback.textContent = 'Embedded at ' + result.width + ' × ' + result.height + '. Review the description and credit.';
      });
      photoQueue = task.catch(() => {});
      await task;
    } catch (error) {
      feedback.textContent = error.message || 'The photo could not be prepared.';
      feedback.classList.add('error');
    } finally {
      pendingImages--;
      choose.disabled = false;
      localInput.value = '';
      if (source === current) refreshPreview();
    }
  });
  controls.append(summary, urlField, sizeLabel, choose, useUrl, localInput, feedback);
  parent.append(controls, makeField(image, 'alt', prefix + ' image description', { multiline: true, short: true, max: editionLimits.alt, hint: 'Describe what the photograph shows.' }));
  update();
}
function iconField(item) {
  const wrapper = node('label', 'field');
  wrapper.append(node('span', '', 'Icon'));
  const select = node('select');
  select.setAttribute('aria-label', 'Icon');
  select.add(new Option('None', ''));
  for (const name of readingIconNames) select.add(new Option(name.replace(/-/g, ' '), name));
  select.value = item.icon || '';
  select.addEventListener('change', () => { if (select.value) item.icon = select.value; else delete item.icon; schedulePreview(); });
  wrapper.append(select);
  return wrapper;
}
function markerMap(item, xField, yField) {
  const container = node('div', 'marker-placement');
  const map = node('button', 'position-map');
  map.type = 'button';
  const image = node('img');
  image.alt = '';
  image.src = current.image.src;
  const pin = node('span', 'position-pin');
  pin.setAttribute('aria-hidden', 'true');
  const hint = node('p', 'input-hint', 'Click a point on the full photograph, or enter coordinates below.');
  image.addEventListener('load', () => {
    map.style.width = 'min(100%, ' + (340 * image.naturalWidth / image.naturalHeight) + 'px)';
    map.disabled = false;
    hint.textContent = 'Click a point on the full photograph, or enter coordinates below.';
  });
  image.addEventListener('error', () => { map.disabled = true; hint.textContent = 'The cover photo could not load. Check its address in Hero photograph.'; });
  map.setAttribute('aria-label', 'Set ' + item.label + ' position on the cover. Use horizontal and vertical coordinates with the keyboard.');
  const xInput = xField.querySelector('input');
  const yInput = yField.querySelector('input');
  function update() {
    pin.style.left = item.x + '%';
    pin.style.top = item.y + '%';
    map.style.setProperty('--pin-color', /^#[0-9a-f]{6}$/i.test(current.accent) ? current.accent : '#d9a96f');
  }
  map.addEventListener('click', event => {
    if (!event.detail) { xInput.focus(); return; }
    const box = image.getBoundingClientRect();
    if (!box.width || !box.height) return;
    item.x = Math.max(0, Math.min(100, Math.round((event.clientX - box.left) / box.width * 1000) / 10));
    item.y = Math.max(0, Math.min(100, Math.round((event.clientY - box.top) / box.height * 1000) / 10));
    xInput.value = item.x;
    yInput.value = item.y;
    update();
    schedulePreview();
  });
  xInput.addEventListener('input', update);
  yInput.addEventListener('input', update);
  map.append(image, pin);
  container.append(hint, map);
  positionMaps.push({ image, update });
  update();
  return container;
}

function nextId(collection, prefix) {
  const used = new Set(collection.map(item => item.id));
  let number = 1;
  while (used.has(prefix + '-' + number)) number++;
  return prefix + '-' + number;
}
function rebuildAndFocus(sectionName, index) {
  renderForm();
  const group = form.querySelector('[data-group="' + sectionName + '"]');
  group.open = true;
  const cards = group.querySelectorAll('.item-card');
  if (cards[index]) {
    cards[index].open = true;
    cards[index].querySelector('input,textarea')?.focus();
  } else group.querySelector('summary')?.focus();
  refreshPreview();
}
function collectionSection(kind, singular, nameKey, renderFields) {
  const collection = current[kind];
  const group = section(singular === 'Reading' ? 'Annotations (' + collection.length + ' / 8)' : 'Chapters (' + collection.length + ' / 8)');
  group.details.dataset.group = kind;
  collection.forEach((item, index) => {
    const card = node('details', 'item-card');
    const summary = node('summary', '', singular + ' ' + (index + 1) + ' · ' + (item[nameKey] || 'Untitled'));
    const content = node('div', 'item-content');
    const updateTitle = value => { summary.textContent = singular + ' ' + (index + 1) + ' · ' + (value || 'Untitled'); };
    renderFields(content, item, updateTitle);
    const remove = button('Remove ' + singular.toLowerCase(), 'remove-button', () => {
      if (collection.length <= 1) return;
      collection.splice(index, 1);
      rebuildAndFocus(kind, Math.max(0, index - 1));
      announcement(singular + ' removed.');
    });
    remove.disabled = collection.length <= 1;
    remove.setAttribute('aria-label', 'Remove ' + singular.toLowerCase() + ' ' + (index + 1));
    const actions = node('div', 'item-actions');
    actions.append(remove);
    content.append(actions);
    card.append(summary, content);
    group.content.append(card);
  });
  const add = button('Add ' + singular.toLowerCase(), 'add-button', () => {
    if (collection.length >= limits[kind]) return;
    const item = kind === 'readings'
      ? { id: nextId(collection, 'reading'), label: 'New annotation', value: '—', title: 'New annotation', body: 'Add the context you want readers to see.', x: 50, y: 50 }
      : { id: nextId(collection, 'chapter'), kicker: 'New chapter', title: 'A new chapter', body: 'Add your chapter text.', image: structuredClone(current.image) };
    collection.push(item);
    rebuildAndFocus(kind, collection.length - 1);
    announcement(singular + ' added. Replace the starter text with your content.');
  });
  add.disabled = collection.length >= limits[kind];
  group.content.append(add);
}
function renderForm() {
  fields.length = 0;
  positionMaps.length = 0;
  form.replaceChildren();
  const publication = section('Publication', true);
  publication.content.append(
    makeField(current, 'brand', 'Publication or brand', { max: 80 }),
    makeField(current, 'edition', 'Edition', { max: 100 }),
    makeField(current, 'headline', 'Headline', { multiline: true, short: true, max: 180 }),
    makeField(current, 'deck', 'Introduction', { multiline: true, max: 650 }),
    makeField(current, 'date', 'Date or period', { max: 100 })
  );
  const accent = node('div', 'field');
  accent.append(node('span', '', 'Accent color'));
  const colorControls = node('div', 'accent-field');
  const swatch = node('input');
  swatch.type = 'color';
  swatch.value = /^#[0-9a-f]{6}$/i.test(current.accent) ? current.accent : '#d9a96f';
  swatch.setAttribute('aria-label', 'Accent color picker');
  const colorText = node('input');
  colorText.type = 'text';
  colorText.value = current.accent;
  colorText.required = true;
  colorText.maxLength = 7;
  colorText.pattern = '#[0-9a-fA-F]{6}';
  colorText.spellcheck = false;
  colorText.setAttribute('aria-label', 'Accent hex color');
  swatch.addEventListener('input', () => { current.accent = swatch.value; colorText.value = swatch.value; schedulePreview(); });
  colorText.addEventListener('input', () => { current.accent = colorText.value; if (/^#[0-9a-f]{6}$/i.test(colorText.value)) swatch.value = colorText.value; schedulePreview(); });
  colorControls.append(swatch, colorText);
  accent.append(colorControls);
  publication.content.append(accent);
  fields.push({ input: colorText, label: 'Accent color' });
  publication.content.append(themeControls(current, schedulePreview));

  const hero = section('Hero photograph');
  imageFields(hero.content, current.image, 'Hero');
  collectionSection('readings', 'Reading', 'label', (content, item, updateTitle) => {
    const x = makeField(item, 'x', 'Horizontal position (%)', { type: 'number', min: 0, maxNumber: 100 });
    const y = makeField(item, 'y', 'Vertical position (%)', { type: 'number', min: 0, maxNumber: 100 });
    content.append(
      row(makeField(item, 'label', 'Label', { max: editionLimits.label, changed: updateTitle }), iconField(item)),
      makeField(item, 'value', 'Value or identifier', { max: editionLimits.value }),
      makeField(item, 'title', 'Context title', { max: editionLimits.title }),
      makeField(item, 'body', 'Context', { multiline: true, max: editionLimits.readingBody }),
      markerMap(item, x, y), row(x, y)
    );
  });
  collectionSection('chapters', 'Chapter', 'title', (content, item, updateTitle) => {
    content.append(
      makeField(item, 'kicker', 'Kicker', { max: 100 }),
      makeField(item, 'title', 'Chapter title', { max: 180, changed: updateTitle }),
      makeField(item, 'body', 'Chapter text', { multiline: true, max: 2400 })
    );
    imageFields(content, item.image, 'Chapter');
  });
  const source = section('Source and credit');
  source.content.append(
    makeField(current, 'sourceLabel', 'Credit line', { max: 150 }),
    makeField(current, 'sourceUrl', 'Source page', { type: 'url', max: 2048 })
  );
}
function checkFields() {
  for (const { input, label, type } of fields) {
    input.setCustomValidity('');
    if (type === 'url' && input.value) {
      try {
        const url = new URL(input.value);
        if (url.protocol !== 'https:' || url.username || url.password) input.setCustomValidity('Use a public HTTPS address without a username or password.');
      } catch { input.setCustomValidity('Enter a complete HTTPS address.'); }
    }
    if (!input.checkValidity()) return { input, message: label + ': ' + input.validationMessage };
  }
  return null;
}
function refreshPreview({ report = false } = {}) {
  clearTimeout(refreshTimer);
  const error = $('#preview-error');
  try {
    const invalid = checkFields();
    if (invalid) {
      if (report) { for (let parent = invalid.input.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true; invalid.input.reportValidity(); }
      throw new Error(invalid.message);
    }
    if (report && pendingImages) throw new Error('Wait for the local photo to finish preparing.');
    const result = createImageAtlas(structuredClone(current));
    if (typeof result?.html !== 'string' || !result.html) throw new Error('The page generator did not return a complete page.');
    artifact = result.html;
    $('#preview').srcdoc = embeddedPreview(artifact);
    $('#preview-empty').hidden = true;
    error.hidden = true;
    $('#download-html').disabled = pendingImages > 0;
    $('#download-brief').disabled = pendingImages > 0;
    $('#preview-status').textContent = current.readings.length + ' annotations · ' + current.chapters.length + ' chapters · ready to download';
    $('#source-link').href = current.sourceUrl;
    $('#source-link').hidden = false;
    for (const map of positionMaps) { if (map.image.getAttribute('src') !== current.image.src) map.image.src = current.image.src; map.update(); }
    announcement(pendingImages ? 'Preparing a local photo…' : 'Preview updated.');
    return true;
  } catch (failure) {
    error.textContent = failure.message || 'Check the edition content.';
    error.hidden = false;
    $('#download-html').disabled = true;
    $('#download-brief').disabled = true;
    $('#preview-status').textContent = artifact ? 'Preview shows the last valid content.' : 'Complete the required content to preview this edition.';
    announcement('Check the highlighted content.', true);
    return false;
  }
}
function chooseExample(key) {
  if (!sourceExamples.has(key)) return;
  if (current) drafts.set(selectedExample, structuredClone(current));
  selectedExample = key;
  current = structuredClone(drafts.get(key) || sourceExamples.get(key));
  renderForm();
  refreshPreview();
  $('#reset-example').disabled = false;
}
$('#example').addEventListener('change', event => chooseExample(event.target.value));
$('#reset-example').addEventListener('click', () => {
  drafts.delete(selectedExample);
  current = structuredClone(sourceExamples.get(selectedExample));
  renderForm();
  refreshPreview();
  announcement('Example restored.');
});
$('#download-html').addEventListener('click', () => {
  if (!refreshPreview({ report: true })) return;
  download(artifact, filename() + '.html', 'text/html;charset=utf-8');
  announcement('Working page downloaded.');
});
$('#download-brief').addEventListener('click', () => {
  if (!refreshPreview({ report: true })) return;
  download(JSON.stringify(current, null, 2) + '\n', filename() + '.json', 'application/json');
  announcement('Editable brief saved.');
});
form.addEventListener('submit', event => { event.preventDefault(); refreshPreview({ report: true }); });
for (const control of document.querySelectorAll('[data-size]')) control.addEventListener('click', () => {
  const phone = control.dataset.size === 'phone';
  $('#preview-stage').classList.toggle('phone', phone);
  for (const other of document.querySelectorAll('[data-size]')) other.setAttribute('aria-pressed', String(other === control));
});

async function start() {
  const sources = [['strata', './strata-edition.json'], ['lunar', './lunar-edition.json']];
  const loaded = await Promise.allSettled(sources.map(async ([key, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not load ' + key + ' edition.');
    const value = await response.json();
    createImageAtlas(structuredClone(value));
    sourceExamples.set(key, value);
  }));
  const picker = $('#example');
  for (const option of picker.options) option.disabled = !sourceExamples.has(option.value);
  if (!sourceExamples.size) {
    announcement('The edition examples could not load. Reload the page to try again.', true);
    $('#preview-error').textContent = loaded.find(item => item.status === 'rejected')?.reason?.message || 'The editor could not start.';
    $('#preview-error').hidden = false;
    return;
  }
  picker.disabled = false;
  const first = sourceExamples.has('strata') ? 'strata' : [...sourceExamples.keys()][0];
  picker.value = first;
  chooseExample(first);
  if (sourceExamples.size < sources.length) announcement('One example could not load. The available edition is ready to edit.', true);
}
start().catch(error => announcement(error.message || 'The editor could not start.', true));
