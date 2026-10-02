// Flying to a friend's island or back home: the clouds part to show where you landed.
const { test, expect } = require('./fixtures');
const { hostIsland } = require('./link');

test('the clouds part when you arrive at a friend and when you fly home', async ({ game, newPhone }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  await ben.page.evaluate(() => {
    S.crafts.jet = 1;
    S.craft = 'jet';
  });
  const island = await hostIsland(game.page);
  await island.visit(ben.page, 'ben', { cloud: false });
  // arriving: clouds, with Ben's own plane flying through
  await expect(ben.page.locator('#clouds .cpuff')).toHaveCount(32);
  await expect(ben.page.locator('#clouds .cplane')).toHaveText('✈️');
  // they never get in the way of tapping
  expect(await ben.page.locator('#clouds').evaluate(e => getComputedStyle(e).pointerEvents)).toBe('none');
  await expect(ben.page.locator('#clouds')).toHaveCount(0, { timeout: 4000 });

  // flying home
  await ben.page.evaluate(() => leaveIsland());
  await ben.page.waitForFunction(() => !MP.role);
  await expect(ben.page.locator('#clouds')).toHaveCount(1);
  await expect(ben.page.locator('#clouds')).toHaveCount(0, { timeout: 4000 });
});

test('with reduced motion, it is just a gentle fade', async ({ page, game }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => cloudsPart());
  await expect(page.locator('#clouds')).toHaveClass(/calm/);
  await expect(page.locator('#clouds .cpuff')).toHaveCount(0);
});
