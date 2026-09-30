// The mailbox by each house. Letters are a note and a sticker picked from a list (no typing), with a gift
// from your bag tucked inside if you like. You can send them:
//  - to best friends (cloud): from your own mailbox, or by tapping theirs when you visit (even while they nap);
//  - to other players on this phone: the letter goes straight into their island;
//  - to the island you're visiting with an island code: straight to the host, while you're both playing.
// The flag goes up when there's a letter you haven't read.
'use strict';

const MAILBOX = { x: HOUSE.x - 86, y: HOUSE.y + 38 };
const MAIL_MAX = 40;
const unread = () => S.mail.filter(m => !m.read).length;
const mailHit = (x, y) => Math.abs(x - MAILBOX.x) < 22 && y > MAILBOX.y - 62 && y < MAILBOX.y + 8;

function drawMailbox() {
  const x = MAILBOX.x,
    y = MAILBOX.y,
    up = !ONV() && unread() > 0,
    w = up ? Math.sin(time * 6) * 0.15 : 0;
  shadow(x + 2, y + 2, 18, 5);
  rr(x - 3, y - 34, 6, 36, 2);
  ctx.fillStyle = '#b98352';
  ctx.fill();
  // the box: a rounded top like a real mailbox
  ctx.fillStyle = '#ff6f9f';
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 34);
  ctx.lineTo(x - 16, y - 50);
  ctx.arc(x, y - 50, 16, Math.PI, 0);
  ctx.lineTo(x + 16, y - 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e04f84';
  ctx.beginPath();
  ctx.ellipse(x - 12, y - 45, 4, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 6, y - 46, 14, 2.5);
  // the flag
  ctx.save();
  ctx.translate(x + 16, y - 42);
  ctx.rotate(up ? -Math.PI / 2 + w : 0);
  ctx.fillStyle = '#9aa7c7';
  ctx.fillRect(0, -1.5, 16, 3);
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(10, -7, 8, 7);
  ctx.restore();
  if (up) emoji('💌', x, y - 80 + Math.sin(time * 3) * 3, 18);
}

// ----- tapping a mailbox
function openMailbox() {
  closeTalk();
  if (ONV()) return mailCompose(visitTarget());
  let h = `<h2>📬 My Mailbox</h2>`;
  const l = S.mail.slice().reverse();
  h += l.length
    ? '<div class="list">' +
      l
        .map((m, i) => {
          const j = S.mail.length - 1 - i;
          return `<div class="li${m.read ? '' : ' new'}" onclick="readMail(${j})"><span class="e">${MAIL_STICKERS[m.st]}</span><span class="t"><span class="dot" style="background:${CAPY[m.c].b}"></span>From ${esc(m.from)}${m.read ? '' : ' ✨'}<small>${esc(MAIL_NOTES[m.note])}${m.item && !m.took ? ' · 🎁' : ''}</small></span></div>`;
        })
        .join('') +
      '</div>'
    : '<p class="c">No letters yet! Write to a friend and maybe they\'ll write back. 💌</p>';
  h += `<div class="row"><button class="btn" onclick="mailWho()">✉️ Write a letter</button><button class="btn white" onclick="closeModal()">Close</button></div>`;
  modal(h);
}
window.openMailbox = openMailbox;
window.readMail = i => {
  const m = S.mail[i];
  if (!m) return;
  if (!m.read) {
    m.read = true;
    save();
  }
  SND.present();
  modal(
    `<div class="letter"><div class="stk">${MAIL_STICKERS[m.st]}</div><p>Dear ${esc(S.name)},</p><p class="note">${esc(MAIL_NOTES[m.note])}</p><p class="sig">Love, <span class="dot" style="background:${CAPY[m.c].b}"></span>${esc(m.from)} 💕</p>` +
      (m.item ? `<div class="gift">${ie(m.item)}<small>${esc(ITEMS[m.item].n)}</small></div>` : '') +
      `</div><div class="row">${m.item && !m.took ? `<button class="btn" onclick="takeMail(${i})">Take the gift 🎁</button>` : ''}<button class="btn white" onclick="openMailbox()">Back</button></div>`
  );
};
window.takeMail = i => {
  const m = S.mail[i];
  if (!m || !m.item || m.took || VIS()) return;
  m.took = true;
  const first = addItem(m.item);
  SND.yay();
  save();
  readMail(i);
  toast(
    `${ITEMS[m.item].e} ${ITEMS[m.item].n} is in your bag!${first ? '<br>✨ New in your book!' : ''}`,
    2600
  );
};

