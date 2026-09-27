// Connect a host game page and visitor game pages through the real visit protocol, with the test runner
// passing messages between the pages instead of Supabase Realtime / WebRTC.
// A link can be "cloud" (like a best-friends Supabase channel) or not (like a PeerJS island-code visit).

// runs in every page: a fake connection with the same on/send/close shape the game uses
const FAKE_CONN = () => {
  window.fakeConn = (peer, cloud) => ({
    peer,
    cloud,
    open: true,
    h: {},
    on(ev, f) {
      (this.h[ev] = this.h[ev] || []).push(f);
      return this;
    },
    emit(ev, a) {
      (this.h[ev] || []).forEach(f => f(a));
    },
    send(m) {
      if (this.open) window.__out(this.peer, JSON.stringify(m));
    },
    close() {
      if (!this.open) return;
      this.open = false;
      window.__out(this.peer, JSON.stringify({ t: '__closed' }));
      this.emit('close');
    }
  });
};

/** make `page` the host of an open island; returns helpers to add visitors to it */
async function hostIsland(page) {
  const visitors = new Map(); // visitor id -> page (or a node-side inbox array)
  await page.exposeFunction('__out', async (to, json) => {
    const dest = visitors.get(to);
    if (!dest) return;
    if (Array.isArray(dest)) dest.push(JSON.parse(json));
    else await dest.evaluate(m => window.__in(m), JSON.parse(json)).catch(() => {});
  });
  await page.evaluate(FAKE_CONN);
  await page.evaluate(() => {
    MP.role = 'host';
    MP.hostState = 'open';
    MP.code = null;
    MP.dropin = true;
    window.__conns = {};
    window.__in = (from, m) => {
      const c = window.__conns[from];
      if (!c) return;
      if (m.t === '__closed') c.emit('close');
      else c.emit('data', m);
    };
    mpUI();
  });

  return {
    /** connect a visitor page (who must already be in the game) with id `id` */
    async visit(visitor, id, { cloud = true } = {}) {
      visitors.set(id, visitor);
      await page.evaluate(({ id, cloud }) => hostConn((window.__conns[id] = fakeConn(id, cloud))), {
        id,
        cloud
      });
      await visitor.exposeFunction('__out', async (_to, json) => {
        await page.evaluate(({ id, m }) => window.__in(id, m), { id, m: JSON.parse(json) }).catch(() => {});
      });
      await visitor.evaluate(FAKE_CONN);
      await visitor.evaluate(cloud => {
        MP.role = 'connecting';
        const c = fakeConn('host', cloud);
        MP.conn = c;
        window.__in = m => {
          if (MP.conn !== c) return;
          if (m.t === '__closed') returnHome('closed');
          else visitorData(m);
        };
        c.send({ t: 'hello', v: 1, name: S.name, color: myColor(), acc: myAcc(), stack: [] });
      }, cloud);
      await visitor.waitForFunction(() => MP.role === 'visitor');
    },
    /** a visitor with no page: its messages are sent from the test, what it receives lands in the returned array */
    async ghost(id, name, { cloud = true } = {}) {
      const inbox = [];
      visitors.set(id, inbox);
      await page.evaluate(({ id, cloud }) => hostConn((window.__conns[id] = fakeConn(id, cloud))), {
        id,
        cloud
      });
      const send = m => page.evaluate(({ id, m }) => window.__in(id, m), { id, m });
      await send({ t: 'hello', v: 1, name, color: 'mint', acc: 'bow', stack: [] });
      return { inbox, send };
    }
  };
}

module.exports = { hostIsland };
