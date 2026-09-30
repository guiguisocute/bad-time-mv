// Bars 48-55: Sans takes shortcuts around the arena, a side-scrolling platform
// run over a floor of bones (after the simulator's "platforms" attacks), and the
// HUD's own letters peeling off and flying at the soul.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const B0 = L.box, C0 = H.C0;
  const [ex, ey] = L.enemy;
  const R = Math.round;

  // ---------------------------------------------------------------- bars 48-49: shortcuts
  const t0 = at(48);
  H.bigHit(t0);
  TL.frameCuts.push(t0); // (portrait: the push onto his eye must not open up before the drop)
  H.sfx(t0, 'Slam', 0.6);
  TL.post.set(t0, { bloom: 1, vig: 0.4, bg: 1, ca: 0.6 });
  TL.head.set(t0, 'BlueEye');
  const spots = [[262, 360], [700, 330], [300, 210], [662, 214], [250, 400], [712, 396], [ex, ey], [ex, ey]];
  // the soul drifts on a slow loop unless it has to step out of a line of fire
  TL.soul.set(t0, { x: C0[0], y: C0[1], a: 1, rot: 0, sc: 1, sq: 1 });
  spots.forEach(([sx, sy], k) => {
    const tk = at(48, k);
    // blink out / in with a white slit and a streak between the two spots
    const prev = k ? spots[k - 1] : [ex, ey];
    TL.enemy.set(tk - 0.05, { a: 0 });
    TL.enemy.set(tk, { x: sx, y: sy, a: 1, ghost: 0 });
    TL.add({ t0: tk - 0.05, t1: tk + 0.1, z: 40, draw(ctx, emi, t) {
      const u = (t - tk + 0.05) / 0.15;
      const a = 1 - u;
      D.rect(ctx, prev[0] - 2, prev[1] - 150, 4, 150, '#ffffff', a);
      D.rect(ctx, sx - 3 + R(u * 3), sy - 150, 6 - R(u * 6), 150, '#9ff0ff', a);
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1] - 70); ctx.lineTo(sx, sy - 70); ctx.stroke(); ctx.globalAlpha = 1;
      if (emi) { D.rect(emi, sx - 8, sy - 150, 16, 150, '#9ff0ff', a * 0.8); }
    } });
    H.sfx(tk, 'Flash', 0.3);
    if (k < 6) { // (his last two swings throw the soul itself, below)
      TL.body.set(tk, sx < ex ? 'HandRight' : sx > ex ? 'HandLeft' : 'HandDown');
      TL.body.set(tk + 0.3, 'idle');
    }
    // whip-pan to frame him and the arena
    H.cam(tk - 0.02, tk + 0.07, { x: (sx + C0[0]) / 2, y: (sy - 60 + C0[1]) / 2 + 10, zoom: 1.35, roll: (k % 2 ? 0.06 : -0.06), pitch: 0.12, yaw: (sx - 480) / 1500 }, 'outExpo');
    const heart = TL.soul.at(tk);
    if (k === 6 || k === 7) return;
    if (k % 2 === 0) {
      // two blasters at his side lock onto the soul; it sidesteps just before they fire
      const ang = Math.atan2(heart.y - (sy - 60), heart.x - sx);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      for (const s of [-1, 1])
        H.cannon({ tSpawn: tk, fires: [tk + BEAT / 2], beamDur: 0.16, fall: 0.1, scale: 1.8, vol: 0.35,
          pos: () => ({ x: sx + nx * s * 26 + Math.cos(ang) * 30, y: sy - 60 + ny * s * 26 + Math.sin(ang) * 30, ang: Math.atan2(heart.y - (sy - 60 + ny * s * 26), heart.x - (sx + nx * s * 26)) }) });
      // step to whichever side (after clamping to the box) ends up furthest from the line of fire
      let best = null;
      for (const side of [1, -1]) for (const d of [56, 80]) {
        const cx = U.clamp(heart.x + nx * d * side, B0.x + 14, B0.x + B0.w - 14), cy = U.clamp(heart.y + ny * d * side, B0.y + 14, B0.y + B0.h - 14);
        const perp = Math.abs((cx - heart.x) * nx + (cy - heart.y) * ny);
        if (!best || perp > best[2]) best = [cx, cy, perp];
      }
      const [tx, ty] = best;
      TL.soul.to(tk + BEAT / 2 - 0.12, tk + BEAT / 2 - 0.04, { x: tx, y: ty }, 'outExpo');
    } else {
      // a fan of bone darts with a gap exactly where the soul stands still
      const ang = Math.atan2(heart.y - (sy - 60), heart.x - sx);
      const tf = tk + BEAT / 2;
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        const a = ang + i * 0.3;
        H.fly({ t0: tf - 0.05, t1: tf + 0.9, w: 10, len: 40, clip: null, z: 22,
          path: (t) => { const d = (t - tf) * 900 + 20; return { x: sx + Math.cos(a) * d, y: sy - 60 + Math.sin(a) * d, ang: a }; } });
      }
      H.sfx(tf, 'BoneStab', 0.4);
      H.punch(tf, 0.6);
    }
  });
  // back in the middle, he swings twice and the soul goes with his hand: it turns blue and is
  // slammed into the floor, then flung into the ceiling; the platforms catch it on the downbeat
  const tBlue = at(49, 2);
  TL.soulCol.set(tBlue, 'blue');
  TL.aura.to(tBlue, tBlue + 0.1, { v: 1 }, 'out');
  H.sfx(tBlue, 'Ding', 0.45);
  TL.ring(tBlue, () => TL.soul.at(tBlue).x, () => TL.soul.at(tBlue).y, { r0: 6, r1: 60, color: '#2a6bff', w: 3, dur: 0.35 });
  H.gravity(tBlue + 0.02, at(50) - 0.005, { dir: 'down', slams: [[at(49, 2, 1), 'down', {}], [at(49, 3, 1), 'up', { idleAfter: false }]] });
  TL.body.set(at(49, 3, 3), 'idle');

  // ---------------------------------------------------------------- bars 50-53: the platform gauntlet
  // four one-bar stages after the simulator's platform attacks: two conveyors running in
  // opposite directions (platforms3), blaster crossfire over the lanes (platformblaster), a
  // staircase that collapses behind the soul over a rising bed of bones (platforms2), and a
  // ride through columns of bones sliding up and down (platforms4)
  const tP = at(50);
  const PB = { x: 180, y: 244, w: 600, h: 170 }, floorY = PB.y + PB.h;
  H.box(tP, tP + 0.25, PB, 'outBack');
  TL.soulCol.set(tP, 'blue');
  TL.aura.to(tP, tP + 0.1, { v: 1 }, 'out');
  TL.head.set(tP, 'BlueEye');
  TL.enemy.to(tP, tP + 0.3, { handGlow: 0.3 }, 'out');
  H.sfx(tP, 'Ding', 0.5);
  // the bed of bones under everything; in bar 52 it rises after the soul
  const bedTip = (t) => floorY - 20 - 52 * U.eInOut(U.clamp((t - at(52)) / (at(53) - at(52))));
  TL.add({
    t0: tP, t1: at(54), z: 4, clip: 'box', kind: 'white',
    draw(ctx, emi, t) {
      const off = ((t - tP) * 260) % 22, len = floorY + 2 - bedTip(t);
      for (let x = PB.x - 22; x < PB.x + PB.w + 22; x += 22) D.bone(ctx, emi, R(x - off), floorY + 2, -Math.PI / 2, len, { w: 10, glow: 0.3 });
    },
    hit(t, px, py) { return py > bedTip(t) - 5; },
  });
  // platforms: {t0, t1, y (top), w, x0 (left edge at tr), v (px/s), tDrop (falls away)}
  const plats = [];
  const PL = (o) => (plats.push(o), o);
  const pX = (p, t) => p.x0 + p.v * (t - p.tr);
  const pY = (p, t) => {
    let y = p.y;
    if (p.tRise !== undefined) y += (floorY + 16 - p.y) * (1 - MV.EASE.outExpo(U.clamp((t - p.tRise) / 0.3)));
    if (p.tDrop !== undefined && t > p.tDrop) y += 900 * (t - p.tDrop) ** 2;
    return y;
  };
  TL.add({
    t0: tP, t1: at(54), z: 5, clip: 'box',
    draw(ctx, emi, t) {
      for (const p of plats) {
        if (t < p.t0 || t > p.t1) continue;
        const x = R(pX(p, t)), y = R(pY(p, t)), w = p.w;
        if (x > PB.x + PB.w + 4 || x + w < PB.x - 4 || y > floorY + 10) continue;
        D.rect(ctx, x, y, w, 8, '#000000');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + 6, w, 2); ctx.fillRect(x, y, 2, 8); ctx.fillRect(x + w - 2, y, 2, 8);
        ctx.fillStyle = '#00c000'; ctx.fillRect(x + 2, y + 2, w - 4, 1);
        if (emi) D.rect(emi, x - 2, y - 2, w + 4, 12, '#ffffff', 0.25);
      }
    },
  });
  // the soul's route: stand / run on a platform, hop or drop onto another one
  const S = { p: null, u: 0, t: tP };
  const here = () => pX(S.p, S.t) + S.u;
  const land = (p, t, x) => { S.p = p; S.u = x - pX(p, t); S.t = t; };
  const inBox = (x) => U.clamp(x, PB.x + 24, PB.x + PB.w - 24);
  const run = (t1, vrel = 0) => {
    if (t1 < S.t - 0.005) console.warn('platform run: move at', t1.toFixed(3), 'starts late at', S.t.toFixed(3));
    if (t1 <= S.t) return;
    const u1 = U.clamp(S.u + vrel * (t1 - S.t), 12, S.p.w - 12);
    TL.soul.to(S.t, t1, { x: pX(S.p, t1) + u1, y: S.p.y - 9 }, 'lin');
    S.u = u1; S.t = t1;
  };
  const onto = (p, tl, x) => { const l = pX(p, tl); return U.clamp(inBox(x), l + 12, l + p.w - 12); };
  const hop = (dur, p, x, apex = 26) => {
    const t0 = S.t, tl = t0 + dur, xl = onto(p, tl, x);
    H.hopUT(t0, dur, here(), S.p.y - 9, xl, p.y - 9, apex);
    land(p, tl, xl);
    return { t0, tl, tc: t0 + dur * 0.45 };
  };
  const drop = (dur, p, x) => {
    const t0 = S.t, tl = t0 + dur, xl = onto(p, tl, x);
    TL.soul.to(t0, tl, { x: xl }, 'lin');
    TL.soul.to(t0, tl, { y: p.y - 9 }, 'in2');
    TL.soul.set(tl + 0.0005, { sq: 0.65 });
    TL.soul.to(tl + 0.0006, tl + 0.1, { sq: 1 }, 'out');
    land(p, tl, xl);
    return { t0, tl };
  };
  const nearest = (y, t, x) => plats
    .filter((p) => p.y === y && t >= p.t0 && t <= p.t1 && (p.tDrop === undefined || t < p.tDrop - 0.02))
    .sort((a, b) => Math.abs(pX(a, t) + a.w / 2 - x) - Math.abs(pX(b, t) + b.w / 2 - x))[0];
  // hazards that cross the soul's route exactly where it just jumped clear
  const under = (tc, vb, tip) => {
    const x0 = TL.soul.at(tc).x;
    H.bone({ t0: tc - 2.4, t1: tc + 2.4, w: 12, geo: (t) => ({ x: x0 + vb * (t - tc), y: floorY + 4, ang: -Math.PI / 2, len: floorY + 4 - tip }) });
  };
  const over = (tc, vb, tip) => {
    const x0 = TL.soul.at(tc).x;
    H.bone({ t0: tc - 2.4, t1: tc + 2.4, w: 12, geo: (t) => ({ x: x0 + vb * (t - tc), y: PB.y - 4, ang: Math.PI / 2, len: tip - PB.y + 4 }) });
  };
  const blast = (tf, side, y, o = {}) => {
    const x = side < 0 ? PB.x - 30 : PB.x + PB.w + 30, ang = side < 0 ? 0 : Math.PI, tS = tf - (o.lead || 0.4);
    H.cannon({ tSpawn: tS, fires: [tf], beamDur: 0.16, fall: 0.1, scale: 1.2, vol: 0.32, shake: 0.7,
      pos: (t) => ({ x: x + side * 70 * (1 - MV.EASE.outExpo(U.clamp((t - tS) / 0.15))), y, ang }) });
  };

  // ---- bar 50: two conveyors in opposite directions; run against the belt, jump between them
  const LOW = 372, HIGH = 316, tLanesGo = at(52) + 0.06;
  for (let k = -2; k < 10; k++) PL({ t0: tP - 0.3, t1: tLanesGo + 0.6, tr: tP, y: LOW, w: 150, x0: 400 + k * 214, v: -170, tDrop: tLanesGo });
  for (let k = -10; k < 3; k++) PL({ t0: tP - 0.3, t1: tLanesGo + 0.6, tr: tP, y: HIGH, w: 170, x0: 520 + k * 240, v: 150, tDrop: tLanesGo });
  // gravity turns back down as the arena opens: it drops off the ceiling onto the low belt
  TL.soul.to(tP, tP + 0.16, { x: 480, y: LOW - 9, sq: 1.3 }, 'in2');
  TL.soul.to(tP, tP + 0.1, { rot: 0 }, 'out');
  TL.soul.set(tP + 0.1605, { sq: 0.65 });
  TL.soul.to(tP + 0.161, tP + 0.26, { sq: 1 }, 'out');
  land(nearest(LOW, tP + 0.16, 480), tP + 0.16, 480);
  const TIP_LOW = LOW - 9 - 8 - 7, TIP_HIGH = HIGH - 9 - 8 - 12;
  run(at(50, 1) - 0.12, 110);
  let h = hop(0.32, nearest(HIGH, at(50, 1) + 0.2, here() + 20), here() + 20);
  under(h.tc, -330, TIP_LOW);
  run(at(50, 2), -90);
  over(at(50, 2), 360, TIP_HIGH);
  over(at(50, 2, 1), -360, TIP_HIGH);
  run(at(50, 2, 1) + 0.02, -90);
  drop(0.2, nearest(LOW, at(50, 2, 1) + 0.22, here()), here());
  // two bunny hops over bones sliding along the low lane from both sides
  run(at(50, 3) - 0.13, 110);
  h = hop(0.24, S.p, here() + 16, 34);
  under(h.tc, -340, TIP_LOW);
  h = hop(0.24, S.p, here() + 16, 34);
  under(h.tc, 340, TIP_LOW);

  // ---- bar 51: blasters at both ends fire along a lane every beat; flip lanes to stay out of it
  const flip = (tf) => {
    if (S.p.y === LOW) { run(tf - 0.14); hop(0.32, nearest(HIGH, tf + 0.18, here()), here(), 24); return LOW; }
    run(tf - 0.18); drop(0.22, nearest(LOW, tf + 0.04, here()), here()); return HIGH;
  };
  [[at(51), -1], [at(51, 1), 1], [at(51, 2), 1], [at(51, 3), 0]].forEach(([tf, side]) => {
    const left = flip(tf);
    if (side) blast(tf, side, left - 9);
    else { blast(tf, -1, left - 9); blast(tf, 1, left - 9); }
  });
  // the soul holds the low lane; the high lane gets raked once more from the other side
  blast(at(51, 3, 2), 1, HIGH - 9, { lead: 0.3 });
  for (const b of [0, 1, 2, 3]) H.punch(at(51, b), 0.4);

  // ---- bar 52: the belts fall away; a staircase slides in and collapses behind every step,
  // while the bed of bones rises after the soul and blasters rake the step it just left
  // (the steps drift right, the soul climbs left: one step every eighth, 70 px apart)
  const tops = [340, 320, 300, 314, 294, 282], VC = 120;
  const stepT = [at(52), at(52, 0, 2), at(52, 1), at(52, 1, 2), at(52, 2), at(52, 2, 2)];
  stepT.forEach((ts, k) => {
    run(ts);
    const tl = ts + 0.2, xl = inBox(here() - 40);
    const p = PL({ t0: tl - 0.5, tRise: tl - 0.5, t1: tl + 1.5, tr: tl, y: tops[k], w: 40, x0: xl - 20, v: VC });
    const from = S.p;
    hop(0.2, p, xl, 16);
    if (from.v === VC) from.tDrop = ts + 0.08; // the step it leaves crumbles
    H.punch(tl, 0.35, { dy: 1 });
  });
  blast(at(52, 1, 2) + 0.1, -1, tops[0] - 9, { lead: 0.35 });
  blast(at(52, 2, 2) + 0.1, 1, tops[1] - 9, { lead: 0.35 });

  // ---- bar 53: ride a platform through columns of bones sliding up and down; thread one per beat
  const tD = at(52, 3), durD = 0.26, VD = 100, RUN = 60;
  run(tD);
  const xlD = inBox(Math.min(here() + 30, 320));
  // (gone on the downbeat of bar 54, together with the whole platform arena)
  const PD = PL({ t0: tD - 0.6, tRise: tD - 0.6, t1: at(54), tr: tD + durD, y: 300, w: 200, x0: xlD - 40, v: VD });
  const lastStep = S.p;
  hop(durD, PD, xlD, 18);
  lastStep.tDrop = tD + 0.08;
  run(at(54), RUN);
  const HYD = PD.y - 9;
  for (let c = 0; c < 7; c++) {
    const tc = at(53, 0, c * 2), xc = TL.soul.at(tc).x, vy = (c % 2 ? 1 : -1) * (c % 3 ? 120 : 160);
    const tApp = at(52, 3) + c * 0.04;
    for (let j = -3; j <= 3; j++) {
      // bone j spans [y0, y0 + 40] at tc: 40 of bone, 45 of gap, and the soul's height sits mid-gap
      const y0 = HYD + 22.5 + (j - 1) * 85;
      H.bone({ t0: tApp, t1: at(54), w: 12, glow: 0.6,
        geo: (t) => ({ x: xc, y: y0 + vy * (t - tc) - Math.sign(vy) * 170 * (1 - MV.EASE.outExpo(U.clamp((t - tApp) / 0.15))), ang: Math.PI / 2, len: 40 }) });
    }
    if (c % 2 === 0) H.sfx(tApp, 'BoneStab', 0.3);
    H.punch(tc, c % 2 ? 0.3 : 0.5);
  }

  // camera: side-on and tracking the soul; wide for the crossfire; up the stairs; tight for the ride
  const follow = (t0, t1, n, v, fx = 0.6, fy = 0.3) => {
    for (let i = 1; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n, s = TL.soul.at(t);
      TL.cam.to(t - (t1 - t0) / n, t, Object.assign({ x: U.lerp(480, s.x, fx), y: U.lerp(330, s.y, fy) }, typeof v === 'function' ? v(t, i) : v), 'lin');
    }
  };
  H.cam(tP, tP + 0.25, { x: 480, y: 330, zoom: 1.6, pitch: 0.22, yaw: 0.12, roll: 0 }, 'outExpo');
  follow(tP + 0.25, at(51), 14, (t) => ({ roll: TL.soul.at(t).y < 340 ? -0.05 : 0.04 }));
  H.cam(at(51), at(51) + 0.2, { x: 480, y: 325, zoom: 1.22, pitch: 0.1, yaw: 0, roll: 0 }, 'outExpo');
  follow(at(52), at(53), 16, (t, i) => ({ zoom: 1.75, pitch: 0.3, roll: i % 2 ? 0.07 : -0.07, yaw: -0.08 }), 0.7, 0.6);
  follow(at(53), at(54), 16, (t) => ({ zoom: 2.0, pitch: 0.15, yaw: 0.12, roll: Math.sin((t - at(53)) * Math.PI * 2) * 0.08 }), 0.85, 0.7);
  for (let s = 8; s < 16; s++) H.punch(at(53, 0, s), 0.15 + (s - 8) * 0.04);


  // ---------------------------------------------------------------- bars 54-55: the riff opens fire
  // The bass drops out here and the percussion plays the main riff (x x x . x . . x . x . x . x x x),
  // so the HUD's letters are fired on the riff itself: the name on five of its accents in bar 54, LV
  // and the HP figures on the whole run in bar 55. Each one crosses the spot the soul has only just
  // left, exactly on the note. Under it a pulse on every beat: the walls close in and the frame
  // tightens, up to the drop. The camera keeps the letter that is about to fire in shot.
  const tL = at(54), tDrop = at(56), hy = L.hudY;
  const V = (a, b) => [b[0] - a[0], b[1] - a[1]], len = (v) => Math.hypot(v[0], v[1]);
  H.box(tL, tL + 0.1, B0, 'outExpo');
  TL.soulCol.set(tL, 'red');
  TL.aura.to(tL, tL + 0.08, { v: 0 }, 'out');
  TL.enemy.to(tL, tL + 0.1, { handGlow: 0 }, 'out');
  TL.head.set(tL, 'Default');
  TL.soul.to(tL, tL + 0.12, { x: C0[0], y: C0[1], rot: 0, sq: 1 }, 'outExpo');

  // ---- the pulse: every beat the walls close in (and once more on the last eighth)
  const boxAt = (k) => { const w = 150 - 10 * k, h = 140 - 9 * k; return { x: C0[0] - w / 2, y: C0[1] - h / 2, w, h }; };
  const squeeze = [];
  for (let k = 1; k < 8; k++) squeeze.push([tL + k * BEAT, k]);
  squeeze.push([at(55, 3, 2), 8.2]);
  const boxFor = (t) => { let k = 0; for (const [tb, kk] of squeeze) if (t >= tb) k = kk; return boxAt(k); };
  squeeze.forEach(([tb, k], i) => {
    H.box(tb, tb + 0.07, boxAt(k), 'outExpo');
    for (const s of i % 2 ? ['left', 'right'] : ['top', 'bottom']) H.boxHit(tb, s, 0.5, 7 + k);
    TL.impact(tb, { amp: 2 + k * 0.7, zoom: 0.015 + k * 0.006, ca: 1 + k * 0.5, dur: 0.3 });
    TL.post.to(tb, tb + 0.08, { vig: 0.45 + k * 0.055, desat: k * 0.035, ca: 0.6 + k * 0.18, bg: 1 - k * 0.09, letter: k * 0.06 }, 'outExpo');
  });
  const hands = ['HandUp', 'HandLeft', 'HandRight', 'HandDown'];
  for (let k = 0; k < 8; k++) TL.body.set(tL + k * BEAT, hands[k % 4]);
  TL.body.set(at(55, 3, 2), 'HandUp');
  // halfway, his eye lights up
  TL.head.set(at(55), 'BlueEye');
  TL.enemy.to(at(55), at(55) + 0.1, { handGlow: 0.5 }, 'out');
  TL.enemy.to(at(55, 3), at(55, 3, 3), { handGlow: 1 }, 'in');
  H.hit(at(55), 0.7);
  TL.hud.to(tL, at(55, 3), { jit: 1.5 }, 'in2');

  // ---- the letters, one per riff note: the name in bar 54, then LV and the HP figures from the
  // outside in (so the shot can close in on the ones still to come)
  const slot = (key, i, c, x) => ({ key, i, c, x, y: hy });
  const order = [
    slot('name', 0, 'B', L.name), slot('name', 1, 'O', L.name + 12), slot('name', 2, 'M', L.name + 24), slot('name', 3, 'E', L.name + 36), slot('name', 4, 'I', L.name + 48),
    slot('lv', 0, 'L', L.lv), slot('num', 6, '2', L.num + 72), slot('lv', 1, 'V', L.lv + 12), slot('num', 5, '9', L.num + 60), slot('lv', 3, '1', L.lv + 36),
    slot('num', 3, '/', L.num + 36), slot('lv', 4, '9', L.lv + 48), slot('num', 1, '1', L.num + 12), slot('num', 0, '6', L.num),
  ];
  const notes = [[54, 2], [54, 4], [54, 7], [54, 11], [54, 14], [55, 0], [55, 2], [55, 4], [55, 7], [55, 9], [55, 11], [55, 13], [55, 14], [55, 15]].map(([b, s]) => at(b, 0, s));
  const FL = S16, HIT_R = 14, SAFE = 22; // launched a sixteenth before its note
  const posAt = (s, t) => [s.p0[0] + s.dir[0] * s.v * (t - s.tl), s.p0[1] + s.dir[1] * s.v * (t - s.tl)];
  const shots = [];
  let P = [C0[0], C0[1]];
  notes.forEach((tc, k) => {
    const lt = order[k], p0 = [lt.x + 5, lt.y - 9]; // launched from where it has lifted to
    const d = V(p0, P), dist = len(d), dir = [d[0] / dist, d[1] / dist];
    const s = { lt, p0, P, dir, v: dist / FL, tl: tc - FL, tc, tEnd: tc + 0.3 };
    shots.push(s);
    // the step: just before the note, square to the incoming line, inside the walls that are
    // coming (until the next step) and clear of every letter still in the air
    const tStep = tc - (k < 5 ? 0.08 : 0.065), dur = 0.05;
    const tNext = k + 1 < notes.length ? notes[k + 1] - 0.08 : tDrop;
    const b = boxFor(tNext), nrm = [-dir[1], dir[0]];
    let best = null;
    for (const L2 of [27, 31, 24, 35]) for (const rot of [0, 0.35, -0.35, 0.7, -0.7]) for (const sg of [1, -1]) {
      const c = Math.cos(rot), sn = Math.sin(rot);
      const Q = [P[0] + (nrm[0] * c - nrm[1] * sn) * sg * L2, P[1] + (nrm[0] * sn + nrm[1] * c) * sg * L2];
      if (Q[0] < b.x + 12 || Q[0] > b.x + b.w - 12 || Q[1] < b.y + 12 || Q[1] > b.y + b.h - 12) continue;
      let clear = 1e9;
      for (let t = tStep; t <= tNext; t += 1 / 240) {
        const u = t < tStep + dur ? MV.EASE.outExpo((t - tStep) / dur) : 1, q = [U.lerp(P[0], Q[0], u), U.lerp(P[1], Q[1], u)];
        for (const o of shots) if (t >= o.tl && t <= o.tEnd) clear = Math.min(clear, len(V(q, posAt(o, t))));
      }
      const score = Math.min(clear, SAFE + 10) * 10 - len(V(Q, C0)) - L2 * 0.2 - Math.abs(rot) * 8;
      if (!best || score > best.score) best = { Q, clear, score };
    }
    if (!best) { console.warn('hud riff: no room at', tc.toFixed(3)); return; }
    if (best.clear < SAFE) console.warn('hud riff: tight step at', tc.toFixed(3), best.clear.toFixed(1));
    TL.soul.to(tStep, tStep + dur, { x: best.Q[0], y: best.Q[1] }, 'outExpo');
    TL.burst(tStep, { x: P[0], y: P[1], n: 6, speed: [30, 90], life: [0.12, 0.25], colors: ['#ff4050', '#ffffff'], z: 30, size: 2 });
    P = best.Q;
  });
  TL.hudBack = TL.hudBack || {};
  shots.forEach((s, k) => {
    const { lt } = s, td = Math.max(tL + 0.02, s.tl - 0.22), spin = (k % 2 ? 1 : -1) * 10;
    s.td = td;
    (TL.hudDetach[lt.key] = TL.hudDetach[lt.key] || [])[lt.i] = td;
    (TL.hudBack[lt.key] = TL.hudBack[lt.key] || [])[lt.i] = tDrop;
    TL.add({
      t0: td, t1: s.tEnd, z: 45, kind: 'white',
      draw(ctx, emi, t) {
        if (t < s.tl) { // rattling in its slot, turning red, lifting out of the HUD, then it swells up
          const u = (t - td) / (s.tl - td), j = 1 + u * 2.5, pop = U.clamp((t - s.tl + 0.07) / 0.07), sc = 2 + u * 0.8 + 1.8 * MV.EASE.outBack(pop);
          ctx.save(); ctx.translate(R(lt.x + 5 + U.noise(t * 70 + k) * j), R(lt.y + 5 + U.noise(t * 73 + k + 9) * j - 8 * u - 6 * pop));
          D.hud(ctx, lt.c, -3 * sc, -3 * sc, { scale: sc, color: u > 0.4 ? '#ff5050' : '#ffffff', glow: emi, glowA: 0.3 + u * 0.6 });
          ctx.restore();
          return;
        }
        const fade = U.clamp((s.tEnd - t) / 0.1);
        for (let g = 3; g >= 0; g--) { // with a short streak behind it
          const tt = Math.max(s.tl, t - g * 0.012), [x, y] = posAt(s, tt);
          ctx.save(); ctx.translate(R(x), R(y)); ctx.rotate((tt - s.tl) * spin);
          D.hud(ctx, lt.c, -12, -12, { scale: 4, alpha: fade * (g ? 0.35 - g * 0.08 : 1), glow: g ? null : emi, glowA: 0.7 });
          ctx.restore();
        }
      },
      hit(t, px, py) { if (t < s.tl || t > s.tEnd - 0.05) return false; const [x, y] = posAt(s, t); return Math.hypot(px - x, py - y) < HIT_R; },
    });
    // it tears out of the HUD; on the note a ring where the soul just was, and the UI click
    TL.ring(s.tl, lt.x + 5, lt.y + 5, { r0: 3, r1: 18, dur: 0.18, color: '#ff6060', w: 2 });
    TL.ring(s.tc, s.P[0], s.P[1], { r0: 2, r1: 14 + k, dur: 0.16, color: k > 8 ? '#ff8080' : '#ffffff', w: 2 });
    H.punch(s.tc, 0.35 + k * 0.03, { dx: s.dir[0] * 0.6, dy: s.dir[1] * 0.6, rot: (k % 2 ? 1 : -1) * (0.01 + 0.002 * k) });
    H.sfx(s.tc, 'MenuCursor', 0.3);
    if (MV.TIKTOK) H.sfx(s.tc - 0.15, 'Whoosh', 0.08 + k * 0.006);
  });
  // the HUD has turned hostile: its row pulses red on the beat, and the holes the letters leave
  // blink red until they come home
  TL.add({
    t0: tL, t1: tDrop, z: 44,
    draw(ctx, emi, t) {
      const on = Math.floor((t - T.off) / (S16 / 2)) % 2 === 0;
      if (emi) D.rect(emi, L.name - 8, hy - 6, L.num + 92 - L.name, 24, '#ff2030', 0.08 + 0.2 * T.pulse(t, BEAT, 0.25));
      for (const s of shots) if (t >= s.td) { D.rect(ctx, s.lt.x - 1, s.lt.y + 11, 12, 3, '#ff3030', on ? 1 : 0.35); if (emi && on) D.rect(emi, s.lt.x - 2, s.lt.y + 8, 14, 8, '#ff3030', 0.6); }
    },
  });

  // ---- camera: zoom steps only (a sideways jerk on every sixteenth would smear the picture); in
  // portrait the view is widened just enough to keep the next letter in shot - the name on the left
  // in bar 54, then LV and the figures, which fire from the outside in so the shot can close in
  const pShot = (t, cx, z, hw) => TL.pcam.to(t, t + 0.06, { dx: cx - 480, k: Math.min(0.62, 303.75 / (2 * hw * z)) }, 'outExpo');
  H.cam(tL, tL + 0.1, { x: 480, y: 318, zoom: 1.12, pitch: 0.08, yaw: 0, roll: 0 }, 'outExpo');
  pShot(tL, 372, 1.12, 208);
  shots.forEach((s, k) => {
    const bar55 = k >= 5, u = (k + 1) / shots.length;
    const z = bar55 ? 1.35 + 0.05 * (k - 5) : 1.12 + 0.03 * (k + 1);
    const y = U.lerp(318, 372, u ** 1.5);
    H.cam(s.tc, s.tc + 0.06, { x: 480, y, zoom: z, roll: -0.05 * u, yaw: 0 }, 'outExpo');
    const nx = k + 1 < shots.length ? shots[k + 1].lt.x + 5 : 480; // the next one to fire
    if (bar55) pShot(s.tc, 470, z, Math.max(Math.abs(nx - 470) + 40, 100));
    else if (k < 4) pShot(s.tc, 372, z, 208);
  });
  TL.pcam.to(at(54, 3, 3), at(55) - 0.01, { dx: -10, k: Math.min(0.62, 303.75 / (2 * (Math.abs(order[5].x + 5 - 470) + 40) * 1.3)) }, 'inOut');

  // ---- the last sixteenth: the camera dives onto the soul, the picture tears and whites out
  const tF = notes[notes.length - 1], qF = TL.soul.at(tF + 0.02);
  H.cam(tF + 0.01, tDrop - 0.005, { x: qF.x, y: qF.y, zoom: 3.2, roll: 0.12, yaw: 0 }, 'in2');
  TL.pcam.to(tF + 0.01, tDrop - 0.005, { dx: 0, k: 0.62 }, 'in2');
  TL.glitch(at(55, 3, 2), tDrop, 0.5);
  if (MV.TIKTOK) { H.sfx(at(55, 3, 2), 'Glitch', 0.25); H.swell(tDrop, 0.4); }
  TL.add({ t0: tF, t1: tDrop, z: 99, screen: true, draw(ctx, emi, t) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.85 * MV.EASE.in2(U.clamp((t - tF) / (tDrop - tF))); ctx.fillRect(0, 0, MV.SW, MV.SH); ctx.globalAlpha = 1; } });
  // the drop: every letter is back in its slot
  TL.post.set(tDrop, { letter: 0 });
  TL.pcam.set(tDrop, { dx: 0 });
  TL.body.set(tDrop, 'idle');
  TL.enemy.to(tDrop, tDrop + 0.2, { handGlow: 0 }, 'out');
  TL.hud.to(tDrop, tDrop + 0.01, { jit: 2.5 }, 'step');
  TL.hud.to(at(57), at(58), { jit: 0 }, 'lin');
  for (const s of shots) TL.ring(tDrop, s.lt.x + 5, s.lt.y + 5, { r0: 2, r1: 12, dur: 0.2, color: '#ffffff' });
});