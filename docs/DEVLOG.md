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

### Playtest notes
*(Add your notes here after playing. See `PLAYTEST.md`.)*

### Ideas for v2 (to be decided after playtesting)
- Kitchen and forest path, the days-and-seasons system, a rain-interrupted plan, and the mending of the bowl.
