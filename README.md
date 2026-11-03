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
| Walk | Tap the ground where you'd like to go | Click the ground, or W A S D / ↑ ↓ |
| Look around | Drag | Mouse drag, or ← → |
| Approach something | Tap its symbol, or use the **Nearby** buttons | Click it, Tab to Nearby, or E for the nearest |
| Camera | Camera button; drag to frame, pinch to zoom, tap to focus, shutter | C; scroll to zoom, click to focus, F cycles focus, Space for the shutter |
| Album / menu | Corner buttons | P / Esc |

**Symbols:** 👁 look · 🚶 go (signposts and doors) · 🪷 sit · 💬 talk · 🔔 bell

## Deploying to GitHub Pages

1. In the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to `https://<user>.github.io/the-quiet-path/`.

If the repository has a different name, change `base` in `vite.config.js` to match.

## How it's built

- **Vite + plain JavaScript**, with no framework.
- **Three.js 3D world** (`src/world3d/`). The valley, trees, buildings, water, people and animals are all built in code, with soft painterly shading, a painted sky, mist and time-of-day grading. There are no model or image files to download.
- **Walking** uses a walkability grid with A* routing, so tap-to-walk finds its way around trees, walls and water.
- **Procedural sound and music** (`src/audio/`). Wind, water, rain, birds, insects, bells, footsteps and calm ambient music are all generated with Web Audio.
- **Saving.** Progress and settings go in `localStorage`; photographs go in IndexedDB.

## Project docs

- [`docs/PLAN.md`](docs/PLAN.md): the original plan for all five iterations · [`docs/PLAN-v2.md`](docs/PLAN-v2.md): the v2 plan
- [`docs/DEVLOG.md`](docs/DEVLOG.md): what changed in each iteration, and why
- [`docs/PLAYTEST.md`](docs/PLAYTEST.md): questions to answer after each playtest
- [`docs/RESEARCH.md`](docs/RESEARCH.md): cultural and religious details to check
- [`CREDITS.md`](CREDITS.md)
