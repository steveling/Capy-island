// Supabase cloud save, best friends and live visits over Realtime (inert without config).
'use strict';

// ---------- CLOUD: Supabase save, best friends, live visits over Realtime ----------
// Everything below is inert when SUPABASE_URL / SUPABASE_ANON_KEY are empty (CL.on === false).
const SBJS_SRC = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js',
  'https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'
];
const SBJS_SRI = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function clMetaSave() {
  if (!CL.on || restoring) return;
  try {
    localStorage.setItem(CMETA, JSON.stringify(CL.meta));
  } catch (e) {}
}
function clMetaSet(o) {
  Object.assign(CL.meta, o);
  try {
    localStorage.setItem(CMETA, JSON.stringify(CL.meta));
  } catch (e) {}
}
function clLoad() {
  return new Promise((res, rej) => {
    let i = 0;
    const next = () => {
      if (window.supabase && window.supabase.createClient) return res();
      if (i >= SBJS_SRC.length) return rej(new Error('supabase-js could not load'));
      const s = document.createElement('script');
      s.src = SBJS_SRC[i++];
      s.integrity = SBJS_SRI;
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = next;
      s.onerror = () => {
        s.remove();
        next();
      };
      document.head.appendChild(s);
    };
    next();
  });
}
async function clRpc(fn, args) {
  const r = await CL.sb.rpc(fn, args || {});
  if (r.error) {
    const e = new Error(r.error.message || fn);
    e.code = r.error.code;
    throw e;
  }
  return r.data;
}
const clErr = e => String((e && e.message) || e || '');

// called from save() whenever the island really changed (position ignored)
function clOnSave() {
  if (!S.name || CL.status === 'moved') return;
  const h = clHashS();
  if (h === CL.hash) return;
  CL.hash = h;
  CL.meta.localTs = Date.now();
  CL.meta.dirty = true;
  clMetaSave();
  clSchedule();
}
function clSchedule() {
  if (!CL.ready) return;
  const now = Date.now();
  if (!CL.firstDirty) CL.firstDirty = now;
  clearTimeout(CL.upT);
  CL.upT = setTimeout(() => clUpload(), Math.max(0, Math.min(4000, CL.firstDirty + 20000 - now)));
}
function clBody(ts) {
  return { owner: CL.uid, save: S, snapshot: snapshot(true), save_ts: ts, dropins: CL.dropins };
}
async function clUpload(force) {
  if (!CL.sb || !CL.uid || CL.status === 'moved' || !S.name) return false;
  if (!force && !CL.meta.dirty) return true;
  if (CL.uploading) {
    CL.again = true;
    try {
      await CL.uploading;
    } catch (e) {}
    if (!force) return true;
  }
  CL.firstDirty = 0;
  clearTimeout(CL.upT);
  const ts = CL.meta.localTs || Date.now();
  CL.uploading = (async () => {
    const r = await CL.sb.from('islands').upsert(clBody(ts), { onConflict: 'owner' });
    if (r.error) {
      CL.err = r.error.message || 'upload failed';
      if (r.error.code === '42501') {
        const st = await clRpc('my_cloud_status').catch(() => null);
        if (st && st.moved) clMoved();
      }
      return false;
    }
    CL.meta.syncedTs = ts;
    if (CL.meta.localTs === ts) CL.meta.dirty = false;
    CL.lastUp = Date.now();
    CL.err = '';
    clMetaSave();
    return true;
  })();
  try {
    return await CL.uploading;
  } catch (e) {
    CL.err = clErr(e);
    return false;
  } finally {
    CL.uploading = null;
    if (CL.again) {
      CL.again = false;
      if (CL.meta.dirty) clSchedule();
    }
  }
}
// page is being hidden/closed: fire-and-forget upload that survives the page going away
function clFlush() {
  if (!CL.ready || !CL.meta.dirty || !CL.token || !S.name) return;
  const ts = CL.meta.localTs,
    body = JSON.stringify(clBody(ts));
  if (body.length > 60000) {
    clUpload(true);
    return;
  }
  try {
    fetch(SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/islands?on_conflict=owner', {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + CL.token,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body
    })
      .then(r => {
        if (r.ok) {
          CL.meta.syncedTs = ts;
          if (CL.meta.localTs === ts) CL.meta.dirty = false;
          CL.lastUp = Date.now();
          clMetaSave();
        }
      })
      .catch(() => {});
  } catch (e) {}
}

