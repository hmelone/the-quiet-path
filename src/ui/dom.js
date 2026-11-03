// Tiny DOM helpers.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ICONS = {
  camera: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  album: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9h18M3 15h18M7 5v4M11 5v4M15 5v4M7 15v4M11 15v4M15 15v4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  focus: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 010 6"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  walk: '<path d="M8 21l1.5-6"/><path d="M8.5 4.5c1.4 0 2.2 1.6 1.8 3.4-.3 1.6-1.3 2.6-2.4 2.4S6.4 8.8 6.8 7.2c.3-1.5.6-2.7 1.7-2.7z"/><path d="M15.5 10.5c1.4 0 2.2 1.6 1.8 3.4-.3 1.6-1.3 2.6-2.4 2.4s-1.5-1.5-1.1-3.1c.3-1.5.6-2.7 1.7-2.7z"/><path d="M15 21l.7-3"/>',
  lotus: '<path d="M12 18c-3-2-4.5-5-4-9 2.2 1.3 3.5 3.5 4 6 .5-2.5 1.8-4.7 4-6 .5 4-1 7-4 9z"/><path d="M12 18c-4 0-7-1.8-9-4.5 2.5-.5 5 .3 6.5 2M12 18c4 0 7-1.8 9-4.5-2.5-.5-5 .3-6.5 2"/><path d="M5 21h14"/>',
  talk: '<path d="M4 5h16v10H9l-4 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/><path d="M12 3v2"/>',
};
export function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}

/** Trap Tab focus inside a container while it is open. Returns a release fn. */
export function trapFocus(container, onEscape) {
  const prev = document.activeElement;
  const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const key = (e) => {
    if (e.key === 'Escape' && onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(); return; }
    if (e.key !== 'Tab') return;
    const items = [...container.querySelectorAll(sel)].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', key);
  setTimeout(() => container.querySelector(sel)?.focus(), 30);
  return () => {
    container.removeEventListener('keydown', key);
    prev?.focus?.();
  };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
