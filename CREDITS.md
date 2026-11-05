# Credits

**Design & direction:** the project author (class project).
**Development assistance:** Claude Code; Codex (Plum Light art iteration).

## Art
The playable world is built and painted procedurally in original code (`src/world3d/`, `src/paint/`), including the plum trees, sculpted human and wildlife meshes (`human-model.js`, `animal-models.js`), fish and interior props. The two original title illustrations were created with OpenAI image generation for this project, then optimized as locally served WebP assets. See [`public/art/README.md`](public/art/README.md) for provenance and sizes. No third-party models, stock images or textures were imported. The retreat and its architecture are fictional; the illustrations are not depictions of an actual Plum Village site.

## Sound & music
All ambient sound, music and bells are synthesised in the browser with the Web Audio API (`src/audio/`). The only recorded audio is the talks in the Dharma Library (below).

## Dharma Library recordings
The four talks in `public/audio/dharma/` are included **unchanged**: same bytes as the AudioDharma downloads, with no trimming or re-encoding, as the NoDerivatives licences require. The player skips AudioDharma's ~9-second spoken announcement by starting each file at a stored timestamp (`src/dharma/talks.js`). AudioDharma and the Insight Meditation Center are not affiliated with this project and do not endorse it.

| Talk | Teacher | Recorded | Source | Licence |
|---|---|---|---|---|
| Practice Note: Look Behind Your Thoughts | Gil Fronsdal | 8 Dec 2010, Insight Meditation Center | <http://www.audiodharma.org/talks/audio_player/2195.html> | [CC BY-NC-ND 3.0](https://creativecommons.org/licenses/by-nc-nd/3.0/) |
| Practice Notes: Simply Becoming Available | Diana Clark | 6 May 2026, Insight Meditation Center | <https://www.audiodharma.org/talks/25410.html> | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) |
| Practice Notes: Don't Carry the Past | Gil Fronsdal | 9 Jan 2013, Insight Meditation Center | <http://www.audiodharma.org/talks/audio_player/3837.html> | [CC BY-NC-ND 3.0](https://creativecommons.org/licenses/by-nc-nd/3.0/) |
| Practice Notes: Gripping and Opening | Diana Clark | 21 Oct 2026, Insight Meditation Center | <https://www.audiodharma.org/talks/26484.html> | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) |

Titles, dates, source links and licences come from the metadata embedded in each MP3. The two Gil Fronsdal recordings carry **CC BY-NC-ND 3.0**, not 4.0. Both licences allow sharing a talk unchanged, non-commercially and with attribution, which is how this class project uses them. The source pages couldn't be opened from the development environment, so the links and licences were taken from each file's own metadata rather than checked on the site.

If CC0 textures or recordings are added in later iterations (for example from Poly Haven or Freesound's CC0 filter), list each one here with its source URL and licence.

## Fonts (loaded from Google Fonts)
- Cormorant Garamond: SIL Open Font License 1.1
- Source Sans 3: SIL Open Font License 1.1
- Atkinson Hyperlegible: SIL Open Font License 1.1 (Braille Institute)

## Libraries
- [Three.js](https://threejs.org/): MIT
- [Vite](https://vitejs.dev/): MIT
- [idb-keyval](https://github.com/jakearchibald/idb-keyval): Apache-2.0