// this phone's anonymous identity (kept in localStorage, so an existing player keeps the same one)
async function clAuth() {
  await clLoad();
  if (!CL.sb) {
    CL.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'capyIsland.auth'
      }
    });
    CL.sb.auth.onAuthStateChange((ev, s) => {
      CL.token = (s && s.access_token) || null;
    });
  }
  let s = (await CL.sb.auth.getSession()).data.session;
  if (!s) {
    const r = await CL.sb.auth.signInAnonymously();
    if (r.error) throw r.error;
    s = r.data.session;
  }
  CL.uid = s.user.id;
  CL.token = s.access_token;
  return s;
}
async function clInit() {
  if (!CL.on || CL.initing || CL.ready || restoring || !gateOpen()) return;
  CL.initing = true;
  if (CL.status !== 'moved') CL.status = 'loading';
  try {
    await clAuth();
    if (CL.meta.uid !== CL.uid) {
      CL.meta.uid = CL.uid;
      CL.meta.syncedTs = 0;
      if (S.name) {
        CL.meta.localTs = CL.meta.localTs || Date.now();
        CL.meta.dirty = true;
      }
    }
    clMetaSave();
    let st;
    try {
      st = await clRpc('my_cloud_status');
    } catch (e) {
      // this phone's cloud identity never entered the passcode (e.g. its sign-in was lost): ask again
      if (clErr(e).includes('not_allowed')) {
        try {
          localStorage.removeItem(UNLOCK_KEY);
        } catch (x) {}
        CL.status = 'locked';
        CL.initing = false;
        showGate();
        return;
      }
      throw e;
    }
    if (st && st.moved) {
      clMoved();
      CL.initing = false;
      return;
    }
    CL.status = 'ok';
    // cloud copy is newer than this phone's copy (e.g. island moved here): use it
    if (st && st.has_island && Number(st.save_ts) > (CL.meta.localTs || 0) && !MP.role) {
      if (await clAdopt()) {
        CL.initing = false;
        return;
      }
    }
    CL.ready = true;
    CL.err = '';
    if (!st || !st.has_island || CL.meta.dirty) await clUpload(true);
    clLobbyStart();
    clHeartbeat();
    clFriendsRefresh().then(() => refreshDock());
    clearInterval(CL.hbT);
    CL.hbT = setInterval(clHeartbeat, 60000);
  } catch (e) {
    CL.ready = false;
    if (CL.status !== 'moved') CL.status = 'offline';
    CL.err = clErr(e);
  }
  CL.initing = false;
  refreshDock();
}
async function clAdopt() {
  const r = await CL.sb.from('islands').select('save,save_ts').eq('owner', CL.uid).maybeSingle();
  if (r.error || !r.data) return false;
  let b;
  try {
    b = parseBackup(JSON.stringify(r.data.save));
  } catch (e) {
    return false;
  }
  const ts = Number(r.data.save_ts) || Date.now();
  restoring = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(b.save));
  } catch (e) {
    restoring = false;
    return false;
  }
  clMetaSet({ localTs: ts, syncedTs: ts, dirty: false });
  toast('☁️ Loading your island from the cloud...', 3000);
  setTimeout(() => location.replace(location.pathname), 600);
  return true;
}
function clMoved() {
  CL.status = 'moved';
  CL.ready = false;
  clMetaSet({ moved: true });
  clStopLive();
}
function clStopLive() {
  clearInterval(CL.hbT);
  const l = CL.lobby;
  CL.lobby = null;
  CL.lobbyOk = false;
  if (l)
    try {
      CL.sb.removeChannel(l);
    } catch (e) {}
  CL.pipes.forEach(c => c.close());
}
async function clHeartbeat() {
  if (!CL.ready || document.hidden) return;
  try {
    await clRpc('touch_island', { p_dropins: CL.dropins });
  } catch (e) {}
  clPullInbox();
  clPullMail(); // js/mail.js
}

