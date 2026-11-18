const colorPattern = /^#[0-9a-f]{6}$/i;

export function validateTypography(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('typography must contain body and/or heading font families');
  const output = {};
  for (const key of ['body', 'heading']) {
    if (value[key] === undefined) continue;
    const font = value[key];
    if (typeof font !== 'string' || !font.trim() || font.length > 250 || !font.split(',').every(part => /^(?:[a-z][a-z0-9 -]*|'[a-z][a-z0-9 -]*'|"[a-z][a-z0-9 -]*")$/i.test(part.trim()))) {
      throw new TypeError(`typography.${key} must be a comma-separated list of plain font family names`);
    }
    output[key] = font.trim();
  }
  return output;
}

export function validateRadius(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('radius must contain control and/or panel sizes');
  const output = {};
  for (const key of ['control', 'panel']) {
    if (value[key] === undefined) continue;
    const size = value[key];
    const match = typeof size === 'string' && size.trim().match(/^(0|(?:\d+(?:\.\d+)?|\.\d+)(px|rem|em))$/);
    if (!match || (parseFloat(size) > (match[2] === 'px' ? 64 : 4))) throw new TypeError(`radius.${key} must be 0 or a nonnegative size up to 64px or 4rem/em`);
    output[key] = size.trim();
  }
  return output;
}

export function validateColors(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('colors must contain six-digit hex colors');
  const output = {};
  for (const key of ['background', 'surface', 'text', 'muted', 'border']) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'string' || !colorPattern.test(value[key])) throw new TypeError(`colors.${key} must be a six-digit hex color`);
    output[key] = value[key].toLowerCase();
  }
  return output;
}

function plainText(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, entity) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[entity])).replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map(match => [match[1].toLowerCase(), plainText(match[2] ?? match[3] ?? match[4])]));
}

function normalizeColor(value) {
  if (colorPattern.test(value)) return value.toLowerCase();
  const short = value.match(/^#([0-9a-f]{3})$/i);
  if (short) return '#' + [...short[1]].map(character => character + character).join('').toLowerCase();
  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/i);
  if (rgb && rgb.slice(1).every(channel => Number(channel) <= 255)) return '#' + rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
  return { black: '#000000', white: '#ffffff', navy: '#000080', teal: '#008080' }[value.toLowerCase()];
}

