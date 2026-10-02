// Several players on one phone, each with their own island and a secret emoji.
'use strict';

// ---------- PLAYERS: several kids on one phone, each with their own island + a secret emoji ----------
// The playing island always lives in the usual keys (save, cloud meta, cloud sign-in, passcode unlock);
// the other players' copies are parked under capyIsland.p.<id>.<key> and swapped in on a switch.
// The secret emoji is a little-kid lock so siblings don't play each other's island, not real security.
const PL_KEY = 'capyIsland.players',
  PL_PARK = 'capyIsland.p.';
const PW_EMOJI = [
  '🐶',
  '🐱',
  '🐼',
  '🦊',
  '🐸',
  '🐵',
  '🦁',
  '🐯',
  '🐨',
  '🐷',
  '🐙',
  '🦄',
  '🐢',
  '🐳',
  '🦋',
  '🐞',
  '🐧',
  '🦖',
  '🌈',
  '⭐',
  '🌙',
  '🌸',
  '🌻',
  '🍄',
  '🍓',
  '🍉',
  '🍩',
  '🍦',
  '🍕',
  '🧁',
  '🎈',
  '🎀',
  '🚀',
  '🚗',
  '⚽',
  '🎸',
  '👑',
  '💎',
  '🌵',
  '🍭'
];
var PL;
try {
  PL = JSON.parse(localStorage.getItem(PL_KEY));
} catch (e) {}
if (!PL || typeof PL !== 'object' || !Array.isArray(PL.list)) PL = { active: null, list: [] };
PL.list = PL.list
  .filter(p => p && typeof p.id === 'string' && /^[a-z0-9]{6,20}$/.test(p.id))
  .map(p => ({
    id: p.id,
    name: String(p.name || '').slice(0, 12),
    color: CAPY[p.color] ? p.color : 'pink',
    pw: PW_EMOJI.includes(p.pw) ? p.pw : null
  }));
if (!PL.list.some(p => p.id === PL.active)) PL.active = null;
const pwTries = {};
function plWrite() {
  if (tabGone) return;
  try {
    localStorage.setItem(PL_KEY, JSON.stringify(PL));
  } catch (e) {}
}
const plMe = () => PL.list.find(p => p.id === PL.active) || null,
  plGet = id => PL.list.find(p => p.id === id) || null;
// keep the playing player's entry in step with the island (name + capy color)
function plSync() {
  if (!S.name || restoring) return;
  let p = plMe();
  if (!p) {
    p = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: '',
      color: 'pink',
      pw: null
    };
    PL.list.push(p);
    PL.active = p.id;
  }
  const c = myColor();
  if (p.name !== S.name || p.color !== c) {
    p.name = S.name;
    p.color = c;
    plWrite();
  } else if (!localStorage.getItem(PL_KEY)) plWrite();
}
function whoUI() {
  const b = document.getElementById('who');
  if (!b) return;
  const show = !!S.name && !MP.role;
  b.classList.toggle('hidden', !show);
  if (show) {
    plSync();
    b.innerHTML = `<span class="dot" style="background:${CAPY[myColor()].b}"></span>${esc(S.name)}`;
  }
}
function plKeys() {
  const ks = [KEY, CMETA, UNLOCK_KEY];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('capyIsland.auth') && !ks.includes(k)) ks.push(k);
  }
  return ks;
}
function plParked(id) {
  const pre = PL_PARK + id + '.',
    out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(pre)) out.push(k);
  }
  return out;
}
// move the playing island out of the live keys / move a parked island into them
function plPark(id) {
  plParked(id).forEach(k => localStorage.removeItem(k));
  plKeys().forEach(k => {
    const v = localStorage.getItem(k);
    if (v != null) localStorage.setItem(PL_PARK + id + '.' + k, v);
    localStorage.removeItem(k);
  });
}
function plUnpark(id) {
  const pre = PL_PARK + id + '.';
  plParked(id).forEach(k => {
    localStorage.setItem(k.slice(pre.length), localStorage.getItem(k));
    localStorage.removeItem(k);
  });
}
// id = a player to fly to, or null for a new player: a brand-new one (the welcome screen asks their name),
// or one arriving from elsewhere, whose island arrive() writes into the live keys once mine are parked
async function plGo(id, arrive) {
  if (MP.role) {
    toast('Please finish visiting / close your island first. ✈️', 3000);
    return;
  }
  save();
  plSync();
  if (!plMe()) return;
  if (CL.ready && CL.meta.dirty) await Promise.race([clUpload(true), new Promise(r => setTimeout(r, 3000))]);
  restoring = true;
  clearTimeout(CL.upT);
  try {
    CL.sb && CL.sb.auth.stopAutoRefresh();
  } catch (e) {}
  const from = PL.active;
  try {
    plPark(from);
    if (id) plUnpark(id);
    else if (arrive) arrive();
    PL.active = id;
    localStorage.setItem(PL_KEY, JSON.stringify(PL));
  } catch (e) {
    try {
      plKeys().forEach(k => localStorage.removeItem(k)); // anything half-written for the arriving player
      plUnpark(from);
    } catch (x) {}
    PL.active = from;
    plWrite();
    restoring = false;
    modal(
      `<h2>😕 Oops</h2><p class="c">Couldn't switch players on this phone (it may be out of space).</p><div class="row"><button class="btn" onclick="closeModal()">OK</button></div>`
    );
    return;
  }
  location.replace(location.pathname);
}

