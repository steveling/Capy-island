// "Capy Air" island visits over PeerJS/WebRTC: host, visitor, emotes and the dock menu.
'use strict';

// ---------- MULTIPLAYER: "Capy Air" island visits (PeerJS / WebRTC) ----------
const PEER_OPTS = {
  debug: 0,
  config: {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302'
        ]
      },
      {
        urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
        username: 'peerjs',
        credential: 'peerjsp'
      }
    ],
    sdpSemantics: 'unified-plan'
  }
};
const PEER_PREFIX = 'capyisland-',
  MAX_VIS = 3;
const peerOK = () => typeof window.Peer === 'function';
// a connection over a private cloud channel: the server only opens those between best friends
const cloudConn = c => !!(c && c.cloud);
const OFFLINE_MSG =
  "The seaplane radio isn't working right now. 📡<br>Visiting needs the internet.<br>You can still play on your island! 🏝️";
function genCode() {
  const a = new Uint32Array(5);
  (window.crypto || { getRandomValues: x => x.map(() => Math.random() * 1e9) }).getRandomValues(a);
  return Array.from(a, v => CODE_ABC[v % CODE_ABC.length]).join('');
}
const num = (v, d, lo = -200, hi = 1700) =>
  typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;
const cleanName = v =>
  String(v == null ? '' : v)
    .replace(/[\u0000-\u001f<>&"'`\\]/g, '')
    .trim()
    .slice(0, 12) || 'Friend';
const cleanColor = v => (CAPY[v] ? v : 'caramel');
const cleanStack = v => (Array.isArray(v) ? v.filter(x => x === 'orange' || x === 'yuzu').slice(0, 15) : []);
function cleanIsland(i) {
  i = i || {};
  const furn = x => (placeable(x) ? x : null);
  return {
    name: cleanName(i.name),
    day: num(i.day, 1, 0, 1e6),
    trees: TREES.map((_, k) => Math.round(num(Array.isArray(i.trees) ? i.trees[k] : 3, 3, 0, 3))),
    spring: Array.from({ length: 6 }, (_, k) => furn(Array.isArray(i.spring) ? i.spring[k] : null)),
    yuzu: Math.round(num(i.yuzu, 0, 0, 50)),
    presents: (Array.isArray(i.presents) ? i.presents : [])
      .filter(a => typeof a === 'number' && isFinite(a))
      .slice(0, 6),
    fp: (Array.isArray(i.fp) ? i.fp : [])
      .filter(f => f && typeof f.a === 'number' && isFinite(f.a))
      .slice(0, 12)
      .map(f => ({ a: f.a, c: WRAPS[f.c] ? f.c : 'pink' })),
    mu: Array.isArray(i.mu)
      ? Object.fromEntries(
          i.mu
            .filter(x => typeof x === 'string' && ITEMS[x] && WK.includes(ITEMS[x].k))
            .slice(0, 300)
            .map(x => [x, 1])
        )
      : null,
    garden: Array.from({ length: 8 }, (_, k) => {
      const g = Array.isArray(i.gd) ? i.gd[k] : 0;
      return Array.isArray(g) && (g[0] === 'tulip' || g[0] === 'rose') && FLC.includes(g[1])
        ? { s: g[0], c: g[1], st: Math.round(num(g[2], 0, 0, 3)), w: -1 }
        : null;
    }),
    color: cleanColor(i.color),
    acc: cleanAcc(i.acc),
    craft: CRAFTS[i.craft] ? i.craft : 'pink', // their plane at the dock (js/hangar.js)
    // the inside of their house: only sent to best friends; anything that isn't furniture is dropped
    room: Array.isArray(i.room) ? Array.from({ length: 20 }, (_, k) => furn(i.room[k])) : null,
    // their drawing board, also best friends only: exactly 768 hex digits, or '' for blank
    bd: cleanBoard(i.bd)
  };
}
// what visitors see of my island. Only best friends (cloud connections, and the friends-only cloud copy)
// also get the furniture inside my house (#5); island-code visitors never receive it.
function snapshot(friend) {
  const s = {
    name: S.name,
    day: S.day,
    trees: S.trees.slice(),
    spring: S.spring.slice(),
    yuzu: S.yuzu,
    presents: S.presents.slice(0, 6),
    fp: S.fpresents.slice(0, 12).map(f => ({ a: f.a, c: f.c })),
    mu: Object.keys(S.mu),
    gd: S.garden.map(p => (p ? [p.s, p.c, p.st] : 0)),
    color: myColor(),
    acc: myAcc(),
    craft: myCraft()
  };
  if (friend) {
    s.room = S.room.slice();
    s.bd = S.board || ''; // the drawing board (js/board.js)
  }
  return s;
}
function addPlayer(id, name, color, stack, x, y) {
  const r = {
    id,
    name,
    color,
    stack,
    buf: [],
    x,
    y,
    face: 1,
    walk: 0,
    moving: false,
    soak: false,
    slow: !!(MP.conn && MP.conn.cloud)
  };
  MP.players.set(id, r);
  return r;
}
function rpPush(r, a) {
  if (!r) return;
  r.buf.push({ t: performance.now(), x: a[1], y: a[2], f: a[3] < 0 ? -1 : 1, m: !!a[4], s: !!a[5] });
  if (r.buf.length > 24) r.buf.shift();
}
function rpUpdate(r, dt) {
  const b = r.buf;
  if (!b.length) return;
  const rt = performance.now() - (r.slow ? 260 : 130);
  let s = b[b.length - 1],
    x = s.x,
    y = s.y;
  if (b[0].t >= rt) {
    x = b[0].x;
    y = b[0].y;
    s = b[0];
  } else
    for (let i = b.length - 1; i > 0; i--) {
      if (b[i - 1].t <= rt) {
        const A = b[i - 1],
          B = b[i],
          k = Math.min(1, (rt - A.t) / (B.t - A.t || 1));
        x = A.x + (B.x - A.x) * k;
        y = A.y + (B.y - A.y) * k;
        s = k < 0.5 ? A : B;
        break;
      }
    }
  r.moving = s.m || Math.hypot(x - r.x, y - r.y) > 0.4;
  if (r.moving) r.walk += dt * 12;
  r.x = x;
  r.y = y;
  r.face = s.f;
  r.soak = s.s;
}
// each player's recent emotes, drawn as puffs of emoji smoke (emoSmoke in render.js); several can be in the air
function showEmo(id, i) {
  if (!EMOTE_POOL[i]) return;
  const l = (MP.emo.get(id) || []).filter(m => time - m.t < EMO_LIFE);
  l.push({ e: EMOTE_POOL[i], t: time });
  MP.emo.set(id, l.slice(-4));
  SND.pop();
}
function cleanupPeer() {
  clearTimeout(MP.to);
  clearTimeout(MP.clT);
  if (MP.clLobby) {
    const l = MP.clLobby;
    MP.clLobby = null;
    try {
      CL.sb.removeChannel(l);
    } catch (e) {}
  }
  const c = MP.conn,
    p = MP.peer;
  MP.conn = null;
  MP.peer = null;
  try {
    c && c.close();
  } catch (e) {}
  try {
    p && p.destroy();
  } catch (e) {}
}
function mpUI() {
  const r = MP.role,
    open = r === 'host' && MP.hostState === 'open';
  document.body.classList.toggle('mp', r === 'host' || r === 'visitor');
  $('#bHome').classList.toggle('hidden', r === 'visitor');
  $('#bLeave').classList.toggle('hidden', r !== 'visitor');
  $('#bEmo').classList.toggle('hidden', !(r === 'visitor' || open));
  if (!(r === 'visitor' || open)) $('#emobar').classList.add('hidden');
  const pill = $('#mppill');
  if (r === 'host') {
    pill.classList.remove('hidden');
    pill.innerHTML = open
      ? MP.code
        ? `🛬 Open · <b>${MP.code}</b> · 👥 ${MP.vis.size}`
        : `🛬 Best friends visiting · 👥 ${MP.vis.size}`
      : '🛬 Opening...';
  } else if (r === 'visitor' && MP.island) {
    pill.classList.remove('hidden');
    pill.innerHTML = `✈️ ${esc(MP.island.name)}'s island` + (MP.offline ? ' 💤' : '');
  } else pill.classList.add('hidden');
  hud();
  chatUI();
  befriendTidy();
  if (CL.on) {
    clTrack();
    if (CL.inbox && !VIS()) clApplyInbox();
  }
}
function refreshDock() {
  if (MP.dockOpen && MP.dockView !== 'visit') openDock(MP.dockView, MP.dockArg);
}

// net tick ~12x/sec
function mpUpdate(dt) {
  if (MP.role !== 'visitor' && MP.role !== 'host') return;
  MP.players.forEach(r => rpUpdate(r, dt));
  MP.acc += dt;
  if (MP.acc < 1 / 12) return;
  MP.acc = 0;
  const now = performance.now(),
    me = [Math.round(P.x), Math.round(P.y), P.face, P.moving ? 1 : 0, P.soak ? 1 : 0];
  if (MP.role === 'visitor') {
    if (MP.offline) return;
    if (MP.conn && MP.conn.open)
      try {
        MP.conn.send({ t: 'p', x: me[0], y: me[1], f: me[2], m: me[3], s: me[4] });
      } catch (e) {}
    if (now - MP.lastRx > 12000) returnHome('lost');
    return;
  }
  if (!MP.vis.size) return;
  const all = [['host', ...me]];
  MP.vis.forEach(v => {
    if (v.last) all.push(v.last);
  });
  const nb = NEIGH.map(n => [Math.round(n.x), Math.round(n.y), n.face, n.soak ? 1 : 0]);
  let isl = null,
    islF = null;
  if (MP.dirty && now - MP.islT > 800) {
    MP.dirty = false;
    MP.islT = now;
    const s = snapshot(true),
      j = JSON.stringify(s);
    if (j !== MP.islJ) {
      MP.islJ = j;
      islF = s;
      isl = snapshot();
    }
  }
  MP.vis.forEach(v => {
    if (now - v.lastRx > 15000) {
      dropVisitor(v.id, 'lost');
      return;
    }
    if (!v.conn.open) return;
    try {
      v.conn.send({ t: 'ps', l: all.filter(a => a[0] !== v.id), nb });
      if (isl) v.conn.send({ t: 'isl', isl: cloudConn(v.conn) ? islF : isl });
    } catch (e) {}
  });
}

// ----- HOST -----
function broadcast(m, except) {
  MP.vis.forEach(v => {
    if (v.id !== except && v.conn.open)
      try {
        v.conn.send(m);
      } catch (e) {}
  });
}
window.openIsland = () => {
  if (!netOK()) {
    dockMsg(OFFLINE_MSG);
    return;
  }
  const up = MP.role === 'host' && MP.dropin;
  if (MP.role && !up) return;
  if (!up) {
    MP.role = 'host';
    MP.vis.clear();
    MP.players.clear();
    MP.emo.clear();
    MP.islJ = '';
  }
  MP.hostState = 'opening';
  MP.dropin = false;
  MP.tries = 0;
  if (CL.ready) clHostOpen();
  else hostStart();
  mpUI();
  openDock();
};
// Each island keeps one code (saved with it), so friends can use the same code every time. If the code is
// taken, it's usually this island's own last session still letting go of it: wait and try the same code
// again. Only if it stays taken does the island get a new code (saved, so it's the new one from then on).
function hostStart(fresh) {
  if (fresh || !S.code) {
    S.code = genCode();
    save();
  }
  MP.code = S.code;
  let p;
  try {
    p = new Peer(PEER_PREFIX + MP.code, PEER_OPTS);
  } catch (e) {
    hostFail();
    return;
  }
  MP.peer = p;
  MP.to = setTimeout(() => {
    if (MP.peer === p && MP.hostState === 'opening') hostFail();
  }, 20000);
  p.on('open', () => {
    if (MP.peer !== p) return;
    clearTimeout(MP.to);
    MP.hostState = 'open';
    mpUI();
    refreshDock();
    SND.whoosh();
    if (!MP.dockOpen) toast(`Your island is open! ✈️<br>Code: <b>${MP.code}</b>`, 3500);
  });
  p.on('connection', c => {
    if (MP.peer === p) hostConn(c);
    else
      try {
        c.close();
      } catch (e) {}
  });
  p.on('error', e => {
    if (MP.peer !== p) return;
    const t = e && e.type;
    if (t === 'unavailable-id') {
      MP.peer = null;
      try {
        p.destroy();
      } catch (x) {}
      clearTimeout(MP.to);
      const again = MP.tries++ < 4; // the same code, a few seconds apart, then a new one
      if (!again && MP.tries > 6) return hostFail();
      MP.to = setTimeout(
        () => {
          if (MP.role === 'host' && MP.hostState === 'opening' && !MP.peer) hostStart(!again);
        },
        again ? 2500 : 0
      );
      refreshDock();
      return;
    }
    if (MP.hostState === 'opening') hostFail();
  });
  p.on('disconnected', () => {
    setTimeout(() => {
      try {
        if (MP.peer === p && !p.destroyed && p.disconnected) p.reconnect();
      } catch (e) {}
    }, 2000);
  });
}
function hostFail() {
  cleanupPeer();
  MP.role = null;
  MP.hostState = null;
  MP.code = null;
  mpUI();
  dockMsg("The seaplane tower can't open right now. 📡<br>Check the internet and try again!");
}
function hostConn(conn) {
  let v = null;
  conn.on('data', d => {
    if (!d || typeof d !== 'object' || MP.role !== 'host') return;
    if (d.t === 'hello' && !v) {
      if (MP.vis.size >= MAX_VIS) {
        try {
          conn.send({ t: 'full' });
        } catch (e) {}
        setTimeout(() => {
          try {
            conn.close();
          } catch (e) {}
        }, 600);
        return;
      }
      v = {
        id: String(conn.peer),
        conn,
        name: cleanName(d.name),
        color: cleanColor(d.color),
        acc: cleanAcc(d.acc),
        stack: cleanStack(d.stack),
        lastRx: performance.now(),
        signed: false,
        gave: false,
        last: null
      };
      v.last = [v.id, DOCK.x, DOCK.y, 1, 0, 0];
      MP.vis.set(v.id, v);
      const r = addPlayer(v.id, v.name, v.color, v.stack, DOCK.x, DOCK.y);
      r.slow = !!conn.cloud;
      rpPush(r, v.last);
      r.acc = v.acc;
      const pl = [
        {
          id: 'host',
          name: S.name,
          color: myColor(),
          acc: myAcc(),
          stack: S.stack.slice(0, 15),
          x: Math.round(P.x),
          y: Math.round(P.y)
        }
      ];
      MP.vis.forEach(o => {
        if (o !== v)
          pl.push({
            id: o.id,
            name: o.name,
            color: o.color,
            acc: o.acc,
            stack: o.stack,
            x: o.last[1],
            y: o.last[2]
          });
      });
      try {
        conn.send({
          t: 'snap',
          me: v.id,
          isl: snapshot(cloudConn(conn)),
          pl,
          nb: NEIGH.map(n => [Math.round(n.x), Math.round(n.y), n.face, n.soak ? 1 : 0])
        });
      } catch (e) {}
      broadcast(
        {
          t: 'join',
          id: v.id,
          name: v.name,
          color: v.color,
          acc: v.acc,
          stack: v.stack,
          x: DOCK.x,
          y: DOCK.y
        },
        v.id
      );
      toast(`🛬 ${esc(v.name)} flew in to visit! 💕`, 3000);
      SND.whoosh();
      mpUI();
      refreshDock();
      return;
    }
    if (!v || !MP.vis.has(v.id)) return;
    v.lastRx = performance.now();
    if (d.t === 'p') {
      v.last = [
        v.id,
        Math.round(num(d.x, v.last[1])),
        Math.round(num(d.y, v.last[2])),
        d.f < 0 ? -1 : 1,
        d.m ? 1 : 0,
        d.s ? 1 : 0
      ];
      rpPush(MP.players.get(v.id), v.last);
    } else if (d.t === 'emo') {
      const i = d.e | 0;
      if (!EMOTE_POOL[i] || time - (v.emoT || -9) < 0.5) return;
      v.emoT = time;
      showEmo(v.id, i);
      broadcast({ t: 'emo', id: v.id, e: i }, v.id);
    } else if (d.t === 'sign') {
      const i = d.s | 0;
      if (v.signed || !STAMPS[i]) return;
      v.signed = true;
      S.guestbook.push({ n: v.name, c: v.color, s: STAMPS[i], d: todayKey() });
      S.guestbook = S.guestbook.slice(-50);
      save();
      try {
        conn.send({ t: 'ok', k: 'sign' });
      } catch (e) {}
      toast(`📝 ${esc(v.name)} signed your guestbook! ${STAMPS[i]}`, 3000);
      refreshDock();
    } else if (d.t === 'gift') {
      if (v.gave || !WRAPS[d.c]) return;
      v.gave = true;
      if (S.giftsPending.length < 20) {
        S.giftsPending.push({ from: v.name, c: d.c, item: pick(GIFT_POOL) });
        save();
      }
      try {
        conn.send({ t: 'ok', k: 'gift' });
      } catch (e) {}
      toast(`🎁 ${esc(v.name)} left you a present!<br>It will be on your beach tomorrow.`, 3500);
    } else if (d.t === 'chat') chatFromVisitor(v, d);
    else if (d.t === 'freq' || d.t === 'fres') befriendRelay(v, d);
    else if (d.t === 'bye') dropVisitor(v.id, 'left');
  });
  conn.on('close', () => {
    if (v) dropVisitor(v.id, 'left');
  });
  conn.on('error', () => {
    if (v) dropVisitor(v.id, 'left');
  });
}
function dropVisitor(id, why) {
  const v = MP.vis.get(id);
  if (!v) return;
  MP.vis.delete(id);
  MP.players.delete(id);
  MP.emo.delete(id);
  if (why === 'home') {
    try {
      v.conn.send({ t: 'home' });
    } catch (e) {}
    setTimeout(() => {
      try {
        v.conn.close();
      } catch (e) {}
    }, 800);
  } else
    try {
      v.conn.close();
    } catch (e) {}
  broadcast({ t: 'left', id });
  toast(why === 'home' ? `👋 ${esc(v.name)} is flying home.` : `🛫 ${esc(v.name)} flew home. Bye bye!`, 2500);
  clDropinEnd();
  mpUI();
  refreshDock();
}
window.sendHome = id => dropVisitor(id, 'home');
window.closeIsland = () => {
  if (MP.role !== 'host') return;
  broadcast({ t: 'closed' });
  const p = MP.peer,
    vs = [...MP.vis.values()];
  MP.peer = null;
  MP.conn = null;
  clearTimeout(MP.to);
  setTimeout(() => {
    vs.forEach(v => {
      try {
        v.conn.close();
      } catch (e) {}
    });
    try {
      p && p.destroy();
    } catch (e) {}
  }, 500); // destroying the Peer frees the code: it stops working
  const wasDrop = MP.dropin,
    hadCode = MP.code;
  MP.vis.clear();
  MP.players.clear();
  MP.emo.clear();
  MP.role = null;
  MP.hostState = null;
  MP.code = null;
  MP.dropin = false;
  if (CL.on) clHostClosed(hadCode);
  mpUI();
  toast(wasDrop ? 'Everyone flew home. 👋' : 'Your island is closed. 🔒');
  refreshDock();
};
window.shareCode = () => {
  const code = MP.code;
  if (!code) return;
  const text = `Come visit my Capy Island! 🏝️ My island code is ${code}`,
    url = location.origin + location.pathname + '?visit=' + code;
  if (navigator.share) navigator.share({ title: 'Capy Island', text, url }).catch(() => {});
  else copyCode();
};
window.copyCode = () => {
  const t = MP.code;
  if (!t) return;
  const ok = () => toast('Copied! 📋 ' + t),
    no = () => toast('Your island code is <b>' + t + '</b>', 3500);
  try {
    navigator.clipboard.writeText(t).then(ok, no);
  } catch (e) {
    no();
  }
};

// ----- VISITOR -----
window.visitFriend = code => {
  code = String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5 || [...code].some(ch => !CODE_ABC.includes(ch))) {
    toast('Island codes have 5 letters and numbers. 🏝️');
    return;
  }
  if (!netOK()) {
    dockMsg(OFFLINE_MSG);
    return;
  }
  if (MP.role) {
    toast(MP.role === 'host' ? 'Close your island first! 🔒' : 'Already flying! ✈️');
    return;
  }
  save();
  MP.role = 'connecting';
  MP.code = code;
  MP.newFriend = null;
  modal(
    `<h2>✈️ Flying...</h2><div style="text-align:center;font-size:64px"><div class="fly">${CRAFTS[myCraft()].e}</div></div><p class="c" style="font-size:18px">Flying to island <b>${code}</b>...</p><div class="row"><button class="btn white" onclick="cancelVisit()">Cancel</button></div>`
  );
  if (CL.ready) {
    clTrack();
    clVisitByCode(code);
  } else peerVisit(code);
};
function peerVisit(code) {
  let p;
  try {
    p = new Peer(PEER_OPTS);
  } catch (e) {
    visitFail('net');
    return;
  }
  MP.peer = p;
  MP.to = setTimeout(() => visitFail(MP.conn ? 'nolink' : 'net'), 20000);
  p.on('open', () => {
    if (MP.peer !== p || MP.role !== 'connecting') return;
    const c = p.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
    MP.conn = c;
    c.on('open', () => {
      try {
        c.send({
          t: 'hello',
          v: 1,
          name: S.name || 'Friend',
          color: myColor(),
          acc: myAcc(),
          stack: S.stack.slice(0, 15)
        });
      } catch (e) {}
    });
    c.on('data', d => {
      if (MP.conn === c) visitorData(d);
    });
    setTimeout(() => {
      const pc = c.peerConnection;
      if (pc)
        pc.addEventListener('iceconnectionstatechange', () => {
          if (pc.iceConnectionState === 'failed' && MP.conn === c && MP.role === 'connecting')
            visitFail('nolink');
        });
    }, 0);
    c.on('close', () => {
      if (MP.conn !== c) return;
      if (MP.role === 'visitor') returnHome('lost');
      else if (MP.role === 'connecting') visitFail('notfound');
    });
    c.on('error', () => {});
  });
  p.on('error', e => {
    if (MP.peer !== p) return;
    const t = e && e.type;
    if (MP.role === 'connecting') visitFail(t === 'peer-unavailable' ? 'notfound' : 'net');
  });
  p.on('disconnected', () => {});
} // losing the broker after connecting is fine; the data channel is direct
window.cancelVisit = () => {
  if (MP.role !== 'connecting') return;
  cleanupPeer();
  MP.role = null;
  closeModal();
  if (CL.on) clTrack();
};
function visitFail(k) {
  if (MP.role !== 'connecting') return;
  cleanupPeer();
  MP.role = null;
  mpUI();
  const m =
    {
      notfound: "Hmm, we couldn't find that island. 🏝️<br>Check the code and try again!",
      full: 'That island is full right now (3 visitors). 🛬<br>Try again a little later!',
      net: "The seaplane can't fly right now. 📡<br>Check the internet and try again!",
      nolink:
        "We found the island, but the seaplane couldn't land. 📡<br>Try again, or ask a grown-up to put both phones on the same Wi-Fi.",
      notfriend: "Hmm, you two aren't best friends anymore. 🏝️<br>Ask your friend for their island code!",
      slow: 'Too many tries! 🐢<br>Wait a little and try again.',
      own: "That's your own island code! 🏝️<br>Give it to a friend so they can visit you.",
      many: "Wow, that's a lot of best friends! 💕<br>Remove one before adding a new one."
    }[k] || 'Oops!';
  modal(
    `<h2>✈️ Oh no!</h2><p class="c" style="font-size:18px">${m}</p><div class="row"><button class="btn" onclick="openDock('visit')">Try again</button><button class="btn white" onclick="closeModal()">OK</button></div>`
  );
}
function visitorData(d) {
  if (!d || typeof d !== 'object') return;
  MP.lastRx = performance.now();
  if (MP.role === 'connecting') {
    if (d.t === 'snap') enterVisit(d);
    else if (d.t === 'full') visitFail('full');
    return;
  }
  if (MP.role !== 'visitor') return;
  switch (d.t) {
    case 'ps':
      if (Array.isArray(d.l))
        d.l.forEach(a => {
          if (!Array.isArray(a) || a[0] === MP.me) return;
          const r = MP.players.get(String(a[0]));
          if (r) rpPush(r, [a[0], num(a[1], r.x), num(a[2], r.y), a[3], a[4], a[5]]);
        });
      applyNb(d.nb);
      break;
    case 'look': {
      const r = MP.players.get(String(d.id));
      if (r) {
        r.color = cleanColor(d.color);
        r.acc = cleanAcc(d.acc);
      }
      break;
    }
    case 'join':
      if (d.id && d.id !== MP.me && !MP.players.has(String(d.id))) {
        const r = addPlayer(
          String(d.id),
          cleanName(d.name),
          cleanColor(d.color),
          cleanStack(d.stack),
          num(d.x, DOCK.x),
          num(d.y, DOCK.y)
        );
        r.acc = cleanAcc(d.acc);
        rpPush(r, [r.id, r.x, r.y, 1, 0, 0]);
        toast(`🛬 ${esc(r.name)} came to visit too!`);
      }
      break;
    case 'left': {
      const r = MP.players.get(String(d.id));
      if (r) {
        MP.players.delete(r.id);
        MP.emo.delete(r.id);
        toast(`🛫 ${esc(r.name)} flew home.`);
      }
      break;
    }
    case 'emo':
      if (MP.players.has(String(d.id))) showEmo(String(d.id), d.e | 0);
      break;
    case 'isl':
      MP.island = cleanIsland(d.isl);
      if (!$('#house').classList.contains('hidden')) drawRoom();
      break;
    case 'chat':
      chatFromHost(d);
      break;
    case 'freq':
      befriendIncoming(d);
      break;
    case 'fres':
      befriendResult(d);
      break;
    case 'ok':
      if (d.k === 'sign') toast(`📝 You signed ${hostName()}'s guestbook! 💕`, 2600);
      else if (d.k === 'gift') toast(`🎁 Your present will be on ${hostName()}'s beach tomorrow!`, 3200);
      break;
    case 'home':
      returnHome('home');
      break;
    case 'closed':
      returnHome('closed');
      break;
  }
}
function applyNb(nb) {
  if (!Array.isArray(nb)) return;
  NEIGH.forEach((n, i) => {
    const a = nb[i];
    if (!Array.isArray(a)) return;
    n.tx = num(a[0], n.x);
    n.ty = num(a[1], n.y);
    n.face = a[2] < 0 ? -1 : 1;
    n.soak = !!a[3];
  });
}
function enterVisit(d) {
  clearTimeout(MP.to);
  MP.role = 'visitor';
  MP.me = String(d.me || '');
  MP.island = cleanIsland(d.isl);
  MP.signed = false;
  MP.gave = false;
  MP.lastRx = performance.now();
  MP.players.clear();
  MP.emo.clear();
  (Array.isArray(d.pl) ? d.pl : []).forEach(p => {
    if (p && p.id && String(p.id) !== MP.me) {
      const r = addPlayer(
        String(p.id),
        cleanName(p.name),
        p.id === 'host' && !CAPY[p.color] ? 'pink' : cleanColor(p.color),
        cleanStack(p.stack),
        num(p.x, 700),
        num(p.y, 600)
      );
      r.acc = cleanAcc(p.acc);
      rpPush(r, [r.id, r.x, r.y, 1, 0, 0]);
    }
  });
  MP.savedBugs = bugs;
  bugs = [];
  parts = [];
  fishStop();
  $('#fish').classList.add('hidden');
  $('#house').classList.add('hidden');
  $('#museum').classList.add('hidden');
  document.body.classList.remove('inmus');
  closeModal();
  closeTalk();
  busy = false;
  P.soak = false;
  P.act = null;
  P.x = P.tx = DOCK.x + rnd(-24, 24);
  P.y = P.ty = DOCK.y - 6;
  P.face = 1;
  cam.x = P.x;
  cam.y = P.y - 40;
  applyNb(d.nb);
  NEIGH.forEach(n => {
    n.x = n.tx;
    n.y = n.ty;
  });
  if (MP.clLobby) {
    const l = MP.clLobby;
    MP.clLobby = null;
    try {
      CL.sb.removeChannel(l);
    } catch (e) {}
  }
  mpUI();
  SND.whoosh();
  toast(`✈️ Welcome to ${hostName()}'s island!`, 3000);
  if (MP.newFriend) {
    const nf = MP.newFriend;
    MP.newFriend = null;
    setTimeout(() => {
      if (MP.role === 'visitor') toast(`💕 ${esc(nf)} is now one of your best friends!`, 3000);
    }, 3200);
  }
}
window.leaveIsland = () => {
  if (MP.role !== 'visitor') return;
  try {
    MP.conn && MP.conn.open && MP.conn.send({ t: 'bye' });
  } catch (e) {}
  const c = MP.conn,
    p = MP.peer;
  MP.conn = null;
  MP.peer = null;
  setTimeout(() => {
    try {
      c && c.close();
    } catch (e) {}
    try {
      p && p.destroy();
    } catch (e) {}
  }, 300);
  returnHome('leave');
};
function returnHome(reason) {
  if (MP.role !== 'visitor') return;
  cleanupPeer();
  MP.role = null;
  MP.island = null;
  MP.offline = false;
  MP.friend = null;
  NEIGH.forEach(n => (n.hi = false));
  MP.players.clear();
  MP.emo.clear();
  MP.me = null;
  closeTalk();
  closeModal();
  $('#museum').classList.add('hidden');
  document.body.classList.remove('inmus');
  $('#house').classList.add('hidden');
  $('#emobar').classList.add('hidden');
  P.soak = false;
  P.act = null;
  P.x = P.tx = S.x;
  P.y = P.ty = S.y;
  cam.x = P.x;
  cam.y = P.y - 40;
  bugs = MP.savedBugs || [];
  MP.savedBugs = null;
  NEIGH.forEach(n => {
    n.x = n.tx = n.hx;
    n.y = n.ty = n.hy;
    n.soak = false;
    n.wait = rnd(1, 3);
  });
  mpUI();
  const msg = {
    home: 'Time to fly home! ✈️<br>Thanks for visiting!',
    closed: 'Your friend closed their island.<br>Time to fly home! ✈️',
    lost: 'Oops! The seaplane lost its way. 📡<br>Flying home...'
  }[reason];
  if (msg)
    modal(
      `<h2>🏝️ Back home</h2><div style="text-align:center;font-size:56px">🛩️</div><p class="c" style="font-size:18px">${msg}</p><div class="row"><button class="btn" onclick="closeModal()">OK</button></div>`
    );
  else toast(`Welcome home, ${esc(S.name)}! 🏝️`);
  if (S.name && newDay()) {
    hud();
    setTimeout(
      () => toast(`Good morning, ${esc(S.name)}! 🌞 A new day on Capy Island!`, 3500),
      msg ? 100 : 2400
    );
  }
}
window.mpSign = i => {
  if (MP.role !== 'visitor' || MP.signed || !STAMPS[i]) return;
  MP.signed = true;
  if (MP.offline) clOfflineSign(i);
  else
    try {
      MP.conn.send({ t: 'sign', s: i });
    } catch (e) {}
  SND.stamp();
  openDock();
};
window.mpGift = c => {
  if (MP.role !== 'visitor' || MP.gave || !WRAPS[c]) return;
  MP.gave = true;
  if (MP.offline) clOfflineGift(c);
  else
    try {
      MP.conn.send({ t: 'gift', c });
    } catch (e) {}
  SND.present();
  burst(P.x, P.y - 60, '🎁', 5);
  openDock();
};

// ----- emotes: each player picks which 6 emojis go in their quick bar -----
function emoBarUI() {
  $('#emobar').innerHTML =
    S.emotes.map((i, slot) => `<button onclick="doEmote(${slot})">${EMOTE_POOL[i]}</button>`).join('') +
    '<button class="edit" onclick="openEmotes()" aria-label="Change my emotes">✏️</button>';
}
emoBarUI();
window.doEmote = slot => {
  $('#emobar').classList.add('hidden');
  const i = S.emotes[slot];
  if (!EMOTE_POOL[i] || time - MP.emoT < 0.5) return;
  MP.emoT = time;
  showEmo('me', i);
  if (MP.role === 'visitor') {
    try {
      MP.conn.send({ t: 'emo', e: i });
    } catch (e) {}
  } else if (MP.role === 'host') broadcast({ t: 'emo', id: 'host', e: i });
};
// the emote picker: tap a slot, then tap an emoji to put there (an emoji already in another slot swaps places)
let emoSlot = 0,
  emoBack = null;
window.openEmotes = back => {
  $('#emobar').classList.add('hidden');
  closeTalk();
  if (back !== undefined) {
    emoBack = back;
    emoSlot = 0;
  }
  modal(
    `<h2>😊 My emotes</h2><p class="c" style="font-size:15px">Tap a spot, then pick an emoji to put there!</p>` +
      `<div class="emoslots">${S.emotes.map((i, k) => `<button class="${k === emoSlot ? 'on' : ''}" onclick="emoPickSlot(${k})" aria-label="Spot ${k + 1}: ${EMOTE_POOL[i]}">${EMOTE_POOL[i]}</button>`).join('')}</div>` +
      `<div class="emopool">${EMOTE_POOL.map((e, i) => `<button class="${S.emotes.includes(i) ? 'used' : ''}" onclick="emoPut(${i})" aria-label="${e}">${e}</button>`).join('')}</div>` +
      `<div class="row"><button class="btn white" onclick="emoReset()">Start over</button><button class="btn" onclick="emoDone()">Done 💕</button></div>`
  );
};
window.emoPickSlot = k => {
  emoSlot = k;
  openEmotes();
};
window.emoPut = i => {
  if (!EMOTE_POOL[i]) return;
  const other = S.emotes.indexOf(i);
  if (other >= 0) S.emotes[other] = S.emotes[emoSlot];
  S.emotes[emoSlot] = i;
  emoSlot = (emoSlot + 1) % EMOTE_SLOTS;
  SND.pop();
  save();
  emoBarUI();
  openEmotes();
};
window.emoReset = () => {
  S.emotes = newSave().emotes;
  emoSlot = 0;
  save();
  emoBarUI();
  openEmotes();
};
window.emoDone = () => {
  const back = emoBack;
  emoBack = null;
  if (back === 'mirror') openMirror();
  else closeModal();
};
$('#bEmo').onclick = () => {
  if (busy) return;
  closeTalk();
  chatClose();
  $('#emobar').classList.toggle('hidden');
};
$('#bLeave').onclick = () => {
  if (MP.role === 'visitor') openDock();
};
$('#mppill').onclick = () => {
  if (!busy) openDock();
};

// ----- the Capy Air menu -----
function dockMsg(m) {
  modal(
    `<h2>✈️ Capy Air</h2><p class="c" style="font-size:18px">${m}</p><div class="row"><button class="btn" onclick="closeModal()">OK</button></div>`
  );
}
window.setVColor = c => {
  if (!CAPY[c] || VIS()) return;
  setLook(c, null);
};
window.openDock = (view, prefill) => {
  view = view || 'main';
  let h = '<h2>✈️ Capy Air</h2>';
  const hn = hostName();
  MP.dockArg = prefill === undefined ? null : prefill;
  if (view === 'hangar' && !VIS()) h += hangarHtml();
  else if (view === 'guestbook') {
    const gb = S.guestbook;
    h +=
      `<h3>📝 My Guestbook</h3>` +
      (gb.length
        ? '<div class="list">' +
          gb
            .slice()
            .reverse()
            .map(
              g =>
                `<div class="li"><span class="e">${esc(g.s)}</span><span class="t"><span class="dot" style="background:${(CAPY[g.c] || CAPY.caramel).b}"></span>${esc(g.n)}<small>visited on ${esc(g.d)}</small></span></div>`
            )
            .join('') +
          '</div>'
        : '<p class="note">No visitors yet!<br>Open your island and share your code with a friend. ✈️</p>') +
      `<div class="row"><button class="btn white" onclick="openDock()">Back</button><button class="btn" onclick="closeModal()">Close</button></div>`;
  } else if (view === 'friends' && CL.on && !MP.role) {
    const fr = CL.friends;
    h +=
      `<h3>💕 Best friends</h3>` +
      (CL.ready ? '' : `<p class="note">${CL.status === 'loading' ? '☁️ Connecting...' : OFFLINE_MSG}</p>`) +
      (fr.length
        ? '<div class="list">' +
          fr
            .map(
              f =>
                `<div class="li"><span class="t"><span class="dot" style="background:${CAPY[f.color].b}"></span>${esc(f.name)}<small>${friendSeen(f)}</small></span><button class="btn" ${CL.ready ? '' : 'disabled'} onclick="flyToFriend('${f.id}')">Fly ✈️</button><button class="btn white" aria-label="Remove friend" onclick="openDock('unfriend','${f.id}')">✖</button></div>`
            )
            .join('') +
          '</div>'
        : '<p class="note">No best friends yet!<br>When you visit a friend with their island code, you become best friends. 💕</p>') +
      `<div class="row"><button class="btn white" onclick="openDock()">Back</button><button class="btn" onclick="closeModal()">Close</button></div>`;
    if (CL.ready && Date.now() - CL.frT > 5000) {
      const before = JSON.stringify(CL.friends);
      CL.frT = Date.now();
      clFriendsRefresh().then(() => {
        if (MP.dockOpen && MP.dockView === 'friends' && JSON.stringify(CL.friends) !== before)
          openDock('friends');
      });
    }
  } else if (view === 'unfriend' && CL.on && !MP.role) {
    const f = CL.friends.find(x => x.id === prefill);
    if (!f) return openDock('friends');
    h += `<p class="c" style="font-size:18px">Remove <b>${esc(f.name)}</b> from your best friends?</p><p class="c" style="font-size:14px">You won't be able to fly to each other's islands until you visit with an island code again.</p><div class="row"><button class="btn" onclick="clUnfriend('${f.id}')">Yes, remove</button><button class="btn white" onclick="openDock('friends')">No, keep</button></div>`;
  } else if (MP.role === 'visitor') {
    if (view === 'stamp')
      h += `<p class="c">Pick a stamp for ${hn}'s guestbook!</p><div class="grid" style="grid-template-columns:repeat(3,1fr)">${STAMPS.map((s, i) => `<div class="cell" style="font-size:44px" onclick="mpSign(${i})">${s}</div>`).join('')}</div><div class="row"><button class="btn white" onclick="openDock()">Back</button></div>`;
    else if (view === 'wrap')
      h += `<p class="c">Pick a wrapping color! 🎀<br><small>A surprise will be inside. It will be on ${hn}'s beach tomorrow.</small></p><div class="grid" style="grid-template-columns:repeat(3,1fr)">${Object.keys(
        WRAPS
      )
        .map(
          k =>
            `<div class="cell" style="background:${WRAPS[k]};border-color:#fff;font-size:34px" onclick="mpGift('${k}')">🎀</div>`
        )
        .join('')}</div><div class="row"><button class="btn white" onclick="openDock()">Back</button></div>`;
    else
      h += `<p class="c">You're visiting <b>${hn}</b>'s island! 🏝️</p>${MP.offline ? `<p class="note" style="margin-top:0">💤 ${hn} isn't playing right now. Your stamp and present will be waiting for them!</p>` : ''}<button class="btn big" ${MP.signed ? 'disabled' : ''} onclick="openDock('stamp')">${MP.signed ? 'Guestbook signed ✓' : 'Sign the guestbook 📝'}</button><button class="btn big" ${MP.gave ? 'disabled' : ''} onclick="openDock('wrap')">${MP.gave ? 'Present left ✓' : 'Leave a present 🎁'}</button>${befriendDockHtml()}<button class="btn big white" onclick="leaveIsland()">Fly home ✈️</button><div class="row"><button class="btn white" onclick="closeModal()">Keep playing</button></div>`;
  } else if (view === 'visit') {
    if (MP.role === 'host') {
      view = 'main';
      return openDock();
    }
    h +=
      `<p class="c">Type your friend's island code:</p><input class="code" id="vcode" maxlength="5" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" placeholder="?????" value="${esc(prefill || '')}"><p class="c" style="font-size:14px">You'll fly there as <span class="dot" style="background:${CAPY[myColor()].b}"></span>${esc(S.name)}</p>` +
      (netOK() ? '' : `<p class="note">${OFFLINE_MSG}</p>`) +
      `<div class="row"><button class="btn" id="vgo" style="font-size:22px" onclick="visitFriend(document.getElementById('vcode').value)" ${netOK() ? '' : 'disabled'}>Fly! ✈️</button><button class="btn white" onclick="openDock()">Back</button></div>`;
  } else if (MP.role === 'host') {
    if (MP.hostState !== 'open')
      h += `<p class="c" style="font-size:18px">Opening your island...</p><div style="text-align:center;font-size:56px"><div class="fly">🛬</div></div><div class="row"><button class="btn white" onclick="closeIsland()">Cancel</button></div>`;
    else {
      h +=
        (MP.code
          ? `<p class="c">Your island is open! 🏝️ Tell your friend this code:</p><div class="code">${MP.code}</div><div class="row"><button class="btn" onclick="copyCode()">Copy 📋</button>${navigator.share ? '<button class="btn" onclick="shareCode()">Share 💌</button>' : ''}</div>`
          : `<p class="c">Your best friends flew in to visit! 🏝️</p><button class="btn big" onclick="openIsland()">Get an island code 🔑</button>`) +
        `
   <h3>Visitors (${MP.vis.size}/${MAX_VIS})</h3>` +
        (MP.vis.size
          ? '<div class="list">' +
            [...MP.vis.values()]
              .map(
                v =>
                  `<div class="li"><span class="t"><span class="dot" style="background:${CAPY[v.color].b}"></span>${esc(v.name)}</span><button class="btn white" onclick="sendHome('${esc(v.id)}')">Send home 🏠</button></div>`
              )
              .join('') +
            '</div>'
          : '<p class="note" style="margin-top:0">Waiting for friends to fly in... ✈️</p>') +
        `<div class="row"><button class="btn white" onclick="openDock('guestbook')">📝 Guestbook (${S.guestbook.length})</button><button class="btn white" onclick="closeIsland()">${MP.code ? 'Close my island 🔒' : 'Send everyone home 🏠'}</button></div><div class="row"><button class="btn" onclick="closeModal()">Keep playing</button></div>`;
    }
  } else {
    h +=
      `<p class="c">Visit a friend's island, or invite friends to yours!</p>` +
      (netOK() ? '' : `<p class="note">${OFFLINE_MSG}</p>`) +
      `<button class="btn big" ${netOK() ? '' : 'disabled'} onclick="openIsland()">Open my island 🏝️</button><button class="btn big" ${netOK() ? '' : 'disabled'} onclick="openDock('visit')">Visit a friend ✈️</button>${CL.on ? `<button class="btn big" onclick="openDock('friends')">💕 Best friends${CL.friends.length ? ' (' + CL.friends.length + ')' : ''}</button>` : ''}
  <h3>My color</h3><div class="sws">${COLOR_ORDER.map(k => `<button class="sw ${myColor() === k ? 'on' : ''}" title="${CAPY[k].n}" style="background:${CAPY[k].b}" onclick="setVColor('${k}')"></button>`).join('')}</div><p class="c" style="font-size:13px;margin:6px 0 0">You're a ${CAPY[myColor()].n.toLowerCase()} capybara, at home and when you visit! 🪞 More looks at the mirror in your house.</p>
  <div class="row"><button class="btn white" onclick="openDock('guestbook')">📝 Guestbook (${S.guestbook.length})</button><button class="btn white" onclick="openDock('hangar')">🛠️ My planes</button></div><div class="row"><button class="btn white" onclick="closeModal()">Bye! 👋</button></div>`;
  }
  modal(h);
  MP.dockOpen = true;
  MP.dockView = view;
  if (view === 'hangar') hangarStart();
  const inp = $('#vcode');
  if (inp) {
    inp.oninput = () => {
      const v = inp.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .split('')
        .filter(ch => CODE_ABC.includes(ch))
        .join('')
        .slice(0, 5);
      if (v !== inp.value) inp.value = v;
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter') visitFriend(inp.value);
    };
    setTimeout(() => {
      try {
        inp.focus();
      } catch (e) {}
    }, 50);
  }
};
