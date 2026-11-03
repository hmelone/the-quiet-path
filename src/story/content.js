// Everything the player can read, choose and discover.
// Scripts receive `api` (see story/engine.js). Text is short, second person,
// and never grades the player. Cultural details are checked in docs/RESEARCH.md.

export const THOUGHTS = [
  'Did I answer that message before I left?',
  'What will I say when someone asks what I did here?',
  'I should be doing something more useful.',
  'Am I doing this right?',
  'That conversation last week. I should have said it differently.',
  'My knee aches a little.',
  'I wonder what’s for dinner.',
  'How long have I been sitting?',
  'I wish I’d brought a better camera.',
  'The light was beautiful on the steps this morning. I should have taken a picture.',
];

const FOLLOW = [
  'You follow it. It leads to another thought, and that one to another. A small story builds itself, scene by scene.',
  'You turn it over. Then turn it again. Somewhere along the way you started planning a reply to someone who isn’t here.',
  'It unfolds into a list, and the list into a worry, and the worry into a memory you hadn’t meant to visit.',
];
const RETURN = [
  'Then a sound — water, wind, a bird — and you notice you’ve been away. You come back.',
  'Then your breath, simply happening. You notice you’ve wandered, and that’s enough. You come back.',
  'Then the cool air on your hands. You come back to here.',
];

export const PROMPTS = [
  'Notice something you usually overlook.',
  'Find something changing.',
  'Photograph something that won’t be here tomorrow.',
  'Find a small thing that someone takes care of.',
  'Look for light touching something rough.',
  'Find something worn smooth by time.',
  'Notice what the rain changes.',
  'Photograph a place where nothing seems to be happening.',
];

const bowNote = 'Bringing your palms together and bowing is a common gesture of respect and gratitude here.';

