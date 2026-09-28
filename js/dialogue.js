// What the neighbours say. Each one has their own voice and lots of lines, plus lines about what's going on
// (time of day, the season, your hat, your fruit tower, your bag, the museum, each other...), jokes with a
// punchline, fun facts, and little speech bubbles now and then. They don't repeat themselves until they've
// run out of new things to say.
'use strict';

// {name} is the player's name, {it} the item a neighbour wants
const NB_TALK = {
  mochi: {
    hi: ['Hop hop!', 'Oh! Hi hi!', 'Boing boing!', 'Yay, {name}!'],
    lines: [
      'Hop hop! What a lovely day!',
      'I tried to count the clouds. I got to eleven!',
      'You have fruit on your head again! Hee hee!',
      'The hot spring is my favorite place on the whole island!',
      "I practiced my big jump today. I jumped over a snail! (It didn't notice.) 🐌",
      "I'm growing my ears. They're already THIS long! 👂",
      'I had a dream I was a cloud. I was very fluffy. ☁️',
      'Do you think carrots dream about bunnies? 🥕',
      'I made a flower crown, but I ate it. Oops! 🌼',
      "Let's play hide and seek! ...You found me. I'm bad at hiding. 🙈",
      'My favorite number is eleven. Because of the clouds!',
      'Sometimes I hop in circles until I get dizzy. Wheee! 💫',
      'Can you wiggle your nose like this? *wiggle wiggle* 🐰',
      'I wrote a poem: Hop, hop, hop. Carrot. The end. 📝'
    ],
    facts: [
      "Did you know? A bunny's teeth never stop growing! That's why I nibble so much. 🥕",
      'Did you know? Happy bunnies jump and twist in the air. It\'s called a "binky"! 💫',
      'Did you know? Bunnies can see almost all the way around without turning their heads! 👀'
    ],
    morning: [
      'Good morning, {name}! I already did 100 hops! 🌅',
      'Morning! The grass is all sparkly with dew! 💧'
    ],
    day: ['Such a sunny day! Perfect for hopping! ☀️', "Is it lunch time? I think it's lunch time. 🥕"],
    evening: [
      'The sky is turning pink! My favorite color after carrot orange. 🌇',
      "I'm getting a little sleepy... 🥱"
    ],
    night: [
      "*yawn* It's so late, {name}! Are you counting stars too? ⭐",
      'Shh... the fireflies are out! Look, they blink! ✨'
    ],
    ask: [
      'Hi {name}! Could you bring me {it}? That would make me so happy!',
      "{name}! {name}! I've been dreaming about {it} all day. Could you find me one? 🥺",
      "Hop hop! I'd do my biggest binky ever for {it}! Can you help? 💫"
    ],
    remind: ['Still hoping for {it}... no rush! 🐰', 'Hee hee, I keep thinking about {it}! 💭'],
    have: ['Ooh! Is that {it} in your bag?! Is it for me?! 🥺', 'I can SMELL {it}! You found one! 💕'],
    thanks: [
      'Thank you, {name}!! 💕 You make my ears go all wiggly!',
      "Yay yay yay! {name}, you're the best! *binky* 💫"
    ],
    shy: ["Oh! H-hi... I'm Mochi. 🐰", 'You seem nice! Do you like hopping?'],
    buddy: [
      "{name}, you're my favorite! Don't tell the others. Hee hee! 🤫",
      "Best buddies forever! I'll save you a carrot. 🥕💕"
    ],
    pops: ['Hop hop! 🐰', 'Boing! 💫', '🥕 Carrots...', 'Wheee!', '*wiggle wiggle*', 'La la la~ 🌸']
  },
  pip: {
    hi: ['Tweet tweet!', 'Cheep!', 'Hiii {name}!', "Oh, it's you!"],
    lines: [
      'Tweet tweet! I learned a new song today!',
      'Pink is the best color. Everybody knows that!',
      'I saw a shiny beetle by the trees once!',
      'Can I sit on top of your fruit? Just kidding! Tweet!',
      "I'm writing a song called \"Capybara Can't Be Faster\". It's a slow song. 🎵",
      "I practiced flying today. I got one whole foot off the ground! That's basically a plane! ✈️",
      'Do you like my feathers? I fluffed them just for you! ✨',
      "One day I'll be a famous singer. You can be my number one fan! 🎤",
      'I tried to sing to a fish. It just blubbed at me. Rude! 🐟',
      "Everyone says I'm small, but I have a BIG voice! CHEEP! 📣",
      "If I had a hat, it'd be sparkly. And pink. And have a smaller hat on top! 🎩",
      "I'm on a snack adventure. Have you seen any seeds? 🌱",
      'I can whistle! Fweeee! ...That was me. Pretty good, right? 🎶',
      'Guess what? Nothing! Tweet! I just wanted to say hi! 💛'
    ],
    facts: [
      "Did you know? Baby chicks can peep while they're still inside the egg! 🥚",
      'Did you know? Butterflies taste things with their feet! 🦋',
      'Did you know? Some birds can sleep while they fly! Wow! 😴'
    ],
    morning: [
      'Good morning! I sang the sun up today! 🌅🎵',
      'Tweet! Early bird catches the... breakfast! 🍳'
    ],
    day: [
      "It's so bright! Good thing I have sunglasses. Tweet! 😎",
      'Perfect day for a song! La la laaa! 🎶'
    ],
    evening: ["The sunset is so pretty! It's pink! Like me! 🌇", 'Time for my evening song. Shh, listen! 🎵'],
    night: [
      "Cheep... it's so late! I'm only up because I'm SO excited to see you! 🌙",
      'Look! Shooting stars! Make a wish! 🌠'
    ],
    ask: [
      'Hi {name}! Could you bring me {it}? That would make me so happy!',
      "Tweet! I'd write a whole song about you if you found me {it}! 🎵",
      'Pretty please, {name}? I really, really want {it}! Cheep! 🥺'
    ],
    remind: [
      'Tweet... still thinking about {it}! 💭',
      "La la la, {it}, la la la! That's my new song. Hint hint! 🎵"
    ],
    have: ['CHEEP! Is that {it}?! For me?! 😍', "You've got {it}! I can tell! My feathers are tingling! ✨"],
    thanks: [
      'TWEET TWEET! Thank you, {name}! 💕 This is going in my song!',
      "You're a superstar, {name}! 🌟"
    ],
    shy: ["Cheep! Who are you? Oh, you're nice! I'm Pip! 🐤", 'Do you like singing? I LOVE singing!'],
    buddy: [
      '{name}! My best buddy! I wrote a song about you! It goes: {name}, {name}! 🎵',
      "You're pinker than pink! That's the best compliment I know! 💗"
    ],
    pops: ['Tweet! 🐤', '🎵 La la la~', 'Cheep cheep!', '🎶 Fweee!', '✨ Sparkly!', 'Pink pink pink! 💗']
  },
  puddle: {
    hi: ['Quack!', 'Quack quack!', 'Heya, {name}!', 'Oh! Splashy hello!'],
    lines: [
      "Quack! You're my best friend!",
      'I love splashing in the hot spring!',
      'Fishing is fun! Wait for the splash, then tap!',
      'Capybaras are the calmest animals ever. Quack!',
      "I tried to catch a fish once. It caught ME. We're friends now. 🐟",
      "Why is my name Puddle? Because I'm always splashing in one! 💦",
      'I found a shell that sounds like the ocean. Or maybe that was my tummy. 🐚',
      'Rain is the best weather! Everything becomes a puddle! Like me! 🌧️',
      "I'm going to build a sandcastle. A BIG one. With a moat! For ducks! 🏰",
      "Do you think the fish know they're wet? 🤔",
      'Quack fact: I am 100% waterproof! 💦',
      "My grandma says I waddle like a champion. I've been practicing! 🏅",
      "If you ever need a swimming teacher, I'm your duck! 🏊",
      'I tried to be quiet for a whole minute. QUACK! Oops. 🙊'
    ],
    facts: [
      "Did you know? Capybaras can stay underwater for five whole minutes! That's longer than me! 🌊",
      'Did you know? Octopuses have three hearts! Imagine how much they can love! 🐙💕',
      'Did you know? A bunch of ducks sitting on the water is called a "raft"! 🦆🦆🦆'
    ],
    morning: ['Morning, {name}! The water is extra splashy today! 🌅', 'Quack! First splash of the day! 💦'],
    day: ['Hot day! Time for a dip! ☀️💦', "Want to go fishing? I'll cheer for you! 🎣"],
    evening: ['The water looks all orange and gold now! 🌇', 'Evening fish are the sneakiest fish! 🐟'],
    night: [
      "It's so dark! But I can still hear the waves. Swish, swish... 🌊",
      'Some fish only come out at night! Spooky! 🌙🐟'
    ],
    ask: [
      'Hi {name}! Could you bring me {it}? That would make me so happy!',
      'Quack! I have a mission for you, {name}: find me {it}! 🕵️',
      "I'd do a happy waddle dance for {it}! Can you find one? 💃"
    ],
    remind: [
      'Quack... still waiting for {it}! 🦆',
      'Any luck with {it}? No pressure! Okay, a little pressure. Quack! 😄'
    ],
    have: ["QUACK! You've got {it}! Is it for me?! 🥹", 'Wait wait wait... is that {it}?! 😍'],
    thanks: [
      'Quack quack QUACK! Thank you, {name}! 💕 Happy waddle dance!',
      "{name}, you're the best friend a duck ever had! 💦💕"
    ],
    shy: ["Quack! Oh! A new friend! I'm Puddle! 🦆", 'Do you like splashing? I like splashing.'],
    buddy: [
      "{name}, you're my best friend! You're even better than puddles! 💕",
      'Best buddies! We should go fishing together forever! 🎣'
    ],
    pops: ['Quack! 🦆', '💦 Splash!', 'Waddle waddle~', 'Quack quack!', '🐟 Fishies!', '🎵 Rub-a-dub~']
  }
};

