// Several players on one phone: secret emojis, switching, and the grown-ups tools.
const { test, expect, pickSecret, UNLOCK } = require('./fixtures');

const KEY = 'capyIsland.v2';

/** open "Who's playing?" and tap a player */
async function tapPlayer(page, name) {
  await page.locator('#who').click();
  await expect(page.locator('#card h2')).toHaveText(/Who's playing/);
  await page.locator('.plb', { hasText: name }).click();
}
const choices = page =>
  page.locator('#pwg .pwe').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label')));

test('a new player picks a secret emoji right after naming themselves', async ({ page, game }) => {
  await game.open();
  await page.locator('#nm').fill('Ada');
  await page.locator('#go').click();
  await expect(page.locator('#card h2')).toHaveText(/Pick your secret emoji/);
  await expect(page.locator('#pwg .pwe')).toHaveCount(40);
  await pickSecret(page, '🦄');
  await expect(page.locator('#modal')).toBeHidden();
  const pl = await game.players();
  expect(pl.list).toEqual([{ id: pl.active, name: 'Ada', color: 'pink', pw: '🦄' }]);
  await expect(page.locator('#who')).toContainText('Ada');
});

test('tapping the wrong emoji when confirming starts the pick over', async ({ page, game }) => {
  await game.open();
  await page.locator('#nm').fill('Ada');
  await page.locator('#go').click();
  await page.locator('.pwe[aria-label="🦄"]').click();
  const wrong = (await choices(page)).find(e => e !== '🦄');
  await page.locator(`.pwe[aria-label="${wrong}"]`).click();
  await expect(page.locator('#pwmsg')).toContainText('not the one you picked');
  await expect(page.locator('#card h2')).toHaveText(/Pick your secret emoji/);
  expect((await game.players()).list[0].pw).toBeNull();
});

test('an existing player without a secret emoji is asked to make one on start', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  // an island from before player switching existed: no players list at all
  await page.evaluate(() => localStorage.removeItem('capyIsland.players'));
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  await expect(page.locator('#card h2')).toHaveText(/Pick your secret emoji/);
  await pickSecret(page, '🐢');
  expect((await game.players()).list).toMatchObject([{ name: 'Ada', pw: '🐢' }]);
});

test('switching asks for the secret emoji out of 12, and keeps islands separate', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => {
    S.coins = 777;
    save();
  });

  // Ada makes room for a brand-new player
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());
  await expect(page.locator('#card h2')).toHaveText(/Welcome to Capy Island/);
  await game.newPlayer('Ben', '🚀');
  await expect(page.locator('#coins')).toHaveText('🪙 200');

  // back to Ada: 12 different emojis, hers among them, the same set every time
  await tapPlayer(page, 'Ada');
  await expect(page.locator('#card h2')).toHaveText('🤫 Hi Ada!');
  const first = await choices(page);
  expect(first).toHaveLength(12);
  expect(new Set(first).size).toBe(12);
  expect(first).toContain('🦄');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.locator('.plb', { hasText: 'Ada' }).click();
  expect((await choices(page)).sort()).toEqual([...first].sort());

  await game.afterSwitch(() => page.locator('.pwe[aria-label="🦄"]').click());
  await expect(page.locator('#who')).toContainText('Ada');
  await expect(page.locator('#coins')).toHaveText('🪙 777');

  // and Ben's island is still Ben's
  await tapPlayer(page, 'Ben');
  await game.afterSwitch(() => page.locator('.pwe[aria-label="🚀"]').click());
  await expect(page.locator('#coins')).toHaveText('🪙 200');
  expect(await page.evaluate(() => S.name)).toBe('Ben');
});

