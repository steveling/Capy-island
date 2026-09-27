// Pressing back by accident asks before leaving the game (#4).
const { test, expect } = require('./fixtures');

const GAME = /localhost:\d+\/$/;

/** arrive at the game from another page, so there is somewhere to go back to */
async function arrive(page, game) {
  await page.goto('/came-from-here');
  await game.open();
  await game.newPlayer('Ada', '🦄'); // taps: the back guard is armed by the first one
}

test('back asks first, and "Keep playing" stays in the game', async ({ page, game }) => {
  await arrive(page, game);
  await page.goBack();
  await expect(page.locator('#quit')).toBeVisible();
  expect(page.url()).toMatch(GAME);

  await page.getByRole('button', { name: 'Keep playing! 🩷' }).click();
  await expect(page.locator('#quit')).toBeHidden();
  // and it asks again next time
  await page.goBack();
  await expect(page.locator('#quit')).toBeVisible();
  expect(page.url()).toMatch(GAME);
});

test('"Leave" really goes back, with the island saved', async ({ page, game }) => {
  await arrive(page, game);
  await page.evaluate(() => {
    S.coins = 4321; // not saved yet
  });
  await page.goBack();
  await expect(page.locator('#quit')).toBeVisible();
  await Promise.all([
    page.waitForURL(/came-from-here/),
    page.getByRole('button', { name: 'Leave 👋' }).click()
  ]);
  await page.goForward();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await page.evaluate(() => S.coins)).toBe(4321);
});

test('an open screen is still there after "Keep playing"', async ({ page, game }) => {
  await arrive(page, game);
  await page.evaluate(() => openShop());
  await page.goBack();
  await expect(page.locator('#quit')).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing! 🩷' }).click();
  await expect(page.locator('#card h2')).toHaveText("🦝 Berry's Shop");
});

test('with no page to go back to, "Leave" explains how to close', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.goBack();
  // like a tab opened straight onto the game: going back further does nothing
  await page.evaluate(() => (history.back = () => {}));
  await expect(page.locator('#quit')).toBeVisible();
  await page.getByRole('button', { name: 'Leave 👋' }).click();
  await expect(page.locator('#toast')).toContainText('close this tab');
  expect(page.url()).toMatch(GAME);
});
