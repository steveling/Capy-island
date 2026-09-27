// The Capy Air passcode gate shown before first play in cloud mode.
'use strict';

// ---------- PASSCODE GATE (Capy Air arrivals) ----------
// The passcode is checked ONLY by the server (redeem_passcode); this page never contains it or a hash of it.
// After the first unlock we just remember "this phone is unlocked" (not the passcode) and never ask again.
const UNLOCK_KEY = 'capyIsland.unlocked';
function gateOpen() {
  if (!CL.on) return true;
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch (e) {
    return false;
  }
}
const GUARD_SVG =
  '<svg viewBox="0 0 160 172" xmlns="http://www.w3.org/2000/svg"><ellipse cx="80" cy="166" rx="50" ry="6" fill="rgba(60,40,80,.18)"/>' +
  '<rect x="50" y="140" width="16" height="24" rx="7" fill="#a8703f"/><rect x="94" y="140" width="16" height="24" rx="7" fill="#a8703f"/>' +
  '<ellipse cx="80" cy="122" rx="50" ry="40" fill="#c98b5b"/><ellipse cx="80" cy="132" rx="31" ry="25" fill="#e3b287"/>' +
  '<path d="M42 96 L58 90 L122 150 L106 156 Z" fill="#ff8cc6"/><path d="M47 97l5-2 60 56-5 2z" fill="#ffd0e6"/><text x="86" y="128" font-size="12" text-anchor="middle" transform="rotate(42 86 124)">⭐</text>' +
  '<ellipse cx="34" cy="120" rx="10" ry="20" fill="#b97a4b" transform="rotate(14 34 120)"/>' +
  '<g id="garm"><ellipse cx="127" cy="116" rx="10" ry="21" fill="#b97a4b" transform="rotate(-14 127 116)"/><circle cx="131" cy="135" r="8" fill="#a8703f"/></g>' +
  '<g id="ghead"><ellipse cx="46" cy="44" rx="9" ry="8" fill="#a8703f"/><ellipse cx="114" cy="44" rx="9" ry="8" fill="#a8703f"/>' +
  '<ellipse cx="80" cy="70" rx="45" ry="36" fill="#c98b5b"/><ellipse cx="80" cy="88" rx="25" ry="16" fill="#a8703f"/>' +
  '<ellipse cx="72" cy="85" rx="3" ry="2.2" fill="#4a2e1c"/><ellipse cx="88" cy="85" rx="3" ry="2.2" fill="#4a2e1c"/><path d="M73 95q7 5 14 0" stroke="#4a2e1c" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
  '<circle cx="60" cy="66" r="5" fill="#3a2618"/><circle cx="100" cy="66" r="5" fill="#3a2618"/><circle cx="61.6" cy="64.3" r="1.7" fill="#fff"/><circle cx="101.6" cy="64.3" r="1.7" fill="#fff"/>' +
  '<ellipse cx="50" cy="80" rx="7" ry="4" fill="#ff9cc4" opacity=".7"/><ellipse cx="110" cy="80" rx="7" ry="4" fill="#ff9cc4" opacity=".7"/>' +
  '<path d="M38 48 Q80 10 122 48 Q80 38 38 48 Z" fill="#35437d"/><path d="M34 50 Q80 36 126 50 Q124 56 118 55 Q80 46 42 55 Q36 56 34 50 Z" fill="#26315e"/>' +
  '<circle cx="80" cy="33" r="6.5" fill="#ffd84d"/><path d="M73 33q-9-4-15 1q8 1 15 3zM87 33q9-4 15 1q-8 1-15 3z" fill="#ffd84d"/><text x="80" y="36" font-size="7" text-anchor="middle" fill="#35437d" font-weight="900">C</text></g></svg>';
