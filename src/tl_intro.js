// Bars 0-7: intro (dry riff) + build. The frame draws itself on the riff notes,
// the first FIGHT attempt MISSES, then the warm-up bones play the melody.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16;
  const MB = L.menuBox, B0 = L.box, C0 = H.C0;
  const [ex, ey] = L.enemy;

  // ---------------------------------------------------------------- bar 0: the frame draws itself
  TL.post.set(0, { letter: 1, bg: 0, vig: 0.6 });
  TL.post.to(at(0), at(2), { letter: 0, bg: 1, vig: 0.35 }, 'inOut');
  TL.box.set(0, { x: MB.x, y: MB.y, w: MB.w, h: MB.h, draw: 0 });
  const per = 2 * (MB.w + MB.h);
  const head = (f) => {
    let d = f * per;
    if (d < MB.w) return [MB.x + d, MB.y];
    d -= MB.w; if (d < MB.h) return [MB.x + MB.w, MB.y + d];
    d -= MB.h; if (d < MB.w) return [MB.x + MB.w - d, MB.y + MB.h];
    d -= MB.w; return [MB.x, MB.y + MB.h - d];
  };
  // tracking shot: the camera chases the drawing head, tilted like a 3D flyover
  H.cut(0, { x: MB.x, y: MB.y + 20, zoom: 2.4, pitch: 0.55, roll: -0.18, yaw: 0.25 });
  H.riffTimes(0).forEach((t, i) => {
    const f = (i + 1) / 10;
    TL.box.to(t, t + 0.08, { draw: f }, 'outExpo');
    const [hx, hy] = head(f);
    H.cam(t, t + 0.18, { x: U.lerp(hx, 480, 0.35), y: U.lerp(hy, 330, 0.35), zoom: 2.4 - f * 0.9, roll: -0.18 + f * 0.25, yaw: 0.25 - f * 0.4 }, 'outExpo');
    H.punch(t, 0.5 + (H.RIFF_H[i] / 12) * 0.8);
    TL.burst(t + 0.03, { x: hx, y: hy, n: 16, speed: [60, 240], life: [0.2, 0.5], colors: ['#ffffff', '#9ff0ff'], size: [1, 3], z: 45 });
  });
  H.cam(at(1), at(2), { x: 480, y: 300, zoom: 1.25, pitch: 0.18, roll: 0, yaw: 0 }, 'inOut');
  H.cam(at(2), at(2, 1), { x: 480, y: 290, zoom: 1.12, pitch: 0 }, 'inOut');

  // ---------------------------------------------------------------- bar 1: HUD + enemy fade in, flavour text
  const r1 = H.riffTimes(1);
  TL.hud.set(0, { hp: 0 });
  TL.hud.to(r1[0], r1[0] + 0.1, { nameA: 1 }, 'outExpo');
  TL.hud.to(r1[1], r1[1] + 0.1, { lvA: 1 }, 'outExpo');
  TL.hud.to(r1[2], r1[4], { barA: 1, hp: 92 }, 'out');
  [6, 7, 8, 9].forEach((n, i) => {
    TL.btn[i].set(0, { a: 0, dy: 10 });
    TL.btn[i].to(r1[n], r1[n] + 0.14, { a: 1, dy: 0 }, 'outBack');
    H.punch(r1[n], 0.4);
  });
  r1.forEach((t, i) => TL.enemy.to(t, t + 0.06, { a: 1, reveal: (i + 1) / 10 }, 'out'));
  // typed a word per riff note (a second character follows a thirty-second later); held until
  // the attack meter takes the box
  const introChunks = [2, 1, 2, 2, 1, 2, 2, 2, 2, 2]; // '* ' 你 感觉 你将 要 经历 一段 糟糕 的时 光。
  const introTimes = [];
  introChunks.forEach((n, i) => { for (let j = 0; j < n; j++) introTimes.push(r1[i] + (j * S16) / 2); });
  H.say(r1[0], at(2, 1), '* 你感觉你将要经历一段糟糕的时光。', { times: introTimes, x: MB.x + 26, y: MB.y + 22 });

  // ---------------------------------------------------------------- bars 2-3: FIGHT -> target -> MISS
  const sel = at(2, 0);
  TL.btn[0].to(sel, sel + 0.01, { sel: 1 }, 'step');
  H.sfx(sel, 'MenuSelect', 0.5);
  TL.btn[0].to(at(2, 0, 2), at(2, 0, 3), { dy: 3 }, 'out');
  TL.btn[0].to(at(2, 0, 3), at(2, 1), { dy: 0 }, 'out');
  H.punch(sel, 0.8);
  const tm0 = at(2, 1), tHit = at(3, 0), tm1 = at(3, 2, 2);
  TL.add({
    t0: tm0, t1: tm1, z: 3,
    draw(ctx, emi, t) {
      const b = TL.box.at(t);
      const a = U.clamp((t - tm0) / 0.1) * U.clamp((tm1 - t) / 0.15);
      // cursor sweeps in from the left edge and lands dead centre on the downbeat
      const u = U.clamp((t - tm0) / (tHit - tm0));
      const x = U.lerp(b.x + 16, b.x + b.w / 2, u);
      D.meter(ctx, emi, b, a, x, t > tHit && Math.floor((t - tHit) / (S16 / 2)) % 2 === 0);
    },
  });
  TL.btn[0].to(tHit, tHit + 0.01, { sel: 0 }, 'step');
  // the strike lands exactly on the downbeat... on an empty spot
  TL.add({ t0: tHit, t1: tHit + 0.36, z: 55, draw(ctx, emi, t) { D.strike(ctx, emi, ex, ey - 80, (t - tHit) / 0.36, { scale: 4 }); } });
  TL.burst(tHit + 0.1, { x: ex, y: ey - 80, n: 26, speed: [80, 300], life: [0.2, 0.5], colors: ['#ff2040', '#ffffff'], size: [2, 4], z: 56 });
  H.sfx(tHit, 'PlayerFight', 0.7);
  H.hit(tHit, 1.2, { dx: 1 });
  TL.enemy.to(tHit - S16 * 0.6, tHit + 0.1, { x: ex - 96, ghost: 1 }, 'outExpo');
  TL.enemy.to(tHit + 0.1, tHit + 0.3, { ghost: 0 }, 'lin');
  TL.head.set(tHit - S16, 'Wink');
  H.miss(at(3, 1), ex, ey - 150);
  TL.enemy.to(at(3, 2), at(3, 2, 3), { x: ex, ghost: 1 }, 'outExpo');
  TL.enemy.to(at(3, 2, 3), at(3, 3), { ghost: 0 }, 'lin');
  TL.head.set(at(3, 2), 'Default');
  H.cam(tHit, tHit + 0.25, { zoom: 1.5, y: 200, roll: 0.04 }, 'outExpo');
  H.cam(at(3, 2), at(4, 0), { zoom: 1.2, y: 290, roll: 0 }, 'inOut');
  // the box shrinks to the enemy's turn; the soul drops into it
  H.box(at(3, 2), at(3, 3, 2), { x: B0.x, y: B0.y, w: B0.w, h: B0.h }, 'outBack');
  TL.soul.set(0, { x: L.btnX[0] + 16, y: L.btnY + 21, a: 0 });
  TL.soul.set(at(3, 2, 2), { a: 1 });
  TL.soul.hop(at(3, 2, 2), at(4, 0), { x: C0[0], y: C0[1] }, 90, 'y', 'in2');
  TL.ring(at(4, 0), C0[0], C0[1], { r0: 6, r1: 50, color: '#ff3040' });
  H.sfx(at(4, 0), 'Ding', 0.35);
});

