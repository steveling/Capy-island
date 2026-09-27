// New players get a fun, safe generated name instead of a fixed one (#6).
const { test, expect, pickSecret } = require('./fixtures');

const isGenerated = page => page.evaluate(() => NAMES.includes(document.getElementById('nm').value));

test('the name box starts with a generated name from the safe lists', async ({ page, game }) => {
  await game.open();
  const name = await page.locator('#nm').inputValue();
  expect(name).not.toBe('Emi');
  expect(name.length).toBeLessThanOrEqual(12);
  expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  expect(await isGenerated(page)).toBe(true);
});

test('the dice picks a different fun name', async ({ page, game }) => {
  await game.open();
  const seen = new Set([await page.locator('#nm').inputValue()]);
  for (let i = 0; i < 5; i++) {
    const before = await page.locator('#nm').inputValue();
    await page.getByRole('button', { name: 'Pick another name' }).click();
    const after = await page.locator('#nm').inputValue();
    expect(after).not.toBe(before);
    expect(await isGenerated(page)).toBe(true);
    seen.add(after);
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('keeping the generated name, or clearing the box, still gives a fun name', async ({ page, game }) => {
  await game.open();
  const offered = await page.locator('#nm').inputValue();
  await page.locator('#go').click();
  await pickSecret(page, '🦄');
  expect(await page.evaluate(() => S.name)).toBe(offered);

  // a second player who empties the box
  await page.evaluate(() => {
    busy = false;
    closeModal();
    S.name = '';
    welcome();
  });
  await page.locator('#nm').fill('   ');
  await page.locator('#go').click();
  expect(await page.evaluate(() => NAMES.includes(S.name))).toBe(true);
});

test('a name the player types is kept', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  expect(await page.evaluate(() => S.name)).toBe('Ada');
});

test('every generated name is short and made only of the listed words', async ({ page, game }) => {
  await game.open();
  const r = await page.evaluate(() => ({
    n: NAMES.length,
    ok: NAMES.every(n => {
      const [a, b] = n.split(' ');
      return n.length <= 12 && NAME_A.includes(a) && NAME_B.includes(b) && !a.startsWith(b);
    })
  }));
  expect(r.n).toBeGreaterThan(300);
  expect(r.ok).toBe(true);
});
