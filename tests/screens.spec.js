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

test.describe('long screens keep their buttons on screen (#3)', () => {
  // a small phone (360x640), where the museum and shop run past the bottom of the screen
  test.use({ viewport: { width: 360, height: 640 } });
  // lots of different things in the bag, so the shop and bag lists are long
  const fill = page =>
    page.evaluate(() => {
      Object.keys(ITEMS)
        .filter(k => ITEMS[k].k !== 'tool' && !ITEMS[k].ns)
        .slice(0, 40)
        .forEach(k => addItem(k, 2));
      save();
    });

  test('shop: the list scrolls, the goodbye button stays put', async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await fill(page);
    await page.evaluate(() => openShop());
    const bye = page.getByRole('button', { name: 'Bye, Berry! 👋' });
    await expect(bye).toBeInViewport({ ratio: 1 });
    // scroll the list to the very end: still there, and the last item is reachable
    await page.locator('#card').evaluate(c => (c.scrollTop = c.scrollHeight));
    await expect(bye).toBeInViewport({ ratio: 1 });
    await expect(page.locator('#card .li').last()).toBeInViewport();
    await bye.click();
    await expect(page.locator('#modal')).toBeHidden();
  });

  test('bag: the close button stays on screen', async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await fill(page);
    await page.evaluate(() => bagView());
    await expect(page.locator('#card > .row').last()).toBeInViewport({ ratio: 1 });
  });

  test('museum: the Leave button stays on screen while the cases scroll', async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await page.evaluate(() => openMuseum('bug'));
    const leave = page.getByRole('button', { name: 'Leave 🚪' });
    // the page really is longer than the screen here
    expect(await page.locator('#museum').evaluate(m => m.scrollHeight > m.clientHeight)).toBe(true);
    await expect(leave).toBeInViewport({ ratio: 1 });
    await page.locator('#museum').evaluate(m => (m.scrollTop = m.scrollHeight));
    await expect(leave).toBeInViewport({ ratio: 1 });
    // the café too
    await page.evaluate(() => mvTab('cafe'));
    await expect(leave).toBeInViewport({ ratio: 1 });
    await leave.click();
    await expect(page.locator('#museum')).toBeHidden();
  });
});
