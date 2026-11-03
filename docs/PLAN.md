# The Quiet Path — Game Plan

## Context
A calm, interactive browser game for a class project, built in **five iterations** over several days. You test each version and decide what changes next. The repo (`hmelone/the-quiet-path`, branch `claude/nice-tesla-2n257k`) is empty. The game must deploy to GitHub Pages, work well on phones and desktop, and have no scores, timers, or combat. The pleasure comes from atmosphere, exploration, small human situations, and mindful photography.

### Decisions so far
| Topic | Choice |
|---|---|
| Perspective | **Painted 2.5D look-around panoramas.** Drag or swipe to look around, with parallax depth. Tap a path to walk to a nearby place (soft crossfade). |
| Tradition | **Japanese Zen** mountain temple (Sōtō/Rinzai details to be researched; see below) |
| Art | **Made in code, plus CC0 assets**, all passed through one shared painterly treatment |
| Structure | **Open-ended stay.** Days move forward when the player chooses. Seasons shift slowly. |
| Camera | Frame and zoom, tap to focus (depth of field), film look with a gentle 24-frame roll, close-up detail spots |
| People | **Mostly unseen presence**: footsteps, voices, sandals at a door, handwritten notes. All human. Animals appear only as ordinary wildlife. |
| v1 | 4 places + 1 situation |
| Tooling | **Vite + plain JavaScript**, deployed to Pages by a GitHub Action |

---

## Technology and why (plain-language tradeoffs)

**Rendering: PixiJS v8 (WebGL 2D) on top of DOM UI.**
- *Why not plain Canvas2D?* It's simpler, but effects like mist, swaying foliage, water ripples, focus blur, and film grain would be slow on phones. Pixi runs these on the GPU through small shaders and still feels like 2D work.
- *Why not 3D (Three.js)?* Painted panoramas give about 80% of Eastshade's feeling for perhaps 20% of the effort. They also run much better on phones and don't cause motion sickness. The cost: you can't wander freely between places. You stand at viewpoints and look around.
- **UI (menus, dialog, album, settings) is regular HTML/CSS laid over the canvas.** That gives real buttons, screen-reader support, crisp text at any size, and responsive layouts for free.

**How a "place" is built.** Each place is a wide panorama (about a 2.5:1 ratio) made of 5–8 depth layers: sky, far ridges, mid forest, structures, foreground foliage and stone, plus effect layers (mist, rain, particles). Layers move at different speeds as you look around, which creates the parallax depth.
- **Painting in code:** generators paint layers once into textures at load time. They draw noisy mountain ridges with atmospheric fade, cedar and maple silhouettes built from brush strokes, moss-dabbed stones, and weathered wood planks. All of them use a shared brush-stroke function, so the style stays consistent.
- **CC0 assets** (Poly Haven stone, wood, and moss textures; CC0 sky photos) are used as fills inside painted shapes, then softened with a painterly filter (a Kuwahara-style shader) so they never look photographic.
- **Lighting is a color-grading pass, not repainting.** Each layer is painted in neutral values. A shader then tints the layers by *time of day × weather × season* (e.g. warm low-sun gold, blue rainy dusk, white snow light). This is how one painting yields dozens of looks cheaply. Season changes swap a few elements: blossoms, autumn leaves, snow caps.
- Windows glow warm at dusk and night through a separate emissive layer.

**Performance on phones.**
- Quality setting (Auto / Low / Medium / High): render resolution, number of layers and particles, blur quality, and texture size (2048 px on Low, 4096 px on High).
- Auto picks a starting level by measuring frame rate during the first seconds, and steps down quietly if things stutter.
- Each place loads only when you go there, and the next places are prefetched in the background.
- Trade-off: painting in code adds a short "settling" moment the first time you visit a place. We show it as a gentle fade-in, never a loading bar. Results are cached in memory.

