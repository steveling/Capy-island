// The drawing board outside: a 32x24 pixel-art picture to show off, seen by best friends who visit.
'use strict';

// ---------- DRAWING BOARD ----------
// A picture is 768 characters, one per pixel, row by row: '0' is blank paper, '1'-'f' are colours.
// A blank board is saved as ''. Only best friends see it (like the inside of the house): it's in the island
// snapshot for cloud (best-friends) visits and the friends-only cloud copy, never for island-code visitors.
// Grown-ups can switch off seeing friends' drawings on their child's phone (⚙️, cloud save).
const BW = 32,
  BH = 24,
  BOARD = { x: 812, y: 468 }; // the foot of the board's posts, between the garden and Berry's shop
// prettier-ignore
const BOARD_COLORS = ['#fffaf2', '#ffffff', '#3a2618', '#9a8f9e', '#ff4f6d', '#ff8cc6', '#ff9f43', '#ffd84d',
  '#5fd3a8', '#2f9e6b', '#6fb6ff', '#3d5fd9', '#b48cff', '#b7794a', '#ffd1a8', '#ffd0e6'];
const BOARD_RE = /^[0-9a-f]{768}$/;
const cleanBoard = v => (v === '' || (typeof v === 'string' && BOARD_RE.test(v)) ? v : null);
const blankBoard = () => '0'.repeat(BW * BH);
// 5x5 stamps, drawn in the chosen colour
const STAMPS_PX = {
  '💗': ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  '⭐': ['..X..', 'XXXXX', '.XXX.', '.X.X.', 'X...X'],
  '🌸': ['.X.X.', 'XX.XX', '..X..', 'XX.XX', '.X.X.'],
  '🙂': ['.X.X.', '.X.X.', '.....', 'X...X', '.XXX.']
};

// what the board outside shows: my own picture at home; a best friend's while visiting (if allowed)
function boardShown() {
  if (!ONV()) return S.board || '';
  const bd = MP.island.bd;
  return bd == null || !CL.boards ? null : bd;
}
// pictures are drawn once into a tiny 32x24 canvas and scaled up with crisp pixels
const boardCache = { key: null, cv: null };
function boardCanvas(str) {
  if (boardCache.key === str) return boardCache.cv;
  const cv = boardCache.cv || document.createElement('canvas');
  cv.width = BW;
  cv.height = BH;
  const g = cv.getContext('2d'),
    img = g.createImageData(BW, BH);
  const s = str || blankBoard();
  for (let i = 0; i < BW * BH; i++) {
    const c = BOARD_COLORS[parseInt(s[i], 16)] || BOARD_COLORS[0];
    img.data.set(
      [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255],
      i * 4
    );
  }
  g.putImageData(img, 0, 0);
  boardCache.key = str;
  boardCache.cv = cv;
  return cv;
}
function drawBoard() {
  const x = BOARD.x,
    y = BOARD.y,
    shown = boardShown(),
    fw = 104,
    fh = 80,
    top = y - 98;
  shadow(x + 4, y + 2, 60, 9);
  // posts and frame
  ctx.fillStyle = '#9a6337';
  [-44, 38].forEach(px => ctx.fillRect(x + px, y - 30, 6, 30));
  rr(x - fw / 2 - 2, top - 2, fw + 4, fh + 4, 7);
  ctx.fillStyle = '#7d4d2a';
  ctx.fill();
  rr(x - fw / 2, top, fw, fh, 6);
  ctx.fillStyle = vgrad(top, top + fh, '#c98b5b', '#a8703f');
  ctx.fill();
  // the picture, 3 world px per pixel
  const px = x - (BW * 3) / 2,
    py = top + 4;
  if (shown == null) {
    ctx.fillStyle = BOARD_COLORS[0];
    ctx.fillRect(px, py, BW * 3, BH * 3);
    emoji('🔒', x - 12, py + 36, 22);
    emoji('💕', x + 14, py + 36, 22);
  } else {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(boardCanvas(shown), px, py, BW * 3, BH * 3);
    ctx.restore();
    if (!shown && !ONV()) {
      ctx.fillStyle = '#b0487c';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎨 Tap to paint!', x, py + 36);
    }
  }
  // a little roof so it looks like a proper notice board
  ctx.fillStyle = '#ff8cc6';
  rr(x - fw / 2 - 6, top - 10, fw + 12, 10, 4);
  ctx.fill();
}
function boardHit(x, y) {
  return Math.abs(x - BOARD.x) < 58 && y > BOARD.y - 112 && y < BOARD.y + 6;
}
function boardAct() {
  if (!ONV()) return openPainter();
  const shown = boardShown();
  if (shown != null) return openBoardView(MP.island.name, shown);
  toast(
    MP.island.bd == null
      ? `Only ${hostName()}'s best friends can see this drawing! 💕`
      : "Friends' drawings are switched off. 🎨<br><small>Grown-ups: hold ⚙️</small>",
    3000
  );
}

