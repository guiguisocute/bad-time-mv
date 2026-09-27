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

  // ---------------------------------------------------------------- bars 54-55: the HUD attacks
  const tL = at(54);
  H.box(tL, tL + 0.25, B0, 'outBack');
  TL.soulCol.set(tL, 'red');
  TL.aura.to(tL, tL + 0.1, { v: 0 }, 'out');
  TL.enemy.to(tL, tL + 0.1, { handGlow: 0 }, 'out');
  TL.head.set(tL, 'Default');
  H.cam(tL, tL + 0.3, { x: 480, y: 360, zoom: 1.25, pitch: 0.1, yaw: 0, roll: 0 }, 'outExpo');
  // the soul circles slowly in the box
  const loop = (t) => { const a = (t - tL) * Math.PI; return [C0[0] + Math.cos(a) * 34, C0[1] + Math.sin(a) * 30]; };
  TL.soul.to(tL, tL + 0.25, { x: loop(tL + 0.25)[0], y: loop(tL + 0.25)[1], rot: 0, sq: 1 }, 'outExpo');
  for (let i = 1; i <= 48; i++) {
    const t = tL + 0.25 + (i / 48) * (at(55, 3) - tL - 0.25);
    const [x, y] = loop(t);
    TL.soul.to(t - (at(55, 3) - tL - 0.25) / 48, t, { x, y }, 'lin');
  }
  const hy = L.hudY;
  const letters = [];
  'BOMEI'.split('').forEach((c, i) => letters.push({ key: 'name', i, c, x: L.name + i * 12, y: hy }));
  [['L', 0], ['V', 1], ['1', 3], ['9', 4]].forEach(([c, i]) => letters.push({ key: 'lv', i, c, x: L.lv + i * 12, y: hy }));
  [['6', 0], ['1', 1], ['/', 3], ['9', 5], ['2', 6]].forEach(([c, i]) => letters.push({ key: 'num', i, c, x: L.num + i * 12, y: hy }));
  // each letter flies past the soul, turns, and boomerangs back into its slot through the
  // arena again; they land one after another on thirty-seconds, and the HUD is whole again
  TL.hudBack = TL.hudBack || {};
  letters.forEach((lt, k) => {
    const td = at(54, 0, k * 1 + 1);
    (TL.hudDetach[lt.key] = TL.hudDetach[lt.key] || [])[lt.i] = td;
    const ts = td + 0.1;
    const cross = ts + 0.35;
    const [hx0, hy0] = [TL.soul.at(cross).x, TL.soul.at(cross).y];
    const p0 = [lt.x + 5, lt.y + 5];
    const ang = Math.atan2(hy0 - p0[1], hx0 - p0[0]);
    const off = (k % 2 ? 1 : -1) * 40;
    const aim = [hx0 - Math.sin(ang) * off, hy0 + Math.cos(ang) * off];
    const dist = Math.hypot(aim[0] - p0[0], aim[1] - p0[1]), sp = dist / (cross - ts);
    const dir = [(aim[0] - p0[0]) / dist, (aim[1] - p0[1]) / dist];
    const out = (t) => [p0[0] + dir[0] * sp * (t - ts), p0[1] - 10 + dir[1] * sp * (t - ts)];
    // the way back: a curve through a point beside the soul (on the side it came from)
    const tTurn = cross + 0.3, tBack = at(55, 1) + k * S16 / 2;
    const P1 = out(tTurn), uMid = Math.SQRT1_2, tMid = tTurn + uMid * (tBack - tTurn);
    const sm = TL.soul.at(tMid);
    const back = [P1[0] - sm.x, P1[1] - sm.y], bl = Math.hypot(back[0], back[1]) || 1;
    const mid = [sm.x + (back[0] / bl) * 34 - (back[1] / bl) * 26 * Math.sign(off), sm.y + (back[1] / bl) * 34 + (back[0] / bl) * 26 * Math.sign(off)];
    const C = [2 * mid[0] - 0.5 * (P1[0] + p0[0]), 2 * mid[1] - 0.5 * (P1[1] + p0[1])];
    const ret = (t) => {
      const u = U.clamp((t - tTurn) / (tBack - tTurn)) ** 2, v = 1 - u;
      return [v * v * P1[0] + 2 * u * v * C[0] + u * u * p0[0], v * v * P1[1] + 2 * u * v * C[1] + u * u * p0[1]];
    };
    const pos = (t) => (t < ts ? [p0[0] + U.noise(t * 60 + k) * 1.5, p0[1] - 10 * U.eOut((t - td) / 0.1)] : t < tTurn ? out(t) : ret(t));
    (TL.hudBack[lt.key] = TL.hudBack[lt.key] || [])[lt.i] = tBack;
    TL.add({
      t0: td, t1: tBack, z: 45, kind: 'white',
      draw(ctx, emi, t) {
        const [x, y] = pos(t);
        const spin = t < ts ? 0 : t < tTurn ? (t - ts) * 14 : (tTurn - ts) * 14 + (t - tTurn) * 22 * (1 - U.clamp((t - tTurn) / (tBack - tTurn)) ** 4);
        ctx.save(); ctx.translate(R(x), R(y)); ctx.rotate(spin * (k % 2 ? 1 : -1));
        D.hud(ctx, lt.c, -9, -9, { scale: t > tBack - 0.08 ? U.lerp(3, 1, (t - tBack + 0.08) / 0.08) : 3, glow: emi, glowA: 0.5 });
        ctx.restore();
      },
      hit(t, px, py) { if (t < ts) return false; const [x, y] = pos(t); return Math.hypot(px - x, py - y) < 14; },
    });
    H.sfx(td, 'MenuCursor', 0.35);
    H.punch(td, 0.3);
    H.sfx(tBack, 'MenuCursor', 0.3);
    TL.ring(tBack, p0[0], p0[1], { r0: 2, r1: 14, color: '#ffffff', dur: 0.18 });
  });
  // the last letter snaps home: the HUD shudders back into place (the HP bar never leaves)
  const tHome = at(55, 1) + 13 * S16 / 2;
  TL.hud.to(tHome, tHome + 0.05, { barDy: 4 }, 'outExpo');
  TL.hud.to(tHome + 0.05, tHome + 0.4, { barDy: 0 }, 'outElastic');
  H.punch(tHome, 0.8, { dy: 1 });
  TL.hud.to(at(56), at(56) + 0.01, { jit: 2.5 }, 'step');
  TL.hud.to(at(57), at(58), { jit: 0 }, 'lin');
  // riser: everything flares, white-out
  const tW = at(55, 3);
  H.cam(at(55), tW, { zoom: 1.7, roll: 0.25 }, 'in2');
  for (let s = 0; s < 12; s++) H.punch(at(55, 0, s), 0.2 + s * 0.05);
  TL.add({ t0: tW, t1: at(56), z: 99, screen: true, draw(ctx, emi, t) { ctx.fillStyle = '#fff'; ctx.globalAlpha = U.clamp((t - tW) / 0.4); ctx.fillRect(0, 0, 960, 540); ctx.globalAlpha = 1; } });
});
