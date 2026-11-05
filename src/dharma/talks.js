// The Dharma Library: recorded talks you can listen to in the meditation hall.
//
// The MP3 files in public/audio/dharma/ are the original AudioDharma downloads,
// unchanged (Creative Commons NoDerivatives: no trimming or re-encoding). Each
// begins with the same ~9 s AudioDharma announcement and a few seconds of room
// sound, so `start` is the moment the teacher's own words begin; the player
// always starts and restarts there. The teacher's opening remarks are kept.
//
// How `start` was found: each file was transcribed in short windows and its
// loudness measured every 0.1 s. `start` sits ~0.1–0.3 s before the first
// syllable of the teaching, after the announcement and the silence that follows.
// `sha256` identifies the exact file each timestamp was measured on.

export const LIBRARY_WELCOME = 'There is no need to hurry. Choose a teaching and listen for as long as you wish.';

const BY_NC_ND_3 = { name: 'CC BY-NC-ND 3.0', url: 'https://creativecommons.org/licenses/by-nc-nd/3.0/' };
const BY_NC_ND_4 = { name: 'CC BY-NC-ND 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' };

/** In the order they appear in the library. */
export const TALKS = [
  {
    id: 'look-behind-your-thoughts',
    title: 'Practice Note: Look Behind Your Thoughts',
    teacher: 'Gil Fronsdal',
    date: '2010-12-08',
    place: 'Insight Meditation Center, Redwood City, California',
    file: '20101208-Gil_Fronsdal-IMC-practice_note_look_behind_your_thoughts.mp3',
    sha256: '711802f6049b47f05a87fc512e245792e3ac669954cdefbcc38379f558d1ec2d',
    fileSeconds: 221.70,
    // announcement ends 8.6 s; "I would like to say a few words about the practice" begins 11.0 s
    start: 10.7,
    description: 'Many of us live inside our thinking, in words and pictures. A short invitation to feel your way behind the thoughts — to the mood and felt sense of being alive right now — and to let your practice rest there.',
    source: 'http://www.audiodharma.org/talks/audio_player/2195.html',
    license: BY_NC_ND_3,
  },
  {
    id: 'simply-becoming-available',
    title: 'Practice Notes: Simply Becoming Available',
    teacher: 'Diana Clark',
    date: '2026-05-06',
    place: 'Insight Meditation Center, Redwood City, California',
    file: '20260506-Diana_Clark-IMC-practice_notes_simply_becoming_available.mp3',
    sha256: '626feb54d4bb39a214ab922577c87060abcdf57b8179a4d49ff7b12e2c43ce2f',
    fileSeconds: 172.32,
    // announcement ends 9.2 s, then silence; "I'm just saying a few notes…" begins 12.0 s
    start: 11.9,
    description: 'We can’t force ourselves to feel settled or well. A gentle reflection on becoming available to what is actually here — receiving each step and each breath instead of managing it.',
    source: 'https://www.audiodharma.org/talks/25410.html',
    license: BY_NC_ND_4,
  },
  {
    id: 'dont-carry-the-past',
    title: 'Practice Notes: Don’t Carry the Past',
    teacher: 'Gil Fronsdal',
    date: '2013-01-09',
    place: 'Insight Meditation Center, Redwood City, California',
    file: '20130109-Gil_Fronsdal-IMC-practice_notes_dont_carry_the_past.mp3',
    sha256: 'b4039907c63cea24d30b48f8f2ab3f1f74a610cd1ee2bfa2595ba24c44589f50',
    fileSeconds: 173.35,
    // announcement ends 8.6 s, then room sound; "A few words about practicing…" begins 12.7 s
    // (the recording itself picks the teacher up at "A few words"; nothing earlier exists)
    start: 12.5,
    description: 'Each time you remember to be mindful, you can begin again. On putting down the weight of the past — a moment ago or years ago — kindly, so each moment can be a fresh start.',
    source: 'http://www.audiodharma.org/talks/audio_player/3837.html',
    license: BY_NC_ND_3,
  },
  {
    id: 'gripping-and-opening',
    title: 'Practice Notes: Gripping and Opening',
    teacher: 'Diana Clark',
    date: '2026-10-21',
    place: 'Insight Meditation Center, Redwood City, California',
    file: '20261021-Diana_Clark-IMC-practice_notes_gripping_and_opening.mp3',
    sha256: '1f1ca203b64c691ebdb86dec8a71971a59b59ce5bf523e23d752be17124faae8',
    fileSeconds: 160.73,
    // announcement ends 9.2 s, then silence; "So this morning I'd like to offer…" begins 12.0 s
    start: 11.9,
    description: 'An encouragement to play and explore the felt difference between holding on and softening the grip — especially with thoughts, plans and opinions — without demanding that anything be put down.',
    source: 'https://www.audiodharma.org/talks/26484.html',
    license: BY_NC_ND_4,
  },
];

export const talkUrl = (t) => `${import.meta.env.BASE_URL}audio/dharma/${t.file}`;
/** Length of the teaching itself (from its start to the end of the file). */
export const teachingSeconds = (t, fileSeconds = t.fileSeconds) => Math.max(0, fileSeconds - t.start);
