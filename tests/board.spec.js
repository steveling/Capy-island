// The drawing board outside: painting, saving, and who gets to see it.
const { test, expect, UNLOCK } = require('./fixtures');
const { hostIsland } = require('./link');

const KEY = 'capyIsland.v2',
  BEN = '11111111-1111-4111-8111-111111111111';

/** the painter's canvas, with helpers to tap/drag on pixel (x, y) */
async function painter(page) {
  await page.evaluate(() => openPainter());
  const box = await page.locator('#bpaint').boundingBox();
  const at = (x, y) => [box.x + ((x + 0.5) * box.width) / 32, box.y + ((y + 0.5) * box.height) / 24];
  return {
    at,
    tap: (x, y) => page.mouse.click(...at(x, y)),
    async drag(from, to) {
      await page.mouse.move(...at(...from));
      await page.mouse.down();
      await page.mouse.move(...at(...to), { steps: 2 }); // few pointer events: gaps must be filled in
      await page.mouse.up();
    },
    tool: t => page.locator(`.btools [data-t="${t}"]`).click(),
    color: c => page.locator(`.bpal [data-c="${c}"]`).click(),
    px: () => page.evaluate(() => PT.px.join(''))
  };
}
const at = (s, x, y) => s[y * 32 + x];

test('painting: brush, big brush, fill, stamps, eraser, undo', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const p = await painter(page);
  await p.color(4);
  await p.drag([2, 2], [20, 2]);
  let s = await p.px();
  for (let x = 2; x <= 20; x++) expect(at(s, x, 2), `pixel ${x}`).toBe('4'); // no gaps
  expect(at(s, 2, 3)).toBe('0');

  await p.tool('big');
  await p.color(8);
  await p.tap(5, 10);
  s = await p.px();
  expect([at(s, 5, 10), at(s, 6, 10), at(s, 5, 11), at(s, 6, 11)]).toEqual(['8', '8', '8', '8']);

  // fill the blank paper, but not across the red line
  await p.tool('fill');
  await p.color(10);
  await p.tap(0, 20);
  s = await p.px();
  expect(at(s, 31, 23)).toBe('a');
  expect(at(s, 10, 2)).toBe('4');
  expect(at(s, 5, 10)).toBe('8');

  await p.tool('stamp:💗');
  await p.color(5);
  await p.tap(15, 15);
  s = await p.px();
  expect(at(s, 15, 16)).toBe('5'); // the heart's middle
  expect(at(s, 15, 13)).toBe('a'); // the notch at the top stays sky

  await p.tool('undo');
  expect(at(await p.px(), 15, 16)).toBe('a');
  await p.tool('brush');
  await p.color(0); // eraser
  await p.tap(10, 2);
  expect(at(await p.px(), 10, 2)).toBe('0');
});

test('Done saves the picture on the board; Cancel keeps the old one', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  let p = await painter(page);
  await p.color(2);
  await p.tap(0, 0);
  await page.locator('#bdone').click();
  await expect(page.locator('#toast')).toContainText('Your drawing is up on the board');
  const saved = await page.evaluate(() => S.board);
  expect(saved).toMatch(/^2[0]{767}$/);

  p = await painter(page);
  await p.tap(5, 5);
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(await page.evaluate(() => S.board)).toBe(saved);

  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).board, KEY)).toBe(saved);
  // the board outside draws (the frame loop would swallow an error, so draw it directly)
  expect(await page.evaluate(() => (drawBoard(), boardShown()))).toBe(saved);
});

test('clearing needs two taps, and a blank board is saved as nothing', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const p = await painter(page);
  await p.tap(3, 3);
  await p.tool('clear');
  expect(at(await p.px(), 3, 3)).toBe('2');
  await expect(page.locator('.btools [data-t="clear"]')).toHaveText('Sure?');
  await p.tool('clear');
  expect(await p.px()).toBe('0'.repeat(768));
  await page.locator('#bdone').click();
  expect(await page.evaluate(() => S.board)).toBe('');
});

