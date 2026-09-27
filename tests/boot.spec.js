// Loading the game: every script loads, and the right first screen shows in each mode.
const { test, expect, UNLOCK } = require('./fixtures');

test('local-only mode: first visit shows the welcome screen, no passcode gate', async ({ page, game }) => {
  await game.open();
  expect(await page.evaluate(() => CL.on)).toBe(false);
  await expect(page.locator('#gate')).toHaveCount(0);
  await expect(page.locator('#card h2')).toHaveText(/Welcome to Capy Island/);
  await expect(page.locator('#coins')).toHaveText('🪙 200');
  await expect(page.locator('#who')).toBeHidden();
});

test('every script and stylesheet loads', async ({ page, game }) => {
  const failed = [];
  page.on('response', r => {
    if (r.url().startsWith('http://localhost') && r.status() >= 400) failed.push(r.url());
  });
  await game.open();
  expect(failed).toEqual([]);
  // one global from each script file, in load order
  const defined = await page.evaluate(() =>
    [
      typeof esc, // core
      typeof ITEMS, // data
      typeof save, // save
      typeof plSync, // players
      typeof newDay, // world
      typeof loop, // input
      typeof reel, // actions
      typeof bagView, // modals
      typeof buildIsland, // draw
      typeof render, // render
      typeof openDock, // multiplayer
      typeof clock, // places
      typeof openMuseum, // museum
      typeof grownups, // grownups
      typeof clInit, // cloud
      typeof chatUI, // chat
      typeof showGate, // gate
      typeof capyBoot // main
    ].every(t => t !== 'undefined')
  );
  expect(defined).toBe(true);
  // stylesheets applied (buttons + gate styles)
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('bottom')).position)).toBe(
    'fixed'
  );
});

test('cloud mode: a phone that never entered the secret word sees the Capy Air gate', async ({
  page,
  game
}) => {
  await game.open({ cloud: true });
  expect(await page.evaluate(() => CL.on)).toBe(true);
  await expect(page.locator('#gate')).toBeVisible();
  await expect(page.locator('#gbub')).toContainText("What's the secret word?");
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('gate')).position)).toBe('fixed');
  await expect(page.locator('#card')).not.toContainText('Welcome to Capy Island');
});

test('cloud mode: an unlocked phone goes straight to the game', async ({ page, game }) => {
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await expect(page.locator('#gate')).toHaveCount(0);
  await expect(page.locator('#card h2')).toHaveText(/Welcome to Capy Island/);
});

test('a returning player skips the welcome screen', async ({ page, game }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  await page.reload();
  await page.waitForFunction(() => typeof loop === 'function' && islReady);
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#who')).toContainText('Ada');
});

test('the scripts avoid regex features older iPads cannot parse', () => {
  // Safari before iOS 16.4 throws a SyntaxError on regex lookbehind, which would stop a whole script loading
  const fs = require('fs'),
    path = require('path');
  const dir = path.join(__dirname, '..', 'js');
  for (const f of fs.readdirSync(dir))
    expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/\(\?<[=!]/);
});
