import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {startHttp} from '../src/http.js';
import {patterns,packs,flows} from '../src/catalog.js';
import {operations} from '../src/server.js';
import {inspectReference,readBundle,readSource} from '../src/evidence.js';
import {searchLibrary} from '../src/search.js';

const entry=fileURLToPath(new URL('../src/cli.js',import.meta.url));
const sum=bytes=>createHash('sha256').update(bytes).digest('hex');
test('every pattern has traceable sources, usable files, and intact PNG evidence',()=>{
  assert.equal(new Set(patterns.map(p=>p.id)).size,patterns.length);
  for(const p of patterns){
    assert.ok(packs.some(pack=>pack.patterns.includes(p.id)));
    const {data,images}=inspectReference({id:p.id});
    assert.match(data.sourceUrl,/^https:\/\//);
    assert.equal(images.length,p.motion?7:1);
    for(const [i,f] of images.entries()){
      const bytes=Buffer.from(f.data,'base64');
      assert.equal(bytes.toString('ascii',1,4),'PNG');
      assert.equal(sum(bytes),data.visuals[i].sha256);
    }
    for(const file of data.files){
      const f=readBundle({id:p.id,path:file.path,mode:'transfer',limit:100000,version:data.version});
      assert.equal(sum(Buffer.from(f.data,'base64')),file.sha256);
    }
  }
  for(const f of flows) for(const step of f.steps) assert.ok(patterns.some(p=>p.id===step.pattern));
});
test('source and transfer continuations reconstruct the complete selected file',()=>{
  const id='opening-imprint',path='styles.css';
  const expected=readBundle({id,path,limit:32000}).text;
  let offset=0; const chunks=[];
  do{
    const result=readBundle({id,path,mode:'transfer',limit:17,offset});
    const bytes=Buffer.from(result.data,'base64');
    assert.equal(sum(bytes),result.chunkSha256);
    chunks.push(bytes);offset=result.nextOffset;
  }while(offset!==null);
  assert.equal(Buffer.concat(chunks).toString(),expected);
  let line=1;const found=[];
  do{
    let offset=0,partial='',next;
    do{
      const result=readSource({id,path,startLine:line,lineCount:2,limit:13,offset});
      partial+=result.text;offset=result.nextOffset;next=result.nextStartLine;
    }while(offset!==null);
    found.push(partial);line=next;
  }while(line!==null);
  assert.equal(found.join('\n'),expected.split('\n').map((s,i)=>(i+1)+' | '+s).join('\n'));
  assert.throws(()=>readBundle({id,path,version:'stale'}),/version/);
  assert.throws(()=>readBundle({id,path:'../../.git/config'}),/Unknown bundle path/);
});
test('continuations preserve context, exclude all seen results and terminate',()=>{
  let args={query:'',projectContext:'financial tool',limit:3},seen=new Set();
  for(let i=0;i<100;i++){
    const r=searchLibrary(args);
    for(const p of r.results){assert.ok(!seen.has(p.id));seen.add(p.id)}
    if(!r.hasMore) break;
    args=r.nextSearchArguments;
    assert.equal(args.projectContext,'financial tool');
  }
  assert.equal(seen.size,patterns.length);
  assert.equal(searchLibrary({query:'xxqqzzirrelevant'}).results.length,0);
  assert.ok(searchLibrary({query:'Granola'}).results.some(p=>p.sourceName==='Granola'));
});
async function checkTransport(transport){
  const c=new Client({name:'atlas-test',version:'1.0.0'});
  await c.connect(transport);
  try{
    const tools=await c.listTools();
    assert.deepEqual(new Set(tools.tools.map(t=>t.name)),new Set(operations.map(o=>o[0])));
    const request=async(name,args={})=>{
      const result=await c.callTool({name,arguments:args});
      assert.ok(!result.isError,name+': '+result.content[0]?.text);
      return result;
    };
    const search=(await request('search_inspirations',{query:'accordion'})).structuredContent;
    assert.ok(search.results.length);
    const id='service-fold',inspection=await request('get_inspiration',{id});
    assert.equal(inspection.content.filter(i=>i.type==='image').length,7);
    await request('read_inspiration_bundle',{id,version:inspection.structuredContent.version,path:'instructions.md'});
    await request('read_inspiration_source',{id,path:'component.html'});
    await request('search_vault',{query:'button'});
    for(const content of ['implementation','documentation','extras']) await request('get_vault_resource',{id,content});
    const pack=(await request('list_design_packs')).structuredContent.packs[0].id;
    await request('get_design_pack',{id:pack});
    const flow=(await request('list_flows')).structuredContent.flows[0].id;
    await request('get_flow',{id:flow});
    await request('get_reference_guide',{provider:'mobbin',topic:'onboarding'});
    await request('list_icon_packs');await request('search_icons',{query:'anchor',pack:'lucide'});
    assert.match((await request('get_icon',{name:'anchor',pack:'lucide'})).structuredContent.svg,/<svg/);
    const identity=(await request('import_brand_identity',{html:'<title>North Break</title><meta name="description" content="A journal of working harbors"><meta name="theme-color" content="#345d4e">'})).structuredContent;
    assert.ok(identity.readyForKit);
    const brief=identity.brief;
    const manifest=(await request('create_brand_kit',brief)).structuredContent;
    assert.ok(manifest.files.some(f=>f.path==='index.html'));
    const brandSource=(await request('create_brand_kit',{...brief,output:'file',path:'index.html',limit:50})).structuredContent;
    assert.match(brandSource.text,/doctype/i);
    const kit=(await request('create_brand_kit',{name:'North Break',description:'A journal of working harbors',packId:'editorial-reference',output:'full'})).structuredContent;
    assert.match(kit.html,/North Break/);assert.ok(kit.implementation.files.some(f=>f.path==='tokens.json'));
    const flags=(await request('audit_design',{html:'<img src="photo.png">',copy:'Revolutionary next-generation design.'})).structuredContent;
    assert.ok(flags.issues.length>=2);
    for(const mode of ['detail','rebuild','variations']) await request('remix_inspirations',{ids:[id],mode,detail:'native disclosure'});
    await request('remix_inspirations',{ids:[id,'press-ticket'],mode:'combine',headlineMotion:'opening-imprint'});
    const wrong=await c.callTool({name:'get_inspiration',arguments:{id:'missing'}});
    assert.equal(wrong.isError,true);
    assert.ok((await c.listResources()).resources.some(r=>r.uri==='atlas://library/index'));
    assert.ok((await c.readResource({uri:'atlas://library/index'})).contents.length);
    assert.equal((await c.getPrompt({name:'design_from_brief',arguments:{brief:'A mineral archive'}})).messages.length,1);
  }finally{await c.close()}
}
test('official SDK client exercises every tool over stdio',()=>checkTransport(new StdioClientTransport({command:process.execPath,args:[entry]})));
test('official SDK client exercises every tool over HTTP; browser origin checked',async()=>{
  const server=startHttp({port:0});await once(server,'listening');
  try{
    const url=new URL('http://127.0.0.1:'+server.address().port+'/mcp');
    await checkTransport(new StreamableHTTPClientTransport(url));
    assert.equal((await fetch(url,{method:'POST',headers:{origin:'https://unrelated.example'},body:'{}'})).status,403);
    const body=JSON.stringify({jsonrpc:'2.0',id:2,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'origin-check',version:'1'}}});
    for(const origin of [url.origin,'http://localhost:'+url.port]){
      const valid=await fetch(url,{method:'POST',headers:{origin,'content-type':'application/json',accept:'application/json, text/event-stream'},body});
      assert.equal(valid.status,200);assert.match(await valid.text(),/design-atlas/);
    }
    assert.equal((await fetch(url,{method:'POST',headers:{origin:'http://localhost:1'},body})).status,403);
    const init=await fetch(url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'legacy-test',version:'1'}}})});
    assert.equal(init.status,200);assert.match(await init.text(),/design-atlas/);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
test('motion rejection applies to synonyms and a named detail excludes other content',async()=>{
  assert.ok(searchLibrary({query:'button without animation',limit:10}).results.every(r=>r.visual!=='seven-frame study'));
  const {remix}=await import('../src/remix.js');
  const result=remix({ids:['calm-product-hero'],mode:'detail',detail:'only the heading'});
  assert.equal(result.selector,'h1');
  assert.ok(!result.html.includes('Tuesday planning'));
  assert.match(result.previewHtml,/<h1>/);
});
