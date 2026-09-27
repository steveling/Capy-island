// Pointer input and the per-frame update loop.
'use strict';

// ---------- INPUT ----------
const cam = { x: P.x, y: P.y };
function toWorld(sx, sy) {
  return { x: (sx - W / 2) / SCALE + cam.x, y: (sy - H / 2) / SCALE + cam.y };
}
cv.addEventListener('pointerdown', ev => {
  if (busy) return;
  $('#emobar').classList.add('hidden');
  chatClose();
  if (talking) {
    closeTalk();
  }
  if (P.soak) leaveSpring();
  const w = toWorld(ev.clientX, ev.clientY);
  tapWorld(w.x, w.y);
});
function dockHit(x, y) {
  return (
    dist(x, y, SIGN.x, SIGN.y - 30) < 42 ||
    (Math.abs(x - PIER.x) < 26 && y > PIER.y - 14 && y < PIER.y + PIER.len) ||
    (Math.abs(x - PLANE.x) < 62 && Math.abs(y - (PLANE.y - 26)) < 36)
  );
}
function tapWorld(x, y) {
  if (tapSky(x, y)) return;
  if (ONV() && MP.offline && MP.island && dist(x, y, NAP.x, NAP.y - 24) < 58) {
    toast(`Shh... ${hostName()} is taking a nap 💤`);
    return;
  }
  for (const b of bugs)
    if (dist(x, y, b.x, b.y - 10) < 34) {
      P.act = { k: 'bug', b };
      return;
    }
  const pl = presList();
  for (let i = 0; i < pl.length; i++) {
    const p = posAt(pl[i]);
    if (dist(x, y, p.x, p.y - 12) < 34) {
      P.act = { k: 'present', i };
      setT(p.x, p.y + 8);
      return;
    }
  }
  const fl = fpList();
  for (let i = 0; i < fl.length; i++) {
    const p = posAt(fl[i].a);
    if (dist(x, y, p.x, p.y - 12) < 34) {
      P.act = { k: 'fpresent', i };
      setT(p.x, p.y + 8);
      return;
    }
  }
  for (const n of NEIGH)
    if (dist(x, y, n.x, n.y - 22) < 38) {
      P.act = { k: 'talk', n };
      return;
    }
  if (tapV4(x, y)) return;
  if (dockHit(x, y)) {
    P.act = { k: 'dock' };
    setT(DOCK.x, DOCK.y);
    return;
  }
  {
    const sx = (x - SPRING.x) / (SPRING.rx + 30),
      sy = (y - SPRING.y) / (SPRING.ry + 26);
    if (sx * sx + sy * sy < 1) {
      P.act = { k: 'spring' };
      setT(SPRING.x - SPRING.rx - 16, SPRING.y + 6);
      return;
    }
  }
  for (let i = 0; i < TREES.length; i++) {
    const t = TREES[i];
    if (dist(x, y, t.x, t.y - 58) < 48 || dist(x, y, t.x, t.y - 15) < 22) {
      P.act = { k: 'tree', i };
      setT(t.x + (P.x < t.x ? -34 : 34), t.y + 6);
      return;
    }
  }
  if (Math.abs(x - HOUSE.x) < 66 && y < HOUSE.y + 6 && y > HOUSE.y - 135) {
    P.act = { k: 'house' };
    setT(HOUSE.x, HOUSE.y + 22);
    return;
  }
  if (Math.abs(x - SHOP.x) < 66 && y < SHOP.y + 6 && y > SHOP.y - 130) {
    P.act = { k: 'shop' };
    setT(SHOP.x, SHOP.y + 22);
    return;
  }
  if (norm(x, y, SRX, SRY) > 1) {
    const e = edge(angleOf(x, y), SRX, SRY, 0.94);
    P.act = { k: 'fish' };
    setT(e.x, e.y);
    return;
  }
  P.act = null;
  setT(x, y);
}
function setT(x, y) {
  if (norm(x, y, SRX, SRY) > 0.95) {
    const e = edge(angleOf(x, y), SRX, SRY, 0.95);
    x = e.x;
    y = e.y;
  }
  P.tx = x;
  P.ty = y;
}
function posAt(a) {
  return edge(a, (SRX + GRX) / 2 + 6, (SRY + GRY) / 2 + 6, 1);
}
function presentPos(i) {
  return posAt(S.presents[i]);
}

