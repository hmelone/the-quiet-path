// Everything the player can read, choose and discover — in the spirit of
// the Plum Village tradition. All phrases here are original writing; see
// docs/RESEARCH.md for the practices they draw on and what to verify.

export const THOUGHTS = [
  'Did I answer that message before I left?',
  'What will I say when someone asks what I did here?',
  'I should be doing something more useful.',
  'Am I doing this right?',
  'That conversation last week. I should have said it differently.',
  'My knee aches a little.',
  'I wonder what’s for lunch.',
  'How long have I been sitting?',
  'I wish I’d brought a better camera.',
  'The light on the pond this morning — I should have photographed it.',
];

const FOLLOW = [
  'You follow it. It leads to another thought, and that one to another. A small story builds itself, scene by scene.',
  'You turn it over. Then turn it again. Somewhere along the way you started planning a reply to someone who isn’t here.',
  'It unfolds into a list, and the list into a worry, and the worry into a memory you hadn’t meant to visit.',
];
const RETURN = [
  'Then a sound — water, wind, a bird — and you notice you’ve been away. You come back, without scolding yourself.',
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
  'Photograph someone’s work, without the person in it.',
];

const bowNote = 'Here, people often join their palms like a lotus bud and bow — to a teacher, a friend, a meal, or simply a moment.';

