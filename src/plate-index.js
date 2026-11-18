// Three original, diagrammatic plates. Each silhouette is repeated as nested contour
// rings. The same definition supplies the destination and its small navigation preview.
const plates = [
  { id:'headland', title:'The headland', short:'Land meets open water', letter:'A', ink:'#e8b394', paper:'#45372c',
    contour:'M39 108C24 75 49 42 95 45S140 18 179 29s61 37 76 71 9 58-25 66-55-13-95-8-81-17-96-50Z',
    copy:'A long shoulder of land narrows toward the sea. Read the spacing between contours to trace its gentlest approach.' },
  { id:'estuary', title:'The estuary', short:'A river opens to the tide', letter:'B', ink:'#b1d3c1', paper:'#254139',
    contour:'M36 137C57 119 47 83 89 68s56 19 87-12 45-38 66-20 23 48-2 70-65 7-86 32-47 44-82 31-63-8-36-32Z',
    copy:'Channels divide and meet again across the tidal flats. Follow the broad outer line before reading the smaller inlets.' },
  { id:'basin', title:'The basin', short:'Ground falls inward', letter:'C', ink:'#d6c9f4', paper:'#3d354c',
    contour:'M42 97C58 50 107 55 135 31s73-7 91 17 43 54 26 83-32 45-75 43-70 9-97-13S31 130 42 97Z',
    copy:'The contours close around a hollow. Their changing intervals describe a slow descent from rim to floor.' }
];

function plateArt({id, title, ink, paper, contour}, suffix) {
  const key = 'atlas-plate-' + id + '-' + suffix;
  const rings = Array.from({length:15}, (_,i) => {
    const scale = (1.29 - i * .076).toFixed(3);
    return '<use href="#' + key + '" transform="translate(151 100) scale(' + scale + ') translate(-151 -100)"/>';
  }).join('');
  return '<svg aria-hidden="true" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" style="background:'+paper+';color:'+ink+'"><title>'+title+'</title><defs><path id="'+key+'" d="'+contour+'"/></defs><g fill="none" stroke="currentColor" stroke-width="1.25">'+rings+'</g></svg>';
}

const html = `<section class="plate-index" data-atlas-edition>
  <header><span class="plate-wordmark">Isoline <i>Press</i></span><details class="plate-nav">
    <summary>Plate index <span class="plate-chevron" aria-hidden="true">⌄</span></summary>
    <div class="plate-drawer"><nav aria-label="Illustrated plates">${plates.map(p=>`<a href="#atlas-${p.id}" data-plate-link="${p.id}"><small>${p.letter}</small><span>${p.title}<em>${p.short}</em></span><b class="plate-shift" aria-hidden="true"><i>↗</i><i>↗</i></b></a>`).join('')}</nav>
      <div class="plate-thumbs" aria-hidden="true">${plates.map((p,i)=>`<figure data-plate-thumb="${p.id}"${i?' hidden':''}>${plateArt(p,'nav')}<figcaption>Plate ${p.letter} / ${p.title}</figcaption></figure>`).join('')}</div>
    </div></details></header>
  <div class="plate-pages">${plates.map(p=>`<article id="atlas-${p.id}" data-plate-page="${p.id}" tabindex="-1" aria-labelledby="atlas-heading-${p.id}"><div><span class="plate-number">Field forms / Plate ${p.letter}</span><h2 id="atlas-heading-${p.id}">${p.title}</h2><p>${p.copy}</p></div><figure>${plateArt(p,'article')}</figure></article>`).join('')}</div>
</section>`;

