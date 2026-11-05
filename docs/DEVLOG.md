# Development log

Each iteration ends with a commit "vN: …" and a git tag `vN`, so every version stays playable from history.

```bash
git checkout v1
```

---

## v1: Atmosphere, exploration, photography (first playable)
*Date: 2026-11-03*

### Goals
Establish the feeling of the place, comfortable movement on phone and desktop, and mindful photography. Include one small situation that responds to the player's choice.

### What was built
- **Five places:** the gate and mossy steps, the moss garden, the pond, the meditation hall, and your room. There are also two close-ups (the broken bowl; moss on the lantern).
- **Painted 2.5D panoramas.** Drag to look around, with parallax between 5–9 depth layers. Tap diamond marks to walk somewhere (a soft fade with footsteps).
- **Light and weather.** Dawn, morning, afternoon, evening and night, with clear, mist, overcast and rain. One painting is re-lit by a colour-grading shader. Lanterns and paper windows glow at night. Light shafts, drifting mist, swaying foliage, rippling reflections, rain rings on the pond, koi, a drifting leaf, fireflies, incense smoke and dust motes.
- **Time moves only when you choose:** sit until the next bell, rest on your futon, or ring the small bell in your room. Day 1 is misty and day 2 brings rain ("plans interrupted"). Later days vary.
- **Film camera.** A 3:2 viewfinder (2:3 in portrait), zoom 1–3×, tap-to-focus blur by depth, and a film look (grain, halation, vignette, warm stock). Photos capture exactly the framed rectangle of the live scene.
- **A roll of 24.** Develop it in the darkroom corner each evening; a fresh roll arrives the next morning once yours is finished. An "instant review" setting skips the wait.
- **Album and contact sheets** grouped by day. Each photo has a full view, a personal note, download and delete, plus quiet tags for what was in frame ("moss on the stone lantern"). You can save a contact sheet as an image.
- **Optional prompts** on paper slips in your room ("Notice something you usually overlook"). They are never checked.
- **The broken bowl.** Set it on the veranda, carry it to the kitchen, leave it, or look closer. Each choice leads somewhere different: footsteps and a note, a note from the kitchen, or later a small hollow in the moss. Flags are kept for a mending storyline.
- **Sitting** on the veranda, at the pond, or in the hall. The interface steps back. Returning thoughts drift in; leave them and they fade, or follow one and gently come back. There is an optional breathing guide.
- **Unseen people:** sweeping beyond the wall, the wooden board before evening sitting, sandals by the hall, footsteps on the veranda, humming from the kitchen.
- **Procedural sound** with a mixer: wind gusts, leaves, stream, basin trickle, rain (muffled indoors), birds, crickets, frogs, bells, the wooden board, footsteps, shutter. Captions for meaningful sounds. Sound starts off until you choose it on the title screen.
- **Accessibility:** reduced motion (follows the device or a manual setting), four text sizes, high contrast, a plain legible font, adjustable or hidden markers, look sensitivity, invert drag, momentum toggle, keyboard-only play (Tab to marks, E / W / S / C / P / Esc), screen-reader descriptions of each place, and focus-trapped dialogs.
- **Performance:** Auto / Low / Medium / High quality, which sets pixel ratio, painting resolution, particle count and photo size. Auto steps down quietly if frames are slow. The whole game is about 53 KB gzipped, with no images or audio files.
- **Saving:** progress and settings in localStorage; photos in IndexedDB, with a warning if storage is blocked.
- **GitHub Pages deployment** via GitHub Actions.

### Technical decisions (and why)
- **Custom WebGL2 compositor instead of PixiJS** (a change from the plan). Each layer is one fullscreen shader pass that handles parallax, grading, sway, blur, water and mist together. Pixi's filter system would render each layer to an extra texture per effect, which costs more on phones. The custom renderer is about 250 lines and has no dependency.
- **Painting on CPU-rasterised canvases** (`willReadFrequently`). Tens of thousands of small brush dabs rasterise much faster on the CPU than through GPU canvas in some browsers. Testing showed 11 s versus 0.1 s for one layer.
- **No CC0 assets yet.** Procedural painting and synthesised sound kept v1 consistent and tiny. CC0 textures or recordings can be added later if playtesting suggests they're needed.