// ----- writing: who to, then what
// best friends (cloud) and the other players on this phone
function mailPeople() {
  const out = [];
  if (CL.on) CL.friends.forEach(f => out.push({ to: 'f:' + f.id, name: f.name, color: f.color, cloud: 1 }));
  PL.list
    .filter(p => p.id !== PL.active && p.name)
    .forEach(p => out.push({ to: 'p:' + p.id, name: p.name, color: p.color, phone: 1 }));
  return out;
}
// while visiting: the island I'm on
function visitTarget() {
  const nm = MP.island ? MP.island.name : 'Friend';
  const fid = MP.friend || (MP.conn && MP.conn.fid);
  if (fid && UUID_RE.test(fid)) return { to: 'f:' + fid, name: nm, color: MP.island.color, cloud: 1 };
  if (MP.role === 'visitor' && MP.conn && !cloudConn(MP.conn))
    return { to: 'host', name: nm, color: MP.island.color };
  return null;
}
window.mailWho = () => {
  const ps = mailPeople();
  modal(
    `<h2>✉️ Who is it for?</h2>` +
      (ps.length
        ? '<div class="list">' +
          ps
            .map(
              (p, i) =>
                `<div class="li" onclick="mailTo(${i})"><span class="dot" style="background:${(CAPY[p.color] || CAPY.caramel).b}"></span><span class="t">${esc(p.name)}<small>${p.phone ? '📱 On this phone' : '💕 Best friend'}</small></span></div>`
            )
            .join('') +
          '</div>' +
          (CL.on && !CL.ready && CL.friends.length ? `<p class="note">${OFFLINE_MSG}</p>` : '')
        : `<p class="c">No one to write to yet!<br>Make best friends by visiting with an island code ✈️, or add another player on this phone 👥.</p>`) +
      `<div class="row"><button class="btn white" onclick="openMailbox()">Back</button></div>`
  );
};
window.mailTo = i => mailCompose(mailPeople()[i]);

