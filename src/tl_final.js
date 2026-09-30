// Bars 56-63: the world spins with gravity, then the dimension breaks and the
// camera drops INTO the soul: a first-person voxel arena under a giant judge.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const B0 = L.box, C0 = H.C0;
  const [ex, ey] = L.enemy;
  const R = Math.round;

  // ---------------------------------------------------------------- bars 56-57: the blaster dragon
  // Bar 56: nine skulls strung on a spine of bones coil around the arena; one fires on each
  // offbeat, then on every eighth. Bar 57: on the downbeat the spine bursts and the skulls break
  // loose into a ring of free blasters circling the arena, firing in crossing pairs on the eighths;
  // on beat 4 the ring snaps tight and all nine turn in, and on the last stab they fire at once,
  // each aimed just past the middle: a pinwheel of beams around the soul.
  const t0 = at(56), tSep = at(57);
  H.bigHit(t0);
  H.sfx(t0, 'GasterBlaster', 0.6);
  TL.post.set(t0, { bloom: 1, vig: 0.45, bg: 1, ca: 0.6, tint: 0, desat: 0 });
  H.box(t0, t0 + 0.2, B0, 'outBack');
  TL.soulCol.set(t0, 'red');
  TL.aura.set(t0, { v: 0 });
  TL.soul.set(t0, { x: C0[0], y: C0[1], rot: 0, sc: 1, sq: 1, a: 1 });
  TL.head.set(t0, 'BlueEye');
  const N = 9, LAG = 0.14, t1 = at(58), AIM = 0.25, HITW = 0.13, RING = 192;
  const headAng = (t) => -Math.PI / 2 + (t - t0) * 2.6;
  const path = (t) => {
    const a = headAng(t), r = 175 + 30 * Math.sin(a * 3);
    const enter = MV.EASE.outExpo(U.clamp((t - t0 + 0.6) / 1.0));
    return [C0[0] + Math.cos(a) * r * (0.6 + 0.4 * enter) + (1 - enter) * -500, C0[1] + Math.sin(a) * r * 0.82];
  };
  const snake = (i, t) => path(t - i * LAG);
  // once it breaks, skull i flies out to its own place on an evenly spaced ring that turns slowly
  const ringAng = (i, t) => headAng(tSep) - (i * U.TAU) / N + (t - tSep) * 0.7;
  const free = (i, t) => { const a = ringAng(i, t); return [C0[0] + Math.cos(a) * RING, C0[1] + Math.sin(a) * RING * 0.82]; };
  // the ring snaps tight for the last volley; when the soul drops into the shaft (bar 58) every
  // skull is swept up out of the picture
  const coil = (t) => 1 - 0.18 * MV.EASE.outExpo(U.clamp((t - at(57, 3)) / 0.2));
  const swept = (t) => (t > t1 ? -300 * (t - t1) - 900 * (t - t1) ** 2 : 0);
  const seg = (i, t) => {
    let p = snake(i, Math.min(t, tSep));
    if (t > tSep) { const u = MV.EASE.outBack(U.clamp((t - tSep) / 0.35)), q = free(i, t); p = [U.lerp(p[0], q[0], u), U.lerp(p[1], q[1], u)]; }
    const c = coil(t);
    return [C0[0] + (p[0] - C0[0]) * c, C0[1] + (p[1] - C0[1]) * c + swept(t)];
  };
  // every shot lands on the song's offbeat chord stab (the "and" of each beat): one skull at a time
  // from the snake in bar 56, crossing pairs from the ring in bar 57, the pinwheel on the last one
  const fires = [];
  [[0, 0], [1, 3], [2, 6], [3, 1]].forEach(([b, i]) => fires.push({ t: at(56, b, 2), i }));
  [[0, 0, 2], [1, 4, 6], [2, 8, 1]].forEach(([b, i, j]) => fires.push({ t: at(57, b, 2), i }, { t: at(57, b, 2), i: j }));
  for (let i = 0; i < N; i++) fires.push({ t: at(57, 3, 2), i, off: 36 });
  const fireAng = (f, t) => {
    const [x, y] = seg(f.i, t), a = Math.atan2(C0[1] - y, C0[0] - x);
    if (!f.off) return a;
    return Math.atan2(C0[1] + Math.cos(a) * f.off - y, C0[0] - Math.sin(a) * f.off - x);
  };
  const fireTimes = [...new Set(fires.map((f) => f.t))];
  // a skull's beam in progress wins over the aim for its next shot
  const shotOf = (i, t) => {
    let live = null, next = null;
    for (const f of fires) {
      if (f.i !== i) continue;
      if (t >= f.t && t < f.t + 0.3) live = f;
      else if (!next && t >= f.t - AIM && t < f.t) next = f;
    }
    return live || next;
  };
  // the spine as it was when it broke: its bones fly apart and fade
  const joints = [];
  for (let i = 0; i < N; i++) joints.push(snake(i, tSep));
  TL.add({
    t0: t0 - 0.2, t1: t1 + 0.4, z: 36, kind: 'beam',
    draw(ctx, emi, t) {
      const out = t > t1 ? (t - t1) / 0.4 : 0;
      for (let i = 0; i < N - 1; i++) {
        if (t < tSep) {
          const [x0, y0] = seg(i, t), [x1, y1] = seg(i + 1, t);
          D.bone(ctx, emi, x0, y0, Math.atan2(y1 - y0, x1 - x0), Math.hypot(x1 - x0, y1 - y0), { w: 8, glow: 0.4 });
        } else if (t < tSep + 0.6) {
          const [x0, y0] = joints[i], [x1, y1] = joints[i + 1], u = t - tSep;
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, oa = Math.atan2(my - C0[1], mx - C0[0]), L = Math.hypot(x1 - x0, y1 - y0);
          const cx = mx + Math.cos(oa) * 260 * u, cy = my + Math.sin(oa) * 260 * u + 500 * u * u, ang = Math.atan2(y1 - y0, x1 - x0) + (i % 2 ? 1 : -1) * 9 * u;
          D.bone(ctx, emi, cx - (Math.cos(ang) * L) / 2, cy - (Math.sin(ang) * L) / 2, ang, L, { w: 8, alpha: 1 - u / 0.6, glow: 0.4 });
        }
      }
      for (let i = N - 1; i >= 0; i--) {
        const [x, y] = seg(i, t), [xn, yn] = seg(i, t - 0.02);
        let ang = t < tSep ? Math.atan2(y - yn, x - xn) : Math.atan2(C0[1] - y, C0[0] - x), open = 0, charge = 0;
        const f = shotOf(i, t);
        if (f) {
          const dtf = t - f.t;
          ang = fireAng(f, t); charge = U.clamp((dtf + AIM) / (AIM * 0.8)); open = dtf > -0.05 ? U.clamp(1 - Math.max(0, dtf - HITW) / 0.15) : 0;
        }
        D.cannon(ctx, emi, x, y, ang, { scale: 1.5, open, charge, alpha: 1 - out, t, seed: i });
        if (f && t >= f.t && t < f.t + HITW + 0.07) {
          const [mx, my] = D.mouth(x, y, ang, 1.5);
          D.beam(ctx, emi, mx, my, ang, { w: 30 * (1 - Math.max(0, t - f.t - HITW) / 0.07), t });
        }
      }
    },
    hit(t, px, py) {
      for (const f of fires) {
        if (t < f.t || t > f.t + HITW) continue;
        const [x, y] = seg(f.i, t), ang = fireAng(f, t), [mx, my] = D.mouth(x, y, ang, 1.5);
        if (D.beamHit(mx, my, ang, 30, px, py, 5)) return true;
      }
      return false;
    },
  });
  // the break: a burst at every joint, the skulls cry out
  H.bigHit(tSep, { flash: 0.25, inv: 0, bw: 0 });
  H.sfx(tSep, 'BoneStab', 0.55);
  H.sfx(tSep, 'GasterBlaster', 0.55);
  for (const [x, y] of joints) TL.burst(tSep, { x, y, n: 10, speed: [80, 240], life: [0.2, 0.45], colors: ['#ffffff', '#c9cede'], size: [2, 3], z: 46 });
  // (the portrait framing keeps every skull in shot once the snake has arrived - from the drop,
  // which it treats as a cut, so the dive into it stays a dive)
  for (let i = 0; i < N; i++) TL.focus.push({ t0: t0, t1: t1, pos: (t) => seg(i, Math.max(t, t0 + 0.4)), r: 34 });
  TL.frameCuts.push(t0);
  fireTimes.forEach((tf) => {
    const n = fires.filter((f) => f.t === tf).length;
    H.sfx(tf, n > 2 ? 'GasterBlast2' : 'GasterBlast', n > 2 ? 0.7 : 0.4 + 0.1 * (n - 1));
    if (n > 2) H.bigHit(tf, { flash: 0.3, flashCol: [0.75, 0.95, 1] });
    else H.hit(tf, 0.55 + 0.2 * (n - 1));
  });

  // the soul: one small, exact step on every beat - the shot follows on the "and" - to wherever all
  // the beams that are live until its next step (they sweep round with the skulls) stay furthest
  // away, by the shortest way; for the pinwheel it stands dead centre
  const lineDist = (q, f, t) => { const [x, y] = seg(f.i, t), a = fireAng(f, t); return Math.abs((q[0] - x) * Math.sin(a) - (q[1] - y) * Math.cos(a)); };
  const clear = (q, ta, tb) => {
    let m = 1e9;
    for (const f of fires) {
      const a = Math.max(ta, f.t), b = Math.min(tb, f.t + HITW);
      for (let t = a; t <= b; t += 1 / 120) m = Math.min(m, lineDist(q, f, t));
    }
    return m;
  };
  let Pq = [C0[0], C0[1]];
  fireTimes.forEach((tf, k) => {
    const tm = tf - BEAT / 2, dur = 0.07, tNext = k + 1 < fireTimes.length ? fireTimes[k + 1] - BEAT / 2 : t1;
    if (fires.find((f) => f.t === tf).off) { TL.soul.to(at(57, 3), at(57, 3) + 0.06, { x: C0[0], y: C0[1] }, 'outExpo'); Pq = [C0[0], C0[1]]; return; }
    let best = null;
    for (const r of [50, 42, 58]) for (let j = 0; j < 60; j++) {
      const p = (j / 60) * U.TAU, Q = [C0[0] + Math.cos(p) * r, C0[1] + Math.sin(p) * r];
      let m = clear(Q, tm + dur, tNext);
      for (const u of [0.3, 0.6, 1]) m = Math.min(m, clear([U.lerp(Pq[0], Q[0], u), U.lerp(Pq[1], Q[1], u)], tm + dur * u * 0.7, tm + dur * u));
      const s = Math.min(m, 30) * 10 - Math.hypot(Q[0] - Pq[0], Q[1] - Pq[1]) * 0.3;
      if (!best || s > best.s) best = { Q, s, m };
    }
    if (best.m < 22) console.warn('dragon: tight step at', tf.toFixed(3), best.m.toFixed(1));
    TL.soul.to(tm, tm + dur, { x: best.Q[0], y: best.Q[1] }, 'outExpo');
    H.punch(tm, 0.25);
    Pq = best.Q;
  });

  // Sans conducts it: a throw on every beat, both hands up as it breaks loose
  const hands = ['HandLeft', 'HandUp', 'HandRight', 'HandDown'];
  for (let b = 0; b < 8; b++) TL.body.set(at(56, b), b === 4 ? 'HandUp' : hands[b % 4]);
  TL.enemy.to(t0, t0 + 0.1, { handGlow: 0.6 }, 'out');
  // camera: a step closer on every shot and a kick away from each beam (as a shake: a keyframed
  // jerk on every offbeat would smear); it opens up again as the ring flies apart, drifting round
  // with it; the heavy snare on beat 4 lands harder
  H.cam(t0, t0 + 0.12, { x: 480, y: 318, zoom: 1.0, pitch: 0.24, yaw: 0, roll: 0 }, 'outExpo');
  fireTimes.forEach((tf, k) => {
    const a = fireAng(fires.find((f) => f.t === tf), tf), last = k === fireTimes.length - 1;
    const z = last ? 1.5 : tf < tSep ? 1.0 + 0.04 * (k + 1) : 0.95 + 0.08 * (k - 3);
    H.cam(tf, tf + 0.08, { zoom: z }, 'outExpo');
    if (!last) TL.impact(tf, { amp: 3, dx: Math.cos(a), dy: Math.sin(a), rot: (k % 2 ? 1 : -1) * 0.025, dur: 0.25 });
  });
  H.cam(tSep, tSep + 0.2, { zoom: 0.95, roll: 0 }, 'outExpo');
  H.cam(tSep + 0.2, at(57, 3, 2), { roll: 0.12 }, 'inOut');
  for (const tb of [at(56, 3), at(57, 3)]) H.hit(tb, 0.5);
  TL.post.to(tSep, tSep + 0.04, { bgHue: 0, bg: 1.8 }, 'out'); TL.post.to(tSep + 0.04, tSep + 0.4, { bgHue: 1, bg: 1 }, 'in');
  TL.post.to(tSep, at(57, 3, 2), { ca: 1.2 }, 'in');
  // ---------------------------------------------------------------- bars 58-59: the falling shaft
  // His hand comes down: the soul turns blue and is pressed onto the floor, the floor gives way, and
  // it falls. The arena stretches into a shaft, the camera drops ahead of the soul (so it rises to
  // the top of the frame while the speed lines pick up) and everything above is swept away. Ledges
  // of bone rush up past it, on the riff, then every sixteenth; blasters under the shaft fire up the
  // free lanes. At the bottom the floor comes up to meet it.
  const tS = at(58), tLand = at(59, 3), tBreak = tS + 0.07;
  const SB = { x: 405, y: 244, w: 150, h: 176 };
  const FY = SB.y + 60, up = 1050, FLOOR = B0.y + B0.h - 8;
  // wind-up on the last sixteenth of bar 57 (the pinwheel is still firing), then the hand comes down
  TL.body.set(tS - S16, 'HandUp');
  TL.enemy.to(tS - S16, tS, { handGlow: 0.9 }, 'out');
  TL.body.set(tS, 'HandDown');
  TL.head.set(tS, 'BlueEye');
  TL.soulCol.set(tS, 'blue');
  TL.aura.to(tS, tS + 0.1, { v: 1 }, 'out');
  H.sfx(tS, 'Ding', 0.5);
  TL.ring(tS, C0[0], C0[1], { r0: 6, r1: 50, color: '#2a6bff', w: 3, dur: 0.3 });
  TL.soul.to(tS, tBreak, { x: 480, y: FLOOR, rot: 0, sq: 1.4 }, 'in2');
  // the floor gives way under it
  H.boxHit(tBreak, 'bottom', 0.5, 12);
  H.sfx(tBreak, 'Slam', 0.5);
  H.hit(tBreak, 0.6, { dy: 1, dur: 0.3, flashCol: [0.3, 0.5, 1] });
  H.gap(tBreak, tLand - 0.1, 'bottom', -0.1, 1.1);
  H.shatter(tBreak, { x: B0.x - 5, y: B0.y + B0.h, w: B0.w + 10, h: 5 }, (c) => D.rect(c, B0.x - 5, B0.y + B0.h, B0.w + 10, 5, '#ffffff'), { chunk: 5, force: 140, up: -160, dur: 0.9, sound: false });
  // through the hole, then the camera catches up: the soul settles near the top of the shaft
  TL.soul.to(tBreak, tBreak + 0.08, { y: FLOOR + 14, sq: 1.35 }, 'in2');
  TL.soul.to(tBreak + 0.08, at(58, 0, 3), { y: FY, sq: 1 }, 'inOut');
  H.box(tBreak, tBreak + 0.3, SB, 'outExpo');
  TL.enemy.to(tLand, tLand + 0.3, { handGlow: 0.2 }, 'out');
  // speed lines streaming up, picking up speed as it falls
  const fall = (t) => { const u = Math.max(0, t - tBreak); return up * 1.4 * (u - 0.15 * (1 - Math.exp(-u / 0.15))); };
  TL.add({ t0: tBreak, t1: tLand + 0.05, z: 3, clip: 'box', draw(ctx, emi, t) {
    const a = U.clamp((t - tBreak) / 0.1) * 0.45;
    for (let i = 0; i < 30; i++) {
      const x = SB.x + 4 + U.hash(i) * (SB.w - 8), ph = (U.hash(i + 9) * 520 + fall(t)) % 520;
      D.rect(ctx, x, SB.y + SB.h + 80 - ph, 1, 24 + U.hash(i + 3) * 24, i % 3 ? '#6fa0ff' : '#ffffff', a);
    }
  } });
  // Blasters pop up under the soul's own lane and fire straight up it on the drums - on the beats,
  // then on every eighth from 58.3 - and the soul steps out of the lane just before each shot.
  // Ledges of bone rush up past it on the riff's accents in bar 58 and on the eighths in bar 59;
  // each ledge's gap is wherever the soul has dodged to.
  const lanes = [436, 480, 524];
  const tAt = (s) => at(58, 0, s);
  const shotSlots = [4, 8, 12, 14, 16, 18, 20, 22, 24, 26];
  const ledgeSlots = [4, 7, 9, 11, 14, 16, 18, 20, 22, 24, 26];
  // its lane: ping-pong through the middle, jumping right across on the downbeat and beat 3 of 59
  const jumps = new Set([16, 24]);
  const moves = []; // [t, dur, lane]
  let lane = 1, dir = -1;
  shotSlots.forEach((s, k) => {
    const tf = tAt(s), wide = !k || tf - tAt(shotSlots[k - 1]) > S16 + 1e-6;
    const lx = lanes[lane], tSp = tf - 0.25;
    H.cannon({ tSpawn: tSp, fires: [tf], beamDur: 0.1, fall: 0.08, scale: 1.3, vol: 0.3, shake: 0.5,
      pos: (t) => ({ x: lx, y: SB.y + SB.h + U.lerp(150, 60, MV.EASE.outExpo(U.clamp((t - tSp) / 0.12))), ang: -Math.PI / 2 }) });
    let next = lane + dir;
    if (jumps.has(s) && lane !== 1) next = 2 - lane;
    else if (next < 0 || next > 2) { dir = -dir; next = lane + dir; }
    if (next === 0) dir = 1; else if (next === 2) dir = -1;
    moves.push([tf - (wide ? 0.09 : 0.05), wide ? 0.05 : 0.035, next]);
    lane = next;
  });
  moves.forEach(([tm, dur, ln]) => {
    TL.soul.to(tm, tm + dur, { x: lanes[ln], sq: 0.8 }, 'outExpo');
    TL.soul.to(tm + dur, tm + dur + 0.04, { sq: 1 }, 'out');
    H.cam(tm, tm + 0.1, { x: 480 + (lanes[ln] - 480) * 0.2, roll: (lanes[ln] - 480) / 900 }, 'outExpo');
  });
  const laneAt = (t) => { let l = 1; for (const [tm, , ln] of moves) if (t >= tm) l = ln; return l; };
  ledgeSlots.forEach((s, k) => {
    const tc = tAt(s), gapX = lanes[laneAt(tc)];
    const yAt = (t) => FY + (tc - t) * up;
    const wL = gapX - 22 - SB.x, wR = SB.x + SB.w - (gapX + 22);
    if (wL > 4) H.bone({ t0: tc - 0.35, t1: tc + 0.3, w: 12, geo: (t) => ({ x: SB.x - 4, y: yAt(t), ang: 0, len: wL + 4 }) });
    if (wR > 4) H.bone({ t0: tc - 0.35, t1: tc + 0.3, w: 12, geo: (t) => ({ x: SB.x + SB.w + 4, y: yAt(t), ang: Math.PI, len: wR + 4 }) });
    const onBeat = Math.abs(T.beatOf(tc) - Math.round(T.beatOf(tc))) < 1e-3;
    H.punch(tc, onBeat ? 0.85 : 0.32, { dy: -1 });
    H.sfx(tc - 0.03, 'BoneStab', 0.18);
  });  // camera: follows the drop and tilts into the shaft, then takes one step down it on every beat
  H.cam(tS, tBreak + 0.35, { x: 480, y: 336, zoom: 1.75, pitch: 0.45, roll: 0, yaw: 0 }, 'inOut');
  for (let b = 1; b < 7; b++) H.cam(at(58, b), at(58, b) + 0.08, { zoom: 1.75 + 0.1 * b, pitch: 0.45 + 0.02 * b }, 'outExpo');
  TL.post.to(tS, at(59, 3), { bloom: 1.2, ca: 0.9 }, 'in');

  // ---------------------------------------------------------------- 59.3: slammed straight into first person
  // No landing and settling: as the floor comes up out of the depth the picture drops into the voxel
  // world with the soul, the view plunges onto it (accelerating), goes through the heart on the
  // impact itself - beat 4 - and looks up; first person is there by the next eighth, and bar 60
  // starts on its downbeat.
  TL.box.set(tLand - 0.1, Object.assign({}, SB, { h: 480 }));
  TL.box.to(tLand - 0.1, tLand, B0, 'in2');
  const HX = 480, HY = B0.y + B0.h - 8;
  TL.soul.to(tLand - 0.06, tLand, { x: HX, y: HY, rot: 0, sq: 1.5 }, 'inExpo');
  H.sfx(tLand, 'Slam', 0.8);
  H.sfx(tLand, 'Ding', 0.35);
  H.hit(tLand, 1, { flash: 0.7, flashCol: [0.35, 0.55, 1], dur: 0.35 });
  TL.post.to(tLand, at(60), { bg: 0, grid: 0, bloom: 1, ca: 0.6 }, 'inOut');
  TL.hud.to(tLand, tLand + 0.2, { a: 0 }, 'out');
  TL.hud.to(at(63, 3), at(64), { a: 1 }, 'in');
  TL.body.set(tLand, 'idle');
  const p0 = tLand - 0.1, p1 = at(64);
  H.cut(p0, { x: 480, y: 344, zoom: 3.3, pitch: 0, roll: 0, yaw: 0 }); // (the 2D camera holds still under the voxel pass)
  TL.glitch(p0 - 0.04, p0 + 0.04, 0.6);
  TL.soul.set(p0, { a: 0 });

  // ---------------------------------------------------------------- bars 60-63: FIRST PERSON (voxel)
  const tDive = tLand, tEye = tLand + BEAT / 2;
  const cam = new MV.Track({ x: HX, y: HY + 34, z: 120, yaw: 0, pitch: -1.3, roll: 0, fov: 0.95 });
  cam.to(p0, tDive, { y: HY, z: 5, pitch: -1.5 }, 'in2');
  cam.to(tDive, tEye, { y: 392, z: 8, pitch: 0.05, fov: 1.35 }, 'outExpo');
  const grow = (t) => MV.EASE.outExpo(U.clamp((t - p0) / 0.3));
  const V3 = MV.V3;
  const WHITE = [1, 1, 1], BLUE = [0.08, 0.66, 1];
  const bones3 = []; // {t0, t1, geo(t) -> {a, b, w, blue}}
  const cannons3 = []; // {t0, fire, dur, pos(t)->[x,y,z], target:[x,y,z], w}
  // the soul itself as voxels (seen from above until the plunge goes through it)
  let heartPx = null;
  const heartVox = (v, t) => {
    if (!heartPx) {
      const img = MV.SPR.soul_blue, c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      heartPx = [];
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 128) heartPx.push([x - c.width / 2, y - c.height / 2]);
    }
    for (const [x, y] of heartPx) v.box(HX + x, HY + y, 0, 1, 1, 1.5, [0.1, 0.45, 1], 0.9);
  };

  // bar 60: from its downbeat, a row of bone pillars erupts from the floor on every eighth, far
  // ahead, rolls at the camera and goes past it through its gap on the next eighth, then sinks away
  // behind; the camera slips into each gap just before its row arrives
  const EYE0 = 392, VR = 440; // (a row crosses the eye an eighth after it erupts)
  const rowT = [at(60), at(60, 0, 2), at(60, 1), at(60, 1, 2), at(60, 2), at(60, 2, 2), at(60, 3)];
  rowT.forEach((tk, k) => {
    const tc = tk + BEAT / 2, gx = [450, 510, 440, 520, 470, 500, 480][k];
    const yAt = (t) => EYE0 + (t - tc) * VR;
    for (let x = B0.x + 8; x < B0.x + B0.w; x += 13) {
      if (Math.abs(x - gx) < 16) continue;
      const h = 34 + ((x * 7 + k * 13) % 23);
      bones3.push({ t0: tk - 0.05, t1: tc + 0.35, geo: (t) => {
        const upk = MV.EASE.outExpo(U.clamp((t - tk + 0.05) / 0.08));
        const dn = MV.EASE.in(U.clamp((t - tc - 0.1) / 0.2));
        const z = -h - 8 + (h + 8) * upk * (1 - dn);
        return { a: [x, yAt(t), z], b: [x, yAt(t), z + h], w: 10 };
      } });
    }
    H.sfx(tk, 'BoneStab', 0.4);
    H.punch(tk, 0.35);
    cam.to(tc - 0.12, tc - 0.04, { x: gx, roll: (gx - 480) / 400 }, 'outExpo');
    H.punch(tc, 0.45);
  });
  cam.to(at(60, 3, 2) + 0.06, at(61), { x: 480, roll: 0 }, 'outExpo');
  // bar 61: one bone every eighth, sliding at you along a corridor of rails:
  // jump the low ones, duck the high ones, freeze for blue, strafe through the fences
  const VS = 640, EYE = 392;
  for (const side of [B0.x + 10, B0.x + B0.w - 10])
    for (let j = 0; j < 14; j++) {
      const ta = at(61) - 0.5 + j * 0.16;
      bones3.push({ t0: ta, t1: ta + 0.95, geo: (t) => { const y = 120 + (t - ta) * VS; return { a: [side, y, 2], b: [side, y + 34, 2], w: 8 }; } });
    }
  const kinds = ['low', 'high', 'low', 'blue', 'high', 'low', 'fenceL', 'fenceR'];
  kinds.forEach((kind, k) => {
    const tc = at(61, 0, k * 2);
    const yAt = (t) => EYE + (t - tc) * VS;
    const life = { t0: tc - 0.5, t1: tc + 0.15, glow: 0.35 };
    if (kind === 'low' || kind === 'high') {
      const z = kind === 'low' ? 4 : 23;
      bones3.push(Object.assign({ geo: (t) => ({ a: [B0.x + 4, yAt(t), z], b: [B0.x + B0.w - 4, yAt(t), z], w: 16 }) }, life));
      if (kind === 'low') {
        cam.hop(tc - 0.11, tc + 0.11, { z: 8 }, -24, 'z', 'lin');
        cam.to(tc - 0.11, tc, { pitch: -0.42 }, 'out'); cam.to(tc, tc + 0.12, { pitch: 0.05 }, 'inOut');
      } else {
        cam.to(tc - 0.1, tc - 0.03, { z: 2.5, pitch: 0.4 }, 'outExpo'); cam.to(tc + 0.04, tc + 0.12, { z: 8, pitch: 0.05 }, 'outExpo');
      }
      H.sfx(tc - 0.05, 'BoneStab', 0.3);
    } else if (kind === 'blue') {
      for (let j = 0; j < 5; j++) bones3.push(Object.assign({ geo: (t) => ({ a: [B0.x + 4, yAt(t), j * 12], b: [B0.x + B0.w - 4, yAt(t), j * 12], w: 12, blue: true }) }, life));
      TL.post.to(tc - 0.1, tc, { desat: 0.6, tint: 1 }, 'out');
      TL.post.to(tc + 0.08, tc + 0.2, { desat: 0, tint: 0 }, 'inOut');
      cam.to(tc - 0.1, tc + 0.1, { z: 8 }, 'lin'); // frozen
    } else {
      // a fence of standing bones with one gap: strafe into it
      const gx = kind === 'fenceL' ? 440 : 520;
      for (let x = B0.x + 8; x < B0.x + B0.w; x += 12) {
        if (Math.abs(x - gx) < 18) continue;
        bones3.push(Object.assign({ geo: (t) => ({ a: [x, yAt(t), 0], b: [x, yAt(t), 58], w: 11 }) }, life));
      }
      cam.to(tc - 0.12, tc - 0.04, { x: gx, roll: (gx - 480) / 300 }, 'outExpo');
      H.sfx(tc - 0.05, 'BoneStab', 0.35);
    }
    H.punch(tc, k % 2 ? 0.45 : 0.7);
  });
  cam.to(at(61, 3, 3), at(62), { x: 480, roll: 0 }, 'outExpo');

  // bar 62: blasters at point-blank range. Every beam passes within a few steps of the camera.
  const blaster = (tSp, tf, p, target, o = {}) => {
    cannons3.push({ t0: tSp, fire: tf, dur: o.dur || 0.22, w: o.w || 14, scripted: !!o.hit, pos: (t) => { const u = MV.EASE.outExpo(U.clamp((t - tSp) / 0.14)); return [p[0], p[1], p[2] - (1 - u) * 30]; }, target });
    H.sfx(tSp, 'GasterBlaster', 0.35);
    H.sfx(tf, 'GasterBlast', 0.55);
    H.hit(tf, 1.1, { flash: 0.25, flashCol: [0.75, 0.95, 1] });
  };
  // beat 1: a pair in front, fire down both sides of the camera — a corridor of light
  blaster(at(62) - 0.25, at(62), [436, 300, 14], [458, 560, 10]);
  blaster(at(62) - 0.25, at(62), [524, 300, 14], [502, 560, 10]);
  cam.to(at(62) - 0.05, at(62) + 0.25, { fov: 1.55 }, 'outExpo');
  cam.to(at(62, 0, 2), at(62, 1), { fov: 1.35 }, 'inOut');
  // beat 2: one face to face; sidestep on the sixteenth before it fires
  blaster(at(62, 1) - 0.25, at(62, 1, 1), [480, 318, 10], [480, 700, 8], { w: 16 });
  cam.to(at(62, 1) + 0.02, at(62, 1) + 0.1, { x: 446, roll: -0.18 }, 'outExpo');
  cam.to(at(62, 1, 2), at(62, 2), { roll: 0 }, 'inOut');
  // beat 3: one from behind, over the head; duck
  blaster(at(62, 2) - 0.25, at(62, 2, 1), [446, 520, 44], [446, 80, 28]);
  cam.to(at(62, 2) - 0.02, at(62, 2) + 0.06, { z: 3, pitch: 0.18 }, 'outExpo');
  cam.to(at(62, 2, 2), at(62, 3), { z: 8, pitch: 0.05, x: 480 }, 'inOut');
  // beat 4: the camera whips round; one blaster per sixteenth, each beam grazing the eye -
  // and the last one, dead ahead, does not miss
  cam.to(at(62, 2, 2), at(63), { yaw: U.TAU }, 'inOut');
  const tBeamHit = at(62, 3, 3);
  for (let i = 0; i < 4; i++) {
    const tf = at(62, 3, i), yw = cam.at(tf).yaw + 0.05, hit = i === 3;
    const f = [Math.sin(yw), -Math.cos(yw)], sd = [Math.cos(yw), Math.sin(yw)], s = hit ? 0 : i % 2 ? 1 : -1;
    const p = [480 + f[0] * 95 + sd[0] * s * 8, EYE + f[1] * 95 + sd[1] * s * 8, 12];
    const tg = [480 - f[0] * 200 + sd[0] * s * 30, EYE - f[1] * 200 + sd[1] * s * 30, 8];
    blaster(tf - 0.2, tf, p, tg, { dur: 0.12, w: 12, hit });
  }
  // the hit knocks the view back and up for a moment
  cam.to(tBeamHit, tBeamHit + 0.05, { z: 14, pitch: 0.3 }, 'outExpo');
  cam.to(tBeamHit + 0.05, at(63), { z: 8, pitch: 0.05 }, 'inOut');
  cam.set(at(63) + 0.001, { yaw: 0 });

  // bar 63: gravity grabs the camera: slammed into the east wall, then ripped out of first person
  const tw = at(63, 1);
  TL.post.to(at(63), at(63) + 0.1, { tint: 1 }, 'out');
  cam.to(at(63), tw - 0.1, { z: 12 }, 'out');
  cam.to(tw - 0.1, tw, { x: B0.x + B0.w - 10, roll: Math.PI / 2, yaw: 0.6 }, 'inExpo');
  H.bigHit(tw, { flashCol: [0.3, 0.5, 1], inv: 0.05, bw: 0.05 });
  H.sfx(tw, 'Slam', 0.8);
  for (let i = 0; i < 6; i++) {
    const yy = 300 + i * 20, th = tw + 0.08;
    bones3.push({ t0: th - 0.05, t1: at(63, 3), geo: (t) => { const k = MV.EASE.outExpo(U.clamp((t - th + 0.05) / 0.06)); return { a: [B0.x + B0.w, yy, 6], b: [B0.x + B0.w - 40 * k, yy, 6], w: 10 }; } });
  }
  // two hits in first person: the blaster beam at the end of bar 62, then the bones out of the
  // wall. Karma exactly as the simulator runs it: a hit takes HP and adds KR (capped at 40 and
  // never more than HP - 1, so karma cannot kill); KR then drains 1 HP per tick, and the tick
  // gets slower as KR falls (>=40: 1/30 s, >=30: 1/15 s, >=20: 1/6 s, >=10: 1/2 s, else 1 s).
  // The wall poisons almost everything that is left, so the purple keeps ticking through the rest
  // of the fight and runs out on the last HP point during the final push.
  const tHurt = tw + 0.1;
  const hits = [{ t: tBeamHit + 0.02, dmg: 8, kr: 16 }, { t: tHurt, dmg: 12, kr: 30 }];
  let tOne = null;
  {
    let hp = TL.hud.at(hits[0].t - 0.01).hp, kr = 0, krT = 0, hi = 0;
    const keys = [];
    for (let t = hits[0].t; t < T.dur; t += 1 / 60) {
      while (hi < hits.length && t >= hits[hi].t) {
        hp -= hits[hi].dmg; kr = Math.min(40, kr + hits[hi].kr, hp - 1); krT = 0;
        keys.push({ t: hits[hi].t, hp, kr, hit: true }); hi++;
      }
      if (kr > 0 && hp > 1) {
        krT += 1 / 60;
        const need = kr >= 40 ? 0.033 : kr >= 30 ? 0.066 : kr >= 20 ? 0.166 : kr >= 10 ? 0.5 : 1;
        if (krT >= need) { kr--; hp--; krT = 0; keys.push({ t, hp, kr }); }
      } else if (hi >= hits.length) break;
    }
    // the last point goes on a beat
    const last = keys[keys.length - 1];
    if (last.hp === 1 && !last.hit) { last.t = at(Math.floor(T.barOf(last.t)), Math.round((T.beatOf(last.t) % 4 + 4) % 4)); tOne = last.t; }
    for (const k of keys) TL.hud.to(k.t - (k.hit ? 0 : 0.005), k.t + (k.hit ? 0.04 : 0), { hp: k.hp, kr: k.kr }, k.hit ? 'outExpo' : 'step');
    for (const h of hits) {
      H.sfx(h.t, 'PlayerDamaged', 0.7);
      TL.impact(h.t, { amp: 8, ca: 6, flash: 0.5, flashCol: [1, 0.2, 0.25], dur: 0.35 });
    }
  }
  // HP 1: the bar gives a last jolt
  if (tOne) {
    TL.hud.to(tOne, tOne + 0.04, { barDy: 3 }, 'outExpo');
    TL.hud.to(tOne + 0.04, tOne + 0.3, { barDy: 0 }, 'outElastic');
  }
  const hurtAt = (t) => { let last = -1e9; for (const h of hits) if (t >= h.t - 0.02) last = h.t; return last; };
  TL.add({
    t0: hits[0].t - 0.02, t1: p1, z: 90, screen: true,
    draw(ctx, emi, t) {
      const h = TL.hud.at(t), a = U.clamp((t - hits[0].t + 0.02) / 0.05) * U.clamp((p1 - t) / 0.1);
      const k = U.clamp(1 - (t - hurtAt(t)) / 0.4), sx = R(U.noise(t * 90) * 6 * k), sy = R(U.noise(t * 97 + 5) * 4 * k);
      // same layout as the HUD row: HP, bar, KR, number (purple while karma is draining)
      const x = (MV.PORTRAIT ? MV.SW / 2 - 90 : 378) + sx, y = (MV.PORTRAIT ? 700 : 486) + sy, kr = h.kr > 0.5, col = kr ? MV.COL.kr : '#ffffff';
      ctx.globalAlpha = a;
      ctx.drawImage(MV.SPR.hpLabel, x - 31, y + 6);
      ctx.drawImage(kr ? MV.SPR.krLabelKR : MV.SPR.krLabel, x + 118, y + 6);
      ctx.globalAlpha = 1;
      D.hpBar(ctx, null, x, y, h.hp, h.kr, 92, a);
      D.hud(ctx, String(R(h.hp)) + ' / 92', x + 151, y + 6, { alpha: a, color: col });
    },
  });
  cam.to(tw + 0.05, at(63, 2), { x: B0.x + B0.w - 50, roll: 0, yaw: 0 }, 'outExpo');
  cam.to(at(63, 2, 2), at(64), { z: 360, pitch: -1.45, x: 480, y: 344, fov: 1.0 }, 'in2');
  TL.post.to(at(63, 3), at(64), { tint: 0 }, 'in');

  let enemyCanvas = null;
  TL.pov = {
    t0: p0, t1: p1,
    scene(t) {
      const c = cam.at(t);
      // impacts shake the first-person camera too (none at the hand-off from 2D)
      if (t > p0 + 0.1) {
        const fx = TL.fxAt(t);
        c.x += fx.sx * 0.2; c.z += fx.sy * 0.08; c.roll += fx.rot + fx.sx * 0.003; c.fov *= 1 - Math.min(0.3, fx.zoom * 0.6);
      }
      const hb = TL.head.at(t);
      enemyCanvas = D.enemy(null, null, 0, 0, { head: hb, body: 'idle', idleT: (t - T.off) / (T.beat * 2), eyeFrame: Math.floor((t - T.off) / T.s16) % 2, composeOnly: true });
      const bills = [{ src: enemyCanvas, dynamic: true, p: [ex, 190, 144], w: 336, h: 288, nofog: true }];
      for (const cn of cannons3) {
        if (t < cn.t0 || t > cn.fire + cn.dur + 0.4) continue;
        const p = cn.pos(t);
        const open = U.clamp((t - cn.fire + 0.06) / 0.06);
        const img = open < 0.01 ? MV.frame('GasterBlaster', 'Default') : MV.frame('GasterBlaster', 'Fire', Math.min(4, Math.floor(open * 4.99)));
        // the sprite's mouth points along +x (2D rotates it to aim): turn the billboard so the jaw
        // follows the beam as the camera sees it - upright, jaw down, when it fires at the camera
        const u = V3.norm(V3.sub(cn.target, [p[0], p[1], p[2] - 12])), dr = u[0] * Math.cos(c.yaw) + u[1] * Math.sin(c.yaw), du = u[2];
        const rot = Math.hypot(dr, du) < 0.4 ? -Math.PI / 2 : Math.atan2(du, dr);
        bills.push({ src: img, p, w: 57 * 0.9, h: 44 * 0.9, rot, emi: t > cn.fire - 0.3 ? 0.6 : 0, a: U.clamp((t - cn.t0) / 0.1) * (t > cn.fire + cn.dur ? U.clamp(1 - (t - cn.fire - cn.dur) / 0.4) : 1) });
      }
      const g = grow(t);
      return {
        cam: c, fog: 0.004, bills,
        build(v) {
          // floor: dark checker inside the arena, sparse grid outside (fading in as depth arrives)
          for (let x = B0.x; x < B0.x + B0.w; x += 15)
            for (let y = B0.y; y < B0.y + B0.h; y += 14) {
              const k = ((x - B0.x) / 15 + (y - B0.y) / 14) % 2 === 0;
              v.box(x, y, -1, 15, 14, 1, k ? [0.07 * g, 0.07 * g, 0.11 * g] : [0.03 * g, 0.03 * g, 0.05 * g], 0);
            }
          if (g > 0.05)
            for (let gg = -600; gg <= 600; gg += 40) {
              v.box(480 + gg, -300, -1.2, 1, 1300, 0.5, [0.1 * g, 0.12 * g, 0.25 * g], 0.2 * g);
              v.box(-120, 344 + gg, -1.2, 1200, 1, 0.5, [0.1 * g, 0.12 * g, 0.25 * g], 0.2 * g);
            }
          // the frame becomes four glowing walls (they rise out of the flat outline)
          const th = 5, hh = 0.5 + 13.5 * g, we = 1 - 0.7 * g;
          v.box(B0.x - th, B0.y - th, 0, B0.w + th * 2, th, hh, WHITE, we);
          v.box(B0.x - th, B0.y + B0.h, 0, B0.w + th * 2, th, hh, WHITE, we);
          v.box(B0.x - th, B0.y, 0, th, B0.h, hh, WHITE, we);
          v.box(B0.x + B0.w, B0.y, 0, th, B0.h, hh, WHITE, we);
          if (t < tDive) heartVox(v, t);
          for (const b of bones3) {
            if (t < b.t0 || t > b.t1) continue;
            const gb = b.geo(t);
            v.bone(gb.a, gb.b, gb.w, gb.blue ? BLUE : WHITE, gb.blue ? 0.45 : b.glow || 0.15);
          }
          for (const cn of cannons3) {
            if (t < cn.fire || t > cn.fire + cn.dur + 0.15) continue;
            const p = cn.pos(t), mouth = [p[0], p[1], p[2] - 12], tp = cn.target;
            const bt = t - cn.fire, w = (bt < cn.dur ? cn.w : cn.w * (1 - (bt - cn.dur) / 0.15)) * (1 + 0.1 * Math.sin(bt * 60));
            const d = V3.sub(tp, mouth), u = V3.norm(d), L2 = Math.hypot(d[0], d[1], d[2]) + 600;
            const vv = V3.norm(V3.cross(u, [0, 0, 1])), n = V3.cross(u, vv);
            v.obox(V3.add(mouth, V3.mul(u, L2 / 2)), u, vv, n, L2 / 2, w / 2, w / 2, [0.85, 0.98, 1], 1);
          }
        },
      };
    },
  };
  // first-person safety: no beam or white bone may reach the camera
  MV.checkPov = (step = 1 / 240) => {
    const out = [];
    for (let t = p0 + 0.4; t < p1; t += step) {
      const c = cam.at(t), e = [c.x, c.y, c.z];
      for (const cn of cannons3) {
        if (cn.scripted || t < cn.fire || t > cn.fire + cn.dur) continue;
        const p = cn.pos(t), m = [p[0], p[1], p[2] - 12], u = V3.norm(V3.sub(cn.target, m));
        const r = V3.sub(e, m), along = V3.dot(r, u), perp = Math.hypot(...V3.sub(r, V3.mul(u, along)));
        if (along > 0 && perp < cn.w / 2 + 4) out.push({ t: +t.toFixed(3), what: 'beam', perp: +perp.toFixed(1) });
      }
      for (const b of bones3) {
        if (t < b.t0 || t > b.t1) continue;
        const g = b.geo(t);
        if (g.blue) continue;
        const ab = V3.sub(g.b, g.a), L2 = V3.dot(ab, ab) || 1, k = U.clamp(V3.dot(V3.sub(e, g.a), ab) / L2);
        const dd = Math.hypot(...V3.sub(e, V3.add(g.a, V3.mul(ab, k))));
        if (dd < g.w * 0.5 + 2) out.push({ t: +t.toFixed(3), what: 'bone', d: +dd.toFixed(1) });
      }
    }
    return out;
  };
});