### Known limitations
- In portrait on phones you see a narrow slice of each panorama; landscape shows more. A one-time hint suggests turning the phone.
- Only late spring so far (seasons come in v2). The kitchen and forest path are referenced but not visitable.
- Painted art is stylised and fairly "clean". Richer brushwork and texture are a good candidate for later polish.
- Tested in desktop Chromium and a phone-sized emulated touch screen. Still needs testing on real iOS Safari and Android devices.

### Playtest notes (from your v1 play)
- Would prefer the **Plum Village** tradition rather than Japanese Zen.
- Wanted to **walk further through each scene** — the left/right panoramas felt too small.
- **Icons were hard to tell apart**: looking at something vs. going somewhere.
- Wanted **more people and animals** in the scenes.
- **There was no sound.** (Cause: sound defaulted to off and the title screen preselected "Sound off".) Wanted nature sound matched to the weather, calm ambient music, and a meditation bell during the day.

---

## v2 — A walkable valley, in the spirit of Plum Village
*Date: 2026-11-04*

### Goals
Respond to v1 playtesting: free walking in 3D, a Plum Village–style practice centre, clearer icons, people and wildlife, and real sound: nature, music and the bell of mindfulness. Plan: `docs/PLAN-v2.md`.

### What changed
- **3D world (Three.js), first-person.** One connected valley, about 2–3 minutes to walk across:
  - mountain gate and cedar forest path;
  - bell tower;
  - meditation hall you can walk into (cushions, altar, brushed words);
  - lotus pond with an arched bridge, koi and a heron;
  - plum orchard;
  - old stone farmhouse tea house with lavender rows;
  - your hut (rest, desk, small bell, darkroom).
- **Movement:**
  - **Tap or click the ground to stroll there**, routed around trees, walls and water (A* on a walkability grid).
  - **Drag to look** around.
  - **W/A/S/D or arrows** on a keyboard.
  - **Signposts** walk you to other areas.
  - The view eases to face where you walk; this can be turned off.
- **Distinct icons with labels:**
  - 👁 look · 🚶 go (signposts and doors, in a green rounded square) · 🪷 sit · 💬 talk · 🔔 bell.
  - The nearest thing always shows its label.
  - A **Nearby** tray at the bottom left lists the same things as buttons (accessible, keyboard-friendly).
  - There's an icon legend in About.
- **People:** monastics in brown robes (some in conical hats) and lay friends:
  - a slow walking-meditation line around the pond in the morning;
  - someone sweeping the forest path;
  - people sitting in the hall at dawn and evening;
  - tea on the terrace in the afternoon;
  - orchard work;
  - someone reading by the pond.
- **Someone to meet, Sister Hien** (fictional). She's at the bell tower in the morning, the tea house in the afternoon and the hall in the evening. Her conversations open over time: the bell practice, the bowl, an invitation to walking meditation.
- **Wildlife:** deer at the forest edge (they drift away as you approach), a heron, koi, a sleeping cat on the hall veranda, orchard squirrels, birds overhead, fireflies on dry evenings.
- **The bell of mindfulness:**
  - The tower bell sounds now and then (setting: off / now and then / often). It's first "woken" with a soft touch.
  - Everyone in the valley stops, the music softens, and you're offered three breaths before life continues. You can skip it, or turn the pause off in Settings.
  - You can **invite the tower bell yourself**.
- **Sound:**
  - Sound is **on by default**, with a clear choice on the title screen and a mute button in the corner.
  - Nature sound follows where you are and the weather: the stream (placed left or right of you), wind stronger higher up the valley, leaves in the forest, frogs near the pond in the evening and in rain, birds by time of day, crickets at night, rain muffled indoors, room tone inside.
  - Footsteps change with the surface: gravel, stone, wood, grass.
  - An automated check confirmed audio is actually produced.
- **Generated ambient music:** slow pads with sparse gentle notes in a calm scale. The mood follows the time of day, and it ducks for bells and sitting. It has its own volume and on/off switch.
- **Camera in 3D:**
  - The photo is exactly the framed rectangle, at photo resolution.
  - Zoom changes the lens.
  - **Tap to focus** measures the real distance. Focus blur appears in the developed photo, like film, rather than in the live viewfinder.
  - Photos note what's in frame, now including people and animals (e.g. "the walking meditation line", "a heron at the pond").
