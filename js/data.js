// Static game data: items, island layout and geometry, neighbours, museum/café content.
'use strict';

// ---------- DATA ----------
const ITEMS = {
  orange: { e: '🍊', n: 'Orange', p: 30, k: 'fruit' },
  yuzu: { e: '🍋', n: 'Yuzu', p: 40, k: 'fruit' },
  butterfly: { e: '🦋', n: 'Butterfly', p: 60, k: 'bug', w: 20, fly: 1 },
  ladybug: { e: '🐞', n: 'Ladybug', p: 50, k: 'bug', w: 20 },
  bee: { e: '🐝', n: 'Bee', p: 90, k: 'bug', w: 12, fly: 1 },
  caterpillar: { e: '🐛', n: 'Caterpillar', p: 40, k: 'bug', w: 18 },
  cricket: { e: '🦗', n: 'Cricket', p: 70, k: 'bug', w: 12 },
  snail: { e: '🐌', n: 'Snail', p: 45, k: 'bug', w: 15 },
  ant: { e: '🐜', n: 'Ant', p: 30, k: 'bug', w: 15 },
  beetle: { e: '🪲', n: 'Shiny Beetle', p: 250, k: 'bug', w: 4 },
  fish: { e: '🐟', n: 'Little Fish', p: 50, k: 'fish', w: 30 },
  tropical: { e: '🐠', n: 'Rainbow Fish', p: 120, k: 'fish', w: 18 },
  crab: { e: '🦀', n: 'Crab', p: 90, k: 'fish', w: 16 },
  shrimp: { e: '🦐', n: 'Shrimp', p: 60, k: 'fish', w: 16 },
  puffer: { e: '🐡', n: 'Pufferfish', p: 200, k: 'fish', w: 8 },
  squid: { e: '🦑', n: 'Squid', p: 180, k: 'fish', w: 7 },
  octopus: { e: '🐙', n: 'Octopus', p: 250, k: 'fish', w: 5 },
  shark: { e: '🦈', n: 'Shark', p: 600, k: 'fish', w: 2 }
};
const FURN = [
  ['bed', '🛏️', 'Cozy Bed', 300],
  ['chair', '🪑', 'Wooden Chair', 150],
  ['sofa', '🛋️', 'Comfy Sofa', 450],
  ['plant', '🪴', 'Potted Plant', 120],
  ['teddy', '🧸', 'Teddy Bear', 200],
  ['painting', '🖼️', 'Painting', 350],
  ['bow', '🎀', 'Giant Bow', 250],
  ['tulips', '🌷', 'Tulip Vase', 140],
  ['piano', '🎹', 'Piano', 800],
  ['tv', '📺', 'TV', 600],
  ['mirror', '🪞', 'Mirror', 300],
  ['lantern', '🏮', 'Paper Lantern', 220],
  ['clock', '🕰️', 'Clock', 280],
  ['teapot', '🫖', 'Teapot', 160],
  ['cake', '🎂', 'Party Cake', 260],
  ['guitar', '🎸', 'Guitar', 500],
  ['basket', '🧺', 'Picnic Basket', 130],
  ['globe', '🌍', 'Globe', 320],
  ['books', '📚', 'Bookshelf', 380],
  ['bath', '🛁', 'Bathtub', 700],
  ['vase', '🏺', 'Clay Vase', 260],
  ['chime', '🎐', 'Wind Chime', 180],
  ['kite', '🪁', 'Kite', 220],
  ['statue', '🗿', 'Stone Statue', 650],
  ['umbrella', '⛱️', 'Beach Umbrella', 340],
  ['carp', '🎏', 'Carp Streamer', 240],
  ['candles', '🕯️', 'Candles', 120],
  ['easel', '🎨', 'Easel', 420],
  ['wheel', '🎡', 'Mini Ferris Wheel', 550],
  ['radio', '📻', 'Radio', 300],
  ['telescope', '🔭', 'Telescope', 720],
  ['hourglass', '⌛', 'Hourglass', 260],
  ['unicorn', '🦄', 'Unicorn Plush', 0, 1],
  ['carousel', '🎠', 'Carousel', 0, 1],
  ['fountain', '⛲', 'Fountain', 0, 1],
  ['rainbow', '🌈', 'Rainbow', 0, 1],
  ['crown', '👑', 'Royal Crown', 0, 1],
  ['cupcake', '🧁', 'Cupcake Tower', 0, 1],
  ['doll', '🪆', 'Nesting Dolls', 0, 1],
  ['trophy', '🏆', 'Golden Trophy', 0, 1],
  ['balloon', '🎈', 'Balloons', 0, 1],
  ['sparkle', '💖', 'Sparkly Heart', 0, 1],
  ['pinata', '🪅', 'Piñata', 0, 1],
  ['crystal', '🔮', 'Crystal Ball', 0, 1],
  ['ufo', '🛸', 'Toy UFO', 0, 1],
  ['owlplush', '🦉', 'Hoot Plush', 0, 1],
  ['microscope', '🔬', 'Microscope', 0, 1],
  ['shipbottle', '⛵', 'Ship in a Bottle', 0, 1],
  ['geode', '💎', 'Crystal Geode', 0, 1],
  ['cafetable', '☕', 'Tiny Café Table', 0, 1],
  ['mug', '☕', 'Bijou Mug', 0, 1],
  ['cakestand', '🍰', 'Cake Stand', 0, 1],
  ['tr_bug', '🦋', 'Golden Butterfly Trophy', 0, 1],
  ['tr_fish', '🐟', 'Golden Fish Trophy', 0, 1],
  ['tr_fossil', '🦖', 'Golden Dino Trophy', 0, 1],
  ['tr_sea', '🐚', 'Golden Shell Trophy', 0, 1],
  ['tr_art', '🖼️', 'Golden Frame Trophy', 0, 1]
];
FURN.forEach(
  ([id, e, n, p, g]) => (ITEMS[id] = { e, n, p: g ? 100 : Math.round(p / 4), buy: p, k: 'furn', gift: !!g })
);
// ---------- v4 DATA: museum, café, fossils, sea creatures, art, flowers, tools, accessories ----------
const GOLD = 'sepia(1) saturate(4) hue-rotate(-8deg) brightness(1.12)',
  FOS = 'sepia(.9) saturate(.5) brightness(.95) contrast(1.05)',
  HUE = d => `hue-rotate(${d}deg)`,
  GREY = 'saturate(0) brightness(1.35)';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
{
  const q = new URLSearchParams(location.search);
  if (q.has('hour')) window.FAKE_HOUR = +q.get('hour');
  if (q.has('month')) window.FAKE_MONTH = +q.get('month');
}
// t = time of day (a any, d day 6-18, m morning 5-12, e evening 16-21, n night 19-5), m = months [from,to] (northern hemisphere, simplified)
Object.assign(ITEMS, {
  // --- bugs (8 old ones are around all day, all year) ---
  monarch: {
    e: '🦋',
    n: 'Monarch Butterfly',
    p: 140,
    k: 'bug',
    w: 12,
    fly: 1,
    f: 'saturate(1.5) brightness(.95)',
    t: 'd',
    m: [9, 11]
  },
  emperor: {
    e: '🦋',
    n: 'Emperor Butterfly',
    p: 300,
    k: 'bug',
    w: 6,
    fly: 1,
    f: HUE(185) + ' saturate(1.3)',
    t: 'e',
    m: [6, 9]
  },
  peacock: {
    e: '🦋',
    n: 'Peacock Butterfly',
    p: 220,
    k: 'bug',
    w: 9,
    fly: 1,
    f: HUE(250),
    t: 'd',
    m: [3, 6]
  },
  moth: { e: '🦋', n: 'Moth', p: 60, k: 'bug', w: 14, fly: 1, f: 'saturate(.15) brightness(1.45)', t: 'n' },
  snowmoth: {
    e: '🦋',
    n: 'Snow Moth',
    p: 260,
    k: 'bug',
    w: 8,
    fly: 1,
    f: HUE(170) + ' saturate(.35) brightness(1.55)',
    t: 'n',
    m: [12, 2]
  },
  firefly: {
    e: '🪲',
    n: 'Firefly',
    p: 300,
    k: 'bug',
    w: 12,
    fly: 1,
    f: HUE(-60) + ' saturate(1.6) brightness(1.25)',
    t: 'n',
    m: [6, 6]
  },
  cicada: { e: '🪰', n: 'Cicada', p: 180, k: 'bug', w: 12, f: HUE(60) + ' saturate(1.4)', t: 'd', m: [7, 8] },
  grasshopper: {
    e: '🦗',
    n: 'Grasshopper',
    p: 160,
    k: 'bug',
    w: 12,
    f: HUE(20) + ' saturate(1.3)',
    t: 'd',
    m: [7, 9]
  },
  mantis: {
    e: '🦗',
    n: 'Orchid Mantis',
    p: 400,
    k: 'bug',
    w: 5,
    f: HUE(200) + ' saturate(.8) brightness(1.3)',
    t: 'd',
    m: [3, 11]
  },
  stag: {
    e: '🪲',
    n: 'Stag Beetle',
    p: 500,
    k: 'bug',
    w: 5,
    f: HUE(-90) + ' saturate(.6) brightness(.7)',
    t: 'n',
    m: [6, 8]
  },
  rhino: {
    e: '🪲',
    n: 'Rhino Beetle',
    p: 600,
    k: 'bug',
    w: 4,
    f: 'saturate(.2) brightness(.55)',
    t: 'n',
    m: [7, 8]
  },
  goldstag: { e: '🪲', n: 'Golden Stag', p: 1200, k: 'bug', w: 1, f: GOLD, t: 'n', m: [7, 8] },
  rainbowstag: {
    e: '🪲',
    n: 'Rainbow Stag',
    p: 900,
    k: 'bug',
    w: 2,
    f: HUE(150) + ' saturate(1.8)',
    t: 'n',
    m: [6, 9]
  },
  spider: { e: '🕷️', n: 'Garden Spider', p: 120, k: 'bug', w: 10, t: 'n' },
  scorpion: { e: '🦂', n: 'Scorpion', p: 700, k: 'bug', w: 3, t: 'n', m: [5, 10] },
  worm: { e: '🪱', n: 'Earthworm', p: 40, k: 'bug', w: 14, t: 'm' },
  bumblebee: {
    e: '🐝',
    n: 'Bumblebee',
    p: 200,
    k: 'bug',
    w: 9,
    fly: 1,
    f: 'saturate(1.6) brightness(.9)',
    t: 'd',
    m: [3, 7]
  },
  frostbeetle: {
    e: '🪲',
    n: 'Frost Beetle',
    p: 350,
    k: 'bug',
    w: 7,
    f: HUE(90) + ' saturate(.5) brightness(1.4)',
    t: 'd',
    m: [12, 2]
  },
  pinkladybug: {
    e: '🐞',
    n: 'Pink Ladybug',
    p: 150,
    k: 'bug',
    w: 12,
    f: HUE(-30) + ' saturate(.7) brightness(1.35)',
    t: 'd',
    m: [3, 5]
  },
  fruitfly: { e: '🪰', n: 'Fruit Fly', p: 25, k: 'bug', w: 12 },
  walkingleaf: { e: '🍃', n: 'Walking Leaf', p: 400, k: 'bug', w: 5, t: 'd', m: [7, 9] },
  rainbowsnail: {
    e: '🐌',
    n: 'Rainbow Snail',
    p: 250,
    k: 'bug',
    w: 8,
    f: HUE(200) + ' saturate(1.6)',
    t: 'm',
    m: [6, 7]
  },
  // --- fish (8 old ones are around all day, all year) ---
  clownfish: { e: '🐠', n: 'Clownfish', p: 150, k: 'fish', w: 12, f: HUE(-25) + ' saturate(1.6)', m: [4, 9] },
  bluetang: { e: '🐠', n: 'Blue Tang', p: 200, k: 'fish', w: 10, f: HUE(180), m: [4, 9] },
  angelfish: { e: '🐠', n: 'Angelfish', p: 260, k: 'fish', w: 8, f: HUE(230), t: 'e', m: [5, 10] },
  guppy: {
    e: '🐠',
    n: 'Guppy',
    p: 120,
    k: 'fish',
    w: 12,
    f: HUE(290) + ' saturate(1.3)',
    t: 'd',
    m: [4, 11]
  },
  salmon: { e: '🐟', n: 'Salmon', p: 300, k: 'fish', w: 10, f: HUE(150) + ' saturate(1.3)', m: [9, 10] },
  tuna: { e: '🐟', n: 'Tuna', p: 500, k: 'fish', w: 6, f: 'saturate(.5) brightness(.7)', m: [11, 4] },
  goldfish: { e: '🐟', n: 'Goldfish', p: 400, k: 'fish', w: 4, f: GOLD },
  koi: { e: '🐟', n: 'Koi', p: 450, k: 'fish', w: 5, f: HUE(160) + ' saturate(1.8) brightness(1.1)', t: 'n' },
  catfish: {
    e: '🐟',
    n: 'Catfish',
    p: 220,
    k: 'fish',
    w: 9,
    f: 'sepia(1) saturate(1.2) brightness(.8)',
    t: 'n',
    m: [5, 10]
  },
  bass: { e: '🐟', n: 'Sea Bass', p: 80, k: 'fish', w: 20, f: GREY },
  snapper: { e: '🐟', n: 'Red Snapper', p: 240, k: 'fish', w: 10, f: HUE(145) + ' saturate(1.6)' },
  mackerel: {
    e: '🐟',
    n: 'Mackerel',
    p: 110,
    k: 'fish',
    w: 14,
    f: HUE(-20) + ' saturate(.6) brightness(1.1)'
  },
  lobster: { e: '🦞', n: 'Lobster', p: 450, k: 'fish', w: 5, t: 'n' },
  turtle: { e: '🐢', n: 'Sea Turtle', p: 600, k: 'fish', w: 3, t: 'd', m: [5, 10] },
  frog: { e: '🐸', n: 'Frog', p: 120, k: 'fish', w: 10, m: [5, 8] },
  dolphin: { e: '🐬', n: 'Dolphin', p: 900, k: 'fish', w: 2, t: 'd', m: [6, 9] },
  whale: { e: '🐋', n: 'Whale', p: 1500, k: 'fish', w: 1, m: [6, 9] },
  babywhale: { e: '🐳', n: 'Baby Whale', p: 1200, k: 'fish', w: 2, m: [12, 3] },
  pinkpuffer: {
    e: '🐡',
    n: 'Pink Puffer',
    p: 300,
    k: 'fish',
    w: 7,
    f: HUE(-45) + ' saturate(.8) brightness(1.3)',
    m: [7, 9]
  },
  kingcrab: {
    e: '🦀',
    n: 'King Crab',
    p: 500,
    k: 'fish',
    w: 6,
    f: 'saturate(1.4) brightness(.75)',
    m: [11, 3]
  },
  goldshrimp: { e: '🦐', n: 'Golden Shrimp', p: 800, k: 'fish', w: 2, f: GOLD, t: 'n' },
  glowsquid: {
    e: '🦑',
    n: 'Firefly Squid',
    p: 400,
    k: 'fish',
    w: 6,
    f: HUE(-110) + ' saturate(1.5) brightness(1.2)',
    t: 'n',
    m: [3, 6]
  },
  // --- sea creatures (tide pools) ---
  seastar: { e: '⭐', n: 'Sea Star', p: 100, k: 'sea', w: 18, f: HUE(-25) + ' saturate(1.4)' },
  urchin: { e: '🦔', n: 'Sea Urchin', p: 200, k: 'sea', w: 10, f: HUE(220) + ' saturate(1.2)', m: [5, 9] },
  seaslug: { e: '🐌', n: 'Sea Slug', p: 150, k: 'sea', w: 12, f: HUE(170) + ' saturate(1.4)' },
  oyster: { e: '🦪', n: 'Oyster', p: 120, k: 'sea', w: 16 },
  pearloyster: {
    e: '🦪',
    n: 'Pearl Oyster',
    p: 600,
    k: 'sea',
    w: 4,
    f: HUE(-40) + ' saturate(1.3) brightness(1.15)'
  },
  anemone: { e: '🌺', n: 'Sea Anemone', p: 180, k: 'sea', w: 12 },
  seagrapes: {
    e: '🍇',
    n: 'Sea Grapes',
    p: 160,
    k: 'sea',
    w: 10,
    f: HUE(-150) + ' saturate(1.2)',
    m: [6, 9]
  },
  seaweed: { e: '🌿', n: 'Seaweed', p: 80, k: 'sea', w: 14, f: HUE(-30) + ' brightness(.85)', m: [10, 7] },
  mantisshrimp: {
    e: '🦐',
    n: 'Mantis Shrimp',
    p: 400,
    k: 'sea',
    w: 6,
    f: HUE(120) + ' saturate(1.5)',
    t: 'd'
  },
  spidercrab: {
    e: '🦀',
    n: 'Spider Crab',
    p: 700,
    k: 'sea',
    w: 4,
    f: HUE(20) + ' saturate(.8) brightness(1.2)',
    m: [3, 5]
  },
  seacucumber: {
    e: '🥒',
    n: 'Sea Cucumber',
    p: 140,
    k: 'sea',
    w: 10,
    f: HUE(-80) + ' saturate(.6)',
    m: [11, 4]
  },
  seapig: {
    e: '🐷',
    n: 'Sea Pig',
    p: 500,
    k: 'sea',
    w: 5,
    f: 'saturate(.5) brightness(1.15)',
    t: 'e',
    m: [11, 2]
  },
  nautilus: {
    e: '🐚',
    n: 'Nautilus',
    p: 500,
    k: 'sea',
    w: 5,
    f: 'sepia(.6) saturate(2.2) hue-rotate(-15deg)',
    m: [9, 6]
  },
  seapineapple: {
    e: '🍍',
    n: 'Sea Pineapple',
    p: 220,
    k: 'sea',
    w: 9,
    f: HUE(-35) + ' saturate(1.3)',
    m: [4, 8]
  },
  barnacle: { e: '🌰', n: 'Barnacle', p: 60, k: 'sea', w: 12, f: GREY }
});
// --- fossils (dig up ⭐ cracks, Professor Hoot identifies them) ---
[
  ['trex', '🦖', 'T-Rex Skull', 800],
  ['brachio', '🦕', 'Brachio Neck', 700],
  ['mammoth', '🦣', 'Mammoth Tusk', 600],
  ['sabertooth', '🐯', 'Sabertooth Skull', 550],
  ['dodo', '🦤', 'Dodo Bones', 450],
  ['ptera', '🦅', 'Ptera Wing', 600],
  ['tricera', '🦏', 'Tricera Horns', 650],
  ['ankylo', '🐢', 'Ankylo Shell', 550],
  ['megatooth', '🦷', 'Megalodon Tooth', 500],
  ['coprolite', '💩', 'Coprolite', 300],
  ['juramaia', '🐭', 'Juramaia', 350],
  ['dimetrodon', '🦎', 'Dimetrodon', 500],
  ['eusthen', '🐟', 'Eusthenopteron', 400],
  ['dunkle', '🐡', 'Dunkleosteus', 450],
  ['anomalo', '🦐', 'Anomalocaris', 400],
  ['australo', '🐒', 'Australopith', 550],
  ['megacero', '🦌', 'Megacero Antlers', 600],
  ['ichthyo', '🐬', 'Ichthyosaur', 550],
  ['ammonite', '🐚', 'Ammonite', 300],
  ['trilobite', '🪲', 'Trilobite', 300],
  ['amber', '🍯', 'Amber', 400, 1],
  ['petrified', '🪵', 'Petrified Wood', 300],
  ['fern', '🌿', 'Fern Fossil', 250],
  ['footprint', '🐾', 'Dino Footprint', 350],
  ['dinoegg', '🥚', 'Dino Egg', 450]
].forEach(
  ([id, e, n, p, nf]) =>
    (ITEMS[id] = {
      e,
      n,
      p,
      k: 'fossil',
      f: nf ? '' : id === 'megatooth' ? 'sepia(1) saturate(1.2) brightness(.75)' : FOS
    })
);
// --- art (Fennel's boat; all genuine!) ---
[
  ['starry', '🌌', 'Starry Capy Night', '#1f2f6b', 900],
  ['sunflowers', '🌻', 'Sunny Sunflowers', '#ffe9a8', 700],
  ['wave', '🌊', 'The Big Wave', '#f4ead2', 800],
  ['smile', '😊', 'The Gentle Smile', '#c9a06a', 1000],
  ['lilies', '🪷', 'Water Lilies', '#9fd9c8', 750],
  ['yell', '😱', 'The Big Surprise', '#ff9f5a', 650],
  ['pearl', '👧', 'Girl with a Pearl', '#2a2a3a', 850],
  ['venus', '🐚', 'Shell Rising', '#bfe6f2', 800],
  ['blossoms', '🌸', 'Blossom Screen', '#fff1d6', 600],
  ['apple', '🍎', 'The Apple Hat', '#b8d8f0', 650],
  ['dancers', '💃', 'The Dancers', '#f7d6e6', 700],
  ['poppies', '🌺', 'Poppy Field', '#cfe8a8', 600]
].forEach(([id, e, n, bg, buy]) => (ITEMS[id] = { e, n, bg, buy, p: Math.round(buy / 2), k: 'art' }));
// --- beach finds, tools, seeds, flowers ---
Object.assign(ITEMS, {
  shell_conch: { e: '🐚', n: 'Seashell', p: 60, k: 'shell' },
  shell_scallop: { e: '🐚', n: 'Pink Scallop', p: 90, k: 'shell', f: HUE(-40) + ' saturate(1.3)' },
  shell_cowrie: { e: '🐚', n: 'Cowrie', p: 50, k: 'shell', f: 'sepia(.6) saturate(1.2) brightness(1.05)' },
  sanddollar: { e: '🪙', n: 'Sand Dollar', p: 100, k: 'shell', f: 'sepia(.5) saturate(.7) brightness(1.15)' },
  seaglass: { e: '💎', n: 'Sea Glass', p: 120, k: 'shell', f: HUE(-60) + ' saturate(.7) brightness(1.2)' },
  starbit: { e: '🌟', n: 'Star Piece', p: 300, k: 'star' },
  fossilq: { e: '🦴', n: 'Mystery Fossil', p: 100, k: 'misc' },
  shovel: { e: '🪏', n: 'Shovel', p: 0, buy: 120, k: 'tool' },
  can: {
    e: '💧',
    n: 'Watering Can',
    p: 0,
    buy: 120,
    k: 'tool',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M40 33l15-11 4 4-14 14z" fill="#5aa7f2"/><ellipse cx="57" cy="23" rx="5" ry="3.5" fill="#3f8ad6" transform="rotate(-38 57 23)"/><path d="M19 28q9-15 18 0" stroke="#3f8ad6" stroke-width="4" fill="none"/><path d="M13 28h29v22a5 5 0 0 1-5 5H18a5 5 0 0 1-5-5z" fill="#6fb6ff"/><rect x="13" y="34" width="29" height="4" fill="#fff" opacity=".55"/><path d="M27 49q-5-4-3-7q2-2 3 0q1-2 3 0q2 3-3 7z" fill="#ff8cc6"/></svg>'
  },
  seed_tulip: { e: '🌱', n: 'Tulip Seeds', p: 10, buy: 40, k: 'seed' },
  seed_rose: { e: '🌱', n: 'Rose Seeds', p: 15, buy: 60, k: 'seed', f: HUE(-50) }
});
const FLC = ['red', 'white', 'yellow', 'pink', 'orange', 'purple', 'blue'],
  FLN = {
    red: 'Red',
    white: 'White',
    yellow: 'Yellow',
    pink: 'Pink',
    orange: 'Orange',
    purple: 'Purple',
    blue: 'Blue'
  };
