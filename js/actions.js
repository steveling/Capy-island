// Tapping things: trees, neighbours (talk), the hot spring and fishing.
'use strict';

// ---------- ACTIONS ----------
function hostName() {
  return esc(MP.island ? MP.island.name : '');
}
function doAct(a) {
  const vis = ONV();
  if (actV4(a)) return;
  if (a.k === 'tree') {
    const t = TREES[a.i];
    t.shake = 0.6;
    if (vis) {
      toast(
        `Those are ${hostName()}'s ${t.f === 'orange' ? 'oranges' : 'yuzu'}! ${ITEMS[t.f].e}<br>You can pick fruit on your own island.`
      );
      return;
    }
    const n = S.trees[a.i];
    if (n > 0) {
      S.trees[a.i] = 0;
      const first = addItem(t.f, n);
      burst(t.x, t.y - 60, ITEMS[t.f].e, n + 2);
      SND.pick();
      const h = S.stack.length;
      toast(
        `You picked ${n} ${ITEMS[t.f].n}! ${ITEMS[t.f].e}` +
          (first ? '<br>✨ New in your book!' : '') +
          (h >= 12
            ? `<br>WOW! ${h} fruit on your head! 🤣`
            : h >= 6
              ? `<br>You're balancing ${h} fruit on your head! 😆`
              : '')
      );
      save();
    } else toast('No fruit left. It will grow back tomorrow! 🌙');
  } else if (a.k === 'present') {
    if (vis) {
      toast(`That present is for ${hostName()}! 🎁`);
      return;
    }
    if (a.i >= S.presents.length) return;
    const p = presentPos(a.i);
    S.presents.splice(a.i, 1);
    openPresent(p);
    save();
  } else if (a.k === 'fpresent') {
    if (vis) {
      toast(`That present is for ${hostName()}! 💝`);
      return;
    }
    openFPresent(a.i);
  } else if (a.k === 'house') {
    if (vis) {
      if (MP.island.room) openHouse();
      else toast(`That's ${hostName()}'s house! 🏠`);
      return;
    }
    openHouse();
  } else if (a.k === 'shop') {
    if (vis) {
      toast('Berry says: "Come shopping on your own island!" 🦝');
      return;
    }
    openShop();
  } else if (a.k === 'fish') {
    if (vis) {
      toast('No fishing on a visit.<br>You can fish at home! 🎣');
      return;
    }
    startFish();
  } else if (a.k === 'spring') enterSpring();
  else if (a.k === 'dock') openDock();
}
function catchBug(b) {
  const it = ITEMS[b.t];
  if (lucky() || Math.random() < 0.85) {
    bugs.splice(bugs.indexOf(b), 1);
    const first = addItem(b.t);
    burst(b.x, b.y, '✨', 6);
    SND.bug();
    toast(`You caught a ${it.n}! ${ie(b.t)}` + (first ? '<br>✨ New in your book!' : ''));
    save();
  } else {
    b.flee = 1.2;
    SND.net();
    SND.oops();
    toast(`Oh no, the ${it.n} got away! Try again!`);
  }
}
function openPresent(p) {
  SND.present();
  burst(p.x, p.y, '🎉', 8);
  if (Math.random() < 0.55) {
    const c = pick([100, 150, 200, 250, 300]);
    S.coins += c;
    hud();
    modal(
      `<h2>🎁 A present!</h2><div style="text-align:center;font-size:60px">🪙</div><p style="text-align:center;font-size:20px;font-weight:800">It was full of coins!<br>+${c} coins</p><div class="row"><button class="btn" onclick="closeModal()">Yay!</button></div>`
    );
  } else {
    const id = Math.random() < 0.4 ? pick(PRESENT_ONLY) : pick(BUYABLE);
    const first = addItem(id);
    modal(
      `<h2>🎁 A present!</h2><div style="text-align:center;font-size:70px">${ie(id)}</div><p style="text-align:center;font-size:20px;font-weight:800">You got a ${ITEMS[id].n}!${first ? '<br>✨ New in your book!' : ''}</p><p style="text-align:center">Put it in your house! 🏠</p><div class="row"><button class="btn" onclick="closeModal()">Yay!</button></div>`
    );
  }
}
function openFPresent(i) {
  const p = S.fpresents[i];
  if (!p) return;
  S.fpresents.splice(i, 1);
  const id = ITEMS[p.item] && ITEMS[p.item].k === 'furn' ? p.item : pick(GIFT_POOL),
    first = addItem(id),
    pp = posAt(p.a);
  SND.present();
  burst(pp.x, pp.y, '💝', 8);
  save();
  modal(
    `<h2>🎁 From ${esc(p.from)}!</h2><div style="text-align:center;font-size:70px">${ie(id)}</div><p style="text-align:center;font-size:20px;font-weight:800">Your friend ${esc(p.from)} left you a ${ITEMS[id].n}!${first ? '<br>✨ New in your book!' : ''}</p><p style="text-align:center">Put it in your house! 🏠</p><div class="row"><button class="btn" onclick="closeModal()">Yay! 💕</button></div>`
  );
}

