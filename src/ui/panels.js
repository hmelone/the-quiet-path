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
    toggle('musicOn', 'Music', 'Gentle generated music that follows the time of day.'),
    slider('music', 'Music volume'),
    h('h3', {}, 'The bell of mindfulness'),
    seg('bellFrequency', [['off', 'Off'], ['occasional', 'Now and then'], ['frequent', 'Often']], 'How often the bell sounds', 'When it sounds, the valley pauses for three breaths.'),
    toggle('pauseForBell', 'Pause for three breaths', 'Turn off to keep walking while the bell sounds.'),
    toggle('captions', 'Sound captions', 'Shows important sounds as text, like a distant bell.'),
    h('h3', {}, 'Thoughts'),
    seg('thoughts', [['off', 'Off'], ['rare', 'Rarely'], ['occasional', 'Now and then']], 'Passing thoughts', 'Brief thoughts sometimes arise as you wander. Let them pass, or linger. They never appear in the camera or in photos.'),
    h('h3', {}, 'Comfort & accessibility'),
    seg('reducedMotion', [['system', 'Follow device'], ['on', 'On'], ['off', 'Off']], 'Reduced motion', 'Calmer movement: no drifting view, slower particles, quicker fades.'),
    seg('textSize', [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']], 'Text size'),
    toggle('highContrast', 'High-contrast text panels'),
    toggle('plainFont', 'Plain, very legible font'),
    seg('hints', [['on', 'Gentle'], ['subtle', 'Faint'], ['off', 'Hidden']], 'Markers on things you can approach', 'Hidden markers can still be reached with Tab.'),
    slider('lookSensitivity', 'Look sensitivity', 0.4, 2, 0.1),
    slider('fov', 'Field of view (wider can feel more comfortable)', 50, 80, 1),
    toggle('autoTurn', 'Turn to face where you walk', 'When off, the view only turns when you drag.'),
    toggle('invertLook', 'Invert drag direction'),
    toggle('momentum', 'Gliding look (momentum)'),
    toggle('breathGuide', 'Breathing circle while sitting'),
    toggle('instantReview', 'See photos right away', 'Otherwise, develop your film in the darkroom corner of your hut, whenever you like.'),
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
      // answer first, then close (closing on its own means "cancel")
      h('button', { onclick: () => { resolve(false); p.close(); } }, no),
      h('button', { class: 'primary', onclick: () => { resolve(true); p.close(); } }, yes)));
    p = panel(root, title, body, { onClose: () => resolve(false) });
  });
}

