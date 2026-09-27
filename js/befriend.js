// Asking another visitor to be best friends, while you're both visiting the same island (cloud visits).
'use strict';

// ---------- BEST-FRIEND REQUESTS ----------
// On a cloud visit, everyone is already the host's best friend, but two visitors may not be each other's.
// Becoming best friends on the server works like visiting by island code (join_by_code makes the two of you
// best friends). So asking works like this:
//   1. the asker's phone gets its island code from the server (open_island) and sends it, through the host,
//      to the other visitor;
//   2. the other visitor sees "💕 Ada wants to be best friends!" and can say yes or not now;
//   3. on yes, their phone joins by that code, but only after checking the server says the code belongs to
//      the player who asked (so a host can't swap in someone else's code). Then both are told.
// The asker's code is closed again (close_island) once there's an answer or after a while.
// Grown-ups can switch this off (⚙️): then no asking, and requests to this phone are politely declined.
const FR_WAIT = 90; // seconds to wait for an answer
const FR = { out: null, in: null, lastAsk: -99, timer: null };
const befriendOn = () => CL.on && CL.freq;
const isFriend = id => CL.friends.some(f => f.id === id);
// can I ask this player? (a fellow visitor on a cloud visit who isn't my best friend yet)
function canAsk(id) {
  return (
    befriendOn() &&
    MP.role === 'visitor' &&
    !MP.offline &&
    cloudConn(MP.conn) &&
    UUID_RE.test(String(id)) &&
    id !== MP.me &&
    MP.players.has(id) &&
    !isFriend(id)
  );
}
const playerName = id => (MP.players.get(id) || {}).name || 'Friend';

// tapping another capybara while visiting: offer to ask, or say you're already best friends
function befriendTap(id) {
  // only on cloud visits, where everyone there is already the host's best friend
  const cloudy = MP.role === 'visitor' ? cloudConn(MP.conn) : cloudConn((MP.vis.get(id) || {}).conn);
  if (!CL.on || !cloudy || !MP.players.has(id)) return false;
  const nm = esc(playerName(id));
  if (id === 'host' || isFriend(id)) toast(`💕 ${nm} is already one of your best friends!`);
  else if (canAsk(id)) befriendAsk(id);
  else return false;
  return true;
}
window.befriendAsk = id => {
  if (!canAsk(id)) return;
  const r = MP.players.get(id);
  modal(
    `<h2>💕 Make a best friend?</h2><p class="c" style="font-size:18px">Ask <span class="dot" style="background:${(CAPY[r.color] || CAPY.caramel).b}"></span><b>${esc(r.name)}</b> to be best friends?</p>` +
      `<p class="c" style="font-size:13px">Best friends can visit each other, chat, and see each other's drawings.</p>` +
      `<div class="row"><button class="btn" onclick="befriendSend('${id}')">Ask! 💌</button><button class="btn white" onclick="closeModal()">Not now</button></div>`
  );
};
window.befriendSend = async id => {
  closeModal();
  if (!canAsk(id)) return;
  if (FR.out) return toast(`Waiting for ${esc(playerName(FR.out.to))} to answer... 💭`);
  if (time - FR.lastAsk < 20) return toast('Wait a little before asking again! 🐢');
  FR.lastAsk = time;
  let code = null;
  try {
    await clUpload(true);
    code = await clRpc('open_island');
  } catch (e) {}
  if (!/^[A-Z0-9]{5}$/.test(String(code))) return toast("Couldn't ask right now. 📡 Try again!");
  if (!canAsk(id)) return befriendClose();
  FR.out = { to: id, code };
  try {
    MP.conn.send({ t: 'freq', to: id, code });
  } catch (e) {}
  toast(`💌 You asked ${esc(playerName(id))} to be best friends!`);
  clearTimeout(FR.timer);
  FR.timer = setTimeout(() => {
    if (FR.out && FR.out.to === id) befriendDone(false, 'quiet');
  }, FR_WAIT * 1000);
};
// the asker's code isn't needed any more
function befriendClose() {
  clearTimeout(FR.timer);
  FR.out = null;
  if (CL.sb) clRpc('close_island').catch(() => {});
}
function befriendDone(ok, why) {
  const nm = FR.out ? esc(playerName(FR.out.to)) : 'Your friend';
  befriendClose();
  if (ok) {
    clFriendsRefresh().then(() => chatUI && chatUI());
    SND.heart();
    toast(`💕 ${nm} said yes! You're best friends now!`, 3500);
  } else
    toast(
      why === 'busy'
        ? `${nm} is busy right now. Try again in a bit! 🙂`
        : why === 'quiet'
          ? `${nm} didn't answer. Maybe next time! 💭`
          : `${nm} said maybe another time. 💭`,
      3000
    );
}

