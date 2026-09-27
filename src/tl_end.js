// Bars 64-77: the last stand, the fourth-wall cut, and the empty aftermath.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const B0 = L.box, C0 = H.C0, MB = L.menuBox;
  const [ex, ey] = L.enemy;
  const R = Math.round;


  // ---------------------------------------------------------------- bars 64-65: the vortex
  // (the opening of the simulator's final attack: a spiral of blasters, one every
  // sixteenth, each firing straight through the centre); the camera is dragged round with it
  const t0 = at(64), tV1 = at(66);
  H.cut(t0, { x: 480, y: 330, zoom: 1.1, pitch: 0, roll: 0, yaw: 0 });
  H.bigHit(t0);
  TL.soulCol.set(t0, 'red');
  TL.aura.set(t0, { v: 0 });
  TL.post.set(t0, { tint: 0, desat: 0, bloom: 1, vig: 0.45, bg: 1, grid: 0.12 });
  TL.head.set(t0, 'BlueEye');
  const th = []; // firing angle of blaster k
  let a = -Math.PI / 2;
  for (let k = 0; k < 30; k++) { th.push(a); a += 0.34 + k * 0.006; }
  const spawnT = (k) => t0 + k * S16;
  th.forEach((ang, k) => {
    const tS = spawnT(k), tF = tS + 0.25;
    H.cannon({ tSpawn: tS, fires: [tF], beamDur: 0.14, fall: 0.08, scale: 1.6, vol: k % 2 ? 0 : 0.3, sfx: k % 2 === 0, shake: 0.5,
      pos: (t) => { const u = MV.EASE.outExpo(U.clamp((t - tS) / 0.18)), r = U.lerp(520, 175, u); return { x: C0[0] - Math.cos(ang) * r, y: C0[1] - Math.sin(ang) * r, ang }; } });
  });
  // the soul keeps a quarter turn ahead of the spiral
  const aimAt = (t) => { const f = U.clamp((t - t0 - 0.25) / S16, 0, th.length - 1); const i = Math.floor(f); return U.lerp(th[i], th[Math.min(i + 1, th.length - 1)], f - i); };
  const phi = (t) => aimAt(t - 0.02) + Math.PI / 2 + 0.2;
  TL.soul.set(t0, { a: 1, rot: 0, sq: 1, sc: 1, x: C0[0] + Math.cos(phi(t0)) * 55, y: C0[1] + Math.sin(phi(t0)) * 55 });
  for (let i = 1; i <= 96; i++) {
    const t = t0 + (i / 96) * (tV1 - 0.08 - t0);
    TL.soul.to(t - (tV1 - 0.08 - t0) / 96, t, { x: C0[0] + Math.cos(phi(t)) * 55, y: C0[1] + Math.sin(phi(t)) * 55 }, 'lin');
  }
  // one camera: it leans in, tilts the arena into a spinning disc and is dragged round
  // by the spiral (a fraction of its angle), drifting toward the soul
  const nK = 30;
  for (let i = 1; i <= nK; i++) {
    const t = t0 + (i / nK) * (at(65, 3) - t0), u = i / nK, s = TL.soul.at(t);
    TL.cam.to(t - (at(65, 3) - t0) / nK, t, {
      x: U.lerp(480, s.x, 0.3 * u), y: U.lerp(330, s.y, 0.3 * u),
      zoom: 1.1 + 0.55 * MV.EASE.inOut(u), pitch: 0.38 * MV.EASE.inOut(u),
      roll: -0.07 * (aimAt(t) - th[0]),
    }, 'lin');
  }
  H.cam(at(65, 3), at(66), { x: 480, y: 340, zoom: 1.25, pitch: 0.15, roll: 0 }, 'inOut');
  for (let k = 0; k < 8; k++) H.punch(at(64, k), 0.3 + k * 0.04);
  TL.hud.to(at(64), at(68), { jit: 1.5 }, 'in');

  // ---------------------------------------------------------------- bars 66-67: the last barrage
  // the frame breaks and Sans throws everything he has left, faster and faster; the soul answers
  // with small, exact steps, and every attack cuts through the spot it has only just left. By the
  // end of bar 67 he is spent: the attacks slow, his eye goes out, the last blasters crumble unfired.
  const tB = at(66);
  TL.box.set(tB, { draw: 0, fill: 0 });
  H.shatter(tB, { x: B0.x - 6, y: B0.y - 6, w: B0.w + 12, h: B0.h + 12 }, (c) => D.box(c, null, Object.assign({ draw: 1, th: 5 }, B0)), { chunk: 7, force: 480, up: 80, sound: 'HeartShatter', vol: 0.4 });
  H.bigHit(tB, { inv: 0.05, bw: 0.05 });
  TL.head.set(tB, 'BlueEye');
  // the soul's steps: eighths through bar 66, sixteenths in the first half of bar 67, then slower
  const steps = [];
  for (let s = 2; s < 16; s += 2) steps.push({ t: at(66, 0, s), len: 46, kind: s === 14 ? 'ring' : s % 4 === 0 ? 'blast' : 'pincer', v: 1500 });
  for (let s = 0; s < 8; s++) steps.push({ t: at(67, 0, s), len: 36, kind: s % 2 === 0 ? 'blast' : 'spear', v: 1700 });
  steps.push({ t: at(67, 2), len: 40, kind: 'spear', v: 800 }, { t: at(67, 2, 2), len: 36, kind: 'spear', v: 520 });
  const BOUND = { x0: 372, x1: 588, y0: 282, y1: 400 };
  const haz = []; // lines (or segments s0..s1 along d) the soul must stay clear of: {p, d, t0, t1, r}
  const lineDist = (q, h) => {
    const rx = q[0] - h.p[0], ry = q[1] - h.p[1];
    if (h.s0 === undefined) return Math.abs(rx * h.d[1] - ry * h.d[0]);
    const s = U.clamp(rx * h.d[0] + ry * h.d[1], h.s0, h.s1);
    return Math.hypot(rx - h.d[0] * s, ry - h.d[1] * s);
  };
  const clearOf = (P, Q, ta, tb) => {
    let m = 1e9;
    for (const h of haz) {
      if (h.t1 < ta || h.t0 > tb) continue;
      for (const f of [0.35, 0.7, 1]) m = Math.min(m, lineDist([U.lerp(P[0], Q[0], f), U.lerp(P[1], Q[1], f)], h) - h.r);
    }
    return m;
  };
  let P = [TL.soul.at(tB).x, TL.soul.at(tB).y];
  steps.forEach((st, i) => {
    const Pc = P; // (closures below must keep this step's spot, not the loop variable)
    const tNext = i + 1 < steps.length ? steps[i + 1].t : at(68);
    // pick the step: a seeded direction, rotated until it is inside the space and clear of every live line
    let best = null;
    for (let k = 0; k < 72; k++) {
      const th = U.hash(i * 7.3 + 1) * U.TAU + (k % 24) * 0.9, L = st.len * [1, 1.25, 0.85][Math.floor(k / 24)];
      const Q = [P[0] + Math.cos(th) * L, P[1] + Math.sin(th) * L];
      if (Q[0] < BOUND.x0 || Q[0] > BOUND.x1 || Q[1] < BOUND.y0 || Q[1] > BOUND.y1) continue;
      const m = clearOf(P, Q, st.t, tNext + 0.06);
      if (!best || m > best.m) best = { Q, th, m };
      if (m > 4) break;
    }
    if (best.m <= 0) console.warn('barrage: tight step at', st.t.toFixed(3));
    const { Q, th } = best;
    TL.soul.to(st.t, st.t + 0.06, { x: Q[0], y: Q[1] }, 'outExpo');
    // the attack lines run through the spot it left, square to the step
    const sg = U.hash(i * 3.9 + 2) > 0.5 ? 1 : -1;
    const d = [-Math.sin(th) * sg, Math.cos(th) * sg], ang = Math.atan2(d[1], d[0]);
    const tc = st.t + 0.03 + 45 / st.v; // the spear's tip reaches the spot just after the soul has left it
    const spear = (dir) => {
      const a = dir > 0 ? ang : ang + Math.PI, dd = [Math.cos(a), Math.sin(a)];
      H.fly({ t0: tc - 0.6, t1: tc + 0.6, w: 12, len: 70, clip: null, z: 22, path: (t) => ({ x: Pc[0] + dd[0] * st.v * (t - tc), y: Pc[1] + dd[1] * st.v * (t - tc), ang: a }) });
      haz.push({ p: P, d, t0: tc - 140 / st.v, t1: tc + 140 / st.v, r: 14 });
    };
    if (st.kind === 'pincer') { spear(1); spear(-1); H.sfx(tc - 0.05, 'BoneStab', 0.35); }
    if (st.kind === 'spear') { spear(sg); H.sfx(tc - 0.05, 'BoneStab', 0.25); }
    if (st.kind === 'blast') {
      // it locked on while the soul was still there
      const tf = st.t + 0.05, tS = st.t - 0.32, B = [P[0] - d[0] * 210, P[1] - d[1] * 210];
      H.cannon({ tSpawn: tS, fires: [tf], beamDur: 0.14, fall: 0.08, scale: 1.3, vol: 0.3, shake: 0.6,
        pos: (t) => { const u = MV.EASE.outExpo(U.clamp((t - tS) / 0.15)); return { x: B[0] - d[0] * 80 * (1 - u), y: B[1] - d[1] * 80 * (1 - u), ang }; } });
      haz.push({ p: P, d, t0: tf - 0.02, t1: tf + 0.16, r: 25 });
    }
    if (st.kind === 'ring') {
      // a ring snaps shut on the spot; the soul slips out through the one missing bone
      for (let k = 0; k < 8; k++) {
        const phi = th + (U.TAU * (k + 1)) / 9, dir = [Math.cos(phi), Math.sin(phi)], t0 = tc - 0.3;
        H.fly({ t0, t1: tc + 0.3, w: 12, len: 28, clip: null, z: 22, path: (t) => {
          const r = U.lerp(240, 28, MV.EASE.inOut(U.clamp((t - t0) / 0.3)));
          return { x: Pc[0] + dir[0] * r, y: Pc[1] + dir[1] * r, ang: phi + Math.PI, a: U.clamp((tc + 0.3 - t) / 0.12) };
        } });
        haz.push({ p: P, d: dir, s0: 10, s1: 260, t0: tc - 0.3, t1: tc + 0.3, r: 14 });
      }
      H.sfx(tc, 'Slam', 0.4);
    }
    H.punch(st.t, st.kind === 'blast' || st.kind === 'ring' ? 0.6 : 0.35);
    P = Q;
  });
  // he is working for every one of them: a throw on every beat, then on every eighth
  const hands = ['HandLeft', 'HandUp', 'HandRight', 'HandDown'];
  for (let k = 0; k < 4; k++) TL.body.set(at(66, k), hands[k % 4]);
  for (let k = 0; k < 4; k++) TL.body.set(at(67, 0, k * 2), hands[(k + 1) % 4]);
  // no blue body glow: his left eye burns instead, flaring with every throw
  TL.enemy.to(tB, tB + 0.1, { eyeFire: 0.9, handGlow: 0 }, 'out');
  [at(66), at(66, 1), at(66, 2), at(66, 3), at(67, 0, 0), at(67, 0, 2), at(67, 1, 0), at(67, 1, 2)].forEach((tt, k) => {
    TL.enemy.to(tt, tt + 0.04, { eyeFire: 1.3 + k * 0.04 }, 'out');
    TL.enemy.to(tt + 0.04, tt + 0.2, { eyeFire: 0.95 }, 'in');
  });
  // ... and then there is nothing left
  TL.body.set(at(67, 2), 'idle');
  TL.sweat.set(at(67, 2), 1);
  TL.enemy.to(at(67, 2), at(67, 3, 2), { sway: 0.2 }, 'inOut');
  // the flame gutters: it sinks, sputters back twice, and goes out with the eye
  TL.enemy.to(at(67, 2), at(67, 2, 2), { eyeFire: 0.4 }, 'inOut');
  [[at(67, 2, 2), 0.12], [at(67, 2, 3), 0.45], [at(67, 2, 3) + 0.07, 0.1], [at(67, 3) - 0.08, 0.3]].forEach(([tt, v]) => TL.enemy.to(tt, tt + 0.03, { eyeFire: v }, 'out'));
  TL.enemy.to(at(67, 3) - 0.04, at(67, 3), { eyeFire: 0 }, 'lin');
  TL.head.set(at(67, 3), 'Default');
  // two last blasters sag and crumble before they can fire
  for (const [sx, sy, a] of [[330, 250, 0.5], [630, 260, Math.PI - 0.5]]) {
    const tS = at(67, 2, 2), tC = at(67, 3, 2);
    TL.add({ t0: tS, t1: tC + 0.5, z: 36, draw(ctx, emi, t) {
      const drop = t > tC ? 300 * (t - tC) ** 2 : 0;
      const alpha = U.clamp((t - tS) / 0.12) * U.clamp(1 - (t - tC) / 0.5);
      D.cannon(ctx, emi, sx, sy + drop, a + (t > tC ? (t - tC) * 1.5 : 0), { open: 0, charge: U.clamp((t - tS) / 0.4) * (t < tC ? 0.5 : 0), scale: 1.3, alpha, glitch: t > tC ? 0.8 : 0, seed: sx, t });
    } });
    H.sfx(tS, 'GasterBlaster', 0.2);
  }
  H.sfx(at(67, 3, 2), 'Flash', 0.25);
  // camera: rides the barrage in closer and closer, then lets go to show him out of breath
  // (framed so his head and the burning eye stay in shot above the soul)
  H.cam(tB, tB + 0.3, { x: 480, y: 262, zoom: 1.2, pitch: 0.12, roll: 0, yaw: 0 }, 'outExpo');
  steps.forEach((st, i) => {
    if (st.t > at(67, 2)) return;
    const s = TL.soul.at(st.t + 0.06), u = (st.t - tB) / (at(67, 2) - tB);
    H.cam(st.t, st.t + 0.12, { x: U.lerp(480, s.x, 0.3), y: U.lerp(250, s.y, 0.12), zoom: 1.2 + 0.12 * u, roll: (i % 2 ? 1 : -1) * 0.04 * (0.5 + u), yaw: (i % 2 ? -1 : 1) * 0.08 }, 'outExpo');
  });
  H.cam(at(67, 2), at(68), { x: 480, y: 280, zoom: 1.2, pitch: 0.05, roll: 0, yaw: 0 }, 'inOut');
  TL.glitch(at(67, 3, 2), at(68), 0.5);

  // ---------------------------------------------------------------- bars 68-69: he runs out of strength
  // the simulator's final slam chain: every throw is slower than the last
  // (MaxFallSpeed 750 -> 480 -> 330 -> 240 -> 60) while he tires, sweats, and nods off
  const tR = at(68);
  TL.box.set(tR, Object.assign({ draw: 0, fill: 1, alpha: 1 }, B0));
  for (let k = 0; k < 4; k++) TL.box.to(at(68, 0, k), at(68, 0, k) + 0.06, { draw: (k + 1) / 4 }, 'outExpo');
  H.sfx(tR, 'Ding', 0.5);
  TL.soulCol.set(tR, 'blue');
  TL.aura.to(tR, tR + 0.1, { v: 1 }, 'out');
  TL.soul.to(tR, tR + 0.2, { x: C0[0], y: C0[1] }, 'outExpo');
  H.cam(tR, tR + 0.3, { x: 480, y: 300, zoom: 1.5, pitch: 0.05, roll: 0, yaw: 0 }, 'outExpo');
  const tired = [
    [at(68, 0, 3), 'up', 750], [at(68, 1, 1), 'left', 750], [at(68, 1, 3), 'down', 750], [at(68, 2, 1), 'right', 750],
    [at(68, 3), 'up', 480], [at(69), 'left', 480], [at(69, 1), 'down', 330], [at(69, 2), 'right', 240], [at(69, 3), 'down', 90],
  ];
  H.gravity(tR + 0.2, at(70) - 0.01, { dir: 'down', slams: tired.map(([t, d, sp]) => [t, d, { speed: sp, idleAfter: false, vol: 0.2 + sp / 1200, shake: 3 + sp / 90, bulge: 4 + sp / 60 }]) });
  TL.head.set(at(68, 2), 'Default'); TL.sweat.set(at(68, 2), 1);
  H.say(at(68, 2), at(70) - 0.05, '* Sans看起来真的很疲惫了。', { screen: true, panel: true, scale: 2, x: 64, y: 58, fadeOut: 0.3 });
  TL.head.set(at(69), 'Tired1'); TL.sweat.set(at(69), 2);
  TL.head.set(at(69, 2), 'Tired2'); TL.sweat.set(at(69, 2), 3);
  TL.enemy.to(at(69), at(70), { sway: 0.3, handGlow: 0 }, 'inOut');
  H.cam(at(69), at(70), { x: 480, y: 250, zoom: 1.7, pitch: -0.1 }, 'inOut');
  // ... and falls asleep
  const tZ = at(70);
  TL.body.set(tZ, 'idle');
  TL.head.set(tZ, 'ClosedEyes');
  TL.soulCol.set(tZ, 'red');
  TL.aura.to(tZ, tZ + 0.2, { v: 0 }, 'out');
  TL.add({ t0: tZ, t1: at(72), z: 50, draw(ctx, emi, t) {
    for (let i = 0; i < 3; i++) {
      const u = ((t - tZ) / 1.2 + i / 3) % 1;
      D.text(ctx, 'z', ex + 26 + u * 26 + Math.sin(u * 6) * 4, ey - 150 - u * 50, { scale: 1 + (u > 0.5 ? 1 : 0), alpha: Math.sin(u * Math.PI) * 0.9 });
    }
  } });

  // ---------------------------------------------------------------- bars 70-71: the push
  // the FIGHT button is out of reach, so the soul shoves the whole battle box across
  // the screen — one heavy shove per beat, then per eighth, then per sixteenth
  const tP = at(70);
  TL.box.set(tP, { fill: 0 });
  TL.soul.to(tP, tP + 0.2, { x: B0.x + 9, y: B0.y + B0.h - 9, rot: 0, sq: 1 }, 'inOut');
  const bx = L.btnX[0], by = L.btnY;
  const UB = { x: 180, y: 382, w: B0.w, h: B0.h };
  const pushes = [at(70, 1), at(70, 2), at(70, 3), at(71, 0), at(71, 0, 2), at(71, 1), at(71, 1, 2), at(71, 2), at(71, 2, 1), at(71, 2, 2), at(71, 2, 3), at(71, 3)];
  pushes.forEach((tp, i) => {
    const f = (i + 1) / pushes.length;
    const nx = U.lerp(B0.x, UB.x, f), ny = U.lerp(B0.y, UB.y, f);
    const px = U.lerp(B0.x, UB.x, i / pushes.length) + 9, py = U.lerp(B0.y, UB.y, i / pushes.length) + B0.h - 9;
    // wind-up, then shove
    TL.soul.to(tp - 0.06, tp - 0.01, { x: px + 4, y: py - 2, sq: 0.85 }, 'out');
    TL.soul.to(tp - 0.01, tp + 0.1, { x: nx + 9, y: ny + B0.h - 9, sq: 1.3 }, 'outExpo');
    TL.soul.to(tp + 0.1, tp + 0.2, { sq: 1 }, 'out');
    TL.box.to(tp, tp + 0.1, { x: nx, y: ny }, 'outExpo');
    H.boxHit(tp, 'left', 0.85, 6 + f * 8);
    H.boxHit(tp, 'bottom', 0.1, 4 + f * 6);
    TL.impact(tp, { amp: 3 + f * 9, dx: -1, dy: 0.5, zoom: 0.02 + f * 0.04, ca: 2 + f * 5, dur: 0.3 });
    H.sfx(tp, 'Slam', 0.25 + f * 0.35);
    TL.burst(tp, { x: nx + 2, y: ny + B0.h + 3, n: 10 + R(f * 14), speed: [60, 220], ang: [-0.3, 0.6], life: [0.15, 0.4], colors: ['#ffffff', '#ffd27f'], size: [1, 3], z: 44 });
    H.cam(tp - 0.02, tp + 0.15, { x: nx + 50, y: ny + B0.h - 40, zoom: U.lerp(2.6, 1.9, f), roll: -0.05 + f * 0.08, pitch: 0.25, yaw: 0.1 }, 'outExpo');
  });
  H.cam(at(71, 3), at(71, 3, 3), { x: 300, y: 420, zoom: 1.5, roll: 0.03, pitch: 0.1, yaw: 0 }, 'outExpo');
  TL.post.to(at(70), at(72), { bloom: 1.5, vig: 0.8, ca: 1.5 }, 'in2');
  // the soul steps onto FIGHT
  const tSel = at(71, 3, 2);
  TL.soul.to(tSel - 0.08, tSel, { x: bx + 16, y: by + 21 }, 'outExpo');
  TL.soul.set(tSel + 0.001, { a: 0 });
  TL.btn[0].to(tSel, tSel + 0.01, { sel: 1 }, 'step');
  H.sfx(tSel, 'MenuSelect', 0.8);
  H.cam(tSel, at(72) - 0.01, { x: bx + 55, y: by + 21, zoom: 3.6, roll: 0, pitch: 0 }, 'in2');
  for (let s = 12; s < 16; s++) TL.glitch(at(71, 0, s), at(71, 0, s) + 0.05, 0.3 + (s - 12) * 0.15);
  const tCut = at(72);

  // ---------------------------------------------------------------- 144.04: THE CUT
  TL.btnState[0].set(tCut, 'gone');
  H.cut(tCut + 0.001, { x: 400, y: 330, zoom: 1.12, roll: 0.03, pitch: 0, yaw: 0 });
  TL.post.set(tCut, { bloom: 1, vig: 0.5, ca: 0.6 });
  TL.impact(tCut, { amp: 30, zoom: 0.2, ca: 22, flash: 1, flashCol: [1, 0.25, 0.25], inv: 0.1, bw: 0.1, rot: 0.05, dur: 1.2 });
  for (const [n, v] of [['PlayerFight', 1], ['HeartSplit', 0.8], ['Slam', 0.9], ['GasterBlast2', 0.5]]) H.sfx(tCut, n, v);
  // the button, cut in two
  TL.add({
    t0: tCut, t1: at(76), z: 31,
    draw(ctx, emi, t) {
      const img = MV.SPR.btn0h, u = t - tCut;
      const fade = t > at(75, 2) ? U.clamp(1 - (t - at(75, 2)) / 0.5) : 1;
      const halves = [[0, -1], [1, 1]];
      for (const [i, s] of halves) {
        ctx.save();
        ctx.globalAlpha = fade;
        const dx = s * (18 + 60 * (1 - Math.exp(-u * 3))), dy = s * (10 + 30 * (1 - Math.exp(-u * 3)));
        ctx.translate(R(bx + 55 + dx), R(by + 21 + dy));
        ctx.rotate(s * 0.25 * (1 - Math.exp(-u * 3)));
        ctx.drawImage(img, i * 55, 0, 55, 42, i ? 0 : -55, -21, 55, 42);
        ctx.restore();
      }
    },
  });
  TL.add({ t0: tCut, t1: tCut + 0.45, z: 60, draw(ctx, emi, t) {
    D.strike(ctx, emi, bx + 55, by + 21, (t - tCut) / 0.45, { scale: 9, rot: 0.9 });
    D.strike(ctx, emi, ex, ey - 80, (t - tCut) / 0.45, { scale: 5, rot: 0.5 });
  } });
  TL.burst(tCut, { x: bx + 55, y: by + 21, n: 60, speed: [100, 500], life: [0.3, 0.9], colors: ['#ff2020', '#ffff40', '#ffffff'], size: [2, 5], g: 400, z: 62 });
  TL.burst(tCut, { x: ex, y: ey - 80, n: 40, speed: [80, 400], life: [0.3, 0.9], colors: ['#ff2020', '#ffffff'], size: [2, 4], g: 300, z: 62 });
  TL.enemy.to(tCut, tCut + 0.05, { x: ex + 14, ghost: 0 }, 'outExpo');
  TL.enemy.to(tCut + 0.05, at(72, 1), { x: ex, sway: 0 }, 'out');
  TL.head.set(tCut, 'ClosedEyes');
  TL.sweat.set(tCut, 0);
  TL.box.set(tCut + 0.001, Object.assign({ draw: 1, fill: 0 }, UB));
  TL.box.to(at(72, 1), at(72, 3), { alpha: 0 }, 'inOut');
  // the wound stays
  TL.add({ t0: tCut + 0.45, t1: at(74), z: 58, draw(ctx, emi, t) {
    const img = MV.frame('Strike', 'Default', 3), sc = 3;
    ctx.save(); ctx.translate(ex, ey - 76); ctx.rotate(0.5);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, R(-img.width * sc / 2), R(-32 * sc), img.width * sc, img.height * sc);
    ctx.restore();
    if (emi) { emi.save(); emi.translate(ex, ey - 76); emi.rotate(0.5); emi.globalAlpha = 0.6; emi.drawImage(MV.sil(img, '#ff2020'), R(-img.width * sc / 2) - 2, R(-32 * sc) - 2, img.width * sc + 4, img.height * sc + 4); emi.restore(); emi.globalAlpha = 1; }
  } });

  // ---------------------------------------------------------------- bars 72-77: aftermath (dry riff)
  H.cam(at(72, 1), at(74), { x: 480, y: 210, zoom: 1.5, roll: 0, pitch: -0.05 }, 'inOut');
  TL.post.to(at(72), at(72, 2), { bloom: 0.8, vig: 0.6, bg: 0.3, ca: 0.3 }, 'inOut');
  // damage number, one digit per riff note; enemy HP bar drains to zero
  const r72 = H.riffTimes(72);
  TL.add({ t0: r72[0], t1: at(74), z: 61, draw(ctx, emi, t) {
    let n = 0;
    for (const tt of r72) if (t >= tt) n++;
    const str = '9'.repeat(Math.min(8, n));
    D.dmg(ctx, str, ex, ey - 190, { color: '#ff2020', align: 'center', glow: emi, glowA: 0.4 });
    const hpw = 100, u = U.clamp((t - r72[0]) / (r72[9] - r72[0]));
    D.rect(ctx, ex - hpw / 2, ey - 150, hpw, 12, '#404040');
    D.rect(ctx, ex - hpw / 2, ey - 150, hpw * (1 - MV.EASE.out(u)), 12, '#00ff00');
  } });
  r72.forEach((t, i) => H.punch(t, 0.2 + i * 0.03, { amp: 1.5 }));
  // bar 73: LV 19 -> 20, a small box, cold system text
  const r73 = H.riffTimes(73);
  TL.box.set(at(73) - 0.01, Object.assign({ draw: 0, alpha: 1, fill: 1 }, MB));
  r73.forEach((t, i) => TL.box.to(t, t + 0.06, { draw: (i + 1) / 10 }, 'outExpo'));
  H.say(at(73), at(74, 3), '* 你的 LV 提升了。', { times: r73.slice(0, 10), x: MB.x + 26, y: MB.y + 22 });
  TL.add({ t0: at(73), t1: at(76, 2), z: 32, draw(ctx, emi, t) {
    // overwrite the LV figure with 20 (flashing on the change)
    const f = t < at(73, 1) && Math.floor(t * 16) % 2;
    D.rect(ctx, L.lv + 36, L.hudY - 2, 30, 16, '#000');
    D.hud(ctx, '20', L.lv + 36, L.hudY, { color: f ? '#ffff40' : '#ffffff', glow: f ? emi : null });
  } });
  H.sfx(at(73), 'Ding', 0.6);
  TL.ring(at(73), L.lv + 30, L.hudY + 6, { r1: 40, color: '#ffff40', dur: 0.4 });
  H.cam(at(73), at(73, 2), { x: 480, y: 290, zoom: 1.12 }, 'inOut');
  // bar 74: dust
  const tDust = at(74);
  TL.head.set(at(73, 3), 'Tired1');
  TL.enemy.set(tDust, { a: 0 });
  H.dissolve(tDust, BEAT * 3.5, { x: ex - 70, y: ey - 150, w: 140, h: 150 }, (c) => D.enemy(c, null, ex, ey, { head: 'Tired1', body: 'idle', sway: 0 }), { dir: 'down', ember: '#b8b8b8', drift: 160, rise: 20, sound: 'Flash', vol: 0.2 });
  H.say(at(75), at(76, 1), '* 战斗结束。', { times: H.riffTimes(75).slice(0, 7), x: MB.x + 26, y: MB.y + 22 });
  // bar 76: the interface goes dark piece by piece
  const r76 = H.riffTimes(76);
  TL.hud.to(r76[0], r76[0] + 0.05, { nameA: 0 }, 'step');
  TL.hud.to(r76[2], r76[2] + 0.05, { lvA: 0 }, 'step');
  TL.hud.to(r76[4], r76[4] + 0.05, { barA: 0 }, 'step');
  r76.slice(5).forEach((t, i) => TL.box.to(t, t + 0.06, { draw: 1 - (i + 1) / 5 }, 'outExpo'));
  // bar 77: only the red heart is left. One question.
  TL.soul.set(at(76, 3), { a: 0, x: 480, y: 330, rot: 0, sc: 1 });
  TL.soul.to(at(77), at(77) + 0.3, { a: 1 }, 'out');
  const r77 = H.riffTimes(77);
  r77.forEach((t) => { TL.soul.to(t, t + 0.04, { sc: 1.25 }, 'out'); TL.soul.to(t + 0.04, t + 0.12, { sc: 1 }, 'in'); });
  H.cam(at(77), T.dur, { x: 480, y: 330, zoom: 1.6 }, 'in2');
  // the music stops; the question stays in the silence (T.dur..T.end)
  const tText = T.dur + 1.9, tDark = T.dur + 2.1, tBlack = T.dur + 3.2;
  H.say(r77[0], tText + 0.8, '* 这就是你想要的吗？', { screen: true, times: [r77[0], r77[0]].concat(r77.slice(1)), x: 480 - 150, y: 400, scale: 2, voice: 'BattleText', vol: 0.2, fadeOut: 0.8 });
  H.cam(T.dur, T.end, { x: 480, y: 330, zoom: 2.0 }, 'out2');
  // two slow, quiet heartbeats with nothing left to fight
  [[T.dur + 0.7, 1.14], [T.dur + 0.9, 1.07], [T.dur + 1.9, 1.1], [T.dur + 2.1, 1.04]].forEach(([t, k]) => {
    TL.soul.to(t, t + 0.06, { sc: k }, 'out'); TL.soul.to(t + 0.06, t + 0.2, { sc: 1 }, 'in');
  });
  TL.soul.to(tDark, tBlack, { a: 0 }, 'in2');
  TL.post.to(T.dur, tBlack, { bloom: 0.5, ca: 0.1 }, 'out');
  TL.add({ t0: tDark, t1: T.end + 1, z: 200, screen: true, draw(ctx, emi, t) {
    ctx.fillStyle = `rgba(0,0,0,${MV.EASE.inOut(U.clamp((t - tDark) / (tBlack - tDark))).toFixed(3)})`;
    ctx.fillRect(0, 0, 960, 540);
  } });
});