// jokes: [question, answer]
const NB_JOKES = [
  ['What do you call a sleeping dinosaur?', 'A dino-SNORE! 🦖💤'],
  ['Why are fish so smart?', 'Because they live in schools! 🐠🏫'],
  ['What did the ocean say to the beach?', 'Nothing. It just waved! 🌊👋'],
  ['What do you call a bear with no teeth?', 'A gummy bear! 🧸'],
  ['Why did the cookie go to the doctor?', 'It was feeling crummy! 🍪'],
  ['How do you make a lemon drop?', 'Just let it fall! 🍋'],
  ['What kind of tree fits in your hand?', 'A palm tree! 🌴✋'],
  ['What do frogs order at the café?', 'French flies! 🐸'],
  ["What's a cat's favorite color?", 'Purr-ple! 💜'],
  ["Why don't eggs tell jokes?", "They'd crack each other up! 🥚"],
  ['What do you call a snowman in summer?', 'A puddle! 💦'],
  ['What did one plate say to the other plate?', 'Lunch is on me! 🍽️'],
  ['Why was the math book sad?', 'It had too many problems! 📘'],
  ['What do you call a fish with no eyes?', 'A fsh! 🐟'],
  ['Why do bees have sticky hair?', 'Because they use honeycombs! 🐝'],
  ['What goes up but never comes down?', 'Your age! 🎂'],
  ['What do you call a pig that does karate?', 'A pork chop! 🐷🥋'],
  ['Why did the banana go to the doctor?', "It wasn't peeling well! 🍌"]
];
const NB_GOSSIP = [
  'said you are the nicest capybara ever! 💕',
  'has been humming the same song ALL day. 🎵',
  'tried to do a cartwheel and landed in a bush! 🌿',
  'thinks your house is super cozy! 🏠',
  'wants to have a picnic with everyone! 🧺',
  'is secretly scared of butterflies. Shh! 🦋',
  'told me a joke so funny I snorted! 😆',
  'says the museum owl knows EVERYTHING. 🦉'
];

