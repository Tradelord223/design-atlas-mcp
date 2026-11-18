import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { patterns, specimenDocument } from '../src/catalog.js';

const macChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath=process.env.CHROME_PATH || (existsSync(macChrome)?macChrome:undefined);
const browser=await chromium.launch({executablePath,headless:true});
try {
  const selected=process.argv.slice(2);
  for(const p of patterns.filter(p=>!selected.length||selected.includes(p.id))){
    const viewport=p.platform==='mobile'?{width:390,height:680}:{width:800,height:520};
    const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});
    await page.route(/^https?:/,route=>route.abort());
    const dir=new URL('../assets/previews/'+p.id+'/',import.meta.url);
    await mkdir(dir,{recursive:true});
    await page.setContent(specimenDocument(p));
    const panel=page.locator('body > :not(script):not(template):not(style)').first();
    async function capture(file){
      // Capture the component; stages with long scrollable content retain their internal viewport.
      const png=await panel.screenshot({type:'png',caret:'hide',animations:p.motion?'allow':'disabled'});
      await writeFile(new URL(file,dir),png);
      return {file,width:png.readUInt32BE(16),height:png.readUInt32BE(20),sha256:createHash('sha256').update(png).digest('hex')};
    }
    const frames=[];
    if(p.capture){
      if(p.capture.trigger) {
        const trigger = page.locator(p.capture.trigger).first();
        if (p.capture.action === 'hover') await trigger.hover();
        else await trigger.click();
      }
      for(let i=0;i<7;i++){
        const progress=i/6;
        if(p.capture.type==='scroll'){
          await page.locator(p.capture.selector).evaluate((el,f)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*f},progress);
        }else{
          await page.evaluate(time=>{for(const a of document.getAnimations()){a.pause();a.currentTime=time}},progress*p.capture.duration);
        }
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const file=await capture('frame-'+(i+1)+'.png');
        frames.push({...file,...(p.capture.type==='scroll'?{scrollFraction:progress}:{milliseconds:Math.round(progress*p.capture.duration)})});
      }
      if(new Set(frames.map(f=>f.sha256)).size<3) throw new Error('Insufficient distinct motion frames: '+p.id);
      if(p.capture.type==='scroll') await page.locator(p.capture.selector).evaluate(el=>el.scrollTop=0);
    }
    const poster=await capture('poster.png');
    await writeFile(new URL('manifest.json',dir),JSON.stringify({documentSha256:createHash('sha256').update(specimenDocument(p)).digest('hex'),viewport,origin:'Rendered Atlas specimen',poster,frames},null,2)+'\n');
    await page.close();
  }
}finally{await browser.close()}
