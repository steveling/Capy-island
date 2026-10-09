// Moving day: the old address hands every player on this phone over to the new address.
'use strict';

// ---------- MOVING TO THE NEW ADDRESS ----------
// The game moved from steveling.github.io/Capy-island to capy.pocketgiggles.com (the same files). A browser keeps
// each address's storage apart (islands, cloud sign-ins, the passcode unlock), so at the new address a phone
// starts out empty. So when the OLD address opens, it packs every player on this phone into the new address's
// link, after the "#" (that part never goes to any server), and goes there:
//  - cloud players as a one-time moving code each (the same codes as "📱 Move to a new phone", which also open the
//    passcode gate). The island is saved to the cloud first, and the codes are made only right before leaving.
//  - players without the cloud as their whole island (squeezed small), as long as it fits in a link.
// The NEW address unpacks them as players on this phone (claiming the codes like "📲 From another phone"),
// skipping anyone it already has, and remembers each hand-off so a reload never brings anyone twice.
// Nothing is deleted at the old address. If anything goes wrong before leaving (no internet, cloud trouble),
// the old address just plays as usual and tries again next time. After a move it only forwards to the new one.
// Grown-ups can still play at the old address with ?stay at the end of its address.
const MOVE = Object.assign(
  {
    from: 'steveling.github.io', // the old address's host
    old: 'https://steveling.github.io/Capy-island/',
    to: 'https://capy.pocketgiggles.com/',
    max: 60000 // longest hand-off (characters after the #) we trust every phone's browser with
  },
  window.CAPY_MOVE || {} // the tests use two local addresses
);
const MOVE_TAG = 'capymove=',
  MOVED_KEY = 'capyIsland.moved', // old address: { at, hash } of the hand-off this phone left with
  HANDOFF_KEY = 'capyIsland.handoff', // new address: hand-offs still being unpacked
  ARRIVED_KEY = 'capyIsland.arrived', // new address: hand-offs already unpacked
  MOVE_NOTE = 'capyIsland.moveNote', // new address: what to tell the family once the game is up
  MOVE_SET = ['dropins', 'chat', 'boards', 'freq']; // the grown-ups' switches, kept per player
const moveRead = k => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch (e) {
    return null;
  }
};
const moveWait = (p, ms) =>
  Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
async function moveRpc(sb, fn, args) {
  const r = await moveWait(sb.rpc(fn, args || {}), 12000);
  if (r.error) throw new Error(r.error.message || fn);
  return r.data;
}
function moveFly(title, line) {
  modal(
    `<h2>${title}</h2><div style="text-align:center;font-size:56px"><div class="fly">🛩️</div></div><p class="c" style="font-size:18px">${line}</p>`
  );
}
function moveCleanHash() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {}
}

// ----- the hand-off in the link: JSON, deflated where the browser can, in base64url
const moveB64 = b => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const moveUnB64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const movePipe = async (b, t) =>
  new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(t)).arrayBuffer());
async function moveEncode(o) {
  const b = new TextEncoder().encode(JSON.stringify(o));
  try {
    if (window.CompressionStream)
      return '1' + moveB64(await movePipe(b, new CompressionStream('deflate-raw')));
  } catch (e) {}
  return '0' + moveB64(b);
}
async function moveDecode(s) {
  let b = moveUnB64(s.slice(1));
  if (s[0] === '1') b = await movePipe(b, new DecompressionStream('deflate-raw'));
  else if (s[0] !== '0') throw new Error('unknown hand-off');
  return JSON.parse(new TextDecoder().decode(b));
}

// called by js/main.js instead of starting the game; true = the move took over (it calls boot() if the game
// should start here after all)
function moveStart(boot) {
  if (location.hostname === MOVE.from) {
    if (new URLSearchParams(location.search).has('stay')) return false;
    moveAway(boot);
    return true;
  }
  const pending = moveRead(HANDOFF_KEY);
  if (location.hash.startsWith('#' + MOVE_TAG) || (Array.isArray(pending) && pending.length)) {
    moveArrive(boot);
    return true;
  }
  moveNoteLater();
  return false;
}