// ---------- TALK ----------
function hearts(f) {
  const full = Math.floor(f / 2);
  let s = '';
  for (let i = 0; i < 5; i++) s += i < full ? '💗' : '🤍';
  return s;
}
function openTalk(n, override) {
  voice(n.id);
  if (VIS()) {
    talking = n;
    const T = $('#talk');
    T.classList.remove('hidden');
    T.querySelector('.tn').textContent = n.e + ' ' + n.n;
    T.querySelector('.tt').innerHTML = pick(
      [
        `Hi ${esc(S.name)}! Welcome to ${hostName()}'s island! 🌸`,
        `Yay, a visitor! Hi ${esc(S.name)}! 💕`
      ].concat(n.lines)
    );
    T.querySelector('.th').textContent = '';
    const row = T.querySelector('.row');
    row.innerHTML = '';
    const bye = document.createElement('button');
    bye.className = 'btn white';
    bye.textContent = 'Bye! 👋';
    bye.onclick = closeTalk;
    row.appendChild(bye);
    return;
  }
  talking = n;
  const s = S.neigh[n.id];
  if (!s.talked) {
    s.talked = true;
    friend(n, 1);
  }
  const T = $('#talk');
  T.classList.remove('hidden');
  T.querySelector('.tn').textContent = n.e + ' ' + n.n;
  const row = T.querySelector('.row');
  row.innerHTML = '';
  let text = override;
  if (!text) {
    if (!s.done && s.req) {
      const it = ITEMS[s.req];
      text = `Hi ${esc(S.name)}! Could you bring me ${it.k === 'fruit' ? 'some' : 'a'} ${it.n} ${it.e}? That would make me so happy!`;
    } else text = pick(n.lines);
  }
  T.querySelector('.tt').innerHTML = text;
  T.querySelector('.th').textContent = 'Friendship ' + hearts(s.f);
  if (!s.done && s.req && S.bag[s.req] && !override) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'Give ' + ITEMS[s.req].e;
    b.onclick = () => give(n);
    row.appendChild(b);
  }
  const bye = document.createElement('button');
  bye.className = 'btn white';
  bye.textContent = 'Bye! 👋';
  bye.onclick = closeTalk;
  row.appendChild(bye);
  save();
}
function closeTalk() {
  talking = null;
  $('#talk').classList.add('hidden');
}
function friend(n, v) {
  const s = S.neigh[n.id];
  s.f = Math.min(10, s.f + v);
  burst(n.x, n.y - 40, '💗', 4);
  const a = NEIGH_ACC[n.id];
  if (s.f >= 7 && a && unlockAcc(a))
    setTimeout(
      () =>
        toast(
          `${n.e} ${n.n} made you ${a === 'shades' ? 'a pair of' : 'a'} ${ACCS[a].n}! 💕<br>Try it on at the mirror in your house 🪞`,
          3800
        ),
      900
    );
}
function give(n) {
  const s = S.neigh[n.id];
  if (!takeItem(s.req)) return;
  s.done = true;
  S.coins += 150;
  hud();
  friend(n, 2);
  SND.coin();
  let msg = `Thank you, ${esc(S.name)}!! 💕 Here are 150 coins!`;
  const thr = [4, 10];
  thr.forEach((t, i) => {
    const g = n.gifts[i];
    if (s.f >= t && !s.g.includes(g)) {
      s.g.push(g);
      addItem(g);
      msg += `<br>And I made you a present because we're friends: ${ITEMS[g].n} ${ITEMS[g].e}!`;
      SND.heart();
    }
  });
  openTalk(n, msg);
}

