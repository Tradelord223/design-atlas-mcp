import { escapeHtml, specimenDocument, patternUrl } from './catalog.js';
import { embeddedPreview } from './embedded.js';
import {extractDetail} from './detail.js';
import { motionVariations } from './motion-variations.js';
import { inspectReference, resolvePattern } from './evidence.js';
const directions=[
  {id:'print-measure',name:'Print measure',change:'Constrain the text measure and increase editorial headline contrast.',css:'body :is(.atlas-specimen,.motion-study,.plate-index,.shift-edition,.field-note-example) :is(h1,h2){font-family:Georgia,serif;font-weight:400;letter-spacing:-.045em;max-width:16ch}body :is(.atlas-specimen,.motion-study,.plate-index,.shift-edition,.field-note-example) p{max-width:40ch}'},
  {id:'closer-spacing',name:'Closer spacing',change:'Tighten the page rhythm while retaining control hit areas.',css:'body :is(.atlas-specimen,.motion-study,.plate-index,.shift-edition,.field-note-example){padding:18px}body .atlas-specimen :is(.grid,.stack,.row){gap:8px}body .atlas-specimen .card{padding:14px}body :is(.atlas-specimen,.motion-study,.plate-index,.shift-edition,.field-note-example) :is(h1,h2,h3,p){margin-block-end:8px}'},
  {id:'ink-on-paper',name:'Ink on paper',change:'Replace the palette with ink, warm paper and an ochre accent.',css:'body :is(.atlas-specimen,.motion-study,.plate-index,.shift-edition,.field-note-example){--paper:#fff6dc!important;--ink:#312a22!important;--accent:#825216!important;--muted:#645e51!important;--line:#bcb19c!important;background:#fff6dc;color:#312a22}body .atlas-specimen .card{background:#fffaf0}'}
];
function frame(title,doc){
  return '<section><h2>'+escapeHtml(title)+'</h2><iframe sandbox="allow-scripts" title="'+escapeHtml(title)+'" srcdoc="'+escapeHtml(embeddedPreview(doc))+'"></iframe></section>';
}
function preview(title,sections){
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(title)+'</title><style>*{box-sizing:border-box}body{font:16px/1.5 system-ui;margin:clamp(12px,3vw,40px);background:#fbfaf5;color:#242823}h1{font:42px Georgia,serif}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px}h2{font-size:17px}iframe{width:100%;height:540px;border:1px solid #cbc8bc;border-radius:6px;background:white}</style><h1>'+escapeHtml(title)+'</h1><main>'+sections.join('')+'</main></html>';
}
export function remix({ids,mode='variations',detail,headlineMotion,variant}){
  const refs=ids.map(resolvePattern);
  if(new Set(refs.map(p=>p.id)).size!==refs.length) throw new Error('Choose distinct references.');
  if(mode==='combine'&&refs.length<2&&!headlineMotion) throw new Error('Combine at least two sections, or choose one section and headlineMotion.');
  if(mode!=='combine'&&refs.length!==1) throw new Error('This mode takes exactly one reference.');
  if(headlineMotion&&mode!=='combine') throw new Error('headlineMotion applies to a composition.');
  if(variant && mode!=='variations') throw new Error('The variant selector applies to variations mode.');
  const [p]=refs;
  const sources=refs.map(p=>({id:p.id,sourceUrl:p.sourceUrl,url:patternUrl(p.id),part:'section'}));
  if(mode==='rebuild') return {sources,html:specimenDocument(p),implementation:p.implementation,accessibility:p.accessibility};
  if(mode==='detail'){
    if(!detail?.trim()) throw new Error('Name the detail to extract, such as the disclosure or reading rail.');
    const part=extractDetail(p,detail);
    return {detail,sources,...part,previewHtml:specimenDocument({...p,js:''},{fragment:part.html}),
      supportingFiles:['styles.css',...(p.js?['behavior.js']:[])],guidance:p.implementation};
  }
  if (mode === 'variations') {
    const motion = motionVariations(p.id);
    const choices = motion?.choices ?? directions;
    const version = inspectReference({id:p.id,includeImages:false}).data.version;
    const context = {sources, version, scope:motion ? 'motion' : 'visual treatment'};
    if (variant) {
      const selected = choices.find(choice => choice.id === variant);
      if (!selected) throw new Error('Choose one of these variant IDs: ' + choices.map(choice => choice.id).join(', '));
      return {
        ...context, selected, html:specimenDocument(p,{extraCss:selected.css}),
        integration:'Use the inspected reference HTML and behavior, and append the selected CSS after its styles. Keep the host content and controls in their current order.',
        accessibility:p.accessibility
      };
    }
    return {
      ...context, variants:choices, trigger:motion?.trigger,
      html:preview(p.title+' — variations',choices.map(choice=>frame(choice.name,specimenDocument(p,{extraCss:choice.css})))),
      next:'Call remix_inspirations again in variations mode with the same reference ID and a returned variant ID to export that working version.'
    };
  }
  const documents=refs.map(p=>({p,html:specimenDocument(p)}));
  if(headlineMotion){
    const m=resolvePattern(headlineMotion);
    if(m.id!=='opening-imprint') throw new Error('The portable headline motion is opening-imprint. Add interactive or scroll-bound motions as independent section IDs.');
    const p=refs[0];
    if(!/<h[12]\b/i.test(p.html)) throw new Error('The first section needs an h1 or h2 for headlineMotion.');
    const fragment=p.html.replace(/(<h[12]\b[^>]*>)([\s\S]*?)(<\/h[12]>)/i,'$1<span class="atlas-remix-clip"><span class="atlas-remix-title">$2</span></span>$3');
    documents[0].html=specimenDocument(p,{fragment,extraCss:'.atlas-remix-clip,.atlas-remix-title{display:block}.atlas-remix-clip{overflow:hidden}.atlas-remix-title{animation:atlas-rise 780ms cubic-bezier(.2,.7,.15,1) both}@keyframes atlas-rise{from{transform:translateY(108%)}to{transform:none}}@media(prefers-reduced-motion:reduce){.atlas-remix-title{animation:none}}'});
    sources.push({id:m.id,sourceUrl:m.sourceUrl,part:'headline entrance on '+p.id,adaptation:'Single headline clipped as one group.'});
  }
  return {sources,sections:documents.map(({p,html})=>({id:p.id,html})),html:preview('Composition proof',documents.map(({p,html})=>frame(p.title,html))),integration:'The comparison uses isolated iframes. For production use the sections in order, scope their selectors, namespace duplicate IDs, and keep a single page-level h1.'};
}
