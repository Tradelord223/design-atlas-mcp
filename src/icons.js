import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('../assets/icons/', import.meta.url);
const titles = { lucide: 'Lucide', bootstrap: 'Bootstrap Icons', heroicons: 'Heroicons' };
const catalogs = new Map();

export const iconPacks = Object.entries(titles).map(([id, title]) => {
  const directory = new URL(`${id}/`, root);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
  const names = readdirSync(directory).filter(name => name.endsWith('.svg')).map(name => name.slice(0, -4)).sort();
  catalogs.set(id, names);
  return { id, title, ...manifest, count: names.length, licenseFile: `assets/icons/${id}/LICENSE` };
});

function selectPack(id) {
  const pack = iconPacks.find(item => item.id === id);
  if (!pack) throw new Error(`Unknown icon pack ${id}. Choose ${iconPacks.map(item => item.id).join(', ')}.`);
  return pack;
}

export function searchIcons({ query = '', pack, limit = 30, offset = 0 } = {}) {
  if (typeof query !== 'string') throw new TypeError('query must be a string');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('limit must be an integer from 1 to 100');
  if (!Number.isInteger(offset) || offset < 0) throw new RangeError('offset must be a nonnegative integer');
  const selected = pack ? [selectPack(pack)] : iconPacks;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = selected.flatMap(family => catalogs.get(family.id)
    .filter(name => terms.every(term => name.includes(term)))
    .map(name => ({ pack: family.id, name, license: family.license, sourceUrl: family.sourceUrl })));
  return { total: matches.length, offset, limit, items: matches.slice(offset, offset + limit) };
}

export function getIcon({ pack = 'lucide', name } = {}) {
  const family = selectPack(pack);
  if (!catalogs.get(pack).includes(name)) throw new Error(`Unknown icon ${name} in ${pack}. Use search_icons to select an exact name.`);
  return {
    pack, name,
    svg: readFileSync(new URL(`${pack}/${name}.svg`, root), 'utf8'),
    license: family.license,
    licenseText: readFileSync(new URL(`${pack}/LICENSE`, root), 'utf8'),
    sourceUrl: family.sourceUrl,
    version: family.version,
    usage: 'Use currentColor to inherit text color. Give an icon-only control an accessible name. For decorative inline SVG, add aria-hidden="true" and focusable="false". Retain the included license when distributing assets.'
  };
}