export const SCRIPTS = {
  // --- gate ----------------------------------------------------------------
  async gateNotice(api) {
    await api.say({
      title: 'A notice board',
      text: 'A sheet of paper is pinned under a little roof, the ink a little faded by weather. ' +
        'Beside the brushed characters, someone has added a note in careful English:',
      quote: 'Welcome. Your room is past the garden, on the left. The bells mark the day here; there is no need to hurry. ' +
        'Please walk quietly near the hall when the board has been struck. — from the guest master',
    });
    api.setFlag('readWelcome');
  },
  async jizo(api) {
    const c = await api.say({
      title: 'A small stone figure',
      text: 'A small, round-headed stone figure stands beside the steps, worn smooth by many winters. ' +
        'It wears a red cloth bib, a little faded. Someone has left a single fresh camellia at its feet.',
      choices: [
        { id: 'bow', label: 'Bow, palms together' },
        { id: 'look', label: 'Look a while longer' },
        { id: 'go', label: 'Leave it be' },
      ],
    });
    if (c === 'bow') {
      api.setFlag('bowedJizo');
      await api.say({ text: 'You bow. The stone is cool and quiet. A drop of water falls from the camellia’s petal.', note: bowNote });
    } else if (c === 'look') {
      await api.say({ text: 'Moss has crept into the folds of its robe. Its eyes are nearly closed, its face gently smiling — or perhaps that is only the wearing of the stone.' });
    }
  },
  async roadDown(api) {
    await api.say({ text: 'The road winds back down the mountain toward the village and the bus stop. You’ve only just arrived. The steps are behind you.' });
  },

  // --- garden ----------------------------------------------------------------
  async bowl(api) {
    for (;;) {
      const c = await api.say({
        title: 'Beside the water basin',
        text: 'Someone has left a tea bowl on the moss beside the stone basin. A piece has broken from its rim — a fresh break, pale against the brown glaze. ' +
          'The small piece lies in the moss nearby.',
        choices: [
          { id: 'look', label: 'Look closer' },
          { id: 'veranda', label: 'Gather both pieces and set them on the veranda, out of harm’s way' },
          { id: 'kitchen', label: 'Carry them to the kitchen door' },
          { id: 'left', label: 'Leave them as they are' },
        ],
      });
      if (c === 'look') { await api.closeup('bowlCloseup'); return; }
      api.setFlag('bowl', c);
      api.setFlag('bowlStamp', api.stamp);
      api.setFlag('bowlDay', api.day);
      if (c === 'veranda') {
        await api.say({ text: 'You lift the bowl in both hands. It is lighter than it looks, and still a little cool from the night. You set it on the edge of the veranda with the piece tucked inside, where someone will see it.' });
      } else if (c === 'kitchen') {
        api.setFlag('noteWaiting', 'kitchen');
        await api.say({ text: 'You follow the smell of wood smoke around the side of the hall. The kitchen door is open; steam drifts out, and someone is humming. You set the bowl on the step, the piece inside it. The humming pauses — then carries on.' });
      } else {
        await api.say({ text: 'You leave the bowl where it is. It sits in the moss as if it has always been there.' });
      }
      api.repaint();
      return;
    }
  },
  async pressedMoss(api) {
    await api.say({ text: 'Where the bowl had been, the moss is pressed into a small, round hollow. Already a few tips are lifting back toward the light. In a few days there will be no sign at all.' });
    api.setFlag('sawPressed');
  },
  async basin(api) {
    const c = await api.say({
      title: 'The water basin',
      text: 'A low stone basin, fed by a thin stream of water from a bamboo spout. A wooden ladle rests across it. ' +
        'The basin is set low, so that anyone using it must crouch.',
      choices: [
        { id: 'wash', label: 'Crouch and rinse your hands' },
        { id: 'listen', label: 'Listen to the water' },
        { id: 'go', label: 'Stand up' },
      ],
    });
    if (c === 'wash') await api.say({ text: 'You crouch, scoop water with the ladle, and pour it over one hand, then the other. The water is mountain-cold. You set the ladle back as you found it.' });
    if (c === 'listen') await api.say({ text: 'The water falls in a thin thread, then breaks into small sounds against the surface — never quite the same twice.' });
  },
  async lantern(api) {
    const c = await api.say({
      title: 'Stone lantern',
      text: 'A stone lantern, taller than you, its roof softened by a thick cap of moss. The little window of its firebox is dark.',
      choices: [{ id: 'close', label: 'Look closely at the moss' }, { id: 'go', label: 'Step back' }],
    });
    if (c === 'close') await api.closeup('lanternCloseup');
  },
  async han(api) {
    await api.say({
      title: 'A wooden board',
      text: 'A thick wooden board hangs from cords by the hall entrance, with a wooden mallet beside it. The centre is worn pale and hollow from years of striking. ' +
        'Characters are brushed across it, faded. A card beneath gives one English rendering:',
      quote: 'Birth and death are a great matter. Impermanence is swift. Wake up — do not waste this life.',
      note: 'The board is struck to call people to sitting. Only those whose job it is strike it.',
    });
    api.setFlag('readHan');
  },
  async sitVeranda(api) { await api.sit('veranda'); },

  // --- pond -------------------------------------------------------------------
  async sitPond(api) { await api.sit('pond'); },
  async koi(api) {
    await api.say({ text: 'Orange and white shapes move beneath the surface, unhurried. One rises, touches the underside of a reflection, and sinks again. Rings spread, and the reflected trees tremble, then settle.' });
  },
  async pavilion(api) {
    const seen = api.flag('sawPavilion');
    api.setFlag('sawPavilion');
    await api.say({
      text: seen
        ? 'The little shelter waits across the water. The path around the far side of the pond is overgrown with ferns. Perhaps another day.'
        : 'Across the water, a small roofed shelter stands among the maples. There seems to be a bench inside. The path around the pond disappears into ferns — you can’t see the way.',
    });
  },
  async iris(api) {
    await api.say({ text: 'Irises crowd the water’s edge, deep violet, each petal marked with a thin stroke of yellow. Some are just opening. A few are already curling, finished.' });
  },
  async frog(api) {
    await api.say({ text: 'A small green frog sits on a lily pad, perfectly still, throat pulsing. It seems to be watching the rain — or nothing at all.' });
    api.setFlag('sawFrog');
  },

  // --- zendo ------------------------------------------------------------------
  async sitZendo(api) { await api.sit('zendo'); },
  async altar(api) {
    const c = await api.say({
      title: 'The altar',
      text: 'At the far end of the hall, a small altar: a candle, a bowl of ash with a single stick of incense, a few flowers in a plain vase. ' +
        'Behind them, in shadow, a seated figure. From here you can’t make out its face.',
      choices: [{ id: 'bow', label: 'Bow, palms together' }, { id: 'go', label: 'Step back' }],
    });
    if (c === 'bow') {
      api.setFlag('bowedAltar');
      await api.say({ text: 'You bow. The incense thread rises straight, then bends, then breaks into curls.', note: bowNote });
    }
  },
  async windows(api) {
    await api.say({ text: api.isDark ? 'The paper windows are dark blue now, faintly lit from outside. The lamps make soft circles on the floor.' : 'Light comes through the paper, softened, so the whole hall glows evenly. Shadows of leaves move across one panel, then are still.' });
  },
  async card(api) {
    await api.say({
      title: 'A small card',
      text: 'A handwritten card is pinned to the post:',
      quote: 'Guests are welcome to sit. Please enter quietly, and leave your shoes outside. Photographs are welcome when no one is sitting — but please, never of the altar during a ceremony.',
    });
    api.setFlag('readCard');
  },

  // --- quarters ---------------------------------------------------------------
  async futon(api) {
    if (api.time >= 3) {
      const c = await api.say({
        title: 'Your futon',
        text: api.time === 4 ? 'The night has settled in. Your futon is folded in the corner.' : 'The evening light is fading. You could unroll your futon and rest until morning.',
        choices: [{ id: 'sleep', label: 'Sleep until morning' }, { id: 'stay', label: 'Not yet' }],
      });
      if (c === 'sleep') await api.sleep();
    } else {
      const c = await api.say({
        text: 'Your futon is folded neatly. It’s still day. You could lie down for a while.',
        choices: [{ id: 'rest', label: 'Rest a while (let time pass)' }, { id: 'stay', label: 'Not now' }],
      });
      if (c === 'rest') await api.passTime('You lie back and listen to the room. When you open your eyes, the light has moved.');
    }
  },
  async bell(api) {
    const c = await api.say({
      text: 'A small bell sits on a cushion on your desk. Ringing it is a way of marking a moment — and of letting the next one come.',
      choices: [{ id: 'ring', label: 'Ring the bell and let time pass' }, { id: 'stay', label: 'Leave it' }],
    });
    if (c === 'ring') await api.passTime(null, true);
  },
  async desk(api) {
    const p = api.prompt();
    const c = await api.say({
      title: 'Paper slips',
      text: 'A small stack of paper slips sits on the desk, each with a line written in pencil. You turn one over:',
      quote: p,
      note: 'Prompts are just invitations. Nothing is checked or counted.',
      choices: [{ id: 'keep', label: 'Keep it in mind' }, { id: 'another', label: 'Turn over another' }, { id: 'none', label: 'Put them back' }],
    });
    if (c === 'keep') api.keepPrompt(p);
    else if (c === 'another') return SCRIPTS.desk(api);
    else api.keepPrompt(null);
  },
  async note(api) {
    const which = api.flag('noteWaiting');
    const text = which === 'kitchen'
      ? 'Thank you for bringing back the bowl. It has been in this kitchen longer than I have. I will see what can be done with it — some things are worth mending slowly.'
      : 'Someone set the bowl somewhere safe for me. If it was you — thank you. It was my teacher’s. I had been looking for the missing piece.';
    await api.say({ title: 'A folded note', text: 'The paper is soft and thin. The writing is quick and kind:', quote: text + ' — from the kitchen' });
    api.setFlag('noteWaiting', false);
    api.setFlag('readCookNote', which);
    api.repaint();
  },
  async darkroom(api) { await api.develop(); },
  async alcove(api) {
    await api.say({ text: 'In the alcove hangs an ink painting: a few grey washes for mountains, a lot of empty paper for mist. Beneath it, a single flower in a slim vase. Someone changes the flower; you wonder when.' });
  },
};

