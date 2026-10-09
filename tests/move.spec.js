// Moving to the new address: the old address (here http://localhost:4173) hands every player over to the new one
// (here http://127.0.0.1:4173, a different origin with its own storage, like capy.pocketgiggles.com).
const { test, expect } = require('./fixtures');
const { fakeServer } = require('./fake-server');

const OLD = 'http://localhost:4173/',
  NEW = 'http://127.0.0.1:4173/',
  KEY = 'capyIsland.v2',
  AUTH = 'capyIsland.auth',
  META = 'capyIsland.cloud',
  UNLOCK = 'capyIsland.unlocked',
  PLAYERS = 'capyIsland.players';
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const A = uid(1),
  B = uid(2),
  COCO = uid(9);
// an island that has seen all the news (so no what's-new screens get in the way)
const island = (name, coins, more = {}) => ({
  name,
  coins,
  neigh: {},
  bag: { orange: 2 },
  found: {},
  day: 4,
  v4news: 1,
  news: 10,
  ...more
});

/** a phone's storage: players [{ id, name, pw, color, save, uid, meta, unlocked }], the first one playing */
function phoneStorage(players, active = players[0].id) {
  const st = {
    [PLAYERS]: JSON.stringify({
      active,
      list: players.map(p => ({ id: p.id, name: p.name, color: p.color || 'pink', pw: p.pw || null }))
    })
  };
  for (const p of players) {
    const pre = p.id === active ? '' : `capyIsland.p.${p.id}.`;
    st[pre + KEY] = JSON.stringify(p.save);
    if (p.uid) {
      st[pre + AUTH] = JSON.stringify({ access_token: 'tok-' + p.uid, user: { id: p.uid } });
      st[pre + META] = JSON.stringify({ uid: p.uid, localTs: 1000, syncedTs: 1000, dirty: false, ...p.meta });
    } else if (p.meta) st[pre + META] = JSON.stringify(p.meta);
    if (p.uid || p.unlocked) st[pre + UNLOCK] = '1';
  }
  return st;
}

/** one phone with storage at the old (and maybe the new) address, cloud on (a shared fake server) or off */
async function phone(page, { cloud = true, old = {}, fresh = {}, max = 0 } = {}) {
  await page.context().route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, r => r.abort());
  if (!cloud)
    await page.route('**/js/config.js?*', r =>
      r.fulfill({
        contentType: 'text/javascript',
        body: "const SUPABASE_URL = '';\nconst SUPABASE_ANON_KEY = '';\n"
      })
    );
  const srv = cloud ? await fakeServer(page) : null;
  await page.addInitScript(
    ({ seeds, max }) => {
      if (typeof window.FAKE_HOUR !== 'number') window.FAKE_HOUR = 12;
      window.CAPY_MOVE = { from: 'localhost', old: 'http://localhost:4173/', to: 'http://127.0.0.1:4173/' };
      if (max) window.CAPY_MOVE.max = max;
      if (!location.protocol.startsWith('http') || sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      const s = seeds[location.hostname] || {};
      for (const k in s) localStorage.setItem(k, s[k]);
    },
    { seeds: { localhost: old, '127.0.0.1': fresh }, max }
  );
  const urls = [];
  page.on('framenavigated', f => f === page.mainFrame() && urls.push(f.url()));
  return { srv, urls };
}
/** wait until the game (or the passcode gate) is up at `host`, after any moving and reloading */
async function settled(page, host = '127.0.0.1:4173') {
  await expect
    .poll(
      () =>
        page
          .evaluate(
            h =>
              location.host === h &&
              !location.hash &&
              typeof islReady !== 'undefined' &&
              islReady &&
              (CL.booted || !!document.getElementById('gate')),
            host
          )
          .catch(() => false),
      { timeout: 20000 }
    )
    .toBe(true);
  await page.waitForTimeout(300);
}
const storage = page =>
  page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
const players = async page => JSON.parse((await storage(page))[PLAYERS] || '{"active":null,"list":[]}');

