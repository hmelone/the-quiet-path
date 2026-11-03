# More natural people and wildlife

This follow-up addresses the visible round dots on faces and the primitive-looking character and animal shapes in the Plum Light art pass. It builds on the merged art iteration, `main` at `77992e1`.

## People

The nose, brow, cheek, jaw and ear outline are now part of one sculpted head surface. Eyes and mouth use restrained vertex-painted shading rather than attached balls. Heads, shoulders, waists, hands and feet have more natural proportions. Cloth follows the shoulders and drapes into robe folds. Tea-bench sitting and cross-legged meditation have different leg and arm poses. Standing figures face their walking direction and use a small alternating step.

| Before | After |
| --- | --- |
| ![Original attached facial spheres](face-before.jpg) | ![Integrated facial profile](face-after.jpg) |
| ![Original figure forms](people-before.jpg) | ![Standing and seated figures](people-after.jpg) |

[In the retreat, about four metres away](people-walking-distance.jpg) · [Phone view](people-phone.jpg)

The close-ups use the actual game meshes and materials in a neutral review scene. Both versions face the camera; the old geometry needed a half-turn because its modeled front opposed its walking direction. Seated review figures are grounded for comparison; in the game, chair poses use the existing bench locations. These are deliberately stylized, modest-detail figures, with anatomy and fabric silhouettes emphasized over fine skin detail.

## Wildlife

Each species has its own tapered torso, shaped muzzle, folded ears, haunches, joints and paws or hooves. Eyes sit flush with the surface. Fish have a tapered head/body, flatter fins and a separate moving tail. Deer necks bend at the shoulder for grazing, while deer and fox legs move with their travel. The owl's supporting branch stays still.

| Species | Before | After |
| --- | --- | --- |
| Deer | ![Deer before](deer-before.jpg) | ![Deer after](deer-after.jpg) |
| Fox | ![Fox before](fox-before.jpg) | ![Fox after](fox-after.jpg) |
| Rabbit | ![Rabbit before](rabbit-before.jpg) | ![Rabbit after](rabbit-after.jpg) |
| Heron | ![Heron before](heron-before.jpg) | ![Heron after](heron-after.jpg) |
| Sleeping cat | ![Cat before](cat-before.jpg) | ![Cat after](cat-after.jpg) |
| Koi | ![Koi before](koi-before.jpg) | ![Koi after](koi-after.jpg) |
| Owl | ![Owl before](owl-before.jpg) | ![Owl after](owl-after.jpg) |
| Squirrel | ![Squirrel before](squirrel-before.jpg) | ![Squirrel after](squirrel-after.jpg) |
| Small bird | ![Small bird before](groundBird-before.jpg) | ![Small bird after](groundBird-after.jpg) |

## Implementation and review

All models are original procedural meshes in `src/world3d/human-model.js` and `animal-models.js`; there are no new downloaded models, textures or dependencies. The custom mesh sections describe anatomy and cloth directly. Most animals remain one merged draw call; the deer has a second neck/head mesh and fish have a moving tail. Standing humans use three meshes to allow alternating legs; seated humans use one.

To inspect in game, walk by the pond's meditation line or the tea terrace; look for deer and foxes at dawn/evening, and the cat on the hall veranda. Existing saves, character routines, look interactions and photo subject names are preserved. The title and environment artwork remain as in Plum Light.

Reproduce the visual review with `npm run dev` followed by `python scripts/character-review.py`. The script requires Python Playwright and Chromium, and defaults to the dev server on port 5173. `CHARACTER_URL`, `CHARACTER_OUTPUT` and `CHARACTER_LABEL` select a baseline server, output directory and before/after labels. Original baseline captures came from an untouched archive of `77992e1`.

Model checks: `node scripts/human-model-check.mjs` and `node scripts/wildlife-model-check.mjs`. The existing production browser smoke checks additionally exercise saves, navigation, touch interaction and real fish photographs. Phone captures are browser emulation; physical-device performance remains a playtest item.

Final validation: production build passes; all 11 human-model checks, 3 wildlife-model checks, 23 production browser checks and the existing forest-audio regression check pass. There were no JavaScript errors. [Browser results](checks.json) · [Actual saved photo of the reshaped fish](fish-in-game.jpg). The browser checks used software WebGL and an emulated touch viewport, not physical-phone hardware.
