// Planes and helicopters at the Capy Air dock: drawing them, and the hangar where you buy and pick one.
// Friends who visit see your plane at your dock.
'use strict';

const myCraft = () => (CRAFTS[S.craft] && S.crafts[S.craft] ? S.craft : 'pink');
// the plane at the dock of the island I'm on
const dockCraft = () =>
  ONV() ? (MP.island && CRAFTS[MP.island.craft] ? MP.island.craft : 'pink') : myCraft();

const SEAPLANE_PAL = {
  pink: {
    tail: ['#f06aa8', '#ff9ccb'],
    body: ['#ffd1e6', '#ff8cc6', '#d9559a'],
    wing: ['#ffe4f1', '#ff9fcf'],
    mark: '💗'
  },
  sunny: {
    tail: ['#f5a623', '#ffd36b'],
    body: ['#fff6c8', '#ffd84d', '#dc9b00'],
    wing: ['#fffbe6', '#ffe07a'],
    mark: '🍋'
  },
  biplane: {
    tail: ['#4aa8ff', '#9fd4ff'],
    body: ['#e6f5ff', '#8fd0ff', '#3f8fd9'],
    wing: ['#ffffff', '#cfe9ff'],
    mark: '🌈'
  }
};
const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd84d', '#69db7c', '#4dabf7', '#b197fc'];

