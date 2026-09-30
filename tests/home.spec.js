// More rooms, the backyard, playing with things, baking, and treats for the neighbours.
const { test, expect } = require('./fixtures');
const { hostIsland } = require('./link');

const BEN = '11111111-1111-4111-8111-111111111111';
const tab = (page, name) => page.locator('#htabs button', { hasText: name });
const slots = page => page.locator('#floor .slot');
const toastText = page => page.locator('#toast').textContent();
async function inHouse(page, setup) {
  await page.evaluate(setup || (() => {}));
  await page.evaluate(() => {
    busy = false;
    openHouse();
  });
  await expect(page.locator('#house')).toBeVisible();
}

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
});

test('rooms get built with coins, and each keeps its own things', async ({ page }) => {
  await inHouse(page, () => {
    S.coins = 900;
    S.bag.plant = 1;
    S.bag.teddy = 1;
  });
  await expect(page.locator('#htabs button')).toHaveText([
    '🛋️ Living Room',
    '🛏️ Bedroom 🔒',
    '🍳 Kitchen 🔒',
    '🌳 Backyard'
  ]);
  // the kitchen costs more than Ada has
  await tab(page, 'Kitchen').click();
  await expect(page.getByRole('button', { name: 'Build it! 🔨' })).toBeDisabled();
  await page.getByRole('button', { name: 'Not yet' }).click();
  await tab(page, 'Bedroom').click();
  await page.getByRole('button', { name: 'Build it! 🔨' }).click();
  expect(await page.evaluate(() => [S.coins, S.built])).toEqual([100, { bed: 1 }]);
  await expect(tab(page, 'Bedroom')).toHaveClass(/on/);
  // put the teddy in the bedroom
  await slots(page).nth(3).click();
  await page.locator('#card .cell', { hasText: 'Teddy' }).click();
  await expect(slots(page).nth(3)).not.toBeEmpty();
  expect(await page.evaluate(() => [S.rooms.bed[3], S.room.filter(Boolean).length])).toEqual(['teddy', 0]);
  // reload: still there
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await page.evaluate(() => [S.built.bed, S.rooms.bed[3]])).toEqual([1, 'teddy']);
});

test('tapping things plays with them; "Move things" puts them away', async ({ page }) => {
  await inHouse(page, () => {
    S.room[0] = 'piano';
  });
  await slots(page).nth(0).click();
  expect(await toastText(page)).toContain('Plink plonk');
  expect(await page.evaluate(() => S.room[0])).toBe('piano');
  await page.getByRole('button', { name: '✏️ Move things' }).click();
  await slots(page).nth(0).click();
  expect(await page.evaluate(() => [S.room[0], S.bag.piano])).toEqual([null, 1]);
  await page.getByRole('button', { name: 'Done ✓' }).click();
  await expect(page.locator('#house .hint')).toContainText('play with them');
});

test('the backyard: garden shop, a chicken that lays one egg a day, and baking', async ({ page }) => {
  await inHouse(page, () => {
    S.coins = 700;
  });
  await tab(page, 'Backyard').click();
  await page.getByRole('button', { name: '🛒 Garden shop' }).click();
  await page.locator('#card .li', { hasText: 'Chicken' }).getByRole('button').click();
  expect(await page.evaluate(() => [S.coins, S.bag.chicken])).toEqual([100, 1]);
  await page.getByRole('button', { name: 'Done' }).click();
  // indoor furniture can go outside too, but outdoor things stay out of the living room
  await slots(page).nth(7).click();
  await page.locator('#card .cell', { hasText: 'Chicken' }).click();
  expect(await page.evaluate(() => S.yard[7])).toBe('chicken');
  await slots(page).nth(7).click();
  expect(await toastText(page)).toContain('fresh egg');
  await slots(page).nth(7).click();
  expect(await toastText(page)).toContain('No more eggs today');
  expect(await page.evaluate(() => S.bag.egg)).toBe(1);

  // the kitchen: pancakes need 2 eggs; orange pie needs 3 oranges
  await page.evaluate(() => {
    S.coins = 1500;
    S.built.kitchen = 1;
    S.bag.orange = 3;
  });
  await tab(page, 'Kitchen').click();
  await page.getByRole('button', { name: '🍳 Bake' }).click();
  await expect(page.locator('#card .li', { hasText: 'Pancakes' }).getByRole('button')).toBeDisabled();
  await page.locator('#card .li', { hasText: 'Orange Pie' }).getByRole('button').click();
  expect(await page.evaluate(() => [S.bag.pie, S.bag.orange || 0])).toEqual([1, 0]);
});

