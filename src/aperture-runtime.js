/** Original bounded media reveal. This module never changes host layout or installs an overlay. */
export function mountAperture(host, options = {}) {
  if (!host?.ownerDocument) throw new TypeError('Aperture needs an existing hero element.');
  const media = options.media ?? host.querySelector('[data-aperture-media]');
  if (!media || !host.contains(media)) throw new TypeError('Aperture media must be inside the hero.');
  const view = host.ownerDocument.defaultView;
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = Math.min(2400, Math.max(400, Number(options.duration) || 1500));
  let animation = null, saved = null, destroyed = false, state = 'idle', generation = 0;
  function report(next) {
    state = next;
    options.onState?.(next);
    host.dispatchEvent(new view.CustomEvent('atlas:aperture', {detail:{state:next}, bubbles:true}));
  }
  function restore() {
    if (!saved) return;
    for (const [name, value, priority] of saved) {
      if (value) media.style.setProperty(name, value, priority);
      else media.style.removeProperty(name);
    }
    saved = null;
  }
  function settle() {
    generation++;
    const current = animation;
    animation = null;
    if (current) current.cancel();
    restore();
  }
  function skip() {
    if (destroyed) return;
    settle();
    report('finished');
  }
  function play() {
    if (destroyed) return false;
    settle();
    if (preference.matches || typeof media.animate !== 'function') {
      report('finished');
      return false;
    }
    saved = ['clip-path','will-change'].map(name=>[name,media.style.getPropertyValue(name),media.style.getPropertyPriority(name)]);
    media.style.setProperty('will-change','clip-path');
    const computed = view.getComputedStyle(media);
    const resting = computed.clipPath;
    const treatment = options.treatment ?? computed.getPropertyValue?.('--atlas-aperture-treatment').trim();
    const entries = {viewfinder:'inset(34% 38% 34% 38% round 2px)',horizon:'inset(46% 8% 46% 8% round 0px)',slit:'inset(8% 47% 8% 47% round 0px)',corner:'inset(8% 8% 64% 64% round 2px)'};
    const entry = Object.hasOwn(entries,treatment) ? entries[treatment] : entries.viewfinder;
    const token = generation;
    animation = media.animate([
      {clipPath:entry,offset:0},
      {clipPath:entry,offset:.12},
      {clipPath:resting==='none'?'inset(0% 0% 0% 0% round 0px)':resting,offset:1}
    ], {duration,easing:'cubic-bezier(.76,0,.24,1)',fill:'both'});
    report('playing');
    animation.finished.then(()=>{
      if (token!==generation || destroyed) return;
      settle();report('finished');
    },()=>{});
    return true;
  }
  function changed(){if(preference.matches && animation) skip()}
  preference.addEventListener('change', changed);
  return {play,skip,get state(){return state},destroy(){
    if (destroyed) return;
    settle();destroyed=true;preference.removeEventListener('change',changed);report('destroyed');
  }};
}
export function initializeApertures(root = document) {
  return [...root.querySelectorAll('[data-atlas-aperture]')].map(host=>{
    const controller=mountAperture(host);
    const handlers=[];
    for(const [selector,action] of [['[data-aperture-play]','play'],['[data-aperture-skip]','skip']]) {
      for(const button of host.querySelectorAll(selector)) {
        const handler=()=>controller[action]();button.addEventListener('click',handler);handlers.push(()=>button.removeEventListener('click',handler));
      }
    }
    return {...controller, get state(){return controller.state}, destroy(){handlers.forEach(fn=>fn());controller.destroy()}};
  });
}
export const apertureRuntime = mountAperture.toString()+'\n'+initializeApertures.toString()+'\ninitializeApertures();';
