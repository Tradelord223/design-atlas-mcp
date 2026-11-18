import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function buildLiveDemo(output) {
  for (const file of ['live-demo.js', 'live-demo.css']) {
    await copyFile(new URL('../web/' + file, import.meta.url), join(output, file));
  }
  await copyFile(new URL('../src/hosting.js', import.meta.url), join(output, 'hosting.js'));
}
