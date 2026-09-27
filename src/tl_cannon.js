// Bars 24-31: the skull cannons. Every blast fires on the grid; the soul is
// always one step ahead of the beam.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const B0 = L.box, C0 = H.C0;
  const [ex, ey] = L.enemy;
  const aim = (tSpawn, tFire, x, y, tx, ty, o = {}) => H.cannonAim(Object.assign({ tSpawn, tFire, x, y, tx, ty, beamDur: 0.3 }, o));

  // ---------------------------------------------------------------- bar 24-25: volleys
  const t0 = at(24);
  H.bigHit(t0);
  H.sfx(t0, 'Slam', 0.6);
  TL.head.set(t0, 'BlueEye');
  H.box(t0, t0 + 0.15, B0, 'outBack');
  H.cut(t0, { x: 480, y: 300, zoom: 1.15, pitch: 0, roll: 0, yaw: 0 });
  TL.soul.to(t0, t0 + 0.12, { x: 480, y: 392 }, 'outExpo');
  aim(t0, at(24, 1), 280, 318, 480, 318);
  aim(t0, at(24, 1), 680, 318, 480, 318);
  H.dash(at(24, 1, 3), 480, 300, S16 * 1.2, Math.PI * 2);
  aim(at(24, 2), at(24, 3), 300, 150, 430, 410);
  aim(at(24, 2), at(24, 3), 660, 150, 530, 410);
  H.cam(at(24, 2), at(24, 2, 2), { roll: 0.05, zoom: 1.22 }, 'outExpo');
  // cross, then X
  H.dash(at(25) + 0.02, 440, 305, S16 * 1.2);
  aim(at(25), at(25, 1), 480, 110, 480, 344);
  aim(at(25), at(25, 1), 230, 344, 480, 344);
  aim(at(25), at(25, 1), 730, 344, 480, 344);
  aim(at(25), at(25, 1), 480, 580, 480, 344);
  H.cam(at(25), at(25, 0, 2), { roll: -0.05, zoom: 1.3, y: 330 }, 'outExpo');
  H.dash(at(25, 1, 3), 480, 290, S16 * 1.2, -Math.PI * 2);
  for (const [x, y] of [[300, 164], [660, 164], [300, 524], [660, 524]]) aim(at(25, 2), at(25, 3), x, y, 480, 344);
  H.cam(at(25, 2), at(25, 2, 2), { roll: 0.06, zoom: 1.2, y: 310 }, 'outExpo');

  // ---------------------------------------------------------------- bar 26: MEGA cannons (half the screen)
  const tm = at(26);
  H.dash(tm - S16, 532, 360, S16 * 1.2);
  H.cannon({ tSpawn: tm, fires: [at(26, 1)], beamDur: BEAT * 2, scale: 5, pos: () => ({ x: 440, y: -60, ang: Math.PI / 2 }), shake: 2, vol: 0.6 });
  H.cam(tm, tm + 0.3, { x: 480, y: 250, zoom: 0.95, pitch: -0.4, roll: 0.03 }, 'outExpo');
  TL.post.to(at(26, 1), at(26, 1) + 0.05, { bloom: 1.5 }, 'out');
  TL.post.to(at(26, 3), at(27), { bloom: 1 }, 'inOut');
  H.soulTo(at(26, 2, 1), at(26, 2, 2), 532, 400, 'outExpo');
  H.cannon({ tSpawn: at(26, 2), fires: [at(26, 3)], beamDur: BEAT, scale: 5, pos: () => ({ x: 1040, y: 318, ang: Math.PI }), shake: 2, vol: 0.6 });
  H.cam(at(26, 2), at(26, 2, 3), { x: 560, y: 320, zoom: 1.05, pitch: 0.1, yaw: -0.3, roll: -0.04 }, 'outExpo');
  for (let s = 0; s < 16; s += 2) H.punch(at(26, 1, s), 0.5, { amp: 5 });

  // ---------------------------------------------------------------- bar 27: piston blasts on the eighths (3 lanes)
  const lanes = [430, 480, 530];
  H.cam(at(27), at(27, 0, 2), { x: 480, y: 340, zoom: 1.6, pitch: 0.32, yaw: 0, roll: 0 }, 'outExpo');
  // each blaster locks onto the soul's lane and fires one eighth later; the soul
  // leaves the lane 20 ms before the blast
  TL.soul.to(at(27) - 0.02, at(27), { x: lanes[0], y: 392 }, 'outExpo');
  for (let k = 0; k < 8; k++) {
    const s = at(27, 0, k * 2), lane = lanes[k % 3];
    if (k) TL.soul.to(s - 0.02, s, { x: lane, y: 392 }, 'outExpo');
    H.cannon({ tSpawn: s, fires: [s + BEAT / 2], beamDur: 0.1, fall: 0.1, scale: 2, pos: () => ({ x: lane, y: 150, ang: Math.PI / 2 }), vol: 0.3 });
  }

  // ---------------------------------------------------------------- bars 28-29: orbiting crossfire
  const tO = at(28), W = Math.PI / (2 * BEAT * 4); // quarter turn per bar
  const th = (t) => -Math.PI / 4 + (t - tO) * W;
  const RAD = 52;
  const fA = [], fB = [];
  for (let k = 0; k < 8; k++) (k % 2 ? fB : fA).push(at(28, k) + (k === 0 ? BEAT * 0.5 : 0));
  for (let i = 0; i < 4; i++)
    H.orbitCannon({ tSpawn: tO - 0.02 + i * 0.06, tRef: tO, a0: th(tO) + (i * Math.PI) / 2 + Math.PI / 2 * 0, w: W, rad: 175, cx: C0[0], cy: C0[1], fires: i % 2 ? fB : fA, beamDur: 0.32, scale: 2, vol: 0.3 });
  // soul rides the gap between the two beam lines
  const nO = 64, oEnd = at(30) - 0.1;
  TL.soul.to(tO - 0.1, tO + 0.05, { x: C0[0] + Math.cos(th(tO) + Math.PI / 4) * RAD, y: C0[1] + Math.sin(th(tO) + Math.PI / 4) * RAD }, 'outExpo');
  for (let i = 1; i <= nO; i++) {
    const t = tO + 0.05 + (i / nO) * (oEnd - tO - 0.05);
    const a = th(t) + Math.PI / 4;
    TL.soul.to(t - (oEnd - tO - 0.05) / nO, t, { x: C0[0] + Math.cos(a) * RAD, y: C0[1] + Math.sin(a) * RAD }, 'lin');
  }
  for (let i = 0; i <= 8; i++) H.cam(tO + i * BEAT, tO + (i + 1) * BEAT, { x: 480, y: 330, zoom: 1.25 + (i % 2) * 0.1, roll: -th(tO + (i + 1) * BEAT) * 0.35 - 0.27 }, 'inOut');
  // stray blasts carve through the HUD: HP bar shatters, MERCY dissolves
  const tH = at(29);
  H.cannon({ tSpawn: tH - BEAT, fires: [tH], beamDur: 0.3, scale: 2, pos: () => ({ x: 140, y: L.hpBar.y + 10, ang: 0 }), vol: 0.35 });
  TL.hpState.set(tH + 0.02, 'gone');
  H.shatter(tH + 0.02, { x: L.hpBar.x, y: L.hpBar.y, w: L.hpBar.w, h: L.hpBar.h }, (c) => D.hpBar(c, null, L.hpBar.x, L.hpBar.y, 76, 0, 92), { chunk: 5, force: 300, ox: L.hpBar.x - 20 });
  const tM = at(29, 2);
  const mx = L.btnX[3], my = L.btnY;
  H.cannon({ tSpawn: tM - BEAT, fires: [tM], beamDur: 0.4, scale: 2, pos: () => ({ x: 900, y: my + 21, ang: Math.PI }), vol: 0.35 });
  TL.btnState[3].set(tM + 0.02, 'gone');
  H.dissolve(tM + 0.02, 0.6, { x: mx, y: my, w: 110, h: 42 }, (c) => D.button(c, null, 3, mx, my, {}), { ember: '#ff7f27', drift: -120, rise: 70 });
  H.say(tM + 0.3, at(30, 2), '* 仁慈已被删除。', { screen: true, panel: true, scale: 2, x: 64, y: 58, color: '#ff7f27' });

  // ---------------------------------------------------------------- bar 30: horizontal pistons, HP bar glitches back
  TL.hpState.set(at(30), 'ok');
  TL.hud.to(at(30), at(30) + 0.01, { jit: 2 }, 'step');
  TL.hud.to(at(31, 3), at(32), { jit: 0 }, 'lin');
  TL.glitch(at(30), at(30) + 0.12, 0.8);
  const hl = [314, 344, 374];
  H.cam(at(30), at(30, 0, 2), { x: 480, y: 340, zoom: 1.55, pitch: 0, yaw: 0.3, roll: 0.04 }, 'outExpo');
  TL.soul.to(at(30) - 0.02, at(30), { x: 480, y: hl[0] }, 'outExpo');
  for (let k = 0; k < 7; k++) {
    const s = at(30, 0, k * 2), lane = hl[k % 3];
    if (k) TL.soul.to(s - 0.02, s, { x: 480, y: lane }, 'outExpo');
    const fromL = k % 2 === 0;
    H.cannon({ tSpawn: s, fires: [s + BEAT / 2], beamDur: 0.1, fall: 0.1, scale: 2, pos: () => ({ x: fromL ? 250 : 710, y: lane, ang: fromL ? 0 : Math.PI }), vol: 0.3 });
  }
  // ---------------------------------------------------------------- bar 31: a ring of six, all fire on the climax downbeat
  TL.soul.to(at(31) - 0.27, at(31) - 0.25, { x: C0[0], y: C0[1] }, 'outExpo');
  const tC = at(32);
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2 - Math.PI / 2;
    const d = Math.asin(46 / 190);
    H.cannon({ tSpawn: at(31, 0, k * 2), fires: [tC], beamDur: 0.45, scale: 2, vol: 0.25,
      pos: (t) => { const a = a0 + (t - at(31)) * 0.6; return { x: C0[0] + Math.cos(a) * 190, y: C0[1] + Math.sin(a) * 190, ang: a + Math.PI + d }; } });
  }
  H.cam(at(31), at(32), { x: 480, y: 344, zoom: 1.9, roll: 0.35, pitch: 0.1 }, 'in2');
  TL.post.to(at(31, 2), at(32), { vig: 0.7, ca: 2.5 }, 'in');
  for (let s = 8; s < 16; s++) H.punch(at(31, 0, s), 0.2 + (s - 8) * 0.08);
  TL.soul.to(at(31, 2), at(32) - 0.02, { sc: 1.3 }, 'in');
  TL.soul.to(at(32), at(32) + 0.1, { sc: 1 }, 'out');
});