// ---------------------------------------------------------------- bars 4-7: build
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, C0 = H.C0;
  const [ex, ey] = L.enemy;
  TL.post.to(at(4), at(8), { bgHue: 0.3 }, 'inOut');

  // bars 4-5: the bones play the riff like a piano roll (pitch -> height)
  const pianoLen = (bar, i) => 26 + (H.RIFF_H[i] + H.ROOTS[bar % 4] + 4) * 3;
  const hiY = C0[1] - 44, loY = C0[1] + 44;
  H.riffTimes(4).forEach((t, i) => {
    H.spike({ side: 'bottom', u: 0.07 + (0.86 * i) / 9, len: pianoLen(4, i), w: 8 + (H.RIFF_H[i] > 6 ? 4 : 0), tHit: t + 0.02, rise: 0.05, tOut: t + 0.2, fall: 0.1, sfx: 0.18 });
    H.punch(t, 0.25 + H.RIFF_H[i] / 30);
  });
  H.riffTimes(5).forEach((t, i) => {
    H.spike({ side: 'top', u: 0.93 - (0.86 * i) / 9, len: pianoLen(5, i), w: 8 + (H.RIFF_H[i] > 6 ? 4 : 0), tHit: t + 0.02, rise: 0.05, tOut: t + 0.2, fall: 0.1, sfx: 0.18 });
    H.punch(t, 0.25 + H.RIFF_H[i] / 30);
  });
  H.soulTo(at(4, 0), at(4, 0, 3), C0[0], hiY, 'outExpo');
  for (let k = 1; k < 7; k++) if (k !== 4) H.soulTo(at(4, k), at(4, k) + 0.2, C0[0] + (k % 2 ? 14 : -14), k < 4 ? hiY : loY, 'inOut');
  H.dash(at(4, 3, 2), C0[0], loY, S16 * 1.5, Math.PI * 2);
  H.cam(at(4), at(4, 0, 3), { pitch: 0.24, roll: 0.035, zoom: 1.6, y: 318, x: 480 }, 'outExpo');
  H.cam(at(5), at(5, 0, 3), { pitch: -0.22, roll: -0.04, zoom: 1.7, y: 330 }, 'outExpo');

  // bar 6: bones slide in from the right on every beat, floor/ceiling alternating
  for (let k = 0; k < 4; k++) {
    const tc = at(6, k), floor = k % 2 === 0;
    H.slide({ side: floor ? 'bottom' : 'top', len: 66, w: 12, tc, cross: C0[0], speed: 520, dir: -1 });
    H.dash(tc - S16 * 2, C0[0], floor ? C0[1] - 38 : C0[1] + 38, S16 * 1.2);
    H.punch(tc, 0.6);
  }
  H.cam(at(6), at(6, 0, 3), { pitch: 0, roll: 0, yaw: 0.28, zoom: 1.9, y: 344 }, 'outExpo');
  H.cam(at(6, 2), at(6, 2, 3), { yaw: -0.28 }, 'outExpo');
  H.cam(at(7), at(7, 1), { yaw: 0, zoom: 1.5, y: 300 }, 'inOut');

  // bar 7: the box tightens with the sub swell, bones rattle on the riff notes
  H.box(at(7), at(8), { x: 425, y: 294, w: 110, h: 110 }, 'inOut');
  H.soulTo(at(7), at(7, 1), 480, 349, 'inOut');
  H.riffTimes(7).forEach((t, i) => {
    const side = ['bottom', 'right', 'top', 'left'][i % 4];
    H.spike({ side, u: 0.2 + ((i * 0.37) % 0.6), len: 16 + i * 1.5, w: 8, tHit: t + 0.02, rise: 0.04, tOut: t + 0.1, fall: 0.06, puff: false, sfx: 0.12 });
  });
  // zoom into the face; the eyes go dark; a 16th-note stutter into the drop
  H.cam(at(7, 1), at(7, 3, 2), { x: ex, y: ey - 112, zoom: 3.4, pitch: -0.12, roll: 0.02 }, 'inOut');
  TL.head.set(at(7, 1), 'NoEyes');
  TL.post.to(at(7, 1), at(7, 3), { vig: 0.75, bg: 0.3 }, 'inOut');
  for (let s = 0; s < 4; s++) {
    const t = at(7, 3, s);
    TL.glitch(t, t + 0.05 + s * 0.012, 0.3 + s * 0.2);
    H.punch(t, 0.5 + s * 0.3);
  }
  TL.head.set(at(7, 3, 2), 'BlueEye');
  H.sfx(at(7, 3, 2), 'Flash', 0.4);
});
