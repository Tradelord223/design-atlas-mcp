/** Official reference handoffs. This module performs no network requests or catalog ingestion. */
const providers = {
  details: {
    title: 'Details',
    website: 'https://www.details.so/',
    guide: 'https://www.details.so/mcp.md',
    terms: 'https://www.details.so/legal/terms',
    hosts: ['www.details.so', 'details.so'],
    connection: [
      'Register the official remote MCP endpoint in your client with https://api.details.so/mcp.',
      'Authenticate through the official browser OAuth flow with your Details account.',
      'Use the tool schemas advertised by that connected server. Access depends on the account and current plan.',
    ],
    commands: ['codex mcp add details --url https://api.details.so/mcp', 'codex mcp login details'],
    access: 'The official guide describes plan-dependent access to Inspo and Vault. Check the current plan before requesting gated evidence.',
  },
  mobbin: {
    title: 'Mobbin', website: 'https://mobbin.com/', guide: 'https://mobbin.com/mcp',
    hosts: ['mobbin.com', 'www.mobbin.com'],
    connection: ['Open Mobbin’s official MCP page and choose Connect MCP.', 'Complete the provider’s account connection flow in your supported client.'],
    access: 'The official MCP page advertises access for Pro and Team plans. Follow its current account and client instructions.',
  },
  granola: {title:'Granola',website:'https://www.granola.ai/',hosts:['www.granola.ai','granola.ai'],connection:[],focus:'Study the public product presentation, readable notes and progressive introduction of features.'},
  linear: {title:'Linear',website:'https://linear.app/',guide:'https://linear.app/features',hosts:['linear.app'],connection:[],focus:'Study work queues, status hierarchy and the public feature explanations.'},
  govuk: {title:'GOV.UK Design System',website:'https://design-system.service.gov.uk/',guide:'https://design-system.service.gov.uk/components/',hosts:['design-system.service.gov.uk'],connection:[],focus:'Use the documented components and service patterns, including their accessibility and research guidance.'},
  stripe: {title:'Stripe documentation',website:'https://docs.stripe.com/',guide:'https://docs.stripe.com/payments/checkout',hosts:['docs.stripe.com'],connection:[],focus:'Use official checkout documentation for payment flow and integration guidance.'},
  radix: {title:'Radix Primitives',website:'https://www.radix-ui.com/',guide:'https://www.radix-ui.com/primitives/docs/components/dialog',hosts:['www.radix-ui.com','radix-ui.com'],connection:[],focus:'Read primitive behavior, keyboard interaction and accessibility documentation before implementation.'},
  instrument: {title:'Instrument',website:'https://www.instrument.com/',guide:'https://www.instrument.com/work',hosts:['www.instrument.com','instrument.com'],connection:[],focus:'Study the project brief, decisions and demonstrated brand system in published case studies.'},
  arena: {title:'Are.na',website:'https://www.are.na/',hosts:['www.are.na','are.na'],connection:[],focus:'Study reference organization, channels and the context that connects collected material.'},
  pentagram: {title:'Pentagram',website:'https://www.pentagram.com/',guide:'https://www.pentagram.com/work',hosts:['www.pentagram.com','pentagram.com'],connection:[],focus:'Study original case studies, typographic systems and how identities apply across media.'},
};

const topicLinks = {
  govuk: [
    {keys:['error','validation'],title:'Error summary',url:'https://design-system.service.gov.uk/components/error-summary/'},
    {keys:['review','answers'],title:'Check answers',url:'https://design-system.service.gov.uk/patterns/check-answers/'},
    {keys:['confirmation','receipt'],title:'Confirmation pages',url:'https://design-system.service.gov.uk/patterns/confirmation-pages/'},
  ],
  stripe: [{keys:['appearance','brand','theme'],title:'Customize Checkout',url:'https://docs.stripe.com/payments/checkout/customization'}],
  radix: [{keys:['modal','dialog','confirmation'],title:'Dialog primitive',url:'https://www.radix-ui.com/primitives/docs/components/dialog'}],
  instrument: [{keys:['system','nike'],title:'Nike Digital Design System',url:'https://www.instrument.com/work/nike-digital-design-system'},{keys:['service','offer'],title:'Services',url:'https://www.instrument.com/services'}],
};

