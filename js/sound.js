// Sound effects, all made on the fly with Web Audio: gliding tones plus filtered noise for splashes and rustles.
'use strict';

// ---------- SOUND ----------
let AC, OUT, NOISE;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    OUT = null;
  }
  if (AC.state === 'suspended' && AC.resume) AC.resume().catch(() => {});
  if (!OUT || OUT.context !== AC) {
    OUT = AC.createGain();
    OUT.gain.value = 0.9;
    OUT.connect(AC.destination);
    // one second of white noise, reused by every noisy sound
    NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = NOISE.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return AC;
}
// a note: frequency f (gliding to `to`), lasting d seconds, starting `at` seconds from now
function tone(f, d, { at = 0, to = null, type = 'triangle', vol = 0.12, attack = 0.005 } = {}) {
  const t = AC.currentTime + at,
    o = AC.createOscillator(),
    g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(OUT);
  o.start(t);
  o.stop(t + d + 0.02);
}
// a burst of filtered noise: splashes, rustles, whooshes and crunches
function hiss(d, { at = 0, vol = 0.12, type = 'lowpass', f = 1200, to = null, q = 1, attack = 0.01 } = {}) {
  const t = AC.currentTime + at,
    s = AC.createBufferSource(),
    fl = AC.createBiquadFilter(),
    g = AC.createGain();
  s.buffer = NOISE;
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(OUT);
  s.start(t, Math.random() * 0.5);
  s.stop(t + d + 0.02);
}
// notes one after another: [[freq, seconds], ...]
function notes(list, opts = {}) {
  let at = opts.at || 0;
  list.forEach(([f, d]) => {
    tone(f, d, Object.assign({}, opts, { at }));
    at += d * 0.8;
  });
}
const play = fn => () => {
  try {
    audio();
    fn();
  } catch (e) {}
};

