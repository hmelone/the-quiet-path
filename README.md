# The Quiet Path

A calm browser game set in a small mountain valley practice centre, in the spirit of the Plum Village tradition. Walk down from the mountain gate past a bell tower and a meditation hall, across a lotus pond, to an old farmhouse tea house and your hut. Notice small things, take photographs with a film camera, help when something needs helping, stop for the bell, or simply sit.

There are no scores, timers, streaks or "enlightenment points". Time moves only when you choose.

## Play locally

```bash
npm install
```

```bash
npm run dev
```

Then open the address Vite prints (it ends in `/the-quiet-path/`).

## Controls

| | Touch | Keyboard & mouse |
|---|---|---|
| Walk | Tap the ground where you'd like to go; tap **Stop** to stop | Click the ground (Esc stops), or W A S D / ↑ ↓ |
| Look around | Drag | Mouse drag, or ← → |
| Approach something | Tap its symbol, or use the **Nearby** buttons | Click it, Tab to Nearby, or E for the nearest |
| Camera | Camera button; drag to frame, pinch to zoom, tap to focus, shutter | C; scroll to zoom, click to focus, F cycles focus, Space for the shutter |
| Album / menu | Corner buttons | P / Esc |
| Dharma library (in the hall) | Tap 🪷 *Dharma library*, choose a talk, Play | Tab between talks and controls; Space or K plays/pauses; arrow keys seek or set volume on the sliders; Esc stands up |

**Symbols:** 👁 look · 🚶 go (signposts and doors) · 🪷 sit · 💬 talk · 🔔 bell

## Deploying to GitHub Pages

1. In the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to `https://<user>.github.io/the-quiet-path/`.

If the repository has a different name, change `base` in `vite.config.js` to match.

## How it's built

- **Vite + plain JavaScript**, with no framework.
- **Three.js 3D world** (`src/world3d/`). The valley, trees, buildings, water, people and animals are all built in code, with soft painterly shading, a painted sky, mist and time-of-day grading. The world needs no downloaded models or textures; two small, locally served WebP title illustrations provide the opening art.
- **Walking** uses a walkability grid with A* routing, so tap-to-walk finds its way around trees, walls and water.
- **Procedural sound and music** (`src/audio/`). Wind, water, rain, birds, insects, bells, footsteps and calm ambient music are all generated with Web Audio.
- **Saving.** Progress and settings go in `localStorage`; photographs go in IndexedDB.

## Project docs

- [`docs/PLAN.md`](docs/PLAN.md): the original plan for all five iterations · [`docs/PLAN-v2.md`](docs/PLAN-v2.md): the v2 plan
- [`docs/DEVLOG.md`](docs/DEVLOG.md): what changed in each iteration, and why
- [`docs/PLAYTEST.md`](docs/PLAYTEST.md): questions to answer after each playtest
- [`docs/RESEARCH.md`](docs/RESEARCH.md): cultural and religious details to check
- [`CREDITS.md`](CREDITS.md)

## Iteration log

### Plum Light — original art pass · November 3, 2026

The opening now has original wide and portrait paintings beneath a flowering plum, with readable Begin/Continue controls and a still reduced-motion presentation. Outside the hut, branching blossom trees, finer grasses, low ground cover, fallen petals and worn stepping stones lead toward a hall that remains visible through softer blue-green mist. People have clearer human silhouettes; the hall, tea tables and hut darkroom have more everyday detail. Koi glide beneath calmer translucent water and appear in the viewfinder and saved photographs.

**See and playtest:** [before/after, title screenshots, actual fish photograph and test evidence](docs/art-pass/README.md). Continue a saved stay or walk down to the hut, follow its path to the pond, and look down from the bank with the camera. Visit the hall entrance, tea terrace and darkroom corner for the smaller details.

**Validation:** production build at `/the-quiet-path/`; Chromium desktop and emulated phone checks for Begin/Continue and v2 saves, exploration, touch controls, interactions, reduced motion and persisted fish photography. The [repeatable smoke script](scripts/art-pass-smoke.py) records exact results in [checks.json](docs/art-pass/checks.json). Physical phone performance still needs playtesting. Original art provenance is in [CREDITS.md](CREDITS.md); remaining refinements are in the [development log](docs/DEVLOG.md).

### More natural people and wildlife · November 3, 2026

Facial spheres are replaced by integrated head profiles with subtle surface detail. People have more natural proportions, draped clothing, separate tea/meditation poses and restrained walking steps. Wildlife has shaped muzzles, ears, haunches and jointed legs, with flush eyes and more natural fish fins. [See close-ups, before/after comparisons and in-game views](docs/characters/README.md).
