// Shared helpers: open the game with a given save, cloud on/off, and fail on any page error.
const base = require('@playwright/test');

const UNLOCK = 'capyIsland.unlocked';

const test = base.test.extend({
  // every uncaught page error fails the test
  errors: [
    async ({ page }, use) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await use(errors);
      base.expect(errors, 'page errors').toEqual([]);
    },
    { auto: true }
  ],

  /**
   * game.open({ cloud, storage }) loads the game.
   *  - cloud: false (default) serves an empty js/config.js, i.e. local-only play;
   *           true keeps the real config (the network to Supabase/CDNs is blocked either way,
   *           so cloud mode runs "offline").
   *  - storage: localStorage to start from (set before any game script runs).
   */
  game: async ({ page }, use) => {
    await page.context().route(/^https?:\/\/(?!localhost)/, r => r.abort());
    const game = {
      async open({ cloud = false, storage = {} } = {}) {
        if (!cloud)
          await page.route('**/js/config.js', r =>
            r.fulfill({
              contentType: 'text/javascript',
              body: "const SUPABASE_URL = '';\nconst SUPABASE_ANON_KEY = '';\n"
            })
          );
        await page.addInitScript(s => {
          if (sessionStorage.getItem('seeded')) return;
          sessionStorage.setItem('seeded', '1');
          localStorage.clear();
          for (const k in s) localStorage.setItem(k, s[k]);
        }, storage);
        await page.goto('/');
        await page.waitForFunction(() => typeof loop === 'function' && islReady);
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
        await page.waitForFunction(() => typeof loop === 'function' && islReady);
      }
    };
    await use(game);
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
