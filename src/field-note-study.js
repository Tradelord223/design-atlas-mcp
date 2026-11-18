import { fieldNoteStyles, fieldNoteScript } from './field-note.js';

const id = 'atlas-field-note-study';
const colors = { background: '#17342d', text: '#f5f4e9', border: '#5a786e', accent: '#b7d7a5' };
const notes = [
  { selector: '.field-note-example .water', title: 'Water level · illustrative sample', body: 'A level is a reading from one place and time. Use the existing inspection action to see the record and its context.', expectedCount: 1 },
  { selector: '.field-note-example .light', title: 'Daylight · illustrative sample', body: 'This sample describes the observation window. It supplements the reading without replacing its inspection action.', expectedCount: 1 }
];

export const fieldNotePattern = {
  id: 'anchored-field-note',
  title: 'A contextual note beside an existing control',
  summary: 'Hover or focus a reading for a short field note. The original click and tap action keeps its existing behavior.',
  category: 'tooltip', platform: 'web', tags: ['tooltip', 'hover', 'focus', 'context', 'existing-site', 'supplementary', 'keyboard', 'detail'],
  sourceName: 'W3C WAI · content on hover or focus',
  sourceUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html',
  provenance: 'Original implementation study of dismissible, hoverable and persistent supplementary content. WAI APG tooltip semantics also inform the behavior. The APG tooltip pattern is a work in progress.',
  observedAt: '2026-11-18',
  html: `<section class="field-note-example"><p class="field-note-label">Field notebook · illustrative sample</p><h1>Keep the reading<br>in its context.</h1><p class="field-note-intro">Focus or hover a reading for a short note. Its existing inspection action stays available.</p><div class="field-note-readings"><button class="water" type="button"><span>Water level</span><strong>13.6 <small>cm</small></strong><span>Inspect record →</span></button><button class="light" type="button"><span>Daylight</span><strong>7.4 <small>hours</small></strong><span>Inspect record →</span></button></div><p class="field-note-status" role="status">No record selected.</p></section>`,
  css: `.field-note-example{box-sizing:border-box;min-height:460px;max-width:800px;padding:38px 40px;background:#f1efe5;color:#20382e;font:16px/1.5 system-ui,sans-serif}.field-note-example *{box-sizing:border-box}.field-note-label{font-size:11px;letter-spacing:.08em;text-transform:uppercase}.field-note-example h1{margin:25px 0 16px;font:400 clamp(36px,7vw,58px)/1.02 Georgia,serif;letter-spacing:-.035em}.field-note-intro{max-width:48ch;font-size:14px}.field-note-readings{display:flex;gap:16px;margin-top:32px}.field-note-readings button{display:grid;gap:8px;flex:1;min-height:132px;padding:16px 20px;border:1px solid #7b8c7b;border-radius:3px;background:#fcfbf5;color:inherit;text-align:left;font:inherit;cursor:pointer}.field-note-readings button>span{font-size:12px}.field-note-readings strong{font:400 32px/1 Georgia,serif}.field-note-readings small{font:12px system-ui,sans-serif}.field-note-example :focus-visible{outline:3px solid #a84c1c;outline-offset:3px}.field-note-status{font-size:13px;min-height:20px}@media(max-width:500px){.field-note-example{padding:24px}.field-note-readings{gap:10px}.field-note-readings button{padding:14px 10px}}` + fieldNoteStyles(id, colors),
  js: `document.querySelectorAll('.field-note-readings button').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.field-note-status').textContent='Inspecting '+button.querySelector('span').textContent.toLowerCase()+' record.'}));\n` + fieldNoteScript({ id, notes, delay: 160 }) + `\ndocument.querySelector('.field-note-example .water').focus({preventScroll:true});`,
  implementation: ['Use apply_reference_detail with caller-supplied context for named, already focusable controls.', 'Keep the note text supplementary. Keep the existing click or tap action as the way to open full details.', 'Place the generated stylesheet in the page and load its JavaScript once after the matching controls exist.'],
  accessibility: ['Focus remains on the trigger. Escape dismisses the note without cancelling the original keyboard event.', 'The note stays available while either the trigger or the note is hovered.', 'The note has role=tooltip and is connected through aria-describedby only while visible.', 'Touch input keeps the original tap action. The generated runtime adds no focus trap or tab stop.', 'The APG tooltip pattern remains a work in progress. Review with assistive technology in the integrated interface.'],
  states: ['focus', 'hover', 'pointer over note', 'Escape dismissal', 'original click', 'touch tap'],
  responsive: 'The portal is fixed within the viewport and does not change page layout. It uses the existing controls at every viewport width.',
  specimenBehavior: 'Working original inspection action plus supplementary notes. The study focuses its first sample so its note is visible on opening.'
};

export const fieldNotePack = {
  id: 'contextual-controls', title: 'Contextual controls',
  summary: 'Add a small, evidence-backed note to a working interface while retaining the brand and its existing actions.',
  tags: ['existing-site', 'tooltip', 'focus', 'context', 'detail'], patterns: [fieldNotePattern.id],
  sourceName: fieldNotePattern.sourceName, sourceUrl: fieldNotePattern.sourceUrl,
  tokens: { colors: { background: '#f1efe5', surface: '#fcfbf5', text: '#20382e', muted: '#526456', accent: '#375d47', border: '#7b8c7b' }, typography: { body: 'system-ui, sans-serif', display: 'Georgia, serif' }, radius: { control: '3px', panel: '5px' } },
  principles: ['Keep the original action and reading order.', 'Use context that the caller can substantiate.', 'Make supplementary content dismissible, hoverable and persistent.']
};