export const SCRIPTS = {
  // --- gate & forest ------------------------------------------------------------
  async gateBoard(api) {
    await api.say({
      title: 'The mountain gate',
      text: 'A wooden board hangs from the beam, the brushstrokes softened by weather.',
      quote: 'Slow down. You are here.',
      note: 'Beneath it, a smaller card: “Welcome. Your hut is at the bottom of the valley, past the pond. When you hear a bell, you’re invited to stop and breathe. There is no need to hurry.”',
    });
    api.setFlag('readWelcome');
  },
  async phraseStone(api) {
    await api.say({ text: 'A flat stone at the side of the path. Someone has brushed a line on it in dark ink, already fading:', quote: 'Here is a good place to begin.' });
  },
  async roadDown(api) {
    await api.say({ text: 'The road winds back down the mountain toward the village and the bus stop. You’ve only just arrived. The path ahead goes down into the valley.' });
  },
  async stream(api) {
    const c = await api.say({ text: 'A small stream runs over stones beside the path, clear and quick. It doesn’t seem to be in a hurry, exactly — just going.', choices: [{ id: 'listen', label: 'Listen for a while' }, { id: 'go', label: 'Walk on' }] });
    if (c === 'listen') await api.say({ text: 'Up close the sound is many sounds: a low murmur, a bright tick, a small hollow knock where water drops into a pool. None of them repeats exactly.' });
  },
  async cedar(api) {
    await api.say({ text: 'An old cedar, wider than your arms can reach. Moss climbs its north side. The bark comes away in long soft strips. It was here long before the gate, and will likely be here after.' });
  },

  // --- bell tower ----------------------------------------------------------------
  async towerBell(api) {
    const c = await api.say({
      title: 'The great bell',
      text: 'A bronze bell hangs in the open tower, darker where hands have touched it. A wooden log on ropes hangs beside it, for sounding it.',
      note: 'Here people speak of inviting the bell, rather than striking it.',
      choices: [{ id: 'invite', label: 'Invite the bell' }, { id: 'look', label: 'Just look' }],
    });
    if (c === 'invite') {
      await api.say({ text: 'You draw the log back, and wait for one breath. Then you let it go, softly, with a small wish:', quote: 'May whoever hears this, wherever they are, stop for a moment and breathe.' });
      api.setFlag('invitedBell', (api.flag('invitedBell') || 0) + 1);
      await api.bell('you');
    }
  },
  async sitTower(api) { await api.sit('tower'); },

  // --- meditation hall --------------------------------------------------------------
  async sitHall(api) { await api.sit('hall'); },
  async sitHallYard(api) { await api.sit('yard'); },
  async altar(api) {
    const c = await api.say({
      title: 'The altar',
      text: 'A low altar: a seated figure of the Buddha, small and simple; a candle; a few flowers in a white vase; a bowl of incense ash. Nothing more.',
      choices: [{ id: 'bow', label: 'Join your palms and bow' }, { id: 'go', label: 'Step back' }],
    });
    if (c === 'bow') {
      api.setFlag('bowedAltar');
      await api.say({ text: 'You bow. The candle flame leans, then straightens.', note: bowNote });
    }
  },
  async bellBowl(api) {
    await api.say({ text: 'A large bronze bell bowl rests on a red cushion near the altar, with a small wooden striker beside it. During sitting, someone wakes it with a gentle touch first, then invites it fully.', note: 'Please leave it for the bell master. The tower bell is for anyone.' });
  },
  async calligraphy(api) {
    await api.say({ text: 'Three boards hang in the hall, each with a few brushed words:', quote: 'Just this breath. · Each step is enough. · Be still, and listen.' });
  },
  async cat(api) {
    await api.say({ text: 'A ginger cat is asleep on the warm boards of the veranda, curled into a perfect circle. One ear turns toward you; the rest of the cat does not.' });
    api.setFlag('metCat');
  },

  // --- forest animals -------------------------------------------------------------------
  async animal_deer(api) {
    const lines = [
      'A deer lifts its head from the grass and looks at you for a long moment, ears turning. Then it goes back to grazing, as if you were just another tree.',
      'A young fawn stays close to its mother, legs too long for it, every step a small experiment.',
      'The deer move between the cedars without a sound. You notice you have been holding your breath, and let it go.',
    ];
    await api.say({ title: 'Deer', text: lines[(api.day + api.time) % lines.length] });
    api.setFlag('sawDeer');
  },
  async animal_fox(api) {
    await api.say({ title: 'A fox', text: 'A red fox has stopped on the path. It looks at you with frank curiosity, one forepaw lifted. Then it decides you are not very interesting, and trots on about its business.' });
    api.setFlag('sawFox');
  },
  async animal_rabbit(api) {
    await api.say({ title: 'A rabbit', text: 'A rabbit sits at the edge of the path, nose twitching. Its whole body is listening. If you stay very still, it may decide to stay too.' });
    api.setFlag('sawRabbit');
  },
  async animal_owl(api) {
    await api.say({ title: 'An owl', text: 'Two round eyes in the branches. An owl turns its head almost all the way around to consider you, then slowly blinks — once, unhurried — and turns back to the dark.' });
    api.setFlag('sawOwl');
  },

  // --- pond --------------------------------------------------------------------------
  async bridge(api) {
    await api.say({ text: 'From the top of the little bridge you can see the whole pond: lotus leaves standing above the water, the hall above, the orchard below. The planks creak and settle under your feet.' });
  },
  async lotus(api) {
    await api.say({ text: 'Lotus leaves stand on their stems above the water, each holding a bead of water that rolls when the wind moves. The flowers open from mud, pale pink, perfectly clean.' });
  },
  async koi(api) {
    await api.say({ text: 'Orange and white shapes move beneath the surface, unhurried. One rises, touches the underside of a reflection, and sinks again.' });
  },
  async heron(api) {
    await api.say({ text: 'A grey heron stands at the water’s edge on one leg, so still it might be a post. Then — a flash, a swallow — and it is still again.' });
    api.setFlag('sawHeron');
  },
  async frog(api) {
    await api.say({ text: 'A small green frog sits on a lotus leaf, perfectly still, throat pulsing. It seems to be watching the rain — or nothing at all.' });
    api.setFlag('sawFrog');
  },
  async sitPond(api) { await api.sit('pond'); },

  // --- tea house & orchard -----------------------------------------------------------
  async bowl(api) {
    const c = await api.say({
      title: 'On the low wall',
      text: 'Someone has left a tea bowl on the terrace wall. A piece has broken from its rim — a fresh break, pale against the brown glaze. The small piece lies beside it.',
      choices: [
        { id: 'kitchen', label: 'Carry both pieces to the kitchen door' },
        { id: 'table', label: 'Set them on a table, where someone will see' },
        { id: 'left', label: 'Leave them as they are' },
      ],
    });
    api.setFlag('bowl', c);
    api.setFlag('bowlStamp', api.stamp);
    api.setFlag('bowlDay', api.day);
    if (c === 'kitchen') {
      api.setFlag('noteWaiting', 'kitchen');
      await api.say({ text: 'The kitchen door is open; steam drifts out, and someone is humming. You set the bowl on the step, the piece inside it. The humming pauses — then carries on.' });
    } else if (c === 'table') {
      await api.say({ text: 'You lift the bowl in both hands. It is lighter than it looks. You set it on the corner of a table, the piece tucked inside, where it can’t be knocked.' });
    } else {
      await api.say({ text: 'You leave the bowl where it is. It sits on the stones as if it has always been there.' });
    }
    api.refresh();
  },
  async kitchen(api) {
    const t = api.time;
    await api.say({ text: t === 1 || t === 2 ? 'Through the open door: steam, a big pot, someone chopping in a slow, even rhythm. A sign by the door says that today’s cooks are practising silence.' : 'The kitchen is quiet now. Clean bowls are stacked to dry, rims down, in a long row.' });
  },
  async tea(api) {
    const c = await api.say({ text: 'A pot of tea and a few cups sit on the table. You could pour a cup and drink it slowly.', choices: [{ id: 'drink', label: 'Pour a cup' }, { id: 'go', label: 'Not now' }] });
    if (c === 'drink') {
      await api.say({ text: 'The tea is pale and a little smoky. You hold the cup in both hands until it is just cool enough. You notice, sip by sip, that you are only drinking tea.' });
      api.setFlag('hadTea');
    }
  },
  async plum(api) {
    await api.say({ text: 'Plum trees in uneven rows, their bark dark and twisted. The blossom finished weeks ago; now small hard green fruit hide among the leaves. Some trees are propped with forked sticks, the way an old person is helped across a road.' });
  },
  async lavender(api) {
    await api.say({ text: 'Rows of lavender run beside the old farmhouse, humming with bees. When you brush past, the smell stays on your sleeve.' });
  },
  async hien(api) {
    const n = api.flag('hienTalk') || 0;
    if (n === 0) {
      const c = await api.say({
        title: 'Sister Hien',
        text: 'A nun in a brown robe looks up and smiles, palms joining briefly. “Welcome. I’m Sister Hien. I look after the bell — and, most afternoons, the tea.”',
        choices: [{ id: 'bell', label: '“Why does everyone stop when the bell rings?”' }, { id: 'thanks', label: 'Bow and thank her' }],
      });
      if (c === 'bell') {
        await api.say({ title: 'Sister Hien', text: '“When we hear a bell, we let it call us back to ourselves. We stop — talking, walking, thinking — and enjoy three breaths. Nothing else needs doing in that moment.” She laughs. “Even the cooks stop. The soup waits.”' });
      } else {
        await api.say({ title: 'Sister Hien', text: '“If you hear the bell while you’re here, you’re welcome to stop with us. Three breaths. That’s all.”' });
      }
      api.setFlag('hienTalk', 1);
      return;
    }
    const bowl = api.flag('bowl');
    if (n === 1 && bowl) {
      const lines = {
        kitchen: '“Someone brought a broken bowl to the kitchen step. I think it might have been you.” She smiles. “It was our oldest bowl. We’ll mend it — slowly. Some things are worth mending slowly.”',
        table: '“I found a broken bowl on the terrace table, with its piece inside, waiting. Whoever did that was paying attention. Thank you.”',
        left: '“A bowl was broken yesterday on the terrace. I found it later, with the piece beside it, as if it were waiting for me.” She turns her cup slowly. “It was. Things wait for us more patiently than we wait for them.”',
      };
      await api.say({ title: 'Sister Hien', text: lines[bowl] });
      api.setFlag('hienTalk', 2);
      return;
    }
    if (n <= 2) {
      await api.say({ title: 'Sister Hien', text: '“In the mornings we walk around the pond together, very slowly, without talking. If you like, you can simply join the end of the line. There’s no right way to do it — just arrive with each step.”' });
      api.setFlag('hienTalk', 3);
      return;
    }
    const idle = [
      '“Have you had tea today?”',
      '“The heron has been fishing at the west end all week. I think it likes the reeds.”',
      '“When it rains, the bell sounds different — closer, somehow.”',
      '“Take your time. The valley isn’t going anywhere.”',
    ];
    await api.say({ title: 'Sister Hien', text: idle[(api.day + api.time) % idle.length] });
  },

  // --- your hut -------------------------------------------------------------------------
  async futon(api) {
    if (api.time >= 3) {
      const c = await api.say({
        title: 'Your futon',
        text: api.time === 4 ? 'The night has settled in. Your futon is ready.' : 'The light is fading. You could rest until morning.',
        choices: [{ id: 'sleep', label: 'Sleep until morning' }, { id: 'stay', label: 'Not yet' }],
      });
      if (c === 'sleep') await api.sleep();
    } else {
      const c = await api.say({ text: 'Your futon is folded neatly. It’s still day. You could lie down for a while.', choices: [{ id: 'rest', label: 'Rest a while (let time pass)' }, { id: 'stay', label: 'Not now' }] });
      if (c === 'rest') await api.passTime('You lie back and listen to the hut. When you open your eyes, the light has moved.');
    }
  },
  async smallBell(api) {
    const c = await api.say({ text: 'A small bell sits on its cushion on your desk. Inviting it is a way of marking a moment — and of letting the next one come.', choices: [{ id: 'ring', label: 'Invite the small bell and let time pass' }, { id: 'stay', label: 'Leave it' }] });
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
      ? 'Thank you for bringing back the bowl. It has been in this kitchen longer than any of us. We will mend it slowly.'
      : 'Someone set the broken bowl where it could be found. If it was you — thank you. It was our teacher’s.';
    await api.say({ title: 'A folded note', text: 'The paper is soft and thin. The writing is quick and kind:', quote: `${text} — from the kitchen` });
    api.setFlag('noteWaiting', false);
    api.setFlag('readCookNote', which);
  },
  async darkroom(api) { await api.develop(); },
};

