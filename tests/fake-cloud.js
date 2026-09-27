// A tiny stand-in for supabase-js, installed before the game loads (the game uses window.supabase if it's
// already there). Sign-ins are stored under their storageKey like the real library, so the tests see the
// same localStorage keys the game juggles. RPCs answer from `rpc` handlers; anything else fails like an
// offline cloud, so the game just runs in its "cloud offline" state.
//   fakeCloud(page, { claim: { code, save, ts } })   a moving code claim_transfer accepts
//   fakeCloud(page, { rpc: { fn: answer } })         fixed answers, e.g. open_island: 'CATCD', or
//                                                    my_cloud_status: {...} to bring the cloud "online".
//     join_by_code: { CODE: { owner, name } }        codes that exist; joining one makes that owner a best
//                                                    friend, which list_friends then includes
async function fakeCloud(page, rpc = {}) {
  await page.addInitScript(handlers => {
    const fixed = handlers.rpc || {},
      made = () => JSON.parse(sessionStorage.getItem('__friends') || '[]');
    const answer = {
      claim_transfer: args =>
        handlers.claim && args.p_code === handlers.claim.code
          ? { save: handlers.claim.save, save_ts: handlers.claim.ts }
          : null
    };
    for (const fn of Object.keys(fixed)) answer[fn] = () => fixed[fn];
    if (fixed.join_by_code)
      answer.join_by_code = args => {
        const r = fixed.join_by_code[args.p_code] || null;
        if (r)
          sessionStorage.setItem(
            '__friends',
            JSON.stringify(made().concat({ friend: r.owner, name: r.name }))
          );
        return r;
      };
    if (fixed.list_friends || fixed.join_by_code)
      answer.list_friends = () => (fixed.list_friends || []).concat(made());
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
