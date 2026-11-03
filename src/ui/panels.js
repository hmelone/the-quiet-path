// Menu, settings, album and title screen.
import { h, icon, trapFocus } from './dom.js';
import { settings } from '../core/settings.js';
import { photos } from '../camera/photos.js';
import { TIME_LABELS } from '../core/state.js';

function panel(root, title, body, { wide = false, onClose } = {}) {
  let release;
  const close = () => { release?.(); wrap.remove(); onClose?.(); };
  const wrap = h('div', { class: 'panel-wrap', onclick: (e) => { if (e.target === wrap) close(); } });
  const box = h('div', { class: `panel${wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'panel-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('close'))),
    body,
  );
  wrap.append(box);
  root.append(wrap);
  release = trapFocus(box, close);
  return { close, box, wrap };
}

// --- settings -----------------------------------------------------------------

function seg(key, options, label, hint) {
  const btns = options.map(([v, text]) => {
    const b = h('button', { 'aria-pressed': String(settings.get(key) === v), onclick: () => {
      settings.set(key, v);
      btns.forEach((x, i) => x.setAttribute('aria-pressed', String(options[i][0] === v)));
    } }, text);
    return b;
  });
  return h('div', { class: 'row' }, h('label', {}, label, hint ? h('span', { class: 'hint' }, hint) : null), h('div', { class: 'seg', role: 'group', 'aria-label': label }, btns));
}
function toggle(key, label, hint) {
  const b = h('button', { class: 'toggle', 'aria-pressed': String(!!settings.get(key)), onclick: () => {
    settings.set(key, !settings.get(key));
    b.setAttribute('aria-pressed', String(!!settings.get(key)));
    b.textContent = settings.get(key) ? 'On' : 'Off';
  } }, settings.get(key) ? 'On' : 'Off');
  return h('div', { class: 'row' }, h('label', {}, label, hint ? h('span', { class: 'hint' }, hint) : null), b);
}
function slider(key, label, min = 0, max = 1, step = 0.05) {
  const id = `s-${key}`;
  return h('div', { class: 'row' }, h('label', { for: id }, label),
    h('input', { id, type: 'range', min, max, step, value: settings.get(key), oninput: (e) => settings.set(key, +e.target.value) }));
}

export function openSettings(root, onAudioNeeded) {
  const muteBtn = h('button', { class: 'toggle', 'aria-pressed': String(!settings.get('muted')), onclick: () => {
    onAudioNeeded?.();
    settings.set('muted', !settings.get('muted'));
    muteBtn.setAttribute('aria-pressed', String(!settings.get('muted')));
    muteBtn.textContent = settings.get('muted') ? 'Off' : 'On';
  } }, settings.get('muted') ? 'Off' : 'On');
  const body = h('div', {},
    h('h3', {}, 'Sound'),
    h('div', { class: 'row' }, h('label', {}, 'Sound', h('span', { class: 'hint' }, 'Headphones recommended.')), muteBtn),
    slider('master', 'Overall volume'),
    slider('ambience', 'Environment (wind, water, birds)'),
    slider('effects', 'Footsteps and camera'),
    slider('bell', 'Bells'),
    toggle('captions', 'Sound captions', 'Shows important sounds as text, like a distant bell.'),
    h('h3', {}, 'Comfort & accessibility'),
    seg('reducedMotion', [['system', 'Follow device'], ['on', 'On'], ['off', 'Off']], 'Reduced motion', 'Calmer movement: no drifting view, slower particles, quicker fades.'),
    seg('textSize', [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']], 'Text size'),
    toggle('highContrast', 'High-contrast text panels'),
    toggle('plainFont', 'Plain, very legible font'),
    seg('hints', [['on', 'Gentle'], ['subtle', 'Faint'], ['off', 'Hidden']], 'Markers on things you can approach', 'Hidden markers can still be reached with Tab.'),
    slider('lookSensitivity', 'Look sensitivity', 0.4, 2, 0.1),
    toggle('invertLook', 'Invert drag direction'),
    toggle('momentum', 'Gliding look (momentum)'),
    toggle('breathGuide', 'Breathing guide while sitting'),
    toggle('instantReview', 'See photos right away', 'Otherwise, film is developed each evening in your room.'),
    h('h3', {}, 'Visual quality'),
    seg('quality', [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], 'Detail', 'Lower settings run more smoothly on older phones. Changes apply fully when you next move.'),
  );
  return panel(root, 'Settings', body);
}

// --- menu ---------------------------------------------------------------------

export function openMenu(root, { onSettings, onAlbum, onAbout, onNewStay, onTitle }) {
  let p;
  const item = (label, fn) => h('button', { onclick: () => { p.close(); fn(); } }, label);
  const body = h('div', { class: 'menu-list' },
    h('button', { class: 'primary', onclick: () => p.close() }, 'Return'),
    item('Album', onAlbum),
    item('Settings', onSettings),
    item('About this place', onAbout),
    item('Title screen', onTitle),
    item('Begin a new stay…', onNewStay),
  );
  p = panel(root, 'Pause', body);
  return p;
}

export function confirmBox(root, title, text, yes, no = 'Cancel') {
  return new Promise((resolve) => {
    let p;
    const body = h('div', {}, h('p', {}, text), h('div', { class: 'btn-row' },
      h('button', { onclick: () => { p.close(); resolve(false); } }, no),
      h('button', { class: 'primary', onclick: () => { p.close(); resolve(true); } }, yes)));
    p = panel(root, title, body, { onClose: () => resolve(false) });
  });
}

export function openAbout(root) {
  const body = h('div', {},
    h('p', {}, 'The Quiet Path is a small, unhurried game about attention. There is nothing to win and nowhere you need to be. Wander, help if you like, take photographs, or simply sit.'),
    h('h3', {}, 'How to play'),
    h('p', {}, 'Drag (or use ← →) to look around. Tap glowing marks to approach things; diamond marks are paths. The camera button (C) raises your camera: drag to frame, pinch or scroll to zoom, tap to focus, press the shutter (Space).'),
    h('p', {}, 'Time moves only when you choose: sit until the next bell, rest, or ring the small bell in your room. Each evening you can develop your film in the darkroom corner of your room.'),
    h('h3', {}, 'About the setting'),
    h('p', {}, 'The monastery is fictional, drawing on Japanese Zen temples. Practices are shown as simply and respectfully as we can; notes on sources are in the project’s research file.'),
    h('h3', {}, 'Credits'),
    h('p', {}, 'All art is painted procedurally in code, and all sound is synthesised in your browser. Fonts: Cormorant Garamond, Source Sans 3 and Atkinson Hyperlegible (SIL Open Font License).'),
  );
  return panel(root, 'About', body);
}

// --- album --------------------------------------------------------------------

const urls = new Set();
function objUrl(blob) { const u = URL.createObjectURL(blob); urls.add(u); return u; }
function freeUrls() { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); }

export async function openAlbum(root, { highlight } = {}) {
  const list = await photos.list();
  const developed = list.filter((p) => p.developed);
  const waiting = list.length - developed.length;
  const body = h('div', {});
  let p;
  const render = async () => {
    body.innerHTML = '';
    if (!photos.persistent) body.append(h('p', { class: 'note' }, 'Photos can’t be saved in this browser window (private mode or storage blocked), so they’ll be gone when you close it.'));
    if (waiting) body.append(h('p', { class: 'empty' }, `${waiting} undeveloped ${waiting === 1 ? 'frame' : 'frames'} waiting on your film. Develop them in the darkroom corner of your room${settings.get('instantReview') ? '' : ', in the evening'}.`));
    if (!developed.length) {
      body.append(h('p', { class: 'empty' }, 'No photographs yet. Raise your camera with the button in the corner, or press C.'));
      return;
    }
    const byDay = new Map();
    for (const ph of developed) {
      if (!byDay.has(ph.day)) byDay.set(ph.day, []);
      byDay.get(ph.day).push(ph);
    }
    for (const [day, items] of [...byDay.entries()].sort((a, b) => b[0] - a[0])) {
      const strip = h('div', { class: 'strip' });
      const sheet = h('section', { class: 'sheet', 'aria-label': `Contact sheet, day ${day}` },
        h('div', { class: 'sheet-head' }, h('span', {}, `Day ${day}`), h('span', {}, 'MOUNTAIN 400'),
          h('button', { onclick: () => downloadSheet(day, items) }, 'Save contact sheet')),
        strip);
      body.append(sheet);
      for (const ph of items) {
        const blob = await photos.thumb(ph.id);
        const img = h('img', { src: blob ? objUrl(blob) : '', alt: describePhoto(ph) });
        const b = h('button', { class: 'frame-btn', 'aria-label': `Open photo: ${describePhoto(ph)}`, onclick: () => openViewer(ph) },
          img, h('span', { class: 'num' }, `${String(ph.frame).padStart(2, '0')}  ▸`));
        strip.append(b);
        if (highlight && highlight.includes(ph.id)) b.style.outline = '2px solid var(--accent)';
      }
    }
  };
  const openViewer = async (ph) => {
    const blob = await photos.image(ph.id);
    const url = blob ? objUrl(blob) : '';
    let vp;
    const note = h('textarea', { 'aria-label': 'Your note about this photo', placeholder: 'A note, if you like…' });
    note.value = ph.note || '';
    note.addEventListener('change', () => photos.update(ph.id, { note: note.value }));
    const body2 = h('div', { class: 'viewer' },
      h('img', { src: url, alt: describePhoto(ph) }),
      h('div', { class: 'meta' }, metaLine(ph)),
      ph.subjects?.length ? h('div', { class: 'meta' }, 'In the frame: ', ph.subjects.join(', ')) : null,
      note,
      h('div', { class: 'btn-row' },
        h('button', { onclick: () => download(blob, `quiet-path-day${ph.day}-${ph.frame}.jpg`) }, 'Download'),
        h('button', { onclick: async () => {
          if (!confirm('Let this photograph go? It will be deleted.')) return;
          await photos.remove(ph.id);
          vp.close();
          render();
        } }, 'Delete'),
      ));
    vp = panel(root, `Day ${ph.day}, frame ${ph.frame}`, body2, { wide: true });
  };
  p = panel(root, 'Album', body, { wide: true, onClose: freeUrls });
  await render();
  return p;
}

export function metaLine(ph) {
  return `${placeName(ph.place)} · ${TIME_LABELS[ph.time] || ''} · ${ph.weather}${ph.prompt ? ` · keeping in mind: “${ph.prompt}”` : ''}`;
}
function placeName(id) {
  return { gate: 'The gate', garden: 'Moss garden', pond: 'The pond', zendo: 'Meditation hall', quarters: 'Your room', bowlCloseup: 'Moss garden', lanternCloseup: 'Moss garden' }[id] || id;
}
export function describePhoto(ph) {
  const subj = ph.subjects?.length ? ph.subjects.slice(0, 2).join(' and ') : 'a quiet corner';
  return `${subj}, ${placeName(ph.place).toLowerCase()}, ${(TIME_LABELS[ph.time] || '').toLowerCase()}`;
}
function download(blob, name) {
  if (!blob) return;
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function downloadSheet(day, items) {
  const cols = 4, tw = 360, th = 240, pad = 24, gap = 18;
  const rows = Math.ceil(items.length / cols);
  const c = document.createElement('canvas');
  c.width = pad * 2 + cols * tw + (cols - 1) * gap;
  c.height = pad * 2 + rows * (th + 30) + 40;
  const g = c.getContext('2d');
  g.fillStyle = '#121412';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#d9a24a';
  g.font = '16px monospace';
  g.fillText(`THE QUIET PATH — DAY ${day} — MOUNTAIN 400`, pad, pad + 8);
  for (let i = 0; i < items.length; i++) {
    const blob = await photos.thumb(items[i].id);
    if (!blob) continue;
    const bmp = await createImageBitmap(blob);
    const x = pad + (i % cols) * (tw + gap), y = pad + 30 + Math.floor(i / cols) * (th + 30);
    const s = Math.min(tw / bmp.width, th / bmp.height);
    g.drawImage(bmp, x + (tw - bmp.width * s) / 2, y + (th - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
    g.fillText(String(items[i].frame).padStart(2, '0'), x, y + th + 20);
  }
  c.toBlob((b) => download(b, `quiet-path-day${day}-contact-sheet.jpg`), 'image/jpeg', 0.9);
}

// --- title ----------------------------------------------------------------------

export function titleScreen(root, { hasSave, onBegin, onContinue }) {
  const el = h('div', { class: 'title-screen', role: 'dialog', 'aria-label': 'The Quiet Path' });
  let sound = !settings.get('muted');
  const sOn = h('button', { 'aria-pressed': String(sound), onclick: () => setSound(true) }, 'Sound on');
  const sOff = h('button', { 'aria-pressed': String(!sound), onclick: () => setSound(false) }, 'Sound off');
  const setSound = (v) => {
    sound = v;
    sOn.setAttribute('aria-pressed', String(v));
    sOff.setAttribute('aria-pressed', String(!v));
    sOn.classList.toggle('primary', v);
    sOff.classList.toggle('primary', !v);
  };
  setSound(sound);
  const go = (fn) => { settings.set('muted', !sound); el.remove(); fn(); };
  el.append(
    h('h1', {}, 'The Quiet Path'),
    h('p', { class: 'sub' }, 'a small mountain monastery'),
    h('div', { class: 'actions' },
      hasSave ? h('button', { class: 'primary', onclick: () => go(onContinue) }, 'Continue your stay') : null,
      h('button', { class: hasSave ? '' : 'primary', onclick: () => go(onBegin) }, hasSave ? 'Begin a new stay' : 'Begin'),
      h('div', { class: 'sound-choice', role: 'group', 'aria-label': 'Sound' }, sOn, sOff),
    ),
    h('p', { class: 'small' }, 'Drag to look around. Tap what catches your eye. Nothing here is timed; take as long as you like. Headphones are lovely, but optional.'),
  );
  root.append(el);
  setTimeout(() => el.querySelector('button')?.focus(), 50);
  return el;
}
