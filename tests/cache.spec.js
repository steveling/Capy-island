// Browsers reuse the game's files from cache (GitHub Pages allows 10 minutes). A page that mixes new and old
// files breaks, so index.html stamps every file address with a fingerprint of its contents, and if a script
// still fails while the game starts, the page reloads once from a fresh address.
const base = require('@playwright/test');
const { expect } = base;
const fs = require('fs');
const path = require('path');
const { stamped } = require('../scripts/stamp');

const INDEX = path.join(__dirname, '..', 'index.html');

base.test('every script and stylesheet address carries its current fingerprint', () => {
  const html = fs.readFileSync(INDEX, 'utf8');
  expect(stamped(html) === html, 'index.html is out of date: run npm run stamp').toBe(true);
  const refs = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map(m => m[1]);
  expect(refs.length).toBeGreaterThan(20);
  for (const r of refs) expect(r).toMatch(/\?v=[0-9a-f]{10}$/);
});

/** open the game offline (no cloud), serving world.js from `serve(n)` on its n-th request */
async function openWith(page, serve) {
  await page.context().route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await page.route('**/js/config.js?*', r =>
    r.fulfill({
      contentType: 'text/javascript',
      body: "const SUPABASE_URL = '';\nconst SUPABASE_ANON_KEY = '';\n"
    })
  );
  const real = fs.readFileSync(path.join(__dirname, '..', 'js', 'world.js'), 'utf8');
  let n = 0;
  await page.route('**/js/world.js?*', r =>
    r.fulfill({ contentType: 'text/javascript', body: serve(++n, real) })
  );
  // each time the page itself is requested from the server (a reload skips 'load' on the abandoned page)
  const loads = [];
  page.on('request', r => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) loads.push(r.url());
  });
  await page.goto('/?visit=ABCDE');
  return loads;
}
// like the real breakage: an older cached world.js that still declares the sound engine sound.js now owns
const OLD = real => 'let AC;\n' + real;

base.test('a page that mixed in an old cached script heals itself with one reload', async ({ page }) => {
  const loads = await openWith(page, (n, real) => (n === 1 ? OLD(real) : real));
  await expect(page.locator('#card h2')).toHaveText(/Welcome to Capy Island/);
  expect(loads).toHaveLength(2);
  expect(loads[1]).toMatch(/\?visit=ABCDE&fresh=\w+$/); // reloaded from a fresh address, keeping the rest
  // the reload marker is tidied away, other parts of the address are kept for the game
  await expect.poll(() => page.url()).not.toContain('fresh=');
  expect(await page.evaluate(() => window.capyBooting)).toBe(false);
});

base.test('a script that keeps failing reloads at most once (no loop)', async ({ page }) => {
  const loads = await openWith(page, (n, real) => OLD(real));
  await page.waitForTimeout(2500);
  expect(loads).toHaveLength(2);
});

base.test('errors after start-up never reload the page', async ({ page }) => {
  const loads = await openWith(page, (n, real) => real);
  await expect(page.locator('#card h2')).toHaveText(/Welcome to Capy Island/);
  await page.evaluate(() => setTimeout(() => nope(), 0));
  await page.waitForTimeout(1200);
  expect(loads).toHaveLength(1);
});
