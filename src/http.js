import {createServer as httpServer} from 'node:http';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {toNodeHandler,hostHeaderValidation} from '@modelcontextprotocol/node';
import {createServer} from './server.js';

export function startHttp({port=8787,host='127.0.0.1',publicOrigin}={}){
  const origin=publicOrigin&&new URL(publicOrigin);
  if(!['127.0.0.1','::1','localhost'].includes(host)&&!origin) throw new Error('Set ATLAS_PUBLIC_ORIGIN to the external HTTPS origin when binding a public interface.');
  if(origin&&origin.protocol!=='https:') throw new Error('ATLAS_PUBLIC_ORIGIN requires HTTPS.');
  const validateHost=hostHeaderValidation(['localhost','127.0.0.1','[::1]',...(origin?[origin.hostname]:[])]);
  const mcp=createMcpHandler(createServer,{legacy:'stateless',responseMode:'json',maxRequestBodySize:600_000});
  const handle=toNodeHandler(mcp);
  const server=httpServer(async(req,res)=>{
    try{
      const localPort=server.address().port;
      if(!validateHost(req,res)) return;
      const allowedOrigins=['http://127.0.0.1:'+localPort,'http://localhost:'+localPort,'http://[::1]:'+localPort,origin?.origin];
      if(req.headers.origin!==undefined&&!allowedOrigins.includes(req.headers.origin)){
        res.writeHead(403,{'content-type':'text/plain'}).end('Origin is not allowed.');
        return;
      }
      if(req.url?.split('?')[0]!=='/mcp'){
        res.writeHead(404,{'content-type':'text/plain'}).end('Use /mcp for the Design Atlas MCP server.');return;
      }
      await handle(req,res);
    }catch{if(!res.headersSent) res.writeHead(500);res.end()}
  });
  server.on('close',()=>void mcp.close());
  return server.listen(port,host);
}