const SND = {
  // general
  pop: play(() =>
    notes([
      [520, 0.08],
      [780, 0.12]
    ])
  ),
  yay: play(() =>
    notes([
      [660, 0.12],
      [880, 0.12],
      [1175, 0.25]
    ])
  ),
  oops: play(() =>
    notes([
      [400, 0.15],
      [300, 0.25]
    ])
  ),
  coin: play(() => {
    tone(988, 0.08, { type: 'square', vol: 0.05 });
    tone(1319, 0.3, { at: 0.07, type: 'square', vol: 0.05 });
    tone(2637, 0.25, { at: 0.07, type: 'sine', vol: 0.04 });
  }),
  // a little magical shimmer: finds, new looks, wishes
  sparkle: play(() =>
    [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.18, { at: i * 0.05, type: 'sine', vol: 0.06 }))
  ),
  // a warm "aww" for friendship moments
  heart: play(() =>
    notes(
      [
        [523, 0.14],
        [659, 0.14],
        [784, 0.14],
        [1047, 0.35]
      ],
      { type: 'sine', vol: 0.1 }
    )
  ),
  // a bigger fanfare for special moments
  fanfare: play(() => {
    notes(
      [
        [523, 0.12],
        [659, 0.12],
        [784, 0.12],
        [1047, 0.2],
        [784, 0.1],
        [1047, 0.45]
      ],
      { type: 'square', vol: 0.05 }
    );
    notes(
      [
        [262, 0.3],
        [392, 0.3],
        [523, 0.6]
      ],
      { type: 'triangle', vol: 0.08 }
    );
  }),
  // island life
  pick: play(() => {
    hiss(0.22, { type: 'bandpass', f: 2500, q: 0.7, vol: 0.09 }); // leaves rustle
    [0.1, 0.19, 0.26].forEach((at, i) => tone(700 - i * 90, 0.07, { at, to: 380, type: 'sine', vol: 0.1 })); // plop plop
  }),
  net: play(() => hiss(0.18, { type: 'highpass', f: 600, to: 4000, vol: 0.08 })), // swish
  bug: play(() => {
    hiss(0.16, { type: 'highpass', f: 600, to: 4000, vol: 0.07 });
    tone(1800, 0.09, { at: 0.12, to: 2600, type: 'sine', vol: 0.08 });
    tone(2200, 0.12, { at: 0.2, to: 3000, type: 'sine', vol: 0.07 });
  }),
  dig: play(() => {
    hiss(0.09, { f: 700, vol: 0.14 });
    hiss(0.12, { at: 0.13, f: 500, vol: 0.12 });
  }),
  plant: play(() => {
    tone(160, 0.12, { type: 'sine', vol: 0.14, to: 110 });
    tone(1760, 0.2, { at: 0.08, type: 'sine', vol: 0.05 });
  }),
  water: play(() =>
    [0, 0.07, 0.15, 0.21].forEach((at, i) =>
      tone(1400 + i * 220, 0.06, { at, to: 900, type: 'sine', vol: 0.06 })
    )
  ),
  splash: play(() => {
    hiss(0.35, { f: 3000, to: 400, vol: 0.14 });
    tone(220, 0.25, { to: 90, type: 'sine', vol: 0.1 });
  }),
  bubbles: play(() =>
    [0, 0.09, 0.17, 0.3].forEach((at, i) =>
      tone(300 + i * 60, 0.08, { at, to: 700, type: 'sine', vol: 0.07 })
    )
  ),
  thunk: play(() => {
    tone(140, 0.12, { type: 'sine', vol: 0.16, to: 90 });
    hiss(0.05, { f: 900, vol: 0.06 });
  }),
  lift: play(() =>
    notes(
      [
        [500, 0.06],
        [760, 0.1]
      ],
      { type: 'sine', vol: 0.09 }
    )
  ),
  present: play(() => {
    hiss(0.25, { type: 'bandpass', f: 3200, q: 0.5, vol: 0.08 }); // paper
    notes(
      [
        [784, 0.1],
        [988, 0.1],
        [1319, 0.3]
      ],
      { at: 0.2 }
    );
  }),
  balloon: play(() => {
    hiss(0.06, { type: 'highpass', f: 1500, vol: 0.2, attack: 0.001 });
    tone(900, 0.08, { to: 200, type: 'sine', vol: 0.08 });
  }),
  wish: play(() =>
    [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) =>
      tone(f, 0.3, { at: i * 0.07, type: 'sine', vol: 0.05 })
    )
  ),
  whoosh: play(() => hiss(0.5, { type: 'bandpass', f: 300, to: 2400, q: 0.8, vol: 0.1, attack: 0.15 })),
  stamp: play(() => {
    tone(110, 0.1, { type: 'sine', vol: 0.18, to: 70 });
    notes(
      [
        [880, 0.08],
        [1175, 0.2]
      ],
      { at: 0.12, vol: 0.08 }
    );
  }),
  hoot: play(() => {
    tone(420, 0.22, { to: 380, type: 'sine', vol: 0.12 });
    tone(420, 0.3, { at: 0.28, to: 360, type: 'sine', vol: 0.12 });
  }),
  chisel: play(() => [0, 0.12, 0.24].forEach(at => tone(2400, 0.03, { at, type: 'square', vol: 0.04 }))),
  pour: play(() => hiss(0.45, { type: 'bandpass', f: 900, to: 1600, q: 3, vol: 0.08, attack: 0.05 })),
  dice: play(() =>
    [0, 0.05, 0.11, 0.18].forEach(at =>
      tone(1800 + Math.random() * 900, 0.025, { at, type: 'square', vol: 0.04 })
    )
  ),
  ding: play(() => tone(1319, 0.35, { type: 'sine', vol: 0.07 })),
  unlock: play(() =>
    notes(
      [
        [784, 0.08],
        [1047, 0.08],
        [1568, 0.25]
      ],
      { type: 'sine', vol: 0.1 }
    )
  ),
  // fishing
  cast: play(() => hiss(0.3, { type: 'bandpass', f: 800, to: 2600, q: 0.9, vol: 0.07, attack: 0.1 })),
  plop: play(() => {
    tone(700, 0.12, { to: 180, type: 'sine', vol: 0.12 });
    hiss(0.1, { f: 1500, vol: 0.05 });
  }),
  nibble: play(() => tone(900, 0.05, { to: 650, type: 'sine', vol: 0.06 })),
  bite: play(() => {
    hiss(0.3, { f: 3500, to: 500, vol: 0.16 });
    tone(240, 0.2, { to: 100, type: 'sine', vol: 0.12 });
  }),
  reel: play(() => {
    for (let i = 0; i < 7; i++) tone(1200, 0.02, { at: i * 0.045, type: 'square', vol: 0.035 });
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      tone(f, 0.22, { at: 0.34 + i * 0.07, type: 'sine', vol: 0.08 })
    );
  }),
  away: play(() =>
    [0, 0.12, 0.24].forEach((at, i) =>
      tone(500 - i * 90, 0.1, { at, to: 250 - i * 40, type: 'sine', vol: 0.08 })
    )
  )
};

// a sleepy snore: a soft rumbly breath in, then a little whistle out. v = how close you are (0-1)
SND.snore = v =>
  play(() => {
    v = Math.max(0, Math.min(1, v));
    const t = AC.currentTime,
      o = AC.createOscillator(),
      lp = AC.createBiquadFilter(),
      g = AC.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(95, t + 0.7);
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * v + 0.0002, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(lp).connect(g).connect(OUT);
    o.start(t);
    o.stop(t + 0.85);
    hiss(0.7, { type: 'bandpass', f: 500, q: 1.5, vol: 0.05 * v + 0.0002, attack: 0.3 });
    tone(900, 0.5, { at: 1.0, to: 560, type: 'sine', vol: 0.03 * v + 0.0002, attack: 0.1 });
  })();

// neighbours say hi with their own voices
const VOICE = {
  mochi: [880, 'sine'], // bunny: soft and high
  pip: [1400, 'sine'], // chick: very high chirps
  puddle: [320, 'sawtooth'] // duck: a little quack
};
function voice(id) {
  try {
    audio();
    const [base, type] = VOICE[id] || [600, 'triangle'],
      n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = base * (0.85 + Math.random() * 0.35);
      tone(f, 0.08, {
        at: i * 0.11,
        to: f * (type === 'sawtooth' ? 0.7 : 1.2),
        type,
        vol: type === 'sawtooth' ? 0.04 : 0.07
      });
    }
  } catch (e) {}
}
