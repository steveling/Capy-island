// Bringing a player over from another phone/browser (a move, cloud) or from a backup (a copy, any mode).
const { test, expect, pickSecret, UNLOCK } = require('./fixtures');
const { fakeCloud } = require('./fake-cloud');

const KEY = 'capyIsland.v2',
  AUTH = 'capyIsland.auth',
  META = 'capyIsland.cloud',
  CODE = 'ABCD-2345-EFGH';
const BEN = { name: 'Ben', coins: 777, neigh: {}, bag: { orange: 3 }, found: { orange: 1 }, day: 9 };
const ready = page => page.waitForFunction(() => typeof loop === 'function' && islReady);

async function openFrom(page, button) {
  await page.locator('#who').click();
  await page.getByRole('button', { name: button }).click();
}

test.describe('from another phone (cloud)', () => {
  test.beforeEach(async ({ page, game }) => {
    await fakeCloud(page, { claim: { code: CODE.replace(/-/g, ''), save: BEN, ts: 1234 } });
    await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
    await game.newPlayer('Ada', '🦄');
    await page.evaluate(() => {
      S.coins = 55;
      save();
    });
  });

  test('a wrong code changes nothing', async ({ page, game }) => {
    const before = await game.storage();
    await openFrom(page, '📲 From another phone');
    await page.locator('#plxin').fill('ZZZZ-ZZZZ-ZZZZ');
    await page.getByRole('button', { name: 'Bring them here ✈️' }).click();
    await expect(page.locator('#card .note')).toContainText("That code didn't work");
    const after = await game.storage();
    expect(Object.keys(after).filter(k => k.startsWith('capyIsland.xfer'))).toEqual([]);
    expect(after[KEY]).toBe(before[KEY]);
    expect(after[AUTH]).toBe(before[AUTH]);
    expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 55]);
    // badly shaped codes don't even try
    await page.locator('#plxin').fill('123');
    await page.getByRole('button', { name: 'Bring them here ✈️' }).click();
    await expect(page.locator('#card .note')).toContainText('XXXX-XXXX-XXXX');
  });

  test('the right code moves the player in with their own sign-in, next to Ada', async ({ page, game }) => {
    const ada = await game.storage();
    const adaUid = JSON.parse(ada[AUTH]).user.id;
    await openFrom(page, '📲 From another phone');
    await page.locator('#plxin').fill(CODE.toLowerCase());
    await game.afterSwitch(() => page.getByRole('button', { name: 'Bring them here ✈️' }).click());

    // Ben arrives: no passcode gate (the moving code unlocks), and he picks a secret emoji here
    await expect(page.locator('#gate')).toHaveCount(0);
    await expect(page.locator('#card h2')).toHaveText(/Pick your secret emoji/);
    await pickSecret(page, '🚀');
    expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ben', 777]);

    const st = await game.storage();
    const benAuth = JSON.parse(st[AUTH]);
    // the claim was made by Ben's new sign-in, which is now the live one; the temporary copy is gone
    const claims = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('__rpc') || '[]').filter(c => c[0] === 'claim_transfer')
    );
    expect(claims).toEqual([['claim_transfer', { p_code: 'ABCD2345EFGH' }, benAuth.user.id]]);
    expect(benAuth.user.id).not.toBe(adaUid);
    // cloud data belongs to Ben's sign-in (it changed since arriving, so it's waiting to upload again)
    expect(JSON.parse(st[META])).toMatchObject({ uid: benAuth.user.id, syncedTs: 1234, moved: false });
    expect(Object.keys(st).filter(k => k.startsWith('capyIsland.xfer'))).toEqual([]);
    // Ada is parked with her own island and sign-in
    const pl = await game.players();
    expect(pl.list.map(p => p.name)).toEqual(['Ada', 'Ben']);
    const adaId = pl.list[0].id;
    expect(JSON.parse(st[`capyIsland.p.${adaId}.${AUTH}`]).user.id).toBe(adaUid);
    expect(JSON.parse(st[`capyIsland.p.${adaId}.${KEY}`])).toMatchObject({ name: 'Ada', coins: 55 });

    // (Ben's save is from before the museum update, so the what's-new screen shows first)
    await expect(page.locator('#card h2')).toHaveText(/Something new/);
    await page.locator('#card > .row button').last().click();
    // ...then the what's-new splash, which an island from before it hasn't seen either
    await page.getByRole('button', { name: "Let's play! 🩷" }).click();
    // and switching back to Ada works as usual
    await page.locator('#who').click();
    await page.locator('.plb', { hasText: 'Ada' }).click();
    await game.afterSwitch(() => page.locator('.pwe[aria-label="🦄"]').click());
    expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 55]);
    expect(JSON.parse((await game.storage())[AUTH]).user.id).toBe(adaUid);
  });
});

test('from another phone is only offered with the cloud', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.locator('#who').click();
  await expect(page.getByRole('button', { name: '💾 From a backup' })).toBeVisible();
  await expect(page.getByRole('button', { name: '📲 From another phone' })).toHaveCount(0);
});

test('from a backup: adds a copy as a new player, keeping the current one', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const code = await page.evaluate(ben => {
    const o = backupObj();
    o.save = Object.assign({}, o.save, ben);
    S.coins = 55;
    save();
    return 'CAPY1:' + b64enc(JSON.stringify(o));
  }, BEN);

  await openFrom(page, '💾 From a backup');
  await page.locator('#plbkin').fill('not a backup');
  await page.getByRole('button', { name: 'Add player' }).click();
  await expect(page.locator('#card .note')).toContainText("doesn't look like a Capy Island backup");

  await page.locator('#plbkin').fill(code);
  await page.getByRole('button', { name: 'Add player' }).click();
  await expect(page.locator('#card')).toContainText("Add Ben's island (🪙 777)");
  await game.afterSwitch(() => page.getByRole('button', { name: 'Yes, add them' }).click());
  await pickSecret(page, '🚀');
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ben', 777]);
  expect((await game.players()).list.map(p => p.name)).toEqual(['Ada', 'Ben']);

  await page.locator('#who').click();
  await page.locator('.plb', { hasText: 'Ada' }).click();
  await game.afterSwitch(() => page.locator('.pwe[aria-label="🦄"]').click());
  expect(await page.evaluate(() => [S.name, S.coins])).toEqual(['Ada', 55]);
});

test('from a backup in cloud mode: the new player needs the secret word once', async ({ page, game }) => {
  await fakeCloud(page);
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await game.newPlayer('Ada', '🦄');
  const code = await page.evaluate(ben => {
    const o = backupObj();
    o.save = Object.assign({}, o.save, ben);
    return 'CAPY1:' + b64enc(JSON.stringify(o));
  }, BEN);
  await openFrom(page, '💾 From a backup');
  await page.locator('#plbkin').fill(code);
  await page.getByRole('button', { name: 'Add player' }).click();
  await expect(page.locator('#card')).toContainText('secret word once');
  await game.afterSwitch(() => page.getByRole('button', { name: 'Yes, add them' }).click());
  await expect(page.locator('#gate')).toBeVisible();
  expect(JSON.parse((await game.storage())[KEY]).name).toBe('Ben');
});