/** Extract declared identity clues from supplied markup and styles without executing or fetching them. */
export function importBrandIdentity(input = {}) {
  const html = input.html || '';
  const css = input.css || '';
  if (typeof html !== 'string' || typeof css !== 'string' || html.length > 500000 || css.length > 500000) throw new TypeError('html and css must be strings up to 500,000 characters each');
  const overrides = { ...(input.overrides || {}) };
  if (input.name !== undefined) overrides.name = input.name;
  if (input.description !== undefined) overrides.description = input.description;
  if (!html.trim() && !css.trim() && !Object.keys(overrides).length) throw new TypeError('Provide supplied HTML, CSS, or explicit identity overrides');
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
  const combinedCss = `${styleBlocks}\n${css}`.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...combinedCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), declarations: [...match[2].matchAll(/([a-z_-][a-z0-9_-]*)\s*:\s*([^;{}]+)/gi)].map(declaration => ({ property: declaration[1].toLowerCase(), value: declaration[2].replace(/\s*!important\s*$/i, '').trim(), excerpt: declaration[0].trim() })) }));
  const variables = new Map();
  for (const rule of rules) for (const declaration of rule.declarations) if (declaration.property.startsWith('--')) variables.set(declaration.property, { ...declaration, selector: rule.selector });
  function resolveValue(value, chain = []) {
    if (chain.length > 8) return undefined;
    if (!value.startsWith('var(')) return { value, chain };
    if (!value.endsWith(')')) return undefined;
    const inner = value.slice(4, -1);
    let depth = 0;
    let comma = -1;
    for (let index = 0; index < inner.length; index++) {
      if (inner[index] === '(') depth++;
      if (inner[index] === ')') depth--;
      if (inner[index] === ',' && depth === 0) { comma = index; break; }
    }
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    if (!/^--[a-z0-9_-]+$/i.test(name) || chain.includes(name)) return undefined;
    const declaration = variables.get(name);
    const fallback = comma < 0 ? undefined : inner.slice(comma + 1).trim();
    return declaration ? resolveValue(declaration.value, [...chain, name]) : (fallback ? resolveValue(fallback, [...chain, `${name} (fallback)`]) : undefined);
  }
  const evidence = [];
  const identity = {};
  const confidence = {};
  function record(field, value, source, excerpt, certainty = 'declared') {
    if (value === undefined || value === '') return;
    const keys = field.split('.');
    let target = identity;
    for (const key of keys.slice(0, -1)) target = target[key] ||= {};
    target[keys.at(-1)] = value;
    evidence.push({ field, value, source, excerpt: excerpt.slice(0, 500), confidence: certainty });
    confidence[field] = certainty;
  }
  const metadata = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => ({ tag: match[0], attrs: attributes(match[0]) }));
  const siteName = metadata.find(meta => (meta.attrs.property || meta.attrs.name)?.toLowerCase() === 'og:site_name');
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (siteName?.attrs.content) record('name', siteName.attrs.content, 'HTML og:site_name', siteName.tag);
  else if (title) record('name', plainText(title[1]), 'HTML title', title[0], 'candidate');
  const description = metadata.find(meta => (meta.attrs.name || meta.attrs.property)?.toLowerCase() === 'description') || metadata.find(meta => meta.attrs.property?.toLowerCase() === 'og:description');
  if (description?.attrs.content) record('description', description.attrs.content, 'HTML description metadata', description.tag);
  const themeColor = metadata.find(meta => meta.attrs.name?.toLowerCase() === 'theme-color');
  const theme = themeColor && normalizeColor(themeColor.attrs.content || '');
  if (theme) record('accent', theme, 'HTML theme-color metadata', themeColor.tag, 'candidate');

  function cssCandidate(field, candidates, validator) {
    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolved = resolveValue(candidate.value);
      if (!resolved) continue;
      let value;
      try { value = validator(resolved.value); } catch { continue; }
      if (value === undefined) continue;
      record(field, value, `CSS ${candidate.selector} / ${candidate.property}`, `${candidate.excerpt}${resolved.chain.length ? ` → ${resolved.chain.join(' → ')} → ${resolved.value}` : ''}`, 'candidate');
      return;
    }
  }
  function variableCandidates(names) { return names.map(name => variables.get(name)).filter(Boolean); }
  function declarations(selectorTest, property) { return rules.filter(rule => selectorTest.test(rule.selector)).flatMap(rule => rule.declarations.filter(declaration => declaration.property === property).map(declaration => ({ ...declaration, selector: rule.selector }))).reverse(); }
  cssCandidate('accent', variableCandidates(['--brand-accent', '--brand-color', '--color-brand', '--color-primary', '--accent', '--accent-color', '--primary']), normalizeColor);
  cssCandidate('colors.background', [...variableCandidates(['--color-background', '--background', '--canvas']), ...declarations(/(?:^|[,\s])(?:body|html|:root)(?:$|[,\s])/, 'background-color')], normalizeColor);
  cssCandidate('colors.surface', variableCandidates(['--color-surface', '--surface', '--card-background']), normalizeColor);
  cssCandidate('colors.text', [...variableCandidates(['--color-text', '--foreground', '--text', '--ink']), ...declarations(/(?:^|[,\s])body(?:$|[,\s])/, 'color')], normalizeColor);
  cssCandidate('colors.muted', variableCandidates(['--color-muted', '--muted', '--text-secondary']), normalizeColor);
  cssCandidate('colors.border', variableCandidates(['--color-border', '--border-color', '--border']), normalizeColor);
  cssCandidate('typography.body', [...variableCandidates(['--font-body', '--font-sans']), ...declarations(/(?:^|[,\s])(?:body|html)(?:$|[,\s])/, 'font-family')], value => validateTypography({ body: value }).body);
  cssCandidate('typography.heading', [...variableCandidates(['--font-heading', '--font-display']), ...declarations(/(?:^|[,\s])h[12](?:$|[,\s])/, 'font-family')], value => validateTypography({ heading: value }).heading);
  cssCandidate('radius.control', [...variableCandidates(['--radius-control', '--button-radius', '--radius']), ...declarations(/(?:^|[,\s.])(?:button|btn|input)(?:$|[,\s.:])/, 'border-radius')], value => validateRadius({ control: value }).control);
  cssCandidate('radius.panel', variableCandidates(['--radius-panel', '--card-radius', '--radius']), value => validateRadius({ panel: value }).panel);

  for (const key of ['name', 'description']) {
    if (overrides[key] === undefined) continue;
    if (typeof overrides[key] !== 'string' || !overrides[key].trim() || overrides[key].length > (key === 'name' ? 100 : 4000)) throw new TypeError(`${key} override must be nonempty text`);
    record(key, overrides[key].trim(), 'Explicit override', overrides[key], 'explicit');
  }
  if (overrides.accent !== undefined) {
    if (typeof overrides.accent !== 'string' || !colorPattern.test(overrides.accent)) throw new TypeError('accent override must be a six-digit hex color');
    record('accent', overrides.accent.toLowerCase(), 'Explicit override', overrides.accent, 'explicit');
  }
  for (const [group, validate] of [['typography', validateTypography], ['radius', validateRadius], ['colors', validateColors]]) {
    if (overrides[group] === undefined) continue;
    for (const [key, value] of Object.entries(validate(overrides[group]))) record(`${group}.${key}`, value, 'Explicit override', value, 'explicit');
  }
  const unknowns = ['Stylesheet precedence, computed styles, media queries and component states require a rendered browser review.', 'Font family declarations identify requested families. Font files, availability, licenses and measured rendering remain unverified.'];
  for (const key of ['name', 'description', 'accent', 'typography.body', 'typography.heading', 'radius.control']) if (!confidence[key]) unknowns.push(`No safe declared ${key} value was found in the supplied material.`);
  const brief = structuredClone(identity);
  if (brief.name?.length > 100) { brief.name = brief.name.slice(0, 100); unknowns.push('The page title exceeds the brand name limit. The kit brief truncates it to 100 characters for review.'); }
  if (brief.description?.length > 4000) brief.description = brief.description.slice(0, 4000);
  return { brief, identity, evidence, confidence, unknowns, readyForKit: Boolean(brief.name && brief.description), scope: 'Static extraction from caller-supplied HTML and CSS. No page is fetched, no code executes, and candidate CSS values are declarations rather than computed identity.' };
}
