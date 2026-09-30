// Two visitors on the same (cloud) visit can ask each other to be best friends.
const { test, expect, UNLOCK } = require('./fixtures');
const { hostIsland } = require('./link');
const { fakeCloud } = require('./fake-cloud');

const BEN = '11111111-1111-4111-8111-111111111111',
  CAT = '22222222-2222-4222-8222-222222222222',
  DAN = '33333333-3333-4333-8333-333333333333';
const cloud = { cloud: true, storage: { [UNLOCK]: '1' } };
const online = { my_cloud_status: { has_island: true, save_ts: 0 } };
const rpcs = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('__rpc') || '[]'));
// every toast a page showed (they can replace each other quickly)
const LOG_TOASTS = () => {
  const t = toast;
  window.__toasts = [];
  window.toast = (m, ...a) => (window.__toasts.push(String(m)), t(m, ...a));
};
const toastHas = (page, re) => expect.poll(() => page.evaluate(() => window.__toasts.join('\n'))).toMatch(re);

/** Ada hosts; Ben and Cat visit her island over cloud links (or island-code links) */
async function party(game, newPhone, { benRpc = {}, catRpc = {}, link = true } = {}) {
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await fakeCloud(ben.page, {
    rpc: { ...online, join_by_code: { CATCD: { owner: CAT, name: 'Cat' } }, ...benRpc }
  });
  await ben.open(cloud);
  await ben.newPlayer('Ben', '🚀');
  const cat = await newPhone();
  await fakeCloud(cat.page, { rpc: { ...online, open_island: 'CATCD', ...catRpc } });
  await cat.open(cloud);
  await cat.newPlayer('Cat', '🌈');
  for (const p of [ben.page, cat.page]) await p.waitForFunction(() => CL.ready);
  for (const p of [game.page, ben.page, cat.page]) await p.evaluate(LOG_TOASTS);
  const island = await hostIsland(game.page);
  await island.visit(ben.page, BEN, { cloud: link });
  await island.visit(cat.page, CAT, { cloud: link });
  await cat.page.waitForFunction(id => MP.players.has(id), BEN);
  await ben.page.waitForFunction(id => MP.players.has(id), CAT);
  return { ada: game.page, ben: ben.page, cat: cat.page, island };
}
// tap on another player's capybara
const tapOn = (page, id) =>
  page.evaluate(id => {
    const r = MP.players.get(id);
    tapWorld(r.x, r.y - 22);
  }, id);

async function catAsksBen(cat) {
  await tapOn(cat, BEN);
  await expect(cat.locator('#card h2')).toHaveText(/Make a best friend/);
  await expect(cat.locator('#card')).toContainText('Ben');
  await cat.locator('#card button', { hasText: 'Ask!' }).click();
  await toastHas(cat, /You asked Ben/);
}

test('asking, and saying yes, makes two visitors best friends', async ({ game, newPhone }) => {
  const { ben, cat } = await party(game, newPhone);
  await catAsksBen(cat);
  await expect(ben.locator('#card h2')).toHaveText(/New friend/);
  await expect(ben.locator('#card')).toContainText('Cat wants to be best friends!');
  await ben.locator('#card button', { hasText: 'Yes!' }).click();
  await toastHas(ben, /Cat is now one of your best friends/);
  await toastHas(cat, /Ben said yes/);
  expect((await rpcs(ben)).filter(r => r[0] === 'join_by_code').map(r => r[1])).toEqual([
    { p_code: 'CATCD' }
  ]);
  await expect.poll(() => ben.evaluate(id => CL.friends.some(f => f.id === id), CAT)).toBe(true);
  // Cat's code was only opened for the question, and is closed again
  await expect.poll(async () => (await rpcs(cat)).map(r => r[0])).toContain('close_island');
  // now they're friends, tapping just says so
  await tapOn(ben, CAT);
  await toastHas(ben, /Cat is already one of your best friends/);
});

test('saying not now tells the asker, and nothing is joined', async ({ game, newPhone }) => {
  const { ben, cat } = await party(game, newPhone);
  await catAsksBen(cat);
  await ben.locator('#card button', { hasText: 'Not now' }).click();
  await toastHas(cat, /Ben said maybe another time/);
  expect((await rpcs(ben)).map(r => r[0])).not.toContain('join_by_code');
  await expect.poll(async () => (await rpcs(cat)).map(r => r[0])).toContain('close_island');
});