// presents / guestbook stamps friends left while we were away
async function clPullInbox() {
  if (!CL.ready || CL.pulling || !S.name || VIS()) return;
  CL.pulling = true;
  try {
    const r = await clRpc('claim_inbox');
    if (r && ((r.gifts || []).length || (r.guestbook || []).length)) {
      CL.inbox = CL.inbox || { gifts: [], guestbook: [] };
      CL.inbox.gifts.push(...(r.gifts || []));
      CL.inbox.guestbook.push(...(r.guestbook || []));
    }
  } catch (e) {}
  CL.pulling = false;
  clApplyInbox();
}
function clApplyInbox() {
  const r = CL.inbox;
  if (!r || VIS() || restoring) return;
  CL.inbox = null;
  const mid = new Date();
  mid.setHours(0, 0, 0, 0);
  let now = 0;
  (Array.isArray(r.gifts) ? r.gifts : []).forEach(x => {
    if (!x) return;
    const it = GIFT_POOL.includes(x.item) ? x.item : pick(GIFT_POOL),
      c = WRAPS[x.c] ? x.c : 'pink',
      from = cleanName(x.from);
    // left before today -> it's "the next day" already: straight onto the beach; left today -> tomorrow (like live-visit presents)
    if (new Date(x.at) < mid && S.dayKey === todayKey()) {
      S.fpresents.push({ a: beachAngle(), from, c, item: it });
      now++;
    } else if (S.giftsPending.length < 20) S.giftsPending.push({ from, c, item: it });
  });
  S.fpresents = S.fpresents.slice(-12);
  const gb = Array.isArray(r.guestbook) ? r.guestbook : [];
  gb.forEach(x => {
    if (!x) return;
    const d = new Date(x.at),
      dk = isNaN(d) ? todayKey() : d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    S.guestbook.push({ n: cleanName(x.n), c: cleanColor(x.c), s: STAMPS[x.s | 0] || STAMPS[0], d: dk });
  });
  S.guestbook = S.guestbook.slice(-50);
  save();
  hud();
  if (gb.length)
    toast(`📝 ${esc(cleanName(gb[gb.length - 1].n))} visited your island and signed your guestbook!`, 3500);
  if (now)
    setTimeout(() => toast('💝 A friend left you a present on the beach!', 3500), gb.length ? 3700 : 0);
  refreshDock();
}

// "Played yesterday" etc. for the best-friends list
function friendSeen(f) {
  if (f.online) return '🟢 Playing now!';
  const d = f.days;
  if (d === null || d === undefined) return '💤 Not playing. Visit their island!';
  return `💤 Played ${d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? d + ' days ago' : 'over a week ago'}. Visit their island!`;
}
async function clFriendsRefresh() {
  if (!CL.ready) return CL.friends;
  try {
    const r = await clRpc('list_friends');
    CL.friends = (Array.isArray(r) ? r : [])
      .filter(f => f && UUID_RE.test(f.friend))
      .map(f => ({
        id: f.friend,
        name: cleanName(f.name),
        color: cleanColor(f.color),
        online: !!f.online,
        // whole days since they last played (null if hidden by their grown-ups, or not known)
        days: Number.isInteger(f.last_days) && f.last_days >= 0 ? f.last_days : null
      }));
    CL.frT = Date.now();
    CL.meta.friends = CL.friends.map(f => ({ id: f.id, name: f.name, color: f.color }));
    clMetaSave();
  } catch (e) {}
  return CL.friends;
}
window.clUnfriend = async id => {
  if (!UUID_RE.test(id)) return;
  try {
    await clRpc('remove_friend', { p_friend: id });
    CL.friends = CL.friends.filter(f => f.id !== id);
    CL.meta.friends = CL.friends;
    clMetaSave();
    toast('Removed from best friends.');
  } catch (e) {
    toast("Couldn't do that right now. 📡");
  }
  openDock('friends');
};

