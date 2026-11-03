// Expose a photograph: render exactly the framed rectangle of the live scene
// offscreen, apply the film look, and return JPEG blobs plus what was in frame.

function toBlob(canvas, q = 0.88) {
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
}

export async function exposeFrame({ renderer, scene, atm, aspect, cx, sub, focus, zoom, env, reduced, photoW, portrait }) {
  const w = portrait ? Math.round((photoW * 2) / 3) : photoW;
  const h = portrait ? photoW : Math.round((photoW * 2) / 3);
  const sceneT = renderer.createTarget(w, h);
  const filmT = renderer.createTarget(w, h);
  scene.render(sceneT, aspect, atm, { cx, sub, focus, zoom, env, reduced });
  renderer.mipmapTarget(sceneT);
  renderer.begin(filmT);
  renderer.draw('film', {
    uSeed: Math.random() * 100, uRes: [w, h], uStock: [1.04, 1.0, 0.93], uGrain: 0.055,
  }, { uScene: sceneT.tex });
  const canvas = renderer.readToCanvas(filmT);
  renderer.deleteTarget(sceneT);
  renderer.deleteTarget(filmT);
  const thumb = document.createElement('canvas');
  const tw = 360;
  thumb.width = portrait ? Math.round((tw * 2) / 3) : tw;
  thumb.height = portrait ? tw : Math.round((tw * 2) / 3);
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  const [full, small] = await Promise.all([toBlob(canvas), toBlob(thumb, 0.8)]);
  return { full, small };
}

/** Which named subjects are meaningfully inside the frame? */
export function subjectsInFrame(scene, place, cond, aspect, cx, sub) {
  const v = scene.view(aspect);
  const found = [];
  for (const s of place.subjects || []) {
    if (s.when && !s.when(cond)) continue;
    let x = s.x, y = s.y;
    if (s.dynamic) {
      const pos = scene.dynamicPosition(s.layer, s.dynamic);
      if (!pos) continue;
      [x, y] = pos;
    }
    const [sx, sy] = scene.project(s.layer, x, y, aspect, cx, sub);
    const rel = s.r / (v.vh * sub.h); // subject size relative to frame height
    if (sx < 0.04 || sx > 0.96 || sy < 0.04 || sy > 0.96) continue;
    if (rel < 0.035) continue;
    const centred = 1 - Math.hypot(sx - 0.5, sy - 0.5);
    found.push({ label: s.label, score: centred + Math.min(rel, 1) });
  }
  return found.sort((a, b) => b.score - a.score).slice(0, 3).map((f) => f.label);
}
