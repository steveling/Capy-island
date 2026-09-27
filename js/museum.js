// Inside the museum, the café, Fennel's art boat, the mirror, and the what's-new screen.
'use strict';

// ----- MUSEUM (inside) -----
let MV = 'bug',
  msay = '',
  mwho = '',
  newCase = null;
const DONATE_LINES = [
  "Hoo-hoo! A {n}! How marvelous! I'll put it on display right away!",
  'Oh my feathers! A {n}! Thank you so much, {name}!',
  'Splendid! The museum just got even better with this {n}!',
  'Hoo! A {n}! Everyone will love to see it! 💕',
  "Wonderful, wonderful! I'll give the {n} the very best spot!"
];
function museumData() {
  return ONV() ? MP.island.mu || null : S.mu;
}
function museumHello() {
  const fq = S.bag.fossilq || 0,
    n = Object.keys(S.mu).length;
  if (fq)
    return `Hoo-hoo! Is that ${fq > 1 ? 'some mystery fossils' : 'a mystery fossil'} 🦴? Tap <b>Identify</b> and I'll tell you what ${fq > 1 ? 'they are' : 'it is'}!`;
  return n
    ? pick([
        `Welcome back, ${esc(S.name)}! Bring me bugs, fish, fossils, sea creatures, and art! 🦉`,
        `Hoo! The museum has ${n} treasure${n > 1 ? 's' : ''} now, thanks to you! 💕`
      ])
    : `Hoo-hoo! Welcome to the museum, ${esc(S.name)}! I'm Professor Hoot. Bring me bugs, fish, fossils, sea creatures, and art, and I'll put them on display! 🦉`;
}
window.openMuseum = v => {
  closeTalk();
  busy = true;
  MV = v || 'bug';
  const mu = museumData();
  mwho = MV === 'cafe' ? 'Bijou' : 'Professor Hoot';
  msay =
    MV === 'cafe'
      ? cafeHello()
      : ONV()
        ? mu
          ? `Hoo-hoo! Welcome to ${hostName()}'s museum! Have a look around! 🦉`
          : `Hoo... ${hostName()} is napping, so the museum is resting too. 💤 Come back when they're playing!`
        : museumHello();
  $('#museum').classList.remove('hidden');
  document.body.classList.add('inmus');
  drawMuseumView();
};
window.closeMuseum = () => {
  $('#museum').classList.add('hidden');
  document.body.classList.remove('inmus');
  busy = false;
  P.x = P.tx = MV === 'cafe' ? ANNEX.x + 14 : MUSEUM.x;
  P.y = P.ty = MUSEUM.y + 22;
};
window.mvTab = k => {
  MV = k;
  mwho = k === 'cafe' ? 'Bijou' : 'Professor Hoot';
  msay =
    k === 'cafe'
      ? cafeHello()
      : ONV()
        ? museumData()
          ? `This is ${hostName()}'s ${WINGS.find(w => w[0] === k)[2]} room! 🦉`
          : msay
        : wingLine(k);
  drawMuseumView();
};
function wingLine(k) {
  const l = ids(k),
    d = l.filter(i => S.mu[i]).length,
    w = WINGS.find(x => x[0] === k)[2];
  if (d === l.length) return `The ${w} room is complete! You're amazing, ${esc(S.name)}! 🏆`;
  const tip = {
    bug: 'Bugs come out at different times of day and in different months. Keep looking!',
    fish: 'Fish change with the seasons, and some only bite at night! 🌙',
    fossil: 'Dig up the ⭐ cracks on the grass with your shovel to find fossils! 🪏',
    sea: 'Tap the sparkly tide pools on the beach to find sea creatures! 🌊',
    art: 'Fennel the fox sails in with paintings on some days. Watch the beach! 🦊'
  }[k];
  return `The ${w} room has ${d} of ${l.length}. ${tip}`;
}
function drawMuseumView() {
  const el = $('#museum'),
    vis = ONV(),
    mu = museumData() || {},
    cafe = MV === 'cafe';
  const nb = NEIGH.find(n => mwho === n.e + ' ' + n.n);
  let h = `<div class="mtop"><div class="npc">${nb ? `<span class="npce">${nb.e}</span>` : cafe ? PIGEON_SVG : OWL_SVG}</div><div class="say"><b>${mwho}</b><span id="msay">${msay}</span></div></div>`;
  h +=
    '<div class="tabs mt">' +
    WINGS.map(([k, e]) => {
      const l = ids(k),
        d = l.filter(i => mu[i]).length;
      return `<button class="btn ${MV === k ? '' : 'off'}" onclick="mvTab('${k}')">${e}<small>${d}/${l.length}</small></button>`;
    }).join('') +
    `<button class="btn ${cafe ? '' : 'off'}" onclick="mvTab('cafe')">☕<small>Café</small></button></div>`;
  if (cafe) h += cafeHtml();
  else {
    const l = ids(MV),
      w = WINGS.find(x => x[0] === MV),
      d = l.filter(i => mu[i]).length;
    h +=
      `<div class="wing w-${MV}"><div class="wt">${w[1]} ${w[2]} <span>${d} / ${l.length}${d === l.length ? ' 🏆' : ''}</span></div><div class="cases">` +
      l
        .map(i => {
          const got = !!mu[i];
          return `<div class="case ${got ? '' : 'empty'} ${newCase === i ? 'new' : ''}" data-id="${i}" onclick="caseTap('${i}')">${got ? ie(i) : `<div class="sil">${ie(i)}</div><b class="q">?</b>`}<small>${got || (!vis && S.found[i]) ? esc(ITEMS[i].n) : '???'}</small></div>`;
        })
        .join('') +
      '</div></div>';
    if (!vis) {
      const n = Object.keys(S.mu).length;
      h += `<p class="mnote">🏛️ ${n} donation${n === 1 ? '' : 's'} · next present at ${(S.muGift + 1) * 10}</p>`;
    }
  }
  const fq = S.bag.fossilq || 0;
  h +=
    '<div class="row mbtns">' +
    (vis || cafe
      ? ''
      : `<button class="btn" onclick="donateView()">Donate 🎁</button>` +
        (fq ? `<button class="btn" onclick="identify()">Identify 🦴×${fq}</button>` : '')) +
    `<button class="btn white" onclick="closeMuseum()">Leave 🚪</button></div>`;
  el.innerHTML = h;
  newCase = null;
}
window.caseTap = i => {
  const it = ITEMS[i],
    mu = museumData() || {};
  if (!it) return;
  if (mu[i])
    msay = pick([
      `Ah, the ${esc(it.n)}! ${ie(i)} Isn't it wonderful?`,
      `The ${esc(it.n)} ${ie(i)} is one of my favorites! Hoo!`,
      `Look at the ${esc(it.n)}! ${ie(i)} So lovely!`
    ]);
  else {
    const w = whenTxt(i);
    msay =
      `Hoo! We don't have ${!ONV() && S.found[i] ? 'a ' + esc(it.n) : 'this one'} yet. ` +
      (w
        ? `Look for it: ${w}.`
        : it.k === 'fossil'
          ? 'Dig up ⭐ cracks to find fossils!'
          : it.k === 'art'
            ? 'Fennel the fox sometimes sells art at the beach! 🦊'
            : '');
  }
  mwho = 'Professor Hoot';
  drawMuseumView();
};
window.donateView = () => {
  if (VIS()) return;
  const l = Object.keys(S.bag)
    .filter(k => ITEMS[k] && WK.includes(ITEMS[k].k))
    .sort((a, b) => WK.indexOf(ITEMS[a].k) - WK.indexOf(ITEMS[b].k) || (S.mu[a] ? 1 : 0) - (S.mu[b] ? 1 : 0));
  let h = '<h2>🎁 Donate to the museum</h2>';
  if (!l.length)
    h +=
      '<p class="c">You have nothing to donate yet!<br>Catch bugs 🦋 and fish 🐟, dig up ⭐ cracks, look in the tide pools 🌊, or buy art from Fennel 🦊.</p>';
  else
    h +=
      '<div class="list">' +
      l
        .map(k => {
          const done = !!S.mu[k];
          return `<div class="li"><span class="e">${ie(k)}</span><span class="t">${esc(ITEMS[k].n)}${S.bag[k] > 1 ? ' ×' + S.bag[k] : ''}<small>${done ? '🏛️ Already in the museum' : '✨ New for the museum!'}</small></span><button class="btn ${done ? 'white' : ''}" onclick="donate('${k}')">${done ? 'Ask 🦉' : 'Donate'}</button></div>`;
        })
        .join('') +
      '</div>';
  modal(
    h + '<div class="row"><button class="btn white" onclick="closeModal();busy=true">Back</button></div>'
  );
};
window.donate = k => {
  if (VIS() || !ITEMS[k] || !WK.includes(ITEMS[k].k)) return;
  const it = ITEMS[k];
  closeModal();
  busy = true;
  MV = it.k;
  mwho = 'Professor Hoot';
  if (S.mu[k]) {
    msay = `Hoo! We already have a ${esc(it.n)} ${ie(k)} in the museum. You can keep this one, or sell it to Berry! 🦝`;
    drawMuseumView();
    return;
  }
  if (!takeItem(k)) return;
  S.mu[k] = S.day || 1;
  newCase = k;
  SND.yay();
  msay = pick(DONATE_LINES)
    .replace('{n}', esc(it.n) + ' ' + ie(k))
    .replace('{name}', esc(S.name));
  const rw = museumRewards(it.k);
  save();
  drawMuseumView();
  if (rw.length) setTimeout(() => celebrate(rw), 700);
};
function museumRewards(kind) {
  const out = [],
    n = Object.keys(S.mu).length;
  while (n >= (S.muGift + 1) * 10) {
    S.muGift++;
    out.push(
      Object.assign({ why: `🏛️ ${S.muGift * 10} donations!` }, MILESTONE[S.muGift - 1] || { coins: 500 })
    );
  }
  if (!S.muWing[kind] && ids(kind).every(i => S.mu[i])) {
    const first = !Object.keys(S.muWing).length;
    S.muWing[kind] = 1;
    out.push({
      why: `🏆 The ${WINGS.find(w => w[0] === kind)[2]} room is complete!`,
      item: 'tr_' + kind,
      acc: first ? 'crown' : null,
      big: 1
    });
  }
  out.forEach(r => {
    if (r.coins) {
      S.coins += r.coins;
      hud();
    }
    if (r.item) addItem(r.item);
    if (r.acc && !unlockAcc(r.acc)) r.acc = null;
  });
  return out;
}
function celebrate(rs) {
  SND.yay();
  setTimeout(() => SND.yay(), 380);
  const big = rs.some(r => r.big),
    who = rs[0].who || 'Professor Hoot';
  let h = `<div class="confetti">${Array.from({ length: 20 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 7) * 0.1}s;background:${['#ff8cc6', '#ffd84d', '#8fd3f0', '#b48cff', '#5fd3a8'][i % 5]}"></i>`).join('')}</div><h2>${big ? '🏆 Hooray! 🏆' : '🎉 Thank you! 🎉'}</h2>`;
  rs.forEach(r => {
    h +=
      `<p class="c" style="font-size:18px;margin:6px 0">${r.why}</p><div class="rw">` +
      (r.item ? `<div class="cell">${ie(r.item)}<small>${esc(ITEMS[r.item].n)}</small></div>` : '') +
      (r.acc ? `<div class="cell">${accCv(r.acc)}<small>${ACCS[r.acc].n}</small></div>` : '') +
      (r.coins ? `<div class="cell">🪙<small>+${r.coins} coins</small></div>` : '') +
      '</div>';
  });
  const tips = [];
  if (rs.some(r => r.item === 'cafetable')) tips.push('Put the café table by your hot spring! ♨️');
  else if (rs.some(r => r.item)) tips.push('Put it in your house! 🏠');
  if (rs.some(r => r.acc)) tips.push('Try it on at your mirror! 🪞');
  h += `<p class="c">${who}: "${who === 'Bijou' ? 'Coo-coo! A present for my best customer!' : `Hoo-hoo! This is for you, ${esc(S.name)}!`}"<br>${tips.join(' ')}</p><div class="row"><button class="btn" onclick="closeModal();busy=!$('#museum').classList.contains('hidden')||!$('#house').classList.contains('hidden')">Yay! 💕</button></div>`;
  modal(h);
  paintAccCanvases();
}
window.identify = () => {
  if (VIS()) return;
  const got = [];
  while (S.bag.fossilq) {
    takeItem('fossilq');
    const all = ids('fossil'),
      nd = all.filter(i => !S.mu[i]),
      fresh = nd.filter(i => !S.bag[i] && !got.includes(i));
    const id = pick(fresh.length ? fresh : nd.length ? nd : all);
    addItem(id);
    got.push(id);
  }
  if (!got.length) return;
  SND.yay();
  save();
  MV = 'fossil';
  mwho = 'Professor Hoot';
  msay =
    (got.length === 1
      ? `Hoo-hoo! Let me see... It's a <b>${esc(ITEMS[got[0]].n)}</b>! ${ie(got[0])}`
      : `Hoo-hoo! Let me see... ${got.map(i => ie(i)).join(' ')} What wonderful fossils!`) +
    ` Tap <b>Donate</b> to put ${got.length > 1 ? 'them' : 'it'} on display! 🦉`;
  drawMuseumView();
};

