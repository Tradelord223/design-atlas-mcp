import { editionThemeStyles } from './atlas-spread-theme.js';
import { atlasSpreadStyles } from './atlas-spread-styles.js';
import { atlasSpreadRuntime } from './atlas-spread-runtime.js';
import { readingIcon, iconLicenseNotice } from './atlas-spread-icons.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function readableInk(hex) {
  const value = luminance(hex);
  return (value + .05) / .05 >= 1.05 / (value + .05) ? '#000000' : '#ffffff';
}

const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg>';
const rightArrow = '<svg class="chapter-arrow" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false"><path d="M2 9h13M10 4l5 5-5 5" stroke="currentColor" stroke-width="1.3"/></svg>';
const number = index => String(index + 1).padStart(2, '0');

/** Render a validated brand brief into a standalone, browser-ready editorial edition. */
export function renderAtlasSpread(brief) {
  const { brand, edition, headline, deck, date, sourceUrl, sourceLabel, image, accent, readings, chapters } = brief;
  const markers = readings.map((reading, index) => `<button class="map-marker" type="button" data-reading-marker="${escapeHtml(reading.id)}" data-x="${reading.x}" data-y="${reading.y}" aria-pressed="${index === 0}" aria-controls="reading-detail-${index}" aria-label="${escapeHtml(number(index) + '. ' + reading.label + ': ' + reading.value)}" title="${escapeHtml(reading.label + ' / ' + reading.value)}"><span>${number(index)}</span><span class="marker-caption" aria-hidden="true">${escapeHtml(reading.label)}<strong>${escapeHtml(reading.value)}</strong></span></button>`).join('\n');
  const tabs = readings.map((reading, index) => `<button class="signal-tab" type="button" role="tab" id="reading-tab-${index}" data-reading-tab="${escapeHtml(reading.id)}" data-reading-status="${escapeHtml(number(index) + ' / ' + reading.label)}" aria-selected="${index === 0}" aria-controls="reading-detail-${index}" tabindex="${index === 0 ? 0 : -1}"><span class="signal-label"><span class="signal-order" aria-hidden="true">${number(index)}</span>${escapeHtml(reading.label)}</span><span class="signal-tab-value">${escapeHtml(reading.value)}</span></button>`).join('\n');
  const details = readings.map((reading, index) => `<article class="reading-detail" role="tabpanel" id="reading-detail-${index}" data-reading-detail="${escapeHtml(reading.id)}" aria-labelledby="reading-tab-${index}"${index ? ' hidden' : ''}><p class="reading-value">${escapeHtml(reading.value)}</p><div class="reading-copy"><p class="small-label">${readingIcon(reading.icon)}${escapeHtml(reading.label)}</p><h2>${escapeHtml(reading.title)}</h2><p>${escapeHtml(reading.body)}</p></div></article>`).join('\n');
  const chapterTabs = chapters.map((chapter, index) => `<button type="button" class="chapter-tab" role="tab" id="chapter-tab-${index}" data-chapter="${escapeHtml(chapter.id)}" aria-selected="${index === 0}" aria-controls="chapter-detail-${index}" tabindex="${index === 0 ? 0 : -1}"><span class="chapter-order" aria-hidden="true">${number(index)}</span><span><span class="chapter-tab-kicker">${escapeHtml(chapter.kicker)}</span><strong class="chapter-tab-title">${escapeHtml(chapter.title)}</strong></span>${rightArrow}</button>`).join('\n');
  const chapterDetails = chapters.map((chapter, index) => `<article class="chapter-detail" id="chapter-detail-${index}" data-chapter-detail="${escapeHtml(chapter.id)}" role="tabpanel" aria-labelledby="chapter-tab-${index}"${index ? ' hidden' : ''}><div class="chapter-image-wrap"><img class="chapter-image" data-chapter-image="${escapeHtml(chapter.id)}" src="${escapeHtml(chapter.image.src)}" alt="${escapeHtml(chapter.image.alt)}" loading="lazy"><p class="chapter-photo-note">${escapeHtml(chapter.kicker)}</p><p class="chapter-image-failure" hidden>Image unavailable. ${escapeHtml(chapter.image.alt)}</p></div><div class="chapter-text"><h3>${escapeHtml(chapter.title)}</h3><p class="chapter-body">${escapeHtml(chapter.body)}</p></div></article>`).join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(deck)}"><title>${escapeHtml(brand)} — ${escapeHtml(edition)}</title><style>${atlasSpreadStyles}\n:root{--accent:${accent};--on-accent:${readableInk(accent)}}
${editionThemeStyles(brief.theme)}\n</style></head>
<body><a class="skip-link" href="#readings">Skip to the readings</a>
<main class="atlas-spread" data-atlas-spread data-active-reading="${escapeHtml(readings[0].id)}" data-active-chapter="${escapeHtml(chapters[0].id)}" style="--reading-count:${readings.length};--chapter-count:${chapters.length}">
<header class="edition-masthead"><div class="brand-lockup"><a class="edition-brand" href="#overview" data-section-link="overview">${escapeHtml(brand)}</a><p class="edition-name">${escapeHtml(edition)}</p></div><nav class="edition-nav" aria-label="Edition navigation"><a href="#overview" data-section-link="overview">Overview</a><a href="#readings" data-section-link="readings">Readings</a><a href="#chapters" data-section-link="chapters">Chapters</a></nav><p class="edition-date">${escapeHtml(date)}</p></header>
<section class="cover-stage" id="overview" aria-labelledby="edition-headline"><img class="cover-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" fetchpriority="high"><div class="cover-shade" aria-hidden="true"></div><div class="cover-copy"><h1 id="edition-headline" class="cover-title${headline.length > 85 ? ' is-long' : ''}">${escapeHtml(headline)}</h1></div><div class="map-layer" role="group" aria-label="Observation locations" hidden>${markers}</div><p class="image-failure" role="status" hidden>Image unavailable. Explore the readings below.</p></section>
<figure class="inspect-map"><figcaption><span class="small-label">Image index</span><span>Choose a numbered point</span></figcaption><div class="inspect-map-canvas"><img class="inspect-map-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy"></div></figure>
<section class="signal-deck" id="readings" aria-label="Readings"><div class="signal-index"><div class="index-heading"><h2 class="small-label">Field index</h2><span class="collection-count">${number(readings.length - 1)} ${readings.length === 1 ? 'reading' : 'readings'}</span></div><p class="edition-deck">${escapeHtml(deck)}</p><div class="signal-list" role="tablist" aria-label="Field readings">${tabs}</div></div><div class="reading-panel" id="reading-panel" aria-live="polite" aria-atomic="false">${details}<p class="reading-status" id="reading-status">${escapeHtml('01 / ' + readings[0].label)}</p></div></section>
<section class="chapters-section" id="chapters" aria-labelledby="chapter-heading"><div class="chapter-section-heading"><h2 id="chapter-heading">In this edition.</h2><p class="small-label">${escapeHtml(edition)}</p></div><div class="chapter-layout"><div class="chapter-index" role="tablist" aria-label="Edition chapters" aria-orientation="vertical">${chapterTabs}</div><div class="chapter-panel" id="chapter-panel" aria-live="polite" aria-atomic="false">${chapterDetails}</div></div></section>
<footer class="edition-footer"><a class="footer-brand" href="#overview" data-section-link="overview">${escapeHtml(brand)}</a><p>${escapeHtml(date)}</p><a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceLabel)}${arrow}</a></footer>
</main>${iconLicenseNotice}<script>${atlasSpreadRuntime}</script></body></html>\n`;
}