// A private Realtime channel wrapped to look like a PeerJS DataConnection (on/send/close/open/peer),
// so the existing host/visitor code runs unchanged over Supabase.
class CloudConn {
  constructor(topic, peer) {
    this.peer = peer;
    this.cloud = true;
    this.open = false;
    this.closed = false;
    this.h = {};
    this.last = {};
    this.lastT = {};
    const ch = CL.sb.channel(topic, { config: { private: true, broadcast: { self: false } } });
    this.ch = ch;
    ch.on('broadcast', { event: 'm' }, m => {
      if (this.open && m && m.payload && typeof m.payload === 'object') this.emit('data', m.payload);
    });
    ch.subscribe((st, err) => {
      if (this.ch !== ch) return;
      if (st === 'SUBSCRIBED') {
        if (!this.open && !this.closed) {
          this.open = true;
          this.emit('open');
        }
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        const was = this.open;
        this.open = false;
        if (!this.closed) {
          this.closed = true;
          this.ch = null;
          try {
            CL.sb.removeChannel(ch);
          } catch (e) {}
          this.emit(was ? 'close' : 'error', err);
        }
      }
    });
  }
  on(ev, f) {
    (this.h[ev] = this.h[ev] || []).push(f);
    return this;
  }
  emit(ev, a) {
    (this.h[ev] || []).slice().forEach(f => {
      try {
        f(a);
      } catch (e) {
        console.error(e);
      }
    });
  }
  // position packets: max ~6/s, and none while nothing moves (2s keep-alive) => about half the Realtime quota of 12/s
  send(m) {
    if (!this.open || !this.ch) return;
    if (m && (m.t === 'p' || m.t === 'ps')) {
      const j = JSON.stringify(m),
        now = performance.now(),
        dt = now - (this.lastT[m.t] || 0);
      if (dt < 2000 && (j === this.last[m.t] || dt < 150)) return;
      this.last[m.t] = j;
      this.lastT[m.t] = now;
    }
    this.ch.send({ type: 'broadcast', event: 'm', payload: m }).catch(() => {});
  }
  close() {
    if (this.closed) return;
    const was = this.open;
    this.open = false;
    this.closed = true;
    const ch = this.ch;
    this.ch = null;
    if (ch)
      setTimeout(() => {
        try {
          CL.sb.removeChannel(ch);
        } catch (e) {}
      }, 250);
    if (was) this.emit('close');
  }
}

// ----- host side: my lobby channel island:<me> (presence = "I'm playing, drop in!", broadcast = knocks)
function clLobbyStart() {
  if (!CL.ready || CL.lobby) return;
  const ch = CL.sb.channel('island:' + CL.uid, {
    config: { private: true, broadcast: { self: false }, presence: { key: 'host', enabled: true } }
  });
  CL.lobby = ch;
  CL.lobbyOk = false;
  CL.tracked = '';
  ch.on('broadcast', { event: 'knock' }, m => clKnock(m && m.payload));
  ch.subscribe(st => {
    if (CL.lobby !== ch) return;
    if (st === 'SUBSCRIBED') {
      CL.lobbyOk = true;
      CL.tracked = '';
      clTrack();
    } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
      CL.lobbyOk = false;
      CL.lobby = null;
      try {
        CL.sb.removeChannel(ch);
      } catch (e) {}
      clearTimeout(CL.lobT);
      CL.lobT = setTimeout(clLobbyStart, 20000);
    }
  });
}
function clTrack() {
  if (!CL.lobby || !CL.lobbyOk) return;
  const away = MP.role === 'visitor' || MP.role === 'connecting' || document.hidden;
  const want =
    !away && (CL.dropins || (MP.role === 'host' && !!MP.code))
      ? MP.role === 'host' && MP.vis.size >= MAX_VIS
        ? 'full'
        : 'on'
      : '';
  if (want === CL.tracked) return;
  CL.tracked = want;
  try {
    (want ? CL.lobby.track({ h: 1, full: want === 'full' ? 1 : 0 }) : CL.lobby.untrack()).catch(() => {});
  } catch (e) {}
}
function clKnock(p) {
  const vid = String((p && p.from) || '');
  if (!UUID_RE.test(vid) || vid === CL.uid || !CL.ready) return;
  if (MP.role === 'visitor' || MP.role === 'connecting' || document.hidden) return;
  if (!(CL.dropins || (MP.role === 'host' && MP.hostState === 'open'))) return;
  if (CL.pipes.has(vid) || CL.pipes.size >= 6) return;
  // one private pipe per visitor: visit:<me>:<visitor>; Realtime RLS only lets the two of them in, and only if friends
  const conn = new CloudConn('visit:' + CL.uid + ':' + vid, vid);
  CL.pipes.set(vid, conn);
  const gone = () => {
    if (CL.pipes.get(vid) === conn) CL.pipes.delete(vid);
  };
  conn.on('close', gone);
  conn.on('error', gone);
  conn.on('data', d => {
    if (d && d.t === 'hello' && !MP.role && !document.hidden && CL.ready) {
      MP.role = 'host';
      MP.hostState = 'open';
      MP.code = null;
      MP.dropin = true;
      MP.vis.clear();
      MP.players.clear();
      MP.emo.clear();
      MP.islJ = '';
      MP.dirty = false;
    }
  });
  conn.on('open', () => {
    hostConn(conn);
    setTimeout(() => {
      if (!MP.vis.has(vid) && CL.pipes.get(vid) === conn) {
        conn.close();
        clDropinEnd();
        mpUI();
      }
    }, 12000);
  });
}
function clDropinEnd() {
  if (MP.role === 'host' && MP.dropin && !MP.vis.size) {
    MP.role = null;
    MP.hostState = null;
    MP.dropin = false;
    MP.players.clear();
    MP.emo.clear();
  }
}
async function clHostOpen() {
  const my = ++CL.openSeq;
  let code = null;
  try {
    await clUpload(true);
    code = await clRpc('open_island');
  } catch (e) {}
  if (my !== CL.openSeq || MP.role !== 'host' || MP.hostState !== 'opening') {
    if (code && !(MP.role === 'host' && MP.code === code)) clRpc('close_island').catch(() => {});
    return;
  }
  if (!code) {
    if (MP.vis.size) {
      MP.dropin = true;
      MP.hostState = 'open';
      mpUI();
      refreshDock();
      toast("Couldn't make a code right now. 📡");
      return;
    }
    hostFail();
    return;
  }
  MP.code = code;
  MP.hostState = 'open';
  clTrack();
  mpUI();
  refreshDock();
  SND.whoosh();
  if (!MP.dockOpen) toast(`Your island is open! ✈️<br>Code: <b>${MP.code}</b>`, 3500);
}
// (unused in cloud mode: the public PeerJS broker would let a phone without the passcode land)
function peerHostExtra(code) {
  let p;
  try {
    p = new Peer(PEER_PREFIX + code, PEER_OPTS);
  } catch (e) {
    return;
  }
  MP.peer = p;
  p.on('connection', c => {
    if (MP.peer === p && MP.role === 'host') hostConn(c);
    else
      try {
        c.close();
      } catch (e) {}
  });
  p.on('error', e => {
    if (MP.peer !== p) return;
    const t = e && e.type;
    if (t !== 'peer-unavailable') {
      MP.peer = null;
      try {
        p.destroy();
      } catch (x) {}
    }
  });
  p.on('disconnected', () => {
    setTimeout(() => {
      try {
        if (MP.peer === p && !p.destroyed && p.disconnected) p.reconnect();
      } catch (e) {}
    }, 2000);
  });
}
function clHostClosed(hadCode) {
  if (hadCode && CL.ready) clRpc('close_island').catch(() => {});
  setTimeout(() => CL.pipes.forEach(c => c.close()), 700);
  clTrack();
}

