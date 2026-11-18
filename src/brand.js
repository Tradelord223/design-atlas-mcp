import { packs, patterns } from './catalog.js';
import { validateTypography, validateRadius, validateColors } from './identity.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const hexColor = /^#[0-9a-f]{6}$/i;

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first, second) {
  if (!hexColor.test(first) || !hexColor.test(second)) throw new TypeError('Contrast colors must be six-digit hex values');
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function bestInk(background) {
  return contrastRatio(background, '#000000') > contrastRatio(background, '#ffffff') ? '#000000' : '#ffffff';
}

function accessibleColor(color, background, minimum = 4.5) {
  if (contrastRatio(color, background) >= minimum) return color;
  const target = bestInk(background);
  const channels = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16));
  const start = channels(color);
  const end = channels(target);
  for (let step = 1; step <= 20; step++) {
    const mixed = '#' + start.map((channel, index) => Math.round(channel + (end[index] - channel) * step / 20).toString(16).padStart(2, '0')).join('');
    if (contrastRatio(mixed, background) >= minimum) return mixed;
  }
  return target;
}

function requireText(value, field, maximum = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new TypeError(`${field} must be nonempty text up to ${maximum} characters`);
  return value.trim();
}

function choosePack(input) {
  if (input.packId) {
    const requested = packs.find(pack => pack.id === input.packId);
    if (!requested) throw new Error(`Unknown design pack ${input.packId}. Use list_design_packs to choose an exact id.`);
    return requested;
  }
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'our', 'your', 'people', 'brand', 'product', 'want', 'need', 'have', 'their', 'them', 'make', 'will', 'can', 'are']);
  const terms = (`${input.description} ${input.audience || ''} ${input.voice || ''}`.toLowerCase().match(/[a-z]{3,}/g) || []).filter(term => !stopWords.has(term));
  const synonyms = { 'quiet-product': ['notes', 'note', 'meeting', 'productivity', 'calm'], 'precise-workspace': ['issue', 'developer', 'software', 'engineering', 'task', 'workflow'], 'public-service': ['government', 'civic', 'application', 'benefit', 'public'], 'material-commerce': ['shop', 'store', 'retail', 'ecommerce', 'commerce', 'artisan', 'craft', 'sell'], 'editorial-reference': ['research', 'publication', 'library', 'reading', 'journalism'], 'financial-clarity': ['finance', 'financial', 'bank', 'banking', 'accounting', 'ledger', 'money', 'budget'], 'daily-companion': ['wellness', 'habit', 'health', 'mobile', 'reflection', 'journal'], 'independent-studio': ['studio', 'portfolio', 'agency', 'consultancy', 'designers'], 'motion-printshop': ['motion', 'animation', 'animated', 'publishing', 'printshop'] };
  const ranked = packs.map((pack, index) => {
    const text = `${pack.id} ${pack.title} ${pack.summary} ${(pack.tags || []).join(' ')}`.toLowerCase();
    return { pack, index, score: terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0) + ((synonyms[pack.id] || []).includes(term) ? 3 : 0), 0) };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  if (!ranked.length) throw new Error('No design packs are installed');
  return ranked[0].pack;
}

function tokenColor(source, keys, fallback) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && hexColor.test(value)) return value;
  }
  return fallback;
}

