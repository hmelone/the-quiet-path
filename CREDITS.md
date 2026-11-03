# Credits

**Design & direction:** the project author (class project).
**Development assistance:** Claude Code; Codex (Plum Light art iteration).

## Art
The playable world is built and painted procedurally in original code (`src/world3d/`, `src/paint/`), including the plum trees, sculpted human and wildlife meshes (`human-model.js`, `animal-models.js`), fish and interior props. The two original title illustrations were created with OpenAI image generation for this project, then optimized as locally served WebP assets. See [`public/art/README.md`](public/art/README.md) for provenance and sizes. No third-party models, stock images or textures were imported. The retreat and its architecture are fictional; the illustrations are not depictions of an actual Plum Village site.

## Sound & music
All sound and music is synthesised in the browser with the Web Audio API (`src/audio/`). There are no recorded samples.

If CC0 textures or recordings are added in later iterations (for example from Poly Haven or Freesound's CC0 filter), list each one here with its source URL and licence.

## Fonts (loaded from Google Fonts)
- Cormorant Garamond: SIL Open Font License 1.1
- Source Sans 3: SIL Open Font License 1.1
- Atkinson Hyperlegible: SIL Open Font License 1.1 (Braille Institute)

## Libraries
- [Three.js](https://threejs.org/): MIT
- [Vite](https://vitejs.dev/): MIT
- [idb-keyval](https://github.com/jakearchibald/idb-keyval): Apache-2.0
