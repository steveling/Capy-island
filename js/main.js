// Startup: welcome screen, boot, and the main loop kick-off.
'use strict';

// ---------- START ----------
islReady = true;
buildIsland();
const QS = new URLSearchParams(location.search);
let pendingVisit = (QS.get('visit') || '').toUpperCase();
if (!/^[A-Z0-9]{5}$/.test(pendingVisit) || [...pendingVisit].some(c => !CODE_ABC.includes(c)))
  pendingVisit = '';
if (QS.has('visit'))
  try {
    QS.delete('visit');
    history.replaceState(null, '', location.pathname + (QS.toString() ? '?' + QS : '') + location.hash);
  } catch (e) {}
function maybeVisit() {
  if (pendingVisit) {
    const c = pendingVisit;
    pendingVisit = '';
    setTimeout(() => openDock('visit', c), 700);
  }
}
function welcome() {
  modal(
    `<h2>🌸 Welcome to Capy Island! 🌸</h2><div style="text-align:center;font-size:54px">🏝️</div><p style="text-align:center;font-weight:700">You're a little pink capybara with your very own island! What's your name?</p><input class="name" id="nm" maxlength="12" value="Emi"><p style="font-size:15px;line-height:1.5">👆 Tap anywhere to walk.<br>🍊 Tap trees to pick fruit. It stacks on your head!<br>🦋 Tap bugs to catch them.<br>🌊 Tap the water to go fishing.<br>🐰 Tap your friends to say hi!<br>♨️ Tap the hot spring to relax.<br>🏛️ Visit the museum and café!<br>✈️ Tap the seaplane to visit friends!</p><div class="row"><button class="btn" id="go">Let's play! 🩷</button></div>${CL.on ? '<p class="c" style="font-size:13px;margin:12px 0 0"><a href="#" style="color:#b0487c" onclick="clMoveHere();return false">📱 Moving from another phone? (grown-ups)</a></p>' : ''}`
  );
  $('#go').onclick = () => {
    S.name = ($('#nm').value.trim() || 'Emi').slice(0, 12);
    closeModal();
    newDay(true);
    hud();
    save();
    plSync();
    pwCreate(() => {
      toast('Look! There are presents on the beach! 🎁', 3500);
      maybeVisit();
    });
  };
}
if (QS.has('newday')) {
  S.dayKey = '';
}
function capyBoot() {
  CL.booted = true;
  hud();
  if (!S.name) welcome();
  else {
    plSync();
    if (!plMe().pw) pwCreate(v4news ? showNews : null);
    else if (v4news) showNews();
    if (newDay()) {
      hud();
      setTimeout(
        () =>
          toast(
            `Good morning, ${esc(S.name)}! 🌞<br>The fruit grew back and your friends need help!` +
              (S.fpresents.length ? '<br>💝 A friend left you a present on the beach!' : ''),
            4000
          ),
        300
      );
    } else {
      for (let i = 0; i < 4; i++) spawnBug();
    }
    maybeVisit();
  }
}
if (gateOpen()) capyBoot();
else showGate();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else if (S.name && CL.booted && !VIS() && newDay()) {
    hud();
    toast(`Good morning, ${esc(S.name)}! 🌞 A new day on Capy Island!`, 3500);
  }
});
addEventListener('pagehide', () => {
  if (MP.role === 'visitor')
    try {
      MP.conn && MP.conn.send({ t: 'bye' });
    } catch (e) {}
  if (MP.role === 'host')
    try {
      broadcast({ t: 'closed' });
    } catch (e) {}
});

// ----- pressing back by accident asks first (#4)
// After the first tap, one extra history entry sits on top of the game. Back (the phone's button or
// gesture, or the browser's) pops it instead of leaving, and we ask. Chrome's back button skips entries a
// page added without a tap, so the entry is only (re)added in response to one.
const QUIT = { armed: false, leaving: false };
const quitAsking = () => !$('#quit').classList.contains('hidden');
function quitArm() {
  if (QUIT.armed || QUIT.leaving || quitAsking()) return;
  try {
    history.pushState({ capyGuard: 1 }, '');
    QUIT.armed = true;
  } catch (e) {}
}
addEventListener('pointerdown', quitArm, true);
addEventListener('keydown', quitArm, true);
addEventListener('popstate', () => {
  if (!QUIT.armed || QUIT.leaving) return;
  QUIT.armed = false;
  save();
  $('#quit').classList.remove('hidden');
});
window.quitStay = () => {
  $('#quit').classList.add('hidden');
  quitArm();
};
window.quitLeave = () => {
  QUIT.leaving = true;
  $('#quit').classList.add('hidden');
  save();
  history.back();
  // still here after a moment: there was no page before this one to go back to
  setTimeout(() => {
    QUIT.leaving = false;
    toast('To leave, close this tab or app. 👋', 3500);
  }, 800);
};

setInterval(save, 5000);
requestAnimationFrame(loop);
if (CL.on && gateOpen()) clStart();
