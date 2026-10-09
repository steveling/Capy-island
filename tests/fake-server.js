// A fake Supabase whose "server" lives in the test (Node), so every page and every address (origin) of one test
// talks to the same cloud, like the real one: islands, the passcode allow-list, best friends and moving codes.
// Sign-ins are stored under their storageKey like the real library (see fake-cloud.js).
//   const srv = await fakeServer(page)
//   srv.island(uid, save, { ts, friends })   an allowed sign-in with an island in the cloud
//   srv.fail.add('create_transfer_code')     that call fails like a cloud that can't be reached (srv.fail.clear())
//   srv.before = (fn, args, uid) => ...      runs before each call; return true to fail that one
//   srv.log                                  every call: [function, args, caller's user id]
const crypto = require('crypto');

const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

async function fakeServer(page) {
  const srv = {
    islands: new Map(), // owner -> { save, save_ts }
    allowed: new Set(),
    friends: new Map(), // owner -> [{ friend, name, color }]
    codes: new Map(), // code -> owner
    moved: new Set(),
    fail: new Set(),
    before: null,
    log: [],
    island(uid, save, { ts = 1000, friends = [] } = {}) {
      this.allowed.add(uid);
      this.islands.set(uid, { save, save_ts: ts });
      this.friends.set(uid, friends);
    },
    calls(fn) {
      return this.log.filter(c => c[0] === fn);
    }
  };
  const err = message => ({ data: null, error: { message } });
  const rpc = {
    my_cloud_status(u) {
      const i = srv.islands.get(u);
      return { data: { has_island: !!i, moved: !i && srv.moved.has(u), save_ts: i ? i.save_ts : null } };
    },
    create_transfer_code(u) {
      if (!srv.islands.has(u)) return err('no_island');
      for (const [c, o] of srv.codes) if (o === u) srv.codes.delete(c);
      let c = '';
      while (c.length < 12) c += ABC[crypto.randomInt(ABC.length)];
      srv.codes.set(c, u);
      return { data: { code: `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}` } };
    },
    cancel_transfer_code(u) {
      for (const [c, o] of srv.codes) if (o === u) srv.codes.delete(c);
      return { data: null };
    },
    list_friends(u) {
      return { data: (srv.friends.get(u) || []).map(f => ({ online: false, last_days: 1, ...f })) };
    },
    touch_island: () => ({ data: null }),
    claim_inbox: () => ({ data: { gifts: [], guestbook: [] } }),
    claim_mail: () => ({ data: [] })
  };
  await page.exposeBinding('__srv', (_src, { fn, args, uid }) => {
    srv.log.push([fn, args, uid]);
    if (srv.fail.has(fn) || (srv.before && srv.before(fn, args, uid))) return err('offline (fake server)');
    if (fn === 'claim_transfer') {
      if (!uid) return err('not_signed_in');
      const c = String(args.p_code || '').toUpperCase();
      const owner = srv.codes.get(c);
      if (!owner) return { data: null };
      srv.codes.delete(c);
      srv.allowed.add(uid); // the moving code opens the passcode gate too
      const i = srv.islands.get(owner);
      srv.islands.delete(owner);
      srv.islands.set(uid, i);
      srv.friends.set(uid, srv.friends.get(owner) || []);
      srv.friends.delete(owner);
      srv.moved.add(owner);
      return { data: { save: i.save, save_ts: i.save_ts, name: i.save.name } };
    }
    if (!uid || !srv.allowed.has(uid)) return err('not_allowed');
    if (fn === 'upsert') {
      srv.islands.set(uid, { save: args.save, save_ts: args.save_ts });
      return { error: null };
    }
    if (fn === 'select') {
      const i = args.owner === uid && srv.islands.get(uid);
      return { data: i ? { save: i.save, save_ts: i.save_ts } : null, error: null };
    }
    return rpc[fn] ? rpc[fn](uid, args) : err('offline (fake server)');
  });
  await page.addInitScript(() => {
    let n = 0;
    window.supabase = {
      createClient(url, key, opts) {
        const sk = opts.auth.storageKey;
        const read = () => {
          try {
            return JSON.parse(localStorage.getItem(sk));
          } catch (e) {
            return null;
          }
        };
        const call = (fn, args) => {
          const s = read();
          return window.__srv({ fn, args: args || {}, uid: s && s.user.id });
        };
        return {
          auth: {
            getSession: async () => ({ data: { session: read() }, error: null }),
            signInAnonymously: async () => {
              const s = { access_token: 'tok-' + ++n, user: { id: crypto.randomUUID() } };
              localStorage.setItem(sk, JSON.stringify(s));
              return { data: { session: s }, error: null };
            },
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            stopAutoRefresh() {},
            signOut: async () => (localStorage.removeItem(sk), {})
          },
          rpc: (fn, args) => call(fn, args),
          from: () => ({
            upsert: body => call('upsert', body),
            select: () => ({ eq: (k, v) => ({ maybeSingle: () => call('select', { owner: v }) }) })
          }),
          channel: () => ({ on() {}, subscribe() {}, track: async () => {}, untrack: async () => {} }),
          removeChannel() {}
        };
      }
    };
  });
  return srv;
}

module.exports = { fakeServer };
