// Shared helpers: math, easing, deterministic randomness, music-time helpers.
(function () {
  const MV = (window.MV = window.MV || {});

  const U = (MV.U = {});
  U.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, x) => U.clamp((x - a) / (b - a));
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.eIn = (t) => t * t * t;
  U.eOut = (t) => 1 - (1 - t) ** 3;
  U.eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  U.eOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
  U.eInExpo = (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10));
  U.eOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
  U.eOutElastic = (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  U.TAU = Math.PI * 2;

  // hash-based pseudo randomness (stateless, so any frame can be rendered alone)
  U.hash = (x) => {
    const s = Math.sin(x * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  U.hash2 = (x, y) => U.hash(x * 12.9898 + y * 78.233);
  U.noise = (x) => {
    const i = Math.floor(x), f = x - i;
    return U.lerp(U.hash(i), U.hash(i + 1), U.smooth(f)) * 2 - 1;
  };
  U.rng = (seed) => {
    let a = (seed * 2654435761) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ------------------------------------------------------------ music time
  const A = window.MV_ANALYSIS;
  const T = (MV.T = {
    A,
    bpm: A.bpm,
    off: A.offset,
    s16: A.sixteenth,
    beat: A.sixteenth * 4,
    bar: A.barLength,
    dur: A.duration,
  });
  // the video runs a few silent seconds past the music (the ending lingers)
  T.tail = 4;
  T.end = T.dur + T.tail;
  // time of bar b, beat k, sixteenth s (all may be fractional / overflow)
  T.at = (b, k = 0, s = 0) => T.off + b * T.bar + k * T.beat + s * T.s16;
  T.slot = (t) => Math.floor((t - T.off) / T.s16 + 1e-6);
  T.barOf = (t) => (t - T.off) / T.bar;
  T.beatOf = (t) => (t - T.off) / T.beat;
  T.acc = (slot, band = 'full') => {
    const a = A.slots[band];
    return slot >= 0 && slot < a.length ? a[slot] : 0;
  };
  T.env = (t, band = 'rms') => {
    const a = A.env[band];
    const x = t * A.envFps;
    const i = Math.floor(x);
    if (i < 0) return a[0];
    if (t >= T.dur) return 0;
    if (i >= a.length - 1) return a[a.length - 1];
    return U.lerp(a[i], a[i + 1], x - i);
  };
  // 0..1 pulse that is 1 exactly on every beat and decays over `len` seconds
  T.pulse = (t, period, len = 0.12, phase = 0) => {
    const x = (t - T.off - phase) / period;
    if (x < 0) return 0;
    const f = (x - Math.floor(x)) * period;
    return Math.max(0, 1 - f / len);
  };
  T.section = (t) => {
    const b = T.barOf(t);
    for (const s of A.sections) if (b >= s.bar0 && b < s.bar1) return s;
    return A.sections[A.sections.length - 1];
  };

  // ------------------------------------------------------------ cuts / output format
  // ?cut=tiktok: the vertical short. Starts on the FIGHT select that leads into the
  // four-strike combo (bar 44), keeps everything after it, and swaps in a harder
  // 54-59 plus extra sound design. Portrait framing follows the output aspect
  // (render: w < h; live player: ?portrait=1, on by default for the TikTok cut).
  const q = new URLSearchParams(location.search);
  MV.CUT = q.get('cut') || '';
  MV.TIKTOK = MV.CUT === 'tiktok';
  MV.PORTRAIT = q.has('render') ? +(q.get('w') || 1920) < +(q.get('h') || 1080) : (q.get('portrait') ?? (MV.TIKTOK ? '1' : '0')) === '1';
  T.cut = MV.TIKTOK ? { t0: T.at(44), t1: T.dur + 3.5 } : { t0: 0, t1: T.end };
})();