const FLF = {
  tulip: {
    red: HUE(35) + ' saturate(2.2) brightness(.95)',
    white: 'saturate(.15) brightness(1.25)',
    yellow: 'sepia(1) saturate(4) hue-rotate(8deg) brightness(1.3)',
    pink: 'saturate(.6) brightness(1.2)',
    orange: 'sepia(1) saturate(6) hue-rotate(-38deg)',
    purple: HUE(-80),
    blue: HUE(-150) + ' saturate(1.3)'
  },
  rose: {
    red: '',
    white: 'saturate(0) brightness(3.2) contrast(.8)',
    yellow: 'sepia(1) saturate(6) hue-rotate(15deg) brightness(1.9)',
    pink: HUE(-15) + ' saturate(.55) brightness(2)',
    orange: 'sepia(1) saturate(6) hue-rotate(-20deg) brightness(1.4)',
    purple: HUE(-70),
    blue: HUE(-145) + ' brightness(1.1)'
  }
};
['tulip', 'rose'].forEach(s =>
  FLC.forEach(
    c =>
      (ITEMS['fl_' + s + '_' + c] = {
        e: s === 'tulip' ? '🌷' : '🌹',
        n: FLN[c] + ' ' + (s === 'tulip' ? 'Tulip' : 'Rose'),
        p: c === 'blue' ? 300 : ['red', 'white', 'yellow'].includes(c) ? 40 : 90,
        k: 'flower',
        f: FLF[s][c]
      })
  )
);
// trophies / rewards get special colours
[['tr_bug'], ['tr_fish'], ['tr_fossil'], ['tr_sea'], ['tr_art']].forEach(([id]) => {
  if (ITEMS[id]) {
    ITEMS[id].f = GOLD;
    ITEMS[id].ns = 1;
  }
});
['owlplush', 'microscope', 'shipbottle', 'geode', 'cafetable', 'mug', 'cakestand'].forEach(id => {
  if (ITEMS[id]) ITEMS[id].ns = 1;
});
if (ITEMS.mug) ITEMS.mug.f = HUE(-60) + ' saturate(1.6) brightness(1.1)';
if (ITEMS.cafetable)
  ITEMS.cafetable.svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="59" rx="20" ry="4" fill="rgba(80,30,70,.22)"/><rect x="29" y="33" width="6" height="24" rx="2" fill="#b98352"/><ellipse cx="32" cy="57" rx="10" ry="3" fill="#8a5a36"/><path d="M8 40q-2 10 2 18M14 42l-2 15" stroke="#ff8cc6" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M56 40q2 10-2 18M50 42l2 15" stroke="#ff8cc6" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="34" rx="23" ry="8" fill="#e56aa8"/><ellipse cx="32" cy="32" rx="23" ry="8" fill="#ffc1dc"/><ellipse cx="26" cy="30" rx="9" ry="2.5" fill="#fff" opacity=".5"/><rect x="27" y="20" width="10" height="11" rx="2.5" fill="#fff"/><path d="M37 23q5 0 5 3.5t-5 3.5" stroke="#fff" stroke-width="2" fill="none"/><path d="M30 17q2-3 0-6M34 17q2-3 0-6" stroke="#e8c3d6" stroke-width="1.6" fill="none"/><path d="M42 30q-2-3 1-4q2 0 2 2q0-2 2-2q3 1 1 4l-3 2z" fill="#ff5fa8"/></svg>';
