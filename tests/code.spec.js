// Each island keeps its visiting code (local / PeerJS mode), so friends can use the same code every time.
const { test, expect } = require('./fixtures');

// a stand-in for PeerJS: opens any id unless window.__taken[id] says it's taken (a number: taken that many
// more tries; true: always taken). Every id asked for is recorded in window.__ids.
const FAKE_PEER = () => {
  window.__ids = [];
  window.__taken = {};
  window.Peer = class {
    constructor(id) {
      this.id = id;
      this.h = {};
      window.__ids.push(id);
      const code = String(id).replace('capyisland-', '');
      setTimeout(() => {
        const t = window.__taken[code];
        if (t) {
          if (typeof t === 'number') window.__taken[code] = t - 1;
          this.emit('error', { type: 'unavailable-id' });
        } else this.emit('open', id);
      }, 50);
    }
    on(ev, f) {
      (this.h[ev] = this.h[ev] || []).push(f);
      return this;
    }
    emit(ev, a) {
      (this.h[ev] || []).forEach(f => f(a));
    }
    destroy() {
      this.destroyed = true;
    }
  };
};

async function openAndWait(page) {
  await page.evaluate(() => openIsland());
  await page.waitForFunction(() => MP.hostState === 'open');
  return page.evaluate(() => MP.code);
}
async function closeAndWait(page) {
  await page.evaluate(() => closeIsland());
  await page.waitForFunction(() => !MP.role);
}

test.beforeEach(async ({ game }) => {
  await game.page.addInitScript(FAKE_PEER);
  await game.open();
  await game.newPlayer('Ada', '🦄');
});

test('the island keeps the same code every time it opens, even after a reload', async ({ game }) => {
  const page = game.page;
  const code = await openAndWait(page);
  expect(code).toMatch(/^[A-Z0-9]{5}$/);
  expect(await page.evaluate(() => S.code)).toBe(code);
  await closeAndWait(page);
  expect(await openAndWait(page)).toBe(code);
  await closeAndWait(page);
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await openAndWait(page)).toBe(code);
});

test('if the code is still letting go, it tries the same code again', async ({ game }) => {
  const page = game.page;
  const code = await openAndWait(page);
  await closeAndWait(page);
  await page.evaluate(c => (window.__taken[c] = 2), code);
  expect(await openAndWait(page)).toBe(code);
  expect(await page.evaluate(() => window.__ids.filter(i => i.endsWith(S.code)).length)).toBe(4);
});

test('if the code stays taken, the island gets a new one and keeps it', async ({ game }) => {
  test.setTimeout(40000);
  const page = game.page;
  const code = await openAndWait(page);
  await closeAndWait(page);
  await page.evaluate(c => (window.__taken[c] = true), code);
  await page.evaluate(() => openIsland());
  await page.waitForFunction(() => MP.hostState === 'open', null, { timeout: 20000 });
  const fresh = await page.evaluate(() => MP.code);
  expect(fresh).not.toBe(code);
  expect(await page.evaluate(() => S.code)).toBe(fresh);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('capyIsland.v2'))).code).toBe(fresh);
});

test('a broken saved code is dropped', async ({ game }) => {
  const page = game.page;
  await page.evaluate(() => {
    S.code = 'bad<code>';
    save();
  });
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await page.evaluate(() => S.code)).toBe('');
  expect(await openAndWait(page)).toMatch(/^[A-Z0-9]{5}$/);
});
