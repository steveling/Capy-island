// The per-frame render.
'use strict';

// ---------- RENDER ----------
function nameTag(x, y, name, col) {
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(name).width + 26;
  ctx.fillStyle = 'rgba(150,40,90,.2)';
  rr(x - w / 2 + 1.5, y - 9.5 + 2, w, 19, 9.5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  rr(x - w / 2, y - 9.5, w, 19, 9.5);
  ctx.fill();
  ctx.strokeStyle = (CAPY[col] || CAPY.pink).d;
  ctx.lineWidth = 2;
  ctx.stroke();
  ell(x - w / 2 + 10, y, 4.5, 4.5, (CAPY[col] || CAPY.pink).b);
  ctx.fillStyle = '#c2427f';
  ctx.fillText(name, x + 5, y + 0.5);
}
// a chat speech bubble whose tail points down at (x, y); returns its height so an emote can sit above it
function sayBubble(x, y, text, age) {
  ctx.save();
  ctx.font = 'bold 13px sans-serif';
  const maxW = 150,
    lines = [];
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !line) line = t;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] += '…';
  }
  const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 20,
    h = lines.length * 16 + 12,
    top = y - 7 - h;
  ctx.globalAlpha = age > SAY_T - 0.5 ? Math.max(0, (SAY_T - age) / 0.5) : 1;
  ctx.fillStyle = 'rgba(150,40,90,.18)';
  rr(x - w / 2 + 2, top + 2, w, h, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  rr(x - w / 2, top, w, h, 12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 8);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 6, y - 8);
  ctx.fill();
  ctx.strokeStyle = '#ff8cc6';
  ctx.lineWidth = 2;
  rr(x - w / 2, top, w, h, 12);
  ctx.stroke();
  ctx.fillStyle = '#7a2a55';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, top + 14 + i * 16, maxW));
  ctx.restore();
  return h + 7;
}
// an emote floats up from the player like smoke: a few puffs of the emoji, one after another, each one
// rising, swaying, growing a little and fading away
const EMO_PUFFS = 5,
  EMO_GAP = 0.22, // seconds between puffs
  EMO_RISE = 2.1, // seconds each puff is in the air
  EMO_LIFE = EMO_PUFFS * EMO_GAP + EMO_RISE;