function gateSay(h) {
  const b = $('#gbub');
  if (b) b.innerHTML = h;
}
function gateNote(h) {
  const n = $('#gnote');
  if (n) n.innerHTML = h || '';
}
function gateNet() {
  if (!$('#gate')) return;
  gateNote(
    navigator.onLine
      ? ''
      : '📡 No internet right now. The very first time, this phone needs the internet so I can check the secret word.'
  );
}
function showGate() {
  if ($('#gate')) return;
  closeModal();
  const g = document.createElement('div');
  g.id = 'gate';
  g.setAttribute('role', 'dialog');
  g.setAttribute('aria-label', 'Secret island code');
  g.innerHTML = `<div class="gsky"><div class="gcl" style="top:7%;width:70px"></div><div class="gcl" style="top:21%;width:54px;animation-delay:-14s"></div><div class="gcl" style="top:33%;width:80px;animation-delay:-27s"></div><div class="gpl">🛩️</div><div class="grun"></div></div>
 <div class="gsign">✈️ CAPY AIR · ARRIVALS<small>Gate 🏝️ Capy Island</small></div>
 <div class="gbub" id="gbub">Welcome, traveler! 🧳<br><b>What's the secret word?</b></div>
 <div class="gstage" id="gstage"><div class="gpost"></div><div class="gbar"></div><div class="gguard" id="gguard">${GUARD_SVG}</div></div>
 <div class="gform" id="gform"><div id="gmain"><input class="name" id="gin" maxlength="40" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="secret island code" aria-label="Enter the secret island code">
 <button class="btn big" id="gbtn">Let me in! ✈️</button></div><p class="gnote" id="gnote"></p>
 <button class="glink" id="gmove">📲 Moving from another phone?</button></div>`;
  document.body.appendChild(g);
  gateNet();
  $('#gbtn').onclick = gateTry;
  $('#gin').onkeydown = e => {
    if (e.key === 'Enter') gateTry();
  };
  $('#gmove').onclick = gateMoveForm;
  setTimeout(() => {
    const i = $('#gin');
    if (i)
      try {
        i.focus({ preventScroll: true });
      } catch (e) {}
  }, 400);
}
addEventListener('online', gateNet);
addEventListener('offline', gateNet);
let gateBusy = false;
function gateMood(k) {
  const gd = $('#gguard');
  if (!gd) return;
  gd.classList.remove('no', 'yes');
  void gd.offsetWidth;
  if (k) gd.classList.add(k);
}
async function gateTry() {
  if (gateBusy) return;
  const i = $('#gin'),
    v = ((i && i.value) || '').trim();
  if (!v) {
    gateSay('Type the secret word in the box! 😊');
    return;
  }
  if (!navigator.onLine) {
    gateSay("📡 Oh no, I can't check it without the internet!");
    gateNet();
    return;
  }
  gateBusy = true;
  const b = $('#gbtn');
  b.disabled = true;
  b.textContent = 'Checking... 🔍';
  gateNote('');
  let ok = false,
    err = '';
  try {
    await clAuth();
    ok = (await clRpc('redeem_passcode', { p: v })) === true;
  } catch (e) {
    err = clErr(e) || 'net';
  }
  gateBusy = false;
  if (!$('#gate')) return;
  b.disabled = false;
  b.textContent = 'Let me in! ✈️';
  if (ok) {
    try {
      localStorage.setItem(UNLOCK_KEY, '1');
    } catch (e) {}
    gateWin();
    return;
  }
  if (err) {
    gateMood('no');
    if (err.includes('rate_limited'))
      gateSay("Phew, that's a lot of tries! 😅<br>Let's take a little break and try again later.");
    else gateSay("📡 Hmm, my radio can't reach the island right now.<br>Check the internet and try again!");
    return;
  }
  gateMood('no');
  try {
    SND.pop();
  } catch (e) {}
  const f = $('#gform');
  f.classList.remove('shake');
  void f.offsetWidth;
  f.classList.add('shake');
  gateSay("Hmm, that's not it! 🙈<br><b>Ask a grown-up</b> for the secret word.");
  i.value = '';
  i.focus();
}
function gateWin() {
  gateMood('yes');
  const st = $('#gstage');
  st.classList.add('open');
  try {
    SND.yay();
    setTimeout(() => SND.yay(), 400);
  } catch (e) {}
  gateSay("🎉 Yay! That's it! 🎉<br><b>Welcome to Capy Island!</b> Come on through! 👋");
  const f = $('#gform');
  if (f) f.style.visibility = 'hidden';
  const c = document.createElement('div');
  c.className = 'confetti';
  c.style.cssText = 'position:fixed;left:0;right:0;top:30%;z-index:61';
  c.innerHTML = Array.from(
    { length: 28 },
    (_, k) =>
      `<i style="left:${(k * 37) % 100}%;animation-delay:${(k % 7) * 0.09}s;background:${['#ff8cc6', '#ffd84d', '#8fd3f0', '#b48cff', '#5fd3a8'][k % 5]}"></i>`
  ).join('');
  $('#gate').appendChild(c);
  setTimeout(() => {
    const g = $('#gate');
    if (!g) return;
    g.classList.add('bye');
    setTimeout(() => {
      g.remove();
      gateDone();
    }, 650);
  }, 2300);
}
function gateDone() {
  if (!CL.booted) {
    CL.booted = true;
    capyBoot();
  }
  if (!CL.started) {
    CL.started = true;
    clStart();
  } else {
    CL.status = 'off';
    clInit();
  }
}
// a phone that is moving over from an allowed phone: the one-time moving code also unlocks it (server-side in claim_transfer)
function gateMoveForm() {
  const m = $('#gmain');
  if (!m) return;
  gateSay('Moving from another phone? 📲<br><b>Type the moving code</b> from the old phone!');
  gateNote('');
  m.innerHTML =
    '<input class="name" id="gin" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" style="font-size:22px"><button class="btn big" id="gbtn">Move my island here 🛩️</button>';
  $('#gbtn').onclick = gateMove;
  $('#gmove').textContent = '🔑 I have the secret word instead';
  $('#gmove').onclick = () => {
    $('#gate').remove();
    showGate();
  };
}
async function gateMove() {
  if (gateBusy) return;
  const c = String($('#gin').value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length !== 12) {
    gateSay('Moving codes look like<br><b>XXXX-XXXX-XXXX</b> 🙂');
    return;
  }
  if (!navigator.onLine) {
    gateSay('📡 I need the internet to bring your island over!');
    return;
  }
  gateBusy = true;
  const b = $('#gbtn');
  b.disabled = true;
  b.textContent = 'Moving... 🛩️';
  let r = null,
    err = '';
  try {
    await clAuth();
    r = await clRpc('claim_transfer', { p_code: c });
  } catch (e) {
    err = clErr(e) || 'net';
  }
  gateBusy = false;
  b.disabled = false;
  b.textContent = 'Move my island here 🛩️';
  if (!r || !r.save) {
    gateMood('no');
    gateSay(
      err.includes('rate_limited')
        ? "That's a lot of tries! 😅 Let's rest and try later."
        : err
          ? "📡 I can't reach the island right now. Try again!"
          : "Hmm, that code didn't work. 🙈<br>It may be mistyped, used already, or too old."
    );
    return;
  }
  let bk;
  try {
    bk = parseBackup(JSON.stringify(r.save));
  } catch (e) {
    gateSay('😕 The island data looks damaged. Nothing was changed.');
    return;
  }
  restoring = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(bk.save));
    localStorage.setItem(UNLOCK_KEY, '1');
  } catch (e) {
    restoring = false;
    gateSay("😕 Couldn't save on this phone.");
    return;
  }
  const ts = Number(r.save_ts) || Date.now();
  clMetaSet({ uid: CL.uid, localTs: ts, syncedTs: ts, dirty: false, moved: false, friends: [] });
  gateWin();
  setTimeout(() => location.replace(location.pathname), 2400);
}

function clStart() {
  CL.started = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clTrack();
      clFlush();
    } else {
      clTrack();
      if (CL.ready) clHeartbeat();
      else clInit();
    }
  });
  addEventListener('pagehide', clFlush);
  addEventListener('online', () => clInit());
  setInterval(() => {
    if (!CL.ready && !document.hidden && CL.status !== 'moved') clInit();
  }, 120000);
  clInit();
}
