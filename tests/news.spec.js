// The "New on Capy Island!" splash: shown once to each existing island, never to brand-new players.
const { test, expect, pickSecret } = require('./fixtures');

const KEY = 'capyIsland.v2';
const ready = page => page.waitForFunction(() => typeof loop === 'function' && islReady);
const TITLES = [
  'New planes!',
  'Chatty neighbours',
  'Make new friends',
  'Drawing board',
  'Take turns!',
  'Chat with best friends',
  'Your own emotes',
  'Peek inside',
  'Shh, napping!',
  'Better fishing',
  'New sounds',
  'Little fixes'
];

/** make the current island look like it's from before this splash existed, then come back to the game */
async function comeBack(page, change = s => delete s.news) {
  await page.evaluate(change => {
    new Function('s', change)(S);
    save();
    restoring = true; // nothing else saves over it on the way out
  }, `(${change})(s)`);
  await page.reload();
  await ready(page);
}

test('an existing island sees the splash once', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await comeBack(page);
  await expect(page.locator('#card h2')).toHaveText('🎉 New on Capy Island!');
  await expect(page.locator('#card')).toContainText('Hi Ada!');
  await expect(page.locator('.news .nw b')).toHaveText(TITLES);
  await page.getByRole('button', { name: "Let's play! 🩷" }).click();
  await expect(page.locator('#modal')).toBeHidden();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).news, KEY)).toBe(
    await page.evaluate(() => NEWS_V)
  );
  // next time: straight into the game
  await page.reload();
  await ready(page);
  await expect(page.locator('#modal')).toBeHidden();
});

test('closing the tab before tapping "Let\'s play" shows it again next time', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await comeBack(page);
  await expect(page.locator('#card h2')).toHaveText('🎉 New on Capy Island!');
  await page.reload();
  await ready(page);
  await expect(page.locator('#card h2')).toHaveText('🎉 New on Capy Island!');
});

test('brand-new players go straight into the game', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await expect(page.locator('#modal')).toBeHidden();
  expect(await page.evaluate(() => S.news === NEWS_V)).toBe(true);
  await page.reload();
  await ready(page);
  await expect(page.locator('#modal')).toBeHidden();
});

test('it comes after picking a secret emoji', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => {
    plMe().pw = null;
    plWrite();
  });
  await comeBack(page);
  await pickSecret(page, '🐢');
  await expect(page.locator('#card h2')).toHaveText('🎉 New on Capy Island!');
});

test('a very old island sees the museum news first, then this', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await comeBack(page, s => {
    delete s.news;
    delete s.v4news;
  });
  await expect(page.locator('#card h2')).toHaveText(/Something new on Capy Island/);
  await page.getByRole('button', { name: "Let's go! 🩷" }).click();
  await expect(page.locator('#card h2')).toHaveText('🎉 New on Capy Island!');
  await page.getByRole('button', { name: "Let's play! 🩷" }).click();
  await expect(page.locator('#modal')).toBeHidden();
});

test('an island that saw the last splash only gets the new card', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await comeBack(page, s => (s.news = 7));
  await expect(page.locator('#card h2')).toHaveText('🎉 New on Capy Island!');
  await expect(page.locator('.news .nw b')).toHaveText(['New planes!', 'Chatty neighbours']);
  await page.getByRole('button', { name: "Let's play! 🩷" }).click();
  expect(await page.evaluate(() => S.news)).toBe(8);
});