// ----- the host passes requests and answers between two cloud visitors (it never acts on them itself)
function befriendRelay(v, d) {
  if (!cloudConn(v.conn)) return;
  const to = String(d.to || ''),
    w = MP.vis.get(to);
  if (!w || w === v || !cloudConn(w.conn) || !w.conn.open) return;
  if (d.t === 'freq') {
    if (time - (v.frT || -99) < 5) return;
    if (!/^[A-Z0-9]{5}$/.test(String(d.code))) return;
    v.frT = time;
    try {
      w.conn.send({ t: 'freq', id: v.id, code: d.code });
    } catch (e) {}
  } else
    try {
      w.conn.send({ t: 'fres', id: v.id, ok: d.ok ? 1 : 0, busy: d.busy ? 1 : 0 });
    } catch (e) {}
}

// ----- visitor side: a request arrives, or an answer to mine
function befriendAnswer(to, ok, busy) {
  try {
    MP.conn.send({ t: 'fres', to, ok: ok ? 1 : 0, busy: busy ? 1 : 0 });
  } catch (e) {}
}
function befriendIncoming(d) {
  const id = String((d && d.id) || ''),
    code = String((d && d.code) || '');
  if (MP.role !== 'visitor' || !cloudConn(MP.conn) || !UUID_RE.test(id) || !MP.players.has(id)) return;
  if (!/^[A-Z0-9]{5}$/.test(code)) return;
  if (isFriend(id)) return befriendAnswer(id, true); // already friends: nothing to do
  if (!befriendOn()) return befriendAnswer(id, false);
  if (busy || FR.in) return befriendAnswer(id, false, true);
  const r = MP.players.get(id);
  FR.in = { id, code, name: r.name };
  SND.ding();
  modal(
    `<h2>💕 New friend?</h2><p class="c" style="font-size:18px"><span class="dot" style="background:${(CAPY[r.color] || CAPY.caramel).b}"></span><b>${esc(r.name)}</b> wants to be best friends!</p>` +
      `<p class="c" style="font-size:13px">Best friends can visit each other, chat, and see each other's drawings.</p>` +
      `<div class="row"><button class="btn" onclick="befriendYes()">Yes! 💕</button><button class="btn white" onclick="befriendNo()">Not now</button></div>`
  );
}
window.befriendNo = () => {
  const q = FR.in;
  FR.in = null;
  closeModal();
  if (q) befriendAnswer(q.id, false);
};
window.befriendYes = async () => {
  const q = FR.in;
  FR.in = null;
  closeModal();
  if (!q) return;
  let r = null;
  try {
    r = await clRpc('join_by_code', { p_code: q.code });
  } catch (e) {}
  // the code must really be the asker's island
  if (!r || r.owner !== q.id) {
    befriendAnswer(q.id, false);
    return toast("Hmm, that didn't work. 📡 Maybe next time!");
  }
  befriendAnswer(q.id, true);
  clFriendsRefresh().then(() => chatUI && chatUI());
  SND.heart();
  toast(`💕 ${esc(q.name)} is now one of your best friends!`, 3500);
};
function befriendResult(d) {
  const id = String((d && d.id) || '');
  if (!FR.out || FR.out.to !== id) return;
  befriendDone(!!d.ok, d.busy ? 'busy' : '');
}
// when a visit ends: close any open code, forget the request
function befriendTidy() {
  if (MP.role) return;
  if (FR.out) befriendClose();
  FR.in = null;
}

// the Capy Air menu while visiting: fellow visitors I could ask
function befriendDockHtml() {
  const ids = [...MP.players.keys()].filter(canAsk);
  if (!ids.length) return '';
  return (
    '<h3>💕 Make friends</h3><div class="plist">' +
    ids
      .map(id => {
        const r = MP.players.get(id);
        return `<div class="li"><span class="dot" style="background:${(CAPY[r.color] || CAPY.caramel).b}"></span><b style="flex:1">${esc(r.name)}</b><button class="btn" onclick="befriendAsk('${id}')">Ask 💌</button></div>`;
      })
      .join('') +
    '</div>'
  );
}
