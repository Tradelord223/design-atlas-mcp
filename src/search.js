import { patterns, packs, patternUrl } from './catalog.js';

const stop = new Set('a an and any as at be but by design designs example examples find for from give how i in inspiration inspirations is it me my of on one or our page pages pattern patterns please references show some that the their to use want we with without not no avoid like looking simple using has which would'.split(' '));
const groups = [
  'notebook notepad meeting notes writing editor granola', 'onboarding signup welcome introduction first-run',
  'checkout payment purchase shopping commerce order', 'dashboard metrics monitoring analytics reporting chart',
  'price pricing paywall subscription plans billing', 'accordion expand collapse disclosure faq',
  'animated motion animation transition microinteraction', 'notification status feedback confirmation receipt',
  'filter filters facets search discovery catalog gallery', 'typography type headline editorial publishing',
  'mobile ios android phone responsive', 'task tasks issues triage tracker queue kanban linear',
  'accessibility accessible keyboard inclusive', 'store retail product merchandise ecommerce',
  'developer developers devtools code api technical', 'government public service civic',
  'form fields input validation error recovery', 'comparison compare choose selection'
].map(group=>group.split(' '));
function words(text) {
  return (String(text??'').toLowerCase().normalize('NFKD').match(/[\p{L}\p{N}]+/gu)??[]).filter(w=>!stop.has(w));
}
function contextualTerms(brief) {
  if (!brief) return '';
  return typeof brief==='object'?Object.values(brief).flat().join(' '):brief;
}
function textScore(terms, weighted) {
  return terms.reduce((score, term)=>{
    let best=0;
    for(const [tokens,weight] of weighted) {
      if(tokens.has(term)) best=Math.max(best,weight);
      else if(groups.some(group=>group.includes(term)&&group.some(other=>tokens.has(other)))) best=Math.max(best,weight*.35);
    }
    return score+best;
  },0);
}
export function summary(p) {
  return {id:p.id,title:p.title,summary:p.summary,tags:p.tags,platform:p.platform,category:p.category,sourceName:p.sourceName,sourceUrl:p.sourceUrl,url:patternUrl(p.id),visual:p.motion?'seven-frame study':'still study'};
}
export function searchLibrary(args={}) {
  const {query='',projectContext='',projectBrief,excludeIds=[],offset=0,limit=5,platform,category,packId}=args;
  const pack=packId&&packs.find(item=>item.id===packId);
  if(packId&&!pack) throw new Error('Unknown pack. Use list_design_packs for its ID.');
  const rejection=[];
  const positive=query.replace(/\b(?:without|avoid|excluding|no|not)\s+(?:any\s+)?([\w-]+)/gi,(_,term)=>{rejection.push(...words(term));return ' '});
  const main=words(positive),context=words(projectContext+' '+contextualTerms(projectBrief));
  const excluded=new Set(excludeIds);
  const matches=patterns.flatMap(p=>{
    if(excluded.has(p.id) || (pack&&!pack.patterns.includes(p.id)) || (category&&p.category.toLowerCase()!==category.toLowerCase()) ||
       (platform&&p.platform.toLowerCase()!==platform.toLowerCase())) return [];
    const headings=new Set(words([p.title,p.category,p.id,p.sourceName,...p.tags].join(' ')));
    if(p.motion) headings.add('motion');
    if(textScore(rejection,[[headings,1]])>0) return [];
    const fields=[[headings,5],[new Set(words(p.summary+' '+p.platform)),2]];
    const score=textScore(main,fields);
    if(main.length&&!score) return [];
    return [{p,score:score*4+textScore(context,fields)}];
  }).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id));
  const results=matches.slice(offset,offset+limit).map(({p},i)=>({number:i+1,...summary(p)}));
  const seen=[...new Set([...excludeIds,...matches.slice(0,offset+limit).map(({p})=>p.id)])];
  return {results,available:matches.length,hasMore:matches.length>offset+limit,
    nextSearchArguments:{...args,query,excludeIds:seen,offset:0,limit},
    next:'Inspect selected IDs with get_inspiration. A selection can supply a whole layout, a detail, variations or parts of a composition.'};
}
