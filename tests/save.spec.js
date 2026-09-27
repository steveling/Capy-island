// The save file: persistence, upgrades from older saves, items, days, and backups.
const { test, expect } = require('./fixtures');

const KEY = 'capyIsland.v2';

test('the island is saved to localStorage and survives a reload', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => {
    S.coins = 1234;
    save();
  });
  const stored = JSON.parse((await game.storage())[KEY]);
  expect(stored).toMatchObject({ name: 'Ada', coins: 1234 });
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  await expect(page.locator('#coins')).toHaveText('🪙 1234');
});

test('an old, minimal save is upgraded with the new fields', async ({ page, game }) => {
  const old = { name: 'Old', coins: 50, neigh: {}, bag: { orange: 2 }, found: {}, day: 3, dayKey: '' };
  await game.open({ storage: { [KEY]: JSON.stringify(old) } });
  const s = await page.evaluate(() => S);
  expect(s).toMatchObject({ name: 'Old', color: 'pink', acc: 'bow' });
  expect(s.bag).toMatchObject({ orange: 2, shovel: 1, can: 1, seed_tulip: 3 });
  expect(Object.keys(s.neigh).sort()).toEqual(['mochi', 'pip', 'puddle']);
  expect(s.garden).toHaveLength(8);
  expect(s.room).toHaveLength(20);
});

test('items go in and out of the bag; fruit stacks on your head', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const r = await page.evaluate(() => {
    const first = addItem('orange', 2);
    const again = addItem('orange');
    const out = [first, again, S.bag.orange, S.stack.filter(f => f === 'orange').length];
    out.push(takeItem('orange', 2), S.bag.orange, takeItem('orange', 5), S.bag.orange);
    out.push(takeItem('orange'), 'orange' in S.bag);
    return out;
  });
  expect(r).toEqual([true, false, 3, 3, true, 1, false, 1, true, false]);
});

test('a new day refills the trees and counts up, but only once per day', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const r = await page.evaluate(() => {
    const day = S.day;
    S.trees = S.trees.map(() => 0);
    const same = newDay();
    S.dayKey = '2000-01-01';
    const next = newDay();
    return { same, next, gained: S.day - day, trees: S.trees };
  });
  expect(r.same).toBe(false);
  expect(r.next).toBe(true);
  expect(r.gained).toBe(1);
  expect(r.trees.every(t => t === 3)).toBe(true);
});

test('a backup code round-trips, and junk is rejected', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const r = await page.evaluate(() => {
    S.coins = 4321;
    const code = 'CAPY1:' + b64enc(JSON.stringify(backupObj()));
    const back = parseBackup(code).save;
    const bad = [
      '',
      'hello',
      '{"name":"x"}',
      JSON.stringify({ name: 'x', coins: 1, neigh: {}, bag: { nope: 1 } })
    ].map(t => {
      try {
        parseBackup(t);
        return 'accepted';
      } catch (e) {
        return 'rejected';
      }
    });
    return { name: back.name, coins: back.coins, bad };
  });
  expect(r).toEqual({ name: 'Ada', coins: 4321, bad: ['rejected', 'rejected', 'rejected', 'rejected'] });
});

test('restoring a backup from the grown-ups panel replaces the island', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const code = await page.evaluate(() => {
    S.coins = 999;
    const c = 'CAPY1:' + b64enc(JSON.stringify(backupObj()));
    S.coins = 1;
    save();
    return c;
  });
  await page.evaluate(() => grownups());
  await page.locator('#bkpaste').fill(code);
  await page.getByRole('button', { name: 'Restore from code' }).click();
  await expect(page.locator('#card h2')).toHaveText(/Restore backup/);
  await game.afterSwitch(() => page.getByRole('button', { name: 'Yes, restore' }).click());
  await expect(page.locator('#coins')).toHaveText('🪙 999');
});
