// Typed chat on live visits, only between best friends (cloud mode): filtering, sending, the log and bubbles.
'use strict';

// ---------- CHAT ----------
// Typed chat only happens on cloud-mode live visits. Those run over a private Supabase Realtime channel
// (visit:<host>:<visitor>) that the server only opens between two best friends. Every phone checks this
// for itself on receive: a host only takes chat that arrives over a cloud connection, and a visitor only
// shows messages from the host or from its own best friends. Island-code visits over PeerJS (anyone who
// has the code) never get typed chat, only emotes. Grown-ups can switch chat off in the ⚙️ panel.
const CHAT_MAX = 60, // characters per message
  CHAT_GAP = 1.2, // seconds between messages from one player
  CHAT_LOG = 30, // messages kept in the log
  SAY_T = 6; // seconds a speech bubble stays up

// words that get hidden. Each letter also matches common look-alikes and repeats ("fuuuck", "sh1t").
// prettier-ignore
const CHAT_BAD = [
  'fuck', 'fucker', 'fucking', 'shit', 'shitty', 'bitch', 'bastard', 'ass', 'asshole', 'arse', 'dick', 'cock',
  'pussy', 'cunt', 'whore', 'slut', 'fag', 'faggot', 'nigger', 'nigga', 'retard', 'retarded', 'penis', 'vagina',
  'boobs', 'porn', 'sex', 'sexy', 'nude', 'nudes', 'naked', 'kys', 'stfu', 'wtf', 'kill yourself', 'shut up',
  'stupid', 'idiot', 'dumb', 'loser', 'ugly', 'hate you'
];
const CHAT_LIKE = { a: 'a4@', e: 'e3', i: 'i1!|', l: 'l1|', o: 'o0', s: 's5$', t: 't7+', g: 'g9', b: 'b8' };
// (no lookbehind: older iPads' Safari can't parse it, so the leading boundary is captured and put back)
const CHAT_BAD_RE = new RegExp(
  '(^|[^\\p{L}\\p{N}])(?:' +
    CHAT_BAD.map(w =>
      [...w]
        .map(ch => (ch === ' ' ? '[\\s._-]*' : `[${(CHAT_LIKE[ch] || ch).replace(/[\\\]^-]/g, '\\$&')}]+`))
        .join('')
    ).join('|') +
    ')(?:s|es|ed|er|ers|ing|in|y)?(?![\\p{L}\\p{N}])',
  'giu'
);

