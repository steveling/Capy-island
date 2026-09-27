// A tiny stand-in for supabase-js, installed before the game loads (the game uses window.supabase if it's
// already there). Sign-ins are stored under their storageKey like the real library, so the tests see the
// same localStorage keys the game juggles. RPCs answer from `rpc` handlers; anything else fails like an
// offline cloud, so the game just runs in its "cloud offline" state.
async function fakeCloud(page, rpc = {}) {
  await page.addInitScript(handlers => {
    const answer = {
      claim_transfer: args =>
        handlers.claim && args.p_code === handlers.claim.code
          ? { save: handlers.claim.save, save_ts: handlers.claim.ts }
          : null
    };
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
        return {
          auth: {
            getSession: async () => ({ data: { session: read() } }),
            signInAnonymously: async () => {
              const s = { access_token: 'tok-' + ++n, user: { id: crypto.randomUUID() } };
              localStorage.setItem(sk, JSON.stringify(s));
              return { data: { session: s }, error: null };
            },
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            stopAutoRefresh() {},
            signOut: async () => (localStorage.removeItem(sk), {})
          },
          rpc: async (fn, args) => {
            const s = read();
            // a log of calls that survives reloads: [function, args, the calling sign-in's user id]
            const log = JSON.parse(sessionStorage.getItem('__rpc') || '[]');
            log.push([fn, args, s && s.user.id]);
            sessionStorage.setItem('__rpc', JSON.stringify(log));
            if (!answer[fn]) return { data: null, error: { message: 'offline (fake cloud)' } };
            return { data: answer[fn](args), error: null };
          },
          from: () => ({ upsert: async () => ({ error: { message: 'offline (fake cloud)' } }) }),
          channel: () => ({ on() {}, subscribe() {}, track: async () => {}, untrack: async () => {} }),
          removeChannel() {}
        };
      }
    };
  }, rpc);
}

module.exports = { fakeCloud };