const css = `
.plate-index{--plate-ink:#261e19;--plate-paper:#f6f0e6;--plate-line:#c7bbab;box-sizing:border-box;position:relative;max-width:900px;margin:0 auto;background:var(--plate-paper);color:var(--plate-ink);font:16px/1.45 system-ui,sans-serif}
.plate-index *{box-sizing:border-box}.plate-index [hidden]{display:none!important}.plate-index header{padding:16px clamp(14px,4vw,36px);display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--plate-line)}
.plate-index .plate-wordmark{font:600 24px Georgia,serif;letter-spacing:-1.4px}.plate-index .plate-wordmark i{font-weight:400}
.plate-nav summary{cursor:pointer;list-style:none;min-height:36px;font:600 14px/36px system-ui}.plate-nav summary::-webkit-details-marker{display:none}
.plate-chevron{display:inline-block;margin-left:6px;transition:transform .2s}.plate-nav[open] .plate-chevron{transform:rotate(180deg)}
.plate-drawer{position:absolute;z-index:2;right:clamp(10px,4vw,36px);top:59px;width:min(570px,calc(100% - 20px));display:grid;grid-template-columns:1.12fr 1fr;gap:16px;padding:12px;background:#222b25;color:#faf4e8;border:1px solid #637064;box-shadow:0 12px 30px #13201624;animation:plate-arrive .24s cubic-bezier(.2,.75,.25,1) both}
@keyframes plate-arrive{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.plate-drawer nav{display:grid;align-content:start}.plate-drawer a{display:grid;align-items:center;grid-template-columns:1.2em 1fr .9em;gap:.45em;min-height:52px;padding:6px 5px;color:inherit;text-decoration:none;border-bottom:1px solid #526158}
.plate-drawer a:last-child{border-bottom:0}.plate-drawer small,.plate-number,.plate-thumbs figcaption{font:10px/1.4 ui-monospace,monospace;letter-spacing:.07em}.plate-drawer a>span{font:21px/1.05 Georgia,serif}.plate-drawer em{display:block;margin-top:4px;font:normal 11px/1.3 system-ui;color:#c6cfc1}
.plate-drawer a:is(:hover,:focus-visible){background:#39443b}.plate-index :focus-visible{outline:2px solid #dc853c;outline-offset:2px}
.plate-shift{position:relative;display:inline-block;width:.9em;height:1em;overflow:hidden;font:16px/1 system-ui}.plate-shift i{position:absolute;inset:0;font-style:normal;transition:transform .23s ease-out}.plate-shift i+i{transform:translate(-105%,105%)}.plate-drawer a:is(:hover,:focus-visible) .plate-shift i:first-child{transform:translate(105%,-105%)}.plate-drawer a:is(:hover,:focus-visible) .plate-shift i+i{transform:none}
.plate-index figure{margin:0}.plate-index svg{display:block;width:100%;height:100%}.plate-thumbs figure{height:100%;display:grid;grid-template-rows:minmax(0,1fr) auto}.plate-thumbs svg{min-height:100px;max-height:150px}.plate-thumbs figcaption{padding-top:6px;color:#e5ebdf}
.plate-pages article{display:grid;grid-template-columns:1fr 1.15fr;align-items:center;gap:clamp(16px,4vw,32px);padding:clamp(24px,5vw,42px);min-height:300px}.plate-pages h2{font:400 clamp(42px,7vw,74px)/.96 Georgia,serif;letter-spacing:-.065em;margin:.24em 0}.plate-pages p{font-size:14px;max-width:30ch}.plate-pages figure{aspect-ratio:1.5;overflow:hidden}
@media(max-width:540px){.plate-pages article{grid-template-columns:1fr;gap:14px}.plate-pages figure{max-height:150px}.plate-drawer{grid-template-columns:1.18fr .82fr;gap:6px}.plate-drawer a>span{font-size:17px}.plate-drawer em{font-size:10px}.plate-thumbs figcaption{font-size:9px}}
@media(prefers-reduced-motion:reduce){.plate-drawer{animation:none}.plate-nav *{transition:none!important}}
`;

function initializePlateIndex(root) {
  const menu = root.querySelector('details');
  const toggle = menu.querySelector('summary');
  const links = [...menu.querySelectorAll('[data-plate-link]')];
  const pages = [...root.querySelectorAll('[data-plate-page]')];
  const thumbs = [...menu.querySelectorAll('[data-plate-thumb]')];
  function preview(id) {
    for (const thumb of thumbs) thumb.hidden = thumb.dataset.plateThumb !== id;
  }
  function display(id) {
    for (const page of pages) page.hidden = page.dataset.platePage !== id;
    for (const link of links) {
      if (link.dataset.plateLink === id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
    preview(id);
  }
  function fromLocation() {
    const page = pages.find(item => '#' + item.id === location.hash) ?? pages[0];
    display(page.dataset.platePage);
  }
  fromLocation();
  window.addEventListener('hashchange',fromLocation);
  for (const link of links) {
    const id = link.dataset.plateLink;
    link.addEventListener('pointerenter', () => preview(id));
    link.addEventListener('focus', () => preview(id));
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      display(id);
      menu.open = false;
      pages.find(page => page.dataset.platePage === id).focus();
    });
  }
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      toggle.focus();
      event.preventDefault();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('focusout', event => {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
  });
  menu.addEventListener('toggle', () => {
    if (!menu.open) preview(links.find(link => link.hasAttribute('aria-current')).dataset.plateLink);
  });
}