test('a cloud player flies to the new address with their island, best friends and passcode unlock', async ({
  page
}) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', uid: A, save: island('Ada', 321) };
  // she played since the last cloud save: the newest island has to go along
  ADA.meta = {
    localTs: 2000,
    dirty: true,
    friends: [{ id: COCO, name: 'Coco', color: 'mint' }],
    chat: false
  };
  const { srv, urls } = await phone(page, { old: phoneStorage([ADA]) });
  srv.island(A, island('Ada', 100), { ts: 1000, friends: [{ friend: COCO, name: 'Coco', color: 'mint' }] });

  await page.goto(OLD);
  await settled(page);
  expect(page.url()).toBe(NEW);
  // the hand-off went in the part after the #, never the query string
  const via = urls.find(u => u.includes('capymove='));
  expect(via.startsWith(NEW + '#capymove=')).toBe(true);
  expect(urls.some(u => u.includes('?capymove') || u.includes('&capymove'))).toBe(false);

  // Ada plays her own island here: no passcode gate, same secret emoji, same switches
  await expect(page.locator('#gate')).toHaveCount(0);
  expect(await page.evaluate(() => [S.name, S.coins, CL.chat])).toEqual(['Ada', 321, false]);
  expect(await players(page)).toEqual({
    active: 'ada0000001',
    list: [{ id: 'ada0000001', name: 'Ada', color: 'pink', pw: '🦄' }]
  });
  const st = await storage(page);
  expect(st[UNLOCK]).toBe('1');
  const me = JSON.parse(st[AUTH]).user.id;
  expect(me).not.toBe(A);
  // in the cloud the island (with her newest coins) and her best friends now belong to this address's sign-in
  expect(srv.islands.get(me).save.coins).toBe(321);
  expect(srv.allowed.has(me)).toBe(true);
  expect(srv.moved.has(A)).toBe(true);
  await expect
    .poll(() => page.evaluate(() => [CL.status, CL.friends.map(f => f.name)]))
    .toEqual(['ok', ['Coco']]);
  expect(srv.calls('create_transfer_code')).toHaveLength(1);
  expect(srv.calls('claim_transfer')).toHaveLength(1);
  expect(Object.keys(st).filter(k => k.startsWith('capyIsland.handoff'))).toEqual([]);

  // the old address now just forwards (no new codes), and still keeps its copy of everything
  await page.goto(OLD);
  await settled(page);
  expect(page.url()).toBe(NEW);
  expect(srv.calls('create_transfer_code')).toHaveLength(1);
  expect(srv.calls('claim_transfer')).toHaveLength(1);
  expect((await players(page)).list).toHaveLength(1);
  // grown-ups can still open the old address with ?stay
  await page.goto(OLD + '?stay');
  await settled(page, 'localhost:4173');
  const old = await storage(page);
  expect(JSON.parse(old[KEY])).toMatchObject({ name: 'Ada', coins: 321 });
  expect(JSON.parse(old['capyIsland.moved']).at).toBeGreaterThan(0);
});

test('every player on the phone comes along, and the one who was playing keeps playing', async ({
  page,
  game
}) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', uid: A, save: island('Ada', 321) },
    BEN = { id: 'ben0000002', name: 'Ben', pw: '🚀', color: 'mint', uid: B, save: island('Ben', 77) },
    // never got into the cloud (still waiting for the secret word): goes as a whole island
    CY = { id: 'cy00000003', name: 'Cy', pw: '🐸', save: island('Cy', 55) };
  const { srv } = await phone(page, { old: phoneStorage([BEN, ADA, CY], ADA.id) });
  srv.island(A, island('Ada', 321));
  srv.island(B, island('Ben', 77), { friends: [{ friend: COCO, name: 'Coco', color: 'mint' }] });

  await page.goto(OLD);
  await settled(page);
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 321]);
  const pl = await players(page);
  expect(pl.active).toBe('ada0000001');
  expect(pl.list).toEqual([
    { id: 'ben0000002', name: 'Ben', color: 'mint', pw: '🚀' },
    { id: 'ada0000001', name: 'Ada', color: 'pink', pw: '🦄' },
    { id: 'cy00000003', name: 'Cy', color: 'pink', pw: '🐸' }
  ]);
  const st = await storage(page);
  expect(JSON.parse(st[`capyIsland.p.cy00000003.${KEY}`])).toMatchObject({ name: 'Cy', coins: 55 });
  expect(st[`capyIsland.p.cy00000003.${AUTH}`]).toBeUndefined();
  expect(srv.calls('create_transfer_code').map(c => c[2])).toEqual([B, A]);

  // Ben switches in with his secret emoji: his island, unlocked, his best friend
  await page.locator('#who').click();
  await page.locator('.plb', { hasText: 'Ben' }).click();
  await game.afterSwitch(() => page.locator('.pwe[aria-label="🚀"]').click());
  await expect(page.locator('#gate')).toHaveCount(0);
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ben', 77]);
  await expect.poll(() => page.evaluate(() => CL.friends.map(f => f.name))).toEqual(['Coco']);
  const ben = JSON.parse((await storage(page))[AUTH]).user.id;
  expect(srv.islands.get(ben).save.name).toBe('Ben');
});