// ----- CAFÉ -----
function drinkFx() {
  const d = S.drink;
  if (!d || d.day !== S.day) return null;
  const m = CAFE_MENU.find(x => x.id === d.id);
  return m ? m.fx : null;
}
function spdMul() {
  const f = drinkFx();
  return f && f.speed && !VIS() ? f.speed : 1;
}
function lucky() {
  const f = drinkFx();
  return !!(f && f.lucky);
}
function drinkIcon(m) {
  return `<span class="drink"><span class="ei"${m.f ? ` style="filter:${m.f}"` : ''}>${m.e}</span>${m.x ? `<span class="dx">${m.x}</span>` : ''}</span>`;
}
function cafeHello() {
  if (ONV()) return `Coo-coo! Welcome to ${hostName()}'s café! Come have a drink on your own island! ☕`;
  return pick([
    `Coo-coo! Welcome, ${esc(S.name)}! What can I make for you today? ☕`,
    'Coo! Fresh drinks, made with love! 💕',
    "Coo-coo! Try the Yuzu Hot Chocolate. It's my favorite! 🍋"
  ]);
}
function cafeGuests() {
  if (ONV()) return [null, null, null];
  let s = 7;
  for (const c of String(S.day) + S.name) s = (s * 31 + c.charCodeAt(0)) % 9973;
  return NEIGH.map((n, i) => ((s >> i) & 1 || (s + i) % 4 === 0 ? n : null));
}
function cafeHtml() {
  const vis = ONV(),
    dk = !vis && S.drink && S.drink.day === S.day && CAFE_MENU.find(x => x.id === S.drink.id);
  let h =
    '<div class="cafe"><div class="list">' +
    CAFE_MENU.map(
      m =>
        `<div class="li">${drinkIcon(m)}<span class="t">${m.n}<small>🪙 ${m.p}</small></span><button class="btn" ${vis || S.coins < m.p ? 'disabled' : ''} onclick="buyDrink('${m.id}')">${vis ? '☕' : 'Buy'}</button></div>`
    ).join('') +
    '</div>';
  if (dk) h += `<p class="mnote">Today's drink: ${drinkIcon(dk)} ${dk.n}</p>`;
  if (!vis) {
    const st = S.cafe.st;
    h += `<div class="stampcard"><b>☕ Bijou's stamp card</b><div class="stamps">${Array.from({ length: 5 }, (_, i) => `<span class="${i < st ? 'on' : ''}">${i < st ? '🐾' : i + 1}</span>`).join('')}</div><small>One stamp a day. 5 stamps = a present! 🎁</small></div>`;
  }
  const who = cafeGuests();
  h +=
    '<div class="tables">' +
    who
      .map(
        n =>
          `<div class="tbl" ${n ? `onclick="cafeChat('${n.id}')"` : ''}>${n ? `<span class="guest">${n.e}</span>` : '<span class="guest empty">🪑</span>'}<span class="top">${n ? '☕' : ''}</span></div>`
      )
      .join('') +
    '</div>';
  return h + '</div>';
}
const CAFE_LINES = {
  mochi: [
    'This cocoa is so warm! My ears are toasty! 🐰',
    'I come here every day to watch the clouds from the window!',
    'Bijou makes the best drinks on the whole island!'
  ],
  pip: [
    'Tweet! I like my strawberry milk extra pink!',
    'I sing better after a yuzu tea! Tweet tweet!',
    'Did you see the museum? The fish tanks are so pretty!'
  ],
  puddle: [
    'Quack! A café inside a museum! How fancy!',
    'I ordered a Capy-ccino. It has a little heart on top! 💗',
    'Professor Hoot told me a fossil fact. I forgot it already! Quack!'
  ]
};
window.cafeChat = id => {
  if (VIS()) return;
  const n = NEIGH.find(x => x.id === id);
  if (!n) return;
  const s = S.neigh[id];
  if (!s.talked) {
    s.talked = true;
    friend(n, 1);
    save();
  }
  mwho = n.e + ' ' + n.n;
  msay = pick(CAFE_LINES[id]);
  drawMuseumView();
};
window.buyDrink = id => {
  if (VIS()) return;
  const m = CAFE_MENU.find(x => x.id === id);
  if (!m || S.coins < m.p) return;
  S.coins -= m.p;
  hud();
  S.drink = { id, day: S.day };
  SND.coin();
  let stamp = false,
    card = null;
  if (S.cafe.last !== S.day) {
    S.cafe.last = S.day;
    S.cafe.st++;
    stamp = true;
    if (S.cafe.st >= 5) {
      S.cafe.st = 0;
      S.cafe.cards++;
      card = CAFE_REWARDS[S.cafe.cards - 1] || { coins: 300 };
    }
  }
  mwho = 'Bijou';
  msay = `Here's your ${m.n}! ${drinkIcon(m)} ${m.say}` + (stamp && !card ? ' I stamped your card! 🐾' : '');
  if (card) {
    if (card.item) addItem(card.item);
    if (card.coins) {
      S.coins += card.coins;
      hud();
    }
    if (card.acc && !unlockAcc(card.acc)) card = Object.assign({}, card, { acc: null });
  }
  save();
  drawMuseumView();
  if (card)
    setTimeout(
      () => celebrate([Object.assign({ why: '☕ Your stamp card is full!', who: 'Bijou' }, card)]),
      650
    );
};

