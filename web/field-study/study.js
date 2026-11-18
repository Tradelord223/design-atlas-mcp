const frame = document.querySelector('#specimen-frame');
const original = document.querySelector('#original-mode');
const notes = document.querySelector('#notes-mode');
const play = document.querySelector('#play-reveal');
const skip = document.querySelector('#skip-reveal');
const treatment = document.querySelector('#reveal-treatment');
const focus = document.querySelector('#focus-sensor');
const instruction = document.querySelector('#study-instruction');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let mode = 'original';
let naturalHeight = 1050;
let readingScroll;
function sizeSpecimen() {
  frame.style.height = (innerWidth <= 800 ? Math.max(550, Math.min(innerHeight, 900)) : Math.max(600, Math.min(5000, naturalHeight))) + 'px';
}
window.addEventListener('resize', sizeSpecimen);
sizeSpecimen();
function send(action, extra = {}) {
  frame.contentWindow?.postMessage({ type: 'strata-study-control', action, ...extra }, '*');
}
function setMode(value) {
  mode = value;
  original.setAttribute('aria-pressed', String(value === 'original'));
  notes.setAttribute('aria-pressed', String(value === 'notes'));
  focus.hidden = value !== 'notes' || matchMedia('(pointer: coarse)').matches;
  document.querySelector('#standalone-link').href = 'specimen.html' + (value === 'notes' ? '?field-notes=on' : '');
  instruction.textContent = value === 'notes'
    ? 'Field notes are on. Hover or keyboard-focus Moisture, NDVI, or Canopy for a short explanation. Click or tap to open the original full reading.'
    : 'Choose “With field notes,” then hover or keyboard-focus Moisture, NDVI, or Canopy. Selecting a sensor opens its original reading context.';
  send('set-field-notes', { enabled: value === 'notes' });
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') send('dismiss-field-note'); }, true);
document.addEventListener('focusin', event => { if (event.target !== frame) send('dismiss-field-note'); });
original.addEventListener('click', () => setMode('original'));
notes.addEventListener('click', () => setMode('notes'));
treatment.addEventListener('change', () => { document.querySelector('#download-reveal').href = 'exports/' + treatment.value + '.js'; });
play.addEventListener('click', () => send('play-aperture', { treatment: treatment.value }));
skip.addEventListener('click', () => send('skip-aperture'));
focus.addEventListener('click', () => {
  frame.focus();
  send('focus-sensor');
});
function motionControls() {
  play.disabled = preference.matches;
  treatment.disabled = preference.matches;
  play.textContent = preference.matches ? 'Hero reveal · reduced motion' : 'Play hero reveal ↗';
  if (preference.matches) {
    skip.hidden = true;
    send('skip-aperture');
    instruction.textContent = 'Reduced motion is enabled. The hero stays in its original full-image composition. Field notes and reading dialogs remain available.';
  }
}
preference.addEventListener('change', motionControls);
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'strata-study-ready') {
    setMode(mode);
    motionControls();
  }
  if (event.data.type === 'strata-study-height' && Number.isFinite(event.data.height)) {
    naturalHeight = event.data.height;
    sizeSpecimen();
  }
  if (event.data.type === 'strata-reading-open' && innerWidth <= 800) {
    readingScroll = scrollY;
    frame.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  if (event.data.type === 'strata-reading-close' && readingScroll !== undefined) {
    scrollTo({ top: readingScroll, behavior: 'instant' });
    readingScroll = undefined;
  }
  if (event.data.type === 'strata-aperture-state') {
    const playing = event.data.state === 'playing';
    skip.hidden = !playing;
    play.textContent = preference.matches ? 'Hero reveal · reduced motion' : playing ? 'Replay hero reveal ↗' : 'Play hero reveal ↗';
    if (playing) instruction.textContent = `Playing the ${treatment.options[treatment.selectedIndex].text.toLowerCase()} opening on the existing aerial photograph.`;
    if (event.data.state === 'finished' && !preference.matches) instruction.textContent = 'The reveal has settled into the original composition. You can replay another opening or try a sensor field note.';
  }
});
motionControls();
