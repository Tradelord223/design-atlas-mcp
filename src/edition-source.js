import { parse } from 'parse5';

const hiddenTags = new Set(['script','style','noscript','template','svg','head']);
const valueOf = (node, key) => node.attrs?.find(entry => entry.name === key)?.value;
function available(node) {
  return !hiddenTags.has(node.tagName) && valueOf(node,'hidden') === undefined && valueOf(node,'inert') === undefined && valueOf(node,'aria-hidden') !== 'true';
}
function readable(node) {
  if (node.nodeName === '#text') return node.value;
  return (node.childNodes ?? []).filter(available).map(readable).join(' ');
}
const clean = (value, max) => String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);
function publicUrl(raw, base) {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw,base);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// Read only caller-supplied source. The server never opens or executes the page.
export function inspectEditionSource({html, pageUrl}) {
  if (typeof html !== 'string' || !html.trim() || html.length > 400000) throw new Error('Supply up to 400,000 characters of page HTML.');
  const page = publicUrl(pageUrl);
  if (!page) throw new Error('pageUrl must be an absolute HTTPS URL without embedded credentials.');
  const tree = parse(html, {sourceCodeLocationInfo:true});
  const headings = [], photos = [], controls = [], passages = [], photoUrls = new Set();
  let title = '', description = '', base = page, usedBase = false;
  function walk(node, section, head = false) {
    if (node.tagName === 'head') head = true;
    if (head && node.tagName === 'base' && !usedBase) {
      base = publicUrl(valueOf(node,'href'),page) ?? page;
      usedBase = true;
    }
    if (head && node.tagName === 'title' && !title) title = clean(readable(node),180);
    if (head && node.tagName === 'meta' && valueOf(node,'name')?.toLowerCase() === 'description' && !description) {
      description = clean(valueOf(node,'content'),650);
    }
    if (!head && !available(node)) return;
    if (!head && node.sourceCodeLocation) {
      if (['section','article','main'].includes(node.tagName)) section = valueOf(node,'id') || section;
      const where = {line:node.sourceCodeLocation.startLine, column:node.sourceCodeLocation.startCol, section:section || null};
      if (/^h[1-4]$/.test(node.tagName) && headings.length < 40) {
        const text = clean(readable(node),180);
        if (text) headings.push({level:Number(node.tagName[1]), text, ...where});
      }
      if (node.tagName === 'p' && passages.length < 60) {
        const text = clean(readable(node),800);
        if (text) passages.push({text,...where});
      }
      if (node.tagName === 'img' && photos.length < 40) {
        const src = publicUrl(valueOf(node,'src'),base);
        if (src && !photoUrls.has(src)) {
          photoUrls.add(src);
          photos.push({src,alt:clean(valueOf(node,'alt'),320), ...where});
        }
      }
      if (['a','button','summary'].includes(node.tagName) && controls.length < 80) {
        const label = clean(valueOf(node,'aria-label') || readable(node),180);
        if (label) controls.push({element:node.tagName, label, destination:publicUrl(valueOf(node,'href'),base), ...where});
      }
    }
    for (const child of node.childNodes ?? []) walk(child,section,head);
  }
  walk(tree,null);
  return {pageUrl:page,title,description,headings,photos,controls,passages,
    next:'Choose source-backed headings, images, readings and chapters for create_image_atlas. Supply the image positions after inspecting the picture, and preserve source credits. The line and column pairs refer to the supplied HTML.',
    scope:'Static markup inventory. Client-rendered content, CSS backgrounds, computed geometry and click outcomes require rendered inspection.'};
}
