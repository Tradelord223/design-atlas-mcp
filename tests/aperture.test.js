import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAperture} from '../src/aperture-runtime.js';
import {aperturePattern} from '../src/aperture.js';
function fixture(reduced=false){
 const props=new Map([['clip-path',['inset(1px)','important']]]),events=[],animations=[],listeners=new Set();
 const style={getPropertyValue:n=>props.get(n)?.[0]??'',getPropertyPriority:n=>props.get(n)?.[1]??'',setProperty:(n,v,p='')=>props.set(n,[v,p]),removeProperty:n=>props.delete(n)};
 const preference={matches:reduced,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 const media={style,animate(frames,settings){let finish,reject;const a={frames,settings,cancelled:false,finished:new Promise((r,j)=>{finish=r;reject=j}),finish(){finish()},cancel(){this.cancelled=true;reject(new Error('cancelled'))}};animations.push(a);return a}};
 const view={matchMedia:()=>preference,getComputedStyle:()=>({clipPath:'inset(1px)'}),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}};
 const host={ownerDocument:{defaultView:view},querySelector:()=>media,contains:el=>el===media,dispatchEvent:e=>events.push(e)};
 return {host,media,props,events,animations,preference,listeners};
}
test('completion restores exact prior inline values and never mutates host geometry',async()=>{
 const f=fixture(),c=mountAperture(f.host,{duration:99999});assert.equal(c.play(),true);
 assert.equal(c.state,'playing');assert.equal(f.animations[0].settings.duration,2400);assert.match(f.animations[0].frames[0].clipPath,/34% 38%/);
 f.animations[0].finish();await Promise.resolve();assert.equal(c.state,'finished');assert.deepEqual(f.props.get('clip-path'),['inset(1px)','important']);assert.equal(f.props.has('will-change'),false);c.destroy();assert.equal(f.listeners.size,0);
});
test('replay cancels prior animation; stale finish cannot terminate the new run',async()=>{
 const f=fixture(),c=mountAperture(f.host);c.play();const first=f.animations[0];c.play();first.finish();await Promise.resolve();assert.equal(first.cancelled,true);assert.equal(c.state,'playing');assert.equal(f.animations.length,2);c.skip();assert.equal(c.state,'finished');assert.equal(f.props.has('will-change'),false);c.destroy();assert.equal(c.play(),false);
});
test('reduced motion starts stable and changes during playback immediately settle',()=>{
 const f=fixture(true),c=mountAperture(f.host);assert.equal(c.play(),false);assert.equal(f.animations.length,0);assert.equal(c.state,'finished');f.preference.matches=false;c.play();f.preference.matches=true;for(const fn of f.listeners)fn();assert.equal(c.state,'finished');assert.equal(f.animations[0].cancelled,true);c.destroy();
});
test('foreign media is rejected and specimen ships actual integration instructions',()=>{
 const f=fixture();assert.throws(()=>mountAperture(f.host,{media:{}}),/inside/);assert.match(aperturePattern.js,/function mountAperture/);assert.match(aperturePattern.implementation.join('\n'),/const reveal = mountAperture/);assert.match(aperturePattern.html,/data:image\/svg\+xml/);
});

test('enumerated aperture shape changes entry only and preserves original resting shape',()=>{
 const f=fixture(),c=mountAperture(f.host,{treatment:'horizon'});c.play();assert.equal(f.animations[0].frames[0].clipPath,'inset(46% 8% 46% 8% round 0px)');assert.equal(f.animations[0].frames.at(-1).clipPath,'inset(1px)');c.destroy();
 const other=fixture(),fallback=mountAperture(other.host,{treatment:'url(unsafe)'});fallback.play();assert.match(other.animations[0].frames[0].clipPath,/34% 38%/);fallback.destroy();
});