// ===== the OLD address =====
function moveGo(hash) {
  restoring = true; // nothing more is saved here
  location.replace(
    MOVE.to + (pendingVisit ? '?visit=' + pendingVisit : '') + (hash ? '#' + MOVE_TAG + hash : '')
  );
}
async function moveAway(boot) {
  if (location.hash === '#capy-retry') {
    // the new address asks for another try (a moving code didn't work there)
    try {
      localStorage.removeItem(MOVED_KEY);
    } catch (e) {}
    moveCleanHash();
  } else {
    const m = moveRead(MOVED_KEY);
    // already moved: just go. The same hand-off goes along for a week, in case it never got unpacked over
    // there (the new address knows which ones it has done, so nobody comes twice)
    if (m && m.at) return moveGo(Date.now() - m.at < 7 * 864e5 ? m.hash : '');
  }
  if (S.name) plSync();
  if (!PL.list.length) return moveGo(''); // nobody plays on this phone yet: nothing to bring
  if (!navigator.onLine) return boot();
  moveFly('✈️ Flying to your new island…', 'Packing your bags... 🧳');
  let hash;
  try {
    hash = await movePack();
  } catch (e) {
    closeModal();
    boot();
    return;
  }
  try {
    localStorage.setItem(MOVED_KEY, JSON.stringify({ at: Date.now(), hash }));
  } catch (e) {}
  moveGo(hash);
}
// every player on this phone, ready to go; throws (having taken back any moving codes) if something didn't work
async function movePack() {
  save(); // the playing island, just as it is now
  const o = {
      v: 1,
      h: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      active: PL.active,
      players: []
    },
    cloud = [];
  for (const p of PL.list) {
    const pre = p.id === PL.active ? '' : PL_PARK + p.id + '.',
      get = k => localStorage.getItem(pre + k);
    let sv, meta;
    try {
      sv = parseBackup(get(KEY)).save;
    } catch (e) {
      continue; // no island yet
    }
    try {
      meta = JSON.parse(get(CMETA)) || {};
    } catch (e) {
      meta = {};
    }
    // an island that was moved to another phone before lives there now; its old copy stays here (?stay)
    if (CL.on && meta.moved) continue;
    const e = { id: p.id, name: p.name, color: p.color, pw: p.pw, set: {} };
    if (get(UNLOCK_KEY) === '1') e.u = 1;
    MOVE_SET.forEach(k => typeof meta[k] === 'boolean' && (e.set[k] = meta[k]));
    o.players.push(e);
    if (CL.on && e.u && get('capyIsland.auth')) cloud.push({ e, sv, meta, pre });
    else e.save = sv;
  }
  const codes = [];
  if (cloud.length) {
    await moveWait(clLoad(), 15000);
    for (const c of cloud) {
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: c.pre + 'capyIsland.auth'
        }
      });
      const g = await moveWait(sb.auth.getSession(), 12000);
      if (g.error) throw g.error;
      const s = g.data.session;
      if (!s) {
        c.e.save = c.sv; // no cloud sign-in after all: goes as a whole island
        continue;
      }
      let st;
      try {
        st = await moveRpc(sb, 'my_cloud_status');
      } catch (e) {
        if (!clErr(e).includes('not_allowed')) throw e;
        c.e.save = c.sv;
        continue;
      }
      if (!st || st.moved) {
        // moved on already: on an earlier try (it's at the new address) or to another phone
        o.players = o.players.filter(x => x !== c.e);
        continue;
      }
      // the cloud gets this phone's newest island first, since that's what the moving code hands over
      const ts = Number(c.meta.localTs) || Date.now();
      if (!st.has_island || c.meta.dirty || c.meta.uid !== s.user.id || !(Number(st.save_ts) >= ts)) {
        const up = await moveWait(
          sb
            .from('islands')
            .upsert(
              { owner: s.user.id, save: c.sv, save_ts: ts, dropins: c.meta.dropins !== false },
              { onConflict: 'owner' }
            ),
          15000
        );
        if (up.error) throw new Error(up.error.message || 'upload');
        Object.assign(c.meta, { uid: s.user.id, localTs: ts, syncedTs: ts, dirty: false });
        try {
          localStorage.setItem(c.pre + CMETA, JSON.stringify(c.meta));
        } catch (e) {}
      }
      if (Array.isArray(c.meta.friends)) c.e.f = c.meta.friends.slice(0, 60);
      c.e.code = 'XXXXXXXXXXXX'; // (the real one is made last; same length, for the size check)
      codes.push({ e: c.e, sb });
    }
  }
  if (!o.players.length) return '';
  // a whole island has to fit in the link: the biggest that don't stay behind (the new address explains how
  // grown-ups can bring them with a backup)
  let hash = await moveEncode(o);
  while (hash.length > MOVE.max) {
    const big = o.players
      .filter(e => e.save)
      .sort((a, b) => JSON.stringify(b.save).length - JSON.stringify(a.save).length)[0];
    if (!big) throw new Error('hand-off too big');
    delete big.save;
    big.big = 1;
    hash = await moveEncode(o);
  }
  // the moving codes, right before leaving
  const made = [];
  try {
    for (const c of codes) {
      made.push(c);
      const r = await moveRpc(c.sb, 'create_transfer_code');
      c.e.code = String((r && r.code) || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (c.e.code.length !== 12) throw new Error('no code');
    }
    return await moveEncode(o);
  } catch (e) {
    // not leaving after all: take the codes back, so the islands stay put just as they were
    await Promise.race([
      Promise.all(made.map(c => c.sb.rpc('cancel_transfer_code').catch(() => {}))),
      new Promise(r => setTimeout(r, 4000))
    ]);
    throw e;
  }
}