- **Story rewritten** for a fictional Plum Village–style centre:
  - original brushed phrases ("Slow down. You are here." · "Just this breath" · "Each step is enough" · "Be still, and listen" · "Here is a good place to begin");
  - the bowl story moved to the tea house terrace, with three branches and consequences;
  - tea, the kitchen in silence, the cat, the heron and more.
- **Rain is visible** (falling streaks, rings on the pond), and mist banks drift through the valley.
- **Performance:**
  - Low / Medium / High / Auto tiers control pixel ratio, shadows, foliage and grass density, and photo size.
  - Distant forest doesn't cast shadows.
  - Auto quietly lowers the pixel ratio and then turns off shadows if frames are slow.
- **Saving:** progress moves to a v2 format (position and facing), so v1 progress starts fresh. **Your photographs are kept.**
- **Removed:** the v1 2.5D renderer and painted panoramas. They're still in git history at the v1 merge.

### Technical decisions
- **Three.js r187**, everything built in code: merged vertex-coloured geometry, instancing for trees and grass, toon-style soft shading bands, a custom sky dome and distant-mountain haze shader, and a custom water shader.
- **Photos render offscreen** with depth, then one film pass handles depth of field, tone mapping, halation, vignette and grain.
- **The sky and mountain shaders output linear colour**, so the screen and photos match.

### Known limitations / to try on real devices
- Tested in headless Chromium (software GPU), at desktop and phone sizes.
  - The software GPU is very slow with shadows, so **frame rates there don't reflect real devices**. Please check smoothness on your phone; Settings → Visual quality → Low if needed.
  - Not yet tested on real iOS Safari or Android.
- The art is stylised and low-poly. Painterly brush textures and richer silhouettes are good candidates for v3.
- People are simple shapes and don't yet walk between places over the day; they're arranged per time of day.
- The kitchen and the tea house interior aren't walkable yet.
- The `v1` tag couldn't be pushed from the session; it can be added as a GitHub release on the v1 merge commit.

### Playtest notes
*(Add your notes here after playing v2. See `PLAYTEST.md`.)*

---

## v2.1: Fixes from v2 playtesting
*Date: 2026-11-04*

### Your playtest notes (v2)
- Clicking things to read them made the view awkward: you walked to the object and often ended up behind it. Viewing shouldn't require moving.
- Too much wind: nonstop, like a storm, with a machine-like noise behind it that didn't sound natural.
- The hill down to the meditation hall was very steep and hard to walk down.
- The walking-meditation path should have a small bridge or stones over the stream.
- Walking was hard: after clicking, the character kept walking and couldn't be stopped. Clicking should just walk there, and if you choose a destination you should be able to press Esc to stop, with that shown on screen.