// ----- Fennel's art boat -----
function artHere() {
  return !!(S.art && S.art.here && S.art.day === S.day);
}
window.openArt = () => {
  if (VIS()) return;
  closeTalk();
  const st = S.art.stock || [];
  let h = `<div class="mtop"><div class="npc">${FOX_SVG}</div><div class="say"><b>Fennel</b>${st.length ? `Hello, darling ${esc(S.name)}! Every painting on my boat is 100% real. Pick your favorite! 🎨` : "All sold out! Thank you, darling! I'll sail back another day! ⛵"}</div></div>`;
  h +=
    '<div class="list">' +
    st
      .map(
        id =>
          `<div class="li"><span class="e">${ie(id)}</span><span class="t">${esc(ITEMS[id].n)}<small>🪙 ${ITEMS[id].buy}${S.mu[id] ? ' · 🏛️ in your museum' : ''}</small></span><button class="btn" ${S.coins < ITEMS[id].buy ? 'disabled' : ''} onclick="buyArt('${id}')">Buy</button></div>`
      )
      .join('') +
    '</div>';
  modal(
    h + '<div class="row"><button class="btn white" onclick="closeModal()">Bye, Fennel! 👋</button></div>'
  );
};
window.buyArt = id => {
  if (VIS()) return;
  const st = S.art.stock || [],
    i = st.indexOf(id);
  if (i < 0 || !ITEMS[id] || S.coins < ITEMS[id].buy) return;
  S.coins -= ITEMS[id].buy;
  st.splice(i, 1);
  const first = addItem(id);
  SND.yay();
  hud();
  save();
  openArt();
  toast(
    `You bought ${esc(ITEMS[id].n)}! ${ie(id)}<br>Donate it to the museum or hang it at home! 🖼️` +
      (first ? '<br>✨ New in your book!' : ''),
    3200
  );
};