test("a code that isn't the asker's is refused", async ({ game, newPhone }) => {
  // the server says CATCD belongs to Dan: someone swapped the code on the way
  const { ben, cat } = await party(game, newPhone, {
    benRpc: { join_by_code: { CATCD: { owner: DAN, name: 'Dan' } } }
  });
  await catAsksBen(cat);
  await ben.locator('#card button', { hasText: 'Yes!' }).click();
  await toastHas(ben, /didn't work/);
  await toastHas(cat, /Ben said maybe another time/);
});

test('tapping the host says you are already best friends', async ({ game, newPhone }) => {
  const { cat } = await party(game, newPhone);
  await tapOn(cat, 'host');
  await toastHas(cat, /Ada is already one of your best friends/);
  await expect(cat.locator('#modal')).toBeHidden();
});

test('the Capy Air menu lists visitors to ask', async ({ game, newPhone }) => {
  const { cat } = await party(game, newPhone);
  await cat.evaluate(() => openDock());
  await expect(cat.locator('#card h3', { hasText: 'Make friends' })).toBeVisible();
  await cat.locator('#card button', { hasText: 'Ask 💌' }).click();
  await expect(cat.locator('#card h2')).toHaveText(/Make a best friend/);
});

test('a busy player answers busy', async ({ game, newPhone }) => {
  const { ben, cat } = await party(game, newPhone);
  await ben.evaluate(() => (busy = true));
  await tapOn(cat, BEN);
  await cat.locator('#card button', { hasText: 'Ask!' }).click();
  await toastHas(cat, /Ben is busy right now/);
});

test('grown-ups can switch it off', async ({ game, newPhone }) => {
  const { ben, cat } = await party(game, newPhone);
  await ben.evaluate(() => {
    busy = false;
    grownups();
  });
  const box = ben.locator('#clfreq');
  await expect(box).toBeChecked();
  await box.uncheck();
  await ben.evaluate(() => closeModal());
  expect(JSON.parse(await ben.evaluate(() => localStorage.getItem('capyIsland.cloud'))).freq).toBe(false);
  // Ben can't ask anyone, and requests to him are declined
  expect(await ben.evaluate(id => canAsk(id), CAT)).toBe(false);
  await catAsksBen(cat);
  await toastHas(cat, /Ben said maybe another time/);
  await expect(ben.locator('#modal')).toBeHidden();
});

test('island-code visits have no friend requests, and the host drops them', async ({ game, newPhone }) => {
  const { ada, ben, cat } = await party(game, newPhone, { link: false });
  expect(await cat.evaluate(id => canAsk(id), BEN)).toBe(false);
  // Ben walks onto open grass first: visitors land at a random spot by the Capy Air sign, and a tap there
  // would open Capy Air instead (a tap on a player only stops there when it's a friend request)
  await ben.evaluate(() => {
    P.x = P.tx = 820;
    P.y = P.ty = 560;
  });
  await cat.waitForFunction(
    id => Math.hypot(MP.players.get(id).x - 820, MP.players.get(id).y - 560) < 2,
    BEN
  );
  await tapOn(cat, BEN);
  await cat.waitForTimeout(1500); // long enough to walk over and open anything the tap had hit
  await expect(cat.locator('#modal')).toBeHidden();
  // even a modified phone's request isn't passed on
  await cat.evaluate(id => MP.conn.send({ t: 'freq', to: id, code: 'CATCD' }), BEN);
  await ada.waitForTimeout(500);
  await expect(ben.locator('#modal')).toBeHidden();
});

test('ending the visit closes a waiting question', async ({ game, newPhone }) => {
  const { cat } = await party(game, newPhone);
  await catAsksBen(cat);
  await cat.evaluate(() => returnHome());
  await cat.waitForFunction(() => !MP.role);
  await expect.poll(async () => (await rpcs(cat)).map(r => r[0])).toContain('close_island');
  expect(await cat.evaluate(() => FR.out)).toBe(null);
});

test('grown-ups can ask the cloud for a new island code', async ({ page, game }) => {
  await fakeCloud(page, { rpc: { ...online, new_island_code: null } });
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready);
  await page.evaluate(() => {
    busy = false;
    grownups();
  });
  await page.getByRole('button', { name: '🔄 New island code' }).click();
  await expect(page.locator('#card .note').first()).toContainText("The old code won't work any more");
  expect((await rpcs(page)).map(r => r[0])).toContain('new_island_code');
});

test("if the cloud can't make a new code, grown-ups are told", async ({ page, game }) => {
  await fakeCloud(page, { rpc: online });
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready);
  await page.evaluate(() => {
    busy = false;
    grownups();
  });
  await page.getByRole('button', { name: '🔄 New island code' }).click();
  await expect(page.locator('#card .note').first()).toContainText("Couldn't make a new code");
});