function pwBtn(e, i, fn) {
  return `<button class="pwe" onclick="${fn}(${i})" aria-label="${e}">${e}</button>`;
}
// the 12 choices for a player: their secret emoji + 11 decoys that stay the same every try (only the order changes)
function pwChoices(p) {
  let s = 7;
  for (const c of p.id) s = (Math.imul(s, 31) + c.charCodeAt(0)) >>> 0;
  const r = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  const d = PW_EMOJI.filter(e => e !== p.pw);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  const g = d.slice(0, 11).concat(p.pw);
  for (let i = g.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [g[i], g[j]] = [g[j], g[i]];
  }
  return g;
}
function pwShake() {
  const g = $('#pwg');
  if (!g) return;
  g.classList.remove('shake');
  void g.offsetWidth;
  g.classList.add('shake');
}

// ----- "Who's playing?" (tap the name under the coins)
function openPlayers() {
  if (!S.name) return;
  if (MP.role) {
    toast('Please finish visiting / close your island first. ✈️', 3000);
    return;
  }
  plSync();
  const me = plMe();
  if (!me.pw) {
    pwCreate(
      openPlayers,
      `Before you switch, pick a secret emoji so only <b>you</b> can open ${esc(S.name)}'s island! 🔒`
    );
    return;
  }
  const rows = PL.list
    .map(p => {
      const now = p.id === PL.active;
      return `<button class="plb${now ? ' now' : ''}" ${now ? 'disabled' : `onclick="plPick('${p.id}')"`}><span class="dot" style="background:${CAPY[p.color].b}"></span>${esc(p.name || '?')}<small>${now ? 'playing now' : p.pw ? '🔒' : ''}</small></button>`;
    })
    .join('');
  modal(
    `<h2>👥 Who's playing?</h2><div class="plist">${rows}</div><button class="btn big white" onclick="plNewAsk()">➕ New player</button>` +
      (CL.on ? `<button class="btn big white" onclick="plFromPhone()">📲 From another phone</button>` : '') +
      `<button class="btn big white" onclick="plFromBackup()">💾 From a backup</button><div class="row"><button class="btn" onclick="closeModal()">Close</button></div>`
  );
}
window.plPick = id => {
  const p = plGet(id);
  if (!p) return;
  if (p.pw) pwAsk(p);
  else {
    modal(
      `<h2>🛩️ Flying...</h2><div style="text-align:center;font-size:56px"><div class="fly">🛩️</div></div><p class="c" style="font-size:18px">Off to ${esc(p.name)}'s island!</p>`
    );
    plGo(id);
  }
};
window.plNewAsk = () =>
  modal(
    `<h2>➕ New player</h2><div style="text-align:center;font-size:54px">🏝️</div><p class="c" style="font-size:17px">A new player gets their very own island!<br>${esc(S.name)}'s island will be safe and waiting. 💕</p><div class="row"><button class="btn" onclick="plGo(null)">Let's go! ✈️</button><button class="btn white" onclick="openPlayers()">Back</button></div>`
  );