// ----- MIRROR: colour + accessories -----
window.openMirror = () => {
  if (VIS()) return;
  const inHouse = !$('#house').classList.contains('hidden');
  let h = `<h2>🪞 Mirror</h2><canvas id="mirc" width="400" height="300"></canvas><h3>My color</h3><div class="sws">${COLOR_ORDER.map(k => `<button class="sw ${myColor() === k ? 'on' : ''}" title="${CAPY[k].n}" aria-label="${CAPY[k].n}" style="background:${CAPY[k].b}" onclick="setLook('${k}',null)"></button>`).join('')}</div>
 <h3>Accessories</h3><div class="grid accg">${Object.keys(ACCS)
   .map(a => {
     const A = ACCS[a],
       got = !!S.accs[a];
     return `<div class="cell ${myAcc() === a ? 'on' : ''} ${got ? '' : 'locked'}" onclick="${got ? `setLook(null,'${a}')` : `accTip('${a}')`}">${accCv(a)}<small>${got ? A.n : '🔒 ' + A.h}</small></div>`;
   })
   .join('')}</div>
 <div class="row"><button class="btn white" onclick="openEmotes('mirror')">😊 My emotes</button><button class="btn" onclick="closeModal();${inHouse ? 'busy=true' : ''}">Done 💕</button></div>`;
  modal(h);
  drawMirror();
  paintAccCanvases();
};
window.accTip = a => toast('🔒 ' + ACCS[a].h, 3000);
function drawMirror() {
  const c = $('#mirc');
  if (!c) return;
  const g = c.getContext('2d');
  g.setTransform(3.6, 0, 0, 3.6, 0, 0);
  g.clearRect(0, 0, 120, 90);
  const old = ctx;
  ctx = g;
  try {
    drawCapy(50, 72, 1, false, 0, myColor(), [], false, myAcc());
  } finally {
    ctx = old;
  }
}
window.setLook = (c, a) => {
  if (VIS()) return;
  if (c && CAPY[c]) S.color = c;
  if (a && ACCS[a] && S.accs[a]) S.acc = a;
  S.vcolor = BASE_COLORS.includes(S.color) ? S.color : 'pink';
  SND.pop();
  save();
  if (MP.role === 'host') broadcast({ t: 'look', id: 'host', color: myColor(), acc: myAcc() });
  if (MP.dockOpen) openDock();
  else openMirror();
};