export function buildBrandKit(input = {}) {
  const name = requireText(input.name, 'name', 100);
  const description = requireText(input.description, 'description');
  const audience = input.audience ? requireText(input.audience, 'audience', 500) : 'People evaluating the product for the first time';
  const voice = input.voice ? requireText(input.voice, 'voice', 500) : 'Direct, specific, and calm';
  const pack = choosePack({ ...input, description });
  if (input.accent && !hexColor.test(input.accent)) throw new TypeError('accent must be a six-digit hex color such as #215c47');
  const suppliedColors = validateColors(input.colors);
  const suppliedTypography = validateTypography(input.typography);
  const suppliedRadius = validateRadius(input.radius);
  const source = { ...pack.tokens, ...pack.tokens?.colors, ...pack.tokens?.color, ...suppliedColors };
  const background = tokenColor(source, ['background', 'canvas', 'bg', 'surface'], '#f6f4ee');
  const surface = tokenColor(source, ['surface'], '#ffffff');
  const proposedText = tokenColor(source, ['text', 'ink', 'foreground'], '#202820');
  const text = accessibleColor(proposedText, background);
  const surfaceText = accessibleColor(proposedText, surface);
  const accent = input.accent || tokenColor(source, ['accent', 'primary', 'brand'], '#286044');
  const onAccent = bestInk(accent);
  const accentInk = accessibleColor(accent, background);
  const surfaceAccentInk = accessibleColor(accent, surface);
  const actionBackground = accessibleColor(accent, background, 3);
  const onAction = bestInk(actionBackground);
  const surfaceActionBackground = accessibleColor(accent, surface, 3);
  const onSurfaceAction = bestInk(surfaceActionBackground);
  const proposedMuted = tokenColor(source, ['muted'], '#62685f');
  const muted = accessibleColor(proposedMuted, background);
  const surfaceMuted = accessibleColor(proposedMuted, surface);
  const dark = luminance(background) < 0.2;
  const radius = suppliedRadius.control || (/public-service|financial|editorial/i.test(pack.id) ? '4px' : (pack.tokens?.radius?.control || '14px'));
  const panelRadius = suppliedRadius.panel || pack.tokens?.radius?.panel || radius;
  const editorial = /editorial|serif|heritage|craft|calm|quiet|studio|material|organic|motion/i.test(`${pack.id} ${pack.title}`);
  const fontHeading = suppliedTypography.heading || (editorial ? "'Instrument Serif', Georgia, serif" : "'DM Sans', system-ui, sans-serif");
  const tokens = {
    colors: { background, surface, text, surfaceText, muted, surfaceMuted, accent, onAccent, accentInk, surfaceAccentInk, actionBackground, onAction, surfaceActionBackground, onSurfaceAction, border: tokenColor(source, ['border'], dark ? '#505650' : '#c9cec6'), focus: bestInk(background), surfaceFocus: bestInk(surface) },
    typography: { body: suppliedTypography.body || "'DM Sans', system-ui, sans-serif", heading: fontHeading, bodySize: '17px', lineHeight: 1.6, headingTracking: '-0.035em', headingScale: ['2rem', '3.25rem', '5.5rem'] },
    spacing: { unit: '4px', scale: [4, 8, 12, 16, 24, 32, 48, 64, 96] },
    radius: { control: radius, panel: panelRadius },
    layout: { contentWidth: '1160px', readingWidth: '62ch', gutter: 'clamp(20px, 5vw, 72px)' },
    motion: { duration: '160ms', easing: 'cubic-bezier(.2,.8,.2,1)', reducedMotion: 'Disable nonessential transitions when prefers-reduced-motion is reduce' }
  };
  const contrastPairs = [
    ['body text / background', text, background, 4.5],
    ['button text / action background', onAction, actionBackground, 4.5],
    ['link and eyebrow / background', accentInk, background, 4.5],
    ['muted text / background', muted, background, 4.5],
    ['surface text / surface', surfaceText, surface, 4.5],
    ['surface muted text / surface', surfaceMuted, surface, 4.5],
    ['surface link / surface', surfaceAccentInk, surface, 4.5],
    ['surface action text / surface action', onSurfaceAction, surfaceActionBackground, 4.5],
    ['primary action boundary / background', actionBackground, background, 3],
    ['surface action boundary / surface', surfaceActionBackground, surface, 3],
    ['focus / background', tokens.colors.focus, background, 3],
    ['surface focus / surface', tokens.colors.surfaceFocus, surface, 3]
  ].map(([pair, foreground, backgroundColor, minimum]) => ({ pair, foreground, background: backgroundColor, ratio: Number(contrastRatio(foreground, backgroundColor).toFixed(2)), minimum, passes: contrastRatio(foreground, backgroundColor) >= minimum }));
  const packPatterns = patterns.filter(pattern => (pack.patterns || []).includes(pattern.id));
  const briefTerms = description.toLowerCase().match(/[a-z]{4,}/g) || [];
  const orderedPatterns = packPatterns.map((pattern, index) => ({ pattern, index, score: briefTerms.reduce((score, term) => score + (`${pattern.title} ${pattern.summary} ${(pattern.tags || []).join(' ')}`.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.pattern);
  const componentOverrides = `.brand-example :is(.atlas-specimen,.motion-study) { --paper: ${background} !important; --ink: ${text} !important; --muted: ${muted} !important; --accent: ${accentInk} !important; --line: ${tokens.colors.border} !important; max-width: 100%; font-family: ${tokens.typography.body}; } .brand-example { min-width: 0; overflow: auto; } .brand-example :is(h1,h2) { font-family: ${fontHeading}; } .brand-example .atlas-specimen :is(.card,.phone) { background: ${surface}; color: ${surfaceText}; --ink: ${surfaceText}; --muted: ${surfaceMuted}; --accent: ${surfaceAccentInk}; border-radius: ${panelRadius}; } .brand-example .atlas-specimen .action, .brand-example .atlas-specimen button:not(.secondary) { background: ${actionBackground}; color: ${onAction}; border-radius: ${radius}; } .brand-example .atlas-specimen :is(.card,.phone) :is(.action,button:not(.secondary)) { background: ${surfaceActionBackground}; color: ${onSurfaceAction}; } .brand-example :focus-visible { outline: 3px solid ${tokens.colors.focus}; outline-offset: 4px; } .brand-example .atlas-specimen :is(.card,.phone) :focus-visible { outline-color: ${tokens.colors.surfaceFocus}; }`;
  const components = orderedPatterns.slice(0, 3).map(pattern => ({ id: pattern.id, title: pattern.title, html: `<div class="brand-example">${pattern.html.replace(/<h1\b/g, '<h2').replace(/<\/h1>/g, '</h2>')}</div>`, css: `${pattern.css}\n${componentOverrides}`, javascript: pattern.js || '', sourceUrl: pattern.sourceUrl, contentStatus: 'Original specimen content. Replace sample people, products, dates, prices and business claims with your brand facts.' }));
  const css = `:root {\n${Object.entries(tokens.colors).map(([key, value]) => `  --${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}: ${value};`).join('\n')}\n  --font-body: ${tokens.typography.body};\n  --font-heading: ${fontHeading};\n  --radius: ${radius};\n  --panel-radius: ${panelRadius};\n  --gutter: ${tokens.layout.gutter};\n}\n* { box-sizing: border-box; }\nbody { margin: 0; background: var(--background); color: var(--text); font: 17px/1.6 var(--font-body); }\na { color: var(--accent-ink); text-underline-offset: 4px; }\nbutton, input { font: inherit; }\na:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid var(--focus); outline-offset: 5px; }\n.panel a { color: var(--surface-accent-ink); }\n.panel .help { color: var(--surface-muted); }\n.panel :focus-visible { outline-color: var(--surface-focus); }\n.skip { color: var(--surface-text); position: absolute; left: 16px; top: -80px; padding: 12px; background: var(--surface); z-index: 2; }\n.skip:focus { top: 16px; outline-color: var(--surface-focus); }\n.shell { width: min(100%, 1160px + 2 * var(--gutter)); margin-inline: auto; padding-inline: var(--gutter); }\nheader { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding-block: 28px; border-bottom: 1px solid var(--border); }\n.wordmark { font-weight: 750; font-size: 22px; letter-spacing: -.04em; text-decoration: none; }\nnav { display: flex; gap: 24px; }\n.hero { display: grid; grid-template-columns: 1.25fr 1fr; align-items: start; gap: 64px; padding-block: clamp(56px, 9vw, 116px); }\nh1 { font-family: var(--font-heading); font-weight: ${editorial ? '400' : '650'}; font-size: clamp(42px, 6vw, 78px); line-height: 1.06; letter-spacing: -.035em; max-width: 13ch; margin: 0 0 28px; overflow-wrap: anywhere; }\n.lede { max-width: 55ch; font-size: 19px; margin: 0 0 32px; }\n.button { display: inline-flex; justify-content: center; align-items: center; min-height: 48px; padding: 12px 22px; border-radius: var(--radius); background: var(--action-background); color: var(--on-action); font-weight: 650; text-decoration: none; border: 1px solid transparent; }\n.panel { background: var(--surface); color: var(--surface-text); border: 1px solid var(--border); border-radius: var(--panel-radius); padding: 28px; }\n.panel h2 { margin: 0 0 20px; font-size: 21px; letter-spacing: -.025em; }\n.workflow { padding: 0; margin: 0; list-style-position: inside; }\n.workflow li { padding-block: 18px; border-top: 1px solid var(--border); }\n.workflow strong { display: block; margin-top: 4px; }\n.workflow p { color: var(--muted); margin: 4px 0 0; font-size: 15px; }\n.details { border-top: 1px solid var(--border); padding-block: 48px; max-width: 72ch; }\n.details h2 { font-family: var(--font-heading); font-weight: ${editorial ? '400' : '650'}; font-size: 34px; line-height: 1.15; }\nlabel { display: block; font-weight: 650; margin-bottom: 8px; }\ninput { width: 100%; min-height: 48px; padding: 10px 14px; color: var(--surface-text); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }\n.form-row { display: flex; gap: 12px; align-items: end; }\n.form-row > div { flex: 1; }\n.help { color: var(--muted); font-size: 14px; }\nfooter { padding-block: 32px; border-top: 1px solid var(--border); color: var(--muted); font-size: 14px; }\n@media (max-width: 760px) { .hero { grid-template-columns: 1fr; gap: 36px; } h1 { max-width: 17ch; } header { align-items: flex-start; } nav { flex-wrap: wrap; gap: 12px; } .form-row { align-items: stretch; flex-direction: column; } }\n@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }`;
  const safeName = escapeHtml(name);
  const headline = input.headline ? requireText(input.headline, 'headline', 200) : name;
  const actionLabel = input.actionLabel ? requireText(input.actionLabel, 'actionLabel', 80) : `Talk with ${name}`;
  const contactEmail = input.contactEmail || 'hello@example.com';
  if (typeof contactEmail !== 'string' || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(contactEmail)) throw new TypeError('contactEmail must be an email address');
  const visualExample = components[0] ? `<aside class="brand-example" aria-label="${escapeHtml(components[0].title)} example">${components[0].html}</aside>` : '<aside class="panel"><h2>A clear next step</h2><p>Explain what happens after someone contacts your team.</p></aside>';
  const sampleStyles = components[0] ? `<style>${components[0].css}</style>` : '';
  const sampleScript = components[0]?.javascript ? `<script>${components[0].javascript}</script>` : '';
  const html = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeName}</title><style>${css}</style>${sampleStyles}</head>\n<body><a class="skip" href="#main">Skip to content</a><div class="shell">\n<header><a class="wordmark" href="#">${safeName}</a><nav aria-label="Main"><a href="#approach">Our approach</a><a href="#contact">Get in touch</a></nav></header>\n<main id="main"><section class="hero" aria-labelledby="title"><div><h1 id="title">${escapeHtml(headline)}</h1><p class="lede">${escapeHtml(description)}</p><a class="button" href="#contact">${escapeHtml(actionLabel)}</a></div>\n${visualExample}</section>\n<section class="details" id="approach"><h2>Built around your priorities</h2><p>${escapeHtml(audience)} deserve a clear explanation of what happens next. We make the process visible and keep the details easy to find.</p></section>\n<section class="details" id="contact"><h2>Let’s find the right next step.</h2><p><a class="button" href="mailto:${escapeHtml(contactEmail)}">Email the team</a></p><p class="help">${input.contactEmail ? 'We’ll help you choose a useful next step.' : 'Replace hello@example.com with your team’s email before publishing.'}</p></section></main>\n<footer>${safeName}</footer></div>${sampleScript}</body>\n</html>`;
  const selectedPatterns = patterns.filter(pattern => (pack.patterns || []).includes(pattern.id)).map(pattern => ({ id: pattern.id, title: pattern.title, sourceUrl: pattern.sourceUrl }));
  return {
    brand: { name, description, audience, voice, platform: input.platform || 'web' },
    selectedPack: { id: pack.id, title: pack.title, rationale: input.packId ? 'Selected explicitly in the brief' : 'Selected by matching words in the brief against pack metadata. Review the choice alongside the alternatives.', principles: pack.principles, patterns: selectedPatterns },
    tokens, css, html, components,
    implementation: {
      files: [{ path: 'index.html', content: html }, { path: 'brand.css', content: css }, { path: 'tokens.json', content: JSON.stringify(tokens, null, 2) }, ...components.flatMap(component => [{ path: `components/${component.id}.html`, content: component.html }, { path: `components/${component.id}.css`, content: component.css }, ...(component.javascript ? [{ path: `components/${component.id}.js`, content: component.javascript }] : [])])],
      steps: ['Save index.html and open it in a browser to review the responsive specimen.', 'Replace the sample headline, process, audience copy, and contact email with specific brand facts.', 'Use the CSS custom properties throughout your existing component system.', 'Choose one icon family and keep size and stroke weight consistent.', 'Review keyboard access, zoom, actual content length, and contrast in the final integrated page.'],
      typography: 'The generated CSS preserves supplied font family declarations and includes default system fallbacks. Supply properly licensed font files through your application before evaluating final typography.',
      platform: input.platform && input.platform !== 'web' ? 'The output is a web implementation. Map these semantic tokens into your target platform’s native styles.' : 'Responsive semantic HTML and CSS',
      contentStatus: 'Original starter copy requires brand review before publication.'
    },
    accessibility: {
      contrast: contrastPairs,
      included: ['Skip link', 'Named navigation', 'Visible keyboard focus', 'Responsive reflow', 'Reduced motion support', '48px primary action height'],
      remaining: ['Browser and assistive technology checks after integration', 'Contrast for any added imagery or colors', 'Meaningful copy and real contact destination']
    },
    sources: [...new Map([{ sourceUrl: pack.sourceUrl }, ...selectedPatterns].filter(item => item.sourceUrl).map(item => [item.sourceUrl, { url: item.sourceUrl, relationship: 'Design reference for the selected pack. The starter implementation is original.' }])).values()]
  };
}

export function auditDesign(input = {}) {
  const html = typeof input.html === 'string' ? input.html : '';
  const css = typeof input.css === 'string' ? input.css : '';
  const copy = typeof input.copy === 'string' ? input.copy : html.replace(/<[^>]*>/g, ' ');
  if (!html.trim() && !css.trim() && !copy.trim()) throw new TypeError('Provide html, css, or copy to audit');
  const issues = [];
  const add = (id, severity, evidence, fix) => issues.push({ id, severity, evidence, fix });
  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  const missingAlt = images.filter(match => !/\balt\s*=/i.test(match[0]));
  if (missingAlt.length) add('image-alt', 'high', missingAlt.map(match => match[0].slice(0, 200)), 'Give informative images useful alt text. Give decorative images alt="".');
  const emptyButtons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].filter(match => !/aria-label\s*=|aria-labelledby\s*=/i.test(match[1]) && !match[2].replace(/<svg\b[\s\S]*?<\/svg>/gi, '').replace(/<[^>]*>/g, '').trim());
  if (emptyButtons.length) add('button-name', 'high', emptyButtons.map(match => match[0].slice(0, 200)), 'Add visible action text or a specific aria-label to each icon-only button.');
  if (html && /<html\b/i.test(html) && !/<html\b[^>]*\blang\s*=/i.test(html)) add('document-language', 'medium', '<html> has no lang attribute', 'Set the document language, for example <html lang="en">.');
  if (html && /<html\b/i.test(html) && !/name\s*=\s*["']viewport["']/i.test(html)) add('viewport', 'medium', 'No viewport metadata found', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  const removedFocus = css.match(/(?:outline\s*:\s*(?:none|0)|outline-width\s*:\s*0)\b[^;}]*/gi);
  if (removedFocus && !/:focus-visible[^{}]*\{[^}]*outline\s*:\s*[^;}]*(?:solid|dashed|double)/i.test(css)) add('focus-indicator', 'high', removedFocus, 'Restore a visible keyboard focus indicator and verify it against adjacent colors.');
  const motion = css.match(/(?:animation|transition)\s*:[^;}]+/gi);
  if (motion && !/prefers-reduced-motion/i.test(css)) add('reduced-motion', 'medium', motion.slice(0, 4), 'Add a prefers-reduced-motion media query to remove nonessential movement.');
  const vagueLinks = [...html.matchAll(/<a\b[^>]*>\s*(click here|learn more|read more)\s*<\/a>/gi)];
  if (vagueLinks.length) add('link-purpose', 'medium', vagueLinks.map(match => match[0]), 'Name the destination or outcome, such as “Read the shipping policy”.');
  const claims = copy.match(/\b(?:revolutionary|game[- ]changing|seamless|unlock your potential|supercharge|next[- ]generation|world[- ]class|cutting[- ]edge)\b/gi);
  if (claims) add('generic-copy', 'low', [...new Set(claims)], 'Replace broad claims with the product’s specific behavior, audience, or verifiable result.');
  const gradients = css.match(/(?:linear|radial|conic)-gradient\([^;}]*/gi);
  if (gradients && gradients.length > 2) add('visual-restraint', 'review', gradients.slice(0, 4), 'Review whether each gradient communicates state, material, or hierarchy. Remove decorative treatments that compete with the primary action.');
  return {
    scope: 'Static text and markup heuristics. Findings require review in the rendered interface. This audit does not measure layout, computed contrast, behavior, or assistive technology compatibility.',
    summary: { issueCount: issues.length, high: issues.filter(issue => issue.severity === 'high').length, medium: issues.filter(issue => issue.severity === 'medium').length, review: issues.filter(issue => ['low', 'review'].includes(issue.severity)).length },
    issues,
    checks: ['Image alt attribute presence', 'Empty or icon-only button names', 'Document language and viewport metadata when a full HTML document is supplied', 'Removed CSS focus outline', 'Motion preference rule presence', 'Ambiguous link text', 'Generic marketing language', 'Repeated gradient declarations'],
    nextChecks: ['Render at 320px, 768px, and desktop widths with real content.', 'Navigate every control using the keyboard.', 'Measure computed foreground and background contrast.', 'Confirm loading, empty, error, success, and disabled states.', 'Ask a person in the intended audience to complete the primary task.']
  };
}
