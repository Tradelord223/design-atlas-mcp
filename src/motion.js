const base = `
.motion-study{box-sizing:border-box;margin:auto;max-width:880px;min-height:340px;padding:clamp(24px,6vw,58px);background:var(--paper,#f4ede0);color:var(--ink,#26231e);font:16px/1.5 system-ui,sans-serif}
.motion-study *{box-sizing:border-box}.motion-study h2{margin:.2em 0 .4em;font:500 clamp(38px,8vw,80px)/.99 Georgia,serif;letter-spacing:-.045em;text-wrap:balance}
.motion-study p{max-width:48ch}.motion-study button,.motion-study summary{font:inherit;cursor:pointer}.motion-study :focus-visible{outline:3px solid #aa4f0b;outline-offset:4px}
.motion-study .label{font:600 12px/1.4 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.motion-study button{border:1px solid currentColor;border-radius:4px;padding:10px 16px;color:inherit;background:transparent;min-height:44px}
@media(prefers-reduced-motion:reduce){.motion-study *,.motion-study *::before,.motion-study *::after{animation-duration:.001ms!important;animation-delay:0ms!important;transition-duration:.001ms!important;transition-delay:0ms!important;scroll-behavior:auto!important}}
`;
const studies = [
  {
    id:'opening-imprint',title:'An imprint comes into focus',category:'Text reveal',tags:['motion','hero','type','editorial','reveal','landing'],
    summary:'Keep the publisher and byline still while two lines of the headline rise independently into place.',
    sourceName:'Chrome for Developers • text animation techniques',sourceUrl:'https://web.dev/articles/building/split-text-animations',
    html:'<section class="motion-study imprint"><p class="label">West Pier Press</p><h2><span><b>Tidal</b></span><span><b>Almanac.</b></span></h2><p>A pocket guide to the working waterfront.</p><button type="button">Replay title</button></section>',
    css:`.imprint{--paper:#e9eddc;--ink:#233e30;border-top:9px solid currentColor}.imprint h2{font-size:clamp(52px,10vw,94px)}.imprint h2 span{display:block;overflow:hidden;padding-bottom:.06em}.imprint b{display:block;font-weight:400;animation:imprint-rise 780ms cubic-bezier(.2,.7,.15,1) both}.imprint span+span b{animation-delay:100ms;font-style:italic}@keyframes imprint-rise{from{transform:translateY(108%)}to{transform:none}}`,
    js:"document.querySelector('.imprint button').addEventListener('click',()=>document.querySelectorAll('.imprint b').forEach(el=>el.getAnimations().forEach(a=>{a.currentTime=0;a.play()})));",
    capture:{type:'timeline',duration:880}, implementation:'The clipping lives on line wrappers. Reserve the final headline geometry before starting the transform.',
    accessibility:'Keep the title as a single h2 in reading order. Reduced motion shows its final position immediately.'
  },
  {
    id:'reading-tide',title:'A tide line tracks the reader',category:'Scroll animation',tags:['motion','scroll','progress','sticky','article','editorial'],
    summary:'A small, pinned progress rail follows reading position inside a field journal. Reverse scrolling reverses the fill.',
    sourceName:'Chrome for Developers • reading indicator',sourceUrl:'https://developer.chrome.com/docs/css-ui/scroll-driven-animations',
    html:'<article class="motion-study tide"><div class="tide-reader" tabindex="0" role="region" aria-label="Field journal"><div class="tide-meter" aria-hidden="true"><i></i></div><header><p class="label">Field journal · Low country</p><h2>Song of the marsh</h2><p>Six observations from a walk along the tidal flats.</p></header>'+['First light','Mud line','Flood tide','Salt grass','Ebb water','Last ferry'].map((s,i)=>'<section><small>Station '+(i+1)+'</small><h3>'+s+'</h3><p>'+['Oyster beds trace the edge of the creek.','Each stake leaves a different watermark.','A thin seam of foam moves upriver.','The cordgrass bends before the wind arrives.','A channel reappears between sandbars.','Deck lights mark the route home.'][i]+'</p></section>').join('')+'</div></article>',
    css:`.tide{--paper:#172f35;--ink:#f2efdf;padding:18px}.tide-reader{height:340px;overflow:auto;scrollbar-gutter:stable}.tide header,.tide section{padding:14px clamp(20px,6vw,64px) 28px}.tide section{border-top:1px solid #597378}.tide h3{font:36px/1.1 Georgia,serif;margin:.3em 0}.tide small{color:#b5d7c9}.tide-meter{position:sticky;top:0;height:6px;background:#3a5557}.tide-meter i{display:block;height:100%;background:#bbebad;transform-origin:left;transform:scaleX(var(--read,0))}`,
    js:"const journal=document.querySelector('.tide-reader');function measure(){const range=journal.scrollHeight-journal.clientHeight;journal.style.setProperty('--read',range?journal.scrollTop/range:1)}journal.addEventListener('scroll',measure,{passive:true});new ResizeObserver(measure).observe(journal);measure();",
    capture:{type:'scroll',selector:'.tide-reader'},implementation:'Measure the scroll region instead of the window. Pin the six-pixel rail to that region and scale the fill from the left.',
    accessibility:'The journal has a keyboard-focusable named region. Article headings provide an alternate way to navigate.'
  },
  {
    id:'service-fold',title:'An answer unfolds in place',category:'Accordion',tags:['support','accordion','disclosure','faq','motion','service'],
    summary:'Leave the question and its hit area stationary while its answer enters. The disclosure works with native details and summary.',
    sourceName:'GOV.UK Design System • accordion',sourceUrl:'https://design-system.service.gov.uk/components/accordion/',
    html:'<section class="motion-study fold"><p class="label">Library services</p><h2>Borrowing</h2><details><summary>How long can I keep a book?</summary><div><p>Most loans last three weeks. Your receipt shows the return date for each item.</p></div></details><details><summary>Where do I return it?</summary><div><p>Use the returns desk or the after-hours slot at the west entrance.</p></div></details></section>',
    css:`.fold{--paper:#f2efe5}.fold details{border-top:1px solid #77766b}.fold details:last-child{border-bottom:1px solid #77766b}.fold summary{padding:15px 5px;font-weight:650}.fold details[open] div{animation:fold-answer 360ms ease-out both}.fold details p{padding-left:20px;margin-top:0}@keyframes fold-answer{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`,
    capture:{type:'timeline',trigger:'.fold summary',duration:360},implementation:'Use the browser disclosure state for the answer. Apply a short entrance to its contents after opening.',
    accessibility:'Enter and Space toggle the summary. The disclosure remains functional with JavaScript disabled.'
  },
  {
    id:'press-ticket',title:'A ticket confirms its reservation',category:'Button',tags:['motion','button','confirmation','feedback','booking','microinteraction'],
    summary:'A venue ticket moves from available to held. An explicit text confirmation and reversible action accompany the animated corner.',
    sourceName:'GOV.UK Design System • confirmation pages',sourceUrl:'https://design-system.service.gov.uk/patterns/confirmation-pages/',
    html:'<section class="motion-study ticket"><p class="label">Night ferry / Passenger desk</p><div class="stub"><span class="label">One crossing</span><h2>Berth 08</h2><p aria-live="polite">Available for the 18:40 sailing.</p><button type="button" aria-pressed="false">Hold berth</button></div></section>',
    css:`.ticket{--paper:#263f50;--ink:#fff}.ticket .stub{position:relative;overflow:hidden;background:#f4cda0;color:#382c28;padding:24px 30px;border-radius:3px;max-width:520px}.stub::after{content:'';position:absolute;right:0;top:0;border-style:solid;border-width:0 0 46px 46px;border-color:transparent transparent #d69d7b transparent;transform:translate(105%,-105%) rotate(180deg)}.stub.held::after{animation:ticket-stamp 480ms cubic-bezier(.2,.7,.2,1) both}@keyframes ticket-stamp{from{transform:translate(105%,-105%) rotate(180deg)}to{transform:translate(0,0) rotate(180deg)}}.stub p{min-height:1.5em}.stub button{background:#382c28;color:#fff}`,
    js:"const stub=document.querySelector('.stub'),control=stub.querySelector('button');control.addEventListener('click',()=>{const held=stub.classList.toggle('held');control.setAttribute('aria-pressed',String(held));control.textContent=held?'Release berth':'Hold berth';stub.querySelector('[aria-live]').textContent=held?'Held for the 18:40 sailing.':'Available for the 18:40 sailing.'});",
    capture:{type:'timeline',trigger:'.stub button',duration:480},implementation:'Keep one control in the same DOM position. Drive label, reservation status and corner treatment from one boolean.',
    accessibility:'The status line announces the result. Text labels and pressed state communicate availability independently of the moving corner.'
  }
];
export const motionPatterns = studies.map(item=>({...item,css:base+item.css,platform:'web',motion:true,provenance:'Original interactive study. The source link identifies the design or implementation principle.'}));
export const motionPack = {
  id:'motion-printshop',title:'Motion Printshop',summary:'Editorial motion for entrances, reading progress, disclosure and confirmation.',
  tags:['motion','interaction','editorial','typography','publishing'],patterns:studies.map(item=>item.id),
  tokens:{background:'#f4ede0',text:'#26231e',accent:'#375d47',surface:'#fffaf0',headingFont:'Georgia, serif'},
  principles:['Anchor the object that receives the click.','Tie continuous progress to a measured distance.','Every animated state has a legible resting state.']
};
