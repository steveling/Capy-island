// Picking which emojis go in the emote quick bar, and sending them on a visit.
const { test, expect } = require('./fixtures');
const { hostIsland } = require('./link');

const KEY = 'capyIsland.v2';
const bar = page => page.locator('#emobar button:not(.edit)').evaluateAll(bs => bs.map(b => b.textContent));
const pool = (page, e) => page.locator(`.emopool button[aria-label="${e}"]`);

test('new players start with the original six emotes', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  expect(await bar(page)).toEqual(['👋', '💖', '😂', '⭐', '✨', '🎵']);
  expect(await page.evaluate(() => S.emotes)).toEqual([0, 1, 2, 3, 4, 5]);
});

test('picking emotes fills the slots in turn, swaps duplicates, and is saved', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => openEmotes());
  await expect(page.locator('#card h2')).toHaveText('😊 My emotes');
  await expect(page.locator('.emopool button')).toHaveCount(30);

  // slot 1 is selected first: tapping 🦋 then 🐟 fills slots 1 and 2
  await pool(page, '🦋').click();
  await pool(page, '🐟').click();
  // pick slot 6, then 🦋 again: it moves there and slot 6's old emoji (🎵) goes to 🦋's old spot
  await page.locator('.emoslots button').nth(5).click();
  await pool(page, '🦋').click();
  expect(await bar(page)).toEqual(['🎵', '🐟', '😂', '⭐', '✨', '🦋']);

  await page.getByRole('button', { name: 'Done 💕' }).click();
  await expect(page.locator('#modal')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await bar(page)).toEqual(['🎵', '🐟', '😂', '⭐', '✨', '🦋']);

  // start over puts the originals back
  await page.evaluate(() => openEmotes());
  await page.getByRole('button', { name: 'Start over' }).click();
  expect(await bar(page)).toEqual(['👋', '💖', '😂', '⭐', '✨', '🎵']);
});

test('the mirror opens the emote picker and Done goes back to the mirror', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => openMirror());
  await page.getByRole('button', { name: '😊 My emotes' }).click();
  await expect(page.locator('#card h2')).toHaveText('😊 My emotes');
  await page.getByRole('button', { name: 'Done 💕' }).click();
  await expect(page.locator('#card h2')).toHaveText('🪞 Mirror');
});

test('a broken emote list in a save is reset to the originals', async ({ page, game }) => {
  const save = { name: 'Old', coins: 5, neigh: {}, bag: {}, found: {}, emotes: [0, 0, 99, 'x'] };
  await game.open({ storage: { [KEY]: JSON.stringify(save) } });
  expect(await page.evaluate(() => S.emotes)).toEqual([0, 1, 2, 3, 4, 5]);
});

test('a chosen emote shows over my capybara on the other phone', async ({ game, newPhone }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  // island-code (PeerJS-style) visit: emotes work there too
  await island.visit(ben.page, 'ben', { cloud: false });

  await ben.page.evaluate(() => {
    S.emotes[0] = EMOTE_POOL.indexOf('🦋');
    emoBarUI();
  });
  await ben.page.locator('#bEmo').click();
  await ben.page.locator('#emobar button').first().click();
  await expect
    .poll(() => game.page.evaluate(() => MP.emo.get('ben') && MP.emo.get('ben').at(-1).e))
    .toBe('🦋');

  // an emote number outside the list is ignored
  await ben.page.evaluate(() => MP.conn.send({ t: 'emo', e: 999 }));
  await ben.page.evaluate(() => MP.conn.send({ t: 'emo', e: -1 }));
  await game.page.waitForTimeout(700);
  expect(await game.page.evaluate(() => MP.emo.get('ben').at(-1).e)).toBe('🦋');
});

test('emotes float up from the sender like smoke', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const r = await page.evaluate(() => {
    // draw with a stopped clock and record where each puff lands
    const drawn = [],
      real = emoji;
    emoji = (e, x, y, size) => drawn.push({ e, x, y, size, alpha: ctx.globalAlpha });
    const at = (t, list) => {
      drawn.length = 0;
      time = t;
      emoSmoke(100, 50, list);
      return drawn.map(d => Object.assign({}, d));
    };
    const one = [{ e: '💖', t: 10 }];
    const out = {
      start: at(10.05, one),
      mid: at(10.5, one),
      later: at(11.2, one),
      gone: at(10 + EMO_LIFE + 0.05, one),
      two: at(10.6, [
        { e: '💖', t: 10 },
        { e: '🎵', t: 10.4 }
      ])
    };
    emoji = real;
    // several quick emotes: kept together (up to 4), old ones dropped
    MP.emo.clear();
    time = 20;
    for (let i = 0; i < 6; i++) showEmo('me', i);
    out.kept = MP.emo.get('me').map(m => m.e);
    time = 20 + EMO_LIFE + 1;
    showEmo('me', 0);
    out.afterWait = MP.emo.get('me').length;
    return out;
  });
  // one puff to start, then more, all above where it started and rising
  expect(r.start).toHaveLength(1);
  expect(r.mid.length).toBeGreaterThanOrEqual(3);
  expect(r.mid.every(p => p.y < 50)).toBe(true);
  const firstPuff = pts => pts[0];
  expect(firstPuff(r.later).y).toBeLessThan(firstPuff(r.mid).y);
  expect(firstPuff(r.later).size).toBeGreaterThan(firstPuff(r.mid).size); // it grows as it rises
  expect(new Set(r.mid.map(p => Math.round(p.x))).size).toBeGreaterThan(1); // puffs drift, not a straight line
  // and it fades away completely
  expect(firstPuff(r.later).alpha).toBeLessThan(1);
  expect(r.gone).toEqual([]);
  // two emotes in the air at once
  expect(new Set(r.two.map(p => p.e))).toEqual(new Set(['💖', '🎵']));
  expect(r.kept).toEqual(['😂', '⭐', '✨', '🎵']); // the last four of 👋 💖 😂 ⭐ ✨ 🎵
  expect(r.afterWait).toBe(1);
});