// ----- looking at a best friend's picture
function openBoardView(name, str) {
  modal(
    `<h2>🎨 ${esc(name)}'s drawing</h2><canvas id="bview" class="bcv" width="${BW * 10}" height="${BH * 10}"></canvas>` +
      `<div class="row"><button class="btn" onclick="closeModal()">So pretty! 💕</button></div>`
  );
  const g = $('#bview').getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(boardCanvas(str), 0, 0, BW * 10, BH * 10);
}

// ----- painting my own board
const PT = { px: null, color: 2, tool: 'brush', big: false, undo: [], down: false, last: null, clear: 0 };
function openPainter() {
  if (VIS()) return;
  PT.px = [...(S.board || blankBoard())];
  PT.undo = [];
  PT.clear = 0;
  modal(
    `<h2>🎨 My drawing board</h2><canvas id="bpaint" class="bcv paint" width="${BW * 10}" height="${BH * 10}" aria-label="Drawing board"></canvas>` +
      `<div class="bpal">${BOARD_COLORS.map((c, i) => `<button class="bsw${i ? '' : ' paper'}" data-c="${i}" style="background:${c}" aria-label="${i ? 'Colour ' + i : 'Eraser'}">${i ? '' : '🧽'}</button>`).join('')}</div>` +
      `<div class="btools"><button data-t="brush" aria-label="Brush">✏️</button><button data-t="big" aria-label="Big brush">🖌️</button><button data-t="fill" aria-label="Fill">🪣</button>` +
      Object.keys(STAMPS_PX)
        .map(k => `<button data-t="stamp:${k}" aria-label="Stamp ${k}">${k}</button>`)
        .join('') +
      `<button data-t="undo" aria-label="Undo">↩️</button><button data-t="clear" aria-label="Clear">🗑️</button></div>` +
      `<div class="row"><button class="btn white" onclick="closeModal()">Cancel</button><button class="btn" id="bdone">Done 💕</button></div>`
  );
  const cv = $('#bpaint');
  cv.addEventListener('pointerdown', paintDown);
  cv.addEventListener('pointermove', paintMove);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    cv.addEventListener(ev, () => (PT.down = false))
  );
  document
    .querySelectorAll('.bpal .bsw')
    .forEach(b => (b.onclick = () => ((PT.color = +b.dataset.c), paintUI())));
  document.querySelectorAll('.btools button').forEach(b => (b.onclick = () => paintTool(b.dataset.t)));
  $('#bdone').onclick = paintDone;
  paintUI();
  paintRedraw();
}
function paintUI() {
  document.querySelectorAll('.bpal .bsw').forEach(b => b.classList.toggle('on', +b.dataset.c === PT.color));
  document
    .querySelectorAll('.btools button')
    .forEach(b =>
      b.classList.toggle(
        'on',
        b.dataset.t === PT.tool ||
          (b.dataset.t === 'big' && PT.tool === 'brush' && PT.big) ||
          (b.dataset.t === 'brush' && PT.tool === 'brush' && !PT.big)
      )
    );
  const c = $('.btools [data-t="clear"]');
  if (c) c.textContent = PT.clear ? 'Sure?' : '🗑️';
}
function paintTool(t) {
  if (t === 'undo') {
    if (PT.undo.length) PT.px = PT.undo.pop();
    paintRedraw();
    return;
  }
  if (t === 'clear') {
    // tap twice to clear, so it can't happen by accident
    if (!PT.clear) {
      PT.clear = 1;
      paintUI();
      return;
    }
    paintSnap();
    PT.px = [...blankBoard()];
    PT.clear = 0;
    SND.whoosh();
    paintRedraw();
    paintUI();
    return;
  }
  PT.clear = 0;
  if (t === 'big' || t === 'brush') {
    PT.tool = 'brush';
    PT.big = t === 'big';
  } else PT.tool = t;
  paintUI();
}
function paintSnap() {
  PT.undo.push(PT.px.slice());
  if (PT.undo.length > 30) PT.undo.shift();
}
function paintCell(ev) {
  const r = $('#bpaint').getBoundingClientRect();
  return [
    Math.max(0, Math.min(BW - 1, Math.floor(((ev.clientX - r.left) / r.width) * BW))),
    Math.max(0, Math.min(BH - 1, Math.floor(((ev.clientY - r.top) / r.height) * BH)))
  ];
}
const setPx = (x, y, c) => {
  if (x >= 0 && y >= 0 && x < BW && y < BH) PT.px[y * BW + x] = c.toString(16);
};
function paintDot(x, y) {
  setPx(x, y, PT.color);
  if (PT.big) {
    setPx(x + 1, y, PT.color);
    setPx(x, y + 1, PT.color);
    setPx(x + 1, y + 1, PT.color);
  }
}
function paintDown(ev) {
  ev.preventDefault();
  PT.clear = 0;
  paintUI();
  const [x, y] = paintCell(ev);
  paintSnap();
  if (PT.tool === 'fill') {
    paintFill(x, y);
    SND.water();
  } else if (PT.tool.startsWith('stamp:')) {
    STAMPS_PX[PT.tool.slice(6)].forEach((row, dy) =>
      [...row].forEach((ch, dx) => ch === 'X' && setPx(x + dx - 2, y + dy - 2, PT.color))
    );
    SND.pop();
  } else {
    PT.down = true;
    PT.last = [x, y];
    try {
      $('#bpaint').setPointerCapture(ev.pointerId);
    } catch (e) {}
    paintDot(x, y);
  }
  paintRedraw();
}
function paintMove(ev) {
  if (!PT.down) return;
  const [x, y] = paintCell(ev),
    [lx, ly] = PT.last,
    n = Math.max(Math.abs(x - lx), Math.abs(y - ly));
  // fill in the cells between two pointer events, so fast strokes don't leave gaps
  for (let i = 1; i <= n; i++)
    paintDot(Math.round(lx + ((x - lx) * i) / n), Math.round(ly + ((y - ly) * i) / n));
  PT.last = [x, y];
  paintRedraw();
}
function paintFill(x, y) {
  const from = PT.px[y * BW + x],
    to = PT.color.toString(16);
  if (from === to) return;
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= BW || cy >= BH || PT.px[cy * BW + cx] !== from) continue;
    PT.px[cy * BW + cx] = to;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}
function paintRedraw() {
  const cv = $('#bpaint');
  if (!cv) return;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(boardCanvas(PT.px.join('')), 0, 0, BW * 10, BH * 10);
  // faint grid so little fingers can see the pixels
  g.strokeStyle = 'rgba(122,42,85,.08)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < BW; i++) (g.moveTo(i * 10 + 0.5, 0), g.lineTo(i * 10 + 0.5, BH * 10));
  for (let j = 1; j < BH; j++) (g.moveTo(0, j * 10 + 0.5), g.lineTo(BW * 10, j * 10 + 0.5));
  g.stroke();
}
function paintDone() {
  const s = PT.px.join('');
  S.board = /^0+$/.test(s) ? '' : s;
  save();
  closeModal();
  SND.sparkle();
  toast(S.board ? 'Your drawing is up on the board! 🎨' : 'The board is blank again. 🎨');
}
