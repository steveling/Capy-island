// Neighbours have lots to say: varied lines, today's request, jokes with a punchline, and little speech bubbles.
const { test, expect } = require('./fixtures');
const { hostIsland } = require('./link');

const said = page => page.locator('#talk .tt').textContent();
const talkTo = (page, i) =>
  page.evaluate(i => {
    busy = false;
    openTalk(NEIGH[i]);
  }, i);

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
});

test('neighbours say lots of different things', async ({ page }) => {
  await page.evaluate(() => (S.neigh.mochi.done = true)); // no request today, just chatting
  await talkTo(page, 0);
  const lines = [await said(page)];
  for (let i = 0; i < 20; i++) {
    const more = page.getByRole('button', { name: 'More! 💬' });
    if (await more.isVisible()) await more.click();
    else await page.getByRole('button', { name: 'Tell me! 🤔' }).click();
    lines.push(await said(page));
  }
  expect(new Set(lines).size).toBeGreaterThanOrEqual(16);
  for (let i = 1; i < lines.length; i++) expect(lines[i]).not.toBe(lines[i - 1]);
  expect(lines.join(' ')).not.toMatch(/\{|undefined|null/);
});

test("the first chat of the day asks for today's thing, then Give appears when you have it", async ({
  page
}) => {
  await page.evaluate(() => {
    S.neigh.pip.req = 'orange';
    S.neigh.pip.done = false;
  });
  await talkTo(page, 1);
  expect(await said(page)).toContain('Orange 🍊');
  await expect(page.getByRole('button', { name: 'Give 🍊' })).toHaveCount(0);
  await page.evaluate(() => (S.bag.orange = 1));
  await talkTo(page, 1);
  expect(await said(page)).toContain('Orange 🍊');
  const coins = await page.evaluate(() => S.coins);
  await page.getByRole('button', { name: 'Give 🍊' }).click();
  expect(await said(page)).toContain('Here are 150 coins');
  expect(await page.evaluate(() => S.coins)).toBe(coins + 150);
});

test('jokes have a punchline', async ({ page }) => {
  await page.evaluate(() => {
    S.neigh.puddle.done = true;
    Math.random = () => 0.01; // joke time
  });
  await talkTo(page, 2);
  expect(await said(page)).toMatch(/\?$/);
  await expect(page.getByRole('button', { name: 'More! 💬' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tell me! 🤔' }).click();
  const answer = await said(page);
  expect(await page.evaluate(a => NB_JOKES.some(j => a.includes(j[1])), answer)).toBe(true);
  await expect(page.getByRole('button', { name: 'More! 💬' })).toBeVisible();
});

test("they notice what's going on", async ({ page }) => {
  const ctx = () => page.evaluate(() => nbContext(NEIGH[0]).join('\n'));
  await page.evaluate(() => {
    window.FAKE_HOUR = 22;
    S.accs.crown = 1;
    S.acc = 'crown';
    S.stack = Array(9).fill('orange');
    S.coins = 2500;
  });
  const c = await ctx();
  expect(c).toContain('I love your Capy Crown');
  expect(c).toContain('fruit tower');
  expect(c).toContain('seaplane dock');
  expect(c).toMatch(/late|fireflies/);
  // wearing the hat Mochi made
  await page.evaluate(() => {
    S.accs.leaf = 1;
    S.acc = 'leaf';
  });
  expect(await ctx()).toContain('the Leaf Hat I made you');
});

test('neighbours say little things over their heads', async ({ page }) => {
  await page.evaluate(() => {
    closeModal();
    P.x = NEIGH[0].x + 40;
    P.y = NEIGH[0].y;
    nbPopT = 0;
  });
  await expect.poll(() => page.evaluate(() => NEIGH.some(n => n.say))).toBe(true);
});

test("a visitor can chat with the host's neighbours", async ({ game, newPhone }) => {
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  await island.visit(ben.page, 'ben', { cloud: false });
  await talkTo(ben.page, 0);
  const first = await said(ben.page);
  expect(first.length).toBeGreaterThan(3);
  expect(first).not.toMatch(/\{|undefined/);
  const more = ben.page.getByRole('button', { name: /More! 💬|Tell me! 🤔/ });
  await more.first().click();
  expect(await said(ben.page)).not.toBe(first);
  await expect(ben.page.getByRole('button', { name: /^Give/ })).toHaveCount(0);
});
