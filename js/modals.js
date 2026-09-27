// Modal dialogs: bag, book, shop, and the house.
'use strict';

// ---------- MODALS ----------
function modal(html) {
  busy = true;
  closeTalk();
  MP.dockOpen = false;
  $('#card').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  busy = false;
  MP.dockOpen = false;
}
window.closeModal = closeModal;
const BAG_ORDER = [
  'tool',
  'fruit',
  'bug',
  'fish',
  'sea',
  'misc',
  'fossil',
  'art',
  'shell',
  'star',
  'flower',
  'seed',
  'furn'
];
function bagView() {
  const keys = Object.keys(S.bag)
    .filter(k => ITEMS[k])
    .sort((a, b) => BAG_ORDER.indexOf(ITEMS[a].k) - BAG_ORDER.indexOf(ITEMS[b].k));
  let h = `<h2>🎒 My Bag</h2>`;
  if (!keys.length)
    h += '<p style="text-align:center">Your bag is empty. Pick fruit, catch bugs, and go fishing!</p>';
  h +=
    '<div class="grid">' +
    keys
      .map(
        k =>
          `<div class="cell">${ie(k)}<small>${ITEMS[k].n}</small><span class="cnt">${ITEMS[k].k === 'tool' ? '' : S.bag[k]}</span></div>`
      )
      .join('') +
    '</div>';
  h += `<p style="text-align:center;font-size:14px">🪏 Tap a ⭐ crack to dig · 💧 tap your garden to water<br>Sell at the shop 🦝 · donate at the museum 🏛️</p><div class="row"><button class="btn white" ${VIS() ? 'disabled' : ''} onclick="openMirror()">🪞 My look</button><button class="btn" onclick="closeModal()">Close</button></div>`;
  modal(h);
}
let bookTab = 'bug';
const BOOK_TABS = [
  ['bug', '🦋', 'Bugs'],
  ['fish', '🐟', 'Fish'],
  ['sea', '🐚', 'Sea Creatures'],
  ['fossil', '🦴', 'Fossils'],
  ['art', '🖼️', 'Art'],
  ['flower', '🌷', 'Flowers'],
  ['furn', '🛋️', 'Furniture'],
  ['fruit', '🍊', 'Fruit']
];
function bookView() {
  const l = ids(bookTab),
    got = l.filter(i => S.found[i]).length,
    mus = WK.includes(bookTab),
    don = l.filter(i => S.mu[i]).length,
    tb = BOOK_TABS.find(t => t[0] === bookTab) || BOOK_TABS[0];
  const tab = (k, t) =>
    `<button class="btn ${bookTab === k ? '' : 'off'}" onclick="bookTab='${k}';bookView()">${t}</button>`;
  let h = `<h2>📖 My Collection</h2><div class="tabs">${BOOK_TABS.map(t => tab(t[0], t[1])).join('')}</div><p style="text-align:center;font-weight:900;margin:4px 0 10px">${tb[1]} ${tb[2]}: ${got} / ${l.length} found${mus ? ` · 🏛️ ${don} in museum` : ''}${got === l.length ? ' 🏆 All done!' : ''}</p><div class="grid">`;
  const wi = i =>
    TICON[ITEMS[i].t || 'a'] && whenTxt(i) ? `<span class="when">${TICON[ITEMS[i].t]}</span>` : '';
  h +=
    l
      .map(i =>
        S.found[i]
          ? `<div class="cell" onclick="bookTip('${i}')">${ie(i)}<small>${ITEMS[i].n}</small>${S.mu[i] ? '<span class="mus">🏛️</span>' : ''}${wi(i)}</div>`
          : `<div class="cell unk" onclick="bookTip('${i}')">?${wi(i)}</div>`
      )
      .join('') +
    '</div><div class="row"><button class="btn white" onclick="openDock(\'guestbook\')">📝 Guestbook</button><button class="btn" onclick="closeModal()">Close</button></div>';
  modal(h);
}
window.bookView = bookView;
window.bookTip = i => {
  const it = ITEMS[i];
  if (!it) return;
  const w = whenTxt(i);
  toast(
    (S.found[i] ? `${ie(i)} <b>${esc(it.n)}</b>` : '❓ Not found yet') +
      (w ? '<br>' + w : '') +
      (S.mu[i] ? '<br>🏛️ In your museum' : ''),
    2600
  );
};
let shopTab = 'sell';
function openShop() {
  if (VIS()) return;
  closeTalk();
  const tab = (k, t) =>
    `<button class="btn ${shopTab === k ? '' : 'off'}" onclick="shopTab='${k}';openShop()">${t}</button>`;
  let h = `<h2>🦝 Berry's Shop</h2><p style="text-align:center;margin:0 0 10px">"Welcome, ${esc(S.name)}! What can I do for you today?"</p><div class="tabs">${tab('sell', 'Sell 🪙')}${tab('buy', 'Buy 🛋️')}</div><div class="list">`;
  if (shopTab === 'sell') {
    const keys = Object.keys(S.bag);
    if (!keys.length) h += '<p style="text-align:center">You have nothing to sell yet.</p>';
    h += keys
      .filter(k => ITEMS[k] && ITEMS[k].k !== 'tool' && !ITEMS[k].ns)
      .map(
        k =>
          `<div class="li"><span class="e">${ie(k)}</span><span class="t">${ITEMS[k].n} ×${S.bag[k]}<small>${ITEMS[k].p} coins each</small></span><button class="btn" onclick="sell('${k}',1)">Sell 1</button>${S.bag[k] > 1 ? `<button class="btn white" onclick="sell('${k}',${S.bag[k]})">All</button>` : ''}</div>`
      )
      .join('');
  } else {
    h +=
      '<p style="text-align:center;margin-top:0">New furniture every day!</p>' +
      S.stock
        .map(
          k =>
            `<div class="li"><span class="e">${ie(k)}</span><span class="t">${ITEMS[k].n}<small>${ITEMS[k].buy} coins</small></span><button class="btn" ${S.coins < ITEMS[k].buy ? 'disabled' : ''} onclick="buy('${k}')">Buy</button></div>`
        )
        .join('') +
      '<h3>🧰 Tools & seeds</h3>' +
      ['shovel', 'can', 'seed_tulip', 'seed_rose']
        .map(
          k =>
            `<div class="li"><span class="e">${ie(k)}</span><span class="t">${ITEMS[k].n}<small>${ITEMS[k].buy} coins</small></span>${ITEMS[k].k === 'tool' && S.bag[k] ? '<button class="btn white" disabled>✓ Got it</button>' : `<button class="btn" ${S.coins < ITEMS[k].buy ? 'disabled' : ''} onclick="buy('${k}')">Buy</button>`}</div>`
        )
        .join('');
  }
  h +=
    '</div><div class="row"><button class="btn white" onclick="closeModal()">Bye, Berry! 👋</button></div>';
  modal(h);
}
window.openShop = openShop;
window.sell = (k, n) => {
  if (VIS() || !ITEMS[k] || ITEMS[k].k === 'tool' || ITEMS[k].ns || !takeItem(k, n)) return;
  S.coins += ITEMS[k].p * n;
  SND.coin();
  hud();
  save();
  openShop();
};
window.buy = k => {
  if (VIS() || !ITEMS[k] || !ITEMS[k].buy || S.coins < ITEMS[k].buy || (ITEMS[k].k === 'tool' && S.bag[k]))
    return;
  S.coins -= ITEMS[k].buy;
  const first = addItem(k);
  SND.coin();
  hud();
  save();
  openShop();
  toast(
    `You bought ${ITEMS[k].k === 'seed' ? '' : 'a '}${ITEMS[k].n}! ${ie(k)}` +
      (first ? '<br>✨ New in your book!' : '')
  );
};

