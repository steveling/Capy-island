// Sounds, fishing (random timing, rod and line, wanted fish), and napping friends.
const { test, expect } = require('./fixtures');

/** log every sound the game plays: window.__snd = ['pick', 'bug', ...] (voices as 'voice:<id>') */
async function listen(page) {
  await page.evaluate(() => {
    window.__snd = [];
    for (const k of Object.keys(SND)) {
      const f = SND[k];
      SND[k] = (...a) => (window.__snd.push(k), f(...a));
    }
    const v = voice;
    voice = id => (window.__snd.push('voice:' + id), v(id));
  });
}
const heard = page => page.evaluate(() => window.__snd);

test.describe('sounds', () => {
  test('every sound makes an audible, unclipped noise', async ({ page, game }) => {
    await game.open();
    const r = await page.evaluate(async () => {
      const out = {};
      const render = async fn => {
        AC = new OfflineAudioContext(1, 44100 * 2, 44100);
        fn();
        const d = (await AC.startRendering()).getChannelData(0);
        let peak = 0;
        for (const x of d) peak = Math.max(peak, Math.abs(x));
        return +peak.toFixed(3);
      };
      for (const k of Object.keys(SND)) if (k !== 'snore') out[k] = await render(SND[k]);
      out['snore near'] = await render(() => SND.snore(1));
      out['snore far'] = await render(() => SND.snore(0.2));
      for (const id of ['mochi', 'pip', 'puddle']) out['voice ' + id] = await render(() => voice(id));
      AC = null;
      return out;
    });
    expect(Object.keys(r).length).toBeGreaterThan(30);
    for (const [k, peak] of Object.entries(r)) {
      expect(peak, `${k} is audible`).toBeGreaterThan(0.01);
      expect(peak, `${k} doesn't clip`).toBeLessThan(1);
    }
    expect(r['snore far']).toBeLessThan(r['snore near']);
  });

  test('actions play sounds that fit them', async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await listen(page);
    const play = async (fn, ...args) => {
      await page.evaluate(() => (window.__snd = []));
      await page.evaluate(fn, ...args);
      return heard(page);
    };
    // picking fruit rustles the leaves
    expect(await play(() => ((S.trees[0] = 3), doAct({ k: 'tree', i: 0 })))).toContain('pick');
    // a caught bug gets its own sound
    expect(
      await play(() => {
        Math.random = () => 0.01; // always caught
        spawnBug();
        catchBug(bugs[bugs.length - 1]);
      })
    ).toContain('bug');
    // neighbours have their own voices
    expect(await play(() => ((busy = false), openTalk(NEIGH[2])))).toContain('voice:puddle');
    // buying at the shop, and placing furniture
    expect(
      await play(() => {
        closeTalk();
        S.coins = 9999;
        buy(S.stock[0]);
      })
    ).toContain('coin');
    expect(
      await play(() => {
        closeModal();
        addItem('bed');
        place(3, 'bed');
      })
    ).toContain('thunk');
    // popping a balloon
    expect(await play(() => SND.balloon())).toEqual(['balloon']);
  });
});