const WINGS = [
    ['bug', '🦋', 'Bugs'],
    ['fish', '🐟', 'Fish'],
    ['fossil', '🦴', 'Fossils'],
    ['sea', '🐚', 'Sea Creatures'],
    ['art', '🖼️', 'Art Gallery']
  ],
  WK = WINGS.map(w => w[0]);
// accessories for the mirror (h = how to unlock)
const ACCS = {
  bow: { n: 'White Bow' },
  flower: { n: 'Flower Crown' },
  yuzuhat: { n: 'Yuzu Hat' },
  star: { n: 'Star Clip', h: 'Donate 10 things to the museum 🏛️' },
  leaf: { n: 'Leaf Hat', h: 'Be best buddies with Mochi 🐰 (7 hearts)' },
  shades: { n: 'Sunglasses', h: 'Be best buddies with Pip 🐤 (7 hearts)' },
  sailor: { n: 'Sailor Hat', h: 'Be best buddies with Puddle 🦆 (7 hearts)' },
  beret: { n: 'Pink Beret', h: 'Fill a café stamp card ☕' },
  glasses: { n: 'Round Glasses', h: 'Donate 30 things to the museum 🏛️' },
  crown: { n: 'Capy Crown', h: 'Finish a whole museum room 🏆' },
  none: { n: 'Nothing' }
};
// planes and helicopters at the Capy Air dock (js/hangar.js); p = price in coins
const CRAFTS = {
  pink: { n: 'Pink Seaplane', e: '🛩️', p: 0, d: 'The classic! Pink, cozy and very huggable.' },
  sunny: { n: 'Sunny Seaplane', e: '🛩️', p: 600, d: 'Bright yellow, like a flying lemon! 🍋' },
  biplane: { n: 'Rainbow Biplane', e: '🛩️', p: 1500, d: 'Two wings and every color of the rainbow! 🌈' },
  copter: { n: 'Bubble Copter', e: '🚁', p: 3000, d: 'Whirly blades and a big bubble window! 🫧' },
  jet: { n: 'Starlight Jet', e: '✈️', p: 5000, d: 'Super fast and super sparkly! ✨' }
};
const NEIGH_ACC = { mochi: 'leaf', pip: 'shades', puddle: 'sailor' };
const BASE_COLORS = ['pink', 'caramel', 'cocoa', 'cream', 'lavender', 'mint', 'sky', 'peach'];
const COLOR_ORDER = [
  'pink',
  'blush',
  'rose',
  'peach',
  'caramel',
  'cocoa',
  'cream',
  'lavender',
  'mint',
  'sky'
];
const CAFE_MENU = [
  {
    id: 'latte',
    e: '☕',
    n: 'Café Latte',
    p: 100,
    fx: { speed: 1.35 },
    say: 'Zoom zoom! You feel super speedy today! 💨'
  },
  {
    id: 'cocoa',
    e: '☕',
    f: 'sepia(.8) saturate(1.6) brightness(.8)',
    n: 'Hot Cocoa',
    p: 100,
    fx: { trail: ['💗', '💖'] },
    say: 'So cozy! Little hearts follow you all day! 💗'
  },
  {
    id: 'strawberry',
    e: '🥛',
    f: 'sepia(1) saturate(3) hue-rotate(295deg) brightness(1.08)',
    n: 'Strawberry Milk',
    p: 120,
    fx: { trail: ['✨', '🌸'] },
    say: 'Sparkly! You leave pink sparkles today! ✨'
  },
  {
    id: 'yuzutea',
    e: '🍵',
    f: HUE(-45) + ' saturate(1.6) brightness(1.1)',
    n: 'Yuzu Tea',
    p: 120,
    fx: { lucky: 1 },
    say: "Lucky day! Bugs won't get away from you today! 🍀"
  },
  {
    id: 'yuzucocoa',
    e: '☕',
    f: 'sepia(.8) saturate(1.6) brightness(.8)',
    x: '🍋',
    n: 'Yuzu Hot Chocolate',
    p: 150,
    fx: { speed: 1.25, trail: ['🍋', '✨'] },
    say: 'Warm and zippy! Yuzu sparkles follow you! 🍋'
  },
  {
    id: 'capyccino',
    e: '☕',
    x: '💗',
    n: 'Capy-ccino',
    p: 200,
    fx: { speed: 1.4, trail: ['🌈', '⭐', '💖'] },
    say: 'The house special! A rainbow trail and super speed! 🌈'
  }
];
const CAFE_REWARDS = [{ item: 'cafetable', acc: 'beret' }, { item: 'mug' }, { item: 'cakestand' }];
const MILESTONE = [
  { acc: 'star', coins: 300 },
  { item: 'owlplush' },
  { acc: 'glasses', item: 'microscope' },
  { item: 'shipbottle' },
  { item: 'geode' }
];
const TNAME = { a: '🕐 Any time', d: '☀️ Daytime', m: '🌅 Mornings', e: '🌇 Evenings', n: '🌙 Nights' },
  TICON = { a: '', d: '☀️', m: '🌅', e: '🌇', n: '🌙' };
