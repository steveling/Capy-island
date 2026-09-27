// Shared helpers: open the game with a given save, cloud on/off, and fail on any page error.
const base = require('@playwright/test');

const UNLOCK = 'capyIsland.unlocked';
const ready = page => page.waitForFunction(() => typeof loop === 'function' && islReady);

/** game helpers bound to one page (one player's phone) */
function gameOn(page) {
  return {
    page,
    /**
     * load the game.
     *  - cloud: false (default) serves an empty js/config.js, i.e. local-only play;
     *           true keeps the real config (the network to Supabase/CDNs is blocked either way,
     *           so cloud mode runs "offline").
     *  - storage: localStorage to start from (set before any game script runs).
     */
    async open({ cloud = false, storage = {} } = {}) {
      await page.context().route(/^https?:\/\/(?!localhost)/, r => r.abort());
      if (!cloud)
        await page.route('**/js/config.js?*', r =>
          r.fulfill({
            contentType: 'text/javascript',
            body: "const SUPABASE_URL = '';\nconst SUPABASE_ANON_KEY = '';\n"
          })
        );
      await page.addInitScript(s => {
        if (!location.protocol.startsWith('http')) return; // e.g. about:blank after going back
        if (sessionStorage.getItem('seeded')) return;
        sessionStorage.setItem('seeded', '1');
        localStorage.clear();
        for (const k in s) localStorage.setItem(k, s[k]);
      }, storage);
      await page.goto('/');
      await ready(page);
    },
    /** walk through the welcome screen and pick a secret emoji */
    async newPlayer(name, emoji) {
      await page.locator('#nm').fill(name);
      await page.locator('#go').click();
      await pickSecret(page, emoji);
    },
    storage: () =>
      page.evaluate(() =>
        Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))
      ),
    players: () => page.evaluate(() => JSON.parse(localStorage.getItem('capyIsland.players'))),
    /** wait for the reload a player switch does, then for the game to be ready again */
    async afterSwitch(action) {
      await Promise.all([page.waitForEvent('load'), action()]);
      await ready(page);
    }
  };
}

const test = base.test.extend({
  // every uncaught page error (on the main page or any extra phone) fails the test
  errors: [
    async ({ page }, use) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await use(errors);
      base.expect(errors, 'page errors').toEqual([]);
    },
    { auto: true }
  ],

  game: async ({ page }, use) => {
    await use(gameOn(page));
  },

  /** another phone: newPhone() opens a fresh browser context (its own storage) and returns game helpers */
  newPhone: async ({ browser, errors }, use, testInfo) => {
    const contexts = [];
    await use(async () => {
      const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use;
      const ctx = await browser.newContext({
        viewport,
        userAgent,
        deviceScaleFactor,
        isMobile,
        hasTouch,
        baseURL
      });
      contexts.push(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(e.message));
      return gameOn(page);
    });
    await Promise.all(contexts.map(c => c.close()));
  }
});

/** create-a-secret-emoji flow: pick it, tap it again, confirm */
async function pickSecret(page, emoji) {
  await base.expect(page.locator('#card h2')).toHaveText(/Pick your secret emoji/);
  await page.locator(`.pwe[aria-label="${emoji}"]`).click();
  await base.expect(page.locator('#card h2')).toHaveText(/Now remember it/);
  await page.locator(`.pwe[aria-label="${emoji}"]`).click();
  await page.locator('#pwok').click();
}

module.exports = { test, expect: base.expect, pickSecret, UNLOCK };
