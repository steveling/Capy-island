// Best friends can look inside each other's houses; island-code visitors can't (#5).
const { test, expect, UNLOCK } = require('./fixtures');
const { hostIsland } = require('./link');

const BEN = '11111111-1111-4111-8111-111111111111';
const cloud = { cloud: true, storage: { [UNLOCK]: '1' } };

/** Ada decorates her house and opens her island; Ben visits (as a best friend, or with a code) */
async function visitAda(game, newPhone, { friend }) {
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  await game.page.evaluate(() => {
    S.room[0] = 'bed';
    S.room[5] = 'plant';
    save();
  });
  const ben = await newPhone();
  await ben.open(cloud);
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  await island.visit(ben.page, BEN, { cloud: friend });
  return { ada: game.page, ben: ben.page };
}
const tapHouse = page => page.evaluate(() => doAct({ k: 'house' }));

test('a best friend can look around inside, but not change anything', async ({ game, newPhone }) => {
  const { ada, ben } = await visitAda(game, newPhone, { friend: true });
  await tapHouse(ben);
  await expect(ben.locator('#house')).toBeVisible();
  await expect(ben.locator('#htitle')).toHaveText("Ada's House");
  await expect(ben.locator('#house .hint')).toContainText("You're visiting");
  const slots = ben.locator('#floor .slot');
  await expect(slots.nth(0)).not.toBeEmpty();
  await expect(slots.nth(5)).not.toBeEmpty();
  await expect(slots.nth(1)).toBeEmpty();
  // no mirror, and tapping only says what things are
  await expect(ben.locator('#mirbtn')).toBeHidden();
  await expect(ben.locator('#house .mirror')).toBeHidden();
  await slots.nth(0).click();
  await expect(ben.locator('#toast')).toContainText('Bed');
  await slots.nth(1).click();
  await expect(ben.locator('#modal')).toBeHidden();
  expect(await ada.evaluate(() => [S.room[0], S.room[1]])).toEqual(['bed', null]);
  expect(await ben.evaluate(() => S.room.filter(Boolean))).toEqual([]);

  // Ada moves furniture: Ben sees it change while he's inside
  await ada.evaluate(() => {
    S.room[1] = 'plant';
    save();
  });
  await expect(slots.nth(1)).not.toBeEmpty();

  await ben.locator('#hexit').click();
  await expect(ben.locator('#house')).toBeHidden();
  expect(await ben.evaluate(() => busy)).toBe(false);
});

test("an island-code visitor never receives what's inside", async ({ game, newPhone }) => {
  const { ada, ben } = await visitAda(game, newPhone, { friend: false });
  expect(await ben.evaluate(() => MP.island.room)).toBeNull();
  // later updates don't include it either
  await ada.evaluate(() => {
    S.room[2] = 'plant';
    save();
  });
  await ada.waitForTimeout(1200);
  expect(await ben.evaluate(() => MP.island.room)).toBeNull();
  await tapHouse(ben);
  await expect(ben.locator('#toast')).toContainText("That's Ada's house!");
  await expect(ben.locator('#house')).toBeHidden();
});

test('the room is cleaned on arrival: only real furniture, 20 spots', async ({ game, newPhone }) => {
  const { ben } = await visitAda(game, newPhone, { friend: true });
  const room = await ben.evaluate(
    () =>
      cleanIsland({
        name: 'X',
        room: ['bed', '<img src=x>', 'orange', 'shovel', 42, ...Array(30).fill('plant')]
      }).room
  );
  expect(room).toHaveLength(20);
  expect(room.slice(0, 5)).toEqual(['bed', null, null, null, null]);
  expect(room[5]).toBe('plant');
});

test('the cloud copy (for friends visiting while you nap) includes the house', async ({ page, game }) => {
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  const snap = await page.evaluate(() => {
    S.room[3] = 'bed';
    return clBody(1).snapshot;
  });
  expect(snap.room[3]).toBe('bed');
  // while a plain snapshot (for island-code visitors) does not
  expect(await page.evaluate(() => 'room' in snapshot())).toBe(false);
});

test("leaving a visit while inside a friend's house closes it", async ({ game, newPhone }) => {
  const { ada, ben } = await visitAda(game, newPhone, { friend: true });
  await tapHouse(ben);
  await expect(ben.locator('#house')).toBeVisible();
  await ada.evaluate(() => closeIsland());
  await expect.poll(() => ben.evaluate(() => MP.role)).toBe(null);
  await expect(ben.locator('#house')).toBeHidden();
  // and back home, my own house is editable again
  await ben.getByRole('button', { name: 'OK', exact: true }).click();
  await tapHouse(ben);
  await expect(ben.locator('#htitle')).toHaveText("Ben's House");
  await expect(ben.locator('#house .mirror')).toBeVisible();
});
