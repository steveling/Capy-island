// Typed chat: only between best friends on cloud visits, filtered, rate-limited, and switchable by grown-ups.
const { test, expect, UNLOCK } = require('./fixtures');
const { hostIsland } = require('./link');

const BEN = '11111111-1111-4111-8111-111111111111',
  CAT = '22222222-2222-4222-8222-222222222222',
  DAN = '33333333-3333-4333-8333-333333333333';
const cloud = { cloud: true, storage: { [UNLOCK]: '1' } };
const lastChat = page => page.evaluate(() => MP.chat.length && MP.chat[MP.chat.length - 1]);

async function say(page, text) {
  if (await page.locator('#chat').isHidden()) await page.locator('#bChat').click();
  await page.locator('#chatin').fill(text);
  await page.locator('#chatsend').click();
}

/** Ada hosts in cloud mode, Ben visits her over a cloud (best friends) connection */
async function adaAndBen(game, newPhone) {
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await ben.open(cloud);
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  await island.visit(ben.page, BEN);
  return { ada: game.page, ben: ben.page, island };
}

test.describe('cleaning messages', () => {
  const cases = [
    ['hello!!', 'hello!!'],
    ['  lots    of   space  ', 'lots of space'],
    ['a'.repeat(80), 'a'.repeat(60)],
    ['you are STUPID', 'you are 🙊'],
    ['fuuuuck', '🙊'],
    ['sh1t happens', '🙊 happens'], // dotted letters are not caught (known gap)
    ['shut   up', '🙊'],
    ['stupid dumb idiot', '🙊 🙊 🙊'],
    ['dumb,dumb!', '🙊,🙊!'],
    ['my number is 555-123-4567', 'my number is 🚫'],
    ['call 5551234567 ok', 'call 🚫 ok'],
    ['I have 1200 coins', 'I have 1200 coins'],
    ['go to www.example.com now', 'go to 🚫 now'],
    ['https://evil.test/x', '🚫'],
    ['mail me kid@example.com', 'mail me 🚫'],
    ['visit roblox.com', 'visit 🚫'],
    ['grass class assassin', 'grass class assassin'],
    ['zero​width‮flip', 'zerowidthflip']
  ];
  for (const [input, want] of cases)
    test(`"${input.slice(0, 30)}"`, async ({ page, game }) => {
      await game.open();
      expect(await page.evaluate(t => cleanChat(t), input)).toBe(want);
    });
});

test('best friends on a cloud visit can chat both ways', async ({ game, newPhone }) => {
  const { ada, ben } = await adaAndBen(game, newPhone);
  await expect(ben.locator('#bChat')).toBeVisible();
  await expect(ada.locator('#bChat')).toBeVisible();

  await say(ben, 'hi Ada! 🌸');
  await ben.locator('#chatx').click();
  await expect.poll(() => lastChat(ada)).toMatchObject({ id: BEN, name: 'Ben', x: 'hi Ada! 🌸' });
  // Ada had the chat closed: a badge counts it, and a speech bubble shows over Ben
  await expect(ada.locator('#bChat .badge')).toHaveText('1');
  expect(await ada.evaluate(id => MP.say.get(id).x, BEN)).toBe('hi Ada! 🌸');

  await ada.locator('#bChat').click();
  await expect(ada.locator('#chatlog')).toContainText('Ben hi Ada! 🌸');
  await expect(ada.locator('#bChat .badge')).toBeHidden();
  await say(ada, 'hi Ben, you are dumb 555 123 4567');
  // the host's phone cleaned it before sending; Ben's phone cleans again on arrival
  await expect
    .poll(() => lastChat(ben))
    .toMatchObject({ id: 'host', name: 'Ada', x: 'hi Ben, you are 🙊 🚫' });
  await expect(ben.locator('#bChat .badge')).toHaveText('1');
  await ben.locator('#bChat').click();
  await expect(ben.locator('#chatlog .cl').last()).toHaveText('Ada hi Ben, you are 🙊 🚫');
});

test('messages from a modified phone are still cleaned and length-limited on arrival', async ({
  game,
  newPhone
}) => {
  const { ada, ben } = await adaAndBen(game, newPhone);
  // skip Ben's own filter and send raw text straight down the connection
  // (the 60-character cut happens before the word filter)
  await ben.evaluate(() => MP.conn.send({ t: 'chat', x: 'FUCK <b>you</b> ' + 'x'.repeat(100) }));
  await expect.poll(async () => (await lastChat(ada)).x).toBe('🙊 <b>you</b> ' + 'x'.repeat(44));
  await ada.locator('#bChat').click();
  // shown as text, not HTML
  await expect(ada.locator('#chatlog b', { hasText: 'you' })).toHaveCount(0);
  await expect(ada.locator('#chatlog')).toContainText('<b>you</b>');
});