// ----- a player who played on another phone or browser comes to this one
// Moving (cloud): the other browser makes a one-time code ("📱 Move to a new phone"). Claiming it moves the
// island to whichever cloud sign-in makes the claim, so this uses a new, separate sign-in (stored under
// XFER_AUTH, outside the live keys) and only switches players once the claim has worked: a wrong or old code
// changes nothing here. The other browser stops cloud saving that island.
const XFER_AUTH = 'capyIsland.xfer.auth';
function xferKeys() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(XFER_AUTH)) out.push(k);
  }
  return out;
}
const xferClear = () => xferKeys().forEach(k => localStorage.removeItem(k));
window.plFromPhone = msg => {
  modal(
    `<h2>📲 Player from another phone</h2>${msg ? `<p class="note">${msg}</p>` : ''}<ol class="steps"><li>On the <b>other</b> phone or browser, open Capy Island as that player.</li><li>A grown-up holds ⚙️ there and taps <b>“📱 Move to a new phone”</b>.</li><li>Type the code it shows:</li></ol>` +
      `<input class="name" id="plxin" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" aria-label="Moving code" style="font-size:20px">` +
      `<p class="c" style="font-size:13px">The island <b>moves</b> here as a new player, and the other phone stops saving it to the cloud. ${esc(S.name)}'s island stays safe on this phone.</p>` +
      `<div class="row"><button class="btn" onclick="plClaimNew()">Bring them here ✈️</button><button class="btn white" onclick="openPlayers()">Back</button></div>`
  );
};
window.plClaimNew = async () => {
  const c = String(($('#plxin') || {}).value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length !== 12) return plFromPhone('😕 Moving codes look like XXXX-XXXX-XXXX.');
  if (MP.role) return plFromPhone('Please finish visiting / close your island first. ✈️');
  if (!navigator.onLine) return plFromPhone('📡 Moving a player needs the internet.');
  modal(
    '<h2>📲 Moving...</h2><div style="text-align:center;font-size:56px"><div class="fly">🛩️</div></div><p class="c" style="font-size:18px">Bringing the island over...</p>'
  );
  xferClear();
  let r = null,
    uid = null,
    err = '';
  try {
    await clLoad();
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: XFER_AUTH
      }
    });
    const s = await sb.auth.signInAnonymously();
    if (s.error) throw s.error;
    uid = s.data.session.user.id;
    const res = await sb.rpc('claim_transfer', { p_code: c });
    if (res.error) throw new Error(res.error.message || 'claim_transfer');
    r = res.data;
  } catch (e) {
    err = clErr(e) || 'net';
  }
  if (!r || !r.save || !UUID_RE.test(String(uid))) {
    xferClear();
    return plFromPhone(
      err.includes('rate_limited')
        ? '😕 Too many tries. Please wait a while and try again.'
        : err
          ? "📡 Couldn't reach the cloud. Check the internet and try again."
          : "😕 That code didn't work. It may be mistyped, already used, or older than 24 hours."
    );
  }
  let b;
  try {
    b = parseBackup(JSON.stringify(r.save));
  } catch (e) {
    xferClear();
    return plFromPhone('😕 The island data looks damaged. Nothing was changed.');
  }
  const ts = Number(r.save_ts) || Date.now();
  await plGo(null, () => {
    // the arriving player's sign-in is the one that just claimed their island
    xferKeys().forEach(k => {
      localStorage.setItem('capyIsland.auth' + k.slice(XFER_AUTH.length), localStorage.getItem(k));
      localStorage.removeItem(k);
    });
    localStorage.setItem(KEY, JSON.stringify(b.save));
    localStorage.setItem(UNLOCK_KEY, '1'); // the moving code also unlocks the gate (server-side, in claim_transfer)
    localStorage.setItem(
      CMETA,
      JSON.stringify({ uid, localTs: ts, syncedTs: ts, dirty: false, moved: false, friends: [] })
    );
  });
};