test('three wrong emojis mean a 30 second break', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());
  await game.newPlayer('Ben', '🚀');

  await tapPlayer(page, 'Ada');
  const wrong = (await choices(page)).filter(e => e !== '🦄');
  await page.locator(`.pwe[aria-label="${wrong[0]}"]`).click();
  await expect(page.locator('#pwmsg')).toContainText("that's not it");
  await page.locator(`.pwe[aria-label="${wrong[1]}"]`).click();
  await page.locator(`.pwe[aria-label="${wrong[2]}"]`).click();
  await expect(page.locator('#pwmsg')).toContainText('little break');
  await expect(page.locator('#pwg')).toHaveClass(/off/);
  // even the right one does nothing during the break
  await page.evaluate(() => pwTry(pwG.indexOf('🦄')));
  expect(await page.evaluate(() => S.name)).toBe('Ben');

  // break over (fast-forwarded): the right emoji works
  await page.evaluate(() => Object.values(pwTries).forEach(t => (t.until = 0)));
  await expect(page.locator('#pwg')).not.toHaveClass(/off/);
  await game.afterSwitch(() => page.locator('.pwe[aria-label="🦄"]').click());
  expect(await page.evaluate(() => S.name)).toBe('Ada');
});

test('a player without a secret emoji must make one before switching away', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => {
    plMe().pw = null;
    plWrite();
  });
  await page.locator('#who').click();
  await expect(page.locator('#card')).toContainText('Before you switch');
  await pickSecret(page, '🍕');
  await expect(page.locator('#card h2')).toHaveText(/Who's playing/);
  expect((await game.players()).list[0].pw).toBe('🍕');
});

test('switching is blocked while visiting or hosting', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => {
    MP.role = 'host';
    openPlayers();
  });
  await expect(page.locator('#toast')).toContainText('finish visiting');
  await expect(page.locator('#modal')).toBeHidden();
});

test('each player keeps their own cloud sign-in and passcode unlock', async ({ page, game }) => {
  await game.open({ cloud: true, storage: { [UNLOCK]: '1', 'capyIsland.auth': '{"ada":1}' } });
  await game.newPlayer('Ada', '🦄');
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());

  // the new player has a new cloud identity, so the secret word is needed again
  await expect(page.locator('#gate')).toBeVisible();
  const st = await game.storage();
  expect(st[UNLOCK]).toBeUndefined();
  expect(st[KEY]).toBeUndefined();
  expect(st['capyIsland.auth']).toBeUndefined();
  const ada = (await game.players()).list[0].id;
  expect(st[`capyIsland.p.${ada}.${UNLOCK}`]).toBe('1');
  expect(st[`capyIsland.p.${ada}.capyIsland.auth`]).toBe('{"ada":1}');
  expect(JSON.parse(st[`capyIsland.p.${ada}.${KEY}`]).name).toBe('Ada');
});

test('grown-ups can reset a secret emoji and remove a player', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());
  await game.newPlayer('Ben', '🚀');
  const ada = (await game.players()).list.find(p => p.name === 'Ada').id;

  await page.evaluate(() => grownups());
  await expect(page.locator('#card h3', { hasText: 'Players' })).toBeVisible();
  await page.locator(`button[onclick="plReset('${ada}')"]`).click();
  await expect(page.locator('#card .note')).toContainText("Ada's secret emoji was reset");
  expect((await game.players()).list.find(p => p.id === ada).pw).toBeNull();

  // Ada (no emoji now) switches straight in
  await page.evaluate(() => closeModal());
  await page.locator('#who').click();
  await expect(page.locator('.plb', { hasText: 'Ada' })).not.toContainText('🔒');
  await game.afterSwitch(() => page.locator('.plb', { hasText: 'Ada' }).click());
  await expect(page.locator('#card h2')).toHaveText(/Pick your secret emoji/);
  await pickSecret(page, '🌈');

  // remove Ben from Ada's island
  const ben = (await game.players()).list.find(p => p.name === 'Ben').id;
  await page.evaluate(() => grownups());
  await page.locator(`button[onclick="plRemoveAsk('${ben}')"]`).click();
  await expect(page.locator('#card h2')).toHaveText(/Remove Ben/);
  await page.getByRole('button', { name: 'Yes, remove' }).click();
  expect((await game.players()).list.map(p => p.name)).toEqual(['Ada']);
  expect(Object.keys(await game.storage()).filter(k => k.includes(ben))).toEqual([]);
});