test('sending too fast is slowed down, on both phones', async ({ game, newPhone }) => {
  const { ada, ben } = await adaAndBen(game, newPhone);
  // the limit counts game time, which only moves as frames are drawn, so both sends happen in one go
  await ben.locator('#bChat').click();
  await ben.evaluate(() => {
    $('#chatin').value = 'one';
    chatSend();
    $('#chatin').value = 'two';
    chatSend();
  });
  await expect(ben.locator('#chatnote')).toHaveText('Slow down a little! 🐢');
  await expect(ben.locator('#chatin')).toHaveValue('two');
  await expect.poll(() => ada.evaluate(() => MP.chat.map(m => m.x))).toEqual(['one']);
  // a modified phone that skips its own limit: the host drops the flood (all arriving at once)
  await ada.evaluate(id => {
    for (let i = 0; i < 5; i++) window.__in(id, { t: 'chat', x: 'spam ' + i });
  }, BEN);
  const spam = await ada.evaluate(() => MP.chat.filter(m => m.x.startsWith('spam')).length);
  expect(spam).toBeLessThanOrEqual(1);
});

test('a visitor only sees other visitors who are their own best friends', async ({ game, newPhone }) => {
  const { ada, ben, island } = await adaAndBen(game, newPhone);
  const cat = await island.ghost(CAT, 'Cat');
  await expect.poll(() => ben.evaluate(id => MP.players.has(id), CAT)).toBe(true);

  // Cat is Ada's friend (she came over a cloud channel) but not Ben's
  await cat.send({ t: 'chat', x: 'hi everyone' });
  await expect.poll(() => lastChat(ada)).toMatchObject({ id: CAT, x: 'hi everyone' });
  await ben.waitForTimeout(500);
  expect(await ben.evaluate(() => MP.chat.length)).toBe(0);

  // once Cat is also Ben's best friend, he sees her messages
  await ben.evaluate(id => CL.friends.push({ id, name: 'Cat', color: 'mint', online: true }), CAT);
  // wait out the host's per-player limit, in game time
  await ada.waitForFunction(id => time - MP.vis.get(id).chatT > CHAT_GAP, CAT);
  await cat.send({ t: 'chat', x: 'hi again' });
  await expect.poll(() => lastChat(ben)).toMatchObject({ id: CAT, name: 'Cat', x: 'hi again' });
  // Ben's own messages reach Cat through Ada
  await say(ben, 'hi Cat');
  await expect
    .poll(() => cat.inbox.filter(m => m.t === 'chat').map(m => [m.id, m.x]))
    .toContainEqual([BEN, 'hi Cat']);
});

test('island-code visitors (not over the cloud) never get typed chat', async ({ game, newPhone }) => {
  const { ada, ben, island } = await adaAndBen(game, newPhone);
  const dan = await island.ghost(DAN, 'Dan', { cloud: false });
  await expect.poll(() => ben.evaluate(id => MP.players.has(id), DAN)).toBe(true);
  // Dan's chat is ignored by the host...
  await dan.send({ t: 'chat', x: 'hello from a stranger' });
  await ada.waitForTimeout(500);
  expect(await ada.evaluate(() => MP.chat.length)).toBe(0);
  // ...and chat between best friends is never relayed to him
  await say(ben, 'secret friends talk');
  await expect.poll(() => lastChat(ada)).toMatchObject({ x: 'secret friends talk' });
  expect(dan.inbox.filter(m => m.t === 'chat')).toEqual([]);
});

test('a PeerJS (island code) visit has no chat button', async ({ game, newPhone }) => {
  await game.open(cloud);
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await ben.open(cloud);
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  await island.visit(ben.page, BEN, { cloud: false });
  await expect(ben.page.locator('#bEmo')).toBeVisible();
  await expect(ben.page.locator('#bChat')).toBeHidden();
  await expect(game.page.locator('#bChat')).toBeHidden();
  // even if a modified phone sends chat, it is dropped
  await ben.page.evaluate(() => MP.conn.send({ t: 'chat', x: 'hi' }));
  await game.page.waitForTimeout(500);
  expect(await game.page.evaluate(() => MP.chat.length)).toBe(0);
});

test('chat never appears in local-only mode', async ({ game, newPhone }) => {
  await game.open();
  await game.newPlayer('Ada', '🦄');
  const ben = await newPhone();
  await ben.open();
  await ben.newPlayer('Ben', '🚀');
  const island = await hostIsland(game.page);
  await island.visit(ben.page, BEN, { cloud: true });
  await expect(ben.page.locator('#bChat')).toBeHidden();
  await expect(game.page.locator('#bChat')).toBeHidden();
});

test('grown-ups can switch chat off', async ({ game, newPhone }) => {
  const { ada, ben } = await adaAndBen(game, newPhone);
  await ben.evaluate(() => {
    busy = false;
    grownups();
  });
  const box = ben.locator('#clchat');
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect(ben.locator('#bChat')).toBeHidden();
  expect(JSON.parse(await ben.evaluate(() => localStorage.getItem('capyIsland.cloud'))).chat).toBe(false);
  // messages to Ben are now ignored
  await say(ada, 'are you there?');
  await ben.waitForTimeout(500);
  expect(await ben.evaluate(() => MP.chat.length)).toBe(0);
  // and it stays off after a reload
  await ben.reload();
  await ben.waitForFunction(() => typeof loop === 'function' && islReady);
  expect(await ben.evaluate(() => CL.chat)).toBe(false);
});