// From a backup (any mode): adds a *copy* of the island as a new player; the original keeps going on its own
window.plFromBackup = msg => {
  modal(
    `<h2>💾 Player from a backup</h2>${msg ? `<p class="note">${msg}</p>` : ''}<p class="c" style="font-size:14px">Adds the island from a backup as a <b>new player</b> on this phone. It's a copy: the other one keeps going on its own.</p>` +
      `<div class="row" style="margin-top:0"><label class="btn white">📂 Choose file<input type="file" id="plbkfile" accept=".json,application/json,text/plain" style="display:none"></label></div>` +
      `<p class="c" style="font-size:14px;margin:10px 0 4px">…or paste a backup code:</p><textarea class="bk" id="plbkin" placeholder="Paste backup code here"></textarea>` +
      `<div class="row"><button class="btn" onclick="plBackupAsk(document.getElementById('plbkin').value)">Add player</button><button class="btn white" onclick="openPlayers()">Back</button></div>`
  );
  $('#plbkfile').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 2e6) return plFromBackup('😕 That file is too big to be a Capy Island backup.');
    const rd = new FileReader();
    rd.onload = () => plBackupAsk(String(rd.result));
    rd.onerror = () => plFromBackup("😕 Couldn't read that file.");
    rd.readAsText(f);
  };
};
let plBk = null;
window.plBackupAsk = txt => {
  try {
    plBk = parseBackup(txt);
  } catch (e) {
    plBk = null;
    return plFromBackup("😕 That doesn't look like a Capy Island backup.");
  }
  const sv = plBk.save;
  modal(
    `<h2>💾 Add this player?</h2><p class="c" style="font-size:17px">Add <b>${esc(sv.name || 'this')}'s island</b> (🪙 ${sv.coins | 0}) as a new player on this phone?</p>` +
      (CL.on
        ? `<p class="c" style="font-size:13px">A grown-up will type the secret word once for the new player.</p>`
        : '') +
      `<div class="row"><button class="btn" onclick="plBackupAdd()">Yes, add them</button><button class="btn white" onclick="plFromBackup()">Cancel</button></div>`
  );
};
window.plBackupAdd = () => {
  const b = plBk;
  if (!b) return;
  plBk = null;
  plGo(null, () => localStorage.setItem(KEY, JSON.stringify(b.save)));
};

// ----- switching to someone: tap your secret emoji (1 of 12)
let pwFor = null,
  pwG = [],
  pwLockT = null;
function pwAsk(p, msg) {
  pwFor = p;
  pwG = pwChoices(p);
  const t = pwTries[p.id] || (pwTries[p.id] = { n: 0, until: 0 });
  modal(
    `<h2>🤫 Hi ${esc(p.name)}!</h2><p class="c" style="font-size:17px">Tap your <b>secret emoji</b> to open your island!</p><div class="pwg" id="pwg">${pwG.map((e, i) => pwBtn(e, i, 'pwTry')).join('')}</div><p class="c" id="pwmsg" style="min-height:1.3em">${msg || ''}</p><div class="row"><button class="btn white" onclick="openPlayers()">Back</button></div>`
  );
  if (t.until > Date.now()) pwLock(t);
}
function pwLock(t) {
  clearInterval(pwLockT);
  const g = $('#pwg');
  if (g) g.classList.add('off');
  const tick = () => {
    const left = Math.ceil((t.until - Date.now()) / 1000),
      m = $('#pwmsg');
    if (!m || !$('#pwg')) {
      clearInterval(pwLockT);
      return;
    }
    if (left <= 0) {
      clearInterval(pwLockT);
      $('#pwg').classList.remove('off');
      m.innerHTML = 'OK! Try again! 🙂';
      return;
    }
    m.innerHTML = `Let's take a little break... ⏳ ${left}<br><small>Forgot it? Ask a grown-up (hold ⚙️).</small>`;
  };
  tick();
  pwLockT = setInterval(tick, 500);
}
window.pwTry = i => {
  const p = pwFor,
    t = p && pwTries[p.id];
  if (!p || t.until > Date.now()) return;
  if (pwG[i] === p.pw) {
    t.n = 0;
    try {
      SND.unlock();
    } catch (e) {}
    modal(
      `<h2>🎉 Yay, ${esc(p.name)}!</h2><div style="text-align:center;font-size:56px"><div class="fly">🛩️</div></div><p class="c" style="font-size:18px">That's it! Flying to your island...</p>`
    );
    plGo(p.id);
    return;
  }
  try {
    SND.oops();
  } catch (e) {}
  t.n++;
  pwShake();
  if (t.n % 3 === 0) {
    t.until = Date.now() + 30000;
    pwLock(t);
    return;
  }
  const m = $('#pwmsg');
  if (m) m.innerHTML = "Oops, that's not it! 🙈 Try again!";
};

// ----- making a secret emoji (new players, and anyone who doesn't have one yet)
let pwNew = null,
  pwDone = null;