// ---------- UPDATE ----------
function update(dt) {
  time += dt;
  napTick(dt);
  const a = P.act;
  if (a && a.k === 'bug') {
    if (!bugs.includes(a.b)) {
      P.act = null;
    } else {
      P.tx = a.b.x + (P.x < a.b.x ? -26 : 26);
      P.ty = a.b.y + 4;
      if (dist(P.x, P.y, a.b.x, a.b.y) < 48) {
        catchBug(a.b);
        P.act = null;
      }
    }
  } else if (a && a.k === 'talk') {
    P.tx = a.n.x + (P.x < a.n.x ? -46 : 46);
    P.ty = a.n.y + 2;
    if (dist(P.x, P.y, a.n.x, a.n.y) < 58) {
      P.act = null;
      P.tx = P.x;
      P.ty = P.y;
      openTalk(a.n);
    }
  }
  const dx = P.tx - P.x,
    dy = P.ty - P.y,
    d = Math.hypot(dx, dy),
    sp = 175 * spdMul();
  if (d > 3) {
    const s = Math.min(d, sp * dt);
    P.x += (dx / d) * s;
    P.y += (dy / d) * s;
    P.walk += dt * 12;
    P.moving = true;
    if (Math.abs(dx) > 2) P.face = dx > 0 ? 1 : -1;
  } else {
    P.moving = false;
    if (a && !['bug', 'talk'].includes(a.k)) {
      P.act = null;
      doAct(a);
    }
  }
  const vis = ONV();
  NEIGH.forEach((n, i) => {
    if (vis && !MP.offline) {
      const k = Math.min(1, dt * 8);
      n.x += (n.tx - n.x) * k;
      n.y += (n.ty - n.y) * k;
      return;
    }
    if (talking === n) {
      n.face = P.x > n.x ? 1 : -1;
      return;
    }
    const joins = !vis && P.soak && S.neigh[n.id].f >= 3;
    if (joins) {
      n.tx = SOAK[i].x;
      n.ty = SOAK[i].y;
    } else if (n.soak) {
      n.soak = false;
      n.tx = n.hx;
      n.ty = n.hy;
      n.wait = rnd(1, 3);
    }
    const ddx = n.tx - n.x,
      ddy = n.ty - n.y,
      dd = Math.hypot(ddx, ddy);
    if (dd > 2) {
      const s = Math.min(dd, (joins ? 70 : n.hi ? 160 : 38) * dt);
      n.x += (ddx / dd) * s;
      n.y += (ddy / dd) * s;
      if (Math.abs(ddx) > 1) n.face = ddx > 0 ? 1 : -1;
    } else if (joins) {
      n.soak = true;
      n.face = -1;
    } else if (n.hi) {
      n.hi = false;
      n.face = P.x > n.x ? 1 : -1;
    } else if ((n.wait -= dt) < 0) {
      n.wait = rnd(2, 6);
      n.tx = n.hx + rnd(-80, 80);
      n.ty = n.hy + rnd(-50, 50);
    }
  });
  if (!vis && !VIS() && P.soak && S.soakDay !== S.dayKey) {
    const want = NEIGH.filter(n => S.neigh[n.id].f >= 3),
      inn = want.filter(n => n.soak);
    if (want.length && inn.length === want.length) {
      S.soakDay = S.dayKey;
      inn.forEach(n => friend(n, 1));
      SND.heart();
      openSpring(`Ahhh... ♨️ ${inn.map(n => n.n).join(' and ')} came to soak with you! 💕 What a happy day!`);
      save();
    }
  }
  bugs.forEach(b => {
    const it = ITEMS[b.t];
    b.ph += dt;
    if ((b.ch -= dt) < 0) {
      b.ch = rnd(1, 3);
      const sp = it.fly ? 40 : 12,
        ang = rnd(0, 6.28);
      b.vx = Math.cos(ang) * sp;
      b.vy = Math.sin(ang) * sp;
    }
    if (b.flee > 0) {
      b.flee -= dt;
      const ex = b.x - P.x,
        ey = b.y - P.y,
        el = Math.hypot(ex, ey) || 1;
      b.vx = (ex / el) * 110;
      b.vy = (ey / el) * 110;
    }
    const nx = b.x + b.vx * dt,
      ny = b.y + b.vy * dt;
    if (norm(nx, ny, GRX, GRY) < 0.9) {
      b.x = nx;
      b.y = ny;
    } else {
      b.vx *= -1;
      b.vy *= -1;
    }
  });
  if (!VIS() && (bugTimer -= dt) < 0) {
    bugTimer = 10;
    if (bugs.length < 5) spawnBug();
  }
  updV4(dt);
  TREES.forEach(t => (t.shake = Math.max(0, t.shake - dt)));
  parts = parts.filter(p => (p.life -= dt) > 0);
  parts.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.fl ? -6 : 260) * dt;
  });
  mpUpdate(dt);
  cam.x += (P.x - cam.x) * Math.min(1, dt * 6);
  cam.y += (P.y - 40 + (talking ? 120 / SCALE : 0) - cam.y) * Math.min(1, dt * 6);
  const hw = W / 2 / SCALE,
    hh = H / 2 / SCALE;
  cam.x = Math.max(hw - 60, Math.min(1460 - hw, cam.x));
  cam.y = Math.max(hh - 60, Math.min(1180 - hh, cam.y));
}
