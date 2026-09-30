// The house: the living room, a bedroom and a kitchen to build, and the backyard. Put things anywhere, then
// tap them to use them: ride the Ferris wheel, pet the puppy, collect eggs, whack the piñata... Each room has
// something built in: the mirror, a bed to nap in, a stove to bake treats, and a garden shop for the backyard.
// Best friends who visit can look around every room and play with things too (but not move them).
'use strict';

let HR = 'living', // the room on screen
  hEdit = false; // "Move things" mode: tapping things puts them away
const houseGuest = () => ONV() && !!MP.island.room;
const hostHome = () => (houseGuest() ? MP.island : null);
const indoor = k => placeable(k);
const outdoor = k => placeable(k) || (ITEMS[k] && ITEMS[k].k === 'yard');
// a room's 20 squares (someone else's while visiting)
function roomArr(id) {
  const g = hostHome();
  if (id === 'living') return g ? g.room : S.room;
  if (id === 'yard') return g ? g.yard : S.yard;
  return g ? g.rooms && g.rooms[id] : S.rooms[id];
}
const roomOpen = id => {
  const r = ROOMS.find(x => x.id === id);
  if (hostHome()) return !!roomArr(id);
  return !r.p || !!S.built[id];
};
const onceToday = k => S.once[k] !== S.day;
const markToday = k => (S.once[k] = S.day);

