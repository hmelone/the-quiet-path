# The Quiet Path

A calm, painterly browser game set in a small mountain Zen monastery. Wander through a moss garden, past a pond, and into the meditation hall. Notice small things, take photographs with a film camera, help when something needs helping, or simply sit.

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
| Look around | Drag / swipe | Drag, mouse wheel, or ← → / A D |
| Approach something | Tap a glowing mark (◇ marks are paths) | Click, Tab to it, or E / Enter for the nearest |
| Camera | Camera button; drag to frame, pinch to zoom, tap to focus, shutter | C; drag, scroll to zoom, click to focus, F cycles focus, Space for the shutter |
| Sit | Tap a sitting spot | S near a sitting spot |
| Album / menu | Corner buttons | P / Esc |

## Deploying to GitHub Pages

1. In the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to `https://<user>.github.io/the-quiet-path/`.

If the repository has a different name, change `base` in `vite.config.js` to match.

## How it's built

- **Vite + plain JavaScript**, with no framework.
- **A custom WebGL2 compositor** (`src/render/`). Each place is a wide panorama of painted depth layers. One shader pass per layer handles parallax, colour grading for time and weather, swaying foliage, focus blur, water and mist.
- **Procedural painting** (`src/paint/`). Every tree, stone, roof and moss cushion is painted with code-driven brush dabs at load time, so there are no image files to download.
- **Procedural sound** (`src/audio/`). Wind, water, rain, birds, insects, bells and footsteps are all synthesised with Web Audio.
- **Saving.** Progress and settings go in `localStorage`; photographs go in IndexedDB.

## Project docs

- [`docs/PLAN.md`](docs/PLAN.md): the agreed plan for all five iterations
- [`docs/DEVLOG.md`](docs/DEVLOG.md): what changed in each iteration, and why
- [`docs/PLAYTEST.md`](docs/PLAYTEST.md): questions to answer after each playtest
- [`docs/RESEARCH.md`](docs/RESEARCH.md): cultural and religious details to check
- [`CREDITS.md`](CREDITS.md)