// original characters (drawn here, not copied): Professor Hoot the owl, Bijou the pigeon barista, Fennel the fennec-fox art seller
const OWL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110"><ellipse cx="50" cy="105" rx="28" ry="4.5" fill="rgba(80,30,70,.22)"/><path d="M24 30L17 7l20 15z" fill="#9d86cf"/><path d="M76 30l7-23-20 15z" fill="#9d86cf"/><ellipse cx="50" cy="62" rx="35" ry="41" fill="#b9a3e3"/><ellipse cx="17" cy="70" rx="9" ry="21" fill="#9d86cf" transform="rotate(12 17 70)"/><ellipse cx="83" cy="70" rx="9" ry="21" fill="#9d86cf" transform="rotate(-12 83 70)"/><ellipse cx="50" cy="78" rx="23" ry="24" fill="#fff4e6"/><path d="M36 74q4 4 8 0q4 4 8 0q4 4 8 0M34 84q4 4 8 0q4 4 8 0q4 4 8 0q4 4 8 0" stroke="#ead3bb" stroke-width="2" fill="none"/><ellipse cx="36" cy="40" rx="15" ry="14" fill="#efe6ff"/><ellipse cx="64" cy="40" rx="15" ry="14" fill="#efe6ff"/><circle cx="36" cy="41" r="7" fill="#3a1f4d"/><circle cx="64" cy="41" r="7" fill="#3a1f4d"/><circle cx="38.5" cy="38.5" r="2.4" fill="#fff"/><circle cx="66.5" cy="38.5" r="2.4" fill="#fff"/><circle cx="36" cy="41" r="12" fill="none" stroke="#e0b340" stroke-width="2.6"/><circle cx="64" cy="41" r="12" fill="none" stroke="#e0b340" stroke-width="2.6"/><path d="M48 40q2-3 4 0" stroke="#e0b340" stroke-width="2.6" fill="none"/><path d="M46 51h8l-4 8z" fill="#ff9f43"/><ellipse cx="23" cy="54" rx="5" ry="3" fill="#ff9fcf" opacity=".75"/><ellipse cx="77" cy="54" rx="5" ry="3" fill="#ff9fcf" opacity=".75"/><path d="M21 61q29 13 58 0l2 8q-31 13-62 0z" fill="#ff6fae"/><path d="M30 65l3 8M42 68l2 8M56 68l-1 8M68 65l-3 8" stroke="#fff" stroke-width="2.4" opacity=".85"/><path d="M64 70l10 26H63l-4-25z" fill="#ff6fae"/><path d="M64 96v5M67 96v5M70 96v5M73 96v5" stroke="#ff6fae" stroke-width="2"/><path d="M39 102l-3 4M42 102v5M45 102l3 4M55 102l-3 4M58 102v5M61 102l3 4" stroke="#ff9f43" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="14" r="4" fill="#ffd84d"/><circle cx="30" cy="14" r="1.6" fill="#ff8cc6"/></svg>';
const PIGEON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110"><ellipse cx="48" cy="105" rx="28" ry="4.5" fill="rgba(80,30,70,.22)"/><path d="M20 76L5 90l18-3z" fill="#7d8fb3"/><ellipse cx="46" cy="72" rx="32" ry="28" fill="#a9b8d8"/><path d="M26 64q14-10 34 4q-12 18-32 14z" fill="#8d9dc2"/><path d="M34 72h16M34 77h14" stroke="#6f7ea6" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="60" cy="50" rx="17" ry="14" fill="#7fd6c2"/><ellipse cx="62" cy="54" rx="14" ry="8" fill="#b18cf0" opacity=".7"/><circle cx="64" cy="34" r="17" fill="#b9c6e2"/><ellipse cx="62" cy="19" rx="18" ry="7" fill="#e83e7e" transform="rotate(-12 62 19)"/><ellipse cx="58" cy="17" rx="8" ry="2.5" fill="#ff7fb0" transform="rotate(-12 58 17)"/><circle cx="60" cy="10" r="3" fill="#e83e7e"/><circle cx="70" cy="32" r="5" fill="#fff"/><circle cx="71" cy="32" r="3" fill="#ff7a3d"/><circle cx="71.5" cy="32" r="1.5" fill="#2a1a2e"/><path d="M78 36l12 3-12 3z" fill="#f2c14e"/><ellipse cx="79" cy="35.5" rx="3" ry="2" fill="#fff"/><ellipse cx="66" cy="43" rx="4" ry="2.5" fill="#ff9fcf" opacity=".75"/><path d="M44 58q18-2 28 4l-2 30q-14 6-28 0z" fill="#fff4f8"/><path d="M47 66h23M46 74h24M45 82h25M44 90h24" stroke="#ff8cc6" stroke-width="3"/><path d="M52 62q8-4 16 0" stroke="#e83e7e" stroke-width="2" fill="none"/><path d="M58 80q-5-4-2-7q2-1 2 1q0-2 2-1q3 3-2 7z" fill="#e83e7e"/><path d="M40 98l-2 7M52 98l2 7" stroke="#ff8aa0" stroke-width="3" stroke-linecap="round"/></svg>';
const FOX_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110"><ellipse cx="50" cy="105" rx="28" ry="4.5" fill="rgba(80,30,70,.22)"/><path d="M28 42L9 3l36 25z" fill="#f2c27b"/><path d="M72 42L91 3 55 28z" fill="#f2c27b"/><path d="M29 35L16 11l24 17z" fill="#ffc7d9"/><path d="M71 35L84 11 60 28z" fill="#ffc7d9"/><path d="M26 70q24-10 48 0l6 34H20z" fill="#8fd3f0"/><circle cx="36" cy="84" r="3.5" fill="#ff5fa8"/><circle cx="60" cy="92" r="3" fill="#ffd84d"/><circle cx="48" cy="78" r="2.5" fill="#5fd3a8"/><circle cx="66" cy="80" r="2.5" fill="#b48cff"/><ellipse cx="50" cy="48" rx="26" ry="22" fill="#f7d193"/><ellipse cx="50" cy="59" rx="15" ry="10" fill="#fff7ea"/><path d="M37 46q4-5 8 0M55 46q4-5 8 0" stroke="#3a2415" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="55" rx="4" ry="3" fill="#3a2415"/><path d="M46 61q4 3 8 0" stroke="#3a2415" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="33" cy="55" rx="5" ry="3" fill="#ff9fcf" opacity=".8"/><ellipse cx="67" cy="55" rx="5" ry="3" fill="#ff9fcf" opacity=".8"/><path d="M70 30l14-14" stroke="#b98352" stroke-width="3" stroke-linecap="round"/><path d="M84 16l4-4" stroke="#ff5fa8" stroke-width="4" stroke-linecap="round"/><ellipse cx="80" cy="88" rx="13" ry="9" fill="#e9c28a"/><circle cx="75" cy="85" r="2.2" fill="#ff5fa8"/><circle cx="81" cy="84" r="2.2" fill="#ffd84d"/><circle cx="86" cy="88" r="2.2" fill="#6fb6ff"/><circle cx="78" cy="91" r="2" fill="#5fd3a8"/></svg>';
const ids = k => Object.keys(ITEMS).filter(i => ITEMS[i].k === k);
const BUYABLE = ids('furn').filter(i => !ITEMS[i].gift),
  PRESENT_ONLY = ['cupcake', 'doll', 'trophy', 'sparkle', 'pinata', 'crystal', 'ufo'],
  GIFT_POOL = BUYABLE.concat(PRESENT_ONLY);
