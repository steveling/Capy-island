// The best-friends list says roughly when each friend last played.
const { test, expect, UNLOCK } = require('./fixtures');
const { fakeCloud } = require('./fake-cloud');

const id = n => `${n}${n}${n}${n}${n}${n}${n}${n}-0000-4000-8000-000000000000`;
const friends = [
  { friend: id(1), name: 'Ben', color: 'mint', online: true, last_days: 0 },
  { friend: id(2), name: 'Cat', color: 'sky', online: false, last_days: 0 },
  { friend: id(3), name: 'Dan', color: 'peach', online: false, last_days: 1 },
  { friend: id(4), name: 'Eve', color: 'cream', online: false, last_days: 4 },
  { friend: id(5), name: 'Fin', color: 'rose', online: false, last_days: 30 },
  { friend: id(6), name: 'Gus', color: 'cocoa', online: false, last_days: null }, // hidden by their grown-ups
  { friend: id(7), name: 'Hal', color: 'pink', online: false } // before the server change
];

test('best friends show when they last played', async ({ page, game }) => {
  await fakeCloud(page, {
    rpc: { my_cloud_status: { has_island: true, save_ts: 0 }, list_friends: friends }
  });
  await game.open({ cloud: true, storage: { [UNLOCK]: '1' } });
  await game.newPlayer('Ada', '🦄');
  await page.waitForFunction(() => CL.ready && CL.friends.length === 7);
  await page.evaluate(() => {
    busy = false;
    openDock('friends');
  });
  const says = n => page.locator('#card .li', { hasText: n }).locator('small');
  await expect(says('Ben')).toHaveText('🟢 Playing now!');
  await expect(says('Cat')).toHaveText('💤 Played today. Visit their island!');
  await expect(says('Dan')).toHaveText('💤 Played yesterday. Visit their island!');
  await expect(says('Eve')).toHaveText('💤 Played 4 days ago. Visit their island!');
  await expect(says('Fin')).toHaveText('💤 Played over a week ago. Visit their island!');
  await expect(says('Gus')).toHaveText('💤 Not playing. Visit their island!');
  await expect(says('Hal')).toHaveText('💤 Not playing. Visit their island!');
});