function openHouse(room) {
  const guest = houseGuest();
  if (VIS() && !guest) return;
  busy = true;
  closeTalk();
  hEdit = false;
  HR = room && roomOpen(room) ? room : 'living';
  const h = $('#house');
  h.classList.remove('hidden');
  h.classList.toggle('guest', guest);
  $('#htitle').textContent = `${guest ? MP.island.name : S.name}'s House`;
  drawRoom();
}
window.openHouse = openHouse;
window.houseTab = id => {
  if (roomOpen(id)) {
    HR = id;
    hEdit = false;
    SND.pop();
    drawRoom();
  } else if (!houseGuest()) buildAsk(id);
};
const WALLS = {
  living: () => `🪟<button id="mirbtn" aria-label="Mirror" onclick="openMirror()">🪞</button>🪟`,
  bed: () => `🖼️<button class="wallbtn" onclick="napTime()">🛏️ Nap</button>🌙`,
  kitchen: () => `🧂<button class="wallbtn" onclick="openBake()">🍳 Bake</button>🍯`,
  yard: () =>
    `${isNight() ? '🌙' : '☀️'}<button class="wallbtn" onclick="openGardenShop()">🛒 Garden shop</button>☁️`
};
function drawRoom() {
  const guest = houseGuest();
  if (!roomOpen(HR)) HR = 'living';
  const room = roomArr(HR) || [],
    f = $('#floor');
  $('#htabs').innerHTML = ROOMS.filter(r => !guest || roomOpen(r.id))
    .map(
      r =>
        `<button class="${r.id === HR ? 'on' : ''}${roomOpen(r.id) ? '' : ' locked'}" onclick="houseTab('${r.id}')">${r.e} ${r.n}${roomOpen(r.id) ? '' : ' 🔒'}</button>`
    )
    .join('');
  $('#room').className = 'r-' + HR + (hEdit ? ' editing' : '');
  $('#wall').innerHTML = guest && HR !== 'living' ? '' : WALLS[HR]();
  $('#house .hint').textContent = guest
    ? `You're visiting! Tap things to play with them. 🏠`
    : hEdit
      ? 'Tap things to put them back in your bag. 📦'
      : 'Tap a square to put something there. Tap things to play with them!';
  const eb = $('#hedit');
  if (eb) eb.textContent = hEdit ? 'Done ✓' : '✏️ Move things';
  f.innerHTML = '';
  room.forEach((id, i) => {
    const d = document.createElement('div');
    d.className = 'slot';
    d.innerHTML = id && ITEMS[id] ? ie(id) : '';
    d.onclick = () => slotTap(i, d);
    f.appendChild(d);
  });
  const n = room.filter(Boolean).length,
    u = new Set(room.filter(Boolean)).size;
  const stars =
    n === 0 ? '' : n < 4 ? '⭐' : n < 8 ? '⭐⭐' : n < 13 ? '⭐⭐⭐' : u >= 12 ? '⭐⭐⭐⭐⭐' : '⭐⭐⭐⭐';
  const what = HR === 'yard' ? 'backyard' : ROOMS.find(r => r.id === HR).n.toLowerCase();
  $('#score').textContent = n
    ? `${HR === 'yard' ? 'Fun' : 'Cozy'} level: ${stars}`
    : guest
      ? `${MP.island.name}'s ${what} is empty right now!`
      : `Your ${what} is empty. Let's decorate!`;
}
window.houseEdit = () => {
  hEdit = !hEdit;
  drawRoom();
};
function slotTap(i, el) {
  const room = roomArr(HR),
    id = room[i];
  if (houseGuest()) {
    if (id && ITEMS[id]) useThing(id, el);
    return;
  }
  if (VIS()) return;
  if (id) {
    if (!hEdit) return useThing(id, el);
    room[i] = null;
    addItem(id);
    SND.lift();
    save();
    drawRoom();
    return;
  }
  const ok = HR === 'yard' ? outdoor : indoor,
    fk = Object.keys(S.bag)
      .filter(ok)
      .sort((a, b) => (ITEMS[b].k === 'yard') - (ITEMS[a].k === 'yard'));
  if (!fk.length) {
    modal(
      HR === 'yard'
        ? `<h2>Nothing for outside yet</h2><p style="text-align:center">Tap <b>🛒 Garden shop</b> for swings and slides... well, Ferris wheels and puppies! 🎡🐶<br>Furniture from your bag can go outside too.</p><div class="row"><button class="btn" onclick="closeModal();busy=true;openGardenShop()">🛒 Garden shop</button><button class="btn white" onclick="closeModal();busy=true">OK</button></div>`
        : `<h2>No furniture yet</h2><p style="text-align:center">Buy furniture at Berry's Shop 🦝, open presents on the beach 🎁, or help your friends!</p><div class="row"><button class="btn" onclick="closeModal();busy=true">OK</button></div>`
    );
    return;
  }
  modal(
    `<h2>What goes here?</h2><div class="grid">${fk.map(k => `<div class="cell" onclick="place(${i},'${k}')">${ie(k)}<small>${ITEMS[k].n}</small><span class="cnt">${S.bag[k]}</span></div>`).join('')}</div><div class="row"><button class="btn white" onclick="closeModal();busy=true">Never mind</button></div>`
  );
}
window.place = (i, k) => {
  if (VIS() || !(HR === 'yard' ? outdoor : indoor)(k) || roomArr(HR)[i] || !takeItem(k)) return;
  roomArr(HR)[i] = k;
  SND.thunk();
  save();
  closeModal();
  busy = true;
  drawRoom();
};

// ----- building rooms
function buildAsk(id) {
  const r = ROOMS.find(x => x.id === id);
  const what = {
    bed: 'A cozy bedroom with a big bed for naps. Sweet dreams might leave coins under your pillow! 💤',
    kitchen: 'A kitchen with a stove for baking yummy treats from your fruit and eggs! 🥧'
  }[id];
  modal(
    `<h2>${r.e} Build a ${r.n}?</h2><p class="c" style="font-size:17px">${what}</p><p class="c">🪙 ${r.p} coins <small>(you have ${S.coins})</small></p><div class="row"><button class="btn" ${S.coins < r.p ? 'disabled' : ''} onclick="buildRoom('${id}')">Build it! 🔨</button><button class="btn white" onclick="closeModal();busy=true">Not yet</button></div>`
  );
}
window.buildRoom = id => {
  const r = ROOMS.find(x => x.id === id);
  if (!r || !r.p || S.built[id] || S.coins < r.p || VIS()) return;
  S.coins -= r.p;
  S.built[id] = 1;
  hud();
  SND.fanfare();
  save();
  closeModal();
  busy = true;
  HR = id;
  drawRoom();
  toast(`🔨 Bang bang! Your new ${r.n} is ready! ${r.e}`, 3200);
};

