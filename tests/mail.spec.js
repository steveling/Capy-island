// The mailbox: letters with a sticker, a note and a gift, to players on this phone, best friends, and hosts.
const { test, expect, UNLOCK } = require('./fixtures');
const { hostIsland } = require('./link');
const { fakeCloud } = require('./fake-cloud');

const BEN = '11111111-1111-4111-8111-111111111111';
const rpcs = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('__rpc') || '[]'));
const online = { my_cloud_status: { has_island: true, save_ts: 0 } };
const openBox = page =>
  page.evaluate(() => {
    busy = false;
    openMailbox();
  });
// pick a sticker, a note and a gift, and send
async function write(page, { st = '🐰', note = 'Big hugs!', gift = null } = {}) {
  await page.locator('.stks button', { hasText: st }).click();
  await page.locator('.notes button', { hasText: note }).click();
  if (gift) await page.locator('#card .cell', { hasText: gift }).click();
  await page.getByRole('button', { name: 'Send! 📮' }).click();
}

test('a letter with a gift to another player on this phone', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());
  await game.newPlayer('Ben', '🚀');
  await page.evaluate(() => (S.bag.pie = 1));

  // Ben writes to Ada
  await openBox(page);
  await expect(page.locator('#card')).toContainText('No letters yet');
  await page.getByRole('button', { name: '✉️ Write a letter' }).click();
  await page.locator('#card .li', { hasText: 'Ada' }).click();
  await expect(page.locator('#card h2')).toHaveText('✉️ To Ada');
  await write(page, { gift: 'Orange Pie' });
  await expect(page.locator('#toast')).toContainText('on its way to Ada');
  expect(await page.evaluate(() => S.bag.pie)).toBeUndefined();

  // Ada's flag is up; she reads it and takes the pie
  await page.locator('#who').click();
  await page.locator('.plb', { hasText: 'Ada' }).click();
  await game.afterSwitch(() => page.locator('.pwe[aria-label="🦄"]').click());
  expect(await page.evaluate(() => unread())).toBe(1);
  await openBox(page);
  await page.locator('#card .li', { hasText: 'From Ben' }).click();
  await expect(page.locator('.letter')).toContainText('Big hugs!');
  await expect(page.locator('.letter .stk')).toHaveText('🐰');
  await page.getByRole('button', { name: 'Take the gift 🎁' }).click();
  expect(await page.evaluate(() => [S.bag.pie, unread(), S.mail[0].took])).toEqual([1, 0, true]);
  await expect(page.getByRole('button', { name: 'Take the gift 🎁' })).toHaveCount(0);
});

test('letters to best friends go through the cloud', async ({ page, game }) => {
  await fakeCloud(page, {
    rpc: {
      ...online,
      list_friends: [{ friend: BEN, name: 'Ben', color: 'sky', online: false }],
      send_mail: true
    }
  });
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready && CL.friends.length === 1);
  await page.evaluate(() => (S.bag.egg = 2));
  await openBox(page);
  await page.getByRole('button', { name: '✉️ Write a letter' }).click();
  await page.locator('#card .li', { hasText: 'Ben' }).click();
  await write(page, { st: '🌈', note: "Let's play soon!", gift: 'Fresh Egg' });
  await expect(page.locator('#toast')).toContainText('on its way to Ben');
  const sent = (await rpcs(page)).filter(r => r[0] === 'send_mail').map(r => r[1]);
  expect(sent).toEqual([{ p_friend: BEN, p_item: 'egg', p_note: 6, p_sticker: 7 }]);
  expect(await page.evaluate(() => S.bag.egg)).toBe(1);
});

test('if the cloud says no, the gift stays in the bag', async ({ page, game }) => {
  await fakeCloud(page, {
    rpc: { ...online, list_friends: [{ friend: BEN, name: 'Ben', color: 'sky' }], send_mail: false }
  });
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready && CL.friends.length === 1);
  await page.evaluate(() => (S.bag.egg = 1));
  await openBox(page);
  await page.getByRole('button', { name: '✉️ Write a letter' }).click();
  await page.locator('#card .li', { hasText: 'Ben' }).click();
  await write(page, { gift: 'Fresh Egg' });
  await expect(page.locator('#toast')).toContainText('mailbox is full');
  expect(await page.evaluate(() => S.bag.egg)).toBe(1);
});

test('letters from best friends arrive, and bad ones are cleaned up', async ({ page, game }) => {
  await fakeCloud(page, {
    rpc: {
      ...online,
      claim_mail: [
        { id: 7, from: 'Ben', c: 'sky', item: 'pie', note: 1, st: 3, at: '2026-09-30T10:00:00Z' },
        { id: 8, from: '<b>Cat</b>', c: 'nope', item: 'rocketship', note: 400, st: -1, at: 'x' },
        { id: 'x', from: 'Bad' }
      ]
    }
  });
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready);
  await page.evaluate(() => clPullMail());
  await expect.poll(() => page.evaluate(() => S.mail.length)).toBe(2);
  const m = await page.evaluate(() => S.mail.map(l => [l.id, l.from, l.c, l.item, l.note, l.st]));
  expect(m).toEqual([
    ['c7', 'Ben', 'sky', 'pie', 1, 3],
    ['c8', 'bCat/b', 'caramel', null, 0, 0]
  ]);
  // the same letters again don't double up
  await page.evaluate(() => clPullMail());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => S.mail.length)).toBe(2);
});

test("visitors on an island-code visit can post a letter in the host's mailbox", async ({
  game,
  newPhone
}) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  await ben.page.evaluate(() => (S.bag.cookie = 1));
  const island = await hostIsland(game.page);
  await island.visit(ben.page, 'ben', { cloud: false });
  await openBox(ben.page);
  await expect(ben.page.locator('#card h2')).toHaveText('✉️ To Ada');
  await write(ben.page, { gift: 'Sunny Cookies' });
  await expect.poll(() => game.page.evaluate(() => S.mail.length)).toBe(1);
  expect(await game.page.evaluate(() => [S.mail[0].from, S.mail[0].item, unread()])).toEqual([
    'Ben',
    'cookie',
    1
  ]);
  expect(await ben.page.evaluate(() => S.bag.cookie)).toBeUndefined();
  // at most 3 per visit
  for (let i = 0; i < 4; i++)
    await ben.page.evaluate(() => MP.conn.send({ t: 'mail', note: 1, st: 1, item: null }));
  await game.page.waitForTimeout(500);
  expect(await game.page.evaluate(() => S.mail.length)).toBe(3);
});

test("on a best friend's island the mailbox writes to them through the cloud", async ({ game, newPhone }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await fakeCloud(ben.page, { rpc: { ...online, send_mail: true } });
  await ben.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await ben.newPlayer('Ben', '🚀');
  await ben.page.waitForFunction(() => CL.ready);
  const island = await hostIsland(game.page);
  await island.visit(ben.page, BEN, { cloud: true });
  const ADA = '22222222-2222-4222-8222-222222222222';
  await ben.page.evaluate(id => (MP.conn.fid = id), ADA);
  await openBox(ben.page);
  await write(ben.page);
  await expect(ben.page.locator('#toast')).toContainText('on its way to Ada');
  const sent = (await rpcs(ben.page)).filter(r => r[0] === 'send_mail').map(r => r[1].p_friend);
  expect(sent).toEqual([ADA]);
  // nothing went peer to peer
  expect(await game.page.evaluate(() => S.mail.length)).toBe(0);
});
