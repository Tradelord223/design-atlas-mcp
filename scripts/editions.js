import { mkdir, cp, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Publish the same artifact a real MCP client receives. No demo-only markup is added.
export async function buildEditions(output) {
  const editor = join(output,'atlas-editor');
  const lib = join(editor,'lib');
  await cp(join(root,'web/atlas-editor'),editor,{recursive:true});
  await mkdir(lib,{recursive:true});
  const modules = (await readdir(join(root,'src'))).filter(f => /^atlas-spread(?:-[a-z-]+)?\.js$/.test(f));
  for (const name of ['image-atlas.js', 'embedded.js', ...modules]) await cp(join(root,'src',name),join(lib,name));
  const client = new Client({name:'atlas-pages-publisher',version:'1'});
  try {
    await client.connect(new StdioClientTransport({command:process.execPath,args:[join(root,'src/cli.js')]}));
    for (const [directory,example] of [['strata','strata-edition.json'],['lunar','lunar-edition.json']]) {
      const input = join(root,'examples',example);
      const brief = JSON.parse(await readFile(input,'utf8'));
      const result = await client.callTool({name:'create_image_atlas',arguments:brief});
      if (result.isError || !result.structuredContent?.html) throw new Error('Edition build failed: ' + result.content[0]?.text);
      const target = join(output,'editions',directory);
      await mkdir(target,{recursive:true});
      await writeFile(join(target,'index.html'),result.structuredContent.html);
      await cp(input,join(editor,example));
    }
  } finally { await client.close(); }
  // Interactions in the film are recorded from the very same published document.
  const video = join(root,'web/edition-film');
  await cp(video,join(output,'editions/strata/film'),{recursive:true});
}