// ----- playing with things
const WHO = () => (houseGuest() ? MP.island.name : 'You');
const FORTUNES = [
  'A big fish is waiting for you! 🐟',
  'Someone will make you smile today! 😊',
  'You will find something shiny! ✨',
  'A friend is thinking about you! 💕',
  'Your next present will be extra special! 🎁',
  'Lucky color: pink! 💗',
  'Today is a great day for a nap. 😴'
];
const SHOWS = [
  'Cooking with Capybaras 🍳',
  'The Great Bug Race 🐞',
  'Fishy Friends 🐠',
  'Space Bunnies 🚀',
  'Pip Sings Live! 🎤'
];
const STORIES = [
  'The Sleepy Capybara 😴',
  'The Moon Who Loved Oranges 🌙',
  'Puddle and the Big Wave 🌊',
  'The Secret Garden of Snails 🐌',
  'How the Owl Got Its Glasses 🦉'
];
// [what happens, particles, animation, sound]
const THINGS = {
  bed: ['So cozy! Five more minutes... 😴', '💤', 'wiggle', 'lift'],
  chair: ['Ahh, a nice sit. 🪑', '✨', 'bounce', 'thunk'],
  sofa: ['Flop! So squishy! 🛋️', '💗', 'bounce', 'thunk'],
  teddy: ['Big teddy hug! 🤗', '💗', 'wiggle', 'heart'],
  owlplush: ['Hoo-hoo! A fluffy hug! 🦉', '💗', 'wiggle', 'hoot'],
  doll: ['Pop, pop, pop! Another doll inside! 🪆', '✨', 'bounce', 'pop'],
  piano: ['🎵 Plink plonk! What a lovely song!', '🎵', 'bounce', 'fanfare'],
  guitar: ['🎸 Strum strum! Rock on!', '🎶', 'wiggle', 'yay'],
  radio: ['📻 Dance party! 💃', '🎶', 'wiggle', 'yay'],
  chime: ['Ting-a-ling! 🎐', '🎵', 'wiggle', 'ding'],
  tv: [() => `📺 Now showing: ${pick(SHOWS)}`, '⭐', 'bounce', 'pop'],
  books: [() => `📚 You read "${pick(STORIES)}". The end! 💕`, '✨', 'float', 'pop'],
  clock: [
    () => `🕰️ Tick-tock! It's ${clock().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
    '⏰',
    'wiggle',
    'ding'
  ],
  teapot: ['☕ Tea time! Pinkies up!', '☁️', 'float', 'pour'],
  telescope: [
    () => (isNight() ? '🔭 So many stars! Is that a planet? 🪐' : '🔭 You spy a seagull. Hello, seagull! 🐦'),
    '⭐',
    'float',
    'sparkle'
  ],
  crystal: [() => `🔮 The crystal ball says... ${pick(FORTUNES)}`, '✨', 'spin', 'wish'],
  globe: ['🌍 Spin, spin! Where shall we fly today? ✈️', '✈️', 'spin', 'whoosh'],
  bath: ['🛁 Bubble time! Rub-a-dub!', '🫧', 'wiggle', 'bubbles'],
  balloon: ['🎈 Boop! Up, up and away!', '🎈', 'float', 'balloon'],
  kite: ['🪁 Whoosh! Look how high it flies!', '☁️', 'float', 'whoosh'],
  ufo: ['🛸 Beep boop! We come in peace!', '👽', 'zoom', 'whoosh'],
  carousel: ['🎠 Round and round! Wheee!', '🎵', 'spin', 'yay'],
  microscope: ['🔬 Whoa! Tiny, tiny, TINY things!', '🦠', 'bounce', 'pop'],
  cake: ['🍰 Nom nom! (Just one tiny bite.)', '😋', 'bounce', 'nibble'],
  cupcake: ['🧁 Sprinkles! Nom!', '😋', 'bounce', 'nibble'],
  trophy: ['🏆 Hooray! Champion!', '🎉', 'bounce', 'fanfare'],
  mirror: ['🪞 Looking good!', '✨', 'wiggle', 'sparkle'],
  // backyard
  sunflower: ['💧 Splish! The sunflowers look so happy!', '🌻', 'wiggle', 'water'],
  soccer: ['⚽ Kick! GOOOAL!', '⚽', 'zoom', 'thunk'],
  pumpkin: ['🎃 BOO! Hee hee, did I scare you?', '👻', 'bounce', 'oops'],
  snowman: ['⛄ Brrr! A frosty hug!', '❄️', 'wiggle', 'sparkle'],
  umbrella2: ['⛱️ Ahh, a nice shady rest. 😌', '☀️', 'wiggle', 'lift'],
  picnic: ['🧺 Picnic time! Sandwiches and giggles! 🥪', '🍓', 'bounce', 'nibble'],
  tent: ['⛺ Camping out under the stars! ✨', '⭐', 'night', 'wish'],
  circus: ['🎪 Ta-da! The greatest show on the island!', '🎉', 'bounce', 'fanfare'],
  puppy: ['🐶 Woof woof! The puppy loves you!', '💗', 'wiggle', 'heart'],
  kitty: ['🐱 Purrrr... The kitty loves you!', '💗', 'wiggle', 'heart'],
  ferris: ['🎡 Round and round and up so high! Wheee!', '✨', 'spin', 'yay'],
  coaster: ['🎢 Loop-de-loop! WHEEEE!', '💨', 'zoom', 'whoosh']
};
// things with a little reward once a day (only on your own island)
const DAILY = {
  pinata: [
    'pinata',
    () => {
      const c = 20 + Math.floor(Math.random() * 21);
      S.coins += c;
      hud();
      return [`🪅 WHACK! ${c} coins came out! 🪙`, '🪙', 'coin'];
    },
    "🪅 Whack! It's empty now. Refill tomorrow! 🍬"
  ],
  chicken: [
    'egg',
    () => {
      addItem('egg');
      return ['🐔 Bawk bawk! You got a fresh egg! 🥚', '🥚', 'pop'];
    },
    '🐔 Bawk! No more eggs today. Come back tomorrow!'
  ],
  campfire: [
    'mallow',
    () => {
      addItem('mallow');
      return ['🔥 Toasty! You roasted some marshmallows! 🍡', '🔥', 'yay'];
    },
    '🔥 Crackle crackle... so warm and cozy.'
  ],
  palm: [
    'palm',
    () => {
      S.coins += 15;
      hud();
      return ['🌴 Shake shake! A coconut fell... full of coins! 🪙 +15', '🥥', 'coin'];
    },
    '🌴 Shake shake! The palm tree waves at you.'
  ],
  fountain: [
    'wish',
    () => ['⛲ You tossed in a wish... ' + pick(FORTUNES), '✨', 'wish'],
    '⛲ Splish splash! ✨'
  ]
};
let hoopBest = 0;
function useThing(id, el) {
  const it = ITEMS[id];
  let msg, part, anim, snd;
  const guest = houseGuest();
  if (id === 'hoop') {
    const s = Math.floor(Math.random() * 4);
    hoopBest = Math.max(hoopBest, s);
    [msg, part, anim, snd] = [
      s
        ? `🏀 Swish! You scored ${s} basket${s > 1 ? 's' : ''}! ${s === 3 ? 'SUPERSTAR! 🌟' : ''}`
        : '🏀 Boing! So close! Try again!',
      '🏀',
      'bounce',
      s ? 'yay' : 'oops'
    ];
  } else if (DAILY[id] && !guest) {
    const [k, get, again] = DAILY[id];
    if (onceToday(k)) {
      markToday(k);
      [msg, part, snd] = get();
      save();
    } else [msg, part, snd] = [again, '✨', 'pop'];
    anim = 'wiggle';
  } else if (THINGS[id]) {
    const t = THINGS[id];
    msg = typeof t[0] === 'function' ? t[0]() : t[0];
    [part, anim, snd] = [t[1], t[2], t[3]];
  } else if (DAILY[id])
    [msg, part, anim, snd] = [`${it.e} That's ${MP.island.name}'s ${it.n}!`, '✨', 'wiggle', 'pop'];
  else [msg, part, anim, snd] = [`${it.e} ${it.n}. So pretty! ✨`, '✨', 'wiggle', 'sparkle'];
  if (guest && !msg.includes(it.n)) msg += `<br><small>${it.e} ${it.n}</small>`;
  (SND[snd] || SND.pop)();
  if (el) thingFx(el, part, anim);
  toast(msg, 2600);
}
// a tile wiggles/spins/floats, with a few emojis puffing out of it
function thingFx(el, part, anim) {
  if (anim === 'night') {
    const r = $('#room');
    r.classList.add('starry');
    setTimeout(() => r.classList.remove('starry'), 1800);
    anim = 'wiggle';
  }
  el.classList.remove('a-' + anim);
  void el.offsetWidth;
  el.classList.add('a-' + anim);
  setTimeout(() => el.classList.remove('a-' + anim), 1000);
  for (let i = 0; i < 4; i++) {
    const p = document.createElement('span');
    p.className = 'puff';
    p.textContent = part;
    p.style.left = 20 + Math.random() * 60 + '%';
    p.style.animationDelay = i * 0.12 + 's';
    el.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

// ----- bedroom: a nap, and sometimes coins under the pillow
const DREAMS = [
  'You dreamed you could fly like Pip! 🐤',
  'You dreamed of a giant orange as big as a house! 🍊',
  'You dreamed the fish were singing! 🐟🎵',
  'You dreamed you swam with a whale! 🐋',
  'You dreamed about a rainbow made of cake! 🌈🍰',
  'You dreamed Mochi taught you to hop! 🐰'
];
window.napTime = () => {
  if (houseGuest() || VIS()) return;
  const r = $('#room');
  r.classList.add('napping');
  SND.lift();
  setTimeout(() => {
    r.classList.remove('napping');
    let msg = `💤 Zzz... ${pick(DREAMS)}`;
    if (onceToday('pillow')) {
      markToday('pillow');
      S.coins += 40;
      hud();
      save();
      msg += '<br>💰 And you found 40 coins under your pillow!';
      SND.coin();
    }
    toast(msg, 3600);
  }, 1500);
};

// ----- kitchen: baking
window.openBake = () => {
  if (houseGuest() || VIS()) return;
  const need = r =>
    Object.entries(r)
      .map(([k, n]) => `<span class="${(S.bag[k] || 0) >= n ? '' : 'miss'}">${ITEMS[k].e}×${n}</span>`)
      .join(' ');
  const can = r => Object.entries(r).every(([k, n]) => (S.bag[k] || 0) >= n);
  modal(
    `<h2>🍳 Let's bake!</h2><p class="c" style="font-size:14px;margin-top:0">Treats make great presents for your neighbours and friends! 💌<br>Get eggs from a chicken 🐔 in your backyard.</p><div class="list">` +
      RECIPES.map(
        ([id, r]) =>
          `<div class="li"><span class="e">${ie(id)}</span><span class="t">${ITEMS[id].n}<small class="need">${need(r)}</small></span><button class="btn" ${can(r) ? '' : 'disabled'} onclick="bake('${id}')">Bake!</button></div>`
      ).join('') +
      `</div><div class="row"><button class="btn white" onclick="closeModal();busy=true">Done</button></div>`
  );
};
window.bake = id => {
  const rec = RECIPES.find(r => r[0] === id);
  if (!rec || VIS() || !Object.entries(rec[1]).every(([k, n]) => (S.bag[k] || 0) >= n)) return;
  Object.entries(rec[1]).forEach(([k, n]) => takeItem(k, n));
  const first = addItem(id);
  SND.yay();
  save();
  openBake();
  toast(`${ITEMS[id].e} Fresh from the oven: ${ITEMS[id].n}!${first ? '<br>✨ Your first one!' : ''}`, 2800);
};

