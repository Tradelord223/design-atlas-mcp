import { mkdir, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { patterns, packs, flows, specimenDocument } from '../src/catalog.js';
import { iconPacks, searchIcons } from '../src/icons.js';
import { buildWorkbench } from './workbench.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist/site');
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'app.js', 'style.css']) {
  await cp(path.join(root, 'web', name), path.join(output, name));
}
await cp(path.join(root, 'assets/previews'), path.join(output, 'previews'), { recursive: true });
await cp(path.join(root, 'assets/icons'), path.join(output, 'icons'), { recursive: true });
const data = {
  generated: new Date().toISOString(),
  patterns: patterns.map(pattern => ({ ...pattern, document: specimenDocument(pattern) })),
  packs,
  flows,
  iconPacks,
  icons: iconPacks.flatMap(pack => {
    const result = [];
    for (let offset = 0; offset < pack.count; offset += 100) {
      result.push(...searchIcons({ pack: pack.id, offset, limit: 100 }).items);
    }
    return result;
  })
};
await writeFile(path.join(output, 'catalog.json'), JSON.stringify(data));
await writeFile(path.join(output, '.nojekyll'), '');
await buildWorkbench(output);
console.log(`Built ${patterns.length} references, ${packs.length} packs, ${flows.length} flows and ${data.icons.length} icons in ${output}`);
