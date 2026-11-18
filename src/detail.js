import {parseFragment} from 'parse5';
import {escapeHtml} from './catalog.js';

const names=[
  ['heading',/\b(?:heading|headline|title)\b/,['h1','h2','h3']],
  ['disclosure',/\b(?:disclosure|accordion)\b/,['details']],
  ['control',/\b(?:button|cta|action)\b/,['button','.action']],
  ['progress',/\b(?:rail|progress|meter)\b/,['.tide-meter','progress','.progress']],
  ['field',/\b(?:input|field|textbox)\b/,['input','textarea','select']],
  ['form',/\bform\b/,['form']],
  ['list',/\b(?:list|steps)\b/,['ol','ul']],
  ['status',/\b(?:status|feedback|announcement)\b/,['[role=status]']],
  ['label',/\b(?:label|eyebrow|kicker)\b/,['.eyebrow','.label','label']],
  ['card',/\b(?:card|panel)\b/,['.card','.panel']],
  ['link',/\blink\b/,['a']],
  ['navigation',/\b(?:nav|navigation)\b/,['nav']]
];
function match(node,selector){
  const attr=name=>node.attrs?.find(a=>a.name===name)?.value??'';
  if(selector.startsWith('.')) return attr('class').split(/\s+/).includes(selector.slice(1));
  if(selector.startsWith('#')) return attr('id')===selector.slice(1);
  if(selector==='[role=status]') return attr('role')==='status';
  return node.tagName===selector;
}
export function extractDetail(p,request){
  const tree=parseFragment(p.html,{sourceCodeLocationInfo:true}),nodes=[];
  function visit(n){if(n.tagName) nodes.push(n);for(const c of n.childNodes??[])visit(c)}
  visit(tree);
  const explicit=request.trim().match(/^(?:[.#][\w-]+|[a-z][a-z0-9-]*)$/i);
  const group=names.find(([,re])=>re.test(request.toLowerCase()));
  const selectors=[...(explicit?[explicit[0]]:[]),...(group?.[2]??[])];
  let selected,selector;
  for(const sel of selectors){selected=nodes.find(n=>match(n,sel));if(selected){selector=sel;break}}
  if(!selected?.sourceCodeLocation){
    const available=names.filter(([, ,ss])=>nodes.some(n=>ss.some(s=>match(n,s)))).map(([name])=>name);
    throw new Error('Could not isolate that detail. Choose '+available.join(', ')+' or an exact class, ID, or tag from component.html.');
  }
  const pos=selected.sourceCodeLocation;
  const elementHtml=p.html.slice(pos.startOffset,pos.endOffset);
  let html=elementHtml;
  for(let node=selected.parentNode;node?.tagName;node=node.parentNode){
    const attrs=node.attrs.filter(a=>['class','style','lang','dir'].includes(a.name)).map(a=>' '+a.name+'="'+escapeHtml(a.value)+'"').join('');
    html='<'+node.tagName+attrs+'>'+html+'</'+node.tagName+'>';
  }
  return {selector,elementHtml,html,css:p.css,sourceLines:{start:pos.startLine,end:pos.endLine},
    behavior:p.js?'The extracted fragment includes native behavior and CSS. Consult behavior.js for source interactions that depend on sibling controls.':'Native controls and CSS are included.'};
}