let MW = null; // the letter being written: { who, note, st, item }
function mailCompose(who) {
  if (!who) {
    toast(`That's ${hostName()}'s mailbox! 📬`);
    return;
  }
  MW = { who, note: 0, st: 0, item: null };
  mailDraw();
}
function mailDraw() {
  const w = MW,
    gifts = Object.keys(S.bag).filter(mailable);
  modal(
    `<h2>✉️ To ${esc(w.who.name)}</h2><h3>Sticker</h3><div class="stks">${MAIL_STICKERS.map((s, i) => `<button class="${i === w.st ? 'on' : ''}" onclick="mailSet('st',${i})">${s}</button>`).join('')}</div>` +
      `<h3>Message</h3><div class="notes">${MAIL_NOTES.map((n, i) => `<button class="${i === w.note ? 'on' : ''}" onclick="mailSet('note',${i})">${esc(n)}</button>`).join('')}</div>` +
      `<h3>Gift 🎁</h3><div class="grid"><div class="cell${w.item ? '' : ' on'}" onclick="mailSet('item',null)">💌<small>Just a letter</small></div>${gifts.map(k => `<div class="cell${w.item === k ? ' on' : ''}" onclick="mailSet('item','${k}')">${ie(k)}<small>${ITEMS[k].n}</small><span class="cnt">${S.bag[k]}</span></div>`).join('')}</div>` +
      `<div class="row"><button class="btn" id="mailgo" onclick="mailSend()">Send! 📮</button><button class="btn white" onclick="${ONV() ? 'closeModal()' : 'mailWho()'}">Back</button></div>`
  );
}
window.mailSet = (k, v) => {
  if (!MW) return;
  if (k === 'item') MW.item = v && mailable(v) && S.bag[v] ? v : null;
  else if (Number.isInteger(v)) MW[k] = v;
  mailDraw();
};
window.mailSend = async () => {
  const w = MW;
  if (!w || w.sending) return;
  if (w.item && !S.bag[w.item]) w.item = null;
  const done = ok => {
    w.sending = false;
    if (ok === true) {
      if (w.item) takeItem(w.item);
      MW = null;
      save();
      SND.whoosh();
      closeModal();
      toast(`📮 Your letter is on its way to ${esc(w.who.name)}! 💌`, 2800);
    } else toast(ok || "Couldn't send it right now. 📡 Try again!", 2800);
  };
  w.sending = true;
  const b = $('#mailgo');
  if (b) b.disabled = true;
  const [kind, id] = w.who.to.split(':');
  if (kind === 'p') return done(mailToPhone(id, w));
  if (kind === 'host') {
    try {
      MP.conn.send({ t: 'mail', note: w.note, st: w.st, item: w.item });
      return done(true);
    } catch (e) {
      return done(false);
    }
  }
  if (!CL.ready) return done(false);
  try {
    const ok = await clRpc('send_mail', { p_friend: id, p_item: w.item, p_note: w.note, p_sticker: w.st });
    done(ok ? true : `${esc(w.who.name)}'s mailbox is full right now! Try again tomorrow. 📬`);
  } catch (e) {
    done(/rate_limited/.test(clErr(e)) ? "That's a lot of letters today! Try again tomorrow. 📬" : false);
  }
};
function newLetter(from, c, note, st, item, id) {
  return {
    id: String(id || 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    from: cleanName(from) || 'Friend',
    c: cleanColor(c),
    item: mailable(item) ? item : null,
    note: Number.isInteger(note) && MAIL_NOTES[note] ? note : 0,
    st: Number.isInteger(st) && MAIL_STICKERS[st] ? st : 0,
    at: Date.now(),
    read: false,
    took: false
  };
}
// another player on this phone: straight into their (parked) island
function mailToPhone(id, w) {
  const k = PL_PARK + id + '.' + KEY;
  try {
    const sv = JSON.parse(localStorage.getItem(k));
    if (!sv || typeof sv !== 'object') return false;
    sv.mail = (Array.isArray(sv.mail) ? sv.mail : [])
      .concat(newLetter(S.name, myColor(), w.note, w.st, w.item))
      .slice(-MAIL_MAX);
    localStorage.setItem(k, JSON.stringify(sv));
    return true;
  } catch (e) {
    return false;
  }
}
function gotMail(l) {
  if (S.mail.some(m => m.id === l.id)) return false;
  S.mail.push(l);
  S.mail = S.mail.slice(-MAIL_MAX);
  return true;
}
// the host gets a letter from a visitor on an island-code visit (cloud visitors use the server instead)
function mailFromVisitor(v, d) {
  if (cloudConn(v.conn) || (v.mails | 0) >= 3) return;
  v.mails = (v.mails | 0) + 1;
  gotMail(newLetter(v.name, v.color, d.note, d.st, d.item));
  save();
  SND.ding();
  toast(`📬 ${esc(v.name)} put a letter in your mailbox!`, 3200);
}
// letters best friends sent through the cloud
async function clPullMail() {
  if (!CL.ready || CL.mailing || !S.name || VIS()) return;
  CL.mailing = true;
  let r = null;
  try {
    r = await clRpc('claim_mail');
  } catch (e) {}
  CL.mailing = false;
  if (!Array.isArray(r) || !r.length || VIS()) return;
  let n = 0,
    last = '';
  r.forEach(x => {
    if (!x || !Number.isFinite(+x.id)) return;
    const l = newLetter(x.from, x.c, x.note, x.st, x.item, 'c' + x.id);
    const t = Date.parse(x.at);
    if (Number.isFinite(t)) l.at = t;
    if (gotMail(l)) {
      n++;
      last = l.from;
    }
  });
  if (!n) return;
  save();
  SND.ding();
  toast(n > 1 ? `📬 You've got ${n} letters!` : `📬 You've got mail from ${esc(last)}!`, 3200);
}