test('tapping the board at home walks over and opens the painter', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.evaluate(() => tapWorld(BOARD.x, BOARD.y - 50));
  await expect(page.locator('#card h2')).toHaveText('🎨 My drawing board', { timeout: 8000 });
});

test('broken board data is thrown away, on load and on arrival', async ({ page, game }) => {
  const save = { name: 'Old', coins: 5, neigh: {}, bag: {}, found: {}, board: 'zz' };
  await game.open({ storage: { [KEY]: JSON.stringify(save) } });
  expect(await page.evaluate(() => S.board)).toBe('');
  const r = await page.evaluate(() =>
    ['', '1'.repeat(768), '1'.repeat(767), 'g'.repeat(768), '<img>'.repeat(200), 42, undefined].map(v =>
      cleanIsland({ name: 'X', bd: v }).bd === undefined ? 'undefined' : cleanIsland({ name: 'X', bd: v }).bd
    )
  );
  expect(r).toEqual(['', '1'.repeat(768), null, null, null, null, null]);
  // bugs and flowers keep off the board
  expect(await page.evaluate(() => grassFree(BOARD.x, BOARD.y - 40))).toBe(false);
});

test.describe('visitors', () => {
  const cloud = { cloud: true, storage: { [UNLOCK]: '1' } };
  async function visitAda(game, newPhone, { friend }) {
    await game.open(cloud);
    await game.newPlayer('Ada', '🦄');
    await game.page.evaluate(() => {
      S.board = '5'.repeat(768);
      save();
    });
    const ben = await newPhone();
    await ben.open(cloud);
    await ben.newPlayer('Ben', '🚀');
    const island = await hostIsland(game.page);
    await island.visit(ben.page, BEN, { cloud: friend });
    return { ada: game.page, ben: ben.page };
  }
  const tapBoard = page => page.evaluate(() => boardAct());

  test('a best friend sees the drawing, and it updates when it changes', async ({ game, newPhone }) => {
    const { ada, ben } = await visitAda(game, newPhone, { friend: true });
    expect(await ben.evaluate(() => boardShown())).toBe('5'.repeat(768));
    await tapBoard(ben);
    await expect(ben.locator('#card h2')).toHaveText("🎨 Ada's drawing");
    await expect(ben.locator('#bview')).toBeVisible();
    await ada.evaluate(() => {
      S.board = '7'.repeat(768);
      save();
    });
    await expect.poll(() => ben.evaluate(() => boardShown())).toBe('7'.repeat(768));
    // Ben can look but not paint
    await ben.evaluate(() => openPainter());
    await expect(ben.locator('#bpaint')).toHaveCount(0);
  });

  test('an island-code visitor never receives it', async ({ game, newPhone }) => {
    const { ben } = await visitAda(game, newPhone, { friend: false });
    expect(await ben.evaluate(() => [MP.island.bd, boardShown()])).toEqual([null, null]);
    await tapBoard(ben);
    await expect(ben.locator('#toast')).toContainText("Only Ada's best friends can see this drawing");
    await expect(ben.locator('#bview')).toHaveCount(0);
  });

  test("grown-ups can switch off seeing friends' drawings", async ({ game, newPhone }) => {
    const { ben } = await visitAda(game, newPhone, { friend: true });
    await ben.evaluate(() => {
      busy = false;
      grownups();
    });
    await ben.locator('#clboards').uncheck();
    expect(await ben.evaluate(() => boardShown())).toBeNull();
    await ben.evaluate(() => closeModal());
    await tapBoard(ben);
    await expect(ben.locator('#toast')).toContainText('switched off');
    expect(JSON.parse(await ben.evaluate(() => localStorage.getItem('capyIsland.cloud'))).boards).toBe(false);
  });

  test('the friends-only cloud copy includes it (for napping visits)', async ({ page, game }) => {
    await game.open(cloud);
    await game.newPlayer('Ada', '🦄');
    const r = await page.evaluate(() => {
      S.board = '3'.repeat(768);
      return [clBody(1).snapshot.bd, 'bd' in snapshot()];
    });
    expect(r).toEqual(['3'.repeat(768), false]);
  });
});
