// Bars 56-63: the world spins with gravity, then the dimension breaks and the
// camera drops INTO the soul: a first-person voxel arena under a giant judge.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const B0 = L.box, C0 = H.C0;
  const [ex, ey] = L.enemy;
  const R = Math.round;

  // ---------------------------------------------------------------- bars 56-57: the blaster dragon
  // ten skulls strung on a spine of bones coil around the arena; on every off-beat
  // stab one of them turns to the centre and fires. The soul keeps 90 degrees away.
  const t0 = at(56);
  H.bigHit(t0);
  H.sfx(t0, 'GasterBlaster', 0.6);
  TL.post.set(t0, { bloom: 1, vig: 0.45, bg: 1, ca: 0.6, tint: 0, desat: 0 });
  H.box(t0, t0 + 0.2, B0, 'outBack');
  TL.soulCol.set(t0, 'red');
  TL.aura.set(t0, { v: 0 });
  TL.soul.set(t0, { x: C0[0], y: C0[1], rot: 0, sc: 1, sq: 1, a: 1 });
  TL.head.set(t0, 'BlueEye');
  const N = 9, LAG = 0.16, t1 = at(58);
  const headAng = (t) => -Math.PI / 2 + (t - t0) * 2.2;
  const path = (t) => {
    const a = headAng(t), r = 175 + 30 * Math.sin(a * 3);
    const enter = MV.EASE.outExpo(U.clamp((t - t0 + 0.6) / 1.0));
    return [C0[0] + Math.cos(a) * r * (0.6 + 0.4 * enter) + (1 - enter) * -500, C0[1] + Math.sin(a) * r * 0.82];
  };
  const seg = (i, t) => path(t - i * LAG);
  const fires = [];
  for (let k = 0; k < 8; k++) fires.push({ t: at(56, k, 2), i: (k * 3) % N });
  const fireAng = (f, t) => { const [x, y] = seg(f.i, t); return Math.atan2(C0[1] - y, C0[0] - x); };
  TL.add({
    t0: t0 - 0.2, t1: t1 + 0.4, z: 36, kind: 'beam',
    draw(ctx, emi, t) {
      const out = t > t1 ? (t - t1) / 0.4 : 0;
      // spine
      for (let i = 0; i < N - 1; i++) {
        const [x0, y0] = seg(i, t), [x1, y1] = seg(i + 1, t);
        D.bone(ctx, emi, x0, y0, Math.atan2(y1 - y0, x1 - x0), Math.hypot(x1 - x0, y1 - y0), { w: 8, alpha: 1 - out, glow: 0.4 });
      }
      for (let i = N - 1; i >= 0; i--) {
        const [x, y] = seg(i, t), [xn, yn] = seg(i, t - 0.02);
        let ang = Math.atan2(y - yn, x - xn), open = 0, charge = 0;
        for (const f of fires) {
          if (f.i !== i) continue;
          const dtf = t - f.t;
          if (dtf > -0.25 && dtf < 0.35) { ang = fireAng(f, t); charge = U.clamp((dtf + 0.25) / 0.2); open = dtf > -0.05 ? U.clamp(1 - Math.max(0, dtf - 0.15) / 0.2) : 0; }
        }
        D.cannon(ctx, emi, x, y, ang, { scale: 1.5, open, charge, alpha: 1 - out, t, seed: i });
        for (const f of fires) if (f.i === i && t >= f.t && t < f.t + 0.22) {
          const [mx, my] = D.mouth(x, y, ang, 1.5);
          D.beam(ctx, emi, mx, my, ang, { w: 30 * (1 - Math.max(0, t - f.t - 0.15) / 0.07), t });
        }
      }
    },
    hit(t, px, py) {
      for (const f of fires) {
        if (t < f.t || t > f.t + 0.15) continue;
        const [x, y] = seg(f.i, t), ang = fireAng(f, t), [mx, my] = D.mouth(x, y, ang, 1.5);
        if (D.beamHit(mx, my, ang, 30, px, py, 5)) return true;
      }
      return false;
    },
  });
  fires.forEach((f) => { H.sfx(f.t, 'GasterBlast', 0.4); H.hit(f.t, 0.6); });
  // the soul sits a quarter turn away from each shot, moving on the beat
  fires.forEach((f) => {
    const a = fireAng(f, f.t) + Math.PI / 2;
    TL.soul.to(f.t - 0.24, f.t - 0.12, { x: C0[0] + Math.cos(a) * 50, y: C0[1] + Math.sin(a) * 50 }, 'outExpo');
  });
  H.cam(t0, t0 + 0.3, { x: 480, y: 330, zoom: 1.05, pitch: 0.28, yaw: 0, roll: 0 }, 'outExpo');
  for (let k = 0; k < 8; k++) H.cam(at(56, k), at(56, k + 1), { roll: -headAng(at(56, k + 1)) * 0.05, yaw: Math.sin(k) * 0.2 }, 'inOut');

  // ---------------------------------------------------------------- bars 58-59: the falling shaft
  // the arena turns into a shaft and the soul drops down it: ledges of bone rush up past it,
  // an eighth apart, then a sixteenth apart, while blasters under the shaft fire up the free lanes
  const tS = at(58), tLand = at(59, 3);
  const SB = { x: 405, y: 244, w: 150, h: 176 };
  H.box(tS, tS + 0.2, SB, 'outBack');
  TL.soulCol.set(tS, 'blue');
  TL.aura.to(tS, tS + 0.1, { v: 1 }, 'out');
  TL.head.set(tS, 'BlueEye');
  TL.body.set(tS, 'HandDown');
  const FY = SB.y + 60, up = 1050;
  TL.soul.to(tS, tS + 0.15, { x: 480, y: FY, rot: 0, sq: 1.35 }, 'outExpo');
  TL.soul.to(tS + 0.15, tS + 0.3, { sq: 1 }, 'out');
  // speed lines streaming up
  TL.add({ t0: tS, t1: tLand + 0.05, z: 3, clip: 'box', draw(ctx, emi, t) {
    for (let i = 0; i < 30; i++) {
      const x = SB.x + 4 + U.hash(i) * (SB.w - 8), ph = (U.hash(i + 9) * 520 + (t - tS) * up * 1.4) % 520;
      D.rect(ctx, x, SB.y + SB.h + 80 - ph, 1, 24 + U.hash(i + 3) * 24, i % 3 ? '#6fa0ff' : '#ffffff', 0.45);
    }
  } });
  const lanes = [436, 480, 524];
  // bar 58 on the riff's own rhythm, bar 59 on every sixteenth
  const seq = [1, 0, 2, 2, 1, 0, 2, 1, 0, 0, 2, 2, 1, 0, 1, 2, 2, 0, 1];
  const ledgeT = H.riffTimes(58).slice(3);
  for (let s = 0; s < 12; s++) ledgeT.push(at(59, 0, s));
  let prevLane = 1;
  ledgeT.forEach((tc, k) => {
    const g = seq[k], gapX = lanes[g];
    // step into the gap just before the ledge reaches the soul
    if (g !== prevLane) {
      TL.soul.to(tc - 0.1, tc - 0.045, { x: gapX, sq: 0.8 }, 'outExpo');
      TL.soul.to(tc - 0.045, tc, { sq: 1 }, 'out');
      H.cam(tc - 0.1, tc + 0.04, { x: 480 + (gapX - 480) * 0.35, roll: (gapX - 480) / 600 }, 'outExpo');
    }
    prevLane = g;
    const yAt = (t) => FY + (tc - t) * up;
    const wL = gapX - 22 - SB.x, wR = SB.x + SB.w - (gapX + 22);
    if (wL > 4) H.bone({ t0: tc - 0.35, t1: tc + 0.3, w: 12, geo: (t) => ({ x: SB.x - 4, y: yAt(t), ang: 0, len: wL + 4 }) });
    if (wR > 4) H.bone({ t0: tc - 0.35, t1: tc + 0.3, w: 12, geo: (t) => ({ x: SB.x + SB.w + 4, y: yAt(t), ang: Math.PI, len: wR + 4 }) });
    const onBeat = Math.abs(T.beatOf(tc) - Math.round(T.beatOf(tc))) < 1e-3;
    H.punch(tc, onBeat ? 0.55 : 0.25, { dy: -1 });
    if (k < 7 || k % 2 === 0) H.sfx(tc - 0.03, 'BoneStab', 0.18);
  });
  // blasters under the shaft fire straight up whichever lane the soul is nowhere near
  const soulNear = (lx, a, b) => { for (let t = a; t <= b; t += 0.005) if (Math.abs(TL.soul.at(t).x - lx) < 30) return true; return false; };
  [at(58, 1), at(58, 2), at(58, 3), at(58, 3, 2), at(59, 0, 2), at(59, 1), at(59, 1, 2), at(59, 2), at(59, 2, 2)].forEach((tf, i) => {
    const free = lanes.filter((lx) => !soulNear(lx, tf - 0.05, tf + 0.25));
    if (!free.length) return;
    const lx = free[i % free.length], tSp = tf - 0.28;
    H.cannon({ tSpawn: tSp, fires: [tf], beamDur: 0.12, fall: 0.08, scale: 1.3, vol: 0.3, shake: 0.6,
      pos: (t) => ({ x: lx, y: SB.y + SB.h + U.lerp(170, 64, MV.EASE.outExpo(U.clamp((t - tSp) / 0.15))), ang: -Math.PI / 2 }) });
  });
  H.cam(tS, tS + 0.3, { x: 480, y: 336, zoom: 1.9, pitch: 0.45, roll: 0, yaw: 0 }, 'outExpo');
  H.cam(at(59), at(59, 3), { zoom: 2.35, pitch: 0.55 }, 'in');
  TL.post.to(tS, at(59, 3), { bloom: 1.2, ca: 0.9 }, 'in');

  // ---------------------------------------------------------------- 59.3-60.1: the flat world gains depth
  // the shaft bottoms out; the camera settles straight above the arena; the voxel pass takes over
  // with the very same framing, the walls rise, and the camera dives INTO the soul and looks up
  H.box(tLand - 0.04, tLand + 0.08, B0, 'outExpo');
  const HX = 480, HY = B0.y + B0.h - 8;
  TL.soul.to(tLand - 0.06, tLand, { x: HX, y: HY, rot: 0, sq: 1.5 }, 'inExpo');
  TL.soul.to(tLand, tLand + 0.14, { sq: 1 }, 'out');
  H.boxHit(tLand, 'bottom', 0.5, 14);
  H.sfx(tLand, 'Slam', 0.8);
  H.hit(tLand, 0.8, { dy: 1, dur: 0.3, flashCol: [0.3, 0.5, 1] });
  TL.burst(tLand, { x: HX, y: B0.y + B0.h, n: 30, speed: [80, 260], ang: [0.2, Math.PI - 0.2], life: [0.2, 0.4], g: 600, colors: ['#ffffff', '#9fc4ff'], size: [2, 4], z: 46 });
  const MATCH_Z = 3.3; // 2D framing that shows the arena and nothing else
  H.cam(tLand, at(60) - 0.02, { x: 480, y: 344, zoom: MATCH_Z, pitch: 0, roll: 0, yaw: 0 }, 'inOut');
  TL.post.to(tLand, at(60), { bg: 0, grid: 0, bloom: 1, ca: 0.6 }, 'inOut');
  TL.hud.to(tLand, tLand + 0.2, { a: 0 }, 'out');
  TL.hud.to(at(63, 3), at(64), { a: 1 }, 'in');
  TL.glitch(at(60) - 0.06, at(60) + 0.04, 0.5);
  TL.body.set(at(60), 'idle');
  TL.soul.set(at(60), { a: 0 });

  // ---------------------------------------------------------------- bars 60-63: FIRST PERSON (voxel)
  const p0 = at(60), p1 = at(64);
  const tDive = at(60, 0, 3), tEye = at(60, 1, 2);
  const hMatch = MV.VH / 2 / (Math.tan(0.35) * MATCH_Z); // same projection as the 2D post camera
  const cam = new MV.Track({ x: 480, y: 344, z: hMatch, yaw: 0, pitch: -1.565, roll: 0, fov: 0.7 });
  cam.to(p0, tDive, { x: HX, y: HY, z: 5 }, 'in2');
  cam.to(tDive, tEye, { y: 392, z: 8, pitch: 0.05, fov: 1.35 }, 'outExpo');
  H.hit(tDive, 0.8, { flash: 0.7, flashCol: [0.35, 0.55, 1], dur: 0.35 });
  H.sfx(tDive, 'Ding', 0.5);
  const grow = (t) => MV.EASE.outExpo(U.clamp((t - p0) / 0.35));
  const V3 = MV.V3;
  const WHITE = [1, 1, 1], BLUE = [0.08, 0.66, 1];
  const bones3 = []; // {t0, t1, geo(t) -> {a, b, w, blue}}
  const cannons3 = []; // {t0, fire, dur, pos(t)->[x,y,z], target:[x,y,z], w}
  // the soul itself as voxels (seen from above before the dive goes through it)
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

  // bar 60: rows of bone pillars erupt from the floor, rolling toward the camera
  const rowT = [at(60, 1, 2), at(60, 2), at(60, 2, 2), at(60, 3), at(60, 3, 2)];
  rowT.forEach((tk, k) => {
    const yk = 286 + k * 16;
    const gx = [450, 510, 440, 520, 480][k];
    for (let x = B0.x + 8; x < B0.x + B0.w; x += 13) {
      if (Math.abs(x - gx) < 16) continue;
      const h = 34 + ((x * 7 + k * 13) % 23);
      bones3.push({ t0: tk - 0.05, t1: at(61) + 0.1, geo: (t) => {
        const upk = MV.EASE.outExpo(U.clamp((t - tk + 0.05) / 0.08));
        const dn = MV.EASE.in(U.clamp((t - at(61) + 0.12) / 0.2));
        const z = -h - 8 + (h + 8) * upk * (1 - dn);
        return { a: [x, yk, z], b: [x, yk, z + h], w: 10 };
      } });
    }
    H.sfx(tk, 'BoneStab', 0.4);
    H.punch(tk, 0.5);
    cam.to(tk + 0.02, tk + 0.18, { x: gx, roll: (gx - 480) / 400 }, 'outExpo');
  });
  cam.to(at(60, 3, 3), at(61), { x: 480, roll: 0 }, 'outExpo');

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
      const x = 378 + sx, y = 486 + sy, kr = h.kr > 0.5, col = kr ? MV.COL.kr : '#ffffff';
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
        bills.push({ src: img, p, w: 57 * 0.9, h: 44 * 0.9, rot: 0, emi: t > cn.fire - 0.3 ? 0.6 : 0, a: U.clamp((t - cn.t0) / 0.1) * (t > cn.fire + cn.dur ? U.clamp(1 - (t - cn.fire - cn.dur) / 0.4) : 1) });
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