test('local-only players (no cloud) come along inside the link', async ({ page, game }) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', save: island('Ada', 321, { built: { b1: 1 } }) },
    BEN = { id: 'ben0000002', name: 'Ben', pw: '🚀', save: island('Ben', 77) };
  const { urls } = await phone(page, { cloud: false, old: phoneStorage([ADA, BEN]) });
  await page.goto(OLD);
  await settled(page);
  expect(urls.find(u => u.includes('capymove='))).toMatch(/^http:\/\/127\.0\.0\.1:4173\/#capymove=1[\w-]+$/);
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 321]);
  expect((await players(page)).list.map(p => p.name)).toEqual(['Ada', 'Ben']);
  await page.locator('#who').click();
  await page.locator('.plb', { hasText: 'Ben' }).click();
  await game.afterSwitch(() => page.locator('.pwe[aria-label="🚀"]').click());
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ben', 77]);
});

test('if the move fails, the old address plays as usual, takes back its codes, and tries again next time', async ({
  page
}) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', uid: A, save: island('Ada', 321) },
    BEN = { id: 'ben0000002', name: 'Ben', pw: '🚀', uid: B, save: island('Ben', 77) };
  const { srv } = await phone(page, { old: phoneStorage([ADA, BEN]) });
  srv.island(A, island('Ada', 321));
  srv.island(B, island('Ben', 77));
  // Ada's code is made, Ben's fails
  srv.before = (fn, args, u) => fn === 'create_transfer_code' && u === B;

  await page.goto(OLD);
  await settled(page, 'localhost:4173');
  await page.waitForTimeout(800);
  expect(page.url()).toBe(OLD);
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 321]);
  await expect(page.locator('#gate')).toHaveCount(0);
  await expect(page.locator('#modal')).toBeHidden();
  expect(srv.calls('cancel_transfer_code').map(c => c[2])).toContain(A);
  expect(srv.codes.size).toBe(0);
  expect(srv.calls('claim_transfer')).toHaveLength(0);
  expect((await storage(page))['capyIsland.moved']).toBeUndefined();
  // still playable: Ada catches a coin
  await page.evaluate(() => {
    S.coins += 1;
    save();
  });
  await expect(page.locator('#coins')).toBeVisible();

  // next time the cloud works: off they go
  srv.before = null;
  await page.reload();
  await settled(page);
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 322]);
  expect((await players(page)).list.map(p => p.name)).toEqual(['Ada', 'Ben']);
});

test('reloading the new address half-way or with the same link never brings anyone twice', async ({
  page
}) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', uid: A, save: island('Ada', 321) },
    BEN = { id: 'ben0000002', name: 'Ben', pw: '🚀', uid: B, save: island('Ben', 77) };
  const { srv, urls } = await phone(page, { old: phoneStorage([ADA, BEN]) });
  srv.island(A, island('Ada', 321));
  srv.island(B, island('Ben', 77));
  // the cloud stops answering after Ada's claim
  let claims = 0;
  srv.before = fn => fn === 'claim_transfer' && ++claims >= 2;

  await page.goto(OLD);
  await settled(page);
  expect(await page.evaluate(() => S.name)).toBe('Ada');
  expect((await players(page)).list.map(p => p.name)).toEqual(['Ada']);
  await expect(page.locator('#toast')).toContainText('still on their way');
  expect((await storage(page))['capyIsland.handoff']).toBeTruthy();

  // the next load carries on: Ben arrives, Ada isn't brought again
  srv.before = null;
  await page.reload();
  await settled(page);
  expect(await page.evaluate(() => S.name)).toBe('Ada');
  expect((await players(page)).list.map(p => p.name)).toEqual(['Ada', 'Ben']);
  // (Ada, Ben failing twice: right after Ada arrived and on the load after, then Ben)
  expect(srv.calls('claim_transfer')).toHaveLength(4);
  expect((await storage(page))['capyIsland.handoff']).toBeUndefined();

  // opening the very same link again changes nothing
  await page.goto('about:blank');
  await page.goto(urls.find(u => u.includes('capymove=')));
  await settled(page);
  expect((await players(page)).list.map(p => p.name)).toEqual(['Ada', 'Ben']);
  expect(srv.calls('claim_transfer')).toHaveLength(4);
  await expect(page.locator('#movenote')).toHaveCount(0);
});

