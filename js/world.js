// Live world state (player, bugs, flowers), day changes and bug spawning.
'use strict';

// ---------- STATE ----------
const P = { x: S.x, y: S.y, tx: S.x, ty: S.y, act: null, face: 1, walk: 0, moving: false, soak: false };
let bugs = [],
  parts = [],
  busy = false,
  talking = null,
  bugTimer = 0,
  time = 0;
const FLOWERS = [];
(function () {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) {
    const x = 150 + r() * 1100,
      y = 150 + r() * 830;
    if (
      norm(x, y, GRX, GRY) < 0.93 &&
      dist(x, y, HOUSE.x, HOUSE.y - 30) > 80 &&
      dist(x, y, SHOP.x, SHOP.y - 30) > 80 &&
      dist(x, y, SPRING.x, SPRING.y) > 115 &&
      grassFree(x, y)
    )
      FLOWERS.push({
        x,
        y,
        c: ['#ff7fbf', '#ffffff', '#ffb3d9', '#ff4f9e', '#fff27a'][Math.floor(r() * 5)],
        g: r() < 0.4
      });
  }
})();
// what the world shows: our island, or the host's island while visiting (read-only)
const ISL = () => (ONV() ? MP.island : S);
const presList = () => (ONV() ? MP.island.presents : S.presents),
  fpList = () => (ONV() ? MP.island.fp : S.fpresents);

function addItem(id, n = 1) {
  if (ITEMS[id].k === 'tool') {
    const f = !S.found[id];
    S.bag[id] = 1;
    S.found[id] = 1;
    return f;
  }
  S.bag[id] = (S.bag[id] || 0) + n;
  if (ITEMS[id].k === 'fruit') for (let i = 0; i < n; i++) S.stack.push(id);
  const first = !S.found[id];
  S.found[id] = 1;
  return first;
}
function takeItem(id, n = 1) {
  if ((S.bag[id] || 0) < n) return false;
  if (ITEMS[id].k === 'fruit')
    for (let i = 0; i < n; i++) {
      const j = S.stack.lastIndexOf(id);
      if (j >= 0) S.stack.splice(j, 1);
    }
  S.bag[id] -= n;
  if (S.bag[id] <= 0) delete S.bag[id];
  return true;
}
function hud() {
  $('#coins').textContent = '🪙 ' + S.coins;
  $('#daypill').textContent = ONV() ? '✈️ Visiting' : '☀️ Day ' + S.day;
  whoUI();
}
let toastT;
function toast(t, ms = 2200) {
  const e = $('#toast');
  e.innerHTML = t;
  e.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => e.classList.remove('show'), ms);
}
function burst(x, y, e, n = 6) {
  for (let i = 0; i < n; i++) parts.push({ x, y, e, vx: rnd(-60, 60), vy: rnd(-160, -80), life: 1.2 });
}

// sound
let AC;
function beep(notes) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    let t = AC.currentTime;
    notes.forEach(([f, d]) => {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(AC.destination);
      o.start(t);
      o.stop(t + d);
      t += d * 0.8;
    });
  } catch (e) {}
}
const SND = {
  yay: () =>
    beep([
      [660, 0.12],
      [880, 0.12],
      [1175, 0.25]
    ]),
  pop: () =>
    beep([
      [520, 0.08],
      [780, 0.12]
    ]),
  oops: () =>
    beep([
      [400, 0.15],
      [300, 0.25]
    ]),
  coin: () =>
    beep([
      [988, 0.08],
      [1319, 0.2]
    ])
};

// ---------- DAYS ----------
function todayKey() {
  const d = new Date();
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
function beachAngle() {
  let a;
  for (let i = 0; i < 30; i++) {
    a = rnd(0, Math.PI * 2);
    const d = Math.abs(((((a - DA) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (
      d > 0.38 &&
      POOLS.every(
        p => Math.abs(((((a - p.a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 0.16
      ) &&
      Math.abs(((((a - STALL.a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 0.22
    )
      break;
  }
  return a;
}
function randomReq() {
  const r = Math.random();
  if (r < 0.5) return pick(['orange', 'yuzu']);
  if (r < 0.75) return pick(['butterfly', 'ladybug', 'caterpillar', 'snail', 'ant', 'cricket', 'bee']);
  return pick(['fish', 'tropical', 'crab', 'shrimp']);
}
function newDay(force) {
  if (VIS()) return false;
  const k = todayKey();
  if (!force && S.dayKey === k) return false;
  let missed = 1;
  if (S.dayKey && !force) missed = Math.max(1, Math.round((new Date(k) - new Date(S.dayKey)) / 864e5));
  const prevDay = S.day;
  S.dayKey = k;
  S.day++;
  S.trees = TREES.map(() => 3);
  S.yuzu = 0;
  NEIGH.forEach(n => {
    const s = S.neigh[n.id];
    s.req = randomReq();
    s.done = false;
    s.talked = false;
  });
  const pool = BUYABLE.slice().sort(() => Math.random() - 0.5);
  S.stock = pool.slice(0, 4);
  const add = Math.min(3 - S.presents.length, Math.min(missed, 3));
  for (let i = 0; i < add; i++) S.presents.push(beachAngle());
  // presents friends left while visiting yesterday arrive on the beach today
  if (S.giftsPending.length) {
    S.giftsPending.forEach(g => S.fpresents.push({ a: beachAngle(), from: g.from, c: g.c, item: g.item }));
    S.giftsPending = [];
    S.fpresents = S.fpresents.slice(-12);
  }
  dayV4(prevDay);
  bugs = [];
  for (let i = 0; i < 4; i++) spawnBug();
  save();
  newsToast();
  return true;
}

// ---------- BUGS ----------
function grassSpot() {
  for (let i = 0; i < 50; i++) {
    const x = rnd(180, 1220),
      y = rnd(170, 960);
    if (
      norm(x, y, GRX, GRY) < 0.85 &&
      dist(x, y, HOUSE.x, HOUSE.y - 40) > 90 &&
      dist(x, y, SHOP.x, SHOP.y - 40) > 90 &&
      dist(x, y, SPRING.x, SPRING.y) > 110 &&
      grassFree(x, y)
    )
      return { x, y };
  }
  return { x: 700, y: 600 };
}
function spawnBug() {
  const t = weighted('bug'),
    p = grassSpot();
  bugs.push({ t, x: p.x, y: p.y, vx: 0, vy: 0, ch: 0, flee: 0, ph: rnd(0, 6) });
}
