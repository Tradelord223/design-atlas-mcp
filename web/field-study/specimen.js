import { mountAperture } from './aperture-runtime.js';
const originalOrigin = 'https://strata-agrisystems.raqmanplentiful.chatgpt.site';
const controllerId = 'atlas-field-note-03b35581d901';
const notesController = window[Symbol.for('design-atlas.field-notes')]?.get(controllerId);
const notesEnabled = new URLSearchParams(location.search).get('field-notes') === 'on';
notesController?.setEnabled(notesEnabled);
function report(type, values = {}) {
  if (window.parent !== window) window.parent.postMessage({ type, ...values }, '*');
}
const photo = document.querySelector('.hero-photo');
const aperture = mountAperture(document.querySelector('#hero'), {
  media: photo,
  duration: 1500,
  onState: state => {
    if (state === 'finished') photo.style.removeProperty('--atlas-aperture-treatment');
    report('strata-aperture-state', { state });
  }
});
window.strataAperture = aperture;
window.addEventListener('message', event => {
  if (event.source !== window.parent || !event.data || event.data.type !== 'strata-study-control') return;
  const { action } = event.data;
  if (action === 'set-field-notes') notesController?.setEnabled(event.data.enabled === true);
  if (action === 'dismiss-field-note') {
    if (typeof notesController?.dismiss === 'function') notesController.dismiss();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
  if (action === 'focus-sensor') document.querySelector('.sensor.moisture')?.focus();
  if (action === 'skip-aperture') aperture.skip();
  if (action === 'play-aperture') {
    const treatment = ['viewfinder', 'horizon', 'slit', 'corner'].includes(event.data.treatment) ? event.data.treatment : 'viewfinder';
    photo.style.setProperty('--atlas-aperture-treatment', treatment);
    aperture.play();
  }
});
const signals = {
  moisture: { eyebrow:'FIELD READING / WATER', title:'Know what is beneath the canopy.', intro:'34.2% soil moisture', paragraphs:['Soil moisture is one part of the field picture. Its meaning depends on soil texture, sensor depth, crop stage, and the weather ahead.','This is the fixed illustrative reading shown in the original field snapshot, dated 27 August 2024. It is not a live sensor feed or an irrigation recommendation.'] },
  ndvi: { eyebrow:'FIELD READING / VEGETATION', title:'A different way to see a field.', intro:'0.71 vegetation index', paragraphs:['NDVI compares reflected near-infrared and red light to describe vegetation greenness. It is a useful signal to explore alongside field observations, crop stage, and other information.','The 0.71 reading is preserved from the reference snapshot. It is illustrative and does not establish crop health or predict yield by itself.'] },
  canopy: { eyebrow:'FIELD READING / CLIMATE', title:'The temperature of a growing season.', intro:'27.8°C canopy temperature', paragraphs:['Canopy temperature offers another view of how a crop interacts with its environment. Air temperature, humidity, sunlight, and water availability all matter when interpreting it.','The 27.8°C value is the fixed illustrative reading from the reference snapshot, not a current weather observation.'] }
};
const stories = [
  { eyebrow:'FIELD PERSPECTIVES / 01',title:'Healthy plants. Stronger tomorrows.',intro:'The most important signals are often the smallest.',paragraphs:['A leaf holds a record of the conditions around it: the water available to its roots, the light reaching its canopy, and the stresses it has weathered. Reading those signals connects an aerial view with what is happening on the ground.','Our approach to crop intelligence begins with that connection. Field observation, soil context, and seasonal conditions belong in the same conversation, so every decision can be made with a clearer picture of the whole plant.'],image:'leaf' },
  { eyebrow:'FIELD PERSPECTIVES / 02',title:'Precision in practice. Acres of opportunity.',intro:'Better information matters when it reaches the field.',paragraphs:['The value of a map is in the decision it helps someone make. Where is water needed? Which part of a field deserves a closer look? What has changed since the last observation?','Precision agriculture brings those questions down to a practical scale. Combining field knowledge with repeat observations helps growers direct their attention and resources to the places that need them.'],image:'precision' },
  { eyebrow:'FIELD PERSPECTIVES / 03',title:'People feed progress. And progress feeds people.',intro:'Behind every harvest is someone making the next decision.',paragraphs:['Technology is one part of a food system. The experience of the people who work the land is another. Lasting progress depends on bringing the two together.','We believe agricultural intelligence should be understandable, useful, and grounded in the realities of a growing season. The ambition is simple: give people a better foundation for the decisions that shape the next harvest.'],image:'people' }
];
const forecast = { eyebrow:'YIELD INTELLIGENCE / SCENARIO NOTE',title:'A view of the next ten years.',intro:'Models / fields / real impact',paragraphs:['This chart faithfully recreates the illustrative 2024–2034 forecast from the supplied design. The plotted values, date, and +42% annotation are concept data, not measured performance or a promise of future yield.','The +42% label is a separate annotation from the original artwork; it is not the percentage change between the first and last plotted points. A real forecast would need a defined baseline, crop, location, assumptions, and uncertainty range.'] };
const dialog = document.querySelector('#reading-dialog');
let previousFocus;
function showReading(detail) {
  previousFocus = document.activeElement;
  document.querySelector('#reading-eyebrow').textContent = detail.eyebrow;
  document.querySelector('#reading-title').textContent = detail.title;
  document.querySelector('#reading-intro').textContent = detail.intro;
  const body = document.querySelector('#reading-body');
  body.replaceChildren();
  for (const text of detail.paragraphs) { const paragraph = document.createElement('p'); paragraph.textContent = text; body.append(paragraph); }
  const picture = document.querySelector('#reading-photo');
  picture.replaceChildren();
  if (detail.image) {
    const crops = { leaf:[882,656,208,209],precision:[1106,656,207,209],people:[1330,656,216,209] };
    const labels = {leaf:'Dew drops on a sunlit green soybean leaf',precision:'Agricultural machinery working rich brown soil',people:'A farmer holding golden seeds in weathered hands'};
    const [x,y,width,height] = crops[detail.image];
    const wrapper = document.createElement('div'); wrapper.className = 'reference-crop dialog-photo'; wrapper.style.aspectRatio = width + '/' + height;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox',[x,y,width,height].join(' ')); svg.setAttribute('preserveAspectRatio','xMidYMid slice'); svg.setAttribute('role','img'); svg.setAttribute('aria-label',labels[detail.image]);
    const image = document.createElementNS('http://www.w3.org/2000/svg','image'); image.setAttribute('href',originalOrigin+'/images/reference.jpg'); image.setAttribute('width','1586'); image.setAttribute('height','992'); svg.append(image); wrapper.append(svg); picture.append(wrapper);
  }
  dialog.showModal();
  report('strata-reading-open');
}
for (const key of Object.keys(signals)) document.querySelector('.sensor.'+key).addEventListener('click',()=>showReading(signals[key]));
for (const [index,button] of [...document.querySelectorAll('.perspective')].entries()) button.addEventListener('click',()=>showReading(stories[index]));
document.querySelector('.chart-note').addEventListener('click',()=>showReading(forecast));
document.querySelector('#reading-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{previousFocus?.focus();report('strata-reading-close')});
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close()}});
const chart = document.querySelector('.yield-chart svg');
let chartTooltip;
function showPoint(point) {
  chartTooltip?.remove();
  const label = point.getAttribute('aria-label').match(/(\d{4}): ([\d.]+)/);
  if (!label) return;
  const x=Number(point.getAttribute('cx')),y=Number(point.getAttribute('cy'));
  chartTooltip=document.createElementNS('http://www.w3.org/2000/svg','g');chartTooltip.setAttribute('class','chart-tooltip');
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',Math.min(x-27,278));rect.setAttribute('y',Math.max(y-39,12));rect.setAttribute('width','87');rect.setAttribute('height','25');rect.setAttribute('fill','#1e2b23');
  const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',Math.min(x-20,285));text.setAttribute('y',Math.max(y-23,28));text.setAttribute('fill','#fff');text.textContent=label[1]+' / '+label[2];chartTooltip.append(rect,text);chart.append(chartTooltip);
}
for(const point of document.querySelectorAll('.chart-hit')){
 point.addEventListener('mouseenter',()=>showPoint(point));point.addEventListener('focus',()=>showPoint(point));point.addEventListener('click',()=>showPoint(point));point.addEventListener('mouseleave',()=>{if(document.activeElement!==point)chartTooltip?.remove()});point.addEventListener('blur',()=>chartTooltip?.remove());point.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showPoint(point)}});
}
function height(){
  const credit = document.querySelector('.standalone-credit');
  const bottom = credit.getBoundingClientRect().bottom + scrollY + parseFloat(getComputedStyle(credit).marginBottom || '0');
  report('strata-study-height',{height:Math.ceil(bottom)});
}
new ResizeObserver(height).observe(document.body);
window.addEventListener('load',height);
window.addEventListener('resize',height);
report('strata-study-ready');
height();
