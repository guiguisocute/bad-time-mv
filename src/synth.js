// Procedural sound effects for the light extra sound layer of the TikTok cut: reverse swells,
// whooshes, a glitch stutter. Deterministic (seeded noise), shared by the live player (WebAudio
// buffers) and tools/render.cjs.
(function (root) {
  const TAU = Math.PI * 2;
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    };
  };
  // RBJ biquad; set() may be called every sample for sweeps
  const biquad = (sr) => {
    let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const f = {
      set(type, fc, q = 0.707) {
        const w = (TAU * Math.min(fc, sr * 0.45)) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
        let c0, c1, c2;
        if (type === 'lp') { c0 = (1 - cw) / 2; c1 = 1 - cw; c2 = c0; }
        else if (type === 'hp') { c0 = (1 + cw) / 2; c1 = -(1 + cw); c2 = c0; }
        else { c0 = al; c1 = 0; c2 = -al; } // band-pass, 0 dB peak
        const a0 = 1 + al;
        b0 = c0 / a0; b1 = c1 / a0; b2 = c2 / a0; a1 = (-2 * cw) / a0; a2 = (1 - al) / a0;
        return f;
      },
      run(x) { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; },
    };
    return f;
  };
  const finish = (o, sr, peak) => {
    let m = 0;
    for (let i = 0; i < o.length; i++) m = Math.max(m, Math.abs(o[i]));
    const n = Math.min(o.length, Math.round(sr * 0.006)); // de-click the tail
    for (let i = 0; i < o.length; i++) o[i] *= (m > 0 ? peak / m : 0) * (i >= o.length - n ? (o.length - 1 - i) / n : 1);
    return o;
  };
  const buf = (sr, sec) => new Float32Array(Math.round(sr * sec));

  const LEN = { Whoosh: 0.42, Swell: 1.0, SwellShort: 0.5, Glitch: 0.26 };
  const SOUNDS = {
    // air pass-by: noise through a band-pass sweeping up
    Whoosh(sr) {
      const o = buf(sr, LEN.Whoosh), nz = rng(47), bp = biquad(sr), hp = biquad(sr).set('hp', 250);
      for (let i = 0; i < o.length; i++) {
        const u = i / o.length;
        bp.set('bp', 450 * Math.pow(9, u), 1.1);
        o[i] = hp.run(bp.run(nz())) * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 2);
      }
      return finish(o, sr, 0.8);
    },
    // reverse cymbal: rises to the downbeat and stops dead on it (schedule at tHit - LEN)
    Swell(sr) { return swell(sr, LEN.Swell, 53); },
    SwellShort(sr) { return swell(sr, LEN.SwellShort, 59); },
    // digital stutter: sample-and-hold noise and square blips, chopped into 16 ms grains
    Glitch(sr) {
      const o = buf(sr, LEN.Glitch), nz = rng(97), g = Math.round(sr * 0.016);
      let hold = 0, rate = 1, f = 200, on = 1;
      for (let i = 0; i < o.length; i++) {
        if (i % g === 0) { rate = 2 + Math.floor((nz() + 1) * 20); f = 90 + (nz() + 1) * 500; on = nz() > -0.45 ? 1 : 0; }
        if (i % rate === 0) hold = nz();
        const sq = Math.sin((TAU * f * i) / sr) > 0 ? 1 : -1;
        o[i] = on * (hold * 0.6 + sq * 0.35) * (1 - i / o.length);
      }
      return finish(o, sr, 0.7);
    },
  };
  function swell(sr, len, seed) {
    const o = buf(sr, len), nz = rng(seed), hp = biquad(sr).set('hp', 2600), bp = biquad(sr);
    for (let i = 0; i < o.length; i++) {
      const u = i / o.length;
      bp.set('bp', 3000 + 6000 * u, 0.9);
      const x = nz();
      o[i] = (hp.run(x) * 0.7 + bp.run(x) * 0.8) * Math.pow(u, 3.2);
    }
    return finish(o, sr, 0.75);
  }

  const cache = {};
  const API = {
    names: Object.keys(SOUNDS),
    has: (name) => Object.prototype.hasOwnProperty.call(SOUNDS, name),
    len: (name) => LEN[name] || 0,
    // mono Float32Array at sample rate sr
    make(name, sr) { const k = name + '@' + sr; return cache[k] || (cache[k] = SOUNDS[name](sr)); },
  };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.MV_SYNTH = API;
})(typeof window !== 'undefined' ? window : globalThis);
