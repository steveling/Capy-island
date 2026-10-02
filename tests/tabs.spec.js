// Only one tab plays at a time: a second tab on the same phone must never save one player's island over another's.
const { test, expect } = require('./fixtures');

const noCloud = p =>
  p.route('**/js/config.js?*', r =>
    r.fulfill({
      contentType: 'text/javascript',
      body: "const SUPABASE_URL = '';\nconst SUPABASE_ANON_KEY = '';\n"
    })
  );
async function tab(page) {
  const t = await page.context().newPage(); // same phone, same storage
  await noCloud(t);
  await t.goto('/');
  await t.waitForFunction(() => typeof loop === 'function' && islReady);
  return t;
}

test.beforeEach(async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Gollum', '🦄');
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());
  await game.newPlayer('Daddy', '🚀');
  await page.evaluate(() => {
    S.coins = 700;
    save();
  });
});

test("an old tab can't save Daddy's island over Gollum's after a switch", async ({ page }) => {
  // a second tab switches to Gollum, then gets closed
  const tab2 = await tab(page);
  await expect(page.locator('#tabgone')).toBeVisible(); // the first tab steps aside straight away
  await tab2.evaluate(() => {
    closeModal();
    openPlayers();
  });
  await tab2.locator('.plb', { hasText: 'Gollum' }).click();
  await Promise.all([tab2.waitForEvent('load'), tab2.locator('.pwe[aria-label="🦄"]').click()]);
  await tab2.waitForFunction(() => typeof loop === 'function' && islReady);
  await tab2.close();

  // the old tab still has Daddy in memory and tries to save, as it would while playing
  await page.evaluate(() => {
    S.coins = 705;
    save();
  });
  const tab3 = await tab(page);
  expect(
    await tab3.evaluate(() => ({ playing: S.name, coins: S.coins, list: PL.list.map(p => p.name) }))
  ).toEqual({ playing: 'Gollum', coins: 200, list: ['Gollum', 'Daddy'] });
  // Daddy's island is untouched too
  const daddy = await tab3.evaluate(() => {
    const id = PL.list.find(p => p.name === 'Daddy').id;
    return JSON.parse(localStorage.getItem(PL_PARK + id + '.' + KEY)).coins;
  });
  expect(daddy).toBe(700);
});

test('"Play here instead" moves the game to that tab', async ({ page }) => {
  const tab2 = await tab(page);
  await expect(page.locator('#tabgone')).toContainText('Playing in another tab');
  await expect(tab2.locator('#tabgone')).toHaveCount(0);
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Play here instead' }).click()
  ]);
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  await expect(page.locator('#tabgone')).toHaveCount(0);
  await expect(tab2.locator('#tabgone')).toBeVisible();
  // the tab that plays now saves; the other one doesn't
  await page.evaluate(() => {
    S.coins = 1234;
    save();
  });
  await tab2.evaluate(() => {
    S.coins = 1;
    save();
  });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).coins)).toBe(1234);
});
