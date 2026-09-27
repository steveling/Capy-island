// Every screen opens without errors, and basic play works.
const { test, expect } = require('./fixtures');

const SCREENS = {
  bag: ['bagView()', /Bag/],
  book: ['bookView()', /Book|Collection/],
  shop: ['openShop()', /Shop/],
  museum: ["openMuseum('bug')", /Professor Hoot/],
  café: ["openMuseum('cafe')", /Bijou/],
  'art boat': ['openArt()', /Fennel|art|sold out/i],
  mirror: ['openMirror()', /Mirror/],
  seaplane: ['openDock()', /Capy Air/],
  'grown-ups': ['grownups()', /Grown-ups/],
  "what's new": ['showNews()', /new/i],
  players: ['openPlayers()', /Who's playing/]
};

for (const [name, [call, heading]] of Object.entries(SCREENS)) {
  test(`the ${name} screen opens`, async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await page.evaluate(call => {
      busy = false;
      (0, eval)(call);
    }, call);
    await expect(page.locator('#card:visible, #museum:visible').first()).toContainText(heading);
  });
}

test('the house opens and closes', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => openHouse());
  await expect(page.locator('#house')).toBeVisible();
  await expect(page.locator('#htitle')).toHaveText("Ada's House");
  await page.locator('#hexit').click();
  await expect(page.locator('#house')).toBeHidden();
});

test('tapping the island walks the capybara there', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.waitForTimeout(500); // let the welcome toast settle
  const start = await page.evaluate(() => [P.x, P.y]);
  const vp = page.viewportSize();
  await page.mouse.click(vp.width * 0.3, vp.height * 0.65);
  await expect.poll(() => page.evaluate(() => [P.x, P.y]), { timeout: 5000 }).not.toEqual(start);
});

test('the bottom buttons open the bag and the book', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.locator('#bBag').click();
  await expect(page.locator('#card')).toBeVisible();
  const bag = await page.locator('#card h2').textContent();
  await page.evaluate(() => closeModal());
  await page.locator('#bBook').click();
  await expect(page.locator('#card')).toBeVisible();
  expect(await page.locator('#card h2').textContent()).not.toBe(bag);
});
