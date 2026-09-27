// Bars 16-23: BLUE bones (move = hurt, stand still = pass through) and the
// blue-soul GRAVITY slams, ending in a parkour run across the UI itself.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const [ex, ey] = L.enemy;

  // ---------------------------------------------------------------- bars 16-19: blue bones
  const bb = { x: 360, y: 314, w: 240, h: 100 };
  H.box(at(16), at(16) + 0.2, bb, 'outBack');
  H.hit(at(16), 1.1);
  H.sfx(at(16), 'Warning', 0.35);
  TL.post.to(at(16), at(16, 0, 2), { bgHue: 1, tint: 1 }, 'out');
  H.cam(at(16), at(16, 0, 2), { x: 480, y: 330, zoom: 1.85, pitch: 0.2, roll: 0, yaw: 0 }, 'outExpo');
  const SX = 450, cy = bb.y + bb.h / 2;
  TL.soul.set(at(16) + 0.001, {}); // (keep current position)
  H.soulTo(at(16), at(16, 0, 2), SX, cy, 'outExpo');
  // a blue pass: full-height blue bone crossing the soul at tc; the soul brakes hard and holds still
  const freeze = (tc, hold = 0.09, o = {}) => {
    const p = TL.soul.at(tc - hold - 0.06);
    // skid: tiny overshoot then settle, finished before the hold window
    TL.soul.to(tc - hold - 0.06, tc - hold, { x: p.x, y: p.y }, 'outBack');
    TL.burst(tc - hold - 0.05, { x: p.x - 8, y: p.y + 6, n: 10, speed: [60, 160], ang: [Math.PI * 0.8, Math.PI * 1.2], life: [0.12, 0.3], colors: ['#8fd6ff', '#ffffff'], size: 2, z: 44 });
    TL.soul.to(tc - hold, tc + hold, { x: p.x, y: p.y }, 'lin');
    TL.post.to(tc - 0.08, tc, { desat: o.desat ?? 0.55, vig: 0.62 }, 'out');
    TL.post.to(tc + 0.05, tc + 0.3, { desat: 0, vig: 0.35 }, 'inOut');
    TL.soul.to(tc - 0.05, tc, { sc: 1.25 }, 'out');
    TL.soul.to(tc, tc + 0.15, { sc: 1 }, 'in');
  };
  for (let k = 0; k < 8; k++) {
    const tc = at(16, k);
    if (k % 2 === 0) {
      // white gap wall on the even beats: move!
      const gy = bb.y + [0.3, 0.7, 0.25, 0.72][k / 2] * bb.h;
      H.dash(tc - S16 * 2, SX, gy, S16 * 1.3, Math.PI * 2);
      H.gapWall({ tc, cross: SX, gapY: gy, gap: 40, speed: 600, dir: -1, w: 10 });
      H.punch(tc, 0.6);
    } else {
      // blue wall on the odd beats: freeze!
      H.slide({ side: 'bottom', len: bb.h - 4, w: 12, blue: true, tc, cross: SX, speed: 380, dir: k % 4 === 1 ? -1 : 1 });
      freeze(tc);
      H.punch(tc, 0.9, { ca: 4 });
    }
  }
  // bar 18: one huge, slow blue pillar crawls through the frozen soul
  const tP = at(18, 2);
  const pw = 56;
  H.bone({ t0: at(18) - 0.3, t1: at(19), blue: true, w: pw, z: 6,
    geo: (t) => { const b = TL.box.at(t); const x = SX + (t - tP) * -95; return { x, y: b.y + b.h - 3, ang: -Math.PI / 2, len: b.h - 6, w: pw }; } });
  const f0 = tP - 0.8, f1 = tP + 0.8;
  const hp = TL.soul.at(f0 - 0.2);
  H.soulTo(at(18) - 0.2, f0 - 0.12, SX, cy, 'outExpo');
  TL.soul.to(f0 - 0.12, f1, { x: SX, y: cy }, 'lin');
  TL.post.to(at(18), f0, { desat: 0.85, vig: 0.92, bg: 0.15 }, 'inOut');
  TL.post.to(f1, f1 + 0.25, { desat: 0, vig: 0.35, bg: 1 }, 'out');
  H.cam(at(18), f0, { x: SX, y: cy, zoom: 3.3, pitch: 0.05, roll: -0.05 }, 'inOut');
  H.cam(f1, f1 + 0.2, { x: 480, y: 330, zoom: 1.85, roll: 0 }, 'outExpo');
  for (let k = 0; k < 6; k++) { // heartbeat on the eighths, visible only through scale
    const t = f0 + k * (BEAT / 2);
    TL.soul.to(t, t + 0.05, { sc: 1.35 }, 'out');
    TL.soul.to(t + 0.05, t + 0.22, { sc: 1 }, 'in');
    H.punch(t, 0.3, { amp: 1 });
  }
  TL.head.set(at(18), 'ClosedEyes');
  TL.head.set(f1, 'Default');
  // white bones keep raining around the frozen soul (never on it)
  for (let s = 0; s < 16; s++) {
    const t = at(18, 0, s);
    const x = s % 2 ? bb.x + 18 + U.hash(s) * 40 : bb.x + bb.w - 18 - U.hash(s + 9) * 40;
    H.bone({ t0: t, t1: t + 0.5, w: 8, geo: (tt) => ({ x, y: bb.y - 40 + 420 * (tt - t), ang: Math.PI / 2, len: 26 }) });
  }
  // bar 19: blue on the beat, white on the off-beat, the soul moves once per beat
  for (let k = 0; k < 4; k++) {
    const tb = at(19, k), to = tb + BEAT / 2;
    const gy = bb.y + [0.3, 0.7, 0.35, 0.65][k] * bb.h;
    H.slide({ side: 'bottom', len: bb.h - 4, w: 12, blue: true, tc: tb, cross: SX, speed: 420, dir: k % 2 ? 1 : -1 });
    freeze(tb, 0.07, { desat: 0.4 });
    TL.soul.to(tb + 0.08, tb + 0.18, { x: SX, y: gy }, 'outExpo');
    H.gapWall({ tc: to, cross: SX, gapY: gy, gap: 40, speed: 640, dir: k % 2 ? -1 : 1, w: 10 });
    H.punch(tb, 0.7); H.punch(to, 0.4);
  }
  H.cam(at(19), at(19, 0, 2), { roll: 0.08, zoom: 2.0, pitch: -0.15 }, 'outExpo');
  H.cam(at(19, 2), at(19, 2, 2), { roll: -0.08, pitch: 0.2 }, 'outExpo');
  // the hand rises: gravity is coming
  TL.body.set(at(19, 3), 'HandUp');
  TL.enemy.to(at(19, 3), at(20), { handGlow: 0.6 }, 'in');
  TL.post.to(at(19, 3), at(20), { tint: 0 }, 'in');

  // ---------------------------------------------------------------- bars 20-23: GRAVITY
  const B0 = L.box, C0 = H.C0;
  const tg = at(20);
  H.box(tg, tg + 0.2, B0, 'outBack');
  TL.soulCol.set(tg, 'blue');
  TL.aura.to(tg, tg + 0.1, { v: 1 }, 'out');
  H.bigHit(tg, { flashCol: [0.3, 0.5, 1] });
  H.sfx(tg, 'Ding', 0.6);
  TL.ring(tg, C0[0], C0[1], { r0: 8, r1: 120, color: '#2a6bff', w: 4, dur: 0.5 });
  TL.burst(tg, { x: C0[0], y: C0[1], n: 40, speed: [60, 300], life: [0.3, 0.8], colors: ['#2a6bff', '#9fc4ff', '#ffffff'], size: [2, 4], z: 46 });
  TL.head.set(tg, 'BlueEye');
  TL.soul.to(tg, tg + 0.08, { x: C0[0], y: C0[1] - 20 }, 'outExpo');
  H.cam(tg, tg + 0.2, { x: 480, y: 300, zoom: 1.45, pitch: 0, roll: 0, yaw: 0 }, 'outExpo');
  // gravity switches on: it drops to the floor, then Sans throws it around on the beats
  // original "bonestab" rhythm: slam on the beat -> red warning -> bones stab on the
  // next beat while the heart is in the air (it jumps an eighth before)
  const seq = [[at(20, 1), 'up', { stab: true }], [at(20, 3), 'right', { stab: true }], [at(21, 1), 'down', { stab: true }], [at(21, 3), 'left', {}], [at(21, 3, 2), 'right', {}]];
  const tf = at(22);
  H.gravity(tg + 0.08, tf - 0.2, { dir: 'down', slams: seq });
  for (const [t, dir] of seq) {
    const k = dir === 'down' ? [0, 1] : dir === 'up' ? [0, -1] : dir === 'left' ? [-1, 0] : [1, 0];
    // camera leans into each impact
    H.cam(t - 0.05, t + 0.12, { roll: k[0] * -0.07, pitch: k[1] * 0.18, yaw: k[0] * 0.15 }, 'outExpo');
  }
  // bar 22: yanked up, then slammed THROUGH the floor, bouncing across the HUD and the buttons
  TL.body.set(tf - 0.12, 'HandDown');
  TL.soul.to(tf - 0.2, tf - 0.1, { x: 480, y: B0.y + B0.h - 64, sq: 0.8 }, 'out');
  TL.soul.to(tf - 0.1, tf, { x: 480, y: B0.y + B0.h - 8, rot: 0, sq: 1.5 }, 'inExpo');
  H.boxHit(tf, 'bottom', 0.5, 22);
  H.gap(tf, at(22, 2, 2), 'bottom', 0.36, 0.64);
  H.bigHit(tf, { dy: 1, flashCol: [0.3, 0.5, 1] });
  H.sfx(tf, 'Slam', 0.8);
  TL.burst(tf, { x: 480, y: B0.y + B0.h, n: 40, speed: [100, 320], ang: [0.2, Math.PI - 0.2], life: [0.3, 0.7], g: 600, colors: ['#ffffff', '#c9cede'], size: [2, 5], z: 46 });
  // falls onto the HP bar (it bends like a trampoline)
  const barTop = L.hpBar.y - 8;
  TL.soul.to(tf, at(22, 0, 2), { x: 470, y: barTop, sq: 1.35 }, 'in2');
  TL.soul.set(at(22, 0, 2) + 0.001, { sq: 0.6 });
  TL.soul.to(at(22, 0, 2) + 0.001, at(22, 0, 2) + 0.12, { sq: 1 }, 'out');
  TL.hud.to(at(22, 0, 2), at(22, 0, 2) + 0.05, { barDy: 7, hp: 88, kr: 4 }, 'outExpo');
  TL.hud.to(at(22, 0, 2) + 0.05, at(22, 1) + 0.2, { barDy: 0 }, 'outElastic');
  H.sfx(at(22, 0, 2), 'PlayerDamaged', 0.45);
  H.punch(at(22, 0, 2), 0.9, { dy: 1 });
  // hop along the buttons: FIGHT, ACT, ITEM, MERCY — bones burst up where it just was
  const pads = [[L.btnX[0] + 55, 0], [L.btnX[1] + 55, 1], [L.btnX[2] + 55, 2], [L.btnX[3] + 55, 3]];
  let prev = [470, barTop], tPrev = at(22, 0, 2);
  pads.forEach(([x, i], n) => {
    const t0 = at(22, 1 + n), t1 = t0 + BEAT / 2;
    const y = L.btnY - 8;
    TL.soul.hop(t0, t1, { x, y, rot: n % 2 ? 0 : U.TAU }, 70, 'y', 'lin');
    TL.soul.set(t1 + 0.0005, { rot: 0, sq: 0.62 });
    TL.soul.to(t1 + 0.0006, t1 + 0.12, { sq: 1 }, 'out');
    TL.btn[i].to(t1, t1 + 0.04, { dy: 5, sel: 1 }, 'outExpo');
    TL.btn[i].to(t1 + 0.04, t1 + 0.3, { dy: 0 }, 'outElastic');
    TL.btn[i].to(t1 + 0.2, t1 + 0.21, { sel: 0 }, 'step');
    H.sfx(t1, 'MenuCursor', 0.5);
    H.punch(t1, 0.6, { dy: 1 });
    TL.ring(t1, x, y + 8, { r0: 4, r1: 26, color: '#2a6bff', dur: 0.25 });
    // bone erupts from below the screen at the spot the soul left
    const bxp = prev[0], tb = t0 + 0.12;
    if (n === 3) { prev = [x, y]; tPrev = t1; return; }
    H.bone({ t0: tb - 0.05, t1: tb + 0.4, w: 14, clip: null, z: 24, geo: (t) => {
      const k = t < tb ? MV.EASE.outExpo((t - tb + 0.05) / 0.05) : 1 - MV.EASE.in(U.clamp((t - tb - 0.2) / 0.2));
      return { x: bxp, y: 620 - 150 * k, ang: -Math.PI / 2, len: 140 }; } });
    H.sfx(tb - 0.05, 'BoneStab', 0.35);
    prev = [x, y]; tPrev = t1;
  });
  // camera tracks the run down in the UI
  H.cam(tf, at(22, 0, 2), { x: 470, y: 400, zoom: 1.7, pitch: 0.3, roll: 0.05 }, 'outExpo');
  pads.forEach(([x], n) => H.cam(at(22, 1 + n), at(22, 1 + n) + 0.4, { x: U.lerp(480, x, 0.8), y: 430, roll: n % 2 ? 0.05 : -0.05, yaw: (x - 480) / 1200 }, 'inOut'));
  // yanked back UP into the box through the hole
  const tu = at(23, 0, 2);
  TL.body.set(tu - 0.12, 'HandUp');
  TL.soul.to(at(23), tu - 0.06, { x: 480, y: B0.y + B0.h + 14 }, 'inExpo');
  TL.soul.to(tu - 0.06, tu, { x: 480, y: B0.y + 8, rot: Math.PI, sq: 1.5 }, 'inExpo');
  H.cam(at(23), tu + 0.1, { x: 480, y: 320, zoom: 1.5, pitch: -0.1, roll: 0, yaw: 0 }, 'outExpo');
  H.boxHit(tu, 'top', 0.5, 14);
  H.crack(tu, tu + 1, 'top', 0.5);
  H.sfx(tu, 'Slam', 0.7);
  TL.impact(tu, { amp: 12, dy: -1, ca: 7, zoom: 0.06, flash: 0.2, dur: 0.4 });
  TL.ring(tu, 480, B0.y, { r0: 3, r1: 30, dur: 0.25, color: '#9fc4ff', w: 2 });
  // gravity now points UP (it sticks to the ceiling), then it is thrown around like a pinball
  H.gravity(tu, at(23, 3) - 0.001, { impact: 'up', slams: [[at(23, 1), 'left', {}], [at(23, 1, 2), 'right', {}], [at(23, 2), 'down', {}]] });
  // released: back to red
  const tr = at(23, 3);
  TL.soulCol.set(tr, 'red');
  TL.aura.to(tr, tr + 0.2, { v: 0 }, 'out');
  TL.body.set(tr, 'idle');
  TL.enemy.to(tr, tr + 0.2, { handGlow: 0 }, 'out');
  TL.head.set(tr, 'Default');
  TL.soul.to(tr, tr + 0.3, { x: C0[0], y: C0[1] + 30, rot: 0, sq: 1 }, 'inOut');
  TL.ring(tr, () => TL.soul.at(tr).x, () => TL.soul.at(tr).y, { color: '#ff3040', r1: 40 });
});
