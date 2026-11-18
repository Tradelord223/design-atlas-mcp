import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { packs, patterns, specimenDocument } from './catalog.js';
import { summary } from './search.js';

const digest = bytes=>createHash('sha256').update(bytes).digest('hex');
const memo = new Map();
const atlasLicense = readFileSync(new URL('../LICENSE',import.meta.url),'utf8');
const originalRights={kind:'original',license:'MIT'};

function readable(value) {return Array.isArray(value)?value.map(v=>'- '+v).join('\n'):String(value??'');}
export function resolvePattern(ref) {
  let key=(ref??'').trim();
  if(/^https?:/i.test(key)){
    const url=new URL(key);
    if(url.hostname==='tradelord223.github.io' && url.pathname.replace(/\/$/,'')==='/design-atlas-mcp') key=url.searchParams.get('id')??'';
    else throw new Error('That link belongs to another catalog. Use an Atlas gallery link or an ID from search_inspirations. The Details catalog is available through its official MCP.');
  }
  const remix=key.match(/\(Atlas ID:\s*([a-z0-9-]+)\)/i);
  if(remix) key=remix[1];
  const p=patterns.find(p=>p.id===key);
  if(!p) throw new Error('Unknown Atlas reference. Search the local library with search_inspirations for a stable ID.');
  return p;
}
function bundleFor(p){
  if(memo.has(p.id)) return memo.get(p.id);
  const rights=p.rights??originalRights;
  const meta={...summary(p),rights,provenance:p.provenance??'Original Design Atlas study of the cited design principle.',packs:packs.filter(pack=>pack.patterns.includes(p.id)).map(pack=>pack.id),capture:p.capture??null};
  const files={
    'instructions.md':'# '+p.title+'\n\n'+p.summary+'\n\n## Build\n\n'+readable(p.implementation)+'\n\n## Accessibility\n\n'+readable(p.accessibility)+'\n\n## Source\n\n'+p.sourceName+' — '+p.sourceUrl+'\n\nUse the included HTML and CSS as a starting point. Preserve content order, controls and focus behavior when adapting the design. The images show this Atlas implementation.\n',
    'LICENSE.txt':rights.licenseText??(rights.license==='MIT'?atlasLicense:rights.license),
    'component.html':p.html,'styles.css':p.css,'reference.json':JSON.stringify(meta,null,2),'index.html':specimenDocument(p)
  };
  if(p.js) files['behavior.js']=p.js;
  const manifest=Object.entries(files).map(([path,data])=>({path,bytes:Buffer.byteLength(data),lines:data.split('\n').length,sha256:digest(data)}));
  const images=JSON.parse(readFileSync(new URL('../assets/previews/'+p.id+'/manifest.json',import.meta.url),'utf8'));
  if(images.documentSha256!==digest(files['index.html'])) throw new Error('Preview is stale for '+p.id+'. Rebuild it with npm run render -- '+p.id);
  const version=digest(JSON.stringify({manifest,images})).slice(0,20);
  const bundle={files,manifest,images,version};
  memo.set(p.id,bundle);
  return bundle;
}
export function inspectReference({id,slug,includeImages=true}){
  const p=resolvePattern(id??slug), b=bundleFor(p);
  const visuals=p.motion?b.images.frames:[b.images.poster];
  const data={...summary(p),rights:p.rights??originalRights,provenance:p.provenance??'Original Design Atlas study',version:b.version,files:b.manifest,visuals,
    instructions:'Read instructions.md first, inspect the visuals, then read the files for the selected detail. Reference links point to the upstream design principle. Captures and code belong to the Atlas study.'};
  const images=includeImages?visuals.map(info=>{
    const image=readFileSync(new URL('../assets/previews/'+p.id+'/'+info.file,import.meta.url));
    if(digest(image)!==info.sha256) throw new Error('Preview integrity check failed. Reinstall the release.');
    return {type:'image',mimeType:'image/png',data:image.toString('base64')};
  }):[];
  return {data,images};
}
function selectFile(args) {
  const b=bundleFor(resolvePattern(args.id??args.slug));
  if(args.version&&args.version!==b.version) throw new Error('Evidence version changed. Call get_inspiration and use its current version.');
  const file=args.path??'instructions.md';
  if(!Object.hasOwn(b.files,file)) throw new Error('Unknown bundle path. Choose a path from get_inspiration.');
  return {b,file,body:b.files[file],sha256:b.manifest.find(row=>row.path===file).sha256};
}
function page(text,offset,limit){
  const chars=Array.from(text);
  if(offset>chars.length) throw new Error('Offset is past the end of this selection.');
  const end=Math.min(chars.length,offset+limit);
  return {text:chars.slice(offset,end).join(''),offset,nextOffset:end<chars.length?end:null,totalCharacters:chars.length};
}
export function readBundle(args){
  const {b,file,body,sha256}=selectFile(args);
  const {offset=0,limit=6000,mode='text'}=args;
  const common={path:file,version:b.version,sha256};
  if(mode==='text') return {...common,...page(body,offset,limit),unit:'Unicode code points'};
  const buffer=Buffer.from(body);
  if(offset>buffer.length) throw new Error('Byte offset is past the end of this file.');
  const end=Math.min(buffer.length,offset+limit), chunk=buffer.subarray(offset,end);
  return {...common,encoding:'base64',unit:'bytes',data:chunk.toString('base64'),chunkSha256:digest(chunk),totalBytes:buffer.length,offset,nextOffset:end<buffer.length?end:null};
}
export function readSource(args){
  const {b,file,body,sha256}=selectFile(args);
  const {startLine=1,lineCount=100,offset=0,limit=6000}=args;
  const lines=body.split('\n');
  if(startLine>lines.length) throw new Error('startLine is past the end of this file.');
  const selected=lines.slice(startLine-1,startLine-1+lineCount),endLine=startLine+selected.length-1;
  const slice=page(selected.map((line,i)=>(i+startLine)+' | '+line).join('\n'),offset,limit);
  return {path:file,version:b.version,sha256,startLine,endLine,totalLines:lines.length,...slice,
    nextStartLine:slice.nextOffset===null&&endLine<lines.length?endLine+1:null};
}
export function vaultResource({id,slug,content='implementation'}){
  const p=resolvePattern(id??slug), b=bundleFor(p);
  const base={id:p.id,title:p.title,version:b.version,sourceUrl:p.sourceUrl,rights:p.rights??originalRights,licenseFile:b.files['LICENSE.txt'],content};
  if(content==='documentation') return {...base,instructions:b.files['instructions.md'],manifest:b.manifest};
  if(content==='extras') return {...base,accessibility:p.accessibility,source:JSON.parse(b.files['reference.json']),visuals:b.images,checks:['Test at a narrow and wide viewport.','Operate each control by keyboard.','Try reduced motion and long translated labels.']};
  return {...base,prompt:'Implement '+p.title+' in the target brand. '+readable(p.implementation)+' '+readable(p.accessibility),html:p.html,css:p.css,...(p.js?{javascript:p.js}:{}),standalonePath:'index.html'};
}
