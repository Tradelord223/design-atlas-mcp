/** Mount one supplementary, text-only note without replacing the trigger's action. */
export function mountFieldNotes(config) {
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
}

export function fieldNoteStyles(id, colors) {
  return `.${id}{position:fixed;z-index:2147480000;box-sizing:border-box;width:320px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);overflow:auto;padding:15px 17px;border:1px solid ${colors.border};border-inline-start:3px solid ${colors.accent};border-radius:5px;background:${colors.background};color:${colors.text};font:400 14px/1.5 system-ui,sans-serif;box-shadow:0 7px 22px #0002;animation:${id}-enter 100ms ease-out;pointer-events:auto;overflow-wrap:anywhere;isolation:isolate}
.${id}[hidden]{display:none!important}.${id} strong{display:block;margin:0 0 5px;font-size:13px;line-height:1.35;font-weight:650;color:inherit}.${id} p{margin:0;font:inherit;color:inherit}
@keyframes ${id}-enter{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.${id}{animation:none}}
@media(forced-colors:active){.${id}{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}}`;
}

export function fieldNoteScript(config) {
  // Escaping the HTML delimiter also makes this safe inside a normal script element.
  const json = JSON.stringify(config).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `(()=>{const config=${json};const key=Symbol.for('design-atlas.field-notes');const registry=window[key]||(window[key]=new Map());const previous=registry.get(config.id);if(typeof previous?.destroy==='function')previous.destroy();const instance=(${mountFieldNotes.toString()})(config);registry.set(config.id,instance);})();`;
}