const nbRecent = {}; // neighbour id -> lines said lately (so they don't repeat)
const nbAsked = new Set(); // "id:day" once a neighbour has asked for today's thing
function nbFill(t, n) {
  const s = S.neigh[n.id],
    it =
      s && s.req && ITEMS[s.req]
        ? `${ITEMS[s.req].k === 'fruit' ? 'some' : 'a'} ${ITEMS[s.req].n} ${ITEMS[s.req].e}`
        : '';
  return t.replace(/\{name\}/g, esc(S.name || 'friend')).replace(/\{it\}/g, it);
}
// pick something not said lately
function nbPick(n, pool) {
  const r = (nbRecent[n.id] = nbRecent[n.id] || []),
    fresh = pool.filter(l => !r.includes(l)),
    l = pick(fresh.length ? fresh : pool);
  r.push(l);
  if (r.length > 24) r.shift();
  return l;
}
function nbSeason() {
  const m = clock().getMonth() + 1;
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}
const NB_SEASON = {
  spring: [
    'The flowers are waking up! Everything smells so nice! 🌷',
    "It's spring! Baby bugs everywhere! 🐛"
  ],
  summer: [
    "It's summer! Beach time, every time! 🏖️",
    "So hot! I want to live in the hot spring... wait, that's hot too! 😅"
  ],
  autumn: ['The leaves are all crunchy! Crunch crunch! 🍂', "It's autumn! Cozy blanket season! 🧣"],
  winter: ["Brrr! It's chilly! Good thing I'm fluffy! ❄️", 'Winter is the best time for the hot spring! ♨️']
};
function nbTime() {
  const h = clock().getHours();
  return isNight() ? 'night' : nightLvl() === 1 ? 'evening' : h < 11 ? 'morning' : 'day';
}
// things to say about what's going on right now
function nbContext(n) {
  const v = NB_TALK[n.id],
    s = S.neigh[n.id],
    out = [];
  out.push(...v[nbTime()]);
  out.push(...NB_SEASON[nbSeason()]);
  const a = myAcc();
  if (NEIGH_ACC[n.id] === a) out.push(`You're wearing the ${ACCS[a].n} I made you! 😭💕`);
  else if (ACCS[a] && a !== 'bow' && a !== 'none') out.push(`I love your ${ACCS[a].n}! So stylish! ✨`);
  const st = S.stack.length;
  if (st >= 8) out.push(`That fruit tower is taller than me!! ${st} fruit! 🍊🍊🍊`);
  else if (st >= 3) out.push(`You have ${st} fruit on your head! How do you balance like that?! 🍊`);
  const kinds = {};
  for (const k in S.bag)
    if (ITEMS[k] && S.bag[k] > 0) kinds[ITEMS[k].k] = (kinds[ITEMS[k].k] || 0) + S.bag[k];
  if ((kinds.fish || 0) + (kinds.sea || 0) >= 5)
    out.push('Your bag smells a little fishy... you must be a great fisher! 🎣');
  if ((kinds.bug || 0) >= 5) out.push("I think I heard your bag buzzing! That's a lot of bugs! 🐞");
  const mu = Object.keys(S.mu).length;
  if (!mu) out.push('Have you visited the museum? The owl is soooo smart. And a bit sleepy. 🦉');
  else out.push(`Your museum has ${mu} thing${mu === 1 ? '' : 's'} now! The owl must be so proud! 🏛️`);
  if (S.coins >= 2000)
    out.push(`${S.coins} coins?! You could buy something really fancy at the seaplane dock! ✈️`);
  if (S.yuzu) out.push('Did you put yuzu in the hot spring? It smells like lemonade! 🍋');
  if (S.board && /[1-9a-f]/.test(S.board))
    out.push("I saw your drawing on the board! It's a masterpiece! 🎨");
  if (typeof myCraft === 'function' && myCraft() !== 'pink')
    out.push(`Is that your ${CRAFTS[myCraft()].n} at the dock?! So fancy! 😍`);
  if (S.garden && S.garden.some(p => p && p.st >= 3))
    out.push('Your flowers are blooming! They look so happy! 🌷');
  if (S.day > 1 && S.day % 7 === 0) out.push(`It's day ${S.day} on the island! Happy island day! 🎉`);
  // news about the other neighbours
  const o = pick(NEIGH.filter(x => x !== n)),
    os = S.neigh[o.id];
  if (os && os.req && !os.done && ITEMS[os.req])
    out.push(`${o.e} ${o.n} is looking for ${ITEMS[os.req].n} ${ITEMS[os.req].e}. Maybe you can help!`);
  out.push(`${o.e} ${o.n} ${pick(NB_GOSSIP)}`);
  out.push(...(s.f >= 7 ? v.buddy : s.f < 3 ? v.shy : []));
  return out;
}
// the next thing a neighbour says: { text, joke?: answer }
function nbLine(n) {
  const v = NB_TALK[n.id],
    r = Math.random();
  if (r < 0.14) {
    const j = nbPick(
        n,
        NB_JOKES.map(q => q[0])
      ),
      jk = NB_JOKES.find(q => q[0] === j);
    let ans = jk[1];
    if (n.id === 'puddle' && jk[1].startsWith('A puddle')) ans += " ...Hey! That's my name! 🦆";
    return {
      text: `${pick(['Wanna hear a joke?', 'Okay okay, joke time!', 'I know a good one!'])} ${j}`,
      joke: ans
    };
  }
  if (r < 0.24) return { text: nbFill(nbPick(n, v.facts), n) };
  const pool = r < 0.6 ? nbContext(n) : v.lines;
  const l = nbPick(n, pool),
    hi = pick(v.hi);
  // sometimes a "Hop hop!" first (but not "Hop hop! Hop hop! ...")
  const pre =
    Math.random() < 0.3 && !l.toLowerCase().startsWith(hi.split(/[ !]/)[0].toLowerCase()) ? hi + ' ' : '';
  return { text: nbFill(pre + l, n) };
}
// what a neighbour says when you walk up (the request comes first on the first chat of the day)
function nbGreeting(n) {
  const v = NB_TALK[n.id],
    s = S.neigh[n.id];
  if (!s.done && s.req && ITEMS[s.req]) {
    if (S.bag[s.req]) return { text: nbFill(pick(v.have), n) };
    const k = n.id + ':' + S.day;
    if (!nbAsked.has(k)) {
      nbAsked.add(k);
      return { text: nbFill(pick(v.ask), n) };
    }
    if (Math.random() < 0.35) return { text: nbFill(nbPick(n, v.remind), n) };
  }
  return nbLine(n);
}
function nbThanks(n) {
  return nbFill(pick(NB_TALK[n.id].thanks), n);
}
// visiting a friend: their neighbours say hi too
function nbVisitLine(n) {
  const v = NB_TALK[n.id],
    r = Math.random();
  if (r < 0.15) {
    const jk = pick(NB_JOKES);
    return { text: `${pick(['Wanna hear a joke?', 'I know a good one!'])} ${jk[0]}`, joke: jk[1] };
  }
  const pool = [
    `Hi {name}! Welcome to ${hostName()}'s island! 🌸`,
    'Yay, a visitor! Hi {name}! 💕',
    `${hostName()} talks about you all the time! 💕`,
    'Did you come on the seaplane? Wheee! ✈️',
    ...v.lines,
    ...v.facts,
    ...v[nbTime()],
    ...NB_SEASON[nbSeason()]
  ];
  return { text: nbFill(nbPick(n, pool), n).replace(/\{it\}/g, '') };
}

// ----- little speech bubbles over neighbours' heads now and then
let nbPopT = 6;
function nbPops(dt) {
  if ((nbPopT -= dt) > 0) return;
  nbPopT = rnd(9, 18);
  if (busy || document.hidden) return;
  const near = NEIGH.filter(n => n !== talking && !n.soak && Math.hypot(n.x - P.x, n.y - P.y) < 330);
  if (!near.length) return;
  const n = pick(near),
    v = NB_TALK[n.id],
    s = S.neigh[n.id];
  let t;
  if (!ONV() && s && !s.done && s.req && Math.random() < 0.4) t = `❗ Psst, ${S.name || 'friend'}!`;
  else if (isNight() && Math.random() < 0.4) t = pick(['*yawn* 🌙', 'Zzz... 💤', 'Pretty stars ✨']);
  else t = pick(v.pops);
  n.say = { x: t, t: time };
}
