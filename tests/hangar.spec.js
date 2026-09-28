// Fancier planes and helicopters from the Capy Air hangar.
const { test, expect } = require('./fixtures');
const { hostIsland } = require('./link');

async function openHangar(page) {
  await page.evaluate(() => {
    busy = false;
    openDock();
  });
  await page.getByRole('button', { name: '🛠️ My planes' }).click();
  await expect(page.locator('#card h3', { hasText: 'My planes' })).toBeVisible();
}
const row = (page, name) => page.locator('#card .li', { hasText: name });

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
});

test('everyone starts with the pink seaplane, and the others cost coins', async ({ page }) => {
  await openHangar(page);
  await expect(row(page, 'Pink Seaplane').getByRole('button')).toHaveText('Flying ✓');
  // not enough coins yet
  await expect(row(page, 'Bubble Copter').getByRole('button')).toBeDisabled();
  expect(await page.evaluate(() => document.querySelectorAll('.craftcv').length)).toBe(5);
});

test('buying a helicopter puts it at the dock, and it stays after a reload', async ({ page }) => {
  await page.evaluate(() => {
    S.coins = 3100;
    hud();
  });
  await openHangar(page);
  await row(page, 'Bubble Copter').getByRole('button', { name: '🪙 3000' }).click();
  await expect(row(page, 'Bubble Copter').getByRole('button')).toHaveText('Flying ✓');
  expect(await page.evaluate(() => [S.coins, S.craft, dockCraft()])).toEqual([100, 'copter', 'copter']);
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await page.evaluate(() => [S.craft, S.crafts])).toEqual(['copter', { pink: 1, copter: 1 }]);
  // switch back to one you have
  await openHangar(page);
  await row(page, 'Pink Seaplane').getByRole('button', { name: 'Use' }).click();
  expect(await page.evaluate(() => S.craft)).toBe('pink');
  await expect(row(page, 'Bubble Copter').getByRole('button')).toHaveText('Use');
});

test("can't buy without enough coins, even by calling it directly", async ({ page }) => {
  await page.evaluate(() => {
    S.coins = 100;
    buyCraft('jet');
    useCraft('jet');
  });
  expect(await page.evaluate(() => [S.coins, S.craft, !!S.crafts.jet])).toEqual([100, 'pink', false]);
});

test('every plane draws at the dock', async ({ page }) => {
  for (const k of ['pink', 'sunny', 'biplane', 'copter', 'jet']) {
    await page.evaluate(k => {
      S.crafts[k] = 1;
      S.craft = k;
    }, k);
    await page.waitForTimeout(150); // a few frames (page errors fail the test)
  }
});

test('broken plane saves are fixed', async ({ game, newPhone }) => {
  const storage = await game.storage();
  const sv = JSON.parse(storage['capyIsland.v2']);
  sv.craft = 'ufo';
  sv.crafts = { ufo: 1, jet: 1 };
  storage['capyIsland.v2'] = JSON.stringify(sv);
  const other = await newPhone();
  await other.open({ storage });
  expect(await other.page.evaluate(() => [S.craft, S.crafts])).toEqual(['pink', { jet: 1, pink: 1 }]);
});

test("visitors see the host's plane at the dock, and fly in their own", async ({ game, newPhone }) => {
  await game.page.evaluate(() => {
    S.crafts.jet = 1;
    S.craft = 'jet';
  });
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  await ben.page.evaluate(() => {
    S.crafts.copter = 1;
    S.craft = 'copter';
  });
  const island = await hostIsland(game.page);
  await island.visit(ben.page, 'ben', { cloud: false });
  await expect.poll(() => ben.page.evaluate(() => dockCraft())).toBe('jet');
  // the hangar is only at home
  await ben.page.evaluate(() => openDock('hangar'));
  await expect(ben.page.locator('#card h3', { hasText: 'My planes' })).toHaveCount(0);
  expect(await ben.page.evaluate(() => CRAFTS[myCraft()].e)).toBe('🚁');
});
