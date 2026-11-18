import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

/** Build the offline browser workbench using the same production brand modules. */
export async function buildWorkbench(outDir) {
  const destination = outDir instanceof URL ? fileURLToPath(outDir) : resolve(outDir);
  const assets = join(destination, 'workbench');
  await mkdir(assets, { recursive: true });
  const template = new URL('../web/workbench/index.html', import.meta.url);
  await writeFile(join(destination, 'workbench.html'), await readFile(template, 'utf8'));
  await Promise.all([
    ...['app.js', 'styles.css'].map(file => copyFile(new URL(`../web/workbench/${file}`, import.meta.url), join(assets, file))),
    ...['embedded.js', 'brand.js', 'identity.js', 'extensions.js', 'catalog.js', 'field-note.js', 'field-note-study.js', 'aperture.js', 'aperture-runtime.js', 'plate-index.js', 'library.js', 'motion.js', 'specimens.js'].map(file => copyFile(new URL(`../src/${file}`, import.meta.url), join(assets, file)))
  ]);
  return { page: join(destination, 'workbench.html'), assets };
}
