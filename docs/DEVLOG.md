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