/** Returning-thought moments while sitting. */
export function thoughtFollow(rng) {
  return { follow: FOLLOW[Math.floor(rng() * FOLLOW.length)], back: RETURN[Math.floor(rng() * RETURN.length)] };
}

/** Things that happen when you arrive somewhere. */
export async function onEnter(placeId, api) {
  const t = api.time;
  if (placeId === 'gate' && !api.flag('arrived')) {
    api.setFlag('arrived');
    api.whisper('The bus left you where the road ends. Stone steps climb into the mist.', 7000);
    setTimeout(() => api.whisper('Look around by dragging. Tap anything that catches your eye.', 6000), 7600);
    return;
  }
  if (placeId === 'garden') {
    if (!api.flag('heardSweep') && t <= 1) {
      api.setFlag('heardSweep');
      api.audio.sweep();
      api.whisper('Somewhere beyond the wall, someone is sweeping.');
    }
    // bowl on the veranda: someone comes for it
    if (api.flag('bowl') === 'veranda' && !api.flag('bowlCollected') && api.stamp > (api.flag('bowlStamp') ?? 0)) {
      api.setFlag('bowlCollected');
      api.setFlag('noteWaiting', 'veranda');
      setTimeout(() => {
        api.audio.otherFootsteps();
        api.whisper('Footsteps pause on the veranda, where you left the bowl. A long, quiet moment. Then they go on, toward the kitchen.', 8000);
        setTimeout(() => api.repaint(), 5000);
      }, 2500);
    }
    if (api.flag('bowl') === 'left' && !api.flag('bowlTaken') && api.day > (api.flag('bowlDay') ?? 99)) {
      api.setFlag('bowlTaken');
      api.repaint();
    }
    if ((t === 0 || t === 3) && api.flag('hanHeard') !== `${api.day}-${t}`) {
      api.setFlag('hanHeard', `${api.day}-${t}`);
      setTimeout(() => api.audio.han(), 1500);
      setTimeout(() => api.whisper('From the hall: a wooden board, struck slowly, then faster. People are gathering to sit.'), 2000);
    }
  }
  if (placeId === 'zendo' && (t === 0 || t === 3)) {
    api.whisper('A few people sit facing the wall in silence. No one looks up. A cushion near the door is free.', 7000);
  }
  if (placeId === 'quarters' && api.flag('noteWaiting') && !api.flag('noteSeen')) {
    api.setFlag('noteSeen');
    api.whisper('There’s a folded note on your desk.');
  }
  if (placeId === 'pond' && api.weather === 'rain' && !api.flag('pondRain')) {
    api.setFlag('pondRain');
    api.whisper('Rain stipples the whole pond. The reflections have broken into a thousand pieces.');
  }
}

/** Messages when a new day begins. */
export function dayIntro(day, weather) {
  if (day === 2 && weather === 'rain') return 'Rain on the roof before you open your eyes. Whatever you had planned for today, the day has its own plans.';
  const w = {
    clear: 'A clear morning. The mountains are sharp against the sky.',
    mist: 'Mist has settled in the valley overnight.',
    overcast: 'A soft grey morning. No shadows anywhere.',
    rain: 'It’s raining. Water drips steadily from the eaves.',
    snow: 'Snow fell in the night.',
  };
  return w[weather] || '';
}