**Storage.**
- Progress, settings, and story flags go in `localStorage` (small JSON).
- **Photos go in IndexedDB** (via the tiny `idb-keyval` library). localStorage is limited to about 5 MB and stores only text, which is roughly 20 photos. IndexedDB comfortably holds hundreds of compressed JPEGs.
- Photos can be exported or downloaded individually, or as a contact-sheet image.
- If storage is unavailable (e.g. a private window), the game still runs and warns you once, gently.

**Deployment.** Vite builds to `dist/` with `base: '/the-quiet-path/'`. `.github/workflows/deploy.yml` builds and publishes to Pages on every push to `main`. (You enable Pages → "GitHub Actions" once in the repo settings.)

---

## Controls (touch + desktop)

| Action | Touch | Desktop |
|---|---|---|
| Look around | Drag / swipe (with momentum) | Mouse drag, or A/D / ← → |
| Go somewhere | Tap a path marker | Click, or W / ↑ toward a marked path |
| Interact | Tap a softly glowing point of interest | Click, or E / Enter |
| Camera | Camera button → pan with drag, pinch to zoom, tap to focus, shutter button | C, then mouse drag and scroll to zoom, click to focus, Space for shutter |
| Sit | Sit button at sitting spots | S |
| Menu / album | Corner buttons (≥ 48 px) | Esc / P |

- Buttons sit within thumb reach on phones. Portrait mode shows a narrower window into the panorama, and landscape is recommended (with a one-time hint, never forced).
- Point-of-interest hints are optional ("Gentle hints: on / subtle / off"), so players can explore without being guided.

---

