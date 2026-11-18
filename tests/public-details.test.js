import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceGuide} from '../src/public-details.js';

test('Details selected inspiration produces a canonical official handoff',()=>{
  const result=referenceGuide({provider:'details',url:'https://www.details.so/inspo/structured-uzd7oh/?utm_source=atlas',topic:'a content section'});
  assert.equal(result.ok,true);
  assert.equal(result.reference.url,'https://www.details.so/inspo/structured-uzd7oh');
  assert.equal(result.nativeMcp.tool,'get_inspiration');
  assert.equal(result.nativeMcp.referenceSlug,'structured-uzd7oh');
  assert.equal(result.networkRequests,0);
  assert.match(result.nativeMcp.schemaStatus,/connected official server/);
  assert.ok(result.links.some(link=>link.url==='https://www.details.so/legal/terms'));
});
test('Details Vault markdown selections route to native implementation retrieval',()=>{
  const result=referenceGuide({provider:'details',url:'https://details.so/vault/parallax-images.md'});
  assert.equal(result.reference.url,'https://www.details.so/vault/parallax-images');
  assert.equal(result.nativeMcp.tool,'get_vault_resource');
  assert.equal(result.nativeMcp.content,'implementation');
  assert.equal(result.codexCommands[0],'codex mcp add details --url https://api.details.so/mcp');
});
test('Mobbin handoff uses its official connection guide and user selection',()=>{
  const result=referenceGuide({provider:'mobbin',topic:'accessible paywalls',url:'https://mobbin.com/browse/ios/apps?ref=atlas'});
  assert.equal(result.ok,true);
  assert.match(result.suggestedPrompt,/accessible paywalls/);
  assert.ok(result.links.some(link=>link.url==='https://mobbin.com/mcp'));
  assert.equal(result.reference.url,'https://mobbin.com/browse/ios/apps');
  assert.equal(result.nativeMcp,null);
});
test('documented component topics return precise primary reference links',()=>{
  assert.ok(referenceGuide({provider:'govuk',topic:'validation errors'}).links.some(link=>link.url.endsWith('/components/error-summary/')));
  assert.ok(referenceGuide({provider:'instrument',topic:'design system'}).links.some(link=>link.url.endsWith('/work/nike-digital-design-system')));
});
test('rejects unsupported URLs and inputs without network activity',()=>{
  for(const url of ['http://www.details.so/inspo/test','https://evil.example/inspo/test','https://www.details.so.evil.example/inspo/test','https://user:secret@www.details.so/inspo/test','https://www.details.so:123/inspo/test','https://www.details.so/inspo/%2fadmin','https://www.details.so/vault/category/free']){
    const result=referenceGuide({provider:'details',url});
    assert.equal(result.ok,false,url);
    assert.equal(result.networkRequests,0);
  }
  for(const input of [null,[],{provider:'unknown'},{provider:'details',topic:'a'.repeat(501)}])assert.equal(referenceGuide(input).ok,false);
});
test('the guide remains pure when all network APIs are unavailable',()=>{
  const oldFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('No network permitted');};
  try {
    for(const provider of ['details','mobbin','granola','linear','govuk','stripe','radix','instrument','arena','pentagram']){
      const result=referenceGuide({provider});
      assert.equal(result.ok,true);
      assert.equal(result.networkRequests,0);
    }
  } finally {globalThis.fetch=oldFetch;}
});