// the one place chat text is cleaned: run on send AND on receive (the other phone may not be this code)
function cleanChat(t) {
  let s = String(t == null ? '' : t)
    .normalize('NFKC')
    // control characters, zero-width and text-direction tricks
    .replace(/[\u0000-\u001f\u007f-\u009f­​-‏‪-‮⁠-⁯﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_MAX);
  // no personal info: links, emails, and phone-number-like runs of digits
  s = s
    .replace(/(?:https?:\/\/|www\.)\S*/gi, '🚫')
    .replace(/\S+@\S+/g, '🚫')
    .replace(/\b[\w-]+\.(?:com|net|org|io|co|me|gg|tv|app|xyz|us|uk|ca)\b\S*/gi, '🚫')
    .replace(/\d(?:[\s().+-]*\d){6,}/g, '🚫');
  s = s.replace(CHAT_BAD_RE, '$1🙊');
  return s.trim();
}

const cloudConn = c => !!(c && c.cloud);
function chatOn() {
  return CL.on && CL.chat;
}
// can I chat right now? (visiting a best friend live, or hosting at least one best friend)
function chatReady() {
  if (!chatOn()) return false;
  if (MP.role === 'visitor') return !MP.offline && cloudConn(MP.conn) && MP.conn.open;
  if (MP.role === 'host') for (const v of MP.vis.values()) if (cloudConn(v.conn)) return true;
  return false;
}

// a message arrived (or I sent one): bubble over their head + a line in the log
function chatShow(id, name, color, x) {
  MP.say.set(id, { x, t: time });
  MP.chat.push({ id, name, color, x });
  if (MP.chat.length > CHAT_LOG) MP.chat.shift();
  if ($('#chat').classList.contains('hidden')) {
    if (id !== 'me') MP.chatUnread++;
  } else chatLog();
  if (id !== 'me') SND.pop();
  chatUI();
}

// ----- sending
window.chatSend = () => {
  const inp = $('#chatin'),
    x = cleanChat(inp.value);
  if (!x) return;
  if (!chatReady()) {
    chatClose();
    return;
  }
  if (time - MP.chatT < CHAT_GAP) {
    chatNote('Slow down a little! 🐢');
    return;
  }
  MP.chatT = time;
  inp.value = '';
  chatNote('');
  chatShow('me', S.name, myColor(), x);
  if (MP.role === 'visitor')
    try {
      MP.conn.send({ t: 'chat', x });
    } catch (e) {}
  else chatRelay('host', x);
};
// host: pass a message on to every other visitor who came over a cloud (best friends) connection
function chatRelay(from, x) {
  MP.vis.forEach(v => {
    if (v.id !== from && cloudConn(v.conn) && v.conn.open)
      try {
        v.conn.send({ t: 'chat', id: from, x });
      } catch (e) {}
  });
}

// ----- receiving
// host side, from hostConn(): only over a cloud connection, only if chat is on here, rate-limited
function chatFromVisitor(v, d) {
  if (!chatOn() || !cloudConn(v.conn)) return;
  const x = cleanChat(d.x);
  if (!x || time - (v.chatT || -9) < CHAT_GAP * 0.8) return;
  v.chatT = time;
  chatShow(v.id, v.name, v.color, x);
  chatRelay(v.id, x);
}
// visitor side, from visitorData(): only from the host or my own best friends, over a cloud connection
function chatFromHost(d) {
  if (!chatOn() || MP.offline || !cloudConn(MP.conn)) return;
  const id = String((d && d.id) || ''),
    r = MP.players.get(id);
  if (!r || id === MP.me) return;
  if (id !== 'host' && !CL.friends.some(f => f.id === id)) return;
  const x = cleanChat(d.x);
  if (!x || time - (r.chatT || -9) < CHAT_GAP * 0.8) return;
  r.chatT = time;
  chatShow(id, r.name, r.color, x);
}

// ----- the chat panel
function chatLog() {
  const log = $('#chatlog');
  log.innerHTML = MP.chat.length
    ? MP.chat
        .map(
          m =>
            `<div class="cl${m.id === 'me' ? ' me' : ''}"><span class="dot" style="background:${(CAPY[m.color] || CAPY.caramel).b}"></span><b>${esc(m.name || 'Friend')}</b> ${esc(m.x)}</div>`
        )
        .join('')
    : '<p class="c">Say hi to your best friend! 👋</p>';
  log.scrollTop = log.scrollHeight;
}
function chatNote(t) {
  const n = $('#chatnote');
  if (n) n.textContent = t;
}
window.chatOpen = () => {
  if (busy || !chatReady()) return;
  closeTalk();
  $('#emobar').classList.add('hidden');
  $('#chat').classList.remove('hidden');
  MP.chatUnread = 0;
  chatNote('');
  chatLog();
  chatUI();
  try {
    $('#chatin').focus({ preventScroll: true });
  } catch (e) {}
};
window.chatClose = () => {
  $('#chat').classList.add('hidden');
  try {
    $('#chatin').blur();
  } catch (e) {}
};
// show/hide the 💬 button to match the visit; forget the conversation once the visit is over
function chatUI() {
  const ok = chatReady();
  if (!MP.role) {
    MP.chat = [];
    MP.say.clear();
    MP.chatUnread = 0;
  }
  document.body.classList.toggle('chatting', ok);
  $('#bChat').classList.toggle('hidden', !ok);
  if (!ok) chatClose();
  const b = $('#bChat .badge');
  b.textContent = MP.chatUnread > 9 ? '9+' : String(MP.chatUnread);
  b.classList.toggle('hidden', !MP.chatUnread);
}
$('#bChat').onclick = () => ($('#chat').classList.contains('hidden') ? chatOpen() : chatClose());
$('#chatsend').onclick = chatSend;
$('#chatx').onclick = chatClose;
$('#chatin').onkeydown = e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    chatSend();
  } else if (e.key === 'Escape') chatClose();
};
