// Bars 32-39: CLIMAX. Bone tsunami, bone spears that wreck the menu, and the
// one time the player actually dies: heart shatters, file reloads, the tape
// rewinds, and the same attack is replayed — this time dodged in cold blood.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const WB = { x: 250, y: 290, w: 460, h: 124 }, WC = [480, 352];
  const [ex, ey] = L.enemy;

  // ---------------------------------------------------------------- bars 32-33: bone tsunami
  const t0 = at(32);
  H.bigHit(t0 + 0.02, { inv: 0.05, bw: 0.05 });
  H.sfx(t0, 'Flash', 0.5);
  H.box(at(32, 1), at(32, 1) + 0.25, WB, 'outBack');
  H.cam(t0, t0 + 0.3, { x: 480, y: 330, zoom: 1.3, roll: 0, pitch: 0.42, yaw: -0.3 }, 'outExpo');
  H.cam(t0 + 0.3, at(34), { yaw: 0.3, pitch: 0.3 }, 'inOut');
  TL.head.set(t0, 'Default');
  const SX = 420;
  const gy = [0.28, 0.7, 0.4, 0.22, 0.62, 0.3, 0.72, 0.5];
  for (let k = 2; k < 8; k++) {
    const tc = at(32, k);
    const b = { y: WB.y, h: WB.h };
    const y = b.y + gy[k] * b.h;
    H.dash(tc - S16 * 2, SX, y, S16 * 1.2, k % 2 ? Math.PI * 2 : 0);
    H.gapWall({ tc, cross: SX, gapY: y, gap: 44, speed: 900, dir: k % 2 ? -1 : 1, w: k % 3 === 0 ? 30 : 22 });
    H.punch(tc, 0.9);
    if (k % 2) H.sfx(tc - 0.1, 'BoneStab', 0.3);
  }
  // decorative giant bones hurled across the sky (outside the box)
  for (const [bar, dir] of [[32, 1], [33, -1]]) {
    const tt = at(bar, 0, 2);
    H.fly({ t0: tt, t1: tt + 1.2, w: 28, len: 150, clip: null, z: 12,
      path: (t) => { const u = (t - tt) / 1.2; return { x: 480 - dir * 700 + dir * 1400 * u, y: 180 - Math.sin(u * Math.PI) * 120, ang: u * 9 * dir, a: 1 }; } });
  }
  H.cam(at(33), at(33, 0, 2), { roll: 0.08, zoom: 1.45 }, 'outExpo');
  H.cam(at(33, 2), at(33, 2, 2), { roll: -0.08 }, 'outExpo');

  // ---------------------------------------------------------------- bars 34-35: bone spears
  H.cam(at(34), at(34, 0, 2), { x: 480, y: 340, zoom: 1.2, pitch: 0, yaw: 0, roll: 0 }, 'outExpo');
  const spots = [[400, 330], [560, 380], [470, 390], [360, 320], [600, 330], [480, 320], [420, 385], [540, 350]];
  for (let k = 0; k < 8; k++) H.dash(at(34, k) - S16, spots[k][0], spots[k][1], S16 * 1.2, k % 3 === 1 ? Math.PI * 2 : 0);
  for (let s = 0; s < 32; s += 2) {
    const tc = at(34, 0, s) + (s % 4 === 0 ? S16 : 0); // on the "e" and the "and", never on a dash
    const p = TL.soul.at(tc);
    const a = U.hash(s * 1.7) * Math.PI * 2;
    const off = (U.hash(s * 3.1) > 0.5 ? 1 : -1) * (46 + U.hash(s) * 40);
    const nx = -Math.sin(a), ny = Math.cos(a);
    const cx = p.x + nx * off, cy = p.y + ny * off;
    const sp = 1400, len = 70;
    H.fly({ t0: tc - 0.5, t1: tc + 0.5, w: 12, len, clip: null, z: 22,
      path: (t) => ({ x: cx + Math.cos(a) * sp * (t - tc), y: cy + Math.sin(a) * sp * (t - tc), ang: a }) });
    if (s % 4 === 0) H.punch(tc, 0.5);
  }
  // ITEM gets crushed by a falling giant bone
  const tI = at(34);
  const ix = L.btnX[2] + 55;
  H.bone({ t0: tI - 0.12, t1: tI + 0.6, w: 34, clip: null, z: 26,
    geo: (t) => { const k = t < tI ? MV.EASE.inExpo((t - tI + 0.12) / 0.12) : 1; return { x: ix, y: -200 + 640 * k, ang: Math.PI / 2, len: 200, a: t > tI + 0.4 ? 1 - (t - tI - 0.4) / 0.2 : 1 }; } });
  TL.btnState[2].set(tI, 'gone');
  H.shatter(tI, { x: L.btnX[2], y: L.btnY, w: 110, h: 42 }, (c) => D.button(c, null, 2, L.btnX[2], L.btnY, {}), { chunk: 6, force: 380, up: 200, oy: L.btnY - 10 });
  H.hit(tI, 1.3, { dy: 1 });
  // ACT gets skewered by a spear
  const tA = at(35, 3);
  const ax = L.btnX[1] + 55, ay = L.btnY + 21;
  H.fly({ t0: tA - 0.2, t1: tA + 0.4, w: 14, len: 120, clip: null, z: 26,
    path: (t) => ({ x: ax - 600 + 600 * Math.min(1, (t - tA + 0.2) / 0.2), y: ay, ang: 0 }) });
  TL.btnState[1].set(tA, 'gone');
  H.shatter(tA, { x: L.btnX[1], y: L.btnY, w: 110, h: 42 }, (c) => D.button(c, null, 1, L.btnX[1], L.btnY, {}), { chunk: 6, force: 320, ox: L.btnX[1] - 20, up: 60 });
  H.hit(tA, 1.1, { dx: 1 });

  // ---------------------------------------------------------------- bars 36-39: death, reload, rewind, replay
  // The phrase: diagonal blasts, a closing zipper of bones, then a low sweep.
  const phrase = (tb, dies) => {
    TL.soul.to(tb - 0.15, tb, { x: 480, y: 305 }, 'outExpo');
    for (const [x, y] of [[190, 230], [770, 230], [190, 474], [770, 474]]) H.cannonAim({ tSpawn: tb, tFire: tb + BEAT, x, y, tx: WC[0], ty: WC[1], beamDur: 0.35, vol: 0.3 });
    H.cam(tb, tb + 0.2, { x: 480, y: 330, zoom: 1.5, pitch: 0.18, yaw: 0, roll: 0.03 }, 'outExpo');
    // zipper: bones close in from both sides leaving a gap at x=480
    for (let i = 0; i < 9; i++) {
      for (const side of [-1, 1]) {
        const xf = 480 + side * (44 + i * 22);
        const th = tb + BEAT * 2 + i * 0.02;
        H.bone({ t0: th - 0.06, t1: tb + BEAT * 3.3, w: 12, geo: (t) => ({ x: xf, y: WB.y + WB.h + 8 - (WB.h + 8) * MV.EASE.outExpo(U.clamp((t - th + 0.06) / 0.06)), ang: -Math.PI / 2, len: WB.h + 10 }) });
      }
    }
    H.soulTo(tb + BEAT * 1.6, tb + BEAT * 1.9, 480, 330, 'inOut');
    // the low sweep across y=372 on beat 3
    const tS = tb + BEAT * 3;
    const sweep = H.bone({ t0: tS - 0.2, t1: tS + 0.25, w: 16, clip: null, z: 23,
      geo: (t) => ({ x: 480 + (t - tS) * 2400 - 110, y: 372, ang: 0, len: 220 }) });
    if (dies) {
      sweep.harmless = true; // the scripted death
      TL.soul.to(tS - 0.08, tS, { x: 480, y: 372 }, 'out'); // dodges the wrong way
    } else {
      TL.soul.to(tS - 0.2, tS - 0.12, { x: 480, y: 318 }, 'outExpo'); // cold, early, correct
    }
    H.punch(tb + BEAT * 2, 0.8);
  };
  phrase(at(36), true);
  // the hit: freeze, HP drains, heart splits, shards fly
  const tD = at(36, 3);
  H.bigHit(tD, { inv: 0.07, bw: 0.07, flashCol: [1, 0.2, 0.2] });
  H.sfx(tD, 'PlayerDamaged', 0.8);
  TL.hud.to(tD, tD + 0.25, { hp: 0, kr: 0 }, 'out');
  TL.soul.set(tD + 0.12, { a: 0 });
  TL.add({ t0: tD + 0.12, t1: tD + 0.3, z: 70, draw(ctx, emi, t) { MV.spr(ctx, 'soul_split', 480, 372); } });
  H.sfx(tD + 0.12, 'HeartSplit', 0.8);
  TL.add({
    t0: tD + 0.3, t1: at(37), z: 70,
    draw(ctx, emi, t) {
      const u = t - tD - 0.3;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.45;
        const x = 480 + Math.cos(a) * 160 * u, y = 372 + Math.sin(a) * 160 * u + 500 * u * u;
        MV.spr(ctx, 'shard' + (Math.floor(u * 15 + i) % 4), x, y);
      }
    },
  });
  H.sfx(tD + 0.3, 'HeartShatter', 0.8);
  TL.post.to(tD + 0.3, at(37), { bg: 0, vig: 1 }, 'in');
  H.cam(tD, tD + 0.4, { x: 480, y: 372, zoom: 2.4, roll: 0.1 }, 'outExpo');
  TL.enemy.to(tD, tD + 0.01, { a: 1 }, 'step');
  TL.head.set(tD, 'Wink');

  // bar 37: reload screen (screen space), then a VHS rewind of the failed attempt
  const tL = at(37);
  TL.add({
    t0: tL, t1: at(37, 2), z: 90, screen: true,
    draw(ctx, emi, t) {
      const u = t - tL;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, MV.SW, MV.SH);
      const a = U.clamp(u / 0.1);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      const x0 = 250, y0 = 150;
      ctx.fillRect(x0, y0, 460, 4); ctx.fillRect(x0, y0 + 176, 460, 4); ctx.fillRect(x0, y0, 4, 180); ctx.fillRect(x0 + 456, y0, 4, 180);
      ctx.globalAlpha = 1;
      D.hud(ctx, 'BOMEI', x0 + 30, y0 + 30, { alpha: a });
      D.hud(ctx, 'LV 19', x0 + 190, y0 + 30, { alpha: a });
      D.hud(ctx, '9:59:59', x0 + 330, y0 + 30, { alpha: a });
      D.text(ctx, '最后的长廊', x0 + 30, y0 + 64, { scale: 2, alpha: a });
      const sel = u > BEAT * 1.4;
      D.text(ctx, '继续', x0 + 90, y0 + 124, { scale: 2, alpha: a, color: sel ? '#ffff40' : '#ffffff' });
      D.text(ctx, '重置', x0 + 300, y0 + 124, { scale: 2, alpha: a, color: '#808080' });
      if (Math.floor(u / S16) % 2 === 0 || sel) MV.spr(ctx, 'soul_red', x0 + 70, y0 + 140);
      if (u > BEAT) D.text(ctx, '第 2 次', 480, 390, { scale: 3, align: 'center', color: '#ff2020', alpha: U.clamp((u - BEAT) / 0.05) });
    },
  });
  H.sfx(at(37, 0, 2), 'MenuCursor', 0.5);
  H.sfx(at(37, 1, 2), 'MenuSelect', 0.6);
  // rewind: the picture runs backwards from the death to the start of the phrase
  const r0 = at(37, 2), r1 = at(38);
  TL.remap(r0, r1, (t) => U.lerp(tD + 0.45, at(36), MV.EASE.in2((t - r0) / (r1 - r0))));
  H.sfx(r0, 'Flash', 0.4);
  // VHS on-screen display while the tape runs backwards (blinking)
  TL.add({ t0: r0, t1: r1, z: 95, screen: true, draw(ctx, emi, t) {
    if (Math.floor((t - r0) / (S16 * 2)) % 2 === 0) D.text(ctx, '◀◀', 60, 44, { scale: 3, color: '#ffffff' });
    D.hud(ctx, 'REW', 150, 60, { scale: 3, color: '#ffffff' });
  } });
  // attempt 2 — HP restored, same phrase, flawless
  const tR = at(38);
  TL.hud.set(tR - 0.01, { hp: 61, kr: 0 });
  TL.post.set(tR, { bg: 1, vig: 0.35 });
  TL.soul.set(tR - 0.2, { a: 1, x: 480, y: 305 });
  TL.head.set(tR, 'Default');
  H.cut(tR, { x: 480, y: 330, zoom: 1.5, pitch: 0.18, yaw: 0, roll: 0.03 });
  phrase(tR, false);
  H.sfx(tR + BEAT * 3 - 0.2, 'MenuCursor', 0.001); // (silent marker for the dodge)

  // bar 39: three blasters lock on, one per beat — the soul steps out of each line on
  // the eighth before the blast. On beat 4 the last one turns to face the camera
  // and fires straight at the player: white-out into the player's turn.
  const tQ = at(39), C0 = H.C0;
  H.box(tQ, tQ + 0.2, L.box, 'outBack');
  TL.soul.to(tQ, tQ + 0.12, { x: C0[0], y: C0[1] }, 'outExpo');
  H.cam(tQ, tQ + 0.2, { x: 480, y: 320, zoom: 1.35, pitch: 0.1, roll: 0, yaw: 0 }, 'outExpo');
  const lock = [
    { from: [240, 344], ang: 0, dodge: [480, 298] },
    { from: [480, 110], ang: Math.PI / 2, dodge: [528, 298] },
    { from: [720, 298], ang: Math.PI, dodge: [528, 386] },
  ];
  lock.forEach((c, k) => {
    const tf = at(39, k) + BEAT / 2;
    H.cannon({ tSpawn: at(39, k), fires: [tf], beamDur: 0.22, fall: 0.1, scale: 2.5, pos: () => ({ x: c.from[0], y: c.from[1], ang: c.ang }), vol: 0.45 });
    TL.soul.to(tf - 0.12, tf - 0.04, { x: c.dodge[0], y: c.dodge[1] }, 'outExpo');
    H.cam(at(39, k), at(39, k) + 0.15, { roll: [0.05, -0.05, 0.05][k], zoom: 1.35 + k * 0.08 }, 'outExpo');
  });
  // the one that looks at YOU
  const tY = at(39, 3), tYF = at(39, 3, 2);
  H.sfx(tY, 'GasterBlaster', 0.6);
  H.sfx(tYF, 'GasterBlast2', 0.8);
  TL.impact(tYF, { amp: 16, zoom: 0.1, ca: 14, dur: 0.5 });
  TL.add({
    t0: tY - 0.02, t1: at(40), z: 97, screen: true,
    draw(ctx, emi, t) {
      const u = (t - tY) / (tYF - tY);
      const sc = 3 + 6 * MV.EASE.outExpo(U.clamp(u * 1.2));
      const open = U.clamp((t - tYF + 0.08) / 0.08);
      const glitch = u < 0.25 ? 1 - u / 0.25 : 0;
      D.cannon(ctx, null, 480, 180 - 60 * U.clamp(u), Math.PI / 2, { scale: sc, open, charge: U.clamp(u * 1.4), glitch, seed: 39, t });
      if (t > tYF) {
        const w = MV.EASE.in2(U.clamp((t - tYF) / (at(40) - tYF)));
        const [mx, my] = D.mouth(480, 120, Math.PI / 2, sc);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6 + 0.4 * w;
        ctx.beginPath();
        ctx.ellipse(mx, my + 60, 60 + 700 * w, 30 + 500 * w, 0, 0, U.TAU);
        ctx.fill();
        ctx.globalAlpha = w;
        ctx.fillRect(0, 0, MV.SW, MV.SH);
        ctx.globalAlpha = 1;
      }
    },
  });
});
