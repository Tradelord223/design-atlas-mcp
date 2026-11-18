import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import { inspectReference } from './evidence.js';
import { fieldNoteStyles, fieldNoteScript } from './field-note.js';
import { contrastRatio } from './brand.js';
import { mountAperture } from './aperture-runtime.js';

const supportedReference = 'anchored-field-note';
const compound = /^(?:([a-z][a-z0-9-]*))?(?:#([a-z_][a-z0-9_-]*))?((?:\.[a-z_][a-z0-9_-]*)*)$/i;
const defaultColors = { background: '#17342d', text: '#f5f4e9', border: '#5a786e', accent: '#b7d7a5' };
const digest = text => createHash('sha256').update(text).digest('hex');
function requireText(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(name + ' must contain text up to ' + max + ' characters.');
  return value.trim();
}
function parseSelector(value) {
  const selector = requireText(value, 'selector', 160);
  const match = selector.match(compound);
  if (!match || !match[0] || !(match[1] || match[2] || match[3])) {
    throw new Error('Use one tag, ID or class compound, such as button.reading or .sensor.moisture. Combinators, attributes and pseudo-selectors are unsupported.');
  }
  return { selector, tag: match[1]?.toLowerCase(), id: match[2], classes: match[3].split('.').filter(Boolean) };
}
const attribute = (node, name) => node.attrs?.find(item => item.name === name)?.value;
function matches(node, selector) {
  return (!selector.tag || selector.tag === node.tagName) &&
    (!selector.id || selector.id === attribute(node, 'id')) &&
    selector.classes.every(name => (attribute(node, 'class') || '').split(/\s+/).includes(name));
}
function focusable(node) {
  if (['script', 'style', 'template', 'meta', 'link', 'title', 'head', 'noscript'].includes(node.tagName)) return false;
  for (let ancestor = node; ancestor?.tagName; ancestor = ancestor.parentNode) {
    if (attribute(ancestor, 'hidden') !== undefined || attribute(ancestor, 'inert') !== undefined || attribute(ancestor, 'aria-hidden') === 'true') return false;
    if (ancestor.tagName === 'fieldset' && attribute(ancestor, 'disabled') !== undefined) return false;
  }
  if (attribute(node, 'disabled') !== undefined || attribute(node, 'hidden') !== undefined) return false;
  if (node.tagName === 'input' && attribute(node, 'type')?.toLowerCase() === 'hidden') return false;
  const tabindex = attribute(node, 'tabindex');
  if (tabindex !== undefined) return /^\+?\d+$/.test(tabindex.trim());
  return ['button', 'input', 'select', 'textarea', 'summary'].includes(node.tagName) ||
    (node.tagName === 'a' && attribute(node, 'href') !== undefined);
}
function textContent(node) {
  if (node.nodeName === '#text') return node.value;
  return (node.childNodes || []).map(textContent).join(' ');
}
function sourceNodes(html) {
  const tree = parse(html, { sourceCodeLocationInfo: true });
  const nodes = [];
  function visit(node) {
    if (node.tagName && node.sourceCodeLocation) nodes.push(node);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(tree);
  return nodes;
}
function ancestorOf(ancestor, node) {
  for (let parent = node.parentNode; parent; parent = parent.parentNode) {
    if (parent === ancestor) return true;
  }
  return false;
}
function applyHeroReveal(input) {
  if (!input.hero || input.notes || input.appearance) throw new Error('A hero reveal takes a hero object with hostSelector, mediaSelector and treatment.');
  const { hostSelector, mediaSelector, treatment = 'viewfinder', duration = 1500 } = input.hero;
  const host = parseSelector(hostSelector), media = parseSelector(mediaSelector);
  if (!['viewfinder', 'horizon', 'slit', 'corner'].includes(treatment)) throw new Error('Choose viewfinder, horizon, slit, or corner.');
  if (!Number.isInteger(duration) || duration < 400 || duration > 2400) throw new Error('duration must be an integer from 400 to 2400 milliseconds.');
  const nodes = sourceNodes(input.html);
  const hosts = nodes.filter(node => matches(node, host));
  if (hosts.length !== 1) throw new Error('hostSelector must match exactly one existing hero. Matched ' + hosts.length + '.');
  const mediaNodes = nodes.filter(node => matches(node, media) && ancestorOf(hosts[0], node));
  if (mediaNodes.length !== 1) throw new Error('mediaSelector must match exactly one descendant of the hero. Matched ' + mediaNodes.length + '.');
  const target = mediaNodes[0];
  if (!['img','picture','video','svg','canvas','div'].includes(target.tagName) ||
      (target.tagName === 'div' && textContent(target).trim()) || attribute(target,'controls') !== undefined ||
      focusable(target) || nodes.some(node => ancestorOf(target,node) && (focusable(node) || attribute(node,'controls') !== undefined))) {
    throw new Error('Select a dedicated image or decorative media layer that contains no text controls or interactive elements.');
  }
  const inspection = inspectReference({id:input.referenceId, includeImages:false}).data;
  if (input.referenceVersion && input.referenceVersion !== inspection.version) throw new Error('Reference version changed. Inspect aperture-hero-reveal and pass its current version.');
  const javascript = [mountAperture.toString(), '',
    'export function attachHeroReveal(root = document) {',
    '  const hosts = root.querySelectorAll(' + JSON.stringify(host.selector) + ');',
    '  if (hosts.length !== 1) throw new Error("Expected one hero in this document.");',
    '  const layers = hosts[0].querySelectorAll(' + JSON.stringify(media.selector) + ');',
    '  if (layers.length !== 1) throw new Error("Expected one media layer inside the hero.");',
    '  return mountAperture(hosts[0], {media: layers[0], treatment: ' + JSON.stringify(treatment) + ', duration: ' + duration + '});',
    '}', ''
  ].join('\n');
  return {
    reference:{id:inspection.id, version:inspection.version, title:inspection.title, sourceUrl:inspection.sourceUrl, provenance:inspection.provenance},
    html:input.html, preservation:{originalMarkupPreserved:true,sha256:digest(input.html),rewrittenElements:0},
    matchedTargets:[[host,hosts[0]],[media,target]].map(([selector,node]) => ({selector:selector.selector, tag:node.tagName, startLine:node.sourceCodeLocation.startLine})),
    treatment, duration, javascript, files:[{path:'hero-reveal.js', content:javascript}],
    integration:['Import { attachHeroReveal } from "./hero-reveal.js" after the existing hero mounts. Call const reveal = attachHeroReveal().',
      'Call reveal.play() to start or replay, reveal.skip() to settle immediately, and reveal.destroy() on unmount. The module does not start on import.',
      'The existing heading and controls remain available. Check their contrast during playback at desktop and phone sizes. OS reduced motion shows the settled image.']
  };
}
export function applyReferenceDetail(input = {}) {
  if (typeof input.html !== 'string' || !input.html.trim() || input.html.length > 150000) throw new Error('html must be the existing page or component markup, up to 150000 characters.');
  if (input.referenceId === 'aperture-hero-reveal') return applyHeroReveal(input);
  if (input.referenceId !== supportedReference) throw new Error('This operation supports the anchored-field-note and aperture-hero-reveal references.');
  if (input.hero) throw new Error('The field note takes contextual notes and optional appearance.');
  if (!Array.isArray(input.notes) || input.notes.length < 1 || input.notes.length > 12) throw new Error('Supply 1–12 contextual notes using your own source text.');
  const colors = { ...defaultColors, ...input.appearance };
  if (Object.keys(colors).some(key => !Object.hasOwn(defaultColors, key))) throw new Error('Appearance supports background, text, border and accent.');
  for (const [key, value] of Object.entries(colors)) if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(key + ' must be a six-digit hexadecimal color.');
  const ratio = contrastRatio(colors.text, colors.background);
  if (ratio < 4.5) throw new Error('The field-note text needs at least 4.5:1 contrast against its background.');

  const nodes = sourceNodes(input.html);
  const occupied = new Set();
  const warnings = [];
  const notes = [];
  const matchedTargets = input.notes.map((note, index) => {
    if (!note || typeof note !== 'object' || Array.isArray(note)) throw new Error('Each note must be an object.');
    const selector = parseSelector(note.selector);
    const title = requireText(note.title, 'title', 120);
    const body = requireText(note.body, 'body', 1200);
    const expectedCount = note.expectedCount ?? 1;
    if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 20) throw new Error('expectedCount must be an integer from 1 to 20.');
    const found = nodes.filter(node => matches(node, selector));
    if (found.length !== expectedCount) throw new Error(selector.selector + ' matched ' + found.length + ' elements. Expected ' + expectedCount + '. Choose a more precise supported selector or set its expectedCount explicitly.');
    const targets = found.map(node => {
      if (!focusable(node)) throw new Error(selector.selector + ' includes an element that is not already keyboard focusable. Select an existing button, link, form control or nonnegative tabindex element. The operation preserves its semantics.');
      const location = node.sourceCodeLocation;
      if (occupied.has(location.startOffset)) throw new Error('A target matches more than one note. Give each control one contextual note.');
      occupied.add(location.startOffset);
      if (attribute(node, 'title')) warnings.push(selector.selector + ' also has a native title tooltip. Review duplicate help text in the integrated page.');
      return { tag: node.tagName, id: attribute(node, 'id') ?? null,
        labelText: (attribute(node, 'aria-label') || textContent(node)).replace(/\s+/g, ' ').trim().slice(0, 180),
        labelSource: attribute(node, 'aria-label') ? 'supplied aria-label' : 'supplied element text; computed accessible name requires browser review',
        startLine: location.startLine, startColumn: location.startCol,
        sourceMarkup: input.html.slice(location.startOffset, location.endOffset).slice(0, 800) };
    });
    notes.push({ selector: selector.selector, title, body, expectedCount });
    return { note: index + 1, selector: selector.selector, expectedCount, count: found.length, targets };
  });
  const inspection = inspectReference({ id: supportedReference, includeImages: false }).data;
  if (input.referenceVersion && input.referenceVersion !== inspection.version) throw new Error('Reference version changed. Inspect anchored-field-note and pass its current version.');
  const id = 'atlas-field-note-' + digest(JSON.stringify({ html: input.html, notes, colors })).slice(0, 12);
  const javascript = fieldNoteScript({ id, notes, delay: 160 });
  const css = fieldNoteStyles(id, colors);
  return {
    reference: { id: supportedReference, title: inspection.title, version: inspection.version, sourceName: inspection.sourceName,
      sourceUrl: inspection.sourceUrl, provenance: inspection.provenance, evidenceFiles: inspection.files,
      additionalSource: 'https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/',
      sourceStatus: 'The WCAG guidance describes dismissible, hoverable and persistent content. The APG tooltip pattern is a work in progress.' },
    html: input.html,
    preservation: { originalMarkupPreserved: true, sha256: digest(input.html), rewrittenElements: 0,
      runtimeChanges: ['One text-only tooltip portal is appended to body.', 'The active target references the tooltip through aria-describedby while visible. Its prior description is restored on dismissal.'] },
    matchedTargets, matchedCount: occupied.size, css, javascript,
    controller: { id, registry: 'window[Symbol.for(\'design-atlas.field-notes\')]', methods: ['setEnabled(boolean)', 'dismiss()', 'destroy()'] },
    files: [{ path: 'field-note.css', content: css }, { path: 'field-note.js', content: javascript }],
    integration: ['Keep the supplied HTML and existing event handlers.', 'Add field-note.css once. Load field-note.js once after the selected controls exist.',
      'Use the existing click or tap action to expose the full context. The generated tooltip is supplementary.',
      'Inside an iframe, forward an authorized host Escape or dismissal message to this instance’s dismiss() method. Keyboard events stay within their focused document.',
      'If the page replaces its controls, run the generated script again after the replacement. It destroys the prior instance and binds the current controls.',
      'Before installing a different generated configuration, destroy this instance. To unmount, call window[Symbol.for(\'design-atlas.field-notes\')].get(\'' + id + '\').destroy().'],
    behavior: { keyboard: 'Focus opens. Escape dismisses without moving focus or cancelling the original event.', pointer: 'Hover opens after 160ms. The note remains while its trigger or its own content is hovered.',
      touch: 'Touch does not open the note. The existing click/tap action proceeds.', motion: 'A 100ms opacity entrance is removed under prefers-reduced-motion.', layout: 'The portal is fixed within the viewport. The supplied control markup and layout are unchanged.' },
    contrast: { foreground: colors.text, background: colors.background, ratio: Number(ratio.toFixed(2)), minimum: 4.5, passes: true },
    review: ['Confirm supplied context is accurate and also reachable through the existing action on touch devices.', 'Test actual dynamic DOM replacement, overlay stacking, zoom and scroll containers in the target application.',
      'Review the description announcement with the intended screen reader/browser pair. A live accessibility certification is outside static source inspection.'], warnings
  };
}
