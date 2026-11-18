// Read-only acceptance check for a deployed Atlas server, using the official SDK.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { hostedMcpUrl } from '../src/hosting.js';
import { operations } from '../src/server.js';

const address = process.argv[2] || hostedMcpUrl;
if (!address) throw new Error('Pass the full HTTPS /mcp endpoint to verify.');
const url = new URL(address);
if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP(S) endpoint without embedded credentials.');
const client = new Client({ name: 'design-atlas-acceptance', version: '1.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(url));
  const list = await client.listTools();
  const tools = list.tools.map(tool => tool.name).sort();
  assert.deepEqual(tools, operations.map(([name]) => name).sort());
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, name + ' returned an error');
    return result;
  }
  const query = 'meeting notes';
  const search = await call('search_inspirations', { query, limit: 3 });
  assert.ok(search.structuredContent.results.length);
  const evidence = await call('get_inspiration', { id: 'opening-imprint' });
  const images = evidence.content.filter(item => item.type === 'image');
  assert.equal(images.length, 7);
  for (const [index, image] of images.entries()) {
    assert.equal(image.mimeType, 'image/png');
    const bytes = Buffer.from(image.data, 'base64');
    assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.structuredContent.visuals[index].sha256);
  }
  const brand = await call('create_brand_kit', {
    name: 'Harbor Press', description: 'Independent field guides to working waterfronts.', accent: '#345d4e', packId: 'editorial-reference'
  });
  assert.ok(brand.structuredContent.accessibility.contrast.every(item => item.passes));
  assert.ok(brand.structuredContent.files.some(item => item.path === 'index.html'));
  const index = await client.readResource({ uri: 'atlas://library/index' });
  assert.ok(index.contents.length);
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), endpoint: url.href, server: client.getServerVersion(),
    tools: tools.length, query, results: search.structuredContent.results.map(({ id, title }) => ({ id, title })),
    verifiedMotionFrames: images.length, selectedPack: brand.structuredContent.selectedPack.title,
    brandFiles: brand.structuredContent.files.map(item => item.path)
  }, null, 2));
} finally {
  await client.close();
}
