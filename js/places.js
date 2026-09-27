// v4 places and systems: clock, accessories, garden, digging, beach, sky, and their drawing.
'use strict';

// ---------- v4: clock, museum + café, fossils, flowers, beach, sky, mirror ----------
function clock() {
  const d = new Date();
  if (typeof window.FAKE_MONTH === 'number') {
    d.setDate(1);
    d.setMonth(window.FAKE_MONTH - 1);
  }
  if (typeof window.FAKE_HOUR === 'number') d.setHours(window.FAKE_HOUR, 30, 0, 0);
  return d;
}
function nightLvl() {
  const h = clock().getHours();
  return h >= 19 || h < 5 ? 2 : h >= 17 || h < 6 ? 1 : 0;
}
const isNight = () => nightLvl() === 2;
function hourOK(t, h) {
  const r = { a: [0, 24], d: [6, 18], m: [5, 12], e: [16, 21], n: [19, 29] }[t || 'a'];
  return (h >= r[0] && h < r[1]) || (h + 24 >= r[0] && h + 24 < r[1]);
}
function monthOK(m, mo) {
  if (!m) return true;
  const [a, b] = m;
  return a <= b ? mo >= a && mo <= b : mo >= a || mo <= b;
}
function avail(id, d) {
  const it = ITEMS[id];
  d = d || clock();
  return hourOK(it.t, d.getHours()) && monthOK(it.m, d.getMonth() + 1);
}
function whenTxt(id) {
  const it = ITEMS[id];
  if (!it || !['bug', 'fish', 'sea'].includes(it.k)) return '';
  return (
    TNAME[it.t || 'a'] +
    ' · ' +
    (it.m ? MON[it.m[0] - 1] + (it.m[0] !== it.m[1] ? '–' + MON[it.m[1] - 1] : '') : 'all year')
  );
}
const SVGIMG = {};
function svgImg(k, svg) {
  let im = SVGIMG[k];
  if (!im) {
    im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    SVGIMG[k] = im;
  }
  return im.complete && im.naturalWidth ? im : null;
}
// item icon for HTML (colour filters, gold frames for art, drawn icons)
function ie(id) {
  const it = ITEMS[id];
  if (!it) return '❓';
  if (it.svg) return `<span class="svgi">${it.svg}</span>`;
  const inner = `<span class="ei"${it.f ? ` style="filter:${it.f}"` : ''}>${it.e}</span>`;
  return it.k === 'art' ? `<span class="frame" style="background:${it.bg}">${inner}</span>` : inner;
}
// item icon on the canvas
function drawItem(id, x, y, s) {
  const it = ITEMS[id];
  if (!it) return;
  if (it.svg) {
    const im = svgImg('i_' + id, it.svg);
    if (im) ctx.drawImage(im, x - s * 0.7, y - s * 0.7, s * 1.4, s * 1.4);
    return;
  }
  if (it.k === 'art') {
    const w = s * 1.05;
    ctx.fillStyle = '#c9952e';
    rr(x - w / 2 - 3, y - w / 2 - 3, w + 6, w + 6, 3);
    ctx.fill();
    ctx.fillStyle = it.bg;
    ctx.fillRect(x - w / 2, y - w / 2, w, w);
    emoji(it.e, x, y, s * 0.7, it.f);
    return;
  }
  emoji(it.e, x, y, s, it.f);
}
const placeable = k => ITEMS[k] && (ITEMS[k].k === 'furn' || ITEMS[k].k === 'art');
const myColor = () => (CAPY[S.color] ? S.color : 'pink'),
  myAcc = () => (ACCS[S.acc] && S.accs[S.acc] ? S.acc : 'bow');
const cleanAcc = v => (ACCS[v] ? v : 'bow');
function unlockAcc(a) {
  if (ACCS[a] && !S.accs[a]) {
    S.accs[a] = 1;
    return true;
  }
  return false;
}

