import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { patterns, packs, flows, specimenDocument } from '../src/catalog.js';
import { iconPacks, searchIcons } from '../src/icons.js';
import { buildWorkbench } from './workbench.js';
import { buildLiveDemo } from './live-demo.js';
import { buildTry } from './try.js';
import { hostedMcpUrl } from '../src/hosting.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist/site');
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'app.js', 'style.css', 'social.png']) {
  await cp(path.join(root, 'web', name), path.join(output, name));
}
await cp(path.join(root, 'assets/previews'), path.join(output, 'previews'), { recursive: true });
await cp(path.join(root, 'assets/icons'), path.join(output, 'icons'), { recursive: true });
const { version: packageVersion } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (hostedMcpUrl && new URL(hostedMcpUrl).protocol !== 'https:') throw new Error('hostedMcpUrl must be a verified HTTPS URL');
const data = {
  generated: new Date().toISOString(),
  hostedMcpUrl,
  packageVersion,
  packageUrl: `https://github.com/Tradelord223/design-atlas-mcp/releases/download/v${packageVersion}/design-atlas-mcp-${packageVersion}.tgz`,
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
await buildLiveDemo(output);
await buildTry(output);
console.log(`Built ${patterns.length} references, ${packs.length} packs, ${flows.length} flows and ${data.icons.length} icons in ${output}`);