// what's around to catch right now, with weights. Fish a neighbour has asked for (and not been given yet) are a
// bit easier to catch, so their wishes don't take forever.
const WANT_BOOST = 1.5;
function wantedNow() {
  return new Set(
    NEIGH.map(n => S.neigh[n.id])
      .filter(q => q && q.req && !q.done)
      .map(q => q.req)
  );
}
function catchWeights(k) {
  const d = clock();
  let l = ids(k).filter(i => ITEMS[i].w && avail(i, d));
  if (!l.length) l = ids(k).filter(i => ITEMS[i].w);
  const want = k === 'fish' ? wantedNow() : new Set();
  return l.map(i => [i, ITEMS[i].w * (want.has(i) ? WANT_BOOST : 1)]);
}
function weighted(k) {
  const l = catchWeights(k);
  let r = Math.random() * l.reduce((s, [, w]) => s + w, 0);
  for (const [i, w] of l) {
    r -= w;
    if (r <= 0) return i;
  }
  return l[0][0];
}
// capybara colours: b=body l=light d=dark s=snout
const CAPY = {
  pink: { n: 'Pink', b: '#f39ac0', l: '#fcc6de', d: '#d9779f', s: '#e684ae' },
  caramel: { n: 'Caramel', b: '#d9a066', l: '#f0c895', d: '#b37843', s: '#c98c55' },
  cocoa: { n: 'Cocoa', b: '#a8795a', l: '#c99f80', d: '#80573b', s: '#946848' },
  cream: { n: 'Cream', b: '#f1dfbf', l: '#fff4e0', d: '#d2b98f', s: '#e2cba4' },
  lavender: { n: 'Lavender', b: '#c5a6ee', l: '#e0cefa', d: '#9f7fd0', s: '#b394e0' },
  mint: { n: 'Mint', b: '#92dbbe', l: '#c2f0dd', d: '#68b898', s: '#7ccaab' },
  sky: { n: 'Sky', b: '#9ac8f2', l: '#c7e2fb', d: '#709dd0', s: '#84b2e2' },
  peach: { n: 'Peach', b: '#f6b08b', l: '#fdd3ba', d: '#d98c66', s: '#e89e78' },
  blush: { n: 'Blush', b: '#f9c3d8', l: '#ffe2ee', d: '#e19ab8', s: '#eeaac6' },
  rose: { n: 'Rose', b: '#ee6fa8', l: '#f9a6cb', d: '#c9508a', s: '#dc5e98' }
};
// every emote a player can put in their quick bar; sent over the network as an index into this list.
// The first six are the original fixed emotes, in the original order, so older versions still understand them.
// prettier-ignore
const EMOTE_POOL = [
  '👋', '💖', '😂', '⭐', '✨', '🎵',
  '🥰', '😎', '🤩', '😴', '😮', '🥺', '🤗', '👍', '👏', '🙌', '🎉', '💤',
  '🌸', '🌈', '🍊', '🐟', '🦋', '🎁', '🏝️', '♨️', '🍰', '❓', '❗', '💯'
];
const EMOTE_SLOTS = 6;
const STAMPS = ['🌸', '🍊', '🐾', '⭐', '🎀', '🌈'];
const WRAPS = {
  pink: '#ff8cc6',
  mint: '#5fd3a8',
  sky: '#6fb6ff',
  sun: '#ffc83d',
  lilac: '#b48cff',
  cherry: '#ff5f73'
};
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const CX = 700,
  CY = 560,
  SRX = 630,
  SRY = 475,
  GRX = 560,
  GRY = 412;
