// Spontaneous thoughts: brief first-person thoughts that arise on their own
// at natural moments. The player can let a thought pass, linger with a kind
// one, or stay a moment with a difficult one. Nothing is scored or labelled;
// the difference is felt in the writing and in what each response opens up.
//
// kind: 'kind'  (warm, grateful, appreciative)  -> "Linger with this" / "Let it pass"
//       'heavy' (worry, judgement, impatience)  -> "Let it pass" / "Stay with it a moment"

import { settings } from '../core/settings.js';

export const THOUGHTS = [
  // --- the pond path ------------------------------------------------------------
  {
    id: 'fish', kind: 'kind', where: ['pond'], text: 'I could stay a little longer and watch the fish.',
    linger: 'You stay. An orange shape rises under a lotus leaf, turns, and sinks again. Nothing is asked of you.', effect: 'pond',
    pass: 'The thought drifts off. The pond is still there whenever you want it.',
  },
  {
    id: 'lotus', kind: 'kind', where: ['pond'], text: 'The lotus comes up out of all that mud. There’s something about that.',
    linger: 'You look a while. Clean pink petals, dark water, mud underneath holding everything up.', effect: 'pond',
    pass: 'You let it go by, lightly.',
  },
  {
    id: 'light', kind: 'kind', where: ['pond', 'hallYard'], when: (c) => c.weather === 'clear' && c.time >= 1 && c.time <= 3,
    text: 'The light on the water is lovely right now.',
    linger: 'You let yourself enjoy it. Small bright coins of light, moving, never the same twice.', effect: 'pond',
    pass: 'You notice it, and walk on with it.',
  },
  {
    id: 'reader', kind: 'kind', where: ['pond'], when: (c) => c.readerNear,
    text: 'I hope the person sitting alone feels welcome here.',
    linger: 'The wish stays with you. The person on the bench turns a page. There’s room at the other end of it.', effect: 'reader',
    pass: 'You let the wish go out quietly, wherever it goes.',
  },
  {
    id: 'nowhere', kind: 'kind', where: ['pond', 'hallYard', 'orchard'], text: 'It’s nice not to have anywhere to be.',
    linger: 'You let your shoulders drop. The afternoon is wide.',
    pass: 'You smile a little, and carry on.',
  },
  {
    id: 'useful', kind: 'heavy', where: ['pond', 'hallYard'], text: 'Shouldn’t I be doing something more useful with this time?',
    pass: 'You notice the thought — useful, useful — and let it be there. The water goes on moving. You come back to it.',
    stay: 'There’s a small tightness behind it. You don’t push it away. It’s just here, like the clouds are here. After a while, it loosens a little on its own.',
  },
  {
    id: 'pace', kind: 'heavy', where: ['pond'], when: (c) => c.moving,
    text: 'Am I walking too slowly? Too fast? Everyone else seems to know how.',
    pass: 'You notice the comparing, and let it go. Your feet are on the ground. That’s enough to know.',
    stay: 'You let the uncertainty be there without answering it. Step, and step. It doesn’t need an answer.',
  },
  {
    id: 'missedWalk', kind: 'heavy', where: ['pond'], when: (c) => c.time >= 2,
    text: 'I should have joined the walking line this morning.',
    pass: 'There it is, the should. You let it be, and come back to this path, this afternoon.',
    stay: 'A little regret. You let it sit beside you for a moment, the way you would with a friend. Then you notice the frogs have started.',
  },
  {
    id: 'rainStop', kind: 'heavy', where: ['pond', 'hallYard', 'tea'], when: (c) => c.weather === 'rain',
    text: 'I wish it would stop raining.',
    pass: 'The rain doesn’t mind either way. You listen to it on the leaves.',
    stay: 'You let the wishing be there, and the wet sleeves too. Rain, and someone who wishes it would stop. Both fine.',
  },

  // --- the tea house -------------------------------------------------------------
  {
    id: 'waiting', kind: 'heavy', where: ['tea'], when: (c) => c.inTeaFor > 25,
    text: 'How long am I supposed to wait here? I’m not even sure what I’m waiting for.',
    pass: 'You notice the impatience, and let it be. Steam from a kettle somewhere. Bees in the lavender.',
    stay: 'You stay with the restless feeling. It’s mostly in your hands and chest. You don’t need to fix it. Slowly, the terrace comes back into view.',
  },
  {
    id: 'replay', kind: 'heavy', where: ['tea'], when: (c) => c.flags.hienTalk >= 1 || c.flags.hadTea,
    text: 'I keep replaying what I said at tea.',
    pass: 'You notice the replaying, and set it down for now. The cup is warm. Nobody is replaying it but you.',
    stay: 'You let the awkward feeling be here. It’s only a feeling. Nothing has to be said again.',
  },
  {
    id: 'talkOrNot', kind: 'heavy', where: ['tea'], when: (c) => c.peopleNear > 0,
    text: 'Am I supposed to talk to someone here, or stay quiet?',
    pass: 'You let the question go unanswered. Nobody here seems to need you to get it right.',
    stay: 'You stay with not knowing. It’s uncomfortable, and also fine. Someone sets a cup down gently.',
  },
  {
    id: 'cupKind', kind: 'kind', where: ['tea'], event: 'tea',
    text: 'Someone made this tea for whoever happened to come along. That’s a kind thing.',
    linger: 'You hold the cup a little longer with both hands, and let the kindness in it reach you.', effect: 'cup',
    pass: 'You drink, and let the thought go on its way.',
  },
  {
    id: 'kitchenQuiet', kind: 'kind', where: ['tea'], when: (c) => c.time === 1 || c.time === 2,
    text: 'I’m grateful for how quiet the kitchen is. Everyone just working.',
    linger: 'You listen: a knife on a board, a lid, water poured. Gratitude, simply, for people you’ll never be introduced to.',
    pass: 'You let it go by, warmly.',
  },
  {
    id: 'lavender', kind: 'kind', where: ['tea', 'orchard'], when: (c) => c.time >= 1 && c.time <= 2 && c.weather !== 'rain',
    text: 'I want to remember the smell of the lavender.',
    linger: 'You breathe in slowly. Not to keep it — just to have it, now.',
    pass: 'You let the wanting go. The smell is still here.',
  },

  // --- photography -----------------------------------------------------------------
  {
    id: 'retake', kind: 'heavy', event: 'photo', text: 'Maybe I should go back and take that photo again. It wasn’t quite right.',
    pass: 'You notice the wanting-it-perfect, and let it pass. The thing you photographed is still out there, being itself.',
    stay: 'You let the not-quite-right feeling be here. It’s a small ache. You don’t need to fix it.',
  },
  {
    id: 'asGood', kind: 'heavy', event: 'photo', text: 'I wonder if it’ll look as good as it felt.',
    pass: 'You let the wondering go. Whatever the film holds, you were there.',
    stay: 'You stay with the hoping for a moment. Hope, a little worry. Both soft. Then the wind moves the grass.',
  },
  {
    id: 'throughLens', kind: 'heavy', event: 'photo', when: (c) => c.photosToday >= 3,
    text: 'I’m spending more time looking through the camera than just looking.',
    pass: 'You notice it, without scolding yourself, and let your eyes rest on what’s in front of you.',
    stay: 'You let that observation stay a moment. No rule needs making. You lower the camera and look.',
  },
  {
    id: 'glad', kind: 'kind', event: 'photo', text: 'I’m glad I noticed that.',
    linger: 'You look again — without the camera this time — and it’s still there, and still lovely.',
    pass: 'You let the gladness go on ahead of you.',
  },
  {
    id: 'frames', kind: 'kind', event: 'photo', when: (c) => c.rollLeft <= 18,
    text: 'I don’t have to use every frame.',
    linger: 'A small relief. You let the camera hang, and just walk for a while.',
    pass: 'You let the thought go, easily.',
  },

  // --- warmth, later, walking alone ----------------------------------------------------
  {
    id: 'hienKind', kind: 'kind', event: 'aloneAfterHien',
    text: 'Sister Hien didn’t have to take the time to explain the bell. That was kind of her.',
    linger: 'You let the warmth stay. Maybe you’ll find a way to thank her.', effect: 'thankHien',
    pass: 'You let the thought go by, still smiling a little.',
  },
  {
    id: 'kitchenNote', kind: 'kind', event: 'aloneAfterNote',
    text: 'Someone took the time to write me a note. I didn’t expect that.',
    linger: 'You let yourself be touched by it. Such a small thing. Not small at all.',
    pass: 'You carry it with you, lightly.',
  },

  // --- quiet exploration, anywhere ------------------------------------------------------
  {
    id: 'footsteps', kind: 'kind', where: ['forest', 'gate', 'orchard', 'valley', 'hutYard'], when: (c) => c.moving,
    text: 'It’s so quiet I can hear my own footsteps.',
    linger: 'Step. Step. You let the sound be company.',
    pass: 'You let the thought go and keep walking.',
  },
  {
    id: 'home', kind: 'heavy', where: ['forest', 'orchard', 'valley', 'hutYard', 'tower'],
    text: 'I wonder what everyone at home is doing right now.',
    pass: 'You notice the pull of somewhere else, and come back to the path under your feet.',
    stay: 'A little longing. You let it be here, the way the mist is here. It doesn’t need to go anywhere yet.',
  },
  {
    id: 'trees', kind: 'kind', where: ['forest', 'gate', 'tower'], text: 'These trees were here long before me.',
    linger: 'You look up into the cedars for a while. Something in you settles, the way a leaf settles.',
    pass: 'You let the thought go by, and walk on beneath them.',
  },
  {
    id: 'enough', kind: 'heavy', where: ['forest', 'orchard', 'valley', 'hutYard'],
    text: 'Am I getting enough out of this?',
    pass: 'You notice the measuring, and set it down. A bird calls. You didn’t have to earn it.',
    stay: 'You let the question stay a moment, unanswered. Under it, something a little anxious. You let that be here too.',
  },

  // --- moments that change from day to day (v2.7) ---------------------------------------
  {
    id: 'lotusChanged', kind: 'kind', event: 'lotus', text: 'Yesterday it was still a bud.',
    linger: 'You let yourself feel it — how quickly, and how completely, it became something else.', effect: 'pond',
    pass: 'You let the thought go, the way the petals go.',
  },
  {
    id: 'seedlingsCare', kind: 'kind', event: 'seedlings', text: 'Someone will sit under these trees one day. I won’t know who.',
    linger: 'You let the thought warm you. Care that doesn’t need to be seen, passed forward.',
    pass: 'You let it go lightly, and put the watering can back.',
  },
  {
    id: 'mendedBowl', kind: 'kind', event: 'mended', text: 'It’s more beautiful with the crack than it was without it.',
    linger: 'You stay with that a while. Broken, cared for, still holding tea.',
    pass: 'You let it go, and carry it with you.',
  },
  {
    id: 'walkedTogether', kind: 'kind', event: 'afterWalk', text: 'I liked walking with everyone. Nobody was in a hurry.',
    linger: 'You let the ease of it stay in your legs. Each step had arrived somewhere.',
    pass: 'You smile, and let it go.',
  },
  {
    id: 'snakeJolt', kind: 'heavy', event: 'snake', text: 'My heart jumped. It’s only a snake, minding its own business.',
    pass: 'You notice the jolt, and let it settle. The snake goes on being a snake.',
    stay: 'You feel the startle in your chest and let it be there. It fades on its own, like a ripple.',
  },
  {
    id: 'hawkShare', kind: 'kind', event: 'hawk', text: 'I wish I could show someone that hawk.',
    linger: 'You watch it a while longer for both of you.',
    pass: 'You let the wish go, and just enjoy the sky.',
  },

  // --- more quiet thoughts, in the spirit of the place ------------------------------------
  {
    id: 'breathing', kind: 'kind', where: ['pond', 'forest', 'orchard', 'hallYard', 'gate', 'valley', 'tower'],
    text: 'I’m breathing. I didn’t even notice until now.',
    linger: 'The air comes in, cool. It goes out, warm. You’re still here. That’s all.',
    pass: 'You let the noticing go, and keep walking.',
  },
  {
    id: 'feet', kind: 'kind', where: ['forest', 'pond', 'orchard', 'valley', 'gate'], when: (c) => c.moving,
    text: 'The ground is holding me up, every single step.',
    linger: 'You let your weight sink into each step for a while. The earth doesn’t mind.',
    pass: 'You let it go, and walk on.',
  },
  {
    id: 'planning', kind: 'heavy', where: ['pond', 'orchard', 'valley', 'hutYard', 'forest'],
    text: 'I’m already planning what to do tomorrow.',
    pass: 'You notice the planning, and gently set it down. Tomorrow will come on its own.',
    stay: 'You let the busy, reaching feeling be there. You don’t have to do anything about it. It quiets a little.',
  },
  {
    id: 'bellAgain', kind: 'kind', where: ['hallYard', 'tower', 'forest'], text: 'I hope I hear the bell again soon.',
    linger: 'You smile at that. Funny, to look forward to stopping.',
    pass: 'You let the wish go. Everything is already here.',
  },
  {
    id: 'cook', kind: 'kind', where: ['tea'], when: (c) => c.time <= 2,
    text: 'Someone has been cooking for all of us since before dawn.',
    linger: 'Gratitude rises, plain and simple. You let it stay.',
    pass: 'You let it go, warmly.',
  },
  {
    id: 'judge', kind: 'heavy', where: ['tea', 'pond', 'hallYard'], when: (c) => c.peopleNear > 0,
    text: 'That person looks like they’re doing it wrong.',
    pass: 'You notice the judging, and let it pass. Doing it wrong — whatever that would be.',
    stay: 'You stay with the little hardness of it, without scolding yourself. Under it, something softer: you want to do it right, too.',
  },
  {
    id: 'orchardOld', kind: 'kind', where: ['orchard'], text: 'These plum trees have been bent by a lot of winters.',
    linger: 'You look at their crooked branches a while. They bloomed anyway.',
    pass: 'You let it go, and walk under them.',
  },
];

