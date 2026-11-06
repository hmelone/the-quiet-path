// The Dharma Library: a quiet listening card shown while you sit in the hall's
// library corner. Nothing plays until you choose to; leaving pauses the talk,
// and each talk's place is remembered for the rest of this session.
import { h, trapFocus } from './dom.js';
import { TALKS, LIBRARY_WELCOME, talkUrl, teachingSeconds } from '../dharma/talks.js';

// Session memory (not saved between visits to the page): where each talk was left.
const positions = new Map();
let lastId = null;
let volume = 0.9;

const clock = (s, round = false) => {
  s = Math.max(0, (round ? Math.round : Math.floor)(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const spoken = (s) => {
  s = Math.max(0, Math.round(s || 0));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m} minute${m === 1 ? '' : 's'}${r ? ` ${r} second${r === 1 ? '' : 's'}` : ''}`;
};
const longDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Opens the talk options while you sit on a hall cushion.
 * Resolves 'silence' (keep sitting, without a talk) or 'stand'.
 */
export function openLibrary(root) {
  return new Promise((resolve) => {
    const audio = new Audio();
    if (import.meta.env.DEV || window.__game) window.__libAudio = audio; // for automated checks
    audio.preload = 'none'; // nothing is downloaded until a talk is chosen
    audio.volume = volume;
    let talk = null, release = null, closed = false;

    // --- elements ---------------------------------------------------------------------
    const list = h('ul', { class: 'lib-list', role: 'list' });
    const title = h('h3', { class: 'lib-now-title', id: 'lib-now-title' });
    const meta = h('p', { class: 'lib-now-meta' });
    const desc = h('p', { class: 'lib-now-desc' });
    const status = h('p', { class: 'lib-status', role: 'status', 'aria-live': 'polite' });
    const playBtn = h('button', { class: 'primary lib-play', onclick: () => toggle() }, 'Play');
    const againBtn = h('button', { class: 'lib-again', 'aria-label': 'Listen again from the beginning', onclick: () => restart() }, 'Listen again');
    const seek = h('input', { class: 'lib-seek', type: 'range', min: 0, max: 100, step: 1, value: 0, 'aria-label': 'Position in the talk', oninput: () => seekTo(+seek.value) });
    const elapsed = h('span', { class: 'lib-time' }, '0:00');
    const total = h('span', { class: 'lib-time' }, '0:00');
    const vol = h('input', { class: 'lib-vol', id: 'lib-vol', type: 'range', min: 0, max: 1, step: 0.05, value: volume,
      'aria-valuetext': `${Math.round(volume * 100)}%`,
      oninput: () => { volume = audio.volume = +vol.value; vol.setAttribute('aria-valuetext', `${Math.round(volume * 100)}%`); } });
    const credit = h('p', { class: 'lib-credit' });
    const creditSummary = h('summary', {}, 'Source and licence');
    const creditBox = h('details', { class: 'lib-credit-box' }, creditSummary, credit);
    const now = h('section', { class: 'lib-now', 'aria-labelledby': 'lib-now-title', hidden: true },
      title, meta, desc,
      h('div', { class: 'lib-controls' }, playBtn,
        h('div', { class: 'lib-progress' }, elapsed, seek, total)),
      h('div', { class: 'lib-row' }, againBtn,
        h('label', { class: 'lib-vol-wrap', for: 'lib-vol' }, h('span', {}, 'Volume'), vol)),
      status, creditBox);

    const close = (how = 'stand') => {
      if (closed) return;
      closed = true;
      remember();
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // stop any download in progress
      release?.();
      wrap.remove();
      document.body.classList.remove('listening');
      resolve(how);
    };

    const card = h('div', { class: 'lib-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lib-heading' },
      h('div', { class: 'lib-head' },
        h('h2', { id: 'lib-heading' }, 'Dharma talks')),
      h('p', { class: 'lib-welcome' }, LIBRARY_WELCOME),
      h('p', { class: 'lib-about' }, 'Short talks recorded at the Insight Meditation Center in California and shared freely by AudioDharma. Listen to as much or as little as you like.'),
      list, now,
      h('div', { class: 'lib-leave-row' },
        h('button', { class: 'lib-silence', onclick: () => close('silence') }, 'Sit in silence'),
        h('button', { class: 'lib-leave', onclick: () => close('stand') }, 'Stand up')));
    const wrap = h('div', { class: 'lib-wrap' }, card);

    // --- the talks -------------------------------------------------------------------
    const items = TALKS.map((t) => {
      const b = h('button', { class: 'lib-item', 'aria-pressed': 'false', onclick: () => choose(t) },
        h('span', { class: 'lib-item-title' }, t.title.replace(/^Practice Notes?: /, '')),
        h('span', { class: 'lib-item-meta' }, `${t.teacher} · ${clock(teachingSeconds(t), true)}`),
      );
      b.setAttribute('aria-label', `${t.title}, ${t.teacher}, ${spoken(teachingSeconds(t))}`);
      list.append(h('li', {}, b));
      return [t.id, b];
    });

    function remember() {
      if (talk && audio.readyState > 0) positions.set(talk.id, audio.currentTime);
    }

    function choose(t) {
      if (talk?.id === t.id) return;
      remember();
      audio.pause();
      talk = t;
      lastId = t.id;
      for (const [id, b] of items) b.setAttribute('aria-pressed', String(id === t.id));
      title.textContent = t.title;
      meta.textContent = `${t.teacher} · ${longDate(t.date)} · ${clock(teachingSeconds(t), true)}`;
      desc.textContent = t.description;
      credit.replaceChildren(
        '“', t.title, '” by ', t.teacher, ', recorded at the ', t.place, '. ',
        h('a', { href: t.source, target: '_blank', rel: 'noopener' }, 'Original talk on AudioDharma'),
        ' · Licensed under ',
        h('a', { href: t.license.url, target: '_blank', rel: 'noopener' }, t.license.name),
        '. Shared unchanged; the talk begins after AudioDharma’s short announcement. AudioDharma and the Insight Meditation Center are not connected with, and do not endorse, this game.');
      creditSummary.textContent = `Source and licence · ${t.license.name}`;
      now.hidden = false;
      setTotal(teachingSeconds(t));
      setElapsed(0);
      playBtn.textContent = 'Play';
      status.textContent = '';
      // Load only now. Begin where this talk was left, or where the teaching begins.
      audio.preload = 'auto';
      audio.src = talkUrl(t);
      const at = positions.get(t.id);
      audio.addEventListener('loadedmetadata', () => {
        setTotal(teachingSeconds(t, audio.duration));
        audio.currentTime = at != null && at > t.start && at < audio.duration - 1 ? at : t.start;
        tick();
      }, { once: true });
    }

    function toggle() {
      if (!talk) return;
      if (audio.paused) {
        if (audio.ended || audio.currentTime >= audio.duration - 0.25) audio.currentTime = talk.start;
        if (audio.readyState > 0 && audio.currentTime < talk.start) audio.currentTime = talk.start;
        audio.play().catch(() => { status.textContent = 'The recording could not be played. Please check your connection and try again.'; });
      } else audio.pause();
    }

    function restart() {
      if (!talk) return;
      positions.delete(talk.id);
      if (audio.readyState > 0) { audio.currentTime = talk.start; tick(); }
      if (audio.paused) toggle();
    }

    function seekTo(pct) {
      if (!talk || !(audio.readyState > 0)) return;
      const len = teachingSeconds(talk, audio.duration);
      audio.currentTime = talk.start + (pct / 100) * len;
      tick();
    }

    function setTotal(s) { total.textContent = clock(s, true); total.dataset.s = s; }
    function setElapsed(s) {
      const len = +total.dataset.s || 1;
      elapsed.textContent = clock(s);
      seek.value = String(Math.round((s / len) * 100));
      seek.setAttribute('aria-valuetext', `${spoken(s)} of ${spoken(len)}`);
    }
    function tick() { if (talk) setElapsed(Math.max(0, audio.currentTime - talk.start)); }

    audio.addEventListener('timeupdate', () => {
      // never play the announcement before the teaching, even if seeked there
      if (talk && !audio.paused && audio.currentTime < talk.start - 0.05) audio.currentTime = talk.start;
      tick();
    });
    audio.addEventListener('play', () => { playBtn.textContent = 'Pause'; status.textContent = ''; });
    audio.addEventListener('pause', () => { playBtn.textContent = 'Play'; remember(); });
    audio.addEventListener('waiting', () => { status.textContent = 'Loading…'; });
    audio.addEventListener('playing', () => { status.textContent = ''; });
    audio.addEventListener('ended', () => {
      positions.delete(talk.id);
      playBtn.textContent = 'Play';
      status.textContent = 'The talk has ended. You can sit a while, listen again, or choose another teaching.';
    });
    audio.addEventListener('error', () => {
      if (!closed && audio.getAttribute('src')) status.textContent = 'The recording could not be loaded. Please check your connection and try again.';
    });

    card.addEventListener('keydown', (e) => {
      // Space/K toggles play when focus isn't on a control that uses those keys itself
      const tag = e.target.tagName;
      if ((e.key === ' ' || e.key === 'k') && tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'A') { e.preventDefault(); toggle(); }
    });

    document.body.classList.add('listening'); // hush on-screen narration while listening
    root.append(wrap);
    release = trapFocus(card, () => close('stand')); // Esc stands up
    const first = lastId ? items.find(([id]) => id === lastId)?.[1] : items[0][1];
    if (lastId) choose(TALKS.find((t) => t.id === lastId));
    setTimeout(() => first?.focus(), 60);
  });
}