function drawPlane() {
  drawCraft(dockCraft(), PLANE.x, PLANE.y);
}
// a plane floating at (x, y): its floats sit on the water there
function drawCraft(k, x, y) {
  const Y = y + Math.sin(time * 1.4) * 1.6;
  ell(x + 6, y + 5, 60, 10, 'rgba(20,70,120,.2)');
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 56 + Math.sin(time * 2) * 3, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  const pont = (yy, a) => {
    rr(x - 46, yy - 8, 84, 9, 4.5);
    ctx.fillStyle = a ? '#dfe8f2' : vgrad(yy - 8, yy + 1, '#ffffff', '#cfdbe8');
    ctx.fill();
  };
  const struts = (a, b, top) => {
    ctx.strokeStyle = '#b8b8cc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + a, Y - 4);
    ctx.lineTo(x + a + 4, Y - top);
    ctx.moveTo(x + b, Y - 4);
    ctx.lineTo(x + b - 4, Y - top);
    ctx.stroke();
  };
  pont(Y - 6, 1);
  if (k === 'copter') copter(x, Y, struts);
  else if (k === 'jet') jet(x, Y, struts);
  else seaplane(x, Y, SEAPLANE_PAL[k] || SEAPLANE_PAL.pink, k === 'biplane', struts);
  pont(Y + 2, 0);
}
function seaplane(x, Y, c, bi, struts) {
  struts(-20, 14, 24);
  poly(
    [
      [x + 28, Y - 40],
      [x + 50, Y - 66],
      [x + 60, Y - 64],
      [x + 52, Y - 34]
    ],
    c.tail[0]
  );
  poly(
    [
      [x + 30, Y - 38],
      [x + 50, Y - 62],
      [x + 55, Y - 61],
      [x + 46, Y - 38]
    ],
    c.tail[1]
  );
  emoji(c.mark, x + 50, Y - 52, 11);
  const g = ctx.createRadialGradient(x - 14, Y - 46, 3, x, Y - 32, 46);
  g.addColorStop(0, c.body[0]);
  g.addColorStop(0.55, c.body[1]);
  g.addColorStop(1, c.body[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, Y - 32, 46, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  if (bi)
    // a rainbow stripe along the body
    RAINBOW.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x + 2, Y - 27 + i * 1.6, 40 - i * 2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(x + 4, Y - 29 - (bi ? 4 : 0), 40, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  [-10, 4, 18].forEach(wx => {
    ell(x + wx, Y - 38, 4.5, 4.5, '#fff');
    ell(x + wx, Y - 38, 3.2, 3.2, '#8fd3f0');
    ell(x + wx - 1, Y - 39, 1.1, 1.1, '#fff');
  });
  ell(x - 30, Y - 41, 8, 6, '#bfefff');
  ell(x - 32, Y - 43, 3, 2, '#fff');
  ell(x - 2, Y - 50, 42, 5, 'rgba(150,30,80,.25)');
  const wing = top => {
    const wg = ctx.createLinearGradient(0, top, 0, top + 9);
    wg.addColorStop(0, c.wing[0]);
    wg.addColorStop(1, c.wing[1]);
    ctx.fillStyle = wg;
    rr(x - 44, top, 84, 8, 4);
    ctx.fill();
  };
  wing(Y - 58);
  if (bi) {
    // the top wing on struts, striped like a rainbow
    ctx.strokeStyle = '#9aa7c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    [-34, -6, 22].forEach(sx => {
      ctx.moveTo(x + sx, Y - 57);
      ctx.lineTo(x + sx - 3, Y - 74);
    });
    ctx.stroke();
    ctx.save();
    rr(x - 50, Y - 81, 88, 8, 4);
    ctx.clip();
    RAINBOW.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(x - 50 + i * (88 / 6), Y - 81, 88 / 6 + 0.5, 8);
    });
    ctx.restore();
  }
  ell(x - 48, Y - 32, 4, 5, '#ffd84d');
  ell(x - 49, Y - 32, 3, 18 * Math.abs(Math.cos(time * 25)) + 3, 'rgba(110,70,90,.45)');
}
function copter(x, Y, struts) {
  struts(-22, 16, 18);
  // tail boom, fin and tail rotor
  rr(x + 8, Y - 42, 58, 7, 3.5);
  ctx.fillStyle = '#4fcf9f';
  ctx.fill();
  poly(
    [
      [x + 58, Y - 40],
      [x + 66, Y - 60],
      [x + 72, Y - 58],
      [x + 68, Y - 36]
    ],
    '#2fb285'
  );
  emoji('🫧', x + 66, Y - 48, 10);
  ell(x + 68, Y - 40, 9 * Math.abs(Math.cos(time * 30)) + 1.5, 9, 'rgba(90,110,120,.45)');
  // the bubble cabin
  const g = ctx.createRadialGradient(x - 18, Y - 46, 4, x - 6, Y - 34, 30);
  g.addColorStop(0, '#e2fff4');
  g.addColorStop(0.55, '#7fe6c0');
  g.addColorStop(1, '#2fa982');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x - 6, Y - 34, 30, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,244,255,.92)';
  ctx.beginPath();
  ctx.ellipse(x - 16, Y - 38, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ell(x - 22, Y - 44, 5, 3.5, '#fff');
  ell(x + 12, Y - 32, 4.5, 4.5, '#fff');
  ell(x + 12, Y - 32, 3.2, 3.2, '#8fd3f0');
  // mast and the big whirly rotor (side view: blades swing in and out)
  rr(x - 9, Y - 64, 6, 10, 2);
  ctx.fillStyle = '#6b7c93';
  ctx.fill();
  ell(x - 6, Y - 66, 44, 4, 'rgba(255,255,255,.35)');
  ctx.strokeStyle = '#55607a';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const off of [0, Math.PI / 2]) {
    const a = time * 16 + off,
      L = 46 * Math.cos(a),
      d = 3 * Math.sin(a);
    ctx.moveTo(x - 6 - L, Y - 66 - d);
    ctx.lineTo(x - 6 + L, Y - 66 + d);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
  ell(x - 6, Y - 66, 4, 3, '#ffd84d');
}
function jet(x, Y, struts) {
  struts(-22, 16, 22);
  // tail fin with a star
  poly(
    [
      [x + 30, Y - 40],
      [x + 50, Y - 72],
      [x + 60, Y - 70],
      [x + 56, Y - 36]
    ],
    '#8b63d9'
  );
  emoji('⭐', x + 50, Y - 56, 11);
  // sparkly engine glow
  const fl = 0.6 + 0.4 * Math.abs(Math.sin(time * 12));
  ell(x + 60, Y - 32, 8 * fl + 3, 5, 'rgba(255,140,210,.7)');
  ell(x + 58, Y - 32, 4, 3, '#fff3b0');
  const g = ctx.createLinearGradient(0, Y - 48, 0, Y - 18);
  g.addColorStop(0, '#f6eeff');
  g.addColorStop(0.5, '#caa9ff');
  g.addColorStop(1, '#8b63d9');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 70, Y - 30);
  ctx.quadraticCurveTo(x - 52, Y - 48, x - 20, Y - 46);
  ctx.lineTo(x + 50, Y - 42);
  ctx.quadraticCurveTo(x + 62, Y - 32, x + 50, Y - 22);
  ctx.lineTo(x - 20, Y - 20);
  ctx.quadraticCurveTo(x - 56, Y - 20, x - 70, Y - 30);
  ctx.fill();
  // cockpit and windows
  ctx.fillStyle = 'rgba(190,240,255,.95)';
  ctx.beginPath();
  ctx.ellipse(x - 44, Y - 38, 13, 6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ell(x - 48, Y - 40, 4, 2, '#fff');
  [-18, -6, 6, 18, 30].forEach(wx => ell(x + wx, Y - 36, 3, 3, '#fff'));
  // swept wing
  poly(
    [
      [x - 12, Y - 30],
      [x + 22, Y - 30],
      [x + 40, Y - 14],
      [x + 20, Y - 14]
    ],
    '#a47ff0'
  );
  // twinkles trailing behind
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - t;
    emoji('✨', x + 70 + t * 30, Y - 36 - Math.sin(t * 6 + i) * 8, 9 + i * 2);
  }
  ctx.globalAlpha = 1;
}

