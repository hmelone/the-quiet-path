// Photographs live in IndexedDB (localStorage is too small for images).
// Each photo: full JPEG, a small thumbnail, and metadata.
import { get, set, del, createStore } from 'idb-keyval';

const store = (() => {
  try { return createStore('quietpath-photos', 'photos'); } catch { return null; }
})();
const INDEX = 'index';
let cache = null;
let memoryOnly = false;
const mem = new Map();

async function idbGet(k) {
  if (memoryOnly || !store) return mem.get(k);
  try { return await get(k, store); } catch { memoryOnly = true; return mem.get(k); }
}
async function idbSet(k, v) {
  mem.set(k, v);
  if (memoryOnly || !store) return;
  try { await set(k, v, store); } catch { memoryOnly = true; }
}
async function idbDel(k) {
  mem.delete(k);
  if (memoryOnly || !store) return;
  try { await del(k, store); } catch { /* ignore */ }
}

export const photos = {
  get persistent() { return !memoryOnly && !!store; },
  async list() {
    if (!cache) cache = (await idbGet(INDEX)) || [];
    return cache;
  },
  async add(meta, blob, thumb) {
    const list = await this.list();
    await idbSet(`img:${meta.id}`, blob);
    await idbSet(`thumb:${meta.id}`, thumb);
    list.push(meta);
    await idbSet(INDEX, list);
    return meta;
  },
  async update(id, patch) {
    const list = await this.list();
    const m = list.find((p) => p.id === id);
    if (m) Object.assign(m, patch);
    await idbSet(INDEX, list);
  },
  async developAll() {
    const list = await this.list();
    const fresh = list.filter((p) => !p.developed);
    fresh.forEach((p) => { p.developed = true; });
    await idbSet(INDEX, list);
    return fresh;
  },
  async remove(id) {
    const list = await this.list();
    cache = list.filter((p) => p.id !== id);
    await idbDel(`img:${id}`);
    await idbDel(`thumb:${id}`);
    await idbSet(INDEX, cache);
  },
  image(id) { return idbGet(`img:${id}`); },
  thumb(id) { return idbGet(`thumb:${id}`); },
  async clear() {
    const list = await this.list();
    for (const p of list) { await idbDel(`img:${p.id}`); await idbDel(`thumb:${p.id}`); }
    cache = [];
    await idbSet(INDEX, cache);
  },
};
