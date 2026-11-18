// Each group changes one behavior in the named specimen. The original markup, content,
// business events, focus targets, colors and typography stay under the host's control.
const imprint = [
  {
    id: 'line-relay', name: 'Line relay', change: 'The first line clears its mask just before the second line follows.',
    css: '.imprint h2 b{animation:imprint-rise 620ms cubic-bezier(.16,1,.3,1) both}.imprint h2 span+span b{animation-delay:170ms}'
  },
  {
    id: 'cross-feed', name: 'Cross feed', change: 'The two lines arrive from opposite sides, on the same beat.',
    css: '.imprint h2 b{--entry:-28%;animation:atlas-cross-feed 660ms cubic-bezier(.22,1,.36,1) both}.imprint h2 span+span b{--entry:28%;animation-delay:0ms}@keyframes atlas-cross-feed{from{transform:translateX(var(--entry));opacity:0}to{transform:translateX(0);opacity:1}}'
  },
  {
    id: 'ink-wipe', name: 'Ink wipe', change: 'A moving edge reveals stationary letterforms from left to right.',
    css: '.imprint h2 b{animation:atlas-type-wipe 760ms cubic-bezier(.42,0,.2,1) both}.imprint h2 span+span b{animation-delay:85ms}@keyframes atlas-type-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}'
  },
  {
    id: 'soft-proof', name: 'Soft proof', change: 'The title comes into focus in place, with no positional movement.',
    css: '.imprint h2 b{animation:atlas-soft-proof 660ms ease-out both}.imprint h2 span+span b{animation-delay:65ms}@keyframes atlas-soft-proof{from{filter:blur(5px);opacity:.08}to{filter:blur(0);opacity:1}}'
  }
];
const disclosure = [
  {
    id: 'short-lift', name: 'Short lift', change: 'The answer lifts six pixels into its resting position.',
    css: '.fold details[open] div{animation:atlas-answer-lift 240ms ease-out both}@keyframes atlas-answer-lift{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
  },
  {
    id: 'rule-down', name: 'Rule down', change: 'A horizontal edge reveals the answer from its first line.',
    css: '.fold details[open] div{animation:atlas-answer-rule 350ms cubic-bezier(.16,1,.3,1) both}@keyframes atlas-answer-rule{from{clip-path:inset(0 0 100%)}to{clip-path:inset(0)}}'
  },
  {
    id: 'margin-entry', name: 'Margin entry', change: 'The answer enters from the reading margin while the question stays still.',
    css: '.fold details[open] div{animation:atlas-answer-margin 280ms ease-out both}@keyframes atlas-answer-margin{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}'
  },
  {
    id: 'ink-in', name: 'Ink in', change: 'Only the answer’s opacity changes as the disclosure opens.',
    css: '.fold details[open] div{animation:atlas-answer-ink 200ms linear both}@keyframes atlas-answer-ink{from{opacity:0}to{opacity:1}}'
  }
];
const ticket = [
  {
    id: 'corner-slide', name: 'Corner slide', change: 'The held marker slides diagonally into the ticket corner.',
    css: '.ticket .stub.held::after{animation:atlas-corner-slide 300ms ease-out both}@keyframes atlas-corner-slide{from{transform:translate(100%,-100%)}to{transform:none}}'
  },
  {
    id: 'hinge', name: 'Paper hinge', change: 'The marker unfolds around the top-right corner.',
    css: '.ticket .stub.held::after{transform-origin:top right;animation:atlas-ticket-hinge 420ms cubic-bezier(.18,.8,.27,1) both}@keyframes atlas-ticket-hinge{from{transform:perspective(180px) rotateY(-88deg)}to{transform:perspective(180px) rotateY(0)}}'
  },
  {
    id: 'press-mark', name: 'Press mark', change: 'A quick stamp settles into the held state.',
    css: '.ticket .stub.held::after{transform-origin:top right;animation:atlas-ticket-press 380ms ease-out both}@keyframes atlas-ticket-press{0%{transform:scale(1.6);opacity:0}55%{transform:scale(.88);opacity:1}100%{transform:scale(1)}}'
  },
  {
    id: 'print-through', name: 'Print through', change: 'The held marker appears gradually without translating or rotating.',
    css: '.ticket .stub.held::after{transform:none;animation:atlas-ticket-ink 290ms linear both}@keyframes atlas-ticket-ink{from{opacity:0}to{opacity:1}}'
  }
];
const rail = [
  {
    id: 'continuous-rule', name: 'Continuous rule', change: 'The full rail fills continuously with the distance read.',
    css: '.tide .tide-meter i{height:3px;position:relative;top:1px;transform:scaleX(var(--read,0));transform-origin:left}'
  },
  {
    id: 'station-ticks', name: 'Station ticks', change: 'Twenty fixed tick marks become visible as the reader advances.',
    css: '.tide .tide-meter i{transform:none;background:repeating-linear-gradient(to right,#bbebad 0 2px,transparent 2px 5%);clip-path:inset(0 calc(100% - var(--read,0)*100%) 0 0)}'
  },
  {
    id: 'travelling-index', name: 'Travelling index', change: 'A single marker follows the current position along an unfilled rail.',
    css: '.tide .tide-meter i{width:8px;height:100%;transform:none;position:absolute;left:calc((100% - 8px)*var(--read,0))}'
  },
  {
    id: 'remaining-rule', name: 'Distance remaining', change: 'The rail represents the unread portion, receding toward the far edge.',
    css: '.tide .tide-meter i{transform-origin:right;transform:scaleX(calc(1 - var(--read,0)))}'
  }
];
const aperture = [
  ['viewfinder', 'Viewfinder', 'A compact portrait-shaped view opens in both directions.'],
  ['horizon', 'Horizon', 'A horizontal strip opens vertically until the whole image is visible.'],
  ['slit', 'Vertical slit', 'A slim vertical view widens across the photograph.'],
  ['corner', 'Corner window', 'The image opens from a small window near its top-right corner.']
].map(([id, name, change]) => ({id,name,change,css:'.aperture-study [data-aperture-media]{--atlas-aperture-treatment:'+id+'}'}));

