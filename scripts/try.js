import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { patterns, packs, specimenDocument } from '../src/catalog.js';
import { inspectReference, readSource } from '../src/evidence.js';

/** Build the public, browser-local walkthrough from the production catalog and evidence. */
export async function buildTry(outDir) {
  const destination = outDir instanceof URL ? fileURLToPath(outDir) : resolve(outDir);
  const assets = join(destination, 'try');
  await mkdir(assets, { recursive: true });
  const records = patterns.map(pattern => {
    const inspection = inspectReference({ id: pattern.id, includeImages: false }).data;
    const excerpt = readSource({ id: pattern.id, path: 'instructions.md', startLine: 1, lineCount: 28, limit: 6000 });
    return { ...pattern, document: specimenDocument(pattern), packId: packs.find(pack => pack.patterns.includes(pattern.id))?.id,
      version: inspection.version, sourceExcerpt: excerpt.text, sourceFile: excerpt.path, sourceSha256: excerpt.sha256 };
  });
  await writeFile(join(destination, 'try.html'), await readFile(new URL('../web/try/index.html', import.meta.url), 'utf8'));
  await writeFile(join(assets, 'catalog.json'), JSON.stringify({ origin: 'Built from the shipped Design Atlas catalog and versioned source bundles', records }) + '\n');
  await Promise.all([
    ...['app.js', 'styles.css', 'walkthrough.mp4', 'walkthrough.png'].map(file => copyFile(new URL(`../web/try/${file}`, import.meta.url), join(assets, file))),
    ...['brand.js', 'identity.js', 'extensions.js', 'catalog.js', 'library.js', 'motion.js', 'specimens.js', 'search.js'].map(file => copyFile(new URL(`../src/${file}`, import.meta.url), join(assets, file)))
  ]);
  return { page: join(destination, 'try.html'), assets };
}