/** Sitting openings by place. */
export const SIT_OPENINGS = {
  hall: 'You bow to the cushion, sit, and settle. The hall is very quiet.',
  yard: 'You sit on the bench. The hall roof, the trees, the sky. Nothing needs doing.',
  pond: 'You sit by the water. The lotus leaves sway a little, then are still.',
  tower: 'You sit on the bench by the tower. The whole valley is below you.',
};

/** Returning-thought moments while sitting. */
export function thoughtFollow(rng) {
  return { follow: FOLLOW[Math.floor(rng() * FOLLOW.length)], back: RETURN[Math.floor(rng() * RETURN.length)] };
}

/** Things that happen when you enter a zone. */
export async function onEnterZone(zone, api) {
  const t = api.time;
  if (zone === 'gate' && !api.flag('arrived')) {
    api.setFlag('arrived');
    api.whisper('The bus left you where the road ends. A wooden gate stands among the cedars, and a path leads down into the valley.', 8000);
    setTimeout(() => api.whisper('Tap the ground to walk there — tap Stop or press Esc to stop. Drag to look around. Tap a symbol to look at something.', 7000), 8800);
    return;
  }
  if (zone === 'forest' && !api.flag('heardSweep') && t <= 1 && api.weather !== 'rain') {
    api.setFlag('heardSweep');
    api.audio.sweep('[a broom sweeping the path ahead]');
  }
  if (zone === 'tea') {
    if (api.flag('bowl') === 'table' && !api.flag('bowlCollected') && api.stamp > (api.flag('bowlStamp') ?? 0)) {
      api.setFlag('bowlCollected');
      api.setFlag('noteWaiting', 'table');
      api.whisper('The bowl is gone from the table. Someone has wiped the place where it stood.');
      api.refresh();
    }
    if (api.flag('bowl') === 'left' && !api.flag('bowlTaken') && api.day > (api.flag('bowlDay') ?? 99)) {
      api.setFlag('bowlTaken');
      api.whisper('The low wall is bare now. Only a small pale chip remains between two stones.');
      api.refresh();
    }
  }
  if (zone === 'hall' && (t === 0 || t === 3)) {
    api.whisper('People are sitting in silence. A cushion near the door is free.', 6000);
  }
  if (zone === 'hut' && api.flag('noteWaiting') && !api.flag(`noteSeen-${api.flag('noteWaiting')}`)) {
    api.setFlag(`noteSeen-${api.flag('noteWaiting')}`);
    api.whisper('There’s a folded note on your desk.');
  }
  if (zone === 'pond' && api.weather === 'rain' && !api.flag(`pondRain-${api.day}`)) {
    api.setFlag(`pondRain-${api.day}`);
    api.whisper('Rain stipples the whole pond. The lotus leaves bow and spill, bow and spill.');
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