// ----- visitor side
async function clVisitByCode(code) {
  let r = null;
  try {
    await clUpload(true);
    r = await clRpc('join_by_code', { p_code: code });
  } catch (e) {
    if (MP.role !== 'connecting') return;
    const m = clErr(e);
    if (m.includes('rate_limited')) return visitFail('slow');
    if (m.includes('own_island')) return visitFail('own');
    if (m.includes('too_many_friends')) return visitFail('many');
    return visitFail('net');
  }
  if (MP.role !== 'connecting') return;
  if (!r || !UUID_RE.test(r.owner)) return visitFail('notfound');
  const isNew = !CL.friends.some(f => f.id === r.owner),
    nm = cleanName(r.name);
  clFriendsRefresh();
  MP.newFriend = isNew ? nm : null;
  clFlyTo(r.owner, nm);
}
window.flyToFriend = id => {
  if (!UUID_RE.test(id)) return;
  if (!CL.ready) {
    dockMsg(OFFLINE_MSG);
    return;
  }
  if (MP.role) {
    toast(MP.role === 'host' ? 'Close your island first! 🔒' : 'Already flying! ✈️');
    return;
  }
  const f = CL.friends.find(x => x.id === id),
    nm = f ? f.name : 'Friend';
  save();
  MP.role = 'connecting';
  MP.code = null;
  MP.newFriend = null;
  clTrack();
  modal(
    `<h2>✈️ Flying...</h2><div style="text-align:center;font-size:64px"><div class="fly">${CRAFTS[myCraft()].e}</div></div><p class="c" style="font-size:18px">Flying to <b>${esc(nm)}</b>'s island...</p><div class="row"><button class="btn white" onclick="cancelVisit()">Cancel</button></div>`
  );
  clFlyTo(id, nm);
};
async function clFlyTo(fid, nm) {
  const going = () => MP.role === 'connecting';
  // 1) is the friend playing? (their presence on island:<friend>)
  const lobby = CL.sb.channel('island:' + fid, {
    config: { private: true, broadcast: { self: false }, presence: { key: CL.uid, enabled: true } }
  });
  MP.clLobby = lobby;
  const hostState = () => {
    let h = [];
    try {
      h = lobby.presenceState().host || [];
    } catch (e) {}
    return h.length ? (h[0].full ? 'full' : 'on') : '';
  };
  const online = await new Promise(res => {
    let done = false;
    const fin = v => {
        if (!done) {
          done = true;
          clearTimeout(t);
          res(v);
        }
      },
      t = setTimeout(() => fin(hostState()), 9000);
    lobby.on('presence', { event: 'sync' }, () => {
      const h = hostState();
      if (h) fin(h);
    });
    lobby.subscribe(st => {
      if (st === 'SUBSCRIBED') setTimeout(() => fin(hostState()), 1800);
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') fin('denied');
    });
  });
  if (!going() || MP.clLobby !== lobby) return;
  if (online === 'full') return visitFail('full');
  if (online !== 'on') {
    MP.clLobby = null;
    try {
      CL.sb.removeChannel(lobby);
    } catch (e) {}
    return clSnapVisit(fid, nm);
  }
  // 2) live: private pipe visit:<friend>:<me>, then knock on their lobby until they answer with a snapshot
  const conn = new CloudConn('visit:' + fid + ':' + CL.uid, 'host');
  conn.fid = fid; // whose island (for their mailbox, js/mail.js)
  MP.conn = conn;
  const toSnap = () => {
    if (MP.conn !== conn || !going()) return;
    MP.conn = null;
    conn.close();
    clearTimeout(MP.clT);
    const l = MP.clLobby;
    MP.clLobby = null;
    if (l)
      try {
        CL.sb.removeChannel(l);
      } catch (e) {}
    clSnapVisit(fid, nm);
  };
  conn.on('data', d => {
    if (MP.conn === conn) visitorData(d);
  });
  conn.on('close', () => {
    if (MP.conn !== conn) return;
    if (MP.role === 'visitor') returnHome('lost');
    else toSnap();
  });
  conn.on('error', toSnap);
  conn.on('open', () => {
    let n = 0;
    const knock = () => {
      if (MP.conn !== conn || !going()) return;
      try {
        lobby.send({ type: 'broadcast', event: 'knock', payload: { from: CL.uid } }).catch(() => {});
      } catch (e) {}
      conn.send({
        t: 'hello',
        v: 1,
        name: S.name || 'Friend',
        color: myColor(),
        acc: myAcc(),
        stack: S.stack.slice(0, 15)
      });
      if (++n < 8) MP.clT = setTimeout(knock, 1500);
    };
    knock();
  });
  clearTimeout(MP.to);
  MP.to = setTimeout(toSnap, 13000);
}
// friend not playing: visit their saved island (read-only snapshot); neighbours come say hi
async function clSnapVisit(fid, nm) {
  let r = null;
  try {
    r = await clRpc('get_friend_island', { p_friend: fid });
  } catch (e) {
    if (MP.role === 'connecting') visitFail('net');
    return;
  }
  if (MP.role !== 'connecting') return;
  if (!r || !r.snapshot) return visitFail('notfriend');
  cleanupPeer();
  enterVisit({ me: 'me', isl: Object.assign({}, r.snapshot, { name: r.name || nm }), pl: [], nb: null });
  MP.offline = true;
  MP.friend = fid;
  mpUI();
  NEIGH.forEach((n, i) => {
    n.x = n.hx;
    n.y = n.hy;
    n.soak = false;
    n.hi = true;
    n.tx = P.x + (i - 1) * 62 + 30;
    n.ty = P.y - 78 + (i === 1 ? -26 : 0);
    n.wait = rnd(6, 9);
    n.face = 1;
  });
  setTimeout(() => {
    if (MP.offline && MP.role === 'visitor' && !busy && !talking) clSayHi();
  }, 2600);
}
function clSayHi() {
  const n = NEIGH.slice().sort(
    (a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)
  )[0];
  talking = n;
  const T = $('#talk');
  T.classList.remove('hidden');
  T.querySelector('.tn').textContent = n.e + ' ' + n.n;
  T.querySelector('.tt').innerHTML =
    `Hi ${esc(S.name)}! ${hostName()} is napping right now 💤<br>But we'll show you around! You can sign the guestbook at the seaplane ✈️`;
  T.querySelector('.th').textContent = '';
  const row = T.querySelector('.row');
  row.innerHTML = '';
  const b = document.createElement('button');
  b.className = 'btn white';
  b.textContent = 'Hi! 👋';
  b.onclick = closeTalk;
  row.appendChild(b);
}
async function clOfflineSign(i) {
  const hn = hostName();
  try {
    const ok = await clRpc('sign_guestbook', { p_friend: MP.friend, p_stamp: i });
    toast(
      ok ? `📝 You signed ${hn}'s guestbook! 💕` : `📝 You already signed ${hn}'s guestbook today!`,
      2800
    );
  } catch (e) {
    MP.signed = false;
    toast("The seaplane radio isn't working. 📡 Try again!");
    refreshDock();
  }
}
async function clOfflineGift(c) {
  const hn = hostName();
  try {
    const ok = await clRpc('leave_present', { p_friend: MP.friend, p_wrap: c });
    toast(
      ok
        ? `🎁 Your present will be on ${hn}'s beach tomorrow!`
        : `🎁 ${hn} hasn't opened your last present yet!`,
      3200
    );
  } catch (e) {
    MP.gave = false;
    toast("The seaplane radio isn't working. 📡 Try again!");
    refreshDock();
  }
}