test('players already at the new address are kept just as they are', async ({ page }) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', save: island('Ada', 321) },
    BEN = { id: 'ben0000002', name: 'Ben', pw: '🚀', save: island('Ben', 77) },
    // Ada already came over (and played on), and Zed started here
    ADA_HERE = { ...ADA, save: island('Ada', 999) },
    ZED = { id: 'zed0000009', name: 'Zed', pw: '🐢', save: island('Zed', 5) };
  await phone(page, {
    cloud: false,
    old: phoneStorage([ADA, BEN]),
    fresh: phoneStorage([ZED, ADA_HERE])
  });
  await page.goto(OLD);
  await settled(page);
  const pl = await players(page);
  expect(pl.list.map(p => p.name)).toEqual(['Zed', 'Ada', 'Ben']);
  // Zed was playing; Ada (who was playing at the old address) was already here, so Zed keeps playing
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Zed', 5]);
  const st = await storage(page);
  expect(JSON.parse(st[`capyIsland.p.ada0000001.${KEY}`]).coins).toBe(999);
  expect(JSON.parse(st[`capyIsland.p.ben0000002.${KEY}`]).coins).toBe(77);
});

test("a moving code that doesn't work any more: a gentle note, the island stays safe, Try again moves it", async ({
  page
}) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', uid: A, save: island('Ada', 321) };
  const { srv } = await phone(page, { old: phoneStorage([ADA]) });
  srv.island(A, island('Ada', 321));
  // the code expired before the new address got to use it
  srv.before = fn => {
    if (fn === 'claim_transfer') srv.codes.clear();
    return false;
  };
  await page.goto(OLD);
  await settled(page);
  // nobody here yet, so the passcode gate is up, with the note on top
  await expect(page.locator('#movenote')).toContainText("Ada's island didn't make the trip");
  expect(srv.islands.get(A).save.coins).toBe(321);
  expect(srv.moved.size).toBe(0);
  expect((await players(page)).list).toEqual([]);

  srv.before = null;
  await page.getByRole('button', { name: 'Try again ✈️' }).click();
  await expect.poll(() => srv.calls('create_transfer_code').length, { timeout: 15000 }).toBe(2);
  await settled(page);
  await expect(page.locator('#gate')).toHaveCount(0);
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 321]);
  expect(srv.moved.has(A)).toBe(true);
});

test('an island too big for the link stays behind, with a note for grown-ups; the others still come', async ({
  page
}) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', uid: A, save: island('Ada', 321) },
    // (a drawing doesn't squeeze small)
    board = Array.from({ length: 768 }, (_, i) =>
      ((Math.imul(i + 1, 2654435761) >>> 20) & 15).toString(16)
    ).join(''),
    BEN = { id: 'ben0000002', name: 'Ben', pw: '🚀', save: island('Ben', 77, { board }) };
  const { srv } = await phone(page, { old: phoneStorage([ADA, BEN]), max: 300 });
  srv.island(A, island('Ada', 321));
  await page.goto(OLD);
  await settled(page);
  expect(await page.evaluate(() => S.name)).toBe('Ada');
  expect((await players(page)).list.map(p => p.name)).toEqual(['Ada']);
  await expect(page.locator('#movenote')).toContainText("Ben's island was too big");
  await expect(page.locator('#movenote')).toContainText('?stay');
  await page.locator('#movenote').getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#movenote')).toHaveCount(0);
});

test('?stay keeps playing at the old address; a phone with nobody on it just goes', async ({ page }) => {
  const ADA = { id: 'ada0000001', name: 'Ada', pw: '🦄', save: island('Ada', 321) };
  await phone(page, { cloud: false, old: phoneStorage([ADA]) });
  await page.goto(OLD + '?stay');
  await settled(page, 'localhost:4173');
  await page.waitForTimeout(800);
  expect(page.url()).toBe(OLD + '?stay');
  expect(await page.evaluate(() => S.name)).toBe('Ada');

  await page.evaluate(() => {
    restoring = true;
    localStorage.clear();
  });
  await page.goto(OLD + '?visit=ABCDE');
  await settled(page);
  expect(page.url()).toBe(NEW);
  await expect(page.locator('#card h2')).toHaveText(/Welcome to Capy Island/);
  // (a friend's visiting link keeps working at the new address)
  expect(await page.evaluate(() => pendingVisit)).toBe('ABCDE');
});