function emoSmoke(x, y, list) {
  list.forEach(m => {
    for (let k = 0; k < EMO_PUFFS; k++) {
      const a = time - m.t - k * EMO_GAP;
      if (a < 0 || a > EMO_RISE) continue;
      const side = k % 2 ? 1 : -1,
        px = x + Math.sin(a * 2.4 + k * 1.9) * (5 + a * 10) + side * a * 9,
        py = y - a * 62 + a * a * 6,
        fade = a < 0.15 ? a / 0.15 : a > 0.8 ? 1 - (a - 0.8) / (EMO_RISE - 0.8) : 1;
      ctx.globalAlpha = Math.max(0, fade) * (k ? 0.85 : 1);
      emoji(m.e, px, py, (k ? 15 : 20) + a * 9);
    }
  });
  ctx.globalAlpha = 1;
}
function render() {
  if (!ISL_CV) buildIsland();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#5fbfe6';
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(
    DPR * SCALE,
    0,
    0,
    DPR * SCALE,
    DPR * (W / 2 - cam.x * SCALE),
    DPR * (H / 2 - cam.y * SCALE)
  );
  const vx0 = cam.x - W / 2 / SCALE,
    vy0 = cam.y - H / 2 / SCALE,
    vx1 = cam.x + W / 2 / SCALE,
    vy1 = cam.y + H / 2 / SCALE;
  if (!WG) {
    WG = ctx.createRadialGradient(CX, CY + 30, 420, CX, CY + 30, 1050);
    WG.addColorStop(0, '#96e6f5');
    WG.addColorStop(0.3, '#72ccef');
    WG.addColorStop(1, '#3c93d2');
  }
  ctx.fillStyle = WG;
  ctx.fillRect(vx0 - 4, vy0 - 4, vx1 - vx0 + 8, vy1 - vy0 + 8);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const wx = ((i * 173) % 1700) - 150 + Math.sin(time * 0.6 + i) * 14,
      wy = ((i * 97) % 1400) - 150;
    if (wx < vx0 - 20 || wx > vx1 + 20 || wy < vy0 - 20 || wy > vy1 + 20) continue;
    const a = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.7 + i * 1.3));
    ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(wx, wy, 10, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  // shoreline foam hugging the cliff base (south) and the beach edge (north)
  const fk = 1.012 + Math.sin(time * 1.5) * 0.006,
    ph = (time * 0.22) % 1;
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 6;
  islandPath(SRX, SRY, fk, 24);
  ctx.stroke();
  islandPath(SRX, SRY, fk, 0);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${(0.55 * (1 - ph)).toFixed(2)})`;
  ctx.lineWidth = 3;
  islandPath(SRX, SRY, 1.03 + ph * 0.06, 24);
  ctx.stroke();
  islandPath(SRX, SRY, 1.03 + ph * 0.06, 0);
  ctx.stroke();
  ctx.drawImage(ISL_CV, IB.x, IB.y, IB.w, IB.h);
  drawSpring();
  drawV4Ground();
  const I = ISL(),
    ents = [];
  TREES.forEach((t, i) => ents.push([t.y, () => drawTree(t, i)]));
  ents.push([HOUSE.y, () => drawHouse(HOUSE.x, HOUSE.y)]);
  ents.push([SHOP.y, () => drawShop(SHOP.x, SHOP.y)]);
  ents.push([SPRING.y, drawSpringSign]);
  ents.push([SIGN.y, drawSign]);
  ents.push([PLANE.y, drawPlane]);
  pushV4(ents);
  NEIGH.forEach(n => ents.push([n.y, () => drawNeighbor(n)]));
  const myCol = myColor(),
    tags = [];
  const drawPl = (x, y, face, moving, walk, soak, col, stack, acc) => {
    if (soak) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 80, y - 400, 160, 398);
      ctx.clip();
      drawCapy(x, y + 17, face, false, 0, col, stack, true, acc);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x + 6, y - 1, 30, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else drawCapy(x, y, face, moving, walk, col, stack, false, acc);
  };
  ents.push([P.y, () => drawPl(P.x, P.y, P.face, P.moving, P.walk, P.soak, myCol, S.stack, myAcc())]);
  const mpOn = MP.role === 'visitor' || MP.role === 'host';
  if (mpOn) {
    tags.push({ x: P.x, y: P.y, top: capyTop(S.stack.length, P.soak), name: S.name, col: myCol, id: 'me' });
    MP.players.forEach(r => {
      if (!r.buf.length) return;
      ents.push([r.y, () => drawPl(r.x, r.y, r.face, r.moving, r.walk, r.soak, r.color, r.stack, r.acc)]);
      tags.push({
        x: r.x,
        y: r.y,
        top: capyTop(r.stack.length, r.soak),
        name: r.name,
        col: r.color,
        id: r.id
      });
    });
  }
  (I.spring || []).forEach((id, i) => {
    if (id && ITEMS[id]) {
      const d = decoPos(i);
      ents.push([
        d.y,
        () => {
          shadow(d.x + 2, d.y + 1, 17, 5);
          drawItem(id, d.x, d.y - 14, 30);
        }
      ]);
    }
  });
  presList().forEach((a, i) => {
    const p = posAt(a);
    ents.push([
      p.y,
      () => {
        shadow(p.x + 2, p.y + 2, 17, 5);
        emoji('🎁', p.x, p.y - 12 + Math.sin(time * 3 + i) * 2, 28);
        if (Math.sin(time * 4 + i) > 0.7) emoji('✨', p.x + 14, p.y - 26, 12);
      }
    ]);
  });
  fpList().forEach((f, i) => {
    const p = posAt(f.a);
    ents.push([
      p.y,
      () => {
        drawGift(p.x, p.y, f.c, Math.sin(time * 3 + i + 1) * 1.5);
        if (Math.sin(time * 4 + i + 2) > 0.6) emoji('💖', p.x + 16, p.y - 30, 11);
      }
    ]);
  });
  bugs.forEach(b =>
    ents.push([
      b.y,
      () => {
        const it = ITEMS[b.t],
          h = it.fly ? 14 + Math.sin(b.ph * 4) * 4 : 4;
        shadow(b.x + 1, b.y + 1, it.fly ? 7 : 9, it.fly ? 2.5 : 3);
        ctx.save();
        ctx.translate(b.x, b.y - h);
        if (b.vx > 0) ctx.scale(-1, 1);
        emoji(it.e, 0, -6, it.fly ? 24 : 20, it.f);
        ctx.restore();
      }
    ])
  );
  ents.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  drawV4Top(vx0, vy0, vx1, vy1);
  if (P.moving && !P.act) {
    ctx.strokeStyle = 'rgba(255,95,168,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(P.tx, P.ty, 10, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // names, chat bubbles and emote smoke always on top so everyone can see them
  tags.forEach(t => {
    const ty = t.y + t.top - 8;
    nameTag(t.x, ty, t.name || 'Friend', t.col);
    let by = ty - 14;
    const say = MP.say.get(t.id);
    if (say && time - say.t < SAY_T) by -= sayBubble(t.x, by, say.x, time - say.t) + 6;
    const em = MP.emo.get(t.id);
    if (em) emoSmoke(t.x, by + 4, em); // rising from just above their name (and any chat bubble)
  });
  parts.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life);
    emoji(p.e, p.x, p.y, 18);
    ctx.globalAlpha = 1;
  });
  // soft ambient light: warm from the top-left, cooler bottom-right
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!AMB) {
    AMB = ctx.createLinearGradient(0, 0, W, H);
    AMB.addColorStop(0, 'rgba(255,246,215,.16)');
    AMB.addColorStop(0.5, 'rgba(255,255,255,0)');
    AMB.addColorStop(1, 'rgba(110,60,150,.12)');
  }
  ctx.fillStyle = AMB;
  ctx.fillRect(0, 0, W, H);
}
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    update(dt);
    render();
  } catch (e) {
    console.error(e);
  }
  requestAnimationFrame(loop);
}