// ----- grown-ups: cloud status + move to a new phone
function clAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' h ago';
}
function clStatusText() {
  if (CL.status === 'ok') {
    const n = CL.friends.length;
    return `☁️ Cloud save is on. ${CL.meta.dirty ? 'Saving soon...' : 'All saved'}${CL.lastUp ? ' (' + clAgo(CL.lastUp) + ')' : ''}.<br>💕 ${n} best friend${n === 1 ? '' : 's'}`;
  }
  if (CL.status === 'loading') return '☁️ Connecting to the cloud...';
  if (CL.status === 'moved')
    return '📱 This island was moved to another phone, so cloud saving is off here. The game still works on this phone.';
  return (
    '📴 Cloud is offline right now. Saving on this phone only; it will sync when the internet is back.' +
    (CL.err ? `<br><small>${esc(CL.err.slice(0, 140))}</small>` : '')
  );
}
function clPanelHtml() {
  return (
    `<h3>☁️ Cloud save</h3><p class="note" style="font-size:14px;margin-top:0">${clStatusText()}</p>` +
    (CL.status === 'moved'
      ? `<button class="btn big white" onclick="clFreshCloud()">Start a new cloud island on this phone</button>`
      : `<label style="display:flex;gap:8px;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-top:8px"><input type="checkbox" id="cldrop" ${CL.dropins ? 'checked' : ''}> Best friends can drop in while ${esc(S.name || 'your child')} plays</label>
 <label style="display:flex;gap:8px;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-top:8px"><input type="checkbox" id="clchat" ${CL.chat ? 'checked' : ''}> Best friends can send typed chat messages</label>
 <label style="display:flex;gap:8px;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-top:8px"><input type="checkbox" id="clboards" ${CL.boards ? 'checked' : ''}> Show best friends' drawings</label>
 <label style="display:flex;gap:8px;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-top:8px"><input type="checkbox" id="clfreq" ${CL.freq ? 'checked' : ''}> Can make new best friends while visiting</label>
 <button class="btn big white" onclick="clMakeTransfer()" ${CL.ready ? '' : 'disabled'}>📱 Move to a new phone</button><div id="clxfer"></div>`) +
    clClaimHtml()
  );
}
function clClaimHtml() {
  return `<p class="c" style="font-size:14px;margin:12px 0 4px">On a <b>new</b> phone? Type the code from the old phone:</p><input class="name" id="clxin" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" style="font-size:18px;user-select:text;-webkit-user-select:text"><div class="row"><button class="btn white" onclick="clClaimAsk(document.getElementById('clxin').value)">Move island to this phone</button></div>`;
}
function clPanelWire() {
  const c = $('#cldrop');
  if (c)
    c.onchange = () => {
      CL.dropins = c.checked;
      clMetaSet({ dropins: CL.dropins });
      clTrack();
      if (CL.ready) clRpc('touch_island', { p_dropins: CL.dropins }).catch(() => {});
    };
  const k = $('#clchat');
  if (k)
    k.onchange = () => {
      CL.chat = k.checked;
      clMetaSet({ chat: CL.chat });
      chatUI();
    };
  const bd = $('#clboards');
  if (bd)
    bd.onchange = () => {
      CL.boards = bd.checked;
      clMetaSet({ boards: CL.boards });
    };
  const fq = $('#clfreq');
  if (fq)
    fq.onchange = () => {
      CL.freq = fq.checked;
      clMetaSet({ freq: CL.freq });
    };
}
window.clMakeTransfer = async () => {
  const box = $('#clxfer');
  if (!box) return;
  box.innerHTML = '<p class="c">Making a code...</p>';
  try {
    await clUpload(true);
    const r = await clRpc('create_transfer_code');
    if (!document.body.contains(box)) return;
    box.innerHTML = `<div class="code" style="font-size:26px;letter-spacing:3px;padding-left:3px;user-select:text;-webkit-user-select:text">${esc(r.code)}</div><p class="c" style="font-size:13px">On the new phone: open Capy Island, tap <b>“Moving from another phone?”</b> on the welcome screen (or hold ⚙️) and type this code.<br>It works <b>once</b>, for 24 hours. After the move this phone stops cloud saving.<br>🔒 Keep it private: this code hands over the island.</p>`;
  } catch (e) {
    if (document.body.contains(box))
      box.innerHTML = `<p class="note">😕 Couldn't make a code right now. Check the internet and try again.</p>`;
  }
};
function clBack(msg) {
  S.name ? grownups(msg) : clMoveHere(msg);
}
window.clMoveHere = msg => {
  modal(
    `<h2>📱 Moving from another phone</h2>${msg ? `<p class="note">${msg}</p>` : ''}<p class="c" style="font-size:14px">Grown-ups: on the <b>old</b> phone, press and hold ⚙️ and tap “Move to a new phone”. Then type the code here.</p>${clClaimHtml()}<div class="row"><button class="btn" onclick="welcome()">Back</button></div>`
  );
};
window.clClaimAsk = v => {
  const c = String(v || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length !== 12) {
    clBack('😕 Move codes look like XXXX-XXXX-XXXX.');
    return;
  }
  if (MP.role) {
    clBack('Please finish visiting / close your island first. ✈️');
    return;
  }
  window._clx = c;
  modal(
    `<h2>📱 Move island here?</h2><p class="c" style="font-size:17px">This replaces the island on <b>this</b> phone${S.name ? ` (${esc(S.name)}'s island, 🪙 ${S.coins | 0})` : ''} with the island from the old phone.<br><br>Continue?</p><div class="row"><button class="btn" onclick="clClaim()">Yes, move it here</button><button class="btn white" onclick="clBack()">Cancel</button></div>`
  );
};
window.clClaim = async () => {
  const code = window._clx;
  if (!code) return;
  window._clx = null;
  modal(
    '<h2>📱 Moving...</h2><div style="text-align:center;font-size:56px"><div class="fly">🛩️</div></div><p class="c" style="font-size:18px">Bringing the island over...</p>'
  );
  try {
    if (!CL.uid) await clInit();
    if (!CL.uid) throw new Error('offline');
    const r = await clRpc('claim_transfer', { p_code: code });
    if (!r || !r.save)
      return clBack("😕 That code didn't work. It may be mistyped, already used, or older than 24 hours.");
    let b;
    try {
      b = parseBackup(JSON.stringify(r.save));
    } catch (e) {
      return clBack('😕 The island data looks damaged. Nothing was changed.');
    }
    restoring = true;
    clearTimeout(CL.upT);
    try {
      localStorage.setItem(KEY, JSON.stringify(b.save));
    } catch (e) {
      restoring = false;
      return clBack("😕 Couldn't save on this phone.");
    }
    const ts = Number(r.save_ts) || Date.now();
    clMetaSet({ uid: CL.uid, localTs: ts, syncedTs: ts, dirty: false, moved: false, friends: [] });
    location.replace(location.pathname);
  } catch (e) {
    clBack(
      clErr(e).includes('rate_limited')
        ? '😕 Too many tries. Please wait a while and try again.'
        : "😕 Couldn't reach the cloud. Check the internet and try again."
    );
  }
};
window.clFreshCloud = async () => {
  try {
    if (CL.sb) await CL.sb.auth.signOut({ scope: 'local' });
  } catch (e) {}
  CL.uid = null;
  CL.ready = false;
  CL.status = 'off';
  CL.meta = {
    dropins: CL.dropins,
    chat: CL.chat,
    boards: CL.boards,
    freq: CL.freq,
    localTs: Date.now(),
    dirty: true
  };
  clMetaSave();
  await clInit();
  grownups();
};