test('a nap in the bedroom finds coins under the pillow once a day', async ({ page }) => {
  await inHouse(page, () => {
    S.built.bed = 1;
    S.coins = 0;
  });
  await tab(page, 'Bedroom').click();
  await page.getByRole('button', { name: '🛏️ Nap' }).click();
  await expect(page.locator('#toast')).toContainText('under your pillow');
  expect(await page.evaluate(() => S.coins)).toBe(40);
  await page.getByRole('button', { name: '🛏️ Nap' }).click();
  await expect(page.locator('#toast')).toContainText('Zzz');
  await page.waitForTimeout(1700);
  expect(await page.evaluate(() => S.coins)).toBe(40);
});

test('neighbours love a shared treat, once a day (their favourite counts double)', async ({ page }) => {
  await page.evaluate(() => {
    S.bag.pie = 2;
    S.neigh.puddle.done = true;
    busy = false;
    openTalk(NEIGH[2]);
  });
  const f = await page.evaluate(() => S.neigh.puddle.f);
  await page.getByRole('button', { name: 'Share 🥧' }).click();
  await expect(page.locator('#talk .tt')).toContainText('FAVORITE');
  expect(await page.evaluate(() => [S.neigh.puddle.f, S.bag.pie])).toEqual([Math.min(10, f + 2), 1]);
  await expect(page.getByRole('button', { name: /^Share/ })).toHaveCount(0);
  // eat the other one from the bag
  await page.evaluate(() => {
    closeTalk();
    bagView();
  });
  await page.locator('#card .cell', { hasText: 'Orange Pie' }).click();
  await page.getByRole('button', { name: 'Eat! 😋' }).click();
  expect(await page.evaluate(() => S.bag.pie)).toBeUndefined();
});

test('broken home saves are fixed', async ({ game, newPhone }) => {
  const storage = await game.storage();
  const sv = JSON.parse(storage['capyIsland.v2']);
  sv.rooms = { bed: ['teddy', 'ferris', 'nope'], kitchen: 'x', attic: [] };
  sv.yard = ['ferris', 'teddy', 'orange'];
  sv.built = { bed: 1, attic: 1, living: 1 };
  sv.once = { egg: 3, 'bad key!': 1, pillow: 'x' };
  sv.mail = [{ from: 'Ben', c: 'nope', item: 'shovel', note: 99, st: 2, read: 1 }, 'junk', { from: 5 }];
  storage['capyIsland.v2'] = JSON.stringify(sv);
  const other = await newPhone();
  await other.open({ storage });
  const s = await other.page.evaluate(() => ({
    bed: S.rooms.bed.slice(0, 3),
    kitchen: S.rooms.kitchen.filter(Boolean),
    yard: S.yard.slice(0, 3),
    built: S.built,
    once: S.once,
    mail: S.mail.map(m => [m.from, m.c, m.item, m.note, m.st, m.read])
  }));
  expect(s).toEqual({
    bed: ['teddy', null, null],
    kitchen: [],
    yard: ['ferris', 'teddy', null],
    built: { bed: 1 },
    once: { egg: 3 },
    mail: [['Ben', 'caramel', null, 0, 2, true]]
  });
});

test('best friends can visit every room and the backyard, and play with things', async ({
  game,
  newPhone
}) => {
  const ada = game.page;
  await ada.evaluate(() => {
    S.built.bed = 1;
    S.rooms.bed[0] = 'teddy';
    S.yard[2] = 'chicken';
    S.yard[3] = 'ferris';
  });
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(ada);
  await island.visit(ben.page, BEN, { cloud: true });
  await ben.page.evaluate(() => {
    busy = false;
    openHouse();
  });
  await expect(ben.page.locator('#htabs button')).toHaveText(['🛋️ Living Room', '🛏️ Bedroom', '🌳 Backyard']);
  await expect(ben.page.locator('#hedit')).toBeHidden();
  await tab(ben.page, 'Backyard').click();
  await expect(ben.page.getByRole('button', { name: '🛒 Garden shop' })).toHaveCount(0);
  await slots(ben.page).nth(3).click();
  expect(await toastText(ben.page)).toContain('Wheee');
  // no eggs for visitors
  await slots(ben.page).nth(2).click();
  expect(await toastText(ben.page)).toContain("That's Ada's Chicken");
  expect(await ben.page.evaluate(() => [S.bag.egg, S.yard.filter(Boolean).length])).toEqual([undefined, 0]);
});

test('island-code visitors only see the outside', async ({ game, newPhone }) => {
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  await island.visit(ben.page, 'ben', { cloud: false });
  expect(await ben.page.evaluate(() => [MP.island.room, MP.island.rooms, MP.island.yard])).toEqual([
    null,
    null,
    null
  ]);
});