function wob(t) {
  return 1 + 0.05 * Math.sin(3 * t) + 0.035 * Math.sin(5 * t + 1.3) + 0.02 * Math.sin(9 * t + 2);
}
function norm(x, y, rx, ry) {
  const dx = (x - CX) / rx,
    dy = (y - CY) / ry;
  return Math.hypot(dx, dy) / wob(Math.atan2(dy, dx));
}
function angleOf(x, y) {
  return Math.atan2((y - CY) / SRY, (x - CX) / SRX);
}
function edge(t, rx, ry, k) {
  const w = wob(t) * k;
  return { x: CX + Math.cos(t) * rx * w, y: CY + Math.sin(t) * ry * w };
}

const HOUSE = { x: 480, y: 380 },
  SHOP = { x: 945, y: 380 },
  MUSEUM = { x: 728, y: 292 },
  ANNEX = { x: 606, y: 292 },
  GARDEN = Array.from({ length: 8 }, (_, i) => ({ x: 600 + (i % 4) * 42, y: 414 + Math.floor(i / 4) * 40 })),
  SPRING = { x: 700, y: 700, rx: 75, ry: 42 };
const DECO_A = [Math.PI, -2.36, -1.57, -0.79, 0.79, 2.36],
  SOAK = [
    { x: 710, y: 692 },
    { x: 738, y: 708 },
    { x: 695, y: 716 }
  ],
  VSOAK = [
    { x: 664, y: 690 },
    { x: 680, y: 722 },
    { x: 722, y: 684 },
    { x: 752, y: 716 }
  ];