// ----- accessories drawn on the capybara (local capy space, facing right) -----
function drawAcc(a, b) {
  ctx.save();
  switch (a) {
    case 'none':
      break;
    case 'flower': {
      const fl = ['#ff7fbf', '#fff27a', '#ffffff', '#c9a6ff', '#ff9f43'];
      ctx.strokeStyle = '#5aae46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, -43 + b);
      ctx.quadraticCurveTo(19, -53 + b, 33, -42 + b);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const fx = 7 + i * 6.4,
          fy = -43.5 + b - Math.sin((i / 4) * Math.PI) * 5.5;
        for (let k = 0; k < 5; k++) {
          const t = k * 1.2566;
          ell(fx + Math.cos(t) * 2.3, fy + Math.sin(t) * 2.3, 2, 2, fl[i]);
        }
        ell(fx, fy, 1.3, 1.3, '#ffd84d');
      }
      break;
    }
    case 'yuzuhat': {
      const g = ctx.createRadialGradient(15, -53 + b, 1, 18, -49 + b, 10);
      g.addColorStop(0, '#fff6a8');
      g.addColorStop(1, '#f2c21b');
      ell(18, -49 + b, 10, 7.5, g);
      ell(15, -52 + b, 3, 1.8, 'rgba(255,255,255,.6)');
      ctx.strokeStyle = '#6d4428';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(19, -56 + b);
      ctx.lineTo(20, -59 + b);
      ctx.stroke();
      ctx.fillStyle = '#5aae46';
      ctx.beginPath();
      ctx.ellipse(24, -59 + b, 5, 2.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'star': {
      ctx.translate(8, -46 + b);
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.6 : 6,
          t = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e0a800';
      ctx.lineWidth = 1;
      ctx.stroke();
      ell(-1.5, -1.5, 1.2, 1, '#fff');
      break;
    }
    case 'leaf': {
      ctx.translate(18, -50 + b);
      ctx.rotate(-0.25);
      ctx.fillStyle = '#5cbf4e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#86dd6c';
      ctx.beginPath();
      ctx.ellipse(-2, -1.5, 10, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f8f35';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(13, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.quadraticCurveTo(17, -2, 18, -6);
      ctx.stroke();
      break;
    }
    case 'shades': {
      ctx.strokeStyle = '#2a1a2e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(15, -38 + b);
      ctx.lineTo(7, -40 + b);
      ctx.stroke();
      rr(15, -41.5 + b, 12, 8, 3.5);
      ctx.fillStyle = '#2a1a2e';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,140,200,.8)';
      ctx.fillRect(17, -40 + b, 4, 1.6);
      break;
    }
    case 'sailor': {
      ell(19, -46 + b, 13, 3.4, '#e9f1ff');
      rr(10, -55 + b, 18, 9, 3);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.fillStyle = '#4a7fe0';
      ctx.fillRect(10, -49.5 + b, 18, 3);
      ell(19, -55 + b, 9, 2.4, '#f2f6ff');
      break;
    }
    case 'beret': {
      ctx.translate(17, -47 + b);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#e83e7e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7fb0';
      ctx.beginPath();
      ctx.ellipse(-3, -2, 7, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ell(0, -5.5, 1.8, 2, '#e83e7e');
      break;
    }
    case 'glasses': {
      ctx.strokeStyle = '#8a4a2a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(21, -37 + b, 4.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16.5, -38 + b);
      ctx.lineTo(8, -40 + b);
      ctx.moveTo(25.5, -37 + b);
      ctx.lineTo(29, -36 + b);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,235,255,.35)';
      ctx.beginPath();
      ctx.arc(21, -37 + b, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'crown': {
      ctx.translate(18, -47 + b);
      const g = ctx.createLinearGradient(0, -10, 0, 3);
      g.addColorStop(0, '#fff3a0');
      g.addColorStop(1, '#e8b21c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-9, 3);
      ctx.lineTo(-10, -7);
      ctx.lineTo(-5, -2);
      ctx.lineTo(0, -10);
      ctx.lineTo(5, -2);
      ctx.lineTo(10, -7);
      ctx.lineTo(9, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c98f0e';
      ctx.lineWidth = 1;
      ctx.stroke();
      ell(0, -1, 1.8, 1.8, '#ff3d96');
      ell(-6, 0, 1.3, 1.3, '#6fb6ff');
      ell(6, 0, 1.3, 1.3, '#5fd3a8');
      break;
    }
    default: {
      // the classic white bow
      const bw = (x2, y2, y3) => {
        ctx.beginPath();
        ctx.moveTo(4, -45 + b);
        ctx.lineTo(x2, y2 + b);
        ctx.lineTo(x2, y3 + b);
        ctx.closePath();
      };
      bw(-5, -51, -39);
      ctx.fillStyle = '#fff';
      ctx.fill();
      bw(12, -52, -39);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,150,185,.45)';
      ctx.beginPath();
      ctx.moveTo(4, -45 + b);
      ctx.lineTo(-5, -39 + b);
      ctx.lineTo(-5, -44 + b);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -45 + b);
      ctx.lineTo(12, -39 + b);
      ctx.lineTo(12, -44 + b);
      ctx.closePath();
      ctx.fill();
      ell(4, -45 + b, 3.2, 3.2, '#ff3d96');
      ell(3.2, -46 + b, 1.2, 1, 'rgba(255,255,255,.8)');
    }
  }
  ctx.restore();
}
// little capy portraits in HTML (mirror / rewards)
const accCv = (a, col) =>
  `<canvas class="accc" data-acc="${a}" data-col="${col || ''}" width="128" height="104"></canvas>`;
function paintAccCanvases() {
  document.querySelectorAll('#card canvas.accc').forEach(c => {
    const g = c.getContext('2d');
    g.setTransform(1.55, 0, 0, 1.55, 0, 0);
    g.clearRect(0, 0, 90, 70);
    const old = ctx;
    ctx = g;
    try {
      drawCapy(36, 62, 1, false, 0, c.dataset.col || myColor(), [], false, c.dataset.acc);
    } finally {
      ctx = old;
    }
  });
}

// ----- the new day: star cracks, shells, star pieces, garden, Fennel's boat -----
let dayNews = [];
function dayV4(prevDay) {
  dayNews = [];
  S.dig = [];
  for (let i = 0; i < 4; i++) {
    const p = grassSpot();
    S.dig.push({ x: Math.round(p.x), y: Math.round(p.y) });
  }
  const keep = S.beach.filter(b => b && b.t === 'starbit').slice(0, 8);
  S.beach = keep;
  const sh = ['shell_conch', 'shell_conch', 'shell_scallop', 'shell_cowrie', 'sanddollar', 'seaglass'];
  for (let i = 0; i < 5; i++) S.beach.push({ a: beachAngle(), t: pick(sh) });
  const w = Math.min(5, S.wish.n | 0);
  for (let i = 0; i < w; i++) S.beach.push({ a: beachAngle(), t: 'starbit' });
  if (w) dayNews.push('🌟 Your wishes left star pieces on the beach!');
  S.wish = { n: 0 };
  if (growGarden(prevDay)) dayNews.push('🌷 Surprise! A new flower bloomed in your garden!');
  const last = S.art.lastDay || 0,
    come = S.day >= 2 && (S.day - last >= 3 || Math.random() < 0.4);
  S.art = {
    day: S.day,
    stock: come
      ? ids('art')
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
      : [],
    here: come,
    lastDay: come ? S.day : last
  };
  if (come) dayNews.push("🦊 Fennel's art boat is at the beach today!");
  SEA.fill(null);
  seaT = [1, 4, 8];
}
function newsToast() {
  if (dayNews.length) {
    const m = dayNews.join('<br>');
    dayNews = [];
    setTimeout(() => toast(m, 4000), 4300);
  }
}

// ----- garden -----
function hybrid(a, b) {
  const k = [a, b].sort().join('+');
  const t = {
    'red+white': 'pink',
    'red+yellow': 'orange',
    'white+white': 'purple',
    'pink+purple': 'blue',
    'orange+purple': 'blue',
    'purple+purple': 'blue',
    'white+yellow': 'yellow'
  }[k];
  return t || (Math.random() < 0.25 ? pick(['pink', 'orange', 'purple']) : pick([a, b]));
}
function growGarden(prevDay) {
  const g = S.garden;
  let born = 0;
  g.forEach(p => {
    if (p && p.st < 3 && (p.w === prevDay || Math.random() < 0.5)) p.st++;
  });
  g.forEach((p, i) => {
    if (!p || p.st < 3 || p.w !== prevDay || p.kid === S.day || Math.random() > 0.4) return;
    const empty = g.map((q, j) => (q ? -1 : j)).filter(j => j >= 0);
    if (!empty.length) return;
    const mates = g.filter((q, j) => q && j !== i && q.st >= 3 && q.s === p.s && q.kid !== S.day),
      c = hybrid(p.c, mates.length ? pick(mates).c : p.c),
      j = empty.sort((a, b) => Math.abs(a - i) - Math.abs(b - i))[0];
    g[j] = { s: p.s, c, st: 3, w: 0, kid: S.day };
    born++;
  });
  return born;
}
function plotAct(i) {
  if (ONV()) {
    toast('What a pretty garden! 🌷');
    return;
  }
  const p = S.garden[i],
    G = GARDEN[i];
  if (!p) {
    const sd = ['seed_tulip', 'seed_rose'].filter(k => S.bag[k]);
    if (!sd.length) {
      toast('No seeds yet! 🌱<br>Berry sells seeds at the shop 🦝', 3000);
      return;
    }
    if (sd.length === 1) return plant(i, sd[0]);
    modal(
      `<h2>🌱 Plant a flower</h2><div class="grid" style="grid-template-columns:repeat(2,1fr)">${sd.map(k => `<div class="cell" onclick="plant(${i},'${k}')">${ie(k)}<small>${ITEMS[k].n}</small><span class="cnt">${S.bag[k]}</span></div>`).join('')}</div><div class="row"><button class="btn white" onclick="closeModal()">Never mind</button></div>`
    );
    return;
  }
  if (p.w !== S.day) {
    if (!S.bag.can) {
      toast('You need a watering can! 💧<br>Berry sells them 🦝', 3000);
      return;
    }
    p.w = S.day;
    toolFx = { id: 'can', t: 1.1 };
    burst(G.x, G.y - 16, '💧', 6);
    SND.water();
    save();
    toast(
      p.st >= 3
        ? 'Splash! 💧 Watered flowers sometimes<br>make new flowers with new colors! 🌈'
        : 'Splash! 💧 It will grow by tomorrow! 🌱',
      2600
    );
    return;
  }
  if (p.st >= 3) {
    const id = 'fl_' + p.s + '_' + p.c;
    modal(
      `<h2>${ie(id)} ${ITEMS[id].n}</h2><p class="c">Pick this flower? You can sell it or keep it. 🌸<br><small>Flowers you leave in the garden can make new colors!</small></p><div class="row"><button class="btn" onclick="pickFlower(${i})">Pick it 🌷</button><button class="btn white" onclick="closeModal()">Leave it</button></div>`
    );
    return;
  }
  toast('Already watered today! 💧<br>See you tomorrow! 🌱');
}
window.plant = (i, k) => {
  closeModal();
  if (VIS() || S.garden[i] || !takeItem(k)) return;
  S.garden[i] = { s: k === 'seed_rose' ? 'rose' : 'tulip', c: pick(['red', 'white', 'yellow']), st: 0, w: 0 };
  SND.plant();
  burst(GARDEN[i].x, GARDEN[i].y - 8, '🌱', 4);
  save();
  toast('You planted a seed! 🌱<br>Water it with your watering can 💧', 3000);
};
window.pickFlower = i => {
  closeModal();
  const p = S.garden[i];
  if (VIS() || !p || p.st < 3) return;
  const id = 'fl_' + p.s + '_' + p.c,
    first = addItem(id);
  S.garden[i] = null;
  SND.pick();
  save();
  toast(`You picked a ${ITEMS[id].n}! ${ie(id)}` + (first ? '<br>✨ New in your book!' : ''));
};

// ----- digging, beach, tide pools -----
let toolFx = null,
  SEA = [null, null, null],
  seaT = [1, 4, 8];
function digAct(i) {
  if (ONV()) return;
  const d = S.dig[i];
  if (!d) return;
  if (!S.bag.shovel) {
    toast('You need a shovel to dig! 🪏<br>Berry sells them 🦝', 3000);
    return;
  }
  S.dig.splice(i, 1);
  toolFx = { id: 'shovel', t: 1 };
  burst(d.x, d.y, '🟫', 5);
  SND.dig();
  addItem('fossilq');
  save();
  setTimeout(() => {
    SND.sparkle();
    burst(d.x, d.y - 10, '✨', 6);
  }, 250);
  toast('You dug up a Mystery Fossil! 🦴<br>Take it to Professor Hoot at the museum! 🏛️', 3200);
}
function beachAct(i) {
  if (ONV()) return;
  const b = S.beach[i];
  if (!b || !ITEMS[b.t]) return;
  S.beach.splice(i, 1);
  const first = addItem(b.t),
    p = beachPos(b.a);
  burst(p.x, p.y - 8, '✨', 5);
  SND.sparkle();
  save();
  toast(`You found a ${ITEMS[b.t].n}! ${ie(b.t)}` + (first ? '<br>✨ New in your book!' : ''));
}
function poolAct(i) {
  if (ONV()) {
    toast('What a pretty tide pool! 🌊');
    return;
  }
  const t = SEA[i];
  if (!t) {
    toast('The tide pool is quiet right now.<br>Come back soon! 🌊');
    return;
  }
  SEA[i] = null;
  seaT[i] = rnd(20, 40);
  const first = addItem(t),
    p = POOLS[i];
  burst(p.x, p.y - 6, '💦', 6);
  SND.splash();
  setTimeout(SND.sparkle, 200);
  save();
  toast(`You found a ${ITEMS[t].n}! ${ie(t)}` + (first ? '<br>✨ New in your book!' : ''));
}

// ----- balloons + shooting stars -----
let BAL = null,
  balT = 40,
  STAR = null,
  starT = 6,
  trailT = 0,
  nightTold = false;
function spawnBalloon() {
  const hw = W / 2 / SCALE;
  BAL = {
    x: cam.x - hw - 40,
    y0: cam.y - rnd(60, 170),
    y: 0,
    vx: rnd(38, 50),
    ph: 0,
    c: pick(Object.keys(WRAPS))
  };
  BAL.y = BAL.y0;
}
function popBalloon() {
  const p = { x: BAL.x, y: BAL.y };
  BAL = null;
  burst(p.x, p.y - 58, '🎈', 5);
  burst(p.x, p.y - 40, '✨', 6);
  SND.balloon();
  openPresent(p);
  const c = $('#card h2');
  if (c) c.textContent = '🎈 Pop! A present!';
}
function spawnStar() {
  const hw = W / 2 / SCALE,
    hh = H / 2 / SCALE;
  STAR = {
    x: cam.x - hw * rnd(0.3, 0.9),
    y: cam.y - hh * rnd(0.45, 0.85),
    vx: rnd(160, 210),
    vy: rnd(55, 90),
    t: 0,
    hit: false
  };
}
function makeWish() {
  STAR.hit = true;
  S.wish.n = (S.wish.n | 0) + 1;
  burst(STAR.x, STAR.y, '✨', 8);
  SND.wish();
  save();
  toast(
    S.wish.n <= 5
      ? '🌠 You made a wish! ✨<br>Look for star pieces on the beach tomorrow!'
      : '🌠 So many wishes tonight! ✨',
    3200
  );
}
function updV4(dt) {
  if (toolFx && (toolFx.t -= dt) < 0) toolFx = null;
  const dk = drinkFx();
  if (dk && dk.trail && P.moving && !VIS() && (trailT -= dt) < 0) {
    trailT = 0.12;
    parts.push({
      x: P.x + rnd(-10, 10),
      y: P.y - rnd(4, 22),
      e: pick(dk.trail),
      vx: rnd(-12, 12),
      vy: -18,
      life: 0.9,
      fl: 1
    });
  }
  if (VIS() || !S.name) return;
  if (BAL) {
    BAL.x += BAL.vx * dt;
    BAL.ph += dt;
    BAL.y = BAL.y0 + Math.sin(BAL.ph * 1.3) * 16;
    if (BAL.x > 1600) BAL = null;
  } else if ((balT -= dt) < 0) {
    balT = rnd(80, 150);
    spawnBalloon();
  }
  if (STAR) {
    STAR.t += dt;
    STAR.x += STAR.vx * dt;
    STAR.y += STAR.vy * dt;
    if (STAR.t > 2.6) STAR = null;
  } else if (isNight() && (starT -= dt) < 0) {
    starT = rnd(9, 20);
    spawnStar();
  }
  if (isNight() && !nightTold && !busy) {
    nightTold = true;
    setTimeout(() => toast("🌠 It's a starry night!<br>Tap the shooting stars to make a wish!", 3800), 1200);
  }
  for (let i = 0; i < SEA.length; i++) if (!SEA[i] && (seaT[i] -= dt) < 0) SEA[i] = weighted('sea');
}

// ----- taps / actions for the new places -----
function tapSky(x, y) {
  if (VIS()) return false;
  if (BAL && dist(x, y, BAL.x, BAL.y - 40) < 58) {
    popBalloon();
    return true;
  }
  if (
    STAR &&
    !STAR.hit &&
    (dist(x, y, STAR.x, STAR.y) < 80 || dist(x, y, STAR.x - STAR.vx * 0.3, STAR.y - STAR.vy * 0.3) < 80)
  ) {
    makeWish();
    return true;
  }
  return false;
}
function tapV4(x, y) {
  const home = !ONV();
  if (home) {
    for (let i = 0; i < S.beach.length; i++) {
      const p = beachPos(S.beach[i].a);
      if (dist(x, y, p.x, p.y - 6) < 30) {
        P.act = { k: 'beach', i };
        setT(p.x, p.y + 6);
        return true;
      }
    }
    for (let i = 0; i < POOLS.length; i++) {
      const p = POOLS[i];
      if (dist(x, y, p.x, p.y) < 38) {
        P.act = { k: 'pool', i };
        setT(p.x + (P.x < p.x ? -34 : 34), p.y + 4);
        return true;
      }
    }
    if (artHere() && dist(x, y, STALL.x, STALL.y - 26) < 50) {
      P.act = { k: 'stall' };
      setT(STALL.x - 44, STALL.y + 8);
      return true;
    }
    for (let i = 0; i < S.dig.length; i++) {
      const d = S.dig[i];
      if (dist(x, y, d.x, d.y) < 30) {
        P.act = { k: 'dig', i };
        setT(d.x + (P.x < d.x ? -26 : 26), d.y + 4);
        return true;
      }
    }
  }
  if (boardHit(x, y)) {
    P.act = { k: 'board' };
    setT(BOARD.x - 24, BOARD.y + 20);
    return true;
  }
  for (let i = 0; i < GARDEN.length; i++) {
    const g = GARDEN[i];
    if (Math.abs(x - g.x) < 21 && y > g.y - 36 && y < g.y + 13) {
      P.act = { k: 'plot', i };
      setT(g.x, g.y + 22);
      return true;
    }
  }
  if (x > ANNEX.x - 32 && x < ANNEX.x + 32 && y > ANNEX.y - 86 && y < ANNEX.y + 8) {
    P.act = { k: 'cafe' };
    setT(ANNEX.x + 14, ANNEX.y + 20);
    return true;
  }
  if (Math.abs(x - MUSEUM.x) < 106 && y > MUSEUM.y - 150 && y < MUSEUM.y + 16) {
    P.act = { k: 'museum' };
    setT(MUSEUM.x, MUSEUM.y + 22);
    return true;
  }
  return false;
}
function actV4(a) {
  switch (a.k) {
    case 'museum':
      openMuseum(MV === 'cafe' ? 'bug' : MV);
      return true;
    case 'cafe':
      openMuseum('cafe');
      return true;
    case 'plot':
      plotAct(a.i);
      return true;
    case 'dig':
      digAct(a.i);
      return true;
    case 'beach':
      beachAct(a.i);
      return true;
    case 'pool':
      poolAct(a.i);
      return true;
    case 'stall':
      openArt();
      return true;
    case 'board':
      boardAct();
      return true;
  }
  return false;
}

// ----- drawing the new places -----
function drawMuseum() {
  const x = MUSEUM.x,
    y = MUSEUM.y;
  shadow(x + 16, y + 6, 150, 24);
  for (let i = 0; i < 3; i++) {
    const w = 46 - i * 5,
      yy = y + 11 - i * 5;
    ctx.fillStyle = i % 2 ? '#f6e7f0' : '#ead3e2';
    ctx.fillRect(x - w, yy, w * 2, 5);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(x - w, yy, w * 2, 1.4);
  }
  poly(
    [
      [x + 92, y],
      [x + 110, y - 12],
      [x + 110, y - 94],
      [x + 92, y - 82]
    ],
    '#dcc6e6'
  );
  ctx.fillStyle = vgrad(y - 82, y, '#fff8fc', '#f3dcea');
  ctx.fillRect(x - 92, y - 82, 184, 82);
  ctx.fillStyle = '#e7c6da';
  ctx.fillRect(x - 96, y - 9, 192, 9);
  poly(
    [
      [x + 96, y],
      [x + 112, y - 11],
      [x + 112, y - 19],
      [x + 96, y - 9]
    ],
    '#c9a3bd'
  );
  rr(x - 19, y - 58, 38, 58, 19);
  ctx.fillStyle = '#7d3f6b';
  ctx.fill();
  rr(x - 15, y - 54, 30, 54, 15);
  ctx.fillStyle = vgrad(y - 54, y, '#fff0c2', '#ffc766');
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fillRect(x - 1.5, y - 52, 3, 52);
  const im = svgImg('owl', OWL_SVG);
  if (im) ctx.drawImage(im, x - 12, y - 30, 22, 24);
  [-80, -56, -34, 34, 56, 80].forEach(cx => {
    const X = x + cx;
    ctx.fillStyle = 'rgba(120,60,110,.12)';
    ctx.fillRect(X - 3, y - 76, 14, 67);
    ctx.fillStyle = hgrad(X - 7, X + 7, '#ffffff', '#e2cde8');
    ctx.fillRect(X - 6, y - 76, 12, 67);
    ctx.fillStyle = 'rgba(160,110,160,.2)';
    for (let k = -3; k <= 3; k += 3) ctx.fillRect(X + k, y - 74, 1, 62);
    ctx.fillStyle = '#f6e8f1';
    ctx.fillRect(X - 9, y - 82, 18, 6);
    ctx.fillRect(X - 8, y - 13, 16, 4);
  });
  ctx.fillStyle = '#fbeaf4';
  ctx.fillRect(x - 100, y - 97, 200, 15);
  ctx.fillStyle = 'rgba(150,80,130,.2)';
  ctx.fillRect(x - 100, y - 83, 200, 2);
  poly(
    [
      [x + 100, y - 82],
      [x + 116, y - 94],
      [x + 116, y - 109],
      [x + 100, y - 97]
    ],
    '#d9b8d0'
  );
  ctx.fillStyle = '#c2427f';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M U S E U M', x, y - 89.5);
  poly(
    [
      [x + 100, y - 97],
      [x + 116, y - 109],
      [x + 16, y - 151],
      [x, y - 139]
    ],
    '#d9669f'
  );
  poly(
    [
      [x - 106, y - 97],
      [x + 106, y - 97],
      [x, y - 141]
    ],
    '#f27fb6'
  );
  poly(
    [
      [x - 100, y - 99],
      [x + 100, y - 99],
      [x, y - 138]
    ],
    '#ffb8da'
  );
  poly(
    [
      [x - 80, y - 102],
      [x + 80, y - 102],
      [x, y - 131]
    ],
    '#ffd6ea'
  );
  ell(x, y - 113, 12, 11, '#fff');
  ctx.strokeStyle = '#e0b340';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 113, 12, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  emoji('🦴', x, y - 113, 13);
  ctx.fillStyle = '#9a6a44';
  ctx.fillRect(x - 1, y - 172, 2, 33);
  const wv = Math.sin(time * 4) * 2;
  poly(
    [
      [x + 1, y - 172],
      [x + 21, y - 166 + wv * 0.3],
      [x + 1, y - 159]
    ],
    '#ff5fa8'
  );
  if (isNight()) {
    ctx.fillStyle = 'rgba(255,220,120,.35)';
    rr(x - 15, y - 54, 30, 54, 15);
    ctx.fill();
  }
}
function drawAnnex() {
  const x = ANNEX.x,
    y = ANNEX.y;
  shadow(x + 6, y + 4, 42, 10);
  ctx.fillStyle = vgrad(y - 56, y, '#eafff6', '#c3eedc');
  ctx.fillRect(x - 27, y - 56, 54, 56);
  ctx.fillStyle = '#9fd9c1';
  ctx.fillRect(x - 27, y - 6, 54, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 24, y - 45, 26, 23);
  ctx.fillStyle = vgrad(y - 43, y - 24, '#fff6dc', '#ffd89a');
  ctx.fillRect(x - 22, y - 43, 22, 19);
  const im = svgImg('pigeon', PIGEON_SVG);
  if (im) ctx.drawImage(im, x - 22, y - 45, 21, 23);
  rr(x + 6, y - 35, 17, 35, 6);
  ctx.fillStyle = '#8a5a36';
  ctx.fill();
  rr(x + 8, y - 33, 13, 33, 5);
  ctx.fillStyle = '#a8703f';
  ctx.fill();
  ell(x + 19, y - 17, 1.8, 1.8, '#ffd84d');
  for (let i = 0; i < 4; i++) {
    const x0 = x - 31 + i * 15.5;
    ctx.fillStyle = i % 2 ? '#fff' : '#ff8cc6';
    ctx.beginPath();
    ctx.moveTo(x0, y - 62);
    ctx.lineTo(x0 + 15.5, y - 62);
    ctx.lineTo(x0 + 15.5, y - 52);
    ctx.arc(x0 + 7.75, y - 52, 7.75, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  rr(x - 25, y - 82, 50, 17, 7);
  ctx.fillStyle = '#8a5a36';
  ctx.fill();
  rr(x - 24, y - 83, 48, 15, 6);
  ctx.fillStyle = '#a8703f';
  ctx.fill();
  emoji('☕', x - 14, y - 75.5, 10);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAFÉ', x + 5, y - 75);
}
function drawPlot(i) {
  const g = GARDEN[i],
    gd = ISL().garden || [],
    p = gd[i],
    wet = p && !ONV() && p.w === S.day;
  ell(g.x + 2, g.y + 2, 18, 9.5, 'rgba(60,40,20,.2)');
  ell(g.x, g.y, 18, 9.5, wet ? '#6b4529' : '#9a6a42');
  ell(g.x - 4, g.y - 2.5, 10, 3.5, wet ? 'rgba(255,255,255,.14)' : 'rgba(255,230,190,.28)');
  if (!p) return;
  if (p.st === 0) {
    ell(g.x, g.y - 1, 6, 3, '#7a5230');
    emoji('🌱', g.x, g.y - 5, 9);
  } else if (p.st === 1) emoji('🌱', g.x, g.y - 9, 17);
  else if (p.st === 2) emoji('🌿', g.x, g.y - 12, 21);
  else {
    drawItem('fl_' + p.s + '_' + p.c, g.x, g.y - 15, 25);
    if (Math.sin(time * 3 + i * 2) > 0.85) emoji('✨', g.x + 12, g.y - 28, 10);
  }
  if (wet && Math.sin(time * 2 + i) > 0.5) emoji('💧', g.x - 13, g.y - 12, 9);
}
function drawStall() {
  const p = STALL,
    st = S.art.stock || [];
  shadow(p.x + 6, p.y + 3, 46, 10);
  const bx = p.x + 72,
    by = p.y + 10 + Math.sin(time * 1.3) * 1.5;
  ell(bx + 4, by + 5, 36, 7, 'rgba(20,70,120,.22)');
  poly(
    [
      [bx - 32, by - 10],
      [bx + 32, by - 10],
      [bx + 23, by + 4],
      [bx - 23, by + 4]
    ],
    '#e07a5f'
  );
  ctx.fillStyle = '#fff';
  ctx.fillRect(bx - 32, by - 12, 64, 3);
  ctx.fillStyle = '#9a6a44';
  ctx.fillRect(bx - 1, by - 54, 2, 44);
  poly(
    [
      [bx + 1, by - 54],
      [bx + 24, by - 18],
      [bx + 1, by - 18]
    ],
    '#fff7fb'
  );
  poly(
    [
      [bx - 1, by - 50],
      [bx - 18, by - 20],
      [bx - 1, by - 20]
    ],
    '#ffc1dc'
  );
  const im = svgImg('fox', FOX_SVG);
  if (im) ctx.drawImage(im, p.x - 16, p.y - 64, 30, 33);
  ctx.fillStyle = '#b98352';
  ctx.fillRect(p.x - 32, p.y - 46, 3, 46);
  ctx.fillRect(p.x + 29, p.y - 46, 3, 46);
  for (let i = 0; i < 4; i++) {
    const x0 = p.x - 36 + i * 18;
    ctx.fillStyle = i % 2 ? '#fff' : '#c9a6ff';
    ctx.beginPath();
    ctx.moveTo(x0, p.y - 56);
    ctx.lineTo(x0 + 18, p.y - 56);
    ctx.lineTo(x0 + 18, p.y - 47);
    ctx.arc(x0 + 9, p.y - 47, 9, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#d9a066';
  ctx.fillRect(p.x - 34, p.y - 20, 68, 10);
  ctx.fillStyle = '#b37843';
  ctx.fillRect(p.x - 34, p.y - 10, 68, 3);
  st.slice(0, 3).forEach((id, k) => drawItem(id, p.x - 20 + k * 20, p.y - 27, 11));
  if (!st.length) {
    ctx.fillStyle = '#c2427f';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLD OUT', p.x, p.y - 15);
  }
}
function drawV4Ground() {
  const home = !ONV();
  if (home)
    S.dig.forEach((d, i) => {
      ctx.strokeStyle = 'rgba(95,62,30,.75)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * Math.PI * 0.4;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + Math.cos(a) * 12, d.y + Math.sin(a) * 6.5);
      }
      ctx.stroke();
      ell(d.x, d.y, 3.2, 2, 'rgba(95,62,30,.7)');
      if (Math.sin(time * 2.5 + i * 1.7) > 0.8) emoji('✨', d.x + 10, d.y - 10, 10);
    });
  POOLS.forEach((p, i) => {
    const s = home && SEA[i];
    if (s) {
      const t = time * 1.6 + i;
      ell(p.x + Math.cos(t) * 5, p.y + Math.sin(t * 1.3) * 2, 6, 3, 'rgba(30,70,90,.35)');
      if (Math.sin(time * 5 + i) > 0.2) emoji('✨', p.x + Math.cos(time * 2 + i) * 10, p.y - 7, 11);
    } else {
      ctx.strokeStyle = `rgba(255,255,255,${(0.4 + 0.3 * Math.sin(time * 2 + i)).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 9 + 4 * Math.sin(time + i), 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}
function pushV4(ents) {
  ents.push([MUSEUM.y, drawMuseum]);
  ents.push([BOARD.y, drawBoard]);
  ents.push([ANNEX.y - 1, drawAnnex]);
  GARDEN.forEach((g, i) => ents.push([g.y, () => drawPlot(i)]));
  if (!ONV()) {
    if (artHere()) ents.push([STALL.y, drawStall]);
    S.beach.forEach((b, i) => {
      if (!ITEMS[b.t]) return;
      const p = beachPos(b.a);
      ents.push([
        p.y,
        () => {
          shadow(p.x + 1, p.y + 1, 10, 3.5);
          drawItem(b.t, p.x, p.y - 6, b.t === 'starbit' ? 17 : 16);
          if (b.t === 'starbit' && Math.sin(time * 4 + i) > 0.5) emoji('✨', p.x + 9, p.y - 15, 9);
        }
      ]);
    });
  }
  if (ONV() && MP.offline && MP.island) ents.push([NAP.y, drawNapper]);
}
// offline snapshot visit: the island owner is napping in a bed by their house, in their own colour +
// accessory, tucked under a blanket that rises and falls, with Zzz floating up and a snore now and then
const NAP = { x: HOUSE.x + 92, y: HOUSE.y + 48 };
let napT = 1.5; // seconds to the next snore
const napBreath = () => Math.sin(time * 1.7);
function drawNapper() {
  const I = MP.island,
    x = NAP.x,
    y = NAP.y,
    br = napBreath();
  shadow(x + 4, y + 2, 62, 10);
  // legs, headboard (head end on the left) and footboard
  ctx.fillStyle = '#9a6337';
  [-44, 42].forEach(lx => ctx.fillRect(x + lx, y - 8, 5, 10));
  rr(x - 54, y - 52, 12, 50, 5);
  ctx.fillStyle = vgrad(y - 52, y, '#c98b5b', '#9a6337');
  ctx.fill();
  emoji('💗', x - 48, y - 40, 9);
  rr(x + 44, y - 30, 10, 28, 4);
  ctx.fillStyle = vgrad(y - 30, y, '#c98b5b', '#9a6337');
  ctx.fill();
  // mattress with a pink skirt, and a pillow
  rr(x - 46, y - 22, 92, 16, 6);
  ctx.fillStyle = '#fff6fb';
  ctx.fill();
  rr(x - 46, y - 12, 92, 8, 4);
  ctx.fillStyle = '#ffb3d9';
  ctx.fill();
  ell(x - 30, y - 26, 15, 7.5, '#ffffff');
  ell(x - 30, y - 24, 13, 4, 'rgba(230,150,190,.25)');
  // the sleepy capy, head on the pillow
  drawCapy(x - 8, y - 8, -1, false, 0, I.color, [], true, I.acc, true);
  // blanket over the body, gently rising and falling with each breath
  const top = y - 38 - br * 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 24);
  ctx.quadraticCurveTo(x - 10, top - 6, x + 12, top);
  ctx.quadraticCurveTo(x + 40, top + 2, x + 46, y - 20);
  ctx.lineTo(x + 46, y - 6);
  ctx.lineTo(x - 18, y - 6);
  ctx.closePath();
  ctx.fillStyle = vgrad(top, y, '#ff9fcf', '#e56aa8');
  ctx.fill();
  // folded-over edge and polka dots
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 23);
  ctx.quadraticCurveTo(x - 9, top - 3, x + 4, top - 1);
  ctx.stroke();
  [
    [6, 10],
    [22, 6],
    [34, 14],
    [14, 20],
    [-4, 16]
  ].forEach(([dx, dy]) => ell(x + dx, top + dy, 2.2, 1.6, 'rgba(255,255,255,.8)'));
  // Zzz floating up from the pillow, each one growing, drifting and fading, one after another
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.45 + i / 3) % 1,
      zx = x - 34 + t * 26 + Math.sin(t * 6 + i) * 5,
      zy = y - 50 - t * 38;
    ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    ctx.font = `900 ${Math.round(11 + t * 12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(i === 2 ? 'z' : 'Z', zx, zy);
    ctx.fillStyle = '#8a6fd1';
    ctx.fillText(i === 2 ? 'z' : 'Z', zx, zy);
  }
  ctx.globalAlpha = 1;
  nameTag(x - 6, y - 112, I.name + ' 💤', I.color);
}
// how loud a snore is where I'm standing: louder close to the bed, silent far away
function napVolume() {
  return Math.max(0, 1 - dist(P.x, P.y, NAP.x, NAP.y) / 700);
}
// called every frame: a snore every 3-4.5 seconds while visiting a napping friend
function napTick(dt) {
  if (!(ONV() && MP.offline && MP.island) || document.hidden) {
    napT = 1.5;
    return;
  }
  napT -= dt;
  if (napT > 0) return;
  napT = rnd(3, 4.5);
  const v = napVolume();
  if (v > 0.05) SND.snore(v);
}
function drawV4Top(vx0, vy0, vx1, vy1) {
  if (toolFx) {
    const it = toolFx.id,
      sw = Math.sin(time * 16) * 0.5;
    ctx.save();
    ctx.translate(P.x + P.face * 24, P.y - 30);
    ctx.rotate(sw * P.face);
    drawItem(it, 0, 0, 20);
    ctx.restore();
  }
  if (BAL) {
    const x = BAL.x,
      y = BAL.y,
      c = WRAPS[BAL.c];
    ctx.strokeStyle = 'rgba(120,80,100,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.quadraticCurveTo(x + 5, y - 28, x, y - 42);
    ctx.stroke();
    emoji('🎁', x, y - 2, 22);
    const g = ctx.createRadialGradient(x - 6, y - 62, 2, x, y - 56, 19);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.3, c);
    g.addColorStop(1, shade(c, -0.25));
    ell(x, y - 58, 15, 18, g);
    poly(
      [
        [x - 3, y - 39],
        [x + 3, y - 39],
        [x, y - 43]
      ],
      shade(c, -0.25)
    );
  }
  const nl = nightLvl();
  if (nl) {
    ctx.fillStyle = nl === 2 ? 'rgba(28,30,95,.3)' : 'rgba(255,140,80,.1)';
    ctx.fillRect(vx0 - 4, vy0 - 4, vx1 - vx0 + 8, vy1 - vy0 + 8);
  }
  if (nl === 2 && !VIS())
    bugs.forEach(b => {
      if (b.t === 'firefly') {
        const a = 0.25 + 0.25 * Math.sin(time * 4 + b.ph);
        ell(b.x, b.y - 18, 14, 14, `rgba(255,250,150,${a.toFixed(2)})`);
      }
    });
  if (STAR) {
    const s = STAR,
      a = Math.max(0, Math.min(1, s.t * 3, (2.6 - s.t) * 2));
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(s.x - s.vx * 0.6, s.y - s.vy * 0.6, s.x, s.y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,248,190,.95)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x - s.vx * 0.6, s.y - s.vy * 0.6);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    emoji('⭐', s.x, s.y, 18);
    ctx.globalAlpha = 1;
  }
}