// ----- backyard: the garden shop
window.openGardenShop = () => {
  if (houseGuest() || VIS()) return;
  modal(
    `<h2>🛒 Garden Shop</h2><p class="c" style="font-size:14px;margin-top:0">Fun things for your backyard! 🪙 You have <b>${S.coins}</b></p><div class="list">` +
      YARD.map(
        ([id]) =>
          `<div class="li"><span class="e">${ie(id)}</span><span class="t">${ITEMS[id].n}${S.bag[id] ? `<small>${S.bag[id]} in your bag</small>` : ''}</span><button class="btn" ${S.coins < ITEMS[id].buy ? 'disabled' : ''} onclick="buyYard('${id}')">🪙 ${ITEMS[id].buy}</button></div>`
      ).join('') +
      `</div><div class="row"><button class="btn white" onclick="closeModal();busy=true">Done</button></div>`
  );
};
window.buyYard = id => {
  const it = ITEMS[id];
  if (!it || it.k !== 'yard' || S.coins < it.buy || VIS()) return;
  S.coins -= it.buy;
  addItem(id);
  hud();
  SND.coin();
  save();
  openGardenShop();
  toast(`${it.e} ${it.n} is in your bag! Tap a square to put it out. 🌳`, 2600);
};

// ----- treats: eat one, or share with a neighbour once a day
const FAVE_TREAT = { mochi: 'pancake', pip: 'tea', puddle: 'pie' };
const treats = () =>
  Object.keys(S.bag)
    .filter(k => ITEMS[k] && ITEMS[k].k === 'food')
    .sort((a, b) => ITEMS[b].p - ITEMS[a].p);