function decoPos(i) {
  const a = DECO_A[i];
  return { x: SPRING.x + Math.cos(a) * (SPRING.rx + 26), y: SPRING.y + Math.sin(a) * (SPRING.ry + 22) };
}
// seaplane dock ("Capy Air") on the south-west beach
const DA = 2.0,
  DOCK = (() => {
    const p = edge(DA, SRX, SRY, 0.9);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  })();
const PIER = (() => {
  const p = edge(DA, SRX, SRY, 0.95);
  return { x: Math.round(p.x), y: Math.round(p.y) - 8, len: 122 };
})();
const PLANE = { x: PIER.x + 84, y: PIER.y + PIER.len - 26 },
  SIGN = { x: DOCK.x - 50, y: DOCK.y - 4 };
const POOLS = [1.2, -2.35, -0.72].map(a => {
    const p = edge(a, SRX, SRY, 0.955);
    return { x: Math.round(p.x), y: Math.round(p.y), a };
  }),
  STALL = (() => {
    const p = edge(0.08, SRX, SRY, 0.93);
    return { x: Math.round(p.x), y: Math.round(p.y), a: 0.08 };
  })();
const TREES = [
  [270, 660, 'orange'],
  [460, 860, 'yuzu'],
  [950, 860, 'orange'],
  [1130, 660, 'yuzu'],
  [300, 410, 'orange'],
  [1110, 410, 'yuzu'],
  [520, 610, 'yuzu'],
  [890, 610, 'orange']
].map(([x, y, f]) => ({ x, y, f, shake: 0 }));
const NEIGH = [
  {
    id: 'mochi',
    e: '🐰',
    n: 'Mochi',
    hx: 410,
    hy: 520,
    gifts: ['unicorn', 'carousel'],
    lines: [
      'Hop hop! What a lovely day!',
      'I tried to count the clouds. I got to eleven!',
      'You have fruit on your head again! Hee hee!',
      'The hot spring is my favorite place on the whole island!'
    ]
  },
  {
    id: 'pip',
    e: '🐤',
    n: 'Pip',
    hx: 990,
    hy: 520,
    gifts: ['rainbow', 'crown'],
    lines: [
      'Tweet tweet! I learned a new song today!',
      'Pink is the best color. Everybody knows that!',
      'I saw a shiny beetle by the trees once!',
      'Can I sit on top of your fruit? Just kidding! Tweet!'
    ]
  },
  {
    id: 'puddle',
    e: '🦆',
    n: 'Puddle',
    hx: 700,
    hy: 860,
    gifts: ['balloon', 'fountain'],
    lines: [
      "Quack! You're my best friend!",
      'I love splashing in the hot spring!',
      'Fishing is fun! Wait for the splash, then tap!',
      'Capybaras are the calmest animals ever. Quack!'
    ]
  }
].map(n => Object.assign(n, { x: n.hx, y: n.hy, tx: n.hx, ty: n.hy, wait: rnd(1, 4), face: 1 }));

// ----- layout helpers -----
function beachPos(a) {
  return edge(a, SRX, SRY, 0.925);
}
function grassFree(x, y) {
  return (
    !(x > 560 && x < 860 && y > 120 && y < 330) &&
    !(x > 570 && x < 760 && y > 384 && y < 478) &&
    !(x > 745 && x < 880 && y > 355 && y < 485) // the drawing board (js/board.js)
  );
}
