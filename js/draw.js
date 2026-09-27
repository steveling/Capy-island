// Drawing helpers, the cached island background, and the 2.5D objects.
'use strict';

// ---------- DRAW HELPERS (2.5D: light from top-left) ----------
function ell(x, y, rx, ry, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function poly(pts, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fill();
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function vgrad(y0, y1, a, b) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}
function hgrad(x0, x1, a, b) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  if (f > 0) {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  } else {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
// soft drop shadow sprite (drawn stretched), falls slightly to the lower-right
const SHADOW = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'),
    r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(80,30,70,.40)');
  r.addColorStop(0.5, 'rgba(80,30,70,.26)');
  r.addColorStop(1, 'rgba(80,30,70,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return c;
})();
function shadow(x, y, rx, ry, a) {
  if (a !== undefined) ctx.globalAlpha = a;
  ctx.drawImage(SHADOW, x - rx + rx * 0.14, y - ry + ry * 0.2, rx * 2, ry * 2);
  ctx.globalAlpha = 1;
}
// emoji sprite cache (text rendering is the slowest thing on phones)
function emoji(e, x, y, s, f) {
  const k = e + '|' + s + '|' + (f || '');
  let c = EC.get(k);
  if (!c) {
    if (EC.size > 500) EC.clear();
    const px = Math.ceil(s * 1.3 * ER);
    c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d', { willReadFrequently: !!f });
    g.font = `${s * ER}px ${EMO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#000';
    g.fillText(e, px / 2, px / 2);
    if (f) fxPx(g, px, f);
    EC.set(k, c);
  }
  const d = s * 1.3;
  ctx.drawImage(c, x - d / 2, y - d / 2, d, d);
}
function islandPath(rx, ry, k, dy = 0, dx = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2,
      p = edge(t, rx, ry, k);
    i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy);
  }
  ctx.closePath();
}

// ---------- STATIC ISLAND LAYER (cached offscreen) ----------
const IB = { x: -20, y: 0, w: 1440, h: 1170 };
let ISL_CV = null,
  ISL_K = 0;
function buildIsland() {
  const k = Math.min(DPR * SCALE, 2200 / IB.w);
  if (ISL_CV && Math.abs(k - ISL_K) < 0.05) return;
  ISL_K = k;
  const c = ISL_CV || document.createElement('canvas');
  c.width = Math.ceil(IB.w * k);
  c.height = Math.ceil(IB.h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -IB.x * k, -IB.y * k);
  const old = ctx;
  ctx = g;
  try {
    paintIsland();
  } finally {
    ctx = old;
  }
  ISL_CV = c;
}
function paintIsland() {
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // shallow water around the island
  [
    [1.2, 'rgba(200,250,255,.16)'],
    [1.12, 'rgba(200,250,255,.2)'],
    [1.06, 'rgba(215,252,255,.28)']
  ].forEach(([k, c]) => {
    ctx.fillStyle = c;
    islandPath(SRX, SRY, k, 12);
    ctx.fill();
  });
  // cliff: the island is a raised landmass (sand layers visible on the south side)
  ctx.fillStyle = '#a57c4f';
  islandPath(SRX, SRY, 1, 27);
  ctx.fill();
  const cg = ctx.createLinearGradient(0, CY + 150, 0, CY + SRY + 30);
  cg.addColorStop(0, '#e3bf86');
  cg.addColorStop(1, '#c39862');
  ctx.fillStyle = cg;
  islandPath(SRX, SRY, 1, 22);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,210,.35)';
  islandPath(SRX, SRY, 1, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(140,90,40,.18)';
  islandPath(SRX, SRY, 1, 16);
  ctx.fill();
  ctx.fillStyle = cg;
  islandPath(SRX, SRY, 1, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,210,.3)';
  islandPath(SRX, SRY, 1, 10);
  ctx.fill();
  // sand top
  const sg = ctx.createRadialGradient(CX - 260, CY - 260, 60, CX, CY, SRX * 1.08);
  sg.addColorStop(0, '#fff3d4');
  sg.addColorStop(1, '#f4d69d');
  ctx.fillStyle = sg;
  islandPath(SRX, SRY, 1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 3;
  islandPath(SRX, SRY, 0.995);
  ctx.stroke();
  for (let i = 0; i < 260; i++) {
    const t = r() * Math.PI * 2,
      k = 0.9 + r() * 0.09,
      p = edge(t, SRX, SRY, k);
    if (norm(p.x, p.y, GRX, GRY) < 1.03) continue;
    ell(p.x, p.y, 1.4, 1, r() < 0.5 ? 'rgba(190,140,80,.35)' : 'rgba(255,255,255,.6)');
  }
  // shells
  for (let i = 0; i < 10; i++) {
    const t = r() * Math.PI * 2,
      p = edge(t, SRX, SRY, 0.955);
    if (Math.abs(t - DA) < 0.3) continue;
    ell(p.x + 1, p.y + 1.5, 4.5, 3, 'rgba(150,100,60,.25)');
    ell(p.x, p.y, 4.5, 3, r() < 0.5 ? '#ffd1e3' : '#fff');
    ell(p.x - 1.2, p.y - 0.8, 1.5, 1, 'rgba(255,255,255,.9)');
  }
  // grass plateau (a little step up from the beach) + its shadow on the sand
  ctx.fillStyle = 'rgba(150,100,40,.18)';
  islandPath(GRX, GRY, 1, 16, 6);
  ctx.fill();
  ctx.fillStyle = '#4f9c42';
  islandPath(GRX, GRY, 1, 10);
  ctx.fill();
  ctx.fillStyle = '#66b551';
  islandPath(GRX, GRY, 1, 6);
  ctx.fill();
  const gg = ctx.createRadialGradient(CX - 240, CY - 230, 40, CX, CY, GRX * 1.05);
  gg.addColorStop(0, '#b6ec92');
  gg.addColorStop(0.6, '#9ade79');
  gg.addColorStop(1, '#86ce66');
  ctx.fillStyle = gg;
  islandPath(GRX, GRY, 1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 3;
  islandPath(GRX, GRY, 0.992, -1);
  ctx.stroke();
  // soft grass patches
  for (let i = 0; i < 70; i++) {
    const x = 150 + r() * 1100,
      y = 150 + r() * 830;
    if (norm(x, y, GRX, GRY) > 0.9) continue;
    ell(x, y, 18 + r() * 26, 8 + r() * 10, r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(40,110,40,.06)');
  }
  // spring's worn stone patch shadow
  ell(SPRING.x + 6, SPRING.y + 10, SPRING.rx + 30, SPRING.ry + 22, 'rgba(60,90,40,.14)');
  // flowers + grass tufts with tiny shadows
  FLOWERS.forEach(f => {
    if (f.g) {
      ctx.strokeStyle = '#5aae46';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.x - 4, f.y);
      ctx.lineTo(f.x - 6, f.y - 7);
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x, f.y - 9);
      ctx.moveTo(f.x + 4, f.y);
      ctx.lineTo(f.x + 6, f.y - 7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f.x - 0.5, f.y - 2);
      ctx.lineTo(f.x - 0.5, f.y - 8);
      ctx.stroke();
    } else {
      ell(f.x + 2, f.y + 3, 7, 3, 'rgba(40,90,30,.18)');
      ctx.strokeStyle = '#5aae46';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y + 1);
      ctx.lineTo(f.x, f.y + 5);
      ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566;
        ell(f.x + Math.cos(a) * 3.5, f.y + Math.sin(a) * 3.5, 3, 3, f.c);
      }
      ell(f.x, f.y, 2.2, 2.2, '#ffd84d');
      ell(f.x - 0.7, f.y - 0.7, 0.8, 0.8, '#fff');
    }
  });
  // tide pools on the beach
  POOLS.forEach(p => {
    ell(p.x + 2, p.y + 3, 30, 14, 'rgba(120,90,60,.25)');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ell(p.x + Math.cos(a) * 27, p.y + Math.sin(a) * 12.5 + 1.5, 6, 4.2, '#8f857c');
      ell(p.x + Math.cos(a) * 27, p.y + Math.sin(a) * 12.5, 6, 4.2, i % 2 ? '#d8d0c7' : '#ebe4dc');
    }
    const g = ctx.createRadialGradient(p.x - 6, p.y - 3, 2, p.x, p.y, 24);
    g.addColorStop(0, '#c8f6ff');
    g.addColorStop(1, '#4fb3d9');
    ell(p.x, p.y, 23, 10, g);
    ell(p.x - 7, p.y - 3, 7, 2, 'rgba(255,255,255,.55)');
  });
  // flower garden bed + little fence
  {
    const x0 = GARDEN[0].x - 30,
      x1 = GARDEN[3].x + 30,
      y0 = GARDEN[0].y - 24,
      y1 = GARDEN[7].y + 18;
    ctx.fillStyle = 'rgba(70,120,40,.18)';
    rr(x0, y0, x1 - x0, y1 - y0, 18);
    ctx.fill();
    for (let x = x0 + 6; x <= x1 - 6; x += 14) {
      ctx.fillStyle = '#c99a70';
      ctx.fillRect(x - 1.5, y1 - 10, 3, 12);
      ctx.fillRect(x - 1.5, y0 - 6, 3, 10);
    }
    ctx.fillStyle = '#e9c9a8';
    ctx.fillRect(x0 + 4, y1 - 7, x1 - x0 - 8, 3);
    ctx.fillRect(x0 + 4, y0 - 3, x1 - x0 - 8, 3);
  }
  // wooden pier for the seaplane
  const px = PIER.x,
    py = PIER.y,
    L = PIER.len;
  ctx.fillStyle = 'rgba(20,70,120,.22)';
  ctx.fillRect(px + 10, py + 30, 20, L - 20);
  for (let yy = py + 40; yy <= py + L; yy += 38) {
    ctx.fillStyle = '#6d4428';
    ctx.fillRect(px - 16, yy, 6, 16);
    ctx.fillRect(px + 10, yy, 6, 16);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(px - 18, yy + 14, 10, 2);
    ctx.fillRect(px + 8, yy + 14, 10, 2);
  }
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(px - 18, py + L, 36, 6);
  ctx.fillStyle = '#7a4c2c';
  ctx.fillRect(px + 18, py, 4, L + 6);
  for (let yy = py; yy < py + L; yy += 10) {
    ctx.fillStyle = ((yy - py) / 10) % 2 ? '#c8905e' : '#d39c69';
    ctx.fillRect(px - 18, yy, 36, 9);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(px - 18, yy, 36, 2);
    ctx.fillStyle = 'rgba(90,50,20,.35)';
    ctx.fillRect(px - 18, yy + 9, 36, 1);
  }
  ctx.fillStyle = '#b77d4c';
  ctx.fillRect(px - 20, py + L - 4, 6, 10);
  ctx.fillRect(px + 14, py + L - 4, 6, 10);
}

// ---------- 3D-ish objects ----------
function drawCapy(x, y, face, moving, walk, col, stack, soak, acc) {
  const C = CAPY[col] || CAPY.pink;
  ctx.save();
  ctx.translate(x, y);
  const up = moving ? Math.abs(Math.sin(walk)) : 0,
    b = moving ? -up * 3 : Math.sin(time * 2) * 0.8,
    l = moving ? Math.sin(walk) * 4 : 0;
  if (!soak) shadow(3, 1, 28 - up * 3, 8.5);
  const sq = moving ? Math.cos(walk * 2) * 0.05 : Math.sin(time * 2) * 0.012;
  ctx.scale(face * (1 + sq), 1 - sq);
  const L = -face; // light always comes from world top-left
  [
    [-5, -l, 1],
    [16, -l, 1],
    [-14, l, 0],
    [8, l, 0]
  ].forEach(([lx, o, far]) => {
    rr(lx - 3.6, -13 + b, 7.2, 13 + o * 0.5, 3.4);
    ctx.fillStyle = far ? shade(C.d, -0.12) : C.d;
    ctx.fill();
  });
  let g = ctx.createRadialGradient(L * 9, -33 + b, 2, 0, -20 + b, 30);
  g.addColorStop(0, C.l);
  g.addColorStop(0.5, C.b);
  g.addColorStop(1, C.d);
  ell(0, -22 + b, 25, 16, g);
  ell(-2, -12 + b, 17, 4, 'rgba(0,0,0,.06)');
  g = ctx.createRadialGradient(20 + L * 5, -40 + b, 1, 20, -33 + b, 17);
  g.addColorStop(0, C.l);
  g.addColorStop(0.6, C.b);
  g.addColorStop(1, C.d);
  ell(20, -33 + b, 15, 12, g);
  ell(28, -30 + b, 9, 9, C.s);
  ell(27 + L * 2, -33 + b, 4, 2.6, 'rgba(255,255,255,.35)');
  ell(33, -32 + b, 3.2, 2.4, '#7a2d4f');
  ell(21, -37 + b, 2.6, 2.8, '#3a1426');
  ell(22, -38 + b, 0.9, 0.9, '#fff');
  ell(12, -44 + b, 4, 3.2, C.d);
  ell(12.5, -44.5 + b, 2, 1.5, shade(C.d, -0.2));
  ell(19, -29 + b, 3.8, 2.4, 'rgba(255,70,140,.55)');
  drawAcc(acc || 'bow', b);
  const st = stack || [],
    sw = moving ? 1.6 : 0.5;
  for (let i = 0; i < Math.min(st.length, 15); i++) {
    const o = Math.sin(time * 3 + i * 0.6) * i * sw * 0.5;
    emoji(ITEMS[st[i]].e, 20 + o, -51 + b - i * 12, 19);
  }
  ctx.restore();
}
function capyTop(stackLen, soak) {
  return (soak ? -38 : -56) - Math.min(stackLen, 15) * 12;
}

function drawHouse(x, y) {
  const nm = ISL().name;
  shadow(x + 16, y + 3, 92, 17);
  poly(
    [
      [x + 56, y],
      [x + 72, y - 10],
      [x + 72, y - 82],
      [x + 56, y - 72]
    ],
    '#e595b9'
  );
  ctx.fillStyle = vgrad(y - 72, y, '#ffdced', '#ffbfd9');
  ctx.fillRect(x - 56, y - 72, 112, 72);
  ctx.fillStyle = '#e38cb4';
  ctx.fillRect(x - 56, y - 7, 112, 7);
  poly(
    [
      [x + 56, y],
      [x + 72, y - 10],
      [x + 72, y - 17],
      [x + 56, y - 7]
    ],
    '#c9749c'
  );
  ctx.fillStyle = 'rgba(140,30,80,.13)';
  ctx.fillRect(x - 56, y - 72, 112, 9);
  // windows
  [x - 34, x + 34].forEach(wx => {
    ctx.fillStyle = 'rgba(140,40,90,.2)';
    ctx.fillRect(wx - 12, y - 54, 28, 24);
    ctx.fillStyle = '#fff';
    ctx.fillRect(wx - 14, y - 56, 28, 24);
    ctx.fillStyle = vgrad(y - 53, y - 35, '#e2f8ff', '#8fd0ee');
    ctx.fillRect(wx - 11, y - 53, 22, 18);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.moveTo(wx - 11, y - 44);
    ctx.lineTo(wx - 3, y - 53);
    ctx.lineTo(wx + 2, y - 53);
    ctx.lineTo(wx - 11, y - 39);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(wx - 1, y - 53, 2, 18);
    ctx.fillRect(wx - 11, y - 45, 22, 2);
    ctx.fillStyle = '#d9709f';
    ctx.fillRect(wx - 16, y - 32, 32, 4);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(wx - 16, y - 28, 32, 2);
    ell(wx - 8, y - 33, 3, 2.4, '#ff4f9e');
    ell(wx, y - 34, 3, 2.4, '#fff27a');
    ell(wx + 8, y - 33, 3, 2.4, '#ff7fbf');
  });
  // door
  rr(x - 17, y - 47, 34, 47, 14);
  ctx.fillStyle = '#8f3a63';
  ctx.fill();
  rr(x - 13, y - 43, 26, 43, 11);
  ctx.fillStyle = hgrad(x - 13, x + 13, '#c7608f', '#9f4270');
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(x - 9, y - 34, 7, 26);
  ctx.fillRect(x + 2, y - 34, 7, 26);
  ell(x + 8, y - 20, 2.6, 2.6, '#ffd84d');
  ell(x + 7.3, y - 20.8, 1, 1, '#fff');
  ctx.fillStyle = '#e9b98f';
  ctx.fillRect(x - 20, y - 2, 40, 5);
  ctx.fillStyle = '#c99a70';
  ctx.fillRect(x - 20, y + 3, 40, 2);
  // roof: front slope (lit), right slope (shade), ridge top (brightest)
  ctx.fillStyle = '#c94c86';
  rr(x + 30, y - 150, 14, 26, 2);
  ctx.fill();
  ctx.fillStyle = '#a93a6e';
  ctx.fillRect(x + 44, y - 146, 5, 22);
  ctx.fillStyle = '#ffb3d3';
  ctx.fillRect(x + 28, y - 154, 18, 5);
  poly(
    [
      [x + 70, y - 66],
      [x + 88, y - 78],
      [x + 62, y - 132],
      [x + 44, y - 120]
    ],
    '#cc4f88'
  );
  poly(
    [
      [x - 44, y - 120],
      [x + 44, y - 120],
      [x + 62, y - 132],
      [x - 26, y - 132]
    ],
    '#ffb0d2'
  );
  ctx.fillStyle = vgrad(y - 120, y - 66, '#ff94c5', '#f25ea2');
  poly(
    [
      [x - 70, y - 66],
      [x + 70, y - 66],
      [x + 44, y - 120],
      [x - 44, y - 120]
    ],
    ctx.fillStyle
  );
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 2;
  [0.25, 0.5, 0.75].forEach(f => {
    const yy = y - 66 - 54 * f,
      hw = 70 - 26 * f;
    ctx.beginPath();
    ctx.moveTo(x - hw + 3, yy);
    ctx.lineTo(x + hw - 3, yy);
    ctx.stroke();
  });
  ctx.fillStyle = '#d24a8a';
  ctx.fillRect(x - 70, y - 68, 140, 4);
  poly(
    [
      [x + 70, y - 68],
      [x + 88, y - 80],
      [x + 88, y - 76],
      [x + 70, y - 64]
    ],
    '#a83a6e'
  );
  emoji('💗', x, y - 93, 22);
  if (nm) {
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = nm + "'s House",
      w = ctx.measureText(t).width + 18;
    ctx.fillStyle = 'rgba(160,50,100,.2)';
    rr(x - w / 2 + 2, y - 170, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    rr(x - w / 2, y - 172, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#c2427f';
    ctx.fillText(t, x, y - 161);
  }
}

function drawShop(x, y) {
  shadow(x + 16, y + 3, 92, 17);
  poly(
    [
      [x + 56, y],
      [x + 72, y - 10],
      [x + 72, y - 92],
      [x + 56, y - 82]
    ],
    '#93cdb5'
  );
  ctx.fillStyle = vgrad(y - 82, y, '#dcfaee', '#b3e8d2');
  ctx.fillRect(x - 56, y - 82, 112, 82);
  ctx.fillStyle = '#8ccfb3';
  ctx.fillRect(x - 56, y - 7, 112, 7);
  poly(
    [
      [x + 56, y],
      [x + 72, y - 10],
      [x + 72, y - 17],
      [x + 56, y - 7]
    ],
    '#71b096'
  );
  // roof slab
  poly(
    [
      [x - 60, y - 82],
      [x + 60, y - 82],
      [x + 78, y - 94],
      [x - 42, y - 94]
    ],
    '#f2fffa'
  );
  poly(
    [
      [x + 60, y - 82],
      [x + 78, y - 94],
      [x + 78, y - 89],
      [x + 60, y - 77]
    ],
    '#8fc7b0'
  );
  ctx.fillStyle = '#bfe9d8';
  ctx.fillRect(x - 60, y - 82, 120, 5);
  // sign board with thickness
  ctx.fillStyle = '#b98352';
  ctx.fillRect(x - 30, y - 100, 5, 14);
  ctx.fillRect(x + 25, y - 100, 5, 14);
  rr(x - 42, y - 121, 84, 28, 8);
  ctx.fillStyle = '#d9609c';
  ctx.fill();
  rr(x - 42, y - 124, 84, 28, 8);
  ctx.fillStyle = vgrad(y - 124, y - 96, '#ffa6d2', '#ff7fbc');
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOP', x, y - 110);
  // window with Berry
  ctx.fillStyle = 'rgba(40,90,70,.18)';
  ctx.fillRect(x - 44, y - 50, 52, 36);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 47, y - 53, 54, 38);
  ctx.fillStyle = vgrad(y - 50, y - 18, '#dff6ff', '#86cdee');
  ctx.fillRect(x - 44, y - 50, 48, 32);
  emoji('🦝', x - 20, y - 32, 26);
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.moveTo(x - 44, y - 38);
  ctx.lineTo(x - 32, y - 50);
  ctx.lineTo(x - 26, y - 50);
  ctx.lineTo(x - 44, y - 32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9709f';
  ctx.fillRect(x - 49, y - 17, 58, 4);
  // door
  ctx.fillStyle = '#4f7263';
  ctx.fillRect(x + 14, y - 47, 28, 47);
  ctx.fillStyle = hgrad(x + 17, x + 39, '#86ab9b', '#5e8676');
  ctx.fillRect(x + 17, y - 44, 22, 44);
  ell(x + 34, y - 22, 2.4, 2.4, '#ffd84d');
  // striped awning (rounded, lighter on top)
  for (let i = 0; i < 7; i++) {
    const x0 = x - 64 + i * 18.3,
      x1 = x0 + 18.3;
    ctx.fillStyle = i % 2 ? '#fff' : '#ff8cc6';
    ctx.beginPath();
    ctx.moveTo(x0 + 4, y - 84);
    ctx.lineTo(x1 + 4, y - 84);
    ctx.lineTo(x1, y - 66);
    ctx.arc(x0 + 9.15, y - 66, 9.15, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = vgrad(y - 84, y - 56, 'rgba(255,255,255,.3)', 'rgba(120,20,70,.18)');
  ctx.beginPath();
  ctx.moveTo(x - 60, y - 84);
  ctx.lineTo(x + 68, y - 84);
  ctx.lineTo(x + 64, y - 66);
  ctx.lineTo(x - 64, y - 66);
  ctx.closePath();
  ctx.fill();
  poly(
    [
      [x + 64, y - 66],
      [x + 68, y - 84],
      [x + 78, y - 90],
      [x + 74, y - 72]
    ],
    '#e0679f'
  );
  ctx.fillStyle = 'rgba(60,110,90,.18)';
  ctx.fillRect(x - 56, y - 57, 112, 5);
}

function drawSpring() {
  const { x, y, rx, ry } = SPRING,
    I = ISL();
  const stone = i => {
    const a = (i / 24) * Math.PI * 2,
      sx = x + Math.cos(a) * (rx + 8),
      sy = y + Math.sin(a) * (ry + 7);
    ell(sx + 1, sy + 3.5, 13, 9, '#8f857c');
    const g = ctx.createRadialGradient(sx - 4, sy - 4, 1, sx, sy, 14);
    g.addColorStop(0, i % 2 ? '#ddd5cd' : '#ece5de');
    g.addColorStop(1, i % 2 ? '#aaa198' : '#bdb4ab');
    ell(sx, sy, 13, 9, g);
  };
  for (let i = 12; i < 24; i++) stone(i); // back half
  ell(x, y, rx, ry, '#3aa6a6');
  ell(x, y + 5, rx - 3, ry - 6, '#5cc9c3');
  const wg = ctx.createRadialGradient(x - 20, y - 8, 4, x, y + 4, rx);
  wg.addColorStop(0, '#b9f5ee');
  wg.addColorStop(1, 'rgba(110,215,208,.2)');
  ell(x, y + 5, rx - 8, ry - 10, wg);
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const ph = (time * 0.5 + i / 3) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.ellipse(x - 18 + i * 22, y + 4 + i * 5, 6 + ph * 16, 2 + ph * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < Math.min(I.yuzu || 0, 12); i++) {
    const a = i * 2.4 + time * 0.15,
      r = 0.3 + ((i * 37) % 10) / 18;
    emoji('🍋', x + Math.cos(a) * rx * r * 0.8, y + Math.sin(a) * ry * r * 0.7, 14);
  }
  for (let i = 0; i < 12; i++) stone(i); // front half overlaps the water edge
  for (let i = 0; i < 6; i++) {
    const ph = (time * 0.3 + i / 6) % 1;
    ell(
      x - 40 + i * 16 + Math.sin(time + i) * 6,
      y - 12 - ph * 70,
      7 + ph * 12,
      5 + ph * 9,
      `rgba(255,255,255,${(0.55 * (1 - ph)).toFixed(2)})`
    );
  }
}
function drawSpringSign() {
  const { x, y, rx } = SPRING,
    sx = x + rx + 34;
  shadow(sx + 2, y + 4, 10, 4);
  ctx.fillStyle = hgrad(sx - 2, sx + 2, '#c08a5a', '#8a5a36');
  ctx.fillRect(sx - 2, y - 26, 4, 30);
  ctx.fillStyle = '#e3c9d6';
  ctx.fillRect(sx - 12, y - 38, 28, 20);
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 14, y - 40, 28, 20);
  emoji('♨️', sx, y - 30, 16);
}

function drawTree(t, i) {
  const sx = t.shake > 0 ? Math.sin(t.shake * 50) * 4 : 0,
    x0 = t.x,
    y0 = t.y;
  shadow(x0 + 12, y0 + 3, 48, 13);
  ctx.fillStyle = hgrad(x0 - 9, x0 + 9, '#c08a58', '#6e4222');
  ctx.beginPath();
  ctx.moveTo(x0 - 11, y0 + 1);
  ctx.quadraticCurveTo(x0 - 6, y0 - 6, x0 - 6, y0 - 20);
  ctx.lineTo(x0 - 5, y0 - 42);
  ctx.lineTo(x0 + 5, y0 - 42);
  ctx.lineTo(x0 + 6, y0 - 20);
  ctx.quadraticCurveTo(x0 + 6, y0 - 6, x0 + 11, y0 + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,40,15,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 - 1, y0 - 6);
  ctx.lineTo(x0 + 1, y0 - 18);
  ctx.moveTo(x0 + 2, y0 - 24);
  ctx.lineTo(x0 + 1, y0 - 34);
  ctx.stroke();
  const behind = P.y < y0 - 4 && P.y > y0 - 120 && Math.abs(P.x - x0) < 52;
  if (behind) ctx.globalAlpha = 0.6;
  const x = x0 + sx,
    y = y0 - 62;
  ell(x + 2, y + 20, 38, 13, '#3a8747');
  const lobe = (lx, ly, rx2, ry2, c0, c1) => {
    const g = ctx.createRadialGradient(lx - rx2 * 0.35, ly - ry2 * 0.45, 1, lx, ly, Math.max(rx2, ry2));
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ell(lx, ly, rx2, ry2, g);
  };
  lobe(x - 24, y + 6, 24, 22, '#6fcf7a', '#3f9a4e');
  lobe(x + 24, y + 6, 24, 22, '#5fbf6c', '#34863f');
  lobe(x, y - 6, 35, 31, '#93e397', '#46a553');
  lobe(x - 14, y + 14, 20, 15, '#7ed686', '#43a050');
  lobe(x + 15, y + 15, 20, 14, '#68c373', '#378c43');
  ell(x - 12, y - 20, 12, 7, 'rgba(255,255,255,.28)');
  ell(x - 20, y - 10, 5, 3.5, 'rgba(255,255,255,.22)');
  ctx.globalAlpha = 1;
  const n = ISL().trees[i] || 0;
  [
    [-18, 6],
    [16, 2],
    [0, -14]
  ]
    .slice(0, n)
    .forEach(([ox, oy]) => emoji(ITEMS[t.f].e, x + ox, y + oy, 20));
}

function drawNeighbor(n) {
  const moving = Math.hypot(n.tx - n.x, n.ty - n.y) > 2,
    b = moving ? -Math.abs(Math.sin(time * 9)) * 4 : Math.sin(time * 2 + n.hx) * 1.5;
  if (n.soak) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(n.x - 40, n.y - 120, 80, 118);
    ctx.clip();
    ctx.translate(n.x, n.y);
    ctx.scale(-n.face, 1);
    emoji(n.e, 0, -8 + Math.sin(time * 2 + n.hx), 38);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(n.x, n.y - 2, 20, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  shadow(n.x + 2, n.y + 1, 22 + b * 0.5, 7);
  ctx.save();
  ctx.translate(n.x, n.y);
  const sq = moving ? Math.cos(time * 18) * 0.05 : 0;
  ctx.scale(-n.face * (1 + sq), 1 - sq);
  emoji(n.e, 0, -22 + b, 42);
  ctx.restore();
  if (!ONV()) {
    const s = S.neigh[n.id];
    if (!s.done && s.req) {
      const bb = Math.sin(time * 4) * 1.5;
      ell(n.x + 23, n.y - 58 + bb, 13, 13, 'rgba(150,40,90,.18)');
      ell(n.x + 22, n.y - 60 + bb, 13, 13, '#fff');
      emoji('❗', n.x + 22, n.y - 60 + bb, 16);
    }
  }
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(n.n).width + 12;
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  rr(n.x - w / 2, n.y + 6, w, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#c2427f';
  ctx.textBaseline = 'middle';
  ctx.fillText(n.n, n.x, n.y + 14);
}

function drawGift(x, y, col, bob) {
  const c = WRAPS[col] || WRAPS.pink;
  shadow(x + 3, y + 2, 17, 5);
  const Y = y + bob;
  ctx.fillStyle = c;
  ctx.fillRect(x - 11, Y - 20, 22, 18);
  poly(
    [
      [x + 11, Y - 20],
      [x + 17, Y - 25],
      [x + 17, Y - 7],
      [x + 11, Y - 2]
    ],
    shade(c, -0.25)
  );
  poly(
    [
      [x - 11, Y - 20],
      [x - 5, Y - 25],
      [x + 17, Y - 25],
      [x + 11, Y - 20]
    ],
    shade(c, 0.3)
  );
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 2, Y - 20, 4, 18);
  poly(
    [
      [x - 2, Y - 20],
      [x + 4, Y - 25],
      [x + 8, Y - 25],
      [x + 2, Y - 20]
    ],
    '#fff'
  );
  poly(
    [
      [x - 8, Y - 22.5],
      [x + 14, Y - 22.5],
      [x + 14, Y - 21],
      [x - 8, Y - 21]
    ],
    'rgba(255,255,255,.9)'
  );
  ell(x - 2, Y - 28, 5, 3.5, '#fff');
  ell(x + 8, Y - 28, 5, 3.5, '#fff');
  ell(x + 3, Y - 26, 2.5, 2.5, shade(c, -0.1));
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(x - 11, Y - 20, 22, 3);
}

function drawSign() {
  const { x, y } = SIGN;
  shadow(x + 5, y + 1, 26, 6);
  ctx.fillStyle = hgrad(x - 22, x - 16, '#c08a5a', '#7a4c2c');
  ctx.fillRect(x - 22, y - 34, 6, 34);
  ctx.fillStyle = hgrad(x + 16, x + 22, '#c08a5a', '#7a4c2c');
  ctx.fillRect(x + 16, y - 34, 6, 34);
  rr(x - 40, y - 58, 80, 28, 8);
  ctx.fillStyle = '#e08ab4';
  ctx.fill();
  rr(x - 40, y - 61, 80, 28, 8);
  ctx.fillStyle = vgrad(y - 61, y - 33, '#ffffff', '#ffe3f0');
  ctx.fill();
  ctx.fillStyle = '#d94b90';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAPY AIR', x + 9, y - 47);
  emoji('✈️', x - 27, y - 47, 13);
  if (MP.role === 'host' && MP.hostState === 'open') {
    const wv = Math.sin(time * 5) * 3;
    ctx.fillStyle = '#9a6a44';
    ctx.fillRect(x + 26, y - 86, 3, 56);
    poly(
      [
        [x + 29, y - 86],
        [x + 52, y - 80 + wv * 0.3],
        [x + 29, y - 72]
      ],
      '#ff5fa8'
    );
    emoji('✨', x + 44, y - 92 + Math.sin(time * 3) * 2, 12);
  }
}
function drawPlane() {
  const x = PLANE.x,
    y = PLANE.y,
    b = Math.sin(time * 1.4) * 1.6,
    Y = y + b;
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
  pont(Y - 6, 1);
  ctx.strokeStyle = '#b8b8cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 20, Y - 4);
  ctx.lineTo(x - 16, Y - 24);
  ctx.moveTo(x + 14, Y - 4);
  ctx.lineTo(x + 10, Y - 24);
  ctx.stroke();
  poly(
    [
      [x + 28, Y - 40],
      [x + 50, Y - 66],
      [x + 60, Y - 64],
      [x + 52, Y - 34]
    ],
    '#f06aa8'
  );
  poly(
    [
      [x + 30, Y - 38],
      [x + 50, Y - 62],
      [x + 55, Y - 61],
      [x + 46, Y - 38]
    ],
    '#ff9ccb'
  );
  emoji('💗', x + 50, Y - 52, 11);
  const g = ctx.createRadialGradient(x - 14, Y - 46, 3, x, Y - 32, 46);
  g.addColorStop(0, '#ffd1e6');
  g.addColorStop(0.55, '#ff8cc6');
  g.addColorStop(1, '#d9559a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, Y - 32, 46, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(x + 4, Y - 29, 40, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  [-10, 4, 18].forEach(wx => {
    ell(x + wx, Y - 38, 4.5, 4.5, '#fff');
    ell(x + wx, Y - 38, 3.2, 3.2, '#8fd3f0');
    ell(x + wx - 1, Y - 39, 1.1, 1.1, '#fff');
  });
  ell(x - 30, Y - 41, 8, 6, '#bfefff');
  ell(x - 32, Y - 43, 3, 2, '#fff');
  ell(x - 2, Y - 50, 42, 5, 'rgba(150,30,80,.25)');
  const wg = ctx.createLinearGradient(0, Y - 58, 0, Y - 49);
  wg.addColorStop(0, '#ffe4f1');
  wg.addColorStop(1, '#ff9fcf');
  ctx.fillStyle = wg;
  rr(x - 44, Y - 58, 84, 8, 4);
  ctx.fill();
  ell(x - 48, Y - 32, 4, 5, '#ffd84d');
  ell(x - 49, Y - 32, 3, 18 * Math.abs(Math.cos(time * 25)) + 3, 'rgba(110,70,90,.45)');
  pont(Y + 2, 0);
}