// ===== the NEW address =====
async function moveArrive(boot) {
  moveFly('🏝️ Landing…', 'Unpacking your island... 🧳');
  try {
    await moveUnpack();
  } catch (e) {
    restoring = false;
    closeModal();
    boot();
    moveNoteLater();
  }
  // (moveUnpack reloads the page when someone arrived)
}
async function moveUnpack() {
  let list = moveRead(HANDOFF_KEY);
  if (!Array.isArray(list)) list = [];
  const arrived = moveRead(ARRIVED_KEY) || [];
  let kept = true;
  if (location.hash.startsWith('#' + MOVE_TAG)) {
    let o = null;
    try {
      o = await moveDecode(location.hash.slice(1 + MOVE_TAG.length));
    } catch (e) {}
    if (
      o &&
      o.v === 1 &&
      typeof o.h === 'string' &&
      Array.isArray(o.players) &&
      !arrived.includes(o.h) &&
      !list.some(x => x.h === o.h)
    )
      list.push(o);
    // kept on this phone before the link is tidied, so a reload half-way carries on from here
    try {
      localStorage.setItem(HANDOFF_KEY, JSON.stringify(list));
    } catch (e) {
      kept = false;
    }
    if (kept) moveCleanHash();
  }
  if (S.name) plSync();
  const note = { failed: [], big: [], later: false },
    added = [];
  let want = null,
    cloudDown = false;
  // newest first: after a "try again" the newest hand-off holds the codes that work
  for (const o of list.slice().reverse()) {
    o.done = Array.isArray(o.done) ? o.done : [];
    let wait = false;
    for (const e of o.players) {
      if (!e || typeof e.id !== 'string' || !/^[a-z0-9]{6,20}$/.test(e.id) || o.done.includes(e.id)) continue;
      if (!plGet(e.id)) {
        if (e.big) note.big.push(e.name);
        else {
          if (e.code && cloudDown) {
            wait = true;
            continue;
          }
          let ok;
          try {
            ok = await moveLand(e);
          } catch (x) {
            // couldn't reach the cloud (or save here): this one waits for next time
            if (e.code) cloudDown = true;
            wait = true;
            continue;
          }
          if (ok) added.push(e.id);
          else note.failed.push(e.name);
        }
      } // (a player who is already on this phone is never overwritten or doubled)
      o.done.push(e.id);
      try {
        localStorage.setItem(HANDOFF_KEY, JSON.stringify(list));
      } catch (x) {}
    }
    if (!want && added.includes(o.active)) want = o.active;
    if (wait) note.later = true;
    else {
      list = list.filter(x => x !== o);
      arrived.push(o.h);
    }
  }
  try {
    if (list.length) localStorage.setItem(HANDOFF_KEY, JSON.stringify(list));
    else localStorage.removeItem(HANDOFF_KEY);
    localStorage.setItem(ARRIVED_KEY, JSON.stringify(arrived.slice(-20)));
    if (note.failed.length || note.big.length || note.later)
      localStorage.setItem(MOVE_NOTE, JSON.stringify(note));
  } catch (e) {}
  if (!kept) moveCleanHash();
  if (!added.length) throw new Error('nobody new'); // starts the game as it is (with the note, if any)
  // who plays now: whoever was playing at the old address (or anyone who just arrived, if nobody plays here yet)
  const to = want || (S.name ? null : added[0]),
    from = PL.active;
  if (to) {
    restoring = true;
    clearTimeout(CL.upT);
    try {
      if (from) plPark(from);
      else plKeys().forEach(k => localStorage.removeItem(k)); // an island nobody has named yet: nothing to keep
      plUnpark(to);
      PL.active = to;
      localStorage.setItem(PL_KEY, JSON.stringify(PL));
    } catch (e) {
      // (like plGo: put back whoever was playing)
      try {
        plKeys().forEach(k => localStorage.removeItem(k));
        if (from) plUnpark(from);
      } catch (x) {}
      PL.active = from;
      try {
        localStorage.setItem(PL_KEY, JSON.stringify(PL));
      } catch (x) {}
    }
  }
  restoring = true;
  location.replace(location.pathname + (pendingVisit ? '?visit=' + pendingVisit : ''));
}
// one player from a hand-off becomes a (parked) player on this phone. true = here now, false = can't come
// (that moving code doesn't work any more); throws if it should be tried again later
async function moveLand(e) {
  const pre = PL_PARK + e.id + '.',
    put = (k, v) => localStorage.setItem(pre + k, v),
    meta = {};
  if (e.set && typeof e.set === 'object')
    MOVE_SET.forEach(k => typeof e.set[k] === 'boolean' && (meta[k] = e.set[k]));
  let sv;
  if (e.code) {
    if (!CL.on) return false;
    if (!navigator.onLine) throw new Error('offline');
    // the claim's sign-in is kept right where this player's parked sign-in lives
    const { r, uid } = await moveWait(xferClaim(String(e.code), pre + 'capyIsland.auth'), 25000);
    if (!(r && r.save) || !UUID_RE.test(String(uid))) {
      plParked(e.id).forEach(k => localStorage.removeItem(k));
      return false;
    }
    try {
      sv = parseBackup(JSON.stringify(r.save)).save;
    } catch (x) {
      return false;
    }
    const ts = Number(r.save_ts) || Date.now();
    Object.assign(meta, {
      uid,
      localTs: ts,
      syncedTs: ts,
      dirty: false,
      moved: false,
      friends: Array.isArray(e.f) ? e.f.slice(0, 60) : []
    });
    put(UNLOCK_KEY, '1'); // the moving code opened the passcode gate for this sign-in (in claim_transfer)
  } else {
    try {
      sv = parseBackup(JSON.stringify(e.save)).save;
    } catch (x) {
      return false;
    }
    Object.assign(meta, { localTs: Date.now(), dirty: true });
    if (e.u) put(UNLOCK_KEY, '1');
  }
  put(KEY, JSON.stringify(sv));
  put(CMETA, JSON.stringify(meta));
  PL.list.push({
    id: e.id,
    name: String(e.name || sv.name || '').slice(0, 12),
    color: CAPY[e.color] ? e.color : 'pink',
    pw: PW_EMOJI.includes(e.pw) ? e.pw : null
  });
  localStorage.setItem(PL_KEY, JSON.stringify(PL));
  return true;
}
// after the move, once the game (or the passcode gate) is up: tell the family about anyone who couldn't come (yet)
function moveNoteLater() {
  const n = moveRead(MOVE_NOTE);
  if (!n || typeof n !== 'object') return;
  const t = setInterval(() => {
    if (!$('#gate') && !(CL.booted && $('#modal').classList.contains('hidden'))) return;
    clearInterval(t);
    try {
      localStorage.removeItem(MOVE_NOTE);
    } catch (e) {}
    moveNoteShow(n);
  }, 700);
}
function moveNoteShow(n) {
  const failed = Array.isArray(n.failed) ? n.failed : [],
    big = Array.isArray(n.big) ? n.big : [],
    who = a => a.map(x => `<b>${esc(x || '?')}</b>`).join(', ');
  if (!failed.length && !big.length) {
    if (n.later) toast("📡 Some islands are still on their way! We'll try again next time. ✈️", 4500);
    return;
  }
  // its own layer, so it also shows over the passcode gate (when nobody could come yet)
  const d = document.createElement('div');
  d.id = 'movenote';
  d.setAttribute('role', 'alertdialog');
  d.innerHTML =
    `<div class="card"><h2>🛩️ Still on the old island</h2>` +
    (failed.length
      ? `<p class="c" style="font-size:17px">${who(failed)}'s island didn't make the trip this time. Don't worry, it's safe and sound at the old address! 💕</p><p class="c" style="font-size:13px">Grown-ups: “Try again” goes back to the old address for a new try (it needs the internet).</p>`
      : '') +
    (big.length
      ? `<p class="c" style="font-size:17px">${who(big)}'s island was too big to fly over by itself. It's safe at the old address! 💕</p><p class="c" style="font-size:13px">Grown-ups: open <b>${esc(MOVE.old)}?stay</b>, hold ⚙️ and tap “💾 Save backup file”. Then here, tap the name at the top and “💾 From a backup”.</p>`
      : '') +
    (n.later
      ? `<p class="c" style="font-size:13px">📡 Some islands are still on their way. We'll try again next time.</p>`
      : '') +
    `<div class="row">${failed.length ? '<button class="btn" onclick="moveRetry()">Try again ✈️</button>' : ''}<button class="btn white" onclick="this.closest('#movenote').remove()">OK</button></div></div>`;
  document.body.appendChild(d);
}
window.moveRetry = () => location.assign(MOVE.old + '#capy-retry');