// ---------- HOUSE ----------
// my house, or (while visiting a best friend) theirs to look around (#5)
const houseGuest = () => ONV() && !!MP.island.room;
function openHouse() {
  const guest = houseGuest();
  if (VIS() && !guest) return;
  busy = true;
  closeTalk();
  const h = $('#house');
  h.classList.remove('hidden');
  h.classList.toggle('guest', guest);
  $('#htitle').textContent = `${guest ? MP.island.name : S.name}'s House`;
  $('#house .hint').textContent = guest
    ? `You're visiting! Tap things to see what they are. 🏠`
    : 'Tap a square to put furniture there. Tap furniture to put it away.';
  drawRoom();
}
function drawRoom() {
  const guest = houseGuest(),
    room = guest ? MP.island.room : S.room,
    f = $('#floor');
  f.innerHTML = '';
  room.forEach((id, i) => {
    const d = document.createElement('div');
    d.className = 'slot';
    d.innerHTML = id ? ie(id) : '';
    d.onclick = () => (guest ? id && toast(`${ie(id)} ${esc(ITEMS[id].n)}`, 1800) : slotTap(i));
    f.appendChild(d);
  });
  const n = room.filter(Boolean).length,
    u = new Set(room.filter(Boolean)).size;
  const stars =
    n === 0 ? '' : n < 4 ? '⭐' : n < 8 ? '⭐⭐' : n < 13 ? '⭐⭐⭐' : u >= 12 ? '⭐⭐⭐⭐⭐' : '⭐⭐⭐⭐';
  $('#score').textContent = n
    ? `Cozy level: ${stars}`
    : guest
      ? `${MP.island.name}'s house is empty right now!`
      : "Your house is empty. Let's decorate!";
}
function slotTap(i) {
  if (VIS()) return;
  const id = S.room[i];
  if (id) {
    S.room[i] = null;
    addItem(id);
    SND.lift();
    save();
    drawRoom();
    return;
  }
  const fk = Object.keys(S.bag).filter(placeable);
  if (!fk.length) {
    modal(
      `<h2>No furniture yet</h2><p style="text-align:center">Buy furniture at Berry's Shop 🦝, open presents on the beach 🎁, or help your friends!</p><div class="row"><button class="btn" onclick="closeModal();busy=true">OK</button></div>`
    );
    return;
  }
  modal(
    `<h2>What goes here?</h2><div class="grid">${fk.map(k => `<div class="cell" onclick="place(${i},'${k}')">${ie(k)}<small>${ITEMS[k].n}</small><span class="cnt">${S.bag[k]}</span></div>`).join('')}</div><div class="row"><button class="btn white" onclick="closeModal();busy=true">Never mind</button></div>`
  );
}
window.place = (i, k) => {
  if (VIS() || !takeItem(k)) return;
  S.room[i] = k;
  SND.thunk();
  save();
  closeModal();
  busy = true;
  drawRoom();
};
$('#hexit').onclick = () => {
  $('#house').classList.add('hidden');
  $('#house').classList.remove('guest');
  busy = false;
  P.tx = HOUSE.x;
  P.ty = HOUSE.y + 30;
  P.x = HOUSE.x;
  P.y = HOUSE.y + 24;
};
$('#who').onclick = () => {
  if (!busy) openPlayers();
};
$('#bBag').onclick = () => {
  if (!busy || !$('#modal').classList.contains('hidden')) bagView();
};
$('#bBook').onclick = () => {
  if (!busy || !$('#modal').classList.contains('hidden')) bookView();
};
$('#bHome').onclick = () => {
  if (busy || VIS()) return;
  P.act = { k: 'house' };
  setT(HOUSE.x, HOUSE.y + 22);
};
