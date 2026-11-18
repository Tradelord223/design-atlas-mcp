import manifest from '../package.json' with {type:'json'};
import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/server';
import { flows, packs } from './catalog.js';
import { inspectReference, readBundle, readSource, vaultResource } from './evidence.js';
import { searchLibrary } from './search.js';
import {importBrandIdentity} from './identity.js';
import {referenceGuide} from './public-details.js';
import { remix } from './remix.js';
import { buildBrandKit, auditDesign } from './brand.js';
import { iconPacks, searchIcons, getIcon } from './icons.js';

const str=(n=500)=>z.string().trim().min(1).max(n);
const int=(min,max)=>z.number().int().min(min).max(max);
const identify={id:str(500).optional().describe('Atlas ID, slug, copied Remix text, or gallery URL.'),slug:str(200).optional()};
const search={
  query:z.string().max(2400).default(''),projectContext:str(1200).optional(),
  projectBrief:z.object({businessType:str().optional(),sectionPurpose:str().optional(),relatedIndustries:z.array(str(100)).max(16).optional()}).optional(),
  excludeIds:z.array(str(120)).max(500).optional(),offset:int(0,10000).optional(),limit:int(1,10).optional(),
  platform:z.enum(['web','mobile']).optional(),category:str(100).optional(),packId:str(100).optional()
};
const paging={...identify,path:str(100).default('instructions.md'),version:str(100).optional(),offset:int(0,2_000_000).optional(),limit:int(1,32_000).optional()};
const identityStyle={
  typography:z.strictObject({body:str(250).optional(),heading:str(250).optional()}).optional(),
  radius:z.strictObject({control:str(24).optional(),panel:str(24).optional()}).optional(),
  colors:z.strictObject(Object.fromEntries(['background','surface','text','muted','border'].map(k=>[k,str(7).optional()]))).optional()
};
const brand={
  ...identityStyle,name:str(100),description:str(4000),audience:str(500).optional(),accent:str(12).optional().describe('Six-digit brand color, e.g. #285b42.'),packId:str(120).optional(),platform:str(80).optional(),voice:str(300).optional(),
  headline:str(180).optional(),actionLabel:str(80).optional(),contactEmail:str(254).optional()
};
function byId(items,id,kind){
  const result=items.find(p=>p.id===id);
  if(!result) throw new Error('Unknown '+kind+' ID. List the collection for current IDs.');
  return result;
}
export const operations=[
  ['search_inspirations','Find authored reference studies. Present the returned candidates with source links, then inspect the selected ID. Continue with nextSearchArguments.',search,searchLibrary],
  ['get_inspiration','Inspect a selected reference. Returns an actual PNG or seven ordered frames, plus a versioned source manifest. Set includeImages to false for metadata only.',{...identify,includeImages:z.boolean().optional()},inspectReference],
  ['read_inspiration_bundle','Read a versioned file. Text offsets count Unicode code points. In transfer mode, concatenate decoded base64 byte chunks and verify the complete SHA-256.',{...paging,mode:z.enum(['text','transfer']).optional()},readBundle],
  ['read_inspiration_source','Read numbered source lines. Continue with nextOffset in the current range, then nextStartLine at offset zero.',{...paging,startLine:int(1,1_000_000).optional(),lineCount:int(1,400).optional()},readSource],
  ['search_vault','Find implementation-ready snippets and interaction studies by task, category, pack and platform.',search,searchLibrary],
  ['get_vault_resource','Get source and an implementation prompt, supporting documentation, or extras for a Vault ID.',{...identify,content:z.enum(['implementation','documentation','extras']).optional()},vaultResource],
  ['get_reference_guide','Open the official provider workflow for an upstream reference. Returns vetted links and native MCP handoff instructions for Details, Mobbin and design-system sources.',{provider:z.enum(['details','mobbin','granola','linear','govuk','stripe','radix','instrument','arena','pentagram']),url:str(2048).optional(),topic:str(500).optional()},args=>{
    const guide=referenceGuide(args);
    if(!guide.ok) throw new Error(guide.error.message);
    return guide;
  }],
  ['list_design_packs','List visual systems with their principles and number of linked patterns.',{},()=>({packs:packs.map(({id,title,summary,tags,patterns})=>({id,title,summary,tags,patternCount:patterns.length}))})],
  ['get_design_pack','Read a pack’s appearance tokens, principles and reference IDs.',{id:str(120)},({id})=>byId(packs,id,'pack')],
  ['list_flows','Find multi-screen journeys with steps, goals and failure states.',{},()=>({flows:flows.map(({id,title,summary})=>({id,title,summary}))})],
  ['get_flow','Get ordered steps, reusable pattern IDs and recovery considerations for a product journey.',{id:str(120)},({id})=>byId(flows,id,'flow')],
  ['list_icon_packs','List installed SVG families with versions, counts and attribution.',{},()=>({packs:iconPacks})],
  ['search_icons','Search local SVG names and families. Use the exact returned pack and name with get_icon.',{query:z.string().max(120).optional(),pack:str(60).optional(),limit:int(1,100).optional(),offset:int(0,100000).optional()},searchIcons],
  ['get_icon','Get the complete inline SVG, its upstream version, license text and accessible usage.',{pack:str(60),name:str(160)},getIcon],
  ['import_brand_identity','Extract declared brand colors, font families, radius, name and description from supplied HTML or CSS. Returns the evidence, unknowns and a brief for create_brand_kit. Runs locally.',{
    html:z.string().max(150000).optional(),css:z.string().max(150000).optional(),name:str(100).optional(),description:str(4000).optional(),
    overrides:z.strictObject({...identityStyle,name:str(100).optional(),description:str(4000).optional(),accent:str(7).optional()}).optional()
  },importBrandIdentity],
  ['create_brand_kit','Build a brand-specific responsive kit. Default returns the source manifest, tokens and contrast checks. Repeat the same brief with output=file and one manifest path to receive its content. Full returns the whole kit.',{...brand,output:z.enum(['full','summary','file']).optional(),path:str(200).optional(),offset:int(0,2000000).optional(),limit:int(1,32000).optional()},({output='summary',path,offset=0,limit=8000,...fields})=>{
    const kit=buildBrandKit(fields);
    if(output==='full') return kit;
    const files=kit.implementation.files;
    if(output==='file'){
      const file=files.find(f=>f.path===path);
      if(!file) throw new Error('Choose a file path returned in the kit summary.');
      const chars=Array.from(file.content);
      if(offset>chars.length) throw new Error('Offset is past the end of the file.');
      const end=Math.min(chars.length,offset+limit);
      return {path,text:chars.slice(offset,end).join(''),offset,nextOffset:end<chars.length?end:null,totalCharacters:chars.length};
    }
    return {brand:kit.brand,selectedPack:kit.selectedPack,tokens:kit.tokens,accessibility:kit.accessibility,sources:kit.sources,
      files:files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.content)})),steps:kit.implementation.steps};
  }],
  ['audit_design','Inspect supplied HTML, CSS and copy for actionable issues. Returns evidence, fixes and scope.',{html:z.string().max(150000).optional(),css:z.string().max(150000).optional(),copy:z.string().max(50000).optional()},auditDesign],
  ['remix_inspirations','Build from a reference, extract a named detail, generate three side-by-side variations, or combine selected sections with attributable motion.',{ids:z.array(str(500)).min(1).max(5),mode:z.enum(['rebuild','detail','variations','combine']),detail:str(300).optional(),headlineMotion:z.literal('opening-imprint').optional()},remix]
];
export function createServer(){
  const server=new McpServer({name:'design-atlas',title:'Design Atlas',version:manifest.version},{
    instructions:'Search with the actual design problem. Show candidate links and source provenance. Inspect selected references and read instructions.md before rebuilding. Use the existing brand brief and create_brand_kit for an implementation. The library and tools run locally.'
  });
  for(const [name,description,shape,handler] of operations){
    server.registerTool(name,{description,inputSchema:z.strictObject(shape),annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async args=>{
      try{
        const result=await handler(args);
        const data=name==='get_inspiration'?result.data:result;
        const images=name==='get_inspiration'?result.images:[];
        return {structuredContent:data,content:[{type:'text',text:JSON.stringify(data)},...images]};
      }catch(error){return {isError:true,content:[{type:'text',text:error.message}]}}
    });
  }
  server.registerResource('library','atlas://library/index',{mimeType:'application/json',description:'Available design and icon packs and flows.'},uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify({packs:packs.map(p=>p.id),flows:flows.map(f=>f.id),icons:iconPacks.map(p=>p.id)})}]}));
  server.registerPrompt('design_from_brief',{description:'Use source-grounded references to design for a new brand.',argsSchema:z.object({brief:str(2000)})},({brief})=>({messages:[{role:'user',content:{type:'text',text:'Here is the brand brief: '+brief+'\nFind relevant Atlas studies. Show the choices and their sources. Inspect the selection, generate a brand kit and use audit_design on the adapted result. Record which design decisions changed for this brand.'}}]}));
  return server;
}