test.describe('fishing', () => {
  test('each cast is different: 0-3 fake nibbles, a bite after 1.5-6.5 seconds', async ({ page, game }) => {
    await game.open();
    const r = await page.evaluate(() => Array.from({ length: 3000 }, () => fishPlan()));
    const bites = r.map(p => p.bite),
      mean = bites.reduce((a, b) => a + b) / bites.length,
      sd = Math.sqrt(bites.reduce((a, b) => a + (b - mean) ** 2, 0) / bites.length);
    expect(Math.min(...bites)).toBeGreaterThanOrEqual(1.5);
    expect(Math.max(...bites)).toBeLessThanOrEqual(6.5);
    expect(mean).toBeGreaterThan(3.6);
    expect(mean).toBeLessThan(4.4);
    expect(sd).toBeGreaterThan(0.8); // not always the same wait
    expect(new Set(bites.map(b => b.toFixed(1))).size).toBeGreaterThan(40);
    expect(new Set(r.map(p => p.nibbles.length))).toEqual(new Set([0, 1, 2, 3]));
    for (const p of r) {
      p.nibbles.forEach((t, i) => {
        expect(t).toBeGreaterThanOrEqual(0.6);
        expect(t).toBeLessThan(p.bite);
        if (i) expect(t - p.nibbles[i - 1]).toBeGreaterThan(0.3);
      });
      expect(p.window).toBeGreaterThanOrEqual(1.4);
      expect(p.window).toBeLessThanOrEqual(1.9);
    }
  });

  test('the rod and line stay attached to the bobber, from cast to catch', async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await listen(page);
    await page.evaluate(() => startFish());
    await expect(page.locator('#fish')).toBeVisible();
    // where the line ends vs. the top of the bobber
    const gap = () =>
      page.evaluate(() => {
        const m = $('#rodline')
            .getAttribute('d')
            .match(/(-?[\d.]+),(-?[\d.]+)$/),
          w = $('#fwater'),
          r = w.getBoundingClientRect(),
          b = $('#bobber').getBoundingClientRect();
        const bx = b.left + b.width / 2 - r.left - w.clientLeft,
          by = b.top - r.top - w.clientTop + b.height * 0.28;
        return Math.hypot(+m[1] - bx, +m[2] - by);
      });
    await expect.poll(gap).toBeLessThan(3);
    const tipBefore = await page.evaluate(() => $('#rodpole').getAttribute('d'));
    // the bite comes within the cast (0.45s) + 6.5s at most
    await expect(page.locator('#fmsg')).toHaveText('SPLASH! Tap now! 🎣', { timeout: 7500 });
    await page.waitForTimeout(300); // the rod bends
    expect(await page.evaluate(() => $('#rodpole').getAttribute('d'))).not.toBe(tipBefore);
    expect(await gap()).toBeLessThan(3);
    // the button pulses during a bite, and Playwright would wait for it to hold still (a tap doesn't)
    await page.locator('#fbtn').click({ force: true });
    await expect(page.locator('#fmsg')).toContainText('You caught a');
    expect(await heard(page)).toEqual(expect.arrayContaining(['cast', 'plop', 'bite', 'reel']));
    await page.locator('#fcancel').click();
    await expect(page.locator('#fish')).toBeHidden();
    expect(await page.evaluate(() => F)).toBeNull();
  });

  test('tapping before the bite is too early', async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    await page.evaluate(() => startFish());
    await page.locator('#fbtn').click();
    await expect(page.locator('#fmsg')).toHaveText('Too early! Wait for the splash.');
  });

  test("fish a neighbour wants are a bit easier to catch, until they're given", async ({ page, game }) => {
    await game.open();
    await game.newPlayer('Ada', '🦄');
    const r = await page.evaluate(() => {
      const odds = () => {
        const l = catchWeights('fish'),
          total = l.reduce((s, [, w]) => s + w, 0);
        return Object.fromEntries(l.map(([i, w]) => [i, w / total]));
      };
      NEIGH.forEach(n => Object.assign(S.neigh[n.id], { req: null, done: false }));
      const before = odds();
      S.neigh.mochi.req = 'shrimp';
      const wanted = odds();
      const bugsWanted = catchWeights('bug').find(([i]) => i === 'shrimp');
      // sampling agrees with the weights
      let n = 0;
      for (let i = 0; i < 20000; i++) if (weighted('fish') === 'shrimp') n++;
      S.neigh.mochi.done = true;
      const given = odds();
      return {
        before: before.shrimp,
        wanted: wanted.shrimp,
        sampled: n / 20000,
        given: given.shrimp,
        bugsWanted
      };
    });
    expect(r.wanted / r.before).toBeGreaterThan(1.35);
    expect(r.wanted / r.before).toBeLessThan(1.5); // "a bit": the weight is x1.5, the odds a little less
    expect(Math.abs(r.sampled - r.wanted)).toBeLessThan(0.01);
    expect(r.given).toBeCloseTo(r.before, 10);
    expect(r.bugsWanted).toBeUndefined();
  });
});

test.describe('visiting a napping friend', () => {
  /** an offline (napping) visit to Hapi Mommy's island */
  async function napVisit(page, game) {
    await game.open();
    await game.newPlayer('Ben', '🚀');
    await listen(page);
    await page.evaluate(() => {
      MP.role = 'connecting';
      enterVisit({
        me: 'me',
        isl: Object.assign(snapshot(), { name: 'Hapi Mommy', color: 'lavender', acc: 'flower' }),
        pl: [],
        nb: null
      });
      MP.offline = true;
      mpUI();
    });
  }
  const snoresAt = async (page, dx) => {
    await page.evaluate(dx => {
      window.__snd = [];
      P.x = P.tx = NAP.x + dx;
      P.y = P.ty = NAP.y + 30;
      napT = 0;
    }, dx);
    await page.waitForTimeout(300);
    return page.evaluate(() => ({
      snores: window.__snd.filter(s => s === 'snore').length,
      v: napVolume(),
      next: napT
    }));
  };

  test('they sleep in a bed, and snore every few seconds, louder up close', async ({ page, game }) => {
    await napVisit(page, game);
    // the bed scene draws (the frame loop would swallow an error, so draw it directly)
    expect(await page.evaluate(() => (drawNapper(), 'drawn'))).toBe('drawn');

    const near = await snoresAt(page, -40);
    expect(near.snores).toBe(1);
    expect(near.v).toBeGreaterThan(0.85);
    expect(near.next).toBeGreaterThan(2.7);
    expect(near.next).toBeLessThanOrEqual(4.5);

    const mid = await snoresAt(page, 350);
    expect(mid.snores).toBe(1);
    expect(mid.v).toBeLessThan(near.v);
    // too far away to hear
    expect((await snoresAt(page, 900)).snores).toBe(0);
  });

  test('tapping the bed says shh', async ({ page, game }) => {
    await napVisit(page, game);
    await page.evaluate(() => tapWorld(NAP.x, NAP.y - 20));
    await expect(page.locator('#toast')).toContainText('Hapi Mommy is taking a nap');
    // where the bed and the house touch, a tap still goes to the house
    const act = await page.evaluate(() => {
      P.act = null;
      tapWorld(HOUSE.x + 60, HOUSE.y - 5);
      return P.act && P.act.k;
    });
    expect(act).toBe('house');
  });

  test('no snoring on a live visit or at home', async ({ page, game }) => {
    await napVisit(page, game);
    await page.evaluate(() => (MP.offline = false));
    expect((await snoresAt(page, -40)).snores).toBe(0);
    await page.evaluate(() => returnHome());
    expect((await snoresAt(page, -40)).snores).toBe(0);
  });
});
