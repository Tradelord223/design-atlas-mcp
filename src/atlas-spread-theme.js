function luminance(color) {
  const channels = color.slice(1).match(/../g).map(pair => parseInt(pair,16)/255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0]*0.2126 + channels[1]*0.7152 + channels[2]*0.0722;
}
function contrast(a,b) {
  const first=luminance(a), second=luminance(b);
  return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
}
export function normalizeEditionTheme(theme) {
  if (theme === undefined) return undefined;
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)) throw new Error('theme must contain paper, ink and display.');
  const {paper,ink,display} = theme;
  if (![paper,ink].every(value => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value))) throw new Error('Choose six-digit paper and ink colors.');
  if (contrast(paper,ink) < 4.5) throw new Error('Paper and ink need at least 4.5:1 text contrast.');
  if (!['sans','serif'].includes(display)) throw new Error('Choose sans or serif display type.');
  return {paper,ink,display};
}

export function editionThemeStyles(theme) {
  if (!theme) return '';
  const {paper,ink,display}=theme;
  const inverse=contrast(ink,'#ffffff')>=contrast(ink,'#000000')?'#ffffff':'#000000';
  const palette=':root{--paper:'+paper+';--ink:'+ink+';--night:'+ink+';--muted:'+ink+';--line:color-mix(in srgb,'+ink+' 24%,'+paper+')}';
  const nav='.edition-masthead,.edition-footer{color:'+inverse+'}';
  const displayType=display==='serif'?'.cover-title,.chapter-text h3,.chapter-section-heading h2{font-family:Georgia,serif;font-weight:400;letter-spacing:-.052em}':'';
  return palette+nav+displayType;
}