// the treat a neighbour would get (their favourite if you have it)
function treatFor(n) {
  if (VIS() || !onceToday('treat_' + n.id)) return null;
  const t = treats();
  return t.includes(FAVE_TREAT[n.id]) ? FAVE_TREAT[n.id] : t[0] || null;
}
function shareTreat(n) {
  const k = treatFor(n);
  if (!k || !takeItem(k)) return;
  markToday('treat_' + n.id);
  const fave = FAVE_TREAT[n.id] === k;
  friend(n, fave ? 2 : 1);
  SND.heart();
  save();
  openTalk(
    n,
    fave
      ? `${ITEMS[k].e} My FAVORITE! ${ITEMS[k].n}! How did you know?! 😍💕`
      : `${ITEMS[k].e} ${ITEMS[k].n}? For me? Yummy! Thank you, ${esc(S.name)}! 😋`
  );
}
window.eatAsk = k => {
  if (!ITEMS[k] || ITEMS[k].k !== 'food' || !S.bag[k]) return;
  modal(
    `<h2>${ie(k)} ${ITEMS[k].n}</h2><p class="c" style="font-size:17px">Eat it now, or keep it to share? 💌</p><div class="row"><button class="btn" onclick="eatIt('${k}')">Eat! 😋</button><button class="btn white" onclick="bagView()">Keep</button></div>`
  );
};
window.eatIt = k => {
  if (!ITEMS[k] || ITEMS[k].k !== 'food' || !takeItem(k)) return;
  SND.nibble();
  burst(P.x, P.y - 50, '😋', 5);
  save();
  closeModal();
  toast(`Yum! ${ITEMS[k].e} ${pick(['So tasty!', 'Delicious!', 'Nom nom nom!', 'Mmmm!'])}`, 2200);
};

$('#hexit').onclick = () => {
  $('#house').classList.add('hidden');
  $('#house').classList.remove('guest');
  busy = false;
  P.tx = HOUSE.x;
  P.ty = HOUSE.y + 30;
  P.x = HOUSE.x;
  P.y = HOUSE.y + 24;
};
