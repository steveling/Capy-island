// Any player can change their own name from "Who's playing?".
const { test, expect, UNLOCK } = require('./fixtures');
const { fakeCloud } = require('./fake-cloud');

async function renameTo(page, name) {
  await page.locator('#who').click();
  await page.getByRole('button', { name: '✏️ Change my name' }).click();
  await page.locator('#rnm').fill(name);
  await page.getByRole('button', { name: 'Save ✓' }).click();
}

test('a player renames themselves; the list, the name tag and the save follow', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Gollum', '🦄');
  await renameTo(page, '  Precious  ');
  await expect(page.locator('#toast')).toContainText('Hello, Precious!');
  await expect(page.locator('#who')).toContainText('Precious');
  expect(await page.evaluate(() => [S.name, PL.list.map(p => p.name)])).toEqual(['Precious', ['Precious']]);
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await page.evaluate(() => [S.name, PL.list[0].name])).toEqual(['Precious', 'Precious']);
});

test('names are cleaned and kept short; an empty name is refused', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await renameTo(page, '<b>Ada"bella"</b> the Great');
  expect(await page.evaluate(() => S.name)).toBe('bAdabella'); // the box stops at 12, then < > " go
  // (12 letters at most, and none of < > & " ' ` \)
  await renameTo(page, '   ');
  await expect(page.locator('#card .note')).toContainText('at least one letter');
  expect(await page.evaluate(() => S.name)).toBe('bAdabella');
  // the dice picks a fun name
  await page.getByRole('button', { name: 'Pick a fun name' }).click();
  const fun = await page.locator('#rnm').inputValue();
  expect(await page.evaluate(n => NAMES.includes(n), fun)).toBe(true);
});

test('each player renames only themselves', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Gollum', '🦄');
  await page.locator('#who').click();
  await page.getByRole('button', { name: /New player/ }).click();
  await game.afterSwitch(() => page.getByRole('button', { name: "Let's go!" }).click());
  await game.newPlayer('Daddy', '🚀');
  await renameTo(page, 'Big Daddy');
  expect(await page.evaluate(() => PL.list.map(p => p.name))).toEqual(['Gollum', 'Big Daddy']);
});

test('in cloud mode the new name is uploaded for best friends to see', async ({ page, game }) => {
  await fakeCloud(page, { rpc: { my_cloud_status: { has_island: true, save_ts: 0 } } });
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready);
  await renameTo(page, 'Adelaide');
  expect(await page.evaluate(() => [CL.meta.dirty, clBody(1).save.name, clBody(1).snapshot.name])).toEqual([
    true,
    'Adelaide',
    'Adelaide'
  ]);
});
