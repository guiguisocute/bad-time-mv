// Choreography toolkit. Every attack / camera move is scheduled on the music
// grid (T.at(bar, beat, sixteenth)); sections live in src/tl_*.js.
(function () {
  const MV = window.MV, U = MV.U, D = MV.D, T = MV.T, TL = MV.TL, L = MV.LAYOUT;
  const { Track, Steps } = MV;
  const R = Math.round;

  // ---------------------------------------------------------------- tracks
  TL.cam = new Track({ x: 480, y: 270, zoom: 1, roll: 0, pitch: 0, yaw: 0 });
  TL.box = new Track(Object.assign({ draw: 0, alpha: 1, fill: 1, th: 5, glow: 1 }, L.box));
  TL.soul = new Track({ x: 480, y: 344, rot: 0, sc: 1, sq: 1, a: 0 });
  TL.soulCol = new Steps('red');
  TL.aura = new Track({ v: 0 });
  TL.enemy = new Track({ x: L.enemy[0], y: L.enemy[1], a: 0, reveal: 0, sway: 1, ghost: 0, handGlow: 0, eyeFire: 0 });
  TL.head = new Steps('Default'); // Default LookLeft Wink ClosedEyes NoEyes BlueEye Tired1 Tired2
  TL.body = new Steps('idle'); // idle | HandDown HandUp HandLeft HandRight (swing plays when set)
  TL.torso = new Steps('Default'); // Default | Shrug
  TL.sweat = new Steps(0);
  TL.hud = new Track({ a: 1, nameA: 0, lvA: 0, barA: 0, hp: 92, kr: 0, jit: 0, barDy: 0 });
  TL.btn = [0, 1, 2, 3].map(() => new Track({ a: 0, sel: 0, dx: 0, dy: 0 }));
  TL.btnState = [0, 1, 2, 3].map(() => new Steps('ok'));
  TL.hpState = new Steps('ok');
  TL.post = new Track({ bloom: 1, vig: 0.35, desat: 0, tint: 0, tintAmt: 0, grid: 0.12, scan: 0.05, letter: 0, bg: 1, bgHue: 0, ca: 0.6, glitch: 0 });
  TL.boxHits = [];
  TL.cracks = [];
  TL.hudDetach = {};

  // sections register builders; they run after the assets are loaded
  MV.sections = [];
  MV.buildTimeline = () => MV.sections.forEach((f) => f());

  // ---------------------------------------------------------------- sound effects
  // {t, name, vol}: played live through WebAudio and mixed into the export
  TL.sfx = [];
  const sfxLast = {};
  const H = (MV.H = {});
  H.sfx = (t, name, vol = 1) => {
    // limiter: one trigger of the same sound per 40 ms
    const k = name + Math.round(t / 0.04);
    if (sfxLast[k]) { sfxLast[k].vol = Math.max(sfxLast[k].vol, vol); return; }
    TL.sfx.push((sfxLast[k] = { t: +t.toFixed(4), name, vol }));
  };
  const at = (H.at = T.at);
  H.S16 = T.s16; H.BEAT = T.beat; H.BAR = T.bar;
  H.RIFF = [0, 1, 2, 4, 7, 9, 11, 13, 14, 15];
  H.RIFF_H = [0, 0, 12, 7, 6, 5, 3, 0, 3, 5]; // riff contour in semitones
  H.ROOTS = [0, -2, -3, -4]; // D, C, B, Bb
  H.riffTimes = (bar) => H.RIFF.map((s) => at(bar, 0, s));
  H.boxAt = (t) => TL.box.at(t);
  H.soulAt = (t) => TL.soul.at(t);
  H.center = (t) => { const b = TL.box.at(t); return [b.x + b.w / 2, b.y + b.h / 2]; };
  H.C0 = [L.box.x + L.box.w / 2, L.box.y + L.box.h / 2];

  // ---------------------------------------------------------------- camera helpers
  H.cam = (t0, t1, v, ease = 'inOut') => TL.cam.to(t0, t1, v, ease);
  H.cut = (t, v) => TL.cam.set(t, v);
  H.punch = (t, k = 1, o = {}) => TL.impact(t, Object.assign({ amp: 3 * k, zoom: 0.035 * k, ca: 1.6 * k, dur: 0.25 }, o));
  H.hit = (t, k = 1, o = {}) => TL.impact(t, Object.assign({ amp: 9 * k, zoom: 0.06 * k, ca: 5 * k, flash: 0.22 * k, dur: 0.45 }, o));
  H.bigHit = (t, o = {}) => TL.impact(t, Object.assign({ amp: 18, zoom: 0.12, ca: 14, flash: 0.9, inv: 0.05, bw: 0.034, rot: 0.03, dur: 0.7 }, o));

  // ---------------------------------------------------------------- soul helpers
  H.soulTo = (t0, t1, x, y, ease = 'outExpo', extra = {}) => TL.soul.to(t0, t1, Object.assign({ x, y }, extra), ease);
  // fast dash with a spin and a puff of pixels where it left
  H.dash = (t, x, y, dur = T.s16 * 1.5, spin = 0) => {
    const p = TL.soul.at(t);
    TL.soul.to(t, t + dur, { x, y, rot: p.rot + spin }, 'outExpo');
    if (spin) TL.soul.set(t + dur + 0.001, { rot: 0 });
    TL.burst(t, { x: p.x, y: p.y, n: 8, speed: [30, 90], life: [0.15, 0.35], colors: ['#ff4050', '#ffffff'], z: 30, size: 2 });
  };

  // ---------------------------------------------------------------- bones
  // generic bone; geo(t) -> {x, y, ang, len, w?, a?} in world space
  H.bone = (o) =>
    TL.add({
      t0: o.t0, t1: o.t1, z: o.z ?? 5, clip: o.clip === undefined ? 'box' : o.clip, kind: o.blue ? 'blue' : 'white', geo: o.geo,
      draw(ctx, emi, t) {
        const g = o.geo(t);
        if (!g || g.len < 1) return;
        D.bone(ctx, emi, g.x, g.y, g.ang, g.len, { w: g.w ?? o.w ?? 10, blue: o.blue, color: o.color, t, seed: o.t0 * 7, alpha: g.a, glow: o.glow ?? (o.blue ? 1 : 0.5) });
      },
      hit(t, px, py) {
        const g = o.geo(t);
        return !!g && g.len > 2 && (g.a ?? 1) > 0.5 && D.boneHit(g.x, g.y, g.ang, g.len, g.w ?? o.w ?? 10, px, py, 5);
      },
    });

  const SIDE = {
    bottom: { ang: -Math.PI / 2, base: (b, u) => [b.x + u * b.w, b.y + b.h], span: (b) => b.w, depth: (b) => b.h },
    top: { ang: Math.PI / 2, base: (b, u) => [b.x + u * b.w, b.y], span: (b) => b.w, depth: (b) => b.h },
    left: { ang: 0, base: (b, u) => [b.x, b.y + u * b.h], span: (b) => b.h, depth: (b) => b.w },
    right: { ang: Math.PI, base: (b, u) => [b.x + b.w, b.y + u * b.h], span: (b) => b.h, depth: (b) => b.w },
  };
  H.SIDE = SIDE;

  // warning rectangle along a wall (inside the box)
  H.warn = (t0, t1, side, u0, u1, depth, color) =>
    TL.add({
      t0, t1, z: 2, clip: 'box',
      draw(ctx, emi, t) {
        const b = TL.box.at(t), S = SIDE[side];
        const [x0, y0] = S.base(b, u0), [x1, y1] = S.base(b, u1);
        const d = typeof depth === 'number' ? depth : depth(b);
        let x, y, w, h;
        if (side === 'bottom') { x = x0; w = x1 - x0; y = b.y + b.h - d; h = d; }
        else if (side === 'top') { x = x0; w = x1 - x0; y = b.y; h = d; }
        else if (side === 'left') { y = y0; h = y1 - y0; x = b.x; w = d; }
        else { y = y0; h = y1 - y0; x = b.x + b.w - d; w = d; }
        D.warn(ctx, emi, x, y, w, h, t, color);
      },
    });

  // bone erupting from a wall. u = position along wall (0..1), len = reach into the box.
  // tHit = fully extended, tOut = start retracting, t1 = gone. rise = extension time.
  H.spike = (o) => {
    const side = o.side || 'bottom', S = SIDE[side];
    const rise = o.rise ?? 0.06, fall = o.fall ?? 0.08;
    const t0 = o.tHit - rise, t1 = o.t1 ?? (o.tOut ?? o.tHit + 0.3) + fall, tOut = o.tOut ?? t1 - fall;
    if (o.warn) H.warn(o.tHit - o.warn, t0, side, o.u - 0.035, o.u + 0.035, o.len, o.blue ? '#2aa8ff' : undefined);
    if (o.sfx !== false) H.sfx(t0, 'BoneStab', o.sfx ?? 0.35);
    if (o.puff !== false)
      TL.burst(t0 + rise * 0.6, {
        x: () => S.base(TL.box.at(t0), o.u)[0], y: () => S.base(TL.box.at(t0), o.u)[1],
        n: 6, speed: [40, 120], ang: [S.ang - 0.9, S.ang + 0.9], life: [0.12, 0.3], colors: o.blue ? ['#6cc8ff', '#ffffff'] : ['#ffffff', '#c9cede'], z: 8, size: 2,
      });
    return H.bone({
      t0, t1, blue: o.blue, w: o.w, clip: o.clip, z: o.z,
      geo(t) {
        const b = TL.box.at(t);
        const k = t < o.tHit ? MV.EASE.outExpo((t - t0) / rise) : t < tOut ? 1 : 1 - MV.EASE.in((t - tOut) / fall);
        const [x, y] = S.base(b, o.u);
        const L2 = (typeof o.len === 'function' ? o.len(b) : o.len) + 8;
        // bone base sits outside the wall; slide it in along its axis
        const ca = Math.cos(S.ang), sa = Math.sin(S.ang);
        const bx = x - ca * L2, by = y - sa * L2;
        return { x: bx + ca * L2 * k, y: by + sa * L2 * k, ang: S.ang, len: L2, w: o.w };
      },
    });
  };

  // a row of spikes along a wall with gaps (gaps: [[u0,u1],...])
  H.spikeRow = (o) => {
    const n = o.n || 10, out = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      if ((o.gaps || []).some(([a, b]) => u > a && u < b)) continue;
      out.push(H.spike(Object.assign({}, o, { u, tHit: o.tHit + (o.stagger || 0) * i, puff: i % 2 === 0 })));
    }
    return out;
  };

  // bone standing on a wall, sliding along it. side = wall it stands on.
  // dir = +1 moves toward +x / +y. tc = time it crosses position u=uc (default: at soul x/y)
  H.slide = (o) => {
    const side = o.side || 'bottom', S = SIDE[side];
    const speed = o.speed || 420; // px/s
    const horiz = side === 'bottom' || side === 'top';
    const dir = o.dir ?? -1;
    // position along the wall (px from the wall start) as a function of time
    const cross = o.cross; // world coordinate (x for horiz walls) crossed at time tc
    const tc = o.tc;
    const b0 = TL.box.at(tc);
    const span = horiz ? b0.w : b0.h;
    const start = horiz ? b0.x : b0.y;
    const pc = cross - start;
    const t0 = tc - (dir > 0 ? pc + 30 : span - pc + 30) / speed;
    const t1 = tc + (dir > 0 ? span - pc + 30 : pc + 30) / speed;
    return H.bone({
      t0, t1, blue: o.blue, w: o.w, z: o.z,
      geo(t) {
        const b = TL.box.at(t);
        const p = pc + dir * speed * (t - tc);
        const u = p / (horiz ? b.w : b.h);
        const [x, y] = S.base(b, u);
        const L2 = (typeof o.len === 'function' ? o.len(t, b) : o.len) + 6;
        const ca = Math.cos(S.ang), sa = Math.sin(S.ang);
        return { x: x - ca * 6, y: y - sa * 6, ang: S.ang, len: L2, w: o.w };
      },
    });
  };

  // wall of bones with a gap, sliding horizontally across the box
  H.gapWall = (o) => {
    const b = TL.box.at(o.tc);
    const gy = o.gapY, gh = o.gap || 44;
    const top = gy - gh / 2 - b.y, bot = b.y + b.h - (gy + gh / 2);
    const r = [];
    if (top > 4) r.push(H.slide(Object.assign({}, o, { side: 'top', len: top })));
    if (bot > 4) r.push(H.slide(Object.assign({}, o, { side: 'bottom', len: bot })));
    return r;
  };

  // free-flying bone along a path; path(t) -> {x,y,ang} centre, len
  H.fly = (o) =>
    H.bone({
      t0: o.t0, t1: o.t1, blue: o.blue, w: o.w, clip: o.clip ?? null, z: o.z ?? 20,
      geo(t) {
        const p = o.path(t);
        if (!p) return null;
        const len = p.len ?? o.len;
        return { x: p.x - Math.cos(p.ang) * len / 2, y: p.y - Math.sin(p.ang) * len / 2, ang: p.ang, len, w: p.w ?? o.w, a: p.a };
      },
    });

  // ---------------------------------------------------------------- skull cannons
  // o: tSpawn, fires: [t...] (or tFire), tEnd, pos(t) -> {x,y,ang}, scale, beamW, beamDur, col, seed
  H.cannon = (o) => {
    const sc = o.scale || 2, bw = o.beamW || 22 * sc;
    const fires = (o.fires || [o.tFire]).slice().sort((a, b) => a - b);
    const dur = o.beamDur ?? T.beat * 0.8;
    const last = fires[fires.length - 1];
    const tEnd = o.tEnd ?? last + dur + 0.4;
    const seed = o.seed ?? o.tSpawn * 13;
    const fireAt = (t) => { let f = null; for (const x of fires) if (t >= x) f = x; return f; };
    const nextFire = (t) => fires.find((x) => x > t) ?? null;
    const pose = (t) => {
      const p = o.pos(t);
      const f = fireAt(t);
      let k = f !== null ? Math.exp(-(t - f) * 10) * 10 * sc * 0.6 : 0;
      if (t > last + dur) k += (t - last - dur) ** 2 * 1400; // flies off backwards
      return { x: p.x - Math.cos(p.ang) * k, y: p.y - Math.sin(p.ang) * k, ang: p.ang };
    };
    // glitch tear on arrival
    TL.add({
      t0: o.tSpawn - 0.08, t1: o.tSpawn + 0.16, z: 38,
      draw(ctx, emi, t) {
        const p = o.pos(o.tSpawn);
        const k = 1 - Math.abs((t - o.tSpawn) / 0.12);
        const rnd = U.rng(Math.floor(t * 60) + seed);
        for (let i = 0; i < 14; i++) {
          const w = 8 + rnd() * 50 * sc / 2, h = 2 + rnd() * 6;
          const x = p.x + (rnd() - 0.5) * 70 * sc / 2, y = p.y + (rnd() - 0.5) * 80 * sc / 2;
          D.rect(ctx, x, y, w, h, rnd() > 0.5 ? '#ffffff' : '#000000', U.clamp(k));
          if (emi && rnd() > 0.6) D.rect(emi, x, y, w, h, '#9ff0ff', U.clamp(k) * 0.6);
        }
      },
    });
    for (const f of fires) {
      if (o.chargeFx !== false)
        TL.burst(f - Math.min(0.45, f - o.tSpawn), {
          x: () => D.mouth(pose(f - 0.01).x, pose(f - 0.01).y, pose(f - 0.01).ang, sc)[0],
          y: () => D.mouth(pose(f - 0.01).x, pose(f - 0.01).y, pose(f - 0.01).ang, sc)[1],
          n: 14, converge: true, speed: [80 * sc / 2, 160 * sc / 2], life: [0.25, Math.min(0.45, f - o.tSpawn)], colors: [o.col || '#9ff0ff', '#ffffff'], z: 39, size: 2,
        });
      const pf = o.pos(f);
      const hk = o.shake ?? 0.8 * Math.min(2.2, sc / 2);
      H.hit(f, hk, { dx: -Math.cos(pf.ang) * 0.6, dy: -Math.sin(pf.ang) * 0.6, flash: Math.min(0.14, 0.1 * hk) });
      if (o.sfx !== false) H.sfx(f, sc > 3 ? 'GasterBlast2' : 'GasterBlast', o.vol ?? 0.45);
    }
    if (o.sfx !== false) H.sfx(o.tSpawn, 'GasterBlaster', (o.vol ?? 0.45) * 0.9);
    return TL.add({
      t0: o.tSpawn, t1: tEnd, z: o.z ?? 36, kind: 'beam',
      draw(ctx, emi, t) {
        const p = pose(t);
        const intro = U.clamp((t - o.tSpawn) / 0.12);
        const f = fireAt(t), nf = nextFire(t);
        const prevEnd = f !== null ? f + dur : o.tSpawn;
        // charge ramps up toward the next shot, mouth snaps open just before it
        const charge = nf !== null ? U.clamp((t - Math.max(o.tSpawn, prevEnd)) / Math.max(0.05, nf - Math.max(o.tSpawn, prevEnd) - 0.04)) : 0;
        let open = 0;
        if (nf !== null && t > nf - 0.07) open = U.clamp((t - nf + 0.07) / 0.07);
        if (f !== null) { const bt = t - f; open = Math.max(open, bt < dur ? 1 : U.clamp(1 - (bt - dur) / 0.2)); }
        const fade = t > last + dur ? U.clamp(1 - (t - last - dur) / 0.4) : 1;
        D.cannon(ctx, emi, p.x, p.y, p.ang, { open, charge: Math.max(charge, f !== null && t - f < dur ? 1 : 0), scale: sc, alpha: fade, col: o.col, glitch: intro < 1 ? 1 - intro : 0, seed, t });
        if (f !== null) {
          const bt = t - f;
          const w = bt < 0.05 ? U.lerp(bw * 0.3, bw * 1.1, bt / 0.05) : bt < dur ? bw * (1 + 0.06 * Math.sin(bt * 60)) : bw * Math.max(0, 1 - (bt - dur) / (o.fall ?? 0.18));
          if (w > 0.5) {
            const [mx, my] = D.mouth(p.x, p.y, p.ang, sc);
            D.beam(ctx, emi, mx, my, p.ang, { w, t, col: o.col });
            if (bt < dur && Math.floor(t * 60) % 2 === 0) {
              const rnd = U.rng(Math.floor(t * 60) + seed);
              for (let i = 0; i < 6; i++) {
                const d = rnd() * 700, side = (rnd() > 0.5 ? 1 : -1) * (w / 2 + rnd() * 12);
                const ex = mx + Math.cos(p.ang) * d - Math.sin(p.ang) * side, ey = my + Math.sin(p.ang) * d + Math.cos(p.ang) * side;
                D.rect(ctx, ex, ey, 2, 2, '#ffffff', 0.9);
                D.rect(emi, ex - 2, ey - 2, 6, 6, o.col || '#7fe8ff', 0.8);
              }
            }
          }
        }
      },
      hit(t, px, py) {
        const f = fireAt(t);
        if (f === null || t > f + dur) return false;
        const p = pose(t);
        const [mx, my] = D.mouth(p.x, p.y, p.ang, sc);
        return D.beamHit(mx, my, p.ang, bw, px, py, 5);
      },
    });
  };
  // cannon helper aiming from (x, y) toward (tx, ty), flying in from outside
  H.cannonAim = (o) => {
    const ang = Math.atan2(o.ty - o.y, o.tx - o.x);
    const fromD = o.from ?? 140;
    return H.cannon(Object.assign({}, o, {
      pos: (t) => {
        const k = MV.EASE.outExpo(U.clamp((t - o.tSpawn + 0.1) / 0.25));
        const a2 = ang + (o.spinIn ?? 0) * (1 - k);
        return { x: o.x - Math.cos(ang) * fromD * (1 - k), y: o.y - Math.sin(ang) * fromD * (1 - k), ang: a2 };
      },
    }));
  };

  // blue-soul hop between two points: quick rise, a hang at the apex, then a falling drop
  H.hopUT = (t0, dur, x0, y0, x1, y1, apex = 34) => {
    const top = Math.min(y0, y1) - apex;
    TL.soul.to(t0, t0 + dur, { x: x1 }, 'lin');
    TL.soul.to(t0, t0 + dur * 0.34, { y: top, sq: 1.25 }, 'out2');
    TL.soul.to(t0 + dur * 0.34, t0 + dur * 0.56, { y: top + 2, sq: 1 }, 'lin');
    TL.soul.to(t0 + dur * 0.56, t0 + dur, { y: y1, sq: 1.2 }, 'in2');
    TL.soul.set(t0 + dur + 0.0005, { sq: 0.65 });
    TL.soul.to(t0 + dur + 0.0006, t0 + dur + 0.1, { sq: 1 }, 'out');
  };

  // ---------------------------------------------------------------- box helpers
  H.box = (t0, t1, v, ease = 'outBack') => TL.box.to(t0, t1, v, ease);
  H.boxHit = (t, side, u, amt = 10) => TL.boxHits.push({ t, side, u, amt });
  H.crack = (t0, t1, side, u, s = 1) => TL.cracks.push({ t0, t1, side, u, s, seed: R(t0 * 100) });

  // ---------------------------------------------------------------- text
  // typed text: chars revealed at times[i] (or evenly on a 16th grid)
  H.say = (t0, t1, str, o = {}) => {
    const chars = [...str];
    const step = o.step ?? T.s16;
    const times = o.times || chars.map((_, i) => t0 + i * step);
    if (o.sfx !== false) times.forEach((tt, i) => chars[i] !== ' ' && H.sfx(tt, o.voice || 'BattleText', o.vol ?? 0.3));
    return TL.add({
      t0, t1, z: o.z ?? 30, screen: o.screen,
      draw(ctx, emi, t) {
        let n = 0;
        for (const tt of times) if (t >= tt) n++;
        n = Math.min(n, chars.length);
        const b = TL.box.at(t);
        const x = typeof o.x === 'function' ? o.x(t, b) : o.x ?? b.x + 22;
        const y = typeof o.y === 'function' ? o.y(t, b) : o.y ?? b.y + 18;
        const fo = o.fadeOut ?? 0.12, fade = t > t1 - fo ? (t1 - t) / fo : 1;
        if (o.panel) {
          const w = D.textWidth(str, o) + 40, pop = MV.EASE.outBack(U.clamp((t - t0) / 0.12));
          ctx.globalAlpha = fade;
          ctx.fillStyle = '#000'; ctx.fillRect(x - 20, y - 14, w * pop, 16 * (o.scale || 2) + 28);
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - 20, y - 14, w * pop, 4); ctx.fillRect(x - 20, y + 16 * (o.scale || 2) + 10, w * pop, 4);
          ctx.fillRect(x - 20, y - 14, 4, 16 * (o.scale || 2) + 28); ctx.fillRect(x - 20 + w * pop - 4, y - 14, 4, 16 * (o.scale || 2) + 28);
          ctx.globalAlpha = 1;
        }
        D.text(ctx, chars.slice(0, n).join(''), x, y, { color: o.color || '#ffffff', scale: o.scale || 2, alpha: fade, glow: o.glow ? emi : null, shake: o.shake, seed: t * 30 });
      },
    });
  };
  // big grey "MISS" popping above the enemy
  H.miss = (t, x, y, o = {}) =>
    TL.add({
      t0: t, t1: t + (o.dur || 1.0), z: 60,
      draw(ctx, emi, tt) {
        const u = tt - t;
        const pop = U.eOutBack(U.clamp(u / 0.12));
        const yy = y - 18 * U.eOut(U.clamp(u / 0.3)) + Math.max(0, Math.sin(u * 14) * 6 * Math.exp(-u * 5));
        const sc = Math.max(0.2, pop);
        const fade = u > (o.dur || 1.0) - 0.2 ? ((o.dur || 1.0) - u) / 0.2 : 1;
        ctx.save(); ctx.translate(R(x), R(yy)); ctx.scale(sc * (o.scale || 1), sc * (o.scale || 1));
        D.dmg(ctx, 'MISS', 0, -16, { scale: 1, color: o.color || '#c0c0c0', align: 'center', alpha: fade, glow: null });
        ctx.restore();
      },
    });
  // flash ring + button prompt when the soul recovers from a slam
  // ukemi: the soul kicks off the wall — a crisp pixel shock ring and a puff
  H.ukemi = (t, x, y, nx = 0, ny = -1) => {
    TL.ring(t, x, y, { r0: 3, r1: 26, dur: 0.22, color: '#9fc4ff', w: 2 });
    TL.burst(t, { x, y, n: 10, speed: [60, 160], ang: [Math.atan2(ny, nx) - 1.1, Math.atan2(ny, nx) + 1.1], life: [0.12, 0.28], colors: ['#ffffff', '#6fa0ff'], size: 2, z: 44 });
  };
})();