// ---------- HOT SPRING ----------
function enterSpring() {
  P.soak = true;
  if (ONV()) {
    const v = pick(VSOAK);
    P.x = v.x;
    P.y = v.y;
  } else {
    P.x = SPRING.x - 28;
    P.y = SPRING.y + 4;
  }
  P.tx = P.x;
  P.ty = P.y;
  P.face = 1;
  SND.splash();
  burst(P.x, P.y - 20, '💦', 5);
  openSpring();
}
function leaveSpring() {
  P.soak = false;
  P.x = SPRING.x - SPRING.rx - 16;
  P.y = SPRING.y + 6;
  P.tx = P.x;
  P.ty = P.y;
}
function openSpring(msg) {
  talking = 'spring';
  const T = $('#talk');
  T.classList.remove('hidden');
  T.querySelector('.tn').textContent = '♨️ Hot Spring';
  const row = T.querySelector('.row');
  row.innerHTML = '';
  const add = (t, f, c) => {
    const b = document.createElement('button');
    b.className = 'btn' + (c ? ' ' + c : '');
    b.textContent = t;
    b.onclick = f;
    row.appendChild(b);
  };
  if (ONV()) {
    T.querySelector('.tt').innerHTML = `Ahhh... so warm! ♨️ ${hostName()}'s hot spring is the best!`;
    T.querySelector('.th').textContent = '';
    add(
      'Get out',
      () => {
        closeTalk();
        leaveSpring();
      },
      'white'
    );
    return;
  }
  const fr = NEIGH.filter(n => S.neigh[n.id].f >= 3);
  T.querySelector('.tt').innerHTML =
    msg ||
    (fr.length
      ? `Ahhh... so warm! ${fr.map(n => n.e + ' ' + n.n).join(' and ')} ${fr.length > 1 ? 'are' : 'is'} coming to soak with you!`
      : `Ahhh... so warm! ♨️ Help your friends, and they'll come soak with you.`);
  T.querySelector('.th').textContent = S.yuzu ? `🍋 ${S.yuzu} yuzu floating in the water` : '';
  if (S.bag.yuzu) add('Toss in a yuzu 🍋', tossYuzu);
  add('Decorate 🏮', decoSpring);
  add(
    'Get out',
    () => {
      closeTalk();
      leaveSpring();
    },
    'white'
  );
}
function tossYuzu() {
  if (VIS() || !takeItem('yuzu')) return;
  S.yuzu++;
  SND.plop();
  burst(SPRING.x, SPRING.y - 10, '💛', 4);
  save();
  openSpring(
    pick([
      'Plop! Now the water smells like yuzu! 🍋',
      'Plop! A cozy yuzu bath! 💛',
      'Splash! Another yuzu for the spring!'
    ])
  );
}
function decoSpring() {
  if (VIS()) return;
  modal(
    `<h2>♨️ Decorate the Hot Spring</h2><p style="text-align:center">Tap a spot to put something there. Tap it again to put it away.</p><div class="grid" style="grid-template-columns:repeat(3,1fr)">${S.spring.map((id, i) => (id ? `<div class="cell" onclick="springSlot(${i})">${ie(id)}<small>${ITEMS[id].n}</small></div>` : `<div class="cell unk" onclick="springSlot(${i})">+</div>`)).join('')}</div><div class="row"><button class="btn" onclick="closeModal();if(P.soak)openSpring()">Done</button></div>`
  );
}
window.springSlot = i => {
  if (VIS()) return;
  const id = S.spring[i];
  if (id) {
    S.spring[i] = null;
    addItem(id);
    SND.lift();
    save();
    decoSpring();
    return;
  }
  const fk = Object.keys(S.bag).filter(placeable);
  if (!fk.length) {
    toast('No furniture in your bag yet! Try the shop 🦝');
    return;
  }
  modal(
    `<h2>What goes here?</h2><div class="grid">${fk.map(k => `<div class="cell" onclick="placeSpring(${i},'${k}')">${ie(k)}<small>${ITEMS[k].n}</small><span class="cnt">${S.bag[k]}</span></div>`).join('')}</div><div class="row"><button class="btn white" onclick="decoSpring()">Back</button></div>`
  );
};
window.placeSpring = (i, k) => {
  if (VIS() || !takeItem(k)) return;
  S.spring[i] = k;
  SND.thunk();
  save();
  decoSpring();
};