const navigation = [
  {id:'lower-edge', name:'Lower edge', change:'The panel drops six pixels from the index baseline.', css:'.plate-index .plate-drawer{animation:plate-arrive 240ms cubic-bezier(.2,.75,.25,1) both}'},
  {id:'paper-unfold', name:'Paper unfold', change:'A mask uncovers the panel downward from the summary.', css:'.plate-index .plate-drawer{animation:atlas-index-unfold 280ms ease-out both}@keyframes atlas-index-unfold{from{clip-path:inset(0 0 100%)}to{clip-path:inset(0)}}'},
  {id:'edge-slide', name:'Edge slide', change:'The menu slides in from the aligned edge.', css:'.plate-index .plate-drawer{animation:atlas-index-slide 220ms ease-out both}@keyframes atlas-index-slide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}'},
  {id:'ink-in', name:'Ink in', change:'The menu appears in place with a short fade.', css:'.plate-index .plate-drawer{animation:atlas-index-ink 160ms linear both}@keyframes atlas-index-ink{from{opacity:0}to{opacity:1}}'}
];
const arrow = [
  ['diagonal', 'Diagonal exchange', 'The two arrows exchange places along the diagonal.', '110%', '-110%', '245ms'],
  ['horizontal', 'Across', 'The outgoing arrow slides right and its replacement enters from the left.', '110%', '0%', '230ms'],
  ['vertical', 'Lift', 'The arrow steps upward through a fixed window.', '0%', '-110%', '205ms'],
  ['quick-exchange', 'Quick exchange', 'A brief diagonal exchange settles in 140 milliseconds.', '110%', '-110%', '140ms']
].map(([id, name, change, x, y, duration]) => ({
  id, name, change,
  css:'.atlas-shift-arrow>span{transition-duration:'+duration+'}.atlas-shift-arrow>span+span{transform:translate(calc(-1 * '+x+'),calc(-1 * '+y+'))}:is(a,button):is(:hover,:focus-visible) .atlas-shift-arrow>span:first-child{transform:translate('+x+','+y+')}'
}));

const studies = new Map([
  ['plate-index', { trigger:'Open the plate index', choices:navigation, reduced:'.plate-index .plate-drawer' }],
  ['directional-link', { trigger:'Hover or focus the link', choices:arrow }],
  ['aperture-hero-reveal', { trigger:'Replay the hero reveal', choices:aperture }],
  ['opening-imprint', { trigger: 'Replay the title', choices: imprint, reduced: '.imprint h2 b' }],
  ['service-fold', { trigger: 'Open an answer', choices: disclosure, reduced: '.fold details[open] div' }],
  ['press-ticket', { trigger: 'Hold or release a berth', choices: ticket, reduced: '.ticket .stub.held::after' }],
  ['reading-tide', { trigger: 'Scroll the journal', choices: rail }]
]);

export function motionVariations(id) {
  const study = studies.get(id);
  if (!study) return null;
  const reduced = study.reduced
    ? '\n@media(prefers-reduced-motion:reduce){' + study.reduced + '{animation:none!important;transform:none;filter:none;clip-path:none;opacity:1}}'
    : '';
  return {
    trigger: study.trigger,
    choices: study.choices.map(choice => ({...choice, css: choice.css + reduced}))
  };
}