### What changed
- **Viewing happens in place.** Tapping 👁 look, 💬 talk or 🔔 bell opens the text right where you are, with no walking and no camera movement. Only sitting walks you to the seat, and signposts or doors still walk you there.
- **Walking you can control:**
  - Tapping the ground walks you to that spot only, never more than about 35 m.
  - While walking, a **"Walking to …" banner with a Stop button** appears at the top, with the hint "or press Esc".
  - **Esc stops walking** (it opens the menu only when you're standing still).
  - Tapping right at your feet also stops you.
- **The "machine" noise was a looping seam.** The wind and room-tone sounds looped a 4-second noise recording whose ends didn't match, giving a soft mechanical thump every 4–8 seconds. The fix:
  - The noise is now 12 seconds long, has its drift (DC) removed, and crossfades into itself, so the loop is seamless.
  - The narrow whistling "trickle" layer near the pond and the low room rumble are replaced with soft broadband sound.
- **Calmer wind:**
  - The wind is about a third as loud as before.
  - Gusts are rare (roughly every 15–20 seconds at most), gentle, and fade back to calm.
- **A gentler valley.** The drop from the gate to the hall is about 6–7 m instead of about 15 m, and the terrain blends into the building terraces over a wider distance, with no steep ramps.
- **A wooden footbridge over the stream**, exactly where the path and the morning walking-meditation loop cross it.
- **Accessibility fix:** the hidden "Continue" button of the bell's breathing overlay is now fully removed from the page when not in use, so keyboard and screen-reader users don't land on it.

---

## v2.2: Quieter music, a livelier forest
*Date: 2026-11-04*

### Your playtest notes
- "Begin a new stay" looped back to the title screen. (Fixed separately: the confirm box closed itself before recording your answer.)
- A machine-like hum was still there.
- The forest felt a bit empty; you asked for more animals, fun and relaxing.

### What changed
- **The hum was the music, not the nature sounds.** Measuring the spectrum of each layer showed the ambience had no tonal peaks, but the music's background chords held steady sine and triangle tones at about 97, 145 and 248 Hz for 20 seconds at a time, which reads as an electrical hum. The fix:
  - The chords now sit only in the mid range (about 200 Hz and up).
  - They use pure soft tones with a slow, slightly irregular waver, swell and fade, and leave gaps of silence.
  - The music passes through a 170 Hz high-pass filter.
  - The music's low-frequency energy dropped from about -81 dB to between -89 and -120 dB.
- **More forest life:**
  - **Deer:** small herds among the cedars, including a fawn, from dawn to evening.
  - **Rabbits** by the path that hop about and bound away if you come close.
  - **A fox** trotting a loop through the forest at dawn and dusk, stopping to look at you when you're near.
  - **Small birds** pecking on the paths, fluttering up when you approach and settling back later.
  - **Butterflies** drifting over meadows and clearings on fine days.
  - **Squirrels** in the forest as well as the orchard.
  - **An owl** on a branch at dusk and at night, slowly turning its head.
  - **Forest sounds:** a woodpecker drumming by day, owl hoots at night.
  - **You can look at** deer, the fox, rabbits and the owl: an icon follows them, and each has a short gentle description. They can also be named in photos.

---

## v2.3: Develop any time; no more "boing"
*Date: 2026-11-04*

### Your playtest notes
- You wanted to develop photos at any time, not only at night.
- There were still occasional "boing" noises in the sound.

### What changed
- **Develop whenever you like:** the darkroom corner of your hut now works at any time of day.
- **The "boing" sounds were quick pitch sweeps** in a few small sound effects. They're replaced with natural, unpitched textures:
  - **Bubbles by the pond**, a rising "bloop" that played as often as every couple of seconds, are removed.
  - **Frogs** were a falling triangle-wave tone. They're now a soft croak made of a rapid pulse of filtered noise, and less frequent.
  - **Rain drips** were a falling whistle. They're now tiny filtered ticks.
  - **The indoor wood creak** was a falling sawtooth tone. It's now a soft, short rasp of filtered noise.

---

## v2.4: Plum Light — a class art iteration
*Date: November 3, 2026 · visual baseline `18fa928`; integrated with `main` at `52ae665`*

### Direction and implementation

Start at the hut and look toward the pond: a flowering plum with open, irregular branches, worn stepping stones, mossy edging, fine curved grasses, ground cover and scattered petals now frame the walk. Three cedar silhouettes and quieter sage/ochre broadleaf colors vary the grove. A more muted meadow palette and blue-green afternoon air replace the yellow-green wash. Mist begins farther from the viewer; smaller, lighter banks stay on the slopes, keeping the hall legible.

The opening uses two original, locally served WebP illustrations (wide and portrait, approximately 521 KB combined), made for this fictional retreat. The compositions share the plum/pond/timber hall palette; readable live serif text and at least 52px primary controls sit above the art. Continue preserves existing progress; Begin retains the existing new-stay confirmation. The art is still, reduced motion disables the fade, and the hidden game scene no longer renders behind it. There are no new runtime dependencies.

Existing koi were almost hidden by the previous 92%-opaque water. They now have more readable tapered bodies, eyes, fins and moving tails, varied continuous gliding paths under the surface, and calmer water with view-dependent transparency, sky reflections and soft reed shadows. Fish stay inside the basin, sometimes moving out from the reed edge. Photo subject positions now match the fish's actual underwater height and ignore invisible wildlife. Fish remain ordinary scene geometry and pass through the existing film and IndexedDB save pipeline.

Monastics and lay visitors have shoulders, sleeves, hands, feet and human head profiles, with varied proportions and existing routines. Architecture keeps its distinct hall / stone tea farmhouse / modest hut silhouettes. Added details include warm floorboard seams, hall window frames and veranda shoes, repaired tea tables with cups and kettles, a hut quilt and notebook, and a darkroom bench with enlarger, trays, tongs, clipped negatives and a soft safelight. Existing navigation colliders and interaction locations remain intact; new plum trunks are blocked for walking. Figure geometry is released when routines rebuild.

### Evidence and verification

The [review gallery](art-pass/README.md) contains the fixed-pose hut comparison, desktop and phone title captures, playable phone view, hall and darkroom views, and an actual saved fish JPEG. The before capture is from an untouched archive of latest main; both hut views use `(19,38)`, yaw `0.283`, pitch `0.04`, 62° lens, 1440×900, day-one afternoon mist. This approximates the supplied screenshot's direction, rather than claiming the exact original camera parameters.

`npm run build` passes. The repeatable `scripts/art-pass-smoke.py` runs against the production preview under `/the-quiet-path/`, using isolated browser storage and software WebGL. See [checks.json](art-pass/checks.json) for actual outcomes. It checks startup/save choices, v2 progress and roll retention, route availability from hut to pond/hall/interior, keyboard and touch exploration, interaction dialogs, reduced motion, fish continuity and underwater bounds, and saved photography through reload and album. A second exposure with fish hidden distinguishes real fish pixels from random film grain. No deployment or real-device FPS claim is made.

### Sources and remaining work

All new 3D geometry is original procedural work. Title illustrations were generated specifically for the project; [credits](../CREDITS.md) and [art provenance](../public/art/README.md) record the source. No stock art, models or textures were imported. Buildings and people are fictional design interpretations, not verified reconstructions of a Plum Village site; no new religious authenticity claim or practice text is introduced.

Deferred refinements: more expressive walking/seated animation and individual clothing variations, seasonal blossom changes, finer bark/wood texture painting, extra orchard tools and personal hut objects, and physical-phone performance/contrast playtests. The requested priority scene, title and fish are complete, with a first pass on all listed interior prop categories. Water reflects the sky/light rather than rendering a second mirrored world, to limit mobile cost.

### Integration with the newer main branch

Retained the v2.3 develop-at-any-time behavior and unpitched frog, drip and wood sounds. Its forest scheduler still referenced removed woodpecker/owl methods; restored filtered-noise woodpecker taps and fixed-frequency owl hoots so those random events cannot throw missing-method errors. The title and pond art remain in v2.4. `node --test scripts/forest-audio-check.mjs` forces both rare forest scheduler branches and verifies noise taps and constant-frequency hoots.

Post-merge validation: production build, all 23 browser checks, and the focused forest-audio regression check passed. Browser evidence for this rerun was written to a separate temporary directory to preserve the original review captures.

---

## v2.5: Passing thoughts
*Date: 2026-11-04*

### Goal
Let players experience a small part of practice during ordinary play: **noticing a thought arise, choosing whether to follow it, and letting wholesome thoughts (kindness, gratitude, appreciation) stay awhile**, without scores, penalties or moral labels.

### The mechanic
- **Thoughts arise on their own** as a brief line of first-person italic text above the controls, e.g. *"I could stay a little longer and watch the fish."* You can keep walking and looking while it's there. If you do nothing, it fades by itself, timed in real seconds; it pauses while your pointer or focus is on it.
- **Two quiet responses**, different for each kind of thought. No kind is ever named on screen; the distinction lives in the writing and in what each response opens up.
  - **Warm, grateful or appreciative thoughts:** *Linger with this* · *Let it pass*.
    - Lingering softens the music for a moment and gives a short line that savours the moment.
    - Some lingering opens something up:
      - **pond thoughts:** your view turns gently toward the water;
      - **"I hope the person sitting alone feels welcome here":** a *talk* opportunity, "The person on the bench", appears (also in Nearby). Visiting them is a small kindness that can go two ways, saying hello or sitting quietly together;
      - **"Sister Hien didn't have to take the time to explain the bell":** the next time you talk to her, you can thank her.
  - **Worries, judgements and impatience:** *Let it pass* · *Stay with it a moment*.
    - *Let it pass* acknowledges that the thought arose and returns attention to the world ("You notice the thought — useful, useful — and let it be there. The water goes on moving.").
    - *Stay with it a moment* lets the difficult feeling be present without fixing it ("You don't push it away. It's just here, like the clouds are here."). The music softens briefly.
- **When thoughts arise:**
  - **The pond path:** wanting to watch the fish, the lotus, light on the water, a wish for the person reading alone, "shouldn't I be more useful", comparing your walking pace, regret at missing the walking line, wishing the rain would stop.
  - **The tea house:** impatience after lingering there a while, replaying what you said, unsure whether to talk, gratitude for the quiet kitchen and the lavender. After a cup of tea: "Someone made this tea for whoever happened to come along."
  - **Photography,** a few seconds after you lower the camera: wanting to retake it, wondering if it'll look as good as it felt, looking through the camera more than looking, "I'm glad I noticed that", "I don't have to use every frame".
  - **Later, walking alone:** warmth about Sister Hien's kindness (a minute after talking with her, once nobody is near), or about the note from the kitchen.
  - **Quiet exploration anywhere:** footsteps in the quiet, the old trees, thinking of home, "am I getting enough out of this?".
- **Pacing:**
  - Thoughts are infrequent: about one every 3–4 minutes on *Now and then*, about every 6 on *Rarely*. There are long quiet stretches (sometimes 5–8 minutes) and at least about a minute and a half between thoughts.
  - Each thought appears at most twice per session and never repeats within the last ten.
  - A moment that just happened (a photo, tea) gets its chance before general thoughts.
- **Never in the camera:** raising the camera hides any thought at once, and none arise while the viewfinder is open. Photos are rendered offscreen from the 3D scene only, so page text can never be captured.
- **Off switch:** Settings → *Thoughts* → **Off / Rarely / Now and then** (default). The sitting meditation keeps its own returning thoughts, unchanged.
- **Files:** `src/story/thoughts.js` (writing and pacing), `src/ui/thought.js` (the thought line), wired into `src/main.js`. There are also two new scripts in `src/story/content.js` (the person on the bench, thanking Sister Hien).

### What was tested
Playwright in headless Chromium, production-style dev server, low quality, sound muted, 17 checks, all passing. A test hook (`thoughts.debugChance`) removes the long natural wait so a thought can be triggered within seconds.

| Check | Result |
|---|---|
| Walking along the pond path with **no input**, a thought arises on its own | ✅ (e.g. "It's so quiet I can hear my own footsteps.") |
| The player keeps moving while it's shown | ✅ moved ~3 m during display |
| Responses are offered and fit the kind of thought | ✅ |
| Left alone, it **fades by itself** | ✅ |
| Desktop click: *Let it pass* on a worry shows the acknowledgement and returns attention | ✅ |
| Desktop click: *Linger with this* on "watch the fish" turns the view toward the pond and stays a while | ✅ |
| Raising the camera hides the thought immediately | ✅ |
| No thought appears while the viewfinder is open, even after taking a photo | ✅ |
| The photo is saved (offscreen render, no page text) | ✅ |
| After lowering the camera, a photography thought arises | ✅ ("I'm glad I noticed that.") |
| Lingering at the tea house brings a tea-house thought | ✅ |
| Drinking tea brings the grateful tea thought | ✅ |
| Turning thoughts **Off** stops them, including event thoughts | ✅ |
| **Phone (touch tap):** *Stay with it a moment* works | ✅ |
| **Phone:** *Linger with this* on the reader thought opens "The person on the bench", listed in Nearby even if off-screen | ✅ |
| The person on the bench can be visited | ✅ |

Pacing was checked with a 20-run simulation of an hour of play (`ThoughtStream` in Node): about 16 thoughts/hour on *Now and then* (15 distinct, shortest gap 99 s, longest quiet stretch ~6 min), and about 10/hour on *Rarely* (shortest gap 217 s).

Fixed during testing:
- The fade counted game time, which runs slowly on very slow devices; it now uses real seconds.
- Pending moments (photo, tea) now take priority over general thoughts.
- The bench opportunity is now reachable from where the thought arises (icon range 30 m, plus a Nearby entry).

### Not yet tested
Real phones; how the writing lands for a first-time player; whether *Now and then* feels right over a longer session.

---

## v2.6: More natural people and wildlife
*Date: November 3, 2026 · follows the merged Plum Light art pass (`77992e1`)*

### Playtest feedback

The round facial attachments looked odd, and people and animals still read as collections of simple shapes.

### Changes

Replaced the human head attachments with a continuous sculpted head: chin, jaw, cheekbones, brow and nasal profile are part of its surface; ear outlines and facial features use subtle geometry/vertex shading. Shaped shoulders, waist, hips, hands and feet into more natural proportions, softened the sleeve/torso joins, and added cloth folds. Meditation, tea-bench and reading poses now have different limbs. Corrected the mismatch between modeled facing and walking direction, and gave standing figures a small alternating leg movement.

Rebuilt deer, fox, rabbit, heron, cat, squirrel, owl, small birds and koi with original anatomical cross-section meshes. Muzzles, haunches, shoulders, hocks, hooves/paws, ears and fins are shaped for their species; eyes are flush patches rather than spherical beads. Deer graze by bending a connected neck; deer/fox leg motion stays in merged meshes and follows their travel/bell slowdown. The owl's branch remains still. Existing routines, labels, interactions, save format and fish-photography path remain intact. Wildlife time/weather rebuilds release their retired model resources.

### Review and validation

See [the comparison gallery](characters/README.md) for front faces, figure poses, all rebuilt species, and people at walking distance on desktop and an emulated phone. Models use the existing painterly material; they are more anatomically shaped while retaining the game's stylized presentation. There are no external model/texture downloads or new application dependencies.

The repeatable model checks cover geometry/transforms, proportions and draw budgets, daily routines, wildlife rebuilds and fish bounds; the production browser checks cover the full existing exploration/save/touch/photography workflow. Detailed results are recorded after the final checks below.

Final results: production build passes (44 modules; JS approximately 206.65 KB gzip), all 14 new model checks and all 23 production browser checks pass, and the existing forest-audio check still passes. No JavaScript errors were observed. Existing v2 progress and film roll, navigation, touch camera/Stop, interactions, reduced-motion title and fish JPEG persistence/album all passed. [Recorded browser checks](characters/checks.json) and a [saved fish photograph](characters/fish-in-game.jpg) are included.

### Integration with passing thoughts

Retained the newer `main` passing-thought stream, settings, reader interaction and camera-hiding behavior while keeping the refined human/wildlife models. The passing-thoughts log remains v2.5; the character refinement is v2.6.

Post-merge validation: production build, all 14 model checks, all 23 production browser checks and the existing forest-audio check pass. A focused browser check also confirmed that the refined reader is recognized by the thought feature, lingering creates the bench interaction, and raising the camera hides the thought. No JavaScript errors were observed. Original comparison captures were preserved.

---

## v2.6: Music on the title screen
*Date: 2026-11-04*

### Your note
The title screen was silent; you wanted the music to play there by default.

### What changed
- **The music starts as soon as the title screen appears** (unless you've chosen Silent), and continues into the game.
- **Sound on / Silent take effect immediately** on the title screen, starting or stopping the music right away instead of only after Begin.
- **Browsers only allow sound after a tap, click or key press.** If a browser holds the sound back, a small note reads **"Tap anywhere for sound"**. The music then starts on the very first interaction anywhere on the title screen, and the note disappears.

### Tested (headless Chromium)
- **Autoplay allowed:** on load the audio is running and music is audible (peak 0.02) with no note. Silent fades it to nothing; Sound on brings it back; it continues after Begin.
- **Strict browser** (simulated: audio held until a real user interaction): before any tap the audio is suspended and "Tap anywhere for sound" shows. After one tap on an empty part of the title screen, the audio is running and the note is hidden.

---

## v2.7: Things that change, rare visitors, easier walking
*Date: 2026-11-05*

### Your playtest notes
- Add more changing, interactive things (like the broken tea bowl), and a few more passing thoughts, keeping to the Plum Village tradition.
- Some walking paths were awkward, and it was hard to look around while walking.
- The hut walls looked disconnected from the floor from outside.
- Occasionally show an animal that isn't normally there: an owl hooting at night, a hawk by day, a rare snake you can choose to meet with love rather than react to.
- Make sure the plum trees look like plum trees.
- Animals that don't go in water shouldn't walk into the pond.

### What changed
- **Things that change from day to day**, all in the spirit of the tradition:
  - **Join the walking meditation.** On mornings when the line is walking around the pond, a 🚶 *Join the walking meditation* symbol rides with the last walker. You fall in at the end and go round once at the line's slow pace (banner: "Walking meditation · slowly, with the line"). Stop or Esc leaves it gently.
  - **A child's pebble-meditation bag** appears on the pond bench from day 2. Inside are four pebbles and a card: "flower · mountain · water · space". You can hold the pebbles (four short, original lines), take the bag to the tea house (a child's drawing is pinned there later), or leave it. If you leave it, the next day the bag is gone but one pebble has been left behind on purpose; you can keep it or pass it on.
  - **Plum seedlings to water** at the orchard edge. They grow a little on their own and a little more each day you water them, until one puts out a few too-early blossoms. Rain waters them for you.
  - **A single lotus** near the bridge, changing every day: bud → opening → fully open (with a bee) → letting its petals go → seed pod → a new bud beside the pod, then round again. Looking at it notes when it has changed since you last looked.
  - **The broken tea bowl comes back mended** two days later. The piece is set back with a thin bright line of lacquer: "It isn't hidden. It's part of the bowl now."
- **More passing thoughts** (39 in total, up from 26), including:
  - "Yesterday it was still a bud." (lotus)
  - "Someone will sit under these trees one day." (watering)
  - "It's more beautiful with the crack than it was without it." (mended bowl)
  - "I liked walking with everyone." (after the walking meditation)
  - a startle at the snake, and wanting to share the hawk
  - general ones: breathing, the ground holding you up, planning tomorrow, judging someone, old plum trees, the cooks up before dawn.

  Slightly more frequent: about 19 an hour on *Now and then* (at least about a minute apart, with quiet stretches up to about 5 minutes), about 11 an hour on *Rarely*.
- **Rare visitors.** They're not there every day, and the same for a given day and time, so reloading doesn't change them:
  - **a hawk** circling high on clear mornings and afternoons, with an occasional far-off cry;
  - **an owl gliding across the valley** on some nights, hooting as it passes;
  - **a snake** resting on warm stones by a path. It never flees or threatens. Its choices are *Breathe, and wish it well*, *Step back and give it room*, or *Stay still and simply watch*. Each is kind, and afterwards it slides away into the grass.
- **Looking around while walking:**
  - The view no longer snaps back to face each waypoint. Auto-facing now waits until you haven't looked around for about 5 seconds, aims smoothly at a point a few metres ahead, and turns more gently.
  - Routes are rounded off at corners.
  - If something briefly blocks a step, the walk moves on instead of getting stuck.
- **Buildings sit on their bases.** The hut's stone footing now reaches the floor, with a wooden sill under the walls; it previously left a 15 cm gap. The meditation hall had the same gap and is fixed. The tea house gets a stone plinth so it never floats on the slope.
- **Plum trees** rebuilt to look like plum trees:
  - a short gnarled trunk with rounded knuckles, and angular zig-zag limbs with thin upright twigs;
  - in **late spring** (the game's season), full small leaves with young green plums, a few starting to blush, matching the in-game description.

  Blossom, as small flowers along the twigs, is supported for when seasons arrive.
- **Land animals stay out of the pond:** deer, fox, rabbits, squirrels, ground birds, the cat and the snake. After every movement step, if one would end up in the pond or inside a building, it stays put and turns away. The heron is allowed to wade.

### What was tested (headless Chromium, low quality)
- ✅ 33 land animals placed at the shore and sent straight at the water for 400 steps: the closest any got was 1.18 (the pond's edge is 1.0).
- ✅ The rare visitors are rare: in 120 sampled day-times, the snake appeared 30 times and the hawk 35. An owl glide was found on day 3 at night.
- ✅ The snake offers three calm choices, and slides away afterwards.
- ✅ The pebble bag is absent on day 1 and present on day 2. Holding the pebbles works. Left on the bench, the next day the bag is gone and one pebble remains.
- ✅ The lotus stages follow the days (`[0,1,2,3,4,5,0]`), and the description matches the day's stage.
- ✅ Watering the seedlings advances them (stage 1 → 2).
- ✅ The broken bowl reappears mended two days later.
- ✅ Joining the walking meditation sets a slow pace (0.38 m/s) and shows the banner. Esc leaves it, restores normal pace, and doesn't open the menu.
- ✅ After you look around mid-walk, the view stays put (yaw unchanged over 2.5 s) while walking continues.
- ✅ Visual checks: the hut wall sits on its base; the plum orchard is in leaf.
- Pacing simulation: ~19 thoughts/hour (*Now and then*) and ~11/hour (*Rarely*).

The playtest itself needed two fixes along the way; neither was a game bug. The test waited on dialogs it was supposed to click through, and one check expected the wrong day's lotus text.

### Not yet tested
Real phones; how the new moments feel across several in-game days; whether the hawk cry and owl hoots sound natural.