// ----- the hangar (a view of the Capy Air dock)
function hangarHtml() {
  const me = myCraft();
  return (
    `<h3>🛠️ My planes</h3><p class="c" style="font-size:14px;margin-top:0">Pick your ride! Friends see it at your dock when they visit.<br>🪙 You have <b>${S.coins | 0}</b> coins</p><div class="list">` +
    Object.keys(CRAFTS)
      .map(k => {
        const c = CRAFTS[k],
          btn =
            k === me
              ? '<button class="btn" disabled>Flying ✓</button>'
              : S.crafts[k]
                ? `<button class="btn white" onclick="useCraft('${k}')">Use</button>`
                : `<button class="btn" ${S.coins < c.p ? 'disabled' : ''} onclick="buyCraft('${k}')">🪙 ${c.p}</button>`;
        return `<div class="li"><canvas class="craftcv" data-k="${k}" aria-hidden="true"></canvas><span class="t">${c.n}<small>${c.d}</small></span>${btn}</div>`;
      })
      .join('') +
    `</div><div class="row"><button class="btn white" onclick="openDock()">Back</button><button class="btn" onclick="closeModal()">Close</button></div>`
  );
}
// draw the little pictures in the hangar list (and keep them moving while it's open)
let hangarOn = false;
function hangarStart() {
  if (!hangarOn) {
    hangarOn = true;
    requestAnimationFrame(hangarPaint);
  }
}
function hangarPaint() {
  const cvs = document.querySelectorAll('#modal:not(.hidden) .craftcv');
  if (!cvs.length) return (hangarOn = false);
  const k = Math.min(3, window.devicePixelRatio || 1),
    old = ctx;
  cvs.forEach(c => {
    if (c.width !== 96 * k) {
      c.width = 96 * k;
      c.height = 64 * k;
    }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(0.62 * k, 0, 0, 0.62 * k, 0, 0);
    ctx = g;
    try {
      drawCraft(c.dataset.k, 72, 90);
    } finally {
      ctx = old;
    }
  });
  requestAnimationFrame(hangarPaint);
}
window.buyCraft = k => {
  const c = CRAFTS[k];
  if (!c || S.crafts[k] || S.coins < c.p || VIS()) return;
  S.coins -= c.p;
  S.crafts[k] = 1;
  S.craft = k;
  hud();
  save();
  SND.coin();
  burst(PLANE.x, PLANE.y - 40, '✨', 8);
  openDock('hangar');
  toast(`${c.e} Your new ${c.n} is at the dock! 🎉`, 3200);
};
window.useCraft = k => {
  if (!S.crafts[k] || !CRAFTS[k] || VIS()) return;
  S.craft = k;
  save();
  SND.pop();
  openDock('hangar');
};
