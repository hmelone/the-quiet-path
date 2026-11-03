# The Quiet Path, v2: a walkable 3D valley in the Plum Village spirit

## Context
After playing v1 (painted 2.5D panoramas set in a Japanese Zen temple), you asked for:
- the Plum Village tradition instead of Japanese Zen;
- the ability to walk further through scenes, which you chose to do as **free walking in 3D**;
- clearer icons for "look" versus "go";
- more people and animals;
- working sound: nature sounds that match the weather, calm ambient music, and a meditation bell during the day.

The v1 plan (`docs/PLAN.md`) and its 5-iteration structure remain. This is **v2**. It replaces the 2.5D renderer and scenes with a 3D world. Everything else carries over: the story system, camera, album, settings, sound engine, saving, accessibility and docs.

### Your decisions
| Topic | Choice |
|---|---|
| Setting | **Blend:** forested mountain above, an orchard and farmhouse-style tea house below |
| Movement | **Free walking in 3D, first-person.** On phones, **tap to walk there**; drag to look |
| Art | **Stylized painterly 3D**, all built in code (Three.js) |
| Scope | **One connected valley**, about 2–3 minutes to cross |
| Music | **Generated ambient**, following the time of day, with its own volume |
| Life | Monastics and lay friends at a distance · one person you can meet · ordinary wildlife · everyone stops for the bell |

### Why sound seemed missing (root cause)
Sound defaults to off (`settings.muted: true`), and the title screen preselects **Sound off**. Unless the player taps "Sound on", nothing plays. v2 will default to sound on, show a clear sound choice and a 🔈 toggle in the HUD, and add an automated test that confirms audio is actually produced.

---