function failure(code, message) {
  return {ok:false,error:{code,message},networkRequests:0};
}
function selectedUrl(value, provider) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !provider.hosts.includes(url.hostname)) return null;
    if (/%|\\/.test(url.pathname)) return null;
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

/**
 * @param {{provider:string,topic?:string,url?:string}} input
 * @returns {object} A pure guide with official links and suggested native tool semantics.
 */
export function referenceGuide(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return failure('invalid_input','Supply a provider and optional topic or official reference URL.');
  const {provider,topic='',url} = input;
  if (!Object.hasOwn(providers,provider)) return failure('unknown_provider','Choose details, mobbin, granola, linear, govuk, stripe, radix, instrument, arena or pentagram.');
  if (typeof topic !== 'string' || topic.length > 500) return failure('invalid_topic','Topic must be text of at most 500 characters.');
  const entry = providers[provider];
  const selection = url === undefined ? null : selectedUrl(url,entry);
  if (url !== undefined && !selection) return failure('invalid_url','Use an HTTPS URL on the selected provider’s official website. Credentials, encoded paths and custom ports are unsupported.');
  const links = [{title:entry.title,url:entry.website}];
  if (entry.guide && entry.guide !== entry.website) links.push({title:'Official guide',url:entry.guide});
  const lowerTopic = topic.toLowerCase();
  for (const link of topicLinks[provider] || []) if (link.keys.some(key=>lowerTopic.includes(key))) links.push({title:link.title,url:link.url});
  let nativeMcp = null;
  let reference = null;
  if (provider === 'details' && selection) {
    const match = selection.pathname.match(/^\/(inspo|vault)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.md)?\/?$/);
    if (!match) return failure('unsupported_reference','Supply a Details /inspo/<slug> or /vault/<slug> reference. The official guide supports these selections.');
    const [,section,slug] = match;
    reference = {section,slug,url:`https://www.details.so/${section}/${slug}`};
    links.push({title:'Selected Details reference',url:reference.url});
    nativeMcp = section === 'inspo'
      ? {tool:'get_inspiration',referenceSlug:slug,instruction:`Call the official get_inspiration tool directly for the selected slug ${slug}. Use its connected input schema. Read instructions.md, returned images or frames and cited excerpts before adapting this reference.`,schemaStatus:'Exact argument names must come from the connected official server.'}
      : {tool:'get_vault_resource',referenceSlug:slug,content:'implementation',instruction:`Call the official get_vault_resource tool for the selected slug ${slug} with content set to implementation. Use its connected input schema and follow the returned license and implementation guidance.`,schemaStatus:'Exact argument names must come from the connected official server.'};
  } else if (selection) {
    links.push({title:'Selected official reference',url:selection.href});
    reference = {url:selection.href};
  }
  if (entry.terms) links.push({title:'Provider terms',url:entry.terms});
  const subject = topic.trim() || 'a clear interface for my project';
  let suggestedPrompt = `Use ${entry.title}’s official public reference material to study ${subject}. Explain the design decisions, applicability and accessibility requirements, then propose an original implementation for my brand.`;
  if (provider === 'details') suggestedPrompt = reference
    ? `Use the connected official Details MCP to inspect ${reference.url}. ${nativeMcp.instruction} My goal is ${subject}. Preserve the selected behavior while adapting the content and styling to my project.`
    : `Use the connected official Details MCP to find references for ${subject}. Present the provider’s results with their original links. Retrieve full official evidence for the reference I select before implementation.`;
  if (provider === 'mobbin') suggestedPrompt = `Use my connected official Mobbin MCP to find real product examples for ${subject}.${reference ? ' Start from '+reference.url+'.' : ''} Explain the relevant flow and interface decisions using the evidence the official tool returns, then adapt the chosen approach to my brand.`;
  return {
    ok:true,provider,title:entry.title,links,reference,connection:entry.connection,
    ...(entry.commands ? {codexCommands:entry.commands} : {}),
    ...(entry.access ? {access:entry.access} : {}),
    ...(entry.focus ? {focus:entry.focus} : {}),
    nativeMcp,suggestedPrompt,networkRequests:0,
    scope:'Official provider handoff. The local Atlas library remains independent. This guide returns links and connection directions without fetching or importing provider content.',
    documentationCheckedAt:'2026-11-18',
  };
}
