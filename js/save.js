// The save file (localStorage), migrations, multiplayer state and cloud state.
'use strict';

// ---------- MULTIPLAYER STATE (logic in multiplayer.js) ----------
const MP = {
  role: null,
  peer: null,
  conn: null,
  code: null,
  hostState: null,
  vis: new Map(),
  players: new Map(),
  emo: new Map(),
  island: null,
  me: null,
  acc: 0,
  lastRx: 0,
  dirty: false,
  islT: 0,
  islJ: '',
  signed: false,
  gave: false,
  savedBugs: null,
  dockOpen: false,
  dockView: 'main',
  dockArg: null,
  to: null,
  tries: 0,
  emoT: 0,
  offline: false,
  friend: null,
  dropin: false,
  clLobby: null,
  clT: null,
  newFriend: null
};
const VIS = () => MP.role === 'visitor' || MP.role === 'connecting';
const ONV = () => MP.role === 'visitor' && !!MP.island; // rendering the HOST's island

// ---------- SAVE ----------
const KEY = 'capyIsland.v2';
let restoring = false; // true while an island is being swapped in; blocks saves until the reload
function newSave() {
  const neigh = {};
  NEIGH.forEach(n => (neigh[n.id] = { f: 0, req: null, done: false, talked: false, g: [] }));
  return {
    name: '',
    coins: 200,
    bag: {},
    found: {},
    day: 0,
    dayKey: '',
    trees: TREES.map(() => 3),
    presents: [],
    neigh,
    stock: [],
    room: Array(20).fill(null),
    x: 700,
    y: 490,
    stack: [],
    spring: Array(6).fill(null),
    yuzu: 0,
    soakDay: '',
    vcolor: 'pink',
    guestbook: [],
    giftsPending: [],
    fpresents: [],
    color: 'pink',
    acc: 'bow',
    accs: { bow: 1, flower: 1, yuzuhat: 1, none: 1 },
    mu: {},
    muGift: 0,
    muWing: {},
    cafe: { st: 0, last: 0, cards: 0 },
    drink: null,
    garden: Array(8).fill(null),
    dig: [],
    beach: [],
    art: { day: 0, stock: [], here: false, lastDay: 0 },
    wish: { n: 0 },
    gotTools: 0,
    v4news: 1
  };
}
let S;
try {
  S = JSON.parse(localStorage.getItem(KEY));
} catch (e) {}
if (!S || !S.neigh) S = newSave();
let v4news = false;
(function migrate() {
  const d = newSave();
  const old = S.v4news === undefined && !!S.name;
  if (S.color === undefined) {
    if (S.vcolor) S.vcolorOld = S.vcolor;
    S.color = 'pink';
  }
  for (const k in d) if (S[k] === undefined) S[k] = d[k];
  NEIGH.forEach(n => {
    if (!S.neigh[n.id]) S.neigh[n.id] = d.neigh[n.id];
  });
  ['guestbook', 'giftsPending', 'fpresents', 'presents', 'stack', 'stock'].forEach(k => {
    if (!Array.isArray(S[k])) S[k] = [];
  });
  if (!Array.isArray(S.room)) S.room = d.room;
  if (!Array.isArray(S.spring)) S.spring = d.spring;
  if (!Array.isArray(S.trees) || S.trees.length !== TREES.length) S.trees = d.trees;
  if (!CAPY[S.vcolor]) S.vcolor = 'caramel';
  if (typeof S.x !== 'number' || typeof S.y !== 'number') {
    S.x = 700;
    S.y = 490;
  }
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);
  ['mu', 'muWing', 'accs', 'cafe', 'art', 'wish'].forEach(k => {
    if (!obj(S[k])) S[k] = d[k];
  });
  for (const k in S.mu) if (!ITEMS[k] || !WK.includes(ITEMS[k].k)) delete S.mu[k];
  if (!Array.isArray(S.garden) || S.garden.length !== 8) S.garden = d.garden;
  S.garden = S.garden.map(p => (p && (p.s === 'tulip' || p.s === 'rose') && FLC.includes(p.c) ? p : null));
  if (!Array.isArray(S.dig)) S.dig = [];
  if (!Array.isArray(S.beach)) S.beach = [];
  S.beach = S.beach.filter(b => b && ITEMS[b.t] && typeof b.a === 'number');
  if (!Array.isArray(S.art.stock)) S.art.stock = [];
  if (typeof S.muGift !== 'number') S.muGift = 0;
  ['st', 'last', 'cards'].forEach(k => {
    if (typeof S.cafe[k] !== 'number') S.cafe[k] = 0;
  });
  if (!CAPY[S.color]) S.color = 'pink';
  Object.keys(d.accs).forEach(a => (S.accs[a] = 1));
  if (!ACCS[S.acc] || !S.accs[S.acc]) S.acc = 'bow';
  NEIGH.forEach(n => {
    if (S.neigh[n.id].f >= 7) S.accs[NEIGH_ACC[n.id]] = 1;
  });
  S.vcolor = BASE_COLORS.includes(S.color) ? S.color : 'pink';
  if (!S.gotTools) {
    S.gotTools = 1;
    S.bag.shovel = 1;
    S.bag.can = 1;
    S.found.shovel = S.found.can = 1;
    S.bag.seed_tulip = (S.bag.seed_tulip || 0) + 3;
    S.found.seed_tulip = 1;
  }
  if (old) {
    S.v4news = 1;
    v4news = true;
  }
})();
function save() {
  if (VIS() || restoring) return;
  S.x = P.x;
  S.y = P.y;
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
  if (MP.role === 'host') MP.dirty = true;
  if (CL.on) clOnSave();
}
// cloud state (inert unless SUPABASE_URL + SUPABASE_ANON_KEY are set at the top of the file)
const CMETA = 'capyIsland.cloud';
function clHashS() {
  const o = Object.assign({}, S);
  delete o.x;
  delete o.y;
  const s = JSON.stringify(o);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + '.' + s.length;
}
const CL = {
  on:
    typeof SUPABASE_URL === 'string' &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(SUPABASE_URL) &&
    SUPABASE_ANON_KEY.length > 20,
  ready: false,
  initing: false,
  status: 'off',
  err: '',
  sb: null,
  uid: null,
  token: null,
  meta: {},
  hash: '',
  friends: [],
  frT: 0,
  lobby: null,
  lobbyOk: false,
  tracked: '',
  pipes: new Map(),
  dropins: true,
  upT: null,
  firstDirty: 0,
  uploading: null,
  again: false,
  lastUp: 0,
  hbT: null,
  lobT: null,
  pulling: false,
  inbox: null,
  openSeq: 0
};
if (CL.on) {
  try {
    CL.meta = JSON.parse(localStorage.getItem(CMETA)) || {};
  } catch (e) {
    CL.meta = {};
  }
  CL.dropins = CL.meta.dropins !== false;
  CL.status = CL.meta.moved ? 'moved' : 'off';
  CL.friends = (Array.isArray(CL.meta.friends) ? CL.meta.friends : [])
    .filter(f => f && /^[0-9a-f-]{36}$/.test(f.id))
    .map(f => ({
      id: f.id,
      name: String(f.name || 'Friend').slice(0, 12),
      color: CAPY[f.color] ? f.color : 'caramel',
      online: false
    }));
  CL.hash = clHashS();
}
// cloud mode: visits ONLY over Supabase Realtime (authorized by RLS + the passcode gate), never the public PeerJS broker
const netOK = () => (CL.on ? CL.ready : peerOK());