// ---------------------------------------------------------------- set-piece helpers
(function () {
  const MV = window.MV, U = MV.U, D = MV.D, T = MV.T, TL = MV.TL, H = MV.H, L = MV.LAYOUT;
  const R = Math.round;
  TL.boxGaps = [];
  H.gap = (t0, t1, side, u0, u1) => TL.boxGaps.push({ t0, t1, side, u0, u1 });

  // ---------------------------------------------------------------- BLUE SOUL physics
  // Modelled on the c2-sans-fight simulator (Battle.xml):
  //  * SansSlam: the heart instantly gets MaxFallSpeed (750 px/s) toward a wall
  //    and gravity now points at that wall; it hits and sticks — no bounce.
  //  * gravity depends on the speed against it (floaty apex, then a fast fall):
  //    >=240: 180, 15..240: 540, -30..15: 180, -120..-30: 450, below: 180; fall cap 750.
  //  * jump = 180 px/s against gravity (we use a held jump of 210).
  //  * BoneStab: a red warning along the slammed wall, then bones stab out for 0.33 s;
  //    the heart has to be in the air.
  // The simulation runs at build time and is baked into the soul track.
  const WALL = { down: 'bottom', up: 'top', left: 'left', right: 'right' };
  const BODY = { down: 'HandDown', up: 'HandUp', left: 'HandLeft', right: 'HandRight' };
  const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  const ROTS = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };
  const SLAM = 900, MAXFALL = 750, JUMP = 210, RAD = 8;
  H.ROTS = ROTS;
  const gravityFor = (ds) => (ds >= 240 ? 180 : ds > 15 ? 540 : ds > -30 ? 180 : ds > -120 ? 450 : 180);
  // effects of one slam at time t into wall `dir`, impact point (x, y)
  const slamFx = (t, dir, x, y, o) => {
    const side = WALL[dir], b = TL.box.at(t), k = DIRV[dir];
    const u = side === 'bottom' || side === 'top' ? (x - b.x) / b.w : (y - b.y) / b.h;
    H.boxHit(t, side, u, o.bulge ?? 16);
    H.crack(t, o.crackEnd ?? t + 1.2, side, u, 1);
    TL.impact(t, { amp: o.shake ?? 12, dx: k[0], dy: k[1], zoom: 0.05, ca: 6, flash: 0.1, inv: o.inv ?? 0, bw: o.inv ?? 0, dur: 0.4 });
    H.sfx(t, 'Slam', o.vol ?? 0.6);
    TL.burst(t, { x: x + k[0] * RAD, y: y + k[1] * RAD, n: 22, speed: [80, 280], ang: [Math.atan2(-k[1], -k[0]) - 1.3, Math.atan2(-k[1], -k[0]) + 1.3], life: [0.18, 0.45], colors: ['#ffffff', '#6fa0ff'], size: [2, 3], z: 44 });
    TL.ring(t, x + k[0] * RAD, y + k[1] * RAD, { r0: 3, r1: 30, dur: 0.25, color: '#9fc4ff', w: 2 });
    if (o.stab) {
      // warning box along the whole wall, then the bones stab out on the next beat
      const tS = o.stabAt ?? t + T.beat, len = o.len ?? 18;
      H.warn(t + 0.06, tS - 0.04, side, 0.02, 0.98, len + 8);
      H.sfx(t + 0.06, 'Warning', 0.25);
      H.spikeRow({ side, n: o.n ?? 8, len, w: 10, tHit: tS, rise: 0.04, tOut: tS + 0.33, fall: 0.05, sfx: 0.45 });
    }
  };
  // H.gravity(t0, t1, {dir, slams: [[t, dir, opts]...], jumps: [[t, drift]...], impact: 'up'})
  //   slam opts: {stab (bones on the next beat, the heart jumps an eighth before), len, n, idleAfter, vol, shake}
  H.gravity = (t0, t1, o) => {
    const dt = 1 / 480, every = 2; // integrate at 480 Hz, bake at 240 Hz
    const start = TL.soul.at(t0);
    let p = [start.x, start.y], v = [0, 0], g = DIRV[o.dir || 'down'];
    let grounded = false, sqImp = 0, sqJump = 0;
    const slams = (o.slams || []).map(([t, dir, so = {}]) => ({ t, dir, o: so })).sort((a, b) => a.t - b.t);
    const jumps = (o.jumps || []).map(([t, drift = 0]) => ({ t, drift }));
    for (const s of slams) if (s.o.stab) jumps.push({ t: (s.o.stabAt ?? s.t + T.beat) - T.beat / 2, drift: s.o.drift ?? 0 });
    jumps.sort((a, b) => a.t - b.t);
    let si = 0, ji = 0, fly = null, drift = 0;
    const X = [], Y = [], SQ = [];
    const wallPos = (b, dir) => (dir === 'left' ? b.x + RAD : dir === 'right' ? b.x + b.w - RAD : dir === 'up' ? b.y + RAD : b.y + b.h - RAD);
    if (o.impact) { g = DIRV[o.impact]; grounded = true; }
    const n = Math.round((t1 - t0) / dt);
    for (let i = 0; i <= n; i++) {
      const t = t0 + i * dt;
      const b = TL.box.at(t);
      const ax = (k) => (k[0] ? 0 : 1);
      // ---- slam launch: constant high speed, timed so the impact lands on s.t
      if (!fly && si < slams.length) {
        const s = slams[si], k = DIRV[s.dir], a = ax(k);
        const wall = wallPos(b, s.dir), dist = (wall - p[a]) * k[a];
        const left = s.t - t;
        const lift = dist < 20 ? 34 : 0;
        const spd = s.o.speed || SLAM;
        const need = (dist + lift * 2) / spd + (lift ? 0.06 : 0);
        if (left <= need + 1e-9 || left <= 0) {
          fly = { s, k, a, wall, t0: t, lift, from: p[a], T: Math.max(left, 1e-3) };
          g = k; grounded = false;
          TL.body.set(t - 0.14, BODY[s.dir]);
          if (s.o.idleAfter !== false) TL.body.set(s.t + 0.4, 'idle');
          TL.enemy.to(t - 0.14, t, { handGlow: 0.9 }, 'out');
          TL.enemy.to(s.t, s.t + 0.4, { handGlow: 0.3 }, 'out');
          // the heart's point snaps toward the new gravity, tumbling once
          const cur = TL.soul.at(t).rot;
          let target = ROTS[s.dir];
          while (target - cur > Math.PI) target -= U.TAU;
          while (target - cur < -Math.PI) target += U.TAU;
          TL.soul.to(t, t + Math.min(0.12, fly.T), { rot: target + (target >= cur ? U.TAU : -U.TAU) }, 'out');
          TL.soul.set(t + Math.min(0.12, fly.T) + 0.0005, { rot: ROTS[s.dir] });
        }
      }
      if (fly) {
        const f = fly, u = (t - f.t0) / f.T, dir = f.k[f.a];
        let pos;
        if (u >= 1) {
          p[f.a] = f.wall; v = [0, 0]; grounded = true; sqImp = 1;
          slamFx(f.s.t, f.s.dir, p[0], p[1], f.s.o);
          fly = null; si++;
        } else {
          if (f.lift) { // resting on that very wall: yank off it first
            const lu = 0.06 / f.T;
            pos = u < lu ? f.from - dir * f.lift * MV.EASE.out(u / lu) : U.lerp(f.from - dir * f.lift, f.wall, (u - lu) / (1 - lu));
          } else pos = U.lerp(f.from, f.wall, u);
          v = [0, 0]; v[f.a] = dir * (f.s.o.speed || SLAM);
          p[f.a] = pos;
        }
      } else {
        // ---- jump
        if (ji < jumps.length && t >= jumps[ji].t) {
          if (grounded) { v[0] -= g[0] * JUMP; v[1] -= g[1] * JUMP; grounded = false; sqJump = 1; drift = jumps[ji].drift; }
          ji++;
        }
        if (!grounded) {
          const ds = -(v[0] * g[0] + v[1] * g[1]); // speed against gravity
          const G = gravityFor(ds);
          v[0] += g[0] * G * dt; v[1] += g[1] * G * dt;
          const along = v[0] * g[0] + v[1] * g[1];
          if (along > MAXFALL) { v[0] -= g[0] * (along - MAXFALL); v[1] -= g[1] * (along - MAXFALL); }
          // sideways drift while airborne
          const tx = [Math.abs(g[1]), Math.abs(g[0])];
          p[0] += tx[0] * drift * dt; p[1] += tx[1] * drift * dt;
          p[0] += v[0] * dt; p[1] += v[1] * dt;
        }
        // walls: land on the gravity wall, slide along the others
        const walls = [[0, b.x + RAD, -1], [0, b.x + b.w - RAD, 1], [1, b.y + RAD, -1], [1, b.y + b.h - RAD, 1]];
        for (const [a, lim, sgn] of walls) {
          if ((p[a] - lim) * sgn < 0) continue;
          p[a] = lim;
          if (v[a] * sgn > 0) { if (g[a] === sgn) { if (!grounded) sqImp = Math.max(sqImp, 0.5); grounded = true; drift = 0; } v[a] = 0; }
        }
      }
      // squash & stretch: stretched in flight, squashed on landing, a little stretch on take-off
      sqImp *= Math.exp(-dt * 26); sqJump *= Math.exp(-dt * 14);
      const sq = fly ? 1 + 0.5 * Math.min(1, (fly.s.o.speed || SLAM) / SLAM) : (1 + 0.25 * sqJump) * (1 - 0.45 * sqImp);
      if (i % every === 0) { X.push(+p[0].toFixed(2)); Y.push(+p[1].toFixed(2)); SQ.push(+sq.toFixed(3)); }
    }
    TL.soul.bake(t0, dt * every, { x: X, y: Y, sq: SQ });
    TL.soul.set(t1 + 0.0001, { x: X[X.length - 1], y: Y[Y.length - 1], sq: 1 });
  };

  // Shatter: snapshot draw(ctx) inside rect at t0, then blow it apart into chunks.
  H.shatter = (t0, rect, draw, o = {}) => {
    let snap = null;
    const cs = o.chunk || 6;
    const rnd = U.rng(R(t0 * 1000));
    const pieces = [];
    for (let y = 0; y < rect.h; y += cs)
      for (let x = 0; x < rect.w; x += cs) {
        const cx = rect.x + x + cs / 2, cy = rect.y + y + cs / 2;
        const ox = o.ox ?? rect.x + rect.w / 2, oy = o.oy ?? rect.y + rect.h / 2;
        const a = Math.atan2(cy - oy, cx - ox) + (rnd() - 0.5) * 0.8;
        const v = (o.force || 260) * (0.4 + rnd());
        pieces.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up ?? 120), vr: (rnd() - 0.5) * 20, d: rnd() * 0.04 });
      }
    const dur = o.dur || 1.4;
    H.sfx(t0, o.sound || 'HeartShatter', o.vol ?? 0.45);
    return TL.add({
      t0, t1: t0 + dur, z: o.z ?? 48,
      draw(ctx, emi, t) {
        if (!snap) {
          const [c, x] = D.tmp(R(rect.w) + 2, R(rect.h) + 2);
          x.translate(-R(rect.x), -R(rect.y));
          draw(x, null);
          snap = c;
        }
        const tt = t - t0;
        for (const p of pieces) {
          const q = Math.max(0, tt - p.d);
          const px = rect.x + p.x + p.vx * q, py = rect.y + p.y + p.vy * q + 700 * q * q;
          const a = U.clamp(1 - tt / dur) * (q > 0 ? 1 : 1);
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(R(px + cs / 2), R(py + cs / 2));
          ctx.rotate(p.vr * q);
          ctx.drawImage(snap, p.x, p.y, cs, cs, -cs / 2, -cs / 2, cs, cs);
          ctx.restore();
        }
        if (emi && tt < 0.3) { emi.globalAlpha = 0.22 * (1 - tt / 0.3); emi.fillStyle = o.glowCol || '#ffffff'; emi.fillRect(R(rect.x - 10), R(rect.y - 10), R(rect.w + 20), R(rect.h + 20)); emi.globalAlpha = 1; }
      },
    });
  };

  // Dissolve: pixels burn away (noise threshold) and float off as glowing embers
  H.dissolve = (t0, dur, rect, draw, o = {}) => {
    let snap = null, data = null;
    H.sfx(t0, o.sound || 'Flash', o.vol ?? 0.3);
    return TL.add({
      t0, t1: t0 + dur + 0.6, z: o.z ?? 48,
      draw(ctx, emi, t) {
        if (!snap) {
          const [c, x] = D.tmp(R(rect.w), R(rect.h));
          x.translate(-R(rect.x), -R(rect.y));
          draw(x, null);
          snap = c;
          data = x.getImageData(0, 0, c.width, c.height).data;
        }
        const u = (t - t0) / dur, W = snap.width, Hh = snap.height;
        const dirY = o.dir === 'down';
        for (let j = 0; j < Hh; j += 2)
          for (let i = 0; i < W; i += 2) {
            const k = (j * W + i) * 4;
            if (data[k + 3] < 10) continue;
            const th = U.hash2(i * 0.37, j * 0.61) * 0.7 + (dirY ? j / Hh : 1 - i / W) * 0.3;
            const col = `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`;
            if (u < th) { ctx.fillStyle = col; ctx.fillRect(rect.x + i, rect.y + j, 2, 2); continue; }
            const e = u - th; // ember age
            if (e > 0.5) continue;
            const ex = rect.x + i + e * (o.drift ?? 60) + Math.sin(e * 20 + i) * 3, ey = rect.y + j - e * (o.rise ?? 90);
            ctx.globalAlpha = 1 - e * 2;
            ctx.fillStyle = e < 0.1 ? '#ffffff' : o.ember || col;
            ctx.fillRect(R(ex), R(ey), 2, 2);
            if (emi) { emi.globalAlpha = (1 - e * 2) * 0.8; emi.fillStyle = o.ember || col; emi.fillRect(R(ex) - 1, R(ey) - 1, 4, 4); }
          }
        ctx.globalAlpha = 1; if (emi) emi.globalAlpha = 1;
      },
    });
  };

  // big red damage number (original damage font)
  H.damage = (t, x, y, str, o = {}) =>
    TL.add({
      t0: t, t1: t + (o.dur || 1.5), z: 61,
      draw(ctx, emi, tt) {
        const u = tt - t;
        const yy = y - Math.max(0, Math.sin(Math.min(u, 0.5) * Math.PI / 0.5)) * 18;
        const fade = u > (o.dur || 1.5) - 0.2 ? ((o.dur || 1.5) - u) / 0.2 : 1;
        ctx.save(); ctx.translate(R(x), R(yy)); ctx.scale(o.scale || 1, o.scale || 1);
        D.dmg(ctx, str, 0, -16, { color: o.color || '#ff2020', align: 'center', alpha: fade });
        ctx.restore();
        if (emi) { emi.globalAlpha = 0.4 * fade; emi.fillStyle = '#ff2020'; emi.fillRect(R(x - str.length * 17 * (o.scale || 1)), R(yy - 18), R(str.length * 34 * (o.scale || 1)), 36); emi.globalAlpha = 1; }
      },
    });

  // orbiting blaster: circles around (cx, cy) at radius rad, always aiming at the centre (+ aimOff)
  H.orbitCannon = (o) => {
    const ang = (t) => o.a0 + (t - o.tRef) * o.w;
    return H.cannon(Object.assign({}, o, {
      pos: (t) => {
        const a = ang(t);
        const k = MV.EASE.outExpo(U.clamp((t - o.tSpawn + 0.1) / 0.25));
        const rr = o.rad + (1 - k) * 120;
        return { x: o.cx + Math.cos(a) * rr, y: o.cy + Math.sin(a) * rr, ang: a + Math.PI + (o.aimOff || 0) };
      },
    }));
  };
})();