export const plateIndexPattern = {
  id:'plate-index',motion:true,capture:{type:'timeline',trigger:'.plate-nav summary',duration:240},title:'A destination menu with a live plate preview',
  category:'Navigation',platform:'web',tags:['navigation','dropdown','menu','preview','image','arrow','hover','focus','destination','editorial','atlas'],
  summary:'Preview each destination as you move through the index. Follow its link to read the corresponding illustrated plate.',
  sourceName:'W3C WAI · disclosure navigation',
  sourceUrl:'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/',
  provenance:'Original Design Atlas artwork, code and copy. The founder’s public Details film informed the destination-preview and directional-arrow references. The disclosure follows the WAI navigation pattern.',
  html,css,js:"document.querySelectorAll('[data-atlas-edition]').forEach("+initializePlateIndex.toString()+");",
  implementation:'Pair each destination with its own preview. Keep the real href on each link. Pointer entry or keyboard focus may preview an item without navigating. The native index disclosure owns open/close state. The index initially rests closed.',
  accessibility:'Tab to the index and each destination. Escape closes the index and returns focus to its summary. The preview is decorative; the destination remains named in text. Arrow motion honors reduced motion.',
  responsive:'The two-column index stays within the page on narrow screens; the selected plate stacks underneath its text.',
  states:['index open','destination preview','navigation','Escape','narrow viewport','reduced motion']
};

const arrowMarkup = '<span class="atlas-shift-arrow" aria-hidden="true"><span>↗</span><span>↗</span></span>';
const arrowCss = `
.atlas-shift-arrow{position:relative;display:inline-block;flex:none;width:1em;height:1em;overflow:hidden;vertical-align:-.1em;font:inherit;line-height:1}
.atlas-shift-arrow>span{position:absolute;inset:0;transition:transform 240ms cubic-bezier(.2,.72,.22,1)}
.atlas-shift-arrow>span+span{transform:translate(-110%,110%)}
:is(a,button):is(:hover,:focus-visible) .atlas-shift-arrow>span:first-child{transform:translate(110%,-110%)}
:is(a,button):is(:hover,:focus-visible) .atlas-shift-arrow>span+span{transform:none}
@media(prefers-reduced-motion:reduce){.atlas-shift-arrow>span{transition:none!important}}
`;

export const shiftLinkPattern = {
  id:'directional-link',motion:true,capture:{type:'timeline',trigger:'.shift-edition a',action:'hover',duration:240},title:'A directional shift inside an existing link',category:'Button',platform:'web',
  tags:['arrow','shift','button','cta','link','hover','focus','existing-site','motion','affordance'],
  summary:'Two arrows trade places inside a one-em window when a link receives hover or keyboard focus. Its label and hit area stay still.',
  sourceName:'Details founder · publicly demonstrated arrow interaction',sourceUrl:'https://x.com/koppkev/status/2122633959888851130',
  provenance:'Independently implemented from the visible arrow-shift behavior. All code and copy in this specimen are original.',
  html:'<article class="shift-edition"><p class="shift-imprint">Isoline Press</p><h2>Notes from<br>the headland.</h2><a href="#atlas-headland-note">Read the field note '+arrowMarkup+'</a><section id="atlas-headland-note" tabindex="-1"><h3>Field note</h3><p>At the waterline, closely spaced contours mark the steep face of the headland.</p></section></article>',
  css:'.shift-edition{box-sizing:border-box;color:#30251f;background:#efe5d2;padding:38px;max-width:840px;min-height:440px;font:16px/1.5 system-ui}.shift-edition .shift-imprint{font:12px Georgia,serif;font-style:italic}.shift-edition h2{font:normal clamp(48px,8vw,86px)/.9 Georgia,serif;letter-spacing:-.055em;margin:.55em 0 .35em}.shift-edition a{display:inline-flex;align-items:center;gap:18px;color:inherit;min-height:44px;text-underline-offset:6px}.shift-edition section{margin-top:24px;border-top:1px solid #968875;max-width:52ch}.shift-edition h3{margin:.7em 0 .1em;font-size:1em}.shift-edition p{margin:0}.shift-edition :focus-visible{outline:3px solid #7c4530;outline-offset:4px}'+arrowCss,
  implementation:['Keep the existing anchor href or button type, accessible name, label, padding and action. Add the aria-hidden arrow span after the existing label.', 'Copy only the rules starting with .atlas-shift-arrow and its hover, focus and reduced-motion selectors. The .shift-edition rules belong to this specimen.', 'The first arrow exits to the upper right and the second enters from the lower left. Both occupy the same clipped square. Pointer exit reverses the transition.'],
  accessibility:'Decoration is hidden from the accessibility tree. The native action remains usable without JavaScript and without motion.',
  states:['rest','hover','keyboard focus','pointer exit','reduced motion']
};
