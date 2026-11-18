import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createImageAtlas } from '../src/image-atlas.js';
import { parse } from 'parse5';

const sample = JSON.parse(readFileSync(new URL('../examples/strata-edition.json',import.meta.url),'utf8'));
test('an edition is deterministic, includes its own interactions, and accepts another brand without leaking STRATA', () => {
  const original = JSON.stringify(sample);
  const first = createImageAtlas(sample);
  assert.deepEqual(first,createImageAtlas(sample));
  assert.equal(JSON.stringify(sample),original);
  const lunar = JSON.parse(readFileSync(new URL('../examples/lunar-edition.json',import.meta.url),'utf8'));
  const result = createImageAtlas(lunar);
  assert.match(result.html,/Lunar Archive/i);
  assert.ok(result.html.includes('--night:'+lunar.theme.ink));
  assert.throws(()=>createImageAtlas({...lunar,theme:{...lunar.theme,ink:lunar.theme.paper}}),/contrast/);
  assert.ok(!result.html.includes('strata-agrisystems'));
  assert.ok(result.html.includes(lunar.image.src));
  assert.ok(result.html.includes(lunar.chapters.at(-1).title));
  const single=createImageAtlas({...sample,readings:sample.readings.slice(0,1),chapters:sample.chapters.slice(0,1)});
  assert.equal(single.filename,'strata-atlas.html');
  assert.ok(single.html.length>500);
});

test('source text remains text in the page and malformed edition fields give specific errors', () => {
  const tmp = {...sample, headline:'<em id="unintended-element">literal</em>'};
  const doc=parse(createImageAtlas(tmp).html);
  const nodes=[];
  function walk(n){nodes.push(n);(n.childNodes??[]).forEach(walk);}
  walk(doc);
  assert.ok(!nodes.some(n=>n.attrs?.some(a=>a.name==='id'&&a.value==='unintended-element')));
  assert.ok(nodes.some(n=>n.value?.includes('<em id="unintended-element">literal</em>')));
  assert.throws(()=>createImageAtlas({...sample,sourceUrl:'file:///tmp/file'}),/HTTPS/);
  assert.throws(()=>createImageAtlas({...sample,image:{...sample.image,src:'/some/file'}}),/HTTPS/);
  assert.throws(()=>createImageAtlas({...sample,readings:[sample.readings[0],sample.readings[0]]}),/unique/);
  assert.throws(()=>createImageAtlas({...sample,readings:[{...sample.readings[0],x:180}]}),/between/);
  assert.throws(()=>createImageAtlas({...sample,chapters:[]}),/1–8/);
  assert.throws(()=>createImageAtlas({...sample,accent:'#bad'}),/six-digit/);
});

test('embedded raster photographs travel with an exported edition and respect the total payload bound', () => {
  const src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6xQAAAAASUVORK5CYII=';
  const photo={src,alt:'Embedded sample'};
  const input={...sample,image:photo,chapters:[{...sample.chapters[0],image:photo}]};
  assert.ok(createImageAtlas(input).html.includes(src));
  assert.throws(()=>createImageAtlas({...input,image:{src:'data:text/html;base64,AAAA',alt:'Wrong type'}}),/JPEG/);
  const large={src:'data:image/png;base64,'+'A'.repeat(225000),alt:'Large example'};
  assert.throws(()=>createImageAtlas({...input,image:large,chapters:[{...sample.chapters[0],image:large}]}),/in total/);
  assert.throws(()=>createImageAtlas({...input,readings:[{...sample.readings[0],icon:'missing-icon'}]}),/Lucide/);
});