export function openAbout(root) {
  const row = (kind, iconName, text) => [h('span', { class: `poi k-${kind}` }, h('span', { class: 'mark' }, icon(iconName))), h('span', {}, text)];
  const body = h('div', {},
    h('p', {}, 'The Quiet Path is a small, unhurried game about attention, set in a fictional practice centre in the spirit of the Plum Village tradition. There is nothing to win and nowhere you need to be. Wander, help if you like, take photographs, or simply sit.'),
    h('h3', {}, 'Symbols'),
    h('div', { class: 'legend' },
      ...row('look', 'eye', 'Look at something more closely'),
      ...row('go', 'walk', 'Go somewhere — signposts and doorways walk you there'),
      ...row('sit', 'lotus', 'Sit for a while'),
      ...row('talk', 'talk', 'Talk with someone'),
      ...row('bell', 'bell', 'A bell you can invite'),
    ),
    h('h3', {}, 'How to move'),
    h('p', {}, 'Tap or click the ground to stroll there; while walking, tap Stop (or press Esc) to stop. Tapping a symbol to look at something opens it right where you are — no walking needed. Drag to look around. On a keyboard: W A S D or arrow keys to walk, E to use the nearest thing, C for the camera, P for the album, Esc for the menu. Everything nearby is also listed in the “Nearby” buttons at the bottom left.'),
    h('h3', {}, 'The bell'),
    h('p', {}, 'Now and then a bell sounds from the tower. Everyone in the valley stops where they are and enjoys three breaths — you’re invited to as well. You can change how often this happens in Settings.'),
    h('h3', {}, 'About the setting'),
    h('p', {}, 'The centre, its people and its words are fictional and written for this game. The practices — stopping for the bell, walking meditation, tea, silence — are drawn from the Plum Village tradition as respectfully as we can; notes and sources are in the project’s research file.'),
    h('h3', {}, 'Credits'),
    h('p', {}, 'Made with Three.js. All art is built and painted in code, and all sound and music is generated in your browser. Fonts: Cormorant Garamond, Source Sans 3 and Atkinson Hyperlegible (SIL Open Font License).'),
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
    if (waiting) body.append(h('p', { class: 'empty' }, `${waiting} undeveloped ${waiting === 1 ? 'frame' : 'frames'} waiting on your film. Develop them in the darkroom corner of your hut, whenever you like.`));
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
  return { gate: 'The mountain gate', forest: 'The forest path', tower: 'The bell tower', hallYard: 'By the meditation hall', hall: 'The meditation hall', pond: 'The lotus pond', tea: 'The tea house', orchard: 'The plum orchard', hut: 'Your hut', hutYard: 'By your hut', valley: 'The valley', garden: 'Moss garden', zendo: 'Meditation hall', quarters: 'Your room' }[id] || id;
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

export function titleScreen(root, { hasSave, onBegin, onContinue, onSound }) {
  const el = h('div', { class: 'title-screen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'The Quiet Path' });
  let sound = !settings.get('muted');
  const sOn = h('button', { 'aria-pressed': String(sound), onclick: () => setSound(true) }, '🔈 Sound on');
  const sOff = h('button', { 'aria-pressed': String(!sound), onclick: () => setSound(false) }, 'Silent');
  const setSound = (v, apply = true) => {
    sound = v;
    // takes effect right away, so the title music starts or stops with the choice
    if (apply) { settings.set('muted', !v); onSound?.(v); }
    sOn.setAttribute('aria-pressed', String(v));
    sOff.setAttribute('aria-pressed', String(!v));
    sOn.classList.toggle('primary', v);
    sOff.classList.toggle('primary', !v);
  };
  setSound(sound, false);
  let release;
  const go = (fn) => { settings.set('muted', !sound); release?.(); el.remove(); fn(); };
  const art = `${import.meta.env.BASE_URL}art/`;
  el.append(
    h('picture', { class: 'title-art', 'aria-hidden': 'true' },
      h('source', { media: '(max-aspect-ratio: 4/5)', srcset: `${art}retreat-portrait.webp` }),
      h('img', { src: `${art}retreat-wide.webp`, alt: '', fetchpriority: 'high', decoding: 'async' }),
    ),
    h('div', { class: 'title-content' },
      h('div', { class: 'title-heading' },
        h('p', { class: 'title-eyebrow' }, 'A place to pause'),
        h('h1', {}, 'The Quiet Path'),
        h('p', { class: 'sub' }, 'a small retreat in a mountain valley'),
      ),
      h('div', { class: 'title-controls' },
        h('div', { class: 'actions' },
          hasSave ? h('button', { class: 'primary', onclick: () => go(onContinue) }, 'Continue your stay') : null,
          h('button', { class: hasSave ? '' : 'primary', onclick: () => go(onBegin) }, hasSave ? 'Begin a new stay' : 'Begin'),
        ),
        h('div', { class: 'sound-choice', role: 'group', 'aria-label': 'Sound' }, sOn, sOff),
        h('p', { class: 'small title-sound-hint', hidden: true, 'aria-live': 'polite' }, 'Tap anywhere for sound'),
        h('p', { class: 'small' }, 'Walk slowly. Notice small things. Stay as long as you like.'),
      ),
    ),
  );
  root.append(el);
  release = trapFocus(el);
  return el;
}