// ----- what's new (existing players, once) -----
function showNews() {
  modal(`<h2>🏛️ Something new on Capy Island!</h2><div style="text-align:center"><span class="npc" style="display:inline-block">${OWL_SVG}</span><span class="npc" style="display:inline-block">${PIGEON_SVG}</span></div>
 <p class="c">A <b>museum</b> opened next to your house! Professor Hoot 🦉 wants bugs, fish, fossils, sea creatures, and art. Bijou runs a cozy <b>café</b> inside! ☕</p>
 <p class="c" style="font-size:15px">🎁 Berry left you a <b>shovel</b> 🪏, a <b>watering can</b> 💧, and <b>tulip seeds</b> 🌱.<br>⭐ Dig up star cracks · 🌷 plant flowers · 🌊 check the tide pools · 🎈 pop balloons · 🌠 wish on shooting stars at night · 🪞 try the new mirror in your house!</p>
 <div class="row"><button class="btn" onclick="closeModal()">Let's go! 🩷</button></div>`);
}
// CSS filter functions done in JS on cached sprites (iPhone Safari has no canvas ctx.filter); same maths as the CSS spec
function fxOps(f) {
  const o = [];
  String(f).replace(/([a-z-]+)\(([-\d.]+)(deg|%)?\)/g, (_, n, v, u) => {
    v = +v;
    if (u === '%') v /= 100;
    o.push([n, v]);
  });
  return o;
}
function fxPx(g, px, f) {
  const ops = fxOps(f);
  if (!ops.length) return;
  let im;
  try {
    im = g.getImageData(0, 0, px, px);
  } catch (e) {
    return;
  }
  const d = im.data,
    M = [];
  for (const [n, v] of ops) {
    if (n === 'saturate' || n === 'grayscale') {
      const s = n === 'saturate' ? v : 1 - Math.min(1, v);
      M.push([
        'm',
        [
          0.213 + 0.787 * s,
          0.715 - 0.715 * s,
          0.072 - 0.072 * s,
          0.213 - 0.213 * s,
          0.715 + 0.285 * s,
          0.072 - 0.072 * s,
          0.213 - 0.213 * s,
          0.715 - 0.715 * s,
          0.072 + 0.928 * s
        ]
      ]);
    } else if (n === 'hue-rotate') {
      const a = (v * Math.PI) / 180,
        c = Math.cos(a),
        s = Math.sin(a);
      M.push([
        'm',
        [
          0.213 + c * 0.787 - s * 0.213,
          0.715 - c * 0.715 - s * 0.715,
          0.072 - c * 0.072 + s * 0.928,
          0.213 - c * 0.213 + s * 0.143,
          0.715 + c * 0.285 + s * 0.14,
          0.072 - c * 0.072 - s * 0.283,
          0.213 - c * 0.213 - s * 0.787,
          0.715 - c * 0.715 + s * 0.715,
          0.072 + c * 0.928 + s * 0.072
        ]
      ]);
    } else if (n === 'sepia') {
      const a = 1 - Math.min(1, v);
      M.push([
        'm',
        [
          0.393 + 0.607 * a,
          0.769 - 0.769 * a,
          0.189 - 0.189 * a,
          0.349 - 0.349 * a,
          0.686 + 0.314 * a,
          0.168 - 0.168 * a,
          0.272 - 0.272 * a,
          0.534 - 0.534 * a,
          0.131 + 0.869 * a
        ]
      ]);
    } else if (n === 'brightness') M.push(['b', v]);
    else if (n === 'contrast') M.push(['c', v]);
    else if (n === 'opacity') M.push(['o', v]);
  }
  const cl = x => (x < 0 ? 0 : x > 255 ? 255 : x);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let r = d[i],
      gg = d[i + 1],
      b = d[i + 2];
    for (const [t, m] of M) {
      if (t === 'm') {
        const R = cl(m[0] * r + m[1] * gg + m[2] * b),
          G = cl(m[3] * r + m[4] * gg + m[5] * b),
          B = cl(m[6] * r + m[7] * gg + m[8] * b);
        r = R;
        gg = G;
        b = B;
      } else if (t === 'b') {
        r = cl(r * m);
        gg = cl(gg * m);
        b = cl(b * m);
      } else if (t === 'c') {
        const o = (0.5 - 0.5 * m) * 255;
        r = cl(r * m + o);
        gg = cl(gg * m + o);
        b = cl(b * m + o);
      } else d[i + 3] = cl(d[i + 3] * m);
    }
    d[i] = r;
    d[i + 1] = gg;
    d[i + 2] = b;
  }
  g.putImageData(im, 0, 0);
}
