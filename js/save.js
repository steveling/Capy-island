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
  emoT: -9,
  offline: false,
  friend: null,
  dropin: false,
  clLobby: null,
  clT: null,
  newFriend: null,
  // chat (js/chat.js): the log, speech bubbles by player id, unread count, my last send time
  chat: [],
  say: new Map(),
  chatUnread: 0,
  chatT: -9
};
const VIS = () => MP.role === 'visitor' || MP.role === 'connecting';
const ONV = () => MP.role === 'visitor' && !!MP.island; // rendering the HOST's island

// ---------- SAVE ----------
const KEY = 'capyIsland.v2';
// the what's-new splash each island has seen (see showWhatsNew); new islands start up to date
const NEWS_V = 10;
let restoring = false; // true while an island is being swapped in; blocks saves until the reload
// One tab at a time. Every player's island on this phone shares the browser's storage, and switching player
// swaps which island sits in the live keys. A second tab still holding the old island in memory would save it
// over whoever is live now: that's how one player's island once turned into another's. So the newest tab
// claims the game, and any other tab freezes (no saving, no cloud) with a button to play there instead.
const TAB_KEY = 'capyIsland.tab',
  TAB_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
let tabGone = false;
function tabClaim() {
  try {
    localStorage.setItem(TAB_KEY, TAB_ID);
  } catch (e) {}
}
// is this still the tab that plays? (if not, it freezes now)
function tabMine() {
  if (tabGone) return false;
  let v = null;
  try {
    v = localStorage.getItem(TAB_KEY);
  } catch (e) {
    return true;
  }
  if (v === null || v === TAB_ID) return true;
  tabFreeze();
  return false;
}
function tabFreeze() {
  if (tabGone) return;
  tabGone = true;
  restoring = true; // blocks every save
  try {
    clearTimeout(CL.upT);
    clearInterval(CL.hbT);
    if (CL.sb) CL.sb.auth.stopAutoRefresh(); // its sign-in may not be the live one any more
  } catch (e) {}
  const d = document.createElement('div');
  d.id = 'tabgone';
  d.setAttribute('role', 'alertdialog');
  d.innerHTML =
    '<div class="card"><h2>🏝️ Playing in another tab</h2><div style="text-align:center;font-size:54px">🙈</div><p class="c" style="font-size:17px">Capy Island is open in another tab or window. To keep everyone\'s island safe, only one can play at a time.</p><div class="row"><button class="btn" onclick="location.replace(location.pathname)">Play here instead</button></div></div>';
  document.body.appendChild(d);
}
tabClaim();
addEventListener('storage', e => {
  if (e.key === TAB_KEY && e.newValue && e.newValue !== TAB_ID) tabFreeze();
});
addEventListener('pageshow', e => e.persisted && tabMine()); // back from the browser's page cache
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
    // more of the house (js/home.js): rooms built with coins, the backyard, and today's one-a-day things
    rooms: { bed: Array(20).fill(null), kitchen: Array(20).fill(null) },
    built: {},
    yard: Array(20).fill(null),
    once: {},
    mail: [], // letters in my mailbox (js/mail.js)
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
    craft: 'pink', // my plane at the Capy Air dock (js/hangar.js)
    crafts: { pink: 1 },
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
    v4news: 1,
    news: NEWS_V,
    board: '', // the drawing board outside (js/board.js): '' blank, or 768 hex digits
    code: '', // this island's own visiting code (island-code visits), made the first time it opens
    emotes: [0, 1, 2, 3, 4, 5]
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
  const old = S.v4news === undefined && !!S.name,
    // an island from before the news version existed hasn't seen the v5 splash yet
    newsBefore = typeof S.news === 'number' ? S.news : S.name ? 4 : NEWS_V;
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
  {
    const kind = k => ITEMS[k] && ITEMS[k].k,
      indoor = k => ['furn', 'art'].includes(kind(k)),
      outdoor = k => indoor(k) || kind(k) === 'yard',
      slots = (a, ok) => Array.from({ length: 20 }, (_, i) => (Array.isArray(a) && ok(a[i]) ? a[i] : null)),
      obj = v => v && typeof v === 'object' && !Array.isArray(v);
    const r = obj(S.rooms) ? S.rooms : {};
    S.rooms = { bed: slots(r.bed, indoor), kitchen: slots(r.kitchen, indoor) };
    S.yard = slots(S.yard, outdoor);
    const b = obj(S.built) ? S.built : {};
    S.built = {};
    ROOMS.forEach(x => x.p && b[x.id] && (S.built[x.id] = 1));
    const o = obj(S.once) ? S.once : {};
    S.once = {};
    for (const k in o) if (/^[a-z0-9_]{1,24}$/.test(k) && Number.isInteger(o[k])) S.once[k] = o[k];
    const int = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
    S.mail = (Array.isArray(S.mail) ? S.mail : [])
      .filter(m => obj(m) && typeof m.from === 'string')
      .slice(-40)
      .map(m => ({
        id: String(m.id || '').slice(0, 40),
        from: m.from.slice(0, 12),
        c: CAPY[m.c] ? m.c : 'caramel',
        item: mailable(m.item) ? m.item : null,
        note: int(m.note, MAIL_NOTES.length),
        st: int(m.st, MAIL_STICKERS.length),
        at: Number.isFinite(m.at) ? m.at : 0,
        read: !!m.read,
        took: !!m.took
      }));
  }
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
  if (
    !Array.isArray(S.emotes) ||
    S.emotes.length !== EMOTE_SLOTS ||
    new Set(S.emotes).size !== EMOTE_SLOTS ||
    !S.emotes.every(i => Number.isInteger(i) && EMOTE_POOL[i])
  )
    S.emotes = d.emotes.slice();
  if (!ACCS[S.acc] || !S.accs[S.acc]) S.acc = 'bow';
  if (!S.crafts || typeof S.crafts !== 'object' || Array.isArray(S.crafts)) S.crafts = {};
  for (const k in S.crafts) if (!CRAFTS[k]) delete S.crafts[k];
  S.crafts.pink = 1;
  if (!CRAFTS[S.craft] || !S.crafts[S.craft]) S.craft = 'pink';
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
  S.news = newsBefore;
  if (typeof S.board !== 'string' || !(S.board === '' || /^[0-9a-f]{768}$/.test(S.board))) S.board = '';
  if (
    typeof S.code !== 'string' ||
    !/^[A-Z0-9]{5}$/.test(S.code) ||
    [...S.code].some(c => !CODE_ABC.includes(c))
  )
    S.code = '';
})();
function save() {
  if (VIS() || restoring || !tabMine()) return;
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
  chat: true, // grown-ups switch: typed chat with best friends
  boards: true, // grown-ups switch: seeing best friends' drawing boards
  freq: true, // grown-ups switch: making new best friends while visiting
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
  CL.chat = CL.meta.chat !== false;
  CL.boards = CL.meta.boards !== false;
  CL.freq = CL.meta.freq !== false;
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