## Technology (plain-language tradeoffs)
- **Three.js** (pinned version) replaces the custom 2D compositor. It's the standard, well-documented browser 3D library, adding roughly 130–160 KB compressed.
- **The painterly look comes from lighting and colour, not detail:** soft gradient ("toon-ish") shading, vertex-coloured shapes with brushy noise, warm/cool time-of-day grading, height fog and drifting mist banks, a painted sky dome (reusing v1's sky and cloud shader ideas), gentle bloom on lanterns, and an optional painterly post-filter on High quality.
- **Textures painted in code.** The v1 brush toolkit (`src/paint/brush.js`) is reused to paint leaf cards, bark, moss, plaster, calligraphy boards and paper lanterns into small textures. There are still no downloaded art files.
- **Phone performance:** quality tiers (Low / Medium / High / Auto) control pixel ratio, shadows (off / soft / full), foliage density and grass radius, draw distance (hidden by fog), reflections and post effects. Instancing keeps trees and grass cheap. The target is a steady 30 fps on typical phones and 60 on desktop.
- **Tradeoffs to expect:** the world will look illustrated rather than realistic. The first load paints and builds the valley, which takes a few seconds behind a calm loading screen. Real-device testing matters more than in v1, so please try v2 on your phone.

---

## The valley (one connected world, built procedurally)
A gentle valley about 160 × 120 m, with paths carved into the terrain (stone steps, gravel, wooden boardwalk). From top to bottom:
1. **Mountain gate & forest path.** You arrive at a simple wooden gate in misty cedar and maple forest, and a path winds down.
2. **Bell tower.** A small open wooden tower with a large bronze bell, overlooking the valley.
3. **Meditation hall.** A wooden hall with open sliding doors you can **walk inside**: cushions in rows, a simple altar with flowers and a candle, and brush-written phrases on boards.
4. **Lotus pond.** A curved wooden bridge, benches, lotus leaves and flowers, reflections, koi and a heron.
5. **Orchard & tea house.** Plum trees in rows, and an old stone farmhouse turned tea house and kitchen with a terrace. This is where the bowl story now lives.
6. **Your room.** A small dormitory hut by the orchard: rest, the darkroom, prompts, the bell.

Each area is a "zone". Entering one updates the place name, the screen-reader description and the sound mix.

---

## Movement & comfort
- **Phone:** **tap the ground to stroll there** along a path that routes around obstacles. **Tap an object** to walk near it and interact. **Drag** to look around (with optional momentum).
- **Desktop:** WASD or arrow keys to walk, mouse-drag to look, click to walk or interact.
- **Walking feel:** slow walking pace, eased turns, no head-bob. Footsteps change with the surface: gravel, wood, grass, stone.
- **Comfort settings:** field-of-view slider, look sensitivity, smooth or snap turning, an optional "comfort vignette" while moving, and reduced motion (instant fades, slower turning, calmer particles).
- **Never stuck:** routing is on a walkability grid (terrain slope, buildings, water). There's an optional "follow the path" mode where the walk button moves you to the next point of interest.

## Clearer icons
Each interactive thing gets a **distinct icon plus a short text label**, shown when it's in view and within about 10 m. The nearest one shows its label all the time.
- 👁 **Look** · 🚶 **Go / enter** (doors and path exits) · 🪷 **Sit** · 💬 **Talk** · 🔔 **Bell**

A **"Nearby" tray** (bottom left) lists the same things as normal buttons. This is the accessible, keyboard-friendly way to reach anything, and it also helps on small screens. The icon legend is shown once at the start and in About.

---

## People & wildlife
- **Figures** are built from simple soft shapes, shown at a distance with no detailed faces. Monastics wear **brown robes**; lay friends wear everyday clothes. They follow daily routines:
  - a **walking-meditation line** moving slowly along the pond path in the morning;
  - someone sweeping by the gate;
  - people sitting in the hall at dawn and evening;
  - tea on the terrace in the afternoon;
  - a monastic walking up to invite the bell.
- **Someone you can meet: Sister Hien** (a fictional monastic name, to be checked in research). She looks after the bell and the tea house. Several short conversations open over the days. She explains the bell practice simply and responds to what you did with the bowl.
- **Wildlife:**
  - deer at the forest edge at dawn and dusk, which drift away calmly as you approach;
  - squirrels in the orchard;
  - a heron at the pond;
  - koi and frogs;
  - a cat sleeping on the hall veranda;
  - small birds flying across;
  - fireflies on summer evenings.
  Each appears according to time and weather.

## The mindfulness bell (core Plum Village practice)
- **Scheduled bells** from the bell tower mark the day (waking, sitting, meals). There's also an **occasional bell of mindfulness**, every few minutes by default; a setting offers off / occasional / frequent.
- **When the bell sounds, the world pauses:** everyone in the valley stops where they are, the music softens, your movement eases to a halt, and three gentle breaths are offered ("Breathing in… breathing out…", about 15 seconds). Then life continues. You can always skip, and a setting can turn the pause off.
- **You can invite the bell yourself** at the tower, or with the small bell in your room. Inviting the small bell lets time move forward, as in v1.

## Sound & music
- **Fixes:** sound on by default, the title-screen choice made clearer, a HUD mute toggle, and an automated check that audio is produced.
- **3D nature sound, placed in the world:**
  - the stream and the pond, plus frogs, near the water;
  - wind in the cedars, louder higher up the valley;
  - birds by time of day;
  - crickets at night;
  - rain (heavier on roofs when you're inside);
  - indoor room tone;
  - footsteps that change with the surface.
  All of it is mixed by weather and time.
- **Generated ambient music:** soft slow pads with sparse gentle notes in a calm scale. The mood follows the time (brighter morning, warmer evening, very sparse at night), and it fades during bells and while sitting. It has its own volume slider and an on/off switch.

## Camera, album, story (carried over, adapted)
- **Camera:** raise it with C or the camera button; real zoom (field of view) and tap-to-focus depth of field. Each photo renders exactly the framed view, with the film look, rolls of 24 and darkroom developing. Existing photos are kept.
- **Subjects in frame** are detected by projecting tagged objects, people and animals into the frame and checking they aren't hidden. Examples: "a heron at the pond", "the walking line on the bridge".
- **Story content rewritten for Plum Village:**
  - a welcome note with an "arrived, home" spirit;
  - a stone by the gate with a brushed phrase;
  - the bell tower;
  - hall etiquette;
  - the tea bowl at the tea house, with the same branching consequences;
  - prompts, returning thoughts while sitting, Sister Hien's conversations.
  Japanese-specific elements (Jizō, the wooden han board, the tsukubai) are removed.
- **Saves:** progress moves to `version: 2` (position, facing, zone), so v1 progress starts fresh. **Photos in IndexedDB are kept.**

## Cultural care (new `docs/RESEARCH.md` section)
To check before or while writing:
- the bell practice and terms ("inviting the bell", stopping for three breaths);
- walking meditation;
- noble silence;
- forms of address ("Brother", "Sister", "Thầy");
- the brown robe;
- tea meditation;
- what's on an altar in the tradition.

Rules:
- **Write original short phrases**. Thich Nhat Hanh's gathas and calligraphies are copyrighted, so don't reproduce them; paraphrase the spirit and cite sources in the research file.
- **Fictional centre and fictional people only**: don't depict Thich Nhat Hanh or real monastics, and don't use Plum Village branding.
- Note the earlier Japanese-specific research items as retired.

---

## Files
- **New** `src/world3d/`:
  - `engine.js` (renderer, camera, quality, loop)
  - `terrain.js` (heightfield, carved paths, surfaces)
  - `nav.js` (walkability grid + A* + smoothing)
  - `sky.js`, `atmosphere.js` (adapted from `src/world/atmosphere.js`)
  - `foliage.js` (instanced trees, grass, lotus; wind sway)
  - `buildings.js` (gate, bell tower, hall + interior, tea house, hut)
  - `water.js`
  - `people.js` (figures + routines + pause for the bell)
  - `animals.js`
  - `interactables.js` (POIs, subjects, zones)
  - `post.js` (grade, vignette, bloom, depth of field)
- **New** `src/paint/textures.js`: canvas-painted textures, reusing `brush.js`.
- **New** `src/audio/music.js` and `src/audio/bell.js`. `audio.js` is extended with spatial sources (`PannerNode`s fed from the camera position) and surface footsteps.
- **Updated:**
  - `src/main.js` (new game shell)
  - `src/core/input.js` (tap-to-walk, WASD)
  - `src/core/state.js` (v2 save)
  - `src/core/settings.js` (sound on, music, bell frequency, FOV, comfort)
  - `src/ui/hud.js` (icons, labels, Nearby tray, mute toggle)
  - `src/ui/panels.js` (new settings, legend)
  - `src/camera/capture.js` (3D capture)
  - `src/story/content.js` (Plum Village content)
- **Removed:** `src/render/`, `src/world/places/*` and `src/world/scene.js` (the 2.5D engine). They stay preserved in git history at tag `v1`.
- **Docs:** `DEVLOG.md` (v2 entry including your v1 playtest feedback), `RESEARCH.md`, `PLAYTEST.md` (3D questions added), `README.md` (controls), `CREDITS.md` (Three.js, MIT).

## Build order (commits along the way, `v2` at the end)
1. Three.js engine, terrain, sky, fog, light grading, tap/WASD walking with routing.
2. Foliage, water, buildings (including the hall interior); painterly materials; quality tiers.
3. Sound fix, spatial ambience, generated music, the bell and the pause.
4. Icons, labels and Nearby tray; camera and album in 3D; Plum Village story content and Sister Hien.
5. People routines and wildlife.
6. Polish, docs, version tag `v2`, push and open a pull request.

## Verification
- `npm run build` and `vite preview` under `/the-quiet-path/`.
- **Playwright (headless Chromium):**
  - screenshots of every zone at dawn, afternoon, evening and night, in rain and in mist, at desktop and phone sizes;
  - a scripted tap-to-walk route from the gate to the pond and into the hall;
  - entering a zone updates the label and the description;
  - the bell fires and everyone pauses;
  - a photo is captured with subjects found, the album lists it, and it survives a reload;
  - an audio check (an `AnalyserNode` shows a non-zero signal after starting with sound on);
  - frame timings recorded at each quality tier.
- **You** test on a real phone (iOS / Android) and desktop, using the updated `docs/PLAYTEST.md`.
- After merging: confirm the Pages deploy goes green and the site loads.

### Honest scope note
This is a large step, larger than v1. If time runs short, the pieces most likely to be thinner in v2 are the richer people routines and the painterly post-filter. They would move to v3, and I'd say so in the dev log.