// ---------- FISHING ----------
let F = null;
// how one cast plays out: 0-3 fake-out nibbles at random moments, then the bite somewhere between 1.5 and 6.5
// seconds (the average of two random numbers, so usually around 3-5), and a bite window that varies a little too
function fishPlan(r = Math.random) {
  const bite = 1.5 + (5 * (r() + r())) / 2,
    nibbles = [];
  for (let i = Math.floor(r() * 4); i > 0; i--) if (bite > 1.2) nibbles.push(0.6 + r() * (bite - 1));
  nibbles.sort((a, b) => a - b);
  return { nibbles: nibbles.filter((t, i) => !i || t - nibbles[i - 1] > 0.3), bite, window: 1.4 + r() * 0.5 };
}
function fishLater(ms, fn) {
  const t = setTimeout(() => {
    if (F && F.ts.includes(t)) fn();
  }, ms);
  F.ts.push(t);
}
function fishStop() {
  if (F) F.ts.forEach(clearTimeout);
  F = null;
}
function startFish() {
  if (VIS()) return;
  busy = true;
  closeTalk();
  $('#fish').classList.remove('hidden');
  fishWait();
  requestAnimationFrame(fishDraw);
}
const bob = t => ($('#bobber').style.transform = t);
function fishWait() {
  const bend = F ? F.bend : 0; // the rod eases back rather than snapping straight
  fishStop();
  const plan = fishPlan(),
    CAST = 450; // ms for the bobber to fly out from the rod tip
  F = { st: 'wait', ts: [], plan, bend };
  $('#fmsg').textContent = 'Wait for the fish to bite...';
  $('#fbtn').classList.remove('bite');
  $('#bobber').textContent = '🔴';
  bob('translate(-50%,-50%)');
  // cast: the bobber flies from the rod tip to the middle of the water
  const w = $('#fwater'),
    b = $('#bobber');
  b.style.setProperty('--cx', w.clientWidth * 0.3 + 'px');
  b.style.setProperty('--cy', -w.clientHeight * 0.36 + 'px');
  b.classList.remove('cast');
  void b.offsetWidth;
  b.classList.add('cast');
  SND.cast();
  fishLater(CAST, () => {
    b.classList.remove('cast');
    SND.plop();
  });
  plan.nibbles.forEach(t =>
    fishLater(CAST + t * 1000, () => {
      if (F.st !== 'wait') return;
      bob('translate(-50%,-38%)');
      SND.nibble();
      fishLater(150, () => F.st === 'wait' && bob('translate(-50%,-50%)'));
    })
  );
  fishLater(CAST + plan.bite * 1000, () => {
    F.st = 'bite';
    $('#fmsg').textContent = 'SPLASH! Tap now! 🎣';
    $('#fbtn').classList.add('bite');
    bob('translate(-50%,-10%) scale(.8)');
    SND.bite();
    fishLater(plan.window * 1000, () => {
      if (F.st !== 'bite') return;
      F.st = 'miss';
      $('#fmsg').textContent = 'It swam away... try again!';
      $('#fbtn').classList.remove('bite');
      bob('translate(-50%,-50%)');
      SND.away();
      fishLater(1300, fishWait);
    });
  });
}
function reel() {
  if (!F) return;
  if (F.st === 'wait') {
    fishStop();
    F = { st: 'early', ts: [], bend: 0 };
    $('#fmsg').textContent = 'Too early! Wait for the splash.';
    SND.oops();
    fishLater(1300, fishWait);
  } else if (F.st === 'bite') {
    fishStop();
    F = { st: 'got', ts: [], bend: 1 };
    const id = weighted('fish'),
      it = ITEMS[id],
      first = addItem(id);
    SND.reel();
    $('#fbtn').classList.remove('bite');
    $('#fmsg').innerHTML = `You caught a ${it.n}! ${ie(id)}` + (first ? '<br>✨ New in your book!' : '');
    $('#bobber').innerHTML = ie(id);
    bob('translate(-50%,-50%)');
    save();
    fishLater(1800, fishWait);
  }
}
// the rod (coming in from the bottom-right corner) and its line down to the bobber, redrawn every frame so
// the line follows the bobber as it's cast, nibbles and bites. On a bite the rod bends and the line pulls tight.
function fishDraw() {
  if ($('#fish').classList.contains('hidden')) return;
  requestAnimationFrame(fishDraw);
  const w = $('#fwater'),
    W = w.clientWidth,
    H = w.clientHeight,
    r = w.getBoundingClientRect(),
    b = $('#bobber').getBoundingClientRect();
  if (F) F.bend += ((F.st === 'bite' || F.st === 'got' ? 1 : 0) - F.bend) * 0.25;
  const k = F ? F.bend : 0,
    base = [W + 6, H + 24],
    tip = [W * 0.8 - k * 16, H * 0.14 + k * 30],
    bx = b.left + b.width / 2 - r.left - w.clientLeft,
    by = b.top - r.top - w.clientTop + b.height * 0.28,
    sag = 34 * (1 - k) + 4;
  const q = (a, c, e) => `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${e[0]},${e[1]}`;
  $('#rodline').setAttribute('d', q(tip, [(tip[0] + bx) / 2, (tip[1] + by) / 2 + sag], [bx, by]));
  $('#rodpole').setAttribute('d', q(base, [W * 0.97, H * 0.5 + k * 12], tip));
  $('#rodhandle').setAttribute('d', q(base, [W * 0.99, H * 0.9], [W * 0.95, H * 0.72]));
  const reelAt = [W * 0.955, H * 0.76];
  $('#rodreel').setAttribute('cx', reelAt[0]);
  $('#rodreel').setAttribute('cy', reelAt[1]);
}
$('#fbtn').onclick = reel;
$('#fwater').onclick = reel;
$('#fcancel').onclick = () => {
  fishStop();
  busy = false;
  $('#fish').classList.add('hidden');
  $('#bobber').textContent = '🔴';
};
