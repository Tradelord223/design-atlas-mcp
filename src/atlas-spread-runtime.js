/** Browser-only behavior for an exported edition. No network requests or site dependencies. */
export function mountAtlasSpread(document) {
  const edition = document.querySelector('[data-atlas-spread]');
  if (!edition) return;
  const view = document.defaultView;
  const readingTabs = [...edition.querySelectorAll('[data-reading-tab]')];
  const readingPanels = [...edition.querySelectorAll('[data-reading-detail]')];
  const markers = [...edition.querySelectorAll('[data-reading-marker]')];
  const chapterTabs = [...edition.querySelectorAll('[data-chapter]')];
  const chapterPanels = [...edition.querySelectorAll('[data-chapter-detail]')];
  const readingSection = edition.querySelector('#readings');
  const readingPanel = edition.querySelector('#reading-panel');
  const status = edition.querySelector('#reading-status');
  const cover = edition.querySelector('.cover-stage');
  const photo = edition.querySelector('.cover-image');
  const map = edition.querySelector('.inspect-map-image');
  const mapFigure = edition.querySelector('.inspect-map-canvas');
  const mapLayer = edition.querySelector('.map-layer');
  const mobile = view.matchMedia('(max-width: 760px)');
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  let activeReading = readingTabs[0]?.dataset.readingTab;
  let activeChapter = chapterTabs[0]?.dataset.chapter;
  let activeSection = 'overview';
  let imageOffset;
  let panFrame = 0;

  function revealInRail(button, rail) {
    const left = button.offsetLeft - rail.offsetLeft;
    const right = left + button.offsetWidth;
    if (left < rail.scrollLeft) rail.scrollLeft = left;
    if (right > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = right - rail.clientWidth;
  }

  function projectMarkers(width, height, imageWidth, imageHeight, offsetX, offsetY) {
    for (const marker of markers) {
      const x = offsetX + Number(marker.dataset.x) / 100 * imageWidth;
      const y = offsetY + Number(marker.dataset.y) / 100 * imageHeight;
      marker.hidden = x < 0 || y < 0 || x > width || y > height;
      marker.style.left = x + 'px';
      marker.style.top = y + 'px';
      marker.dataset.labelEdge = x < 105 ? 'left' : x > width - 105 ? 'right' : 'center';
      marker.dataset.labelBelow = String(y < 65);
    }
  }

  function layoutMap(animate = false) {
    view.cancelAnimationFrame(panFrame);
    if (mobile.matches) {
      if (mapLayer.parentElement !== mapFigure) mapFigure.append(mapLayer);
      if (!map.complete || !map.naturalWidth) { mapLayer.hidden = true; return; }
      const box = mapFigure.getBoundingClientRect();
      if (!box.width || !box.height) return;
      mapLayer.hidden = false;
      projectMarkers(box.width, box.height, box.width, box.height, 0, 0);
      imageOffset = undefined;
      return;
    }
    if (mapLayer.parentElement !== cover) cover.append(mapLayer);
    if (!photo.complete || !photo.naturalWidth) { mapLayer.hidden = true; return; }
    const box = cover.getBoundingClientRect();
    if (!box.width || !box.height) return;
    mapLayer.hidden = false;
    const scale = Math.max(box.width / photo.naturalWidth, box.height / photo.naturalHeight);
    const width = photo.naturalWidth * scale;
    const height = photo.naturalHeight * scale;
    const selected = markers.find(marker => marker.dataset.readingMarker === activeReading);
    const x = Number(selected?.dataset.x ?? 50) / 100;
    const y = Number(selected?.dataset.y ?? 50) / 100;
    const destination = {
      x: Math.max(box.width - width, Math.min(0, box.width / 2 - x * width)),
      y: Math.max(box.height - height, Math.min(0, box.height / 2 - y * height))
    };
    const start = imageOffset || destination;
    const began = view.performance.now();
    function paint(time) {
      const progress = animate && !reduced.matches ? Math.min(1, (time - began) / 360) : 1;
      const eased = 1 - (1 - progress) ** 3;
      imageOffset = {
        x: start.x + (destination.x - start.x) * eased,
        y: start.y + (destination.y - start.y) * eased
      };
      const positionX = Math.abs(box.width - width) < 0.01 ? 50 : imageOffset.x / (box.width - width) * 100;
      const positionY = Math.abs(box.height - height) < 0.01 ? 50 : imageOffset.y / (box.height - height) * 100;
      photo.style.objectPosition = positionX + '% ' + positionY + '%';
      projectMarkers(box.width, box.height, width, height, imageOffset.x, imageOffset.y);
      if (progress < 1) panFrame = view.requestAnimationFrame(paint);
    }
    paint(began);
  }

  function activateReading(id, animate = true) {
    const tab = readingTabs.find(button => button.dataset.readingTab === id);
    if (!tab) return false;
    const changed = activeReading !== id;
    activeReading = id;
    edition.dataset.activeReading = id;
    for (const button of readingTabs) {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const marker of markers) marker.setAttribute('aria-pressed', String(marker.dataset.readingMarker === id));
    for (const panel of readingPanels) {
      const active = panel.dataset.readingDetail === id;
      panel.hidden = !active;
      panel.classList.remove('is-changing');
      if (active && changed && animate) {
        void panel.offsetWidth;
        panel.classList.add('is-changing');
      }
    }
    status.textContent = tab.dataset.readingStatus;
    revealInRail(tab, tab.parentElement);
    layoutMap(changed && animate);
    return changed;
  }

  function activateChapter(id, animate = true) {
    const tab = chapterTabs.find(button => button.dataset.chapter === id);
    if (!tab) return false;
    const changed = activeChapter !== id;
    activeChapter = id;
    edition.dataset.activeChapter = id;
    for (const button of chapterTabs) {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const panel of chapterPanels) {
      const active = panel.dataset.chapterDetail === id;
      panel.hidden = !active;
      panel.classList.remove('is-changing');
      if (active && changed && animate) {
        void panel.offsetWidth;
        panel.classList.add('is-changing');
      }
    }
    if (mobile.matches) revealInRail(tab, tab.parentElement);
    return changed;
  }

  function writeAddress(section) {
    activeSection = section;
    const parameters = new view.URLSearchParams();
    parameters.set('reading', activeReading);
    parameters.set('chapter', activeChapter);
    parameters.set('section', section);
    const next = '#' + parameters.toString();
    if (view.location.hash === next) return;
    try { view.history.pushState(null, '', next); }
    catch { view.location.hash = parameters.toString(); }
  }

  function scrollToSection(section) {
    const target = edition.querySelector('#' + section);
    target?.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
  }

  function readAddress(scroll = true) {
    const parameters = new view.URLSearchParams(view.location.hash.slice(1));
    activateReading(parameters.get('reading') || readingTabs[0].dataset.readingTab, false);
    activateChapter(parameters.get('chapter') || chapterTabs[0].dataset.chapter, false);
    const section = parameters.get('section');
    activeSection = ['overview', 'readings', 'chapters'].includes(section) ? section : 'overview';
    if (scroll && section) view.requestAnimationFrame(() => scrollToSection(activeSection));
  }

  function readingAction(id, showOnPhone) {
    activateReading(id);
    writeAddress('readings');
    if (showOnPhone && mobile.matches) readingPanel.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  for (const marker of markers) marker.addEventListener('click', () => readingAction(marker.dataset.readingMarker, true));
  for (const tab of readingTabs) tab.addEventListener('click', () => readingAction(tab.dataset.readingTab, true));
  for (const tab of chapterTabs) tab.addEventListener('click', () => {
    activateChapter(tab.dataset.chapter);
    writeAddress('chapters');
  });

  function bindArrowNavigation(buttons, activate, dataKey) {
    for (const [index, button] of buttons.entries()) button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      buttons[next].focus();
      activate(buttons[next].dataset[dataKey]);
    });
  }
  bindArrowNavigation(readingTabs, id => readingAction(id, false), 'readingTab');
  bindArrowNavigation(chapterTabs, id => { activateChapter(id); writeAddress('chapters'); }, 'chapter');

  for (const link of edition.querySelectorAll('[data-section-link]')) link.addEventListener('click', event => {
    const section = link.dataset.sectionLink;
    if (!['overview', 'readings', 'chapters'].includes(section)) return;
    event.preventDefault();
    writeAddress(section);
    scrollToSection(section);
  });
  function responsiveLayout() {
    edition.querySelector('.chapter-index').setAttribute('aria-orientation', mobile.matches ? 'horizontal' : 'vertical');
    imageOffset = undefined;
    layoutMap();
  }
  photo.addEventListener('load', () => layoutMap());
  map.addEventListener('load', () => layoutMap());
  photo.addEventListener('error', () => {
    edition.querySelector('.image-failure').hidden = false;
    for (const marker of markers) marker.hidden = true;
  });
  for (const image of edition.querySelectorAll('.chapter-image')) image.addEventListener('error', () => { image.parentElement.querySelector('.chapter-image-failure').hidden = false; });
  mobile.addEventListener('change', responsiveLayout);
  reduced.addEventListener('change', () => layoutMap());
  if (view.ResizeObserver) {
    const observer = new view.ResizeObserver(() => layoutMap());
    observer.observe(cover);
    observer.observe(mapFigure);
  } else view.addEventListener('resize', responsiveLayout);
  view.addEventListener('popstate', () => readAddress());
  view.addEventListener('hashchange', () => readAddress());
  readAddress();
  responsiveLayout();
}

export const atlasSpreadRuntime = '(' + mountAtlasSpread.toString() + ')(document);';
