export const atlasSpreadStyles = `
:root {
  color-scheme: light;
  --paper: #f3f2e9;
  --ink: #10241b;
  --muted: #526052;
  --line: #c7cdbd;
  --night: #10241b;
  --light: #f7f6ee;
  --sans: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  --mono: 'Geist Mono', 'SFMono-Regular', Consolas, monospace;
  --gutter: clamp(22px, 4.5vw, 86px);
  font-family: var(--sans);
  font-synthesis: none;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 24px; }
body { margin: 0; color: var(--ink); background: var(--paper); font-size: 16px; line-height: 1.6; }
button, a { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; font: inherit; color: inherit; }
a { color: inherit; text-underline-offset: 4px; }
img { display: block; max-width: 100%; }
h1, h2, h3, p { margin: 0; }
button:focus-visible, a:focus-visible, [tabindex]:focus-visible { outline: 3px solid currentColor; outline-offset: 5px; }
[hidden] { display: none !important; }
.skip-link { position: absolute; z-index: 10; top: -90px; left: 20px; padding: 12px 18px; color: var(--ink); background: var(--light); }
.skip-link:focus { top: 14px; }
.edition-masthead { min-height: 86px; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 30px; padding: 18px var(--gutter); background: var(--night); color: var(--light); }
.brand-lockup { display: flex; align-items: baseline; gap: 22px; min-width: 0; }
.edition-brand { font-size: clamp(22px, 2.25vw, 37px); font-weight: 760; letter-spacing: -.055em; line-height: 1.05; text-decoration: none; overflow-wrap: anywhere; }
.edition-name { border-left: 1px solid #ffffff40; padding-left: 20px; max-width: 26ch; font: 10px/1.5 var(--mono); letter-spacing: .025em; }
.edition-nav { display: flex; gap: 27px; font-size: 11px; }
.edition-nav a { text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; border-bottom: 1px solid transparent; }
.edition-nav a:hover { border-bottom-color: var(--accent); }
.edition-date { justify-self: end; max-width: 31ch; text-align: right; font: 9px/1.6 var(--mono); color: #d0d8ca; }
.cover-stage { position: relative; isolation: isolate; min-height: 420px; height: clamp(420px, 56svh, 650px); overflow: hidden; background: #253a2b; }
.cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 50%; }
.cover-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(0deg, #05160df0 0%, #05160db3 32%, #05160d24 72%, #05160d12 100%); }
.cover-copy { position: absolute; z-index: 2; left: var(--gutter); right: var(--gutter); bottom: 31px; pointer-events: none; }
.cover-title { max-width: 21ch; color: var(--light); font-size: clamp(65px, 7.55vw, 134px); font-weight: 790; line-height: .94; letter-spacing: -.068em; text-wrap: balance; overflow-wrap: anywhere; white-space: pre-line; }
.cover-title.is-long { font-size: clamp(49px, 5.45vw, 91px); max-width: 29ch; }
.map-layer { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.map-marker { position: absolute; width: 44px; height: 44px; padding: 0; transform: translate(-50%, -50%); border: 1px solid #f6f7ebaa; border-radius: 50%; background: #10241be6; color: #ffffff; display: grid; place-items: center; pointer-events: auto; font: 11px/1 var(--mono); transition: background-color 160ms, box-shadow 160ms; }
.map-marker:hover { background: #edf2e7; color: #10241b; }
.map-marker[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); border-color: #ffffff; box-shadow: 0 0 0 6px #071a11a8, 0 0 0 7px #f7f7ebc9; font-weight: 700; }
.map-marker:focus-visible { outline-color: white; outline-offset: 8px; }
.marker-caption { position: absolute; bottom: calc(100% + 13px); left: 50%; transform: translateX(-50%); width: max-content; max-width: 190px; padding: 7px 10px; background: #10241bed; color: white; font: 10px/1.4 var(--sans); white-space: nowrap; pointer-events: none; visibility: hidden; }
.map-marker[aria-pressed="true"] .marker-caption { visibility: visible; }
.marker-caption strong { font-weight: 650; margin-left: 7px; }
.map-marker[data-label-edge="left"] .marker-caption { left: -3px; transform: none; }
.map-marker[data-label-edge="right"] .marker-caption { left: auto; right: -3px; transform: none; }
.map-marker[data-label-below="true"] .marker-caption { bottom: auto; top: calc(100% + 13px); }
.image-failure { position: absolute; z-index: 4; top: 22px; left: var(--gutter); right: var(--gutter); padding: 10px 14px; background: #10241bea; color: white; font-size: 12px; }
.inspect-map { display: none; }
.reading-copy .small-label { display: flex; align-items: center; gap: 8px; }
.reading-copy .small-label svg { width: 16px; height: 16px; flex: none; }
.chapter-image-failure { position: absolute; inset: 0; display: grid; place-content: center; padding: 30px; color: var(--muted); background: #e2e5d7; font-size: 13px; line-height: 1.7; }
.signal-deck { display: grid; grid-template-columns: minmax(0, 1.06fr) minmax(0, 1fr); border-bottom: 1px solid var(--line); }
.signal-index { min-width: 0; padding: 25px 32px 25px var(--gutter); border-right: 1px solid var(--line); }
.index-heading { display: flex; align-items: center; justify-content: space-between; gap: 25px; margin-bottom: 12px; }
.small-label { font: 9px/1.5 var(--mono); text-transform: uppercase; letter-spacing: .1em; }
.collection-count { font: 9px/1.5 var(--mono); color: var(--muted); }
.edition-deck { max-width: 62ch; font-size: 13px; line-height: 1.65; color: var(--muted); margin-bottom: 20px; }
.signal-list { display: grid; grid-template-columns: repeat(var(--reading-count), minmax(134px, 1fr)); gap: 0; overflow-x: auto; scrollbar-width: thin; scroll-snap-type: x proximity; }
.signal-tab { position: relative; padding: 12px 13px 11px; min-height: 83px; border: 1px solid var(--line); border-right: 0; background: transparent; text-align: left; scroll-snap-align: start; }
.signal-tab:last-child { border-right: 1px solid var(--line); }
.signal-tab[aria-selected="true"] { background: var(--accent); color: var(--on-accent); box-shadow: inset 0 -3px var(--on-accent); border-color: var(--ink); }
.signal-tab:hover:not([aria-selected="true"]) { background: #e5e8db; }
.signal-tab:focus-visible { outline-offset: -5px; }
.signal-label { display: flex; align-items: baseline; gap: 7px; font-size: 9px; line-height: 1.4; }
.signal-order { font-family: var(--mono); font-size: 8px; opacity: .7; }
.signal-tab-value { display: block; margin-top: 8px; font-size: 23px; font-weight: 530; line-height: 1.1; letter-spacing: -.055em; overflow-wrap: anywhere; }
.reading-panel { padding: 28px var(--gutter) 27px 35px; min-width: 0; }
.reading-detail { display: grid; grid-template-columns: minmax(100px, .65fr) minmax(0, 1fr); gap: 27px; align-items: start; }
.reading-value { font-size: clamp(36px, 4.2vw, 65px); line-height: 1; letter-spacing: -.075em; font-weight: 490; overflow-wrap: anywhere; max-width: 8ch; margin-top: 21px; }
.reading-copy .small-label { color: var(--muted); margin-bottom: 11px; }
.reading-copy h2 { font-size: 20px; line-height: 1.15; font-weight: 540; letter-spacing: -.035em; margin-bottom: 11px; }
.reading-copy>p:last-child { font-size: 12px; line-height: 1.75; color: var(--muted); white-space: pre-line; }
.reading-detail.is-changing { animation: reading-change 220ms ease-out; }
@keyframes reading-change { from { opacity: .25; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.reading-status { margin-top: 17px; font: 8px/1.5 var(--mono); color: var(--muted); }
.chapters-section { padding: 74px var(--gutter) 88px; }
.chapter-section-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 30px; border-bottom: 1px solid var(--line); padding-bottom: 22px; margin-bottom: 36px; }
.chapter-section-heading h2 { font-weight: 480; font-size: clamp(29px, 3vw, 47px); line-height: 1.1; letter-spacing: -.045em; }
.chapter-layout { display: grid; grid-template-columns: minmax(190px, .27fr) minmax(0, 1fr); gap: 43px; align-items: start; }
.chapter-index { min-width: 0; position: sticky; top: 22px; }
.chapter-tab { display: grid; grid-template-columns: 26px minmax(0, 1fr) 13px; gap: 13px; width: 100%; background: transparent; border: 0; border-top: 1px solid var(--line); padding: 21px 0; text-align: left; min-height: 97px; }
.chapter-tab:last-child { border-bottom: 1px solid var(--line); }
.chapter-tab[aria-selected="true"] { border-top: 2px solid var(--ink); padding-top: 20px; }
.chapter-tab[aria-selected="true"] .chapter-order { background: var(--ink); color: var(--light); }
.chapter-order { display: grid; place-items: center; width: 25px; height: 25px; border: 1px solid var(--line); font: 8px/1 var(--mono); }
.chapter-tab-kicker { display: block; font: 8px/1.5 var(--mono); text-transform: uppercase; letter-spacing: .075em; color: var(--muted); margin-bottom: 7px; }
.chapter-tab-title { display: block; font-size: 15px; line-height: 1.25; letter-spacing: -.03em; font-weight: 520; }
.chapter-arrow { align-self: center; width: 13px; height: 13px; opacity: .35; }
.chapter-tab[aria-selected="true"] .chapter-arrow { opacity: 1; }
.chapter-panel { min-width: 0; }
.chapter-image-wrap { position: relative; aspect-ratio: 1.85; overflow: hidden; background: #d5daca; }
.chapter-image { width: 100%; height: 100%; object-fit: cover; }
.chapter-photo-note { position: absolute; bottom: 18px; left: 19px; max-width: calc(100% - 38px); color: white; background: #10241bd9; padding: 6px 10px; font: 8px/1.4 var(--mono); text-transform: uppercase; letter-spacing: .07em; }
.chapter-text { display: grid; grid-template-columns: .9fr 1fr; gap: 45px; align-items: start; padding: 27px 0 0; }
.chapter-text h3 { font-size: clamp(32px, 3.3vw, 54px); font-weight: 460; line-height: 1.06; letter-spacing: -.055em; text-wrap: balance; overflow-wrap: anywhere; }
.chapter-body { font-size: 14px; line-height: 1.8; color: var(--muted); max-width: 53ch; white-space: pre-line; }
.chapter-detail.is-changing { animation: chapter-change 280ms ease-out; }
@keyframes chapter-change { from { opacity: .25; } to { opacity: 1; } }
.edition-footer { background: var(--night); color: var(--light); padding: 29px var(--gutter); display: flex; align-items: baseline; justify-content: space-between; gap: 30px; }
.footer-brand { font-size: 22px; line-height: 1.2; font-weight: 650; letter-spacing: -.045em; overflow-wrap: anywhere; }
.edition-footer>p { font: 9px/1.6 var(--mono); color: #c3d0bd; max-width: 42ch; }
.source-link { display: inline-flex; align-items: center; gap: 17px; font-size: 11px; text-decoration: none; border-bottom: 1px solid #a3b59a; padding: 8px 0; }
.source-link svg { width: 16px; height: 16px; }
@media (min-width: 1700px) { .signal-index { padding-top: 31px; padding-bottom: 31px; } .reading-panel { padding-top: 35px; } .edition-deck { font-size: 15px; } .reading-copy>p:last-child { font-size: 14px; } }
@media (max-width: 1120px) {
  .edition-masthead { gap: 22px; grid-template-columns: minmax(0, 1fr) auto; }
  .edition-date { grid-column: 1 / -1; justify-self: start; text-align: left; max-width: none; border-top: 1px solid #ffffff26; padding-top: 10px; width: 100%; margin-top: -6px; }
  .edition-name { font-size: 9px; max-width: 21ch; }
  .edition-nav { gap: 20px; font-size: 10px; }
  .cover-title { font-size: clamp(59px, 8.3vw, 98px); }
  .signal-deck { grid-template-columns: 1fr 1fr; }
  .signal-index { padding-right: 23px; }
  .reading-panel { padding-left: 25px; }
  .reading-detail { grid-template-columns: 1fr; gap: 15px; }
  .reading-value { margin: 0; font-size: 40px; max-width: none; }
  .reading-copy .small-label { margin-bottom: 7px; }
  .reading-status { font-size: 8px; margin-top: 12px; }
  .chapter-layout { grid-template-columns: 190px minmax(0, 1fr); gap: 28px; }
  .chapter-text { gap: 25px; }
}
@media (max-width: 760px) {
  html { scroll-padding-top: 18px; }
  .edition-masthead { min-height: 95px; padding-top: 16px; padding-bottom: 13px; gap: 13px 18px; }
  .brand-lockup { display: block; }
  .edition-brand { font-size: 25px; display: inline-block; }
  .edition-name { border: 0; padding: 0; display: block; font-size: 8px; max-width: 29ch; margin-top: 6px; }
  .edition-nav { gap: 17px; font-size: 9px; align-self: center; }
  .edition-nav a { min-height: 44px; }
  .edition-date { font-size: 8px; padding-top: 9px; margin-top: 0; }
  .cover-stage { min-height: 360px; height: 45svh; max-height: 500px; }
  .inspect-map { display: block; padding: 19px var(--gutter) 0; margin: 0; }
  .inspect-map figcaption { display: flex; justify-content: space-between; gap: 15px; align-items: baseline; margin-bottom: 12px; }
  .inspect-map figcaption>span:last-child { font-size: 9px; color: var(--muted); }
  .inspect-map-canvas { position: relative; min-height: 110px; background: #d5daca; }
  .inspect-map-image { width: 100%; height: auto; }
  .inspect-map .map-marker { width: 36px; height: 36px; }
  .inspect-map .marker-caption { display: none; }
  .inspect-map .map-marker[aria-pressed="true"] { box-shadow: 0 0 0 3px #071a11a8, 0 0 0 4px #f7f7ebc9; }
  .cover-copy { bottom: 25px; }
  .cover-title { max-width: 15ch; font-size: clamp(47px, 11.6vw, 74px); line-height: .98; letter-spacing: -.065em; }
  .cover-title.is-long { font-size: clamp(37px, 8.7vw, 55px); max-width: 21ch; }
  .map-marker { width: 44px; height: 44px; font-size: 10px; }
  .marker-caption { font-size: 9px; max-width: 180px; padding: 6px 8px; }
  .signal-deck { grid-template-columns: 1fr; }
  .signal-index { display: flex; flex-direction: column; border-right: 0; padding: 23px var(--gutter) 22px; }
  .signal-index .index-heading { order: 0; }
  .signal-index .signal-list { order: 1; }
  .signal-index .edition-deck { order: 2; margin: 17px 0 0; }
  .index-heading { margin-bottom: 11px; }
  .edition-deck { font-size: 13px; margin-bottom: 18px; }
  .signal-list { grid-template-columns: repeat(var(--reading-count), minmax(142px, 1fr)); }
  .signal-tab { min-height: 85px; }
  .signal-label { font-size: 9px; }
  .signal-tab-value { font-size: 23px; }
  .reading-panel { padding: 24px var(--gutter) 29px; border-top: 1px solid var(--line); }
  .reading-detail { grid-template-columns: .72fr 1fr; gap: 23px; }
  .reading-value { font-size: 39px; margin-top: 21px; max-width: 8ch; }
  .reading-copy h2 { font-size: 20px; }
  .reading-copy>p:last-child { font-size: 12px; }
  .reading-copy .small-label { font-size: 8px; }
  .reading-status { font-size: 8px; margin-top: 16px; }
  .chapters-section { padding: 45px var(--gutter) 53px; }
  .chapter-section-heading { align-items: start; gap: 15px; padding-bottom: 21px; margin-bottom: 20px; }
  .chapter-section-heading h2 { font-size: 29px; max-width: 9ch; }
  .chapter-section-heading .small-label { max-width: 16ch; text-align: right; font-size: 8px; }
  .chapter-layout { grid-template-columns: 1fr; gap: 21px; }
  .chapter-index { position: static; display: grid; grid-template-columns: repeat(var(--chapter-count), minmax(172px, 1fr)); overflow-x: auto; scrollbar-width: thin; }
  .chapter-tab { grid-template-columns: 23px minmax(0,1fr); gap: 10px; padding: 15px 13px 15px 0; min-height: 99px; border-bottom: 1px solid var(--line); }
  .chapter-tab[aria-selected="true"] { padding-top: 14px; }
  .chapter-tab:last-child { border-bottom: 1px solid var(--line); }
  .chapter-arrow { display: none; }
  .chapter-tab-title { font-size: 13px; }
  .chapter-tab-kicker { font-size: 7px; margin-bottom: 6px; }
  .chapter-order { width: 23px; height: 23px; font-size: 8px; }
  .chapter-image-wrap { aspect-ratio: 1.15; }
  .chapter-photo-note { font-size: 7px; bottom: 13px; left: 13px; padding: 6px 8px; }
  .chapter-text { grid-template-columns: 1fr; gap: 19px; padding-top: 23px; }
  .chapter-text h3 { font-size: 37px; max-width: 16ch; }
  .chapter-body { font-size: 14px; line-height: 1.8; }
  .edition-footer { display: grid; grid-template-columns: 1fr; gap: 15px; padding-top: 26px; padding-bottom: 27px; }
  .footer-brand { font-size: 23px; }
  .edition-footer>p { font-size: 8px; max-width: none; }
  .source-link { justify-self: start; font-size: 10px; gap: 23px; }
}
@media (max-width: 360px) {
  .edition-nav { gap: 12px; font-size: 8px; }
  .edition-brand { font-size: 22px; }
  .cover-title { font-size: 42px; }
  .reading-detail { grid-template-columns: 1fr; gap: 17px; }
  .reading-value { margin-top: 0; font-size: 47px; }
  .reading-copy h2 { font-size: 21px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
