// Stateless animation engine: every value is a pure function of time t, so any
// frame can be rendered on its own (live playback, scrubbing, offline export).
(function () {
  const MV = window.MV, U = MV.U;

  const EASE = {
    lin: (t) => t, in: U.eIn, out: U.eOut, inOut: U.eInOut, outExpo: U.eOutExpo, inExpo: U.eInExpo,
    outBack: U.eOutBack, outElastic: U.eOutElastic, smooth: U.smooth, step: (t) => (t < 1 ? 0 : 1),
    in2: (t) => t * t, out2: (t) => 1 - (1 - t) * (1 - t), in5: (t) => t ** 5,
  };
  MV.EASE = EASE;

  // Keyframed multi-channel track. Segments are appended in time order and
  // blend from the value reached at their start to their target values.
  class Track {
    constructor(init) {
      this.init = Object.assign({}, init);
      this.segs = [];
    }
    // animate channels in `vals` between t0 and t1
    to(t0, t1, vals, ease = 'inOut', extra) {
      this.segs.push({ t0, t1: Math.max(t1, t0), vals, ease: typeof ease === 'function' ? ease : EASE[ease], extra });
      this.dirty = true;
      return this;
    }
    set(t, vals) { return this.to(t, t, vals, 'lin'); }
    // parabolic hop: moves to vals while lifting channel `ch` by `h` at mid-way
    hop(t0, t1, vals, h, ch = 'y', ease = 'lin') { return this.to(t0, t1, vals, ease, { hop: h, ch }); }
    sort() { this.segs.sort((a, b) => a.t0 - b.t0); this.dirty = false; return this; }
    // baked samples (e.g. a physics simulation) override keyframes inside [t0, t0 + n*dt]
    bake(t0, dt, ch) {
      const n = Object.values(ch)[0].length;
      (this.baked = this.baked || []).push({ t0, t1: t0 + (n - 1) * dt, dt, ch });
      return this;
    }
    at(t) {
      if (this.dirty) this.sort();
      const s = Object.assign({}, this.init);
      for (const g of this.segs) {
        if (t < g.t0) break;
        if (t >= g.t1) { Object.assign(s, g.vals); continue; }
        const u = (t - g.t0) / (g.t1 - g.t0), e = g.ease(u);
        for (const k in g.vals) {
          const a = s[k], b = g.vals[k];
          s[k] = typeof b === 'number' && typeof a === 'number' ? a + (b - a) * e : u < 1 ? a : b;
        }
        if (g.extra && g.extra.hop) s[g.extra.ch] -= g.extra.hop * 4 * u * (1 - u);
      }
      if (this.baked)
        for (const b of this.baked) {
          if (t < b.t0 || t > b.t1) continue;
          const f = (t - b.t0) / b.dt, i = Math.floor(f), u = f - i;
          for (const k in b.ch) { const a = b.ch[k], i0 = Math.min(i, a.length - 1), i1 = Math.min(i + 1, a.length - 1); s[k] = a[i0] + (a[i1] - a[i0]) * u; }
        }
      return s;
    }
  }
  MV.Track = Track;

  // piecewise-constant values (modes, poses, flags)
  class Steps {
    constructor(v) { this.keys = [[-1e9, v]]; }
    set(t, v) { this.keys.push([t, v]); this.keys.sort((a, b) => a[0] - b[0]); return this; }
    at(t) {
      let v = this.keys[0][1];
      for (const [k, x] of this.keys) { if (t < k) break; v = x; }
      return v;
    }
    // time since the current value was set
    since(t) {
      let k0 = -1e9;
      for (const [k] of this.keys) { if (t < k) break; k0 = k; }
      return t - k0;
    }
  }
  MV.Steps = Steps;

  // ------------------------------------------------------------ timeline store
  const TL = (MV.TL = {
    events: [], // {t0, t1, z, draw(ctx, emi, t, S), hit?(t,x,y)}
    impacts: [], // camera / post reactions
    glitches: [],
    flags: {},
  });
  TL.add = (ev) => {
    ev.z = ev.z ?? 0;
    TL.events.push(ev);
    return ev;
  };
  // impact: shake + zoom punch + post fx at time t
  // o: {amp, dx, dy, zoom, rot, inv (s), bw, flash, ca, dur}
  TL.impact = (t, o = {}) => TL.impacts.push(Object.assign({ t, amp: 4, dx: 0, dy: 0, zoom: 0, rot: 0, inv: 0, flash: 0, ca: 0, dur: 0.35 }, o));
  TL.glitch = (t0, t1, amt = 1) => TL.glitches.push({ t0, t1, amt });
  // visual time remaps (rewinds): inside [t0, t1] the picture shows f(t) instead of t
  TL.remaps = [];
  TL.remap = (t0, t1, f) => TL.remaps.push({ t0, t1, f });
  TL.vt = (t) => { for (const r of TL.remaps) if (t >= r.t0 && t < r.t1) return r.f(t); return t; };
  TL.vhsAt = (t) => { for (const r of TL.remaps) if (t >= r.t0 && t < r.t1) return 1; return 0; };

  TL.finalize = () => {
    TL.events.sort((a, b) => a.t0 - b.t0);
    TL.impacts.sort((a, b) => a.t - b.t);
    for (const k in TL) if (TL[k] instanceof Track) TL[k].sort();
    TL.maxDur = 0;
    for (const e of TL.events) TL.maxDur = Math.max(TL.maxDur, e.t1 - e.t0);
  };
  TL.active = (t) => {
    // events are sorted by t0; binary search the first that could be alive
    const E = TL.events;
    let lo = 0, hi = E.length;
    const tmin = t - TL.maxDur;
    while (lo < hi) { const m = (lo + hi) >> 1; if (E[m].t0 < tmin) lo = m + 1; else hi = m; }
    const out = [];
    for (let i = lo; i < E.length && E[i].t0 <= t; i++) if (t < E[i].t1) out.push(E[i]);
    out.sort((a, b) => a.z - b.z);
    return out;
  };

  // accumulate camera / post-processing reactions from impacts
  TL.fxAt = (t) => {
    const fx = { sx: 0, sy: 0, zoom: 0, rot: 0, inv: 0, bw: 0, flash: 0, ca: 0 };
    for (const m of TL.impacts) {
      if (m.t > t) break;
      const dt = t - m.t;
      if (dt > Math.max(m.dur, 0.6)) continue;
      const k = Math.max(0, 1 - dt / m.dur), k2 = k * k;
      const n1 = U.noise(dt * 38 + m.t * 7.1), n2 = U.noise(dt * 41 + m.t * 3.3 + 50);
      // directional kick (snaps toward dx,dy then springs back) + random rumble
      const kick = Math.exp(-dt * 18) * Math.cos(dt * 40);
      fx.sx += m.amp * (n1 * k2 + m.dx * kick);
      fx.sy += m.amp * (n2 * k2 + m.dy * kick);
      fx.zoom += m.zoom * Math.exp(-dt * 10);
      fx.rot += m.rot * Math.exp(-dt * 8) * Math.cos(dt * 20);
      if (m.inv && dt < m.inv) fx.inv = 1;
      if (m.bw && dt < m.bw) fx.bw = 1;
      const fl = m.flash * Math.exp(-dt * 14);
      if (fl > fx.flash) { fx.flash = fl; fx.flashCol = m.flashCol; }
      fx.ca += m.ca * Math.exp(-dt * 9);
    }
    let g = 0;
    for (const q of TL.glitches) if (t >= q.t0 && t < q.t1) g = Math.max(g, q.amt);
    fx.glitch = g;
    return fx;
  };

  // ------------------------------------------------------------ particles
  // deterministic burst: evaluated analytically, no simulation state
  // o: {x,y,n,speed:[a,b],ang:[a,b],life:[a,b],g,drag,colors,size,glow,seed,shape}
  TL.burst = (t0, o) => {
    const n = o.n || 20, rnd = U.rng(o.seed ?? Math.floor(t0 * 1000 + (o.x || 0) * 7 + (o.y || 0) * 13));
    const ps = [];
    const sp = o.speed || [40, 140], an = o.ang || [0, U.TAU], lf = o.life || [0.3, 0.8];
    for (let i = 0; i < n; i++) {
      const a = U.lerp(an[0], an[1], rnd()), v = U.lerp(sp[0], sp[1], rnd());
      ps.push({
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: U.lerp(lf[0], lf[1], rnd()),
        c: (o.colors || ['#fff'])[Math.floor(rnd() * (o.colors || ['#fff']).length)],
        s: o.size ? (Array.isArray(o.size) ? Math.round(U.lerp(o.size[0], o.size[1], rnd())) : o.size) : 1 + (rnd() < 0.3 ? 1 : 0),
        ox: (rnd() - 0.5) * (o.spread || 0), oy: (rnd() - 0.5) * (o.spreadY ?? o.spread ?? 0),
        d: rnd() * (o.delay || 0),
      });
    }
    const g = o.g ?? 0, drag = o.drag ?? 2.5;
    const maxLife = Math.max(...ps.map((p) => p.life + p.d));
    return TL.add({
      t0, t1: t0 + maxLife, z: o.z ?? 50,
      draw(ctx, emi, t) {
        const X = typeof o.x === 'function' ? o.x(t0) : o.x, Y = typeof o.y === 'function' ? o.y(t0) : o.y;
        for (const p of ps) {
          const tt = t - t0 - p.d;
          if (tt < 0 || tt > p.life) continue;
          // exponential drag integrated analytically
          const f = drag > 0 ? (1 - Math.exp(-drag * tt)) / drag : tt;
          let x = X + p.ox + p.vx * f, y = Y + p.oy + p.vy * f + 0.5 * g * tt * tt;
          if (o.converge) { // particles flying INTO the point instead
            const k = 1 - tt / p.life;
            x = X + p.ox + p.vx * 0.5 * k; y = Y + p.oy + p.vy * 0.5 * k;
          }
          const life = 1 - tt / p.life;
          const s = Math.max(1, Math.round(p.s * (o.shrink ? life + 0.3 : 1)));
          ctx.globalAlpha = o.fade === false ? 1 : Math.min(1, life * 2);
          ctx.fillStyle = p.c;
          ctx.fillRect(Math.round(x), Math.round(y), s, s);
          if (o.glow !== false) {
            emi.globalAlpha = ctx.globalAlpha * (o.glow ?? 0.8);
            emi.fillStyle = p.c;
            emi.fillRect(Math.round(x) - 1, Math.round(y) - 1, s + 2, s + 2);
          }
        }
        ctx.globalAlpha = 1; emi.globalAlpha = 1;
      },
    });
  };

  // expanding pixel ring
  TL.ring = (t0, x, y, o = {}) =>
    TL.add({
      t0, t1: t0 + (o.dur || 0.35), z: o.z ?? 45,
      draw(ctx, emi, t) {
        const u = (t - t0) / (o.dur || 0.35), e = U.eOutExpo(u);
        const X = typeof x === 'function' ? x(t0) : x, Y = typeof y === 'function' ? y(t0) : y;
        const r = U.lerp(o.r0 || 2, o.r1 || 30, e);
        const w = Math.max(1, Math.round((o.w || 3) * (1 - u)));
        MV.D.pixelRing(ctx, X, Y, r, w, o.color || '#fff', 1 - u * 0.6);
        if (o.glow !== false) MV.D.pixelRing(emi, X, Y, r, w + 2, o.color || '#fff', (1 - u) * 0.9);
      },
    });
})();