const ZONE_ALIASES = { hall: 'hallYard', hut: 'hutYard' };
const rand = (a, b) => a + Math.random() * (b - a);

/** Decides when a thought may arise. Quiet stretches are the norm. */
export class ThoughtStream {
  constructor(onShow) {
    this.onShow = onShow;
    this.cooldown = rand(50, 80);  // the first thought waits a little
    this.recent = [];              // avoid repeats
    this.shown = {};               // per-thought count this session
    this.events = [];              // pending: { type, delay, ttl }
    this.showing = false;
  }

  get frequency() { return settings.get('thoughts') || 'occasional'; }

  /** Something happened that a thought might follow (photo, tea, ...). */
  event(type, delay = 4) {
    if (this.frequency === 'off') return;
    this.events = this.events.filter((e) => e.type !== type);
    this.events.push({ type, delay, ttl: 90 });
  }

  /** Called every frame. ctx describes the moment. */
  update(dt, ctx) {
    if (this.frequency === 'off') { this.events = []; return; }
    for (const e of this.events) { e.delay -= dt; e.ttl -= dt; }
    this.events = this.events.filter((e) => e.ttl > 0);
    if (this.showing || !ctx.canShow) return;
    this.cooldown -= dt;
    const rare = this.frequency === 'rare';

    // event-led thoughts may come a little sooner than ambient ones
    const ready = this.events.find((e) => e.delay <= 0);
    if (ready && this.cooldown < (rare ? 20 : 45)) {
      this.events = this.events.filter((e) => e !== ready);
      if (Math.random() < (this.debugChance ?? (rare ? 0.45 : 0.75))) {
        const t = this.pick(ctx, (x) => x.event === ready.type);
        if (t) return this.show(t, ctx);
      }
      return;
    }
    if (this.cooldown > 0) return;
    // a moment that just happened (a photo, tea) gets its chance first
    if (this.events.length) return;
    // ambient thoughts: a gentle chance each second once the quiet has passed
    this._acc = (this._acc || 0) + dt;
    if (this._acc < 1) return;
    this._acc = 0;
    // (debugChance lets automated playtests skip the long natural wait)
    if (Math.random() > (this.debugChance ?? (rare ? 0.022 : 0.042))) return;
    const zone = ZONE_ALIASES[ctx.zone] || ctx.zone;
    const t = this.pick(ctx, (x) => !x.event && x.where && x.where.includes(zone));
    if (t) this.show(t, ctx);
    else this.cooldown = rand(15, 30); // nothing fits here; stay quiet a while
  }

  pick(ctx, filter) {
    const pool = THOUGHTS.filter((t) => filter(t) && (!t.when || t.when(ctx)) && !this.recent.includes(t.id) && (this.shown[t.id] || 0) < 2);
    if (!pool.length) return null;
    // gently prefer thoughts not yet seen
    const weights = pool.map((t) => (this.shown[t.id] ? 0.35 : 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  show(t, ctx) {
    this.showing = true;
    this.recent.push(t.id);
    if (this.recent.length > 10) this.recent.shift();
    this.shown[t.id] = (this.shown[t.id] || 0) + 1;
    const rare = this.frequency === 'rare';
    this.cooldown = rare ? rand(200, 330) : rand(105, 170);
    if (Math.random() < 0.35) this.cooldown += rand(60, 150); // a longer quiet stretch
    this.onShow(t, ctx);
  }

  /** The thought has finished (faded, or a response played out). */
  done() { this.showing = false; }
}
