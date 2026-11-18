(()=>{const config={"id":"atlas-field-note-03b35581d901","notes":[{"selector":".sensor.moisture","title":"MOISTURE / 34.2%","body":"Its meaning depends on soil texture, sensor depth, crop stage, and the weather ahead.","expectedCount":1},{"selector":".sensor.ndvi","title":"NDVI / 0.71","body":"NDVI compares reflected near-infrared and red light to describe vegetation greenness.","expectedCount":1},{"selector":".sensor.canopy","title":"CANOPY / 27.8°C","body":"Air temperature, humidity, sunlight, and water availability all matter when interpreting it.","expectedCount":1}],"delay":160};const key=Symbol.for('design-atlas.field-notes');const registry=window[key]||(window[key]=new Map());const previous=registry.get(config.id);if(typeof previous?.destroy==='function')previous.destroy();const instance=(function mountFieldNotes(config) {
  if (document.getElementById(config.id)) return { bound: 0, reason: 'already-mounted' };
  const bindings = [];
  for (const note of config.notes) {
    const anchors = [...document.querySelectorAll(note.selector)];
    if (anchors.length !== note.expectedCount) continue;
    for (const anchor of anchors) bindings.push({ anchor, note, hovered: false, focused: false, dismissed: false });
  }
  if (!bindings.length) return { bound: 0, reason: 'no-matching-targets' };

  const panel = document.createElement('aside');
  panel.id = config.id;
  panel.className = config.id;
  panel.setAttribute('role', 'tooltip');
  panel.hidden = true;
  const title = document.createElement('strong');
  const body = document.createElement('p');
  panel.append(title, body);
  document.body.append(panel);

  let active = null;
  let enabled = true;
  let overPanel = false;
  let touchInput = false;
  let opening;
  let closing;
  let frame;
  const listeners = [];
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    listeners.push(() => target.removeEventListener(name, handler, options));
  }
  function removeDescription(binding) {
    const current = binding.anchor.getAttribute('aria-describedby');
    if (current === binding.addedDescription) {
      if (binding.originalDescription === null) binding.anchor.removeAttribute('aria-describedby');
      else binding.anchor.setAttribute('aria-describedby', binding.originalDescription);
    } else if (current) {
      const remaining = current.split(/\s+/).filter(id => id && id !== config.id).join(' ');
      if (remaining) binding.anchor.setAttribute('aria-describedby', remaining);
      else binding.anchor.removeAttribute('aria-describedby');
    }
  }
  function hide(dismiss = false) {
    clearTimeout(opening);
    clearTimeout(closing);
    if (active) {
      if (dismiss) active.dismissed = true;
      removeDescription(active);
    }
    active = null;
    overPanel = false;
    panel.hidden = true;
  }
  function position() {
    if (!active || panel.hidden) return;
    const box = active.anchor.getBoundingClientRect();
    if (!active.anchor.isConnected || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) {
      hide();
      return;
    }
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = Math.max(8, Math.min(box.left + box.width / 2 - width / 2, innerWidth - width - 8));
    const above = box.top - height - 6;
    const top = above >= 8 ? above : Math.min(box.bottom + 6, innerHeight - height - 8);
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.max(8, Math.round(top)) + 'px';
  }
  function show(binding) {
    clearTimeout(opening);
    clearTimeout(closing);
    if (!enabled || binding.dismissed || (!binding.focused && !binding.hovered)) return;
    if (active && active !== binding) hide();
    if (active !== binding) {
      binding.originalDescription = binding.anchor.getAttribute('aria-describedby');
      binding.addedDescription = [binding.originalDescription, config.id].filter(Boolean).join(' ');
      title.textContent = binding.note.title;
      body.textContent = binding.note.body;
      binding.anchor.setAttribute('aria-describedby', binding.addedDescription);
      active = binding;
    }
    panel.hidden = false;
    position();
  }
  function scheduleHide(binding) {
    clearTimeout(closing);
    closing = setTimeout(() => {
      if (active === binding && !binding.focused && !binding.hovered && !overPanel) hide();
    }, 160);
  }
  function updatePosition() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = undefined; position(); });
  }

  for (const binding of bindings) {
    const { anchor } = binding;
    listen(anchor, 'pointerenter', event => {
      if (event.pointerType === 'touch') return;
      binding.hovered = true;
      binding.dismissed = false;
      clearTimeout(closing);
      opening = setTimeout(() => show(binding), config.delay);
    });
    listen(anchor, 'pointerleave', () => {
      binding.hovered = false;
      clearTimeout(opening);
      if (!binding.focused) binding.dismissed = false;
      scheduleHide(binding);
    });
    listen(anchor, 'focus', () => {
      binding.focused = true;
      binding.dismissed = false;
      if (!touchInput) show(binding);
    });
    listen(anchor, 'blur', () => {
      binding.focused = false;
      if (!binding.hovered) binding.dismissed = false;
      scheduleHide(binding);
    });
    // Dismiss our note while allowing the existing action to proceed unchanged.
    listen(anchor, 'click', () => hide(true));
  }
  listen(panel, 'pointerenter', () => { overPanel = true; clearTimeout(closing); });
  listen(panel, 'pointerleave', () => { overPanel = false; if (active) scheduleHide(active); });
  listen(document, 'pointerdown', event => {
    touchInput = event.pointerType === 'touch';
    if (touchInput) hide(true);
  }, true);
  listen(document, 'keydown', event => {
    touchInput = false;
    if (event.key === 'Escape') hide(true);
  }, true);
  listen(window, 'blur', () => hide(true));
  listen(window, 'resize', updatePosition, { passive: true });
  listen(document, 'scroll', updatePosition, { passive: true, capture: true });
  return {
    bound: bindings.length,
    get enabled() { return enabled; },
    dismiss() { hide(true); },
    setEnabled(value) { enabled = value === true; if (!enabled) hide(); },
    destroy() {
      hide();
      cancelAnimationFrame(frame);
      for (const remove of listeners) remove();
      panel.remove();
    }
  };
})(config);registry.set(config.id,instance);})();