test('the conversation is forgotten when the visit ends', async ({ game, newPhone }) => {
  const { ada, ben } = await adaAndBen(game, newPhone);
  await say(ben, 'bye soon');
  await expect.poll(() => ada.evaluate(() => MP.chat.length)).toBe(1);
  await ada.evaluate(() => closeIsland());
  await expect.poll(() => ben.evaluate(() => MP.role)).toBe(null);
  expect(await ben.evaluate(() => [MP.chat.length, MP.say.size])).toEqual([0, 0]);
  expect(await ada.evaluate(() => [MP.chat.length, MP.say.size])).toEqual([0, 0]);
  await expect(ben.locator('#bChat')).toBeHidden();
  await expect(ben.locator('#chat')).toBeHidden();
});

test('the emote bar and the chat panel never cover each other', async ({ game, newPhone }) => {
  const { ben } = await adaAndBen(game, newPhone);
  await ben.locator('#bChat').click();
  await expect(ben.locator('#chat')).toBeVisible();
  await ben.locator('#bEmo').click();
  await expect(ben.locator('#emobar')).toBeVisible();
  await expect(ben.locator('#chat')).toBeHidden();
  await ben.locator('#bChat').click();
  await expect(ben.locator('#chat')).toBeVisible();
  await expect(ben.locator('#emobar')).toBeHidden();
});

// Headless Chromium has no on-screen keyboard: stand in for window.visualViewport, and "open" a keyboard by
// shrinking it from the bottom. Two browser models, because they report window.innerHeight differently:
//  - iOS Safari: innerHeight stays the full screen height while the keyboard is open;
//  - Android Chrome: innerHeight follows the visible area, so it shrinks with the keyboard too.
// Either way the page layout (what position:fixed elements are placed in) stays full height.
const BROWSERS = { 'iOS Safari': false, 'Android Chrome': true };
for (const [browser, innerFollows] of Object.entries(BROWSERS))
  test.describe(`phone keyboard (${browser})`, () => {
    const fakeKeyboard = page =>
      page.addInitScript(innerFollows => {
        // heights are worked out when read: this runs before the page's viewport settings apply
        const real =
            Object.getOwnPropertyDescriptor(window, 'innerHeight') ||
            Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight'),
          full = () => real.get.call(window),
          kb = { px: 0, pan: 0 },
          vv = new EventTarget();
        Object.defineProperties(vv, {
          height: { get: () => full() - kb.px - kb.pan },
          width: { get: () => innerWidth },
          offsetTop: { get: () => kb.pan },
          offsetLeft: { value: 0 },
          scale: { value: 1 }
        });
        Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
        if (innerFollows)
          Object.defineProperty(window, 'innerHeight', { get: () => vv.height, configurable: true });
        window.__H0 = full;
        // px: keyboard height; pan: how far the browser scrolled the visible area down to show the text box
        window.__keyboard = (px, pan = 0) => {
          Object.assign(kb, { px, pan });
          vv.dispatchEvent(new Event('resize'));
        };
      }, innerFollows);
    const box = (page, sel) => page.locator(sel).boundingBox();

    test('the chat box moves above the keyboard, and back down when it closes', async ({
      game,
      newPhone
    }) => {
      await fakeKeyboard(game.page);
      const { ben } = await adaAndBen(game, newPhone);
      const ada = game.page;
      await say(ben, 'hi!');
      await ada.locator('#bChat').click();
      const H = await ada.evaluate(() => window.__H0());
      const closed = await box(ada, '#chat');

      // a tall keyboard, like a phone in landscape or with suggestions: 60% of the screen
      const kb = Math.round(H * 0.6);
      await ada.evaluate(px => window.__keyboard(px), kb);
      await expect
        .poll(async () => {
          const b = await box(ada, '#chat');
          return b.y + b.height <= H - kb && b.y >= 0;
        })
        .toBe(true);
      const inp = await box(ada, '#chatin');
      expect(inp.y + inp.height).toBeLessThanOrEqual(H - kb);
      // the log still shows the last message
      const last = await box(ada, '#chatlog .cl:last-child');
      expect(last.y + last.height).toBeLessThanOrEqual(H - kb);

      await ada.evaluate(() => window.__keyboard(0));
      await expect.poll(async () => (await box(ada, '#chat')).y).toBeCloseTo(closed.y, 0);
    });

    test('the page panned to the text box: the whole chat box stays in view', async ({ game, newPhone }) => {
      await fakeKeyboard(game.page);
      const { ben } = await adaAndBen(game, newPhone);
      const ada = game.page;
      await say(ben, 'hi!');
      await ada.locator('#bChat').click();
      const H = await ada.evaluate(() => window.__H0());
      const kb = Math.round(H * 0.45),
        pan = 120;
      await ada.evaluate(([px, p]) => window.__keyboard(px, p), [kb, pan]);
      await expect
        .poll(async () => {
          const b = await box(ada, '#chat');
          return b.y >= pan && b.y + b.height <= H - kb;
        })
        .toBe(true);
    });
  });