function pwCreate(done, why) {
  pwDone = done || null;
  pwNew = null;
  modal(
    `<h2>🤫 Pick your secret emoji!</h2><p class="c" style="font-size:16px">${why || `Hi ${esc(S.name)}! Pick an emoji you'll remember.`}<br>It's your <b>secret password</b> to get back to your island. Shh, don't tell! 🤐</p><div class="pwg all" id="pwg">${PW_EMOJI.map((e, i) => pwBtn(e, i, 'pwPick')).join('')}</div>`
  );
}
window.pwPick = i => {
  pwNew = PW_EMOJI[i];
  try {
    SND.pop();
  } catch (e) {}
  pwG = pwChoices({ id: plMe().id, pw: pwNew });
  modal(
    `<h2>🤫 Now remember it!</h2><p class="c" style="font-size:17px">Find your secret emoji and <b>tap it again</b>!</p><div class="pwg" id="pwg">${pwG.map((e, j) => pwBtn(e, j, 'pwCheck')).join('')}</div><p class="c" id="pwmsg" style="min-height:1.3em"></p><div class="row"><button class="btn white" onclick="pwCreate(pwDone)">Pick a different one</button></div>`
  );
};
window.pwCheck = i => {
  if (!pwNew) return;
  if (pwG[i] !== pwNew) {
    try {
      SND.oops();
    } catch (e) {}
    pwShake();
    const m = $('#pwmsg');
    if (m) m.innerHTML = "Hmm, that's not the one you picked! 🙈<br>Let's pick again.";
    setTimeout(() => {
      if ($('#pwmsg')) pwCreate(pwDone);
    }, 1600);
    return;
  }
  const me = plMe();
  me.pw = pwNew;
  plWrite();
  pwNew = null;
  try {
    SND.yay();
  } catch (e) {}
  modal(
    `<h2>🎉 All set!</h2><div style="text-align:center;font-size:64px">${me.pw}</div><p class="c" style="font-size:17px">This is your secret emoji, ${esc(S.name)}!<br>Remember it to open your island. 💕</p><div class="row"><button class="btn" id="pwok">I'll remember! 🩷</button></div>`
  );
  $('#pwok').onclick = () => {
    closeModal();
    const d = pwDone;
    pwDone = null;
    if (d) d();
  };
};

// ----- grown-ups: reset a forgotten secret emoji / remove a player
function plPanelHtml() {
  if (PL.list.length < 2 && !(plMe() && plMe().pw)) return '';
  return (
    `<h3>👥 Players</h3><p class="c" style="font-size:13px;margin-top:0">Forgot a secret emoji? Reset it and they'll pick a new one.</p><div class="plist">` +
    PL.list
      .map(
        p =>
          `<div class="li"><span class="dot" style="background:${CAPY[p.color].b}"></span><b style="flex:1">${esc(p.name || '?')}</b>${p.pw ? `<button class="btn white" onclick="plReset('${p.id}')">Reset 🤫</button>` : ''}${p.id !== PL.active ? `<button class="btn white" onclick="plRemoveAsk('${p.id}')">Remove</button>` : ''}</div>`
      )
      .join('') +
    '</div>'
  );
}
window.plReset = id => {
  const p = plGet(id);
  if (!p) return;
  p.pw = null;
  plWrite();
  if (id === PL.active)
    pwCreate(
      () => grownups(`✅ ${esc(p.name)} picked a new secret emoji.`),
      `Grown-up reset: ${esc(p.name)}, pick a new secret emoji!`
    );
  else grownups(`✅ ${esc(p.name)}'s secret emoji was reset. They'll pick a new one after they switch in.`);
};
window.plRemoveAsk = id => {
  const p = plGet(id);
  if (!p || id === PL.active) return;
  modal(
    `<h2>⚙️ Remove ${esc(p.name)}?</h2><p class="c" style="font-size:17px">This deletes <b>${esc(p.name)}'s island</b> from this phone. It can't be undone.</p><div class="row"><button class="btn" onclick="plRemove('${p.id}')">Yes, remove</button><button class="btn white" onclick="grownups()">Cancel</button></div>`
  );
};
window.plRemove = id => {
  if (id === PL.active) return;
  try {
    plParked(id).forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  PL.list = PL.list.filter(p => p.id !== id);
  plWrite();
  grownups('✅ Player removed.');
};
