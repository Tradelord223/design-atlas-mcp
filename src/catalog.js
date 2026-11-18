import { patterns as libraryPatterns, packs as libraryPacks, flows as libraryFlows } from './library.js';
import { extensionPatterns, extensionPacks, extensionFlows } from './extensions.js';
import { motionPatterns, motionPack } from './motion.js';

export const patterns = [...libraryPatterns,...motionPatterns,...extensionPatterns];
export const packs = [...libraryPacks,motionPack,...extensionPacks];
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