## Mindful photography
- **Viewfinder mode:** the HUD fades away and a frame with soft corner brackets appears. Pan and zoom (about 1×–3×). Tap to focus near, middle, or far: focused layers stay sharp and the others blur.
- **Capture is exactly what you framed.** The visible rectangle (all live layers: mist, rain, ripples, focus) is rendered to an off-screen texture. A film look is then applied: grain, a soft vignette, a slight warm or cool shift depending on the chosen film stock, and a light halation glow. The image is saved as JPEG (about 1600 px long edge, roughly 150–300 KB).
- **Roll of 24.** The counter is shown only on the camera. Each evening, at the darkroom corner of your quarters, you "develop" the roll and the photos appear on a **contact sheet**. You can't run out for good: you always get a new roll the next day. This slows you down without any penalty. (Reviewing photos instantly can be an accessibility setting.)
- **Album:** contact sheets grouped by day, a full view, optional notes you write yourself, and tags added automatically (place, time, weather, season). Delete and download are available.
- **Optional prompts** ("Notice something you usually overlook", "Find something changing", "Something that won't be here tomorrow") appear on small slips of paper in your quarters. They are never checked off, scored, or required. A gentle **recognition** layer can notice what is in the frame (e.g. "a leaf on the water"), because hidden "subjects" tagged in each scene let photos have quiet meaning. Some subjects show up only in certain conditions (a frog after rain, frost on the basin at dawn).
- **Close-up details:** some points of interest open a hand-composed close-up scene (moss on a lantern, a water drop on a leaf, the bowl's crack) that is fully photographable.

---

## World, time, and story
- **Time:** Dawn → Morning → Afternoon → Evening → Night. Time moves on only when you choose: you ring the small bell, sit for a while, or rest. Nothing happens on a timer.
- **Weather** is rolled each day (clear / mist / rain / overcast, and snow in winter), with some situations tied to weather (plans interrupted by rain).
- **Seasons** move forward every 3 in-game days (spring → summer → autumn → winter → …), so places visibly change. This is impermanence you can see and photograph.
- **People are unseen:** the cook's voice from the kitchen, a monk's footsteps on the veranda, sandals left at the hall door, notes on the shoji screen. Text is in the second person and short, and it always leaves a choice open.
- **Situations engine (data-driven):** each situation is a small script file with conditions (place, time, weather, season, flags), steps, and choices that set flags. Flags can unlock later moments and change scenes (e.g. a repaired bowl later appears on a shelf). There are never "good/bad" grades. Consequences are simply what happens next.
- **Sitting:** at a sitting spot the UI disappears, the camera settles, and sound comes to the front. There is optional gentle breath pacing (off by default, and fully still when reduced motion is on). You can leave at any time. Sometimes a "returning thought" appears as faint text and fades if you leave it alone. Tapping it lets you follow it, which leads to a short reflection.

### v1 places
1. **Sanmon gate and mossy stone steps** (arrival, in mist)
2. **Moss garden** with a stone lantern and a water basin (tsukubai)
3. **Pond** with reflections, koi, a leaf drifting, ripples on rain days
4. **Meditation hall (zendō) interior:** warm window light, wooden floor, cushions, incense smoke

Plus **your small quarters** as a menu-like space (rest, develop film, prompts, settings).

### v1 situation: the broken bowl
On your first morning you find a chipped tea bowl near the water basin. You can set it aside carefully, leave it, take it to the hall, photograph it, or leave a note. The unseen cook responds later through a note or a voice heard from off-screen, depending on what you did. This sets flags that later versions build on (e.g. a mending scene). All wording will be checked against the research notes.

---

## Sound
- **Web Audio mixer** with sliders for Master, Ambience, Effects, and Bell/Voice, plus Mute. Audio starts only after the first tap (browser rule), and sound starts muted until the player chooses.
- **Layered ambience per place:** wind in cedars, a stream, birds (varying by season), pond insects, the wooden floor creaking. Rain and wind are **generated in code** (filtered noise), so they cost no downloads and change smoothly with the weather. One-off sounds come from **CC0** sources (Freesound with CC0 filter, Sonniss GDC bundle where licensed), all listed in `CREDITS.md`.
- **Captions** for meaningful sounds ("[a bell, far off]", "[footsteps on the veranda]"). They are on by default for unseen-presence cues, since those carry story.

---

## Accessibility and comfort
- Follows `prefers-reduced-motion`, with an in-game toggle: no idle parallax drift, fades instead of pans, slowed or static particles, no camera sway.
- Text size (S / M / L / XL), a high-contrast UI option, a dyslexia-friendly font option, and a minimum 16 px base font.
- Look-sensitivity and invert settings. Momentum can be turned off.
- Everything works with keyboard only, with visible focus rings. UI built in HTML has ARIA labels. Each place has a short **text description** for screen readers ("Moss garden. Morning mist. A stone lantern to your left…").
- No flashing. Lightning is excluded.
- Points of interest are marked by shape and motion as well as color (safe for colour-blind players).

---

## Cultural care: research needed (`docs/RESEARCH.md`)
I'll draft a research notes file with sources. Items to check before writing the related content:
1. **Lineage choice:** Sōtō vs Rinzai details (posture facing the wall vs facing the room, kōan practice). Proposal: keep it lightly Sōtō-flavoured and avoid kōan dialogue unless it's done well.
2. **Zendō etiquette:** bowing (gasshō), entering with the left foot, where shoes go, incense offering, the han/umpan/bell signals and what each means.
3. **Kitchen (tenzo) practice:** shōjin ryōri and Dōgen's *Instructions for the Cook (Tenzo Kyōkun)*. Treat the cook's role respectfully.
4. **Temple architecture and naming:** sanmon, butsuden, hattō, sōdō, kuri, tsukubai, stone lanterns. Use correct terms in an optional glossary.
5. **Buddha images / altars:** how to show them respectfully (never as props to photograph carelessly). Possibly a gentle note asking whether photography is welcome in the hall: the unseen monks set norms.
6. **Kintsugi:** a lacquer craft, *not* a Buddhist practice in itself. Avoid presenting it as "Zen" if used for the bowl.
7. **Teaching language:** keep themes in experience rather than lectures. Any quoted teaching (e.g. Dōgen, Thích Nhất Hạnh, sutras) needs correct attribution and translation source. Avoid fake quotes (there are many misattributed "Buddha quotes" online).
8. **Clothing and terms** (samue, kesa, rakusu): only if mentioned in text.
9. **Avoid:** "zen" as a style buzzword, enlightenment as a goal or reward, exotic framing, or making monks into mystical props.
10. Optional: ask someone with lived practice experience (a teacher or classmate) to review the text in v3/v4.

---

## Project structure
```
index.html
vite.config.js            # base: '/the-quiet-path/'
package.json              # vite, pixi.js, idb-keyval
.github/workflows/deploy.yml
public/assets/{textures,audio,fonts}/
src/
  main.js                 # boot, quality detect, load save, start
  engine/   app.js  input.js (pointer/touch/keyboard unify)  panorama.js (layers, parallax, look)  transitions.js
  paint/    brush.js  ridges.js  trees.js  stone.js  wood.js  sky.js   # procedural painters
  fx/       grade.js (time/weather/season LUT)  mist.js  rain.js  sway.js  water.js  dof.js  film.js
  world/    places/{gate,garden,pond,zendo,quarters}.js  clock.js  weather.js  season.js
  story/    engine.js  flags.js  situations/brokenBowl.js
  camera/   viewfinder.js  capture.js  subjects.js  album.js
  audio/    mixer.js  ambience.js  procedural.js  captions.js
  ui/       hud.js  dialog.js  settings.js  albumView.js  styles.css
  save/     progress.js (localStorage)  photos.js (IndexedDB)
docs/DEVLOG.md  docs/RESEARCH.md  docs/PLAYTEST.md
CREDITS.md  README.md
```

---

## Five iterations

### v1: Atmosphere, exploration, photography (first playable)
- Vite/Pixi scaffold, Pages deploy action, quality tiers, settings, save/load.
- 4 places + quarters with code-painted layers, parallax look-around, path travel.
- The full time-of-day cycle with color grading. Mist, wind sway, pond ripples, and rain (as a weather option).
- Camera: frame/zoom/focus, film look, roll of 24, development, contact sheet/album, download.
- Ambience mixer with procedural wind/rain and captions. Sitting.
- Broken bowl situation. Reduced motion and text size settings.
- `docs/PLAYTEST.md` checklist of questions for you to answer after playing (how did it feel, where did you get lost, which photo did you like, …).

### v2–v5: shaped by your playtesting
A tentative direction (expected to change):
- **v2:** Kitchen + forest path. The days-and-seasons system with first seasonal changes. The rain-interrupted-plans situation. Photo prompts and subject recognition.
- **v3:** The visitor-in-need situation. Returning thoughts while sitting. More wildlife and conditional subjects. Glossary. Cultural review pass.
- **v4:** Winter and snow. Deeper consequences from earlier choices (the mended bowl, the visitor's return). Audio polish and accessibility audit.
- **v5:** Polish and performance tuning on real phones, onboarding, credits, a final dev log entry, and the presentation build.

### Git and dev log practice
- One clear commit per meaningful change. Each iteration ends with a commit "vN: …" and a **tag `vN`**, so every version stays playable from history.
- `docs/DEVLOG.md` gets one entry per iteration: goals, what was built, your playtest notes, what changed because of them, and open questions.
- Work is pushed to `claude/nice-tesla-2n257k`. A PR/merge to `main` is made when you want to deploy, and only when you ask.

---

## Verification (each iteration)
- `npm run dev` locally, plus `npm run build && npm run preview`, to check the Pages base path.
- Playwright script (Chromium is pre-installed): load the game, check every place, take a photo, reload, and confirm the save and the photo persist. Screenshots at phone (390×844, both orientations), tablet, and desktop sizes. Check the frame rate on Low/High.
- Manual checks: keyboard-only playthrough, reduced-motion mode, audio mute on load, captions.
- After merge: confirm the GitHub Action deploys and the Pages URL loads on a phone.
