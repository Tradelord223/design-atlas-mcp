import { normalizeEditionTheme } from './atlas-spread-theme.js';
import { readingIconNames } from './atlas-spread-icons.js';
import { renderAtlasSpread } from './atlas-spread.js';

// The browser editor and the MCP use the same validation and rendering path.
export const editionLimits = {
  brand:80, edition:100, headline:180, deck:650, date:100, label:80, value:64,
  title:180, readingBody:1600, chapterBody:2400, kicker:100, alt:320, sourceLabel:150,
  url:2048, embeddedImage:320000, embeddedTotal:440000, id:48, count:8
};

function text(value, label, length) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length) {
    throw new Error(label + ' must contain 1–' + length + ' characters.');
  }
  return value.trim();
}
function https(value, label) {
  const raw = text(value, label, editionLimits.url);
  let url;
  try { url = new URL(raw); } catch { /* handled below */ }
  if (!url || url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(label + ' must be an absolute HTTPS URL without embedded credentials.');
  }
  return url.href;
}
function image(value, label) {
  const raw = value?.src;
  let src;
  if (typeof raw === 'string' && raw.startsWith('data:')) {
    if (raw.length > editionLimits.embeddedImage || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
      throw new Error(label + ' needs an embedded JPEG, PNG or WebP under 320,000 characters, or an HTTPS URL.');
    }
    src = raw;
  } else {
    src = https(raw, label + ' URL');
  }
  return {src, alt:text(value?.alt, label + ' description', editionLimits.alt)};
}
function optionalIcon(value, label) {
  if (value === undefined || value === '') return {};
  if (!readingIconNames.includes(value)) throw new Error(label + ' must be a supported Lucide icon.');
  return {icon:value};
}
function position(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(label + ' must be a number between 0 and 100.');
  return value;
}
function entries(items, label, normalize) {
  if (!Array.isArray(items) || !items.length || items.length > editionLimits.count) {
    throw new Error('Provide 1–' + editionLimits.count + ' ' + label + '.');
  }
  const ids = new Set();
  return items.map((item,index) => {
    const path = label + '[' + (index + 1) + ']';
    const id = text(item?.id, path + '.id', editionLimits.id);
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) throw new Error(path + '.id must be a unique lowercase slug starting with a letter.');
    ids.add(id);
    return {id, ...normalize(item, path)};
  });
}
export function createImageAtlas(input) {
  const brief = {};
  for (const key of ['brand','edition','headline','deck','date','sourceLabel']) {
    brief[key] = text(input?.[key], key, editionLimits[key]);
  }
  if (typeof input.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.accent)) throw new Error('accent must be a six-digit hex color.');
  brief.accent = input.accent;
  if (input.theme !== undefined) brief.theme = normalizeEditionTheme(input.theme);
  brief.image = image(input.image, 'Cover image');
  brief.sourceUrl = https(input.sourceUrl, 'Source credit');
  brief.readings = entries(input.readings, 'readings', (item, path) => ({
    ...optionalIcon(item.icon,path + '.icon'), label:text(item.label,path + '.label',editionLimits.label), value:text(item.value,path + '.value',editionLimits.value),
    title:text(item.title,path + '.title',editionLimits.title), body:text(item.body,path + '.body',editionLimits.readingBody),
    x:position(item.x,path + '.x'), y:position(item.y,path + '.y')
  }));
  brief.chapters = entries(input.chapters, 'chapters', (item, path) => ({
    kicker:text(item.kicker,path + '.kicker',editionLimits.kicker), title:text(item.title,path + '.title',editionLimits.title),
    body:text(item.body,path + '.body',editionLimits.chapterBody), image:image(item.image,path + '.image')
  }));
  const photographs = [brief.image, ...brief.chapters.map(chapter => chapter.image)];
  const embeddedLength = photographs.reduce((sum,photo) => sum + (photo.src.startsWith('data:') ? photo.src.length : 0),0);
  if (embeddedLength > editionLimits.embeddedTotal) throw new Error('Embedded photos exceed 440,000 characters in total. Use smaller photos or HTTPS image URLs.');
  const filename = (brief.brand.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'image') + '-atlas.html';
  return {filename,html:renderAtlasSpread(brief)};
}
