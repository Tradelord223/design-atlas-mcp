#!/usr/bin/env node
import manifest from '../package.json' with {type:'json'};
import {readFile,mkdir,writeFile,rmdir,unlink} from 'node:fs/promises';
import {resolve,dirname,basename,join} from 'node:path';
import {parseArgs} from 'node:util';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {createServer} from './server.js';
import {startHttp} from './http.js';
import {buildBrandKit} from './brand.js';
import {packs,patterns,flows} from './catalog.js';
import {iconPacks} from './icons.js';

const help=`Design Atlas MCP ${manifest.version}
  design-atlas-mcp                  Start the stdio MCP server
  design-atlas-mcp http [--port N]  Start Streamable HTTP at 127.0.0.1:8787/mcp
  design-atlas-mcp kit brief.json output-directory
                                    Export a brand kit to a new directory
  design-atlas-mcp info             Show library counts
  design-atlas-mcp --help           Show this help`;
async function run(){
  const [cmd,...args]=process.argv.slice(2);
  if(!cmd||cmd==='stdio'){serveStdio(createServer);return}
  if(cmd==='--help'||cmd==='-h'){console.log(help);return}
  if(cmd==='--version'){console.log(manifest.version);return}
  if(cmd==='info'){
    console.log(JSON.stringify({name:'Design Atlas MCP',version:manifest.version,patterns:patterns.length,packs:packs.length,flows:flows.length,iconPacks:iconPacks.map(p=>({id:p.id,count:p.count}))},null,2));return;
  }
  if(cmd==='http'||cmd==='--http'){
    const {values}=parseArgs({args,options:{port:{type:'string'}}});
    const port=Number(values.port??process.env.PORT??8787);
    if(!Number.isInteger(port)||port<0||port>65535) throw new Error('Invalid TCP port.');
    const server=startHttp({port,host:process.env.ATLAS_HOST,publicOrigin:process.env.ATLAS_PUBLIC_ORIGIN});
    server.on('listening',()=>console.error('Design Atlas listening on port '+server.address().port+' at /mcp'));
    server.on('error',err=>{console.error(err.message);process.exitCode=1});
    return;
  }
  if(cmd==='kit'){
    if(args.length!==2) throw new Error('Usage: design-atlas-mcp kit brief.json output-directory');
    const kit=buildBrandKit(JSON.parse(await readFile(args[0],'utf8')));
    const target=resolve(args[1]), parent=dirname(target);
    await mkdir(parent,{recursive:true});
    await mkdir(target);
    const createdFiles=[];
    const createdDirs=new Set([target]);
    try{
      const notes={brand:kit.brand,selectedPack:kit.selectedPack,accessibility:kit.accessibility,sources:kit.sources,steps:kit.implementation.steps};
      const files=[...kit.implementation.files,{path:'design-notes.json',content:JSON.stringify(notes,null,2)}];
      for(const {path,content} of files){
        const file=join(target,path),dir=dirname(file);
        if(!createdDirs.has(dir)){await mkdir(dir);createdDirs.add(dir)}
        await writeFile(file,content,{flag:'wx'});
        createdFiles.push(file);
      }
    }catch(err){
      for(const file of createdFiles.reverse()) await unlink(file).catch(()=>{});
      for(const dir of [...createdDirs].reverse()) await rmdir(dir).catch(()=>{});
      throw err;
    }
    console.log('Created '+basename(target)+' at '+target);return;
  }
  throw new Error('Unknown command. Run design-atlas-mcp --help.');
}
run().catch(error=>{console.error(error.message);process.exitCode=1});
