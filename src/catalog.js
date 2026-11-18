import { patterns as libraryPatterns, packs as libraryPacks, flows as libraryFlows } from './library.js';
import { extensionPatterns, extensionPacks, extensionFlows } from './extensions.js';
import { motionPatterns, motionPack } from './motion.js';
import { aperturePattern } from './aperture.js';
import { plateIndexPattern, shiftLinkPattern } from './plate-index.js';
import { fieldNotePattern, fieldNotePack } from './field-note-study.js';

export const patterns = [...libraryPatterns,...motionPatterns,fieldNotePattern,aperturePattern,plateIndexPattern,shiftLinkPattern,...extensionPatterns];
const editorialWayfinding = {
  id:'editorial-wayfinding', title:'Editorial wayfinding',
  summary:'Three working details for an image-led publication: a framed hero entrance, a destination menu with previews and a shifting arrow for a primary action.',
  tags:['navigation','editorial','image','reveal','motion','dropdown','arrow','wayfinding'],
  patterns:[aperturePattern.id, plateIndexPattern.id, shiftLinkPattern.id],
  principles:['Let the existing photograph and headline set the composition.', 'Give each destination its own preview. Keep navigation usable by keyboard and touch.', 'Apply movement to one bounded element and restore its resting state.'],
  tokens:{background:'#f6f0e6',text:'#261e19',accent:'#88432b',surface:'#fffaf1',headingFont:'Georgia, serif'}
};
export const packs = [...libraryPacks,motionPack,fieldNotePack,editorialWayfinding,...extensionPacks];
export const flows=[...libraryFlows,...extensionFlows];
export const gallery = 'https://tradelord223.github.io/design-atlas-mcp/';
export const patternUrl = id => gallery+'?id='+encodeURIComponent(id);
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
export function specimenDocument(p, {extraCss='',fragment=p.html}={}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(p.title)}</title>
<style>html{color-scheme:light}body{margin:0} ${p.css}\n${extraCss}</style></head>
<body>${p.rights?'<template data-license>'+escapeHtml(p.rights.licenseText??p.rights.license)+'</template>':''}${fragment}${p.js?'\n<script>'+p.js+'<\/script>':''}</body></html>`;
}
