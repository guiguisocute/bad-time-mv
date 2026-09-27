// Bars 8-15: DROP A — white bone barrage. The soul rolls through gaps that
// always line up with the beat.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const B0 = L.box, C0 = H.C0;

  // ---------------------------------------------------------------- 16.04 the drop
  const t0 = at(8);
  H.bigHit(t0);
  H.sfx(t0, 'Slam', 0.8);
  H.cut(t0, { x: 476, y: 322, zoom: 1.65, pitch: 0.12, roll: 0.06, yaw: 0 });
  TL.post.set(t0, { vig: 0.35, bg: 1, bgHue: 0 });
  TL.box.set(t0, { x: B0.x, y: B0.y, w: B0.w, h: B0.h });
  TL.soul.set(t0, { x: C0[0], y: C0[1] });
  for (const side of ['bottom', 'top', 'left', 'right'])
    for (let i = 0; i < 7; i++)
      H.spike({ side, u: 0.1 + i * 0.133, len: side === 'left' || side === 'right' ? 44 : 34, w: 10, tHit: t0 + 0.03, rise: 0.05, tOut: t0 + 0.24, fall: 0.08, puff: i % 2 === 0 });
  TL.head.set(at(8, 2), 'Default');

  // ---------------------------------------------------------------- bars 8-9: gap walls on every beat
  const gaps = [0.3, 0.72, 0.5, 0.24, 0.7, 0.42, 0.62, 0.5];
  const SX = 458;
  for (let k = 0; k < 8; k++) {
    const tc = at(8, k + 1); // walls cross the soul on beats 1..8
    const b = TL.box.at(tc);
    const gy = b.y + gaps[k] * b.h;
    H.dash(tc - S16 * 2, SX, gy, S16 * 1.3, k % 2 ? -Math.PI * 2 : Math.PI * 2);
    const dir = k < 4 ? -1 : 1;
    H.gapWall({ tc, cross: SX, gapY: gy, gap: 46, speed: 560, dir, w: k % 4 === 3 ? 14 : 10 });
    H.punch(tc, 0.7);
  }
  H.cam(at(8, 1), at(9), { roll: -0.05, zoom: 1.75, pitch: 0.2, x: 470, y: 336 }, 'inOut');
  H.cam(at(9), at(10), { roll: 0.05, zoom: 1.55, pitch: 0.05, yaw: -0.12, x: 490, y: 320 }, 'inOut');

  // ---------------------------------------------------------------- bars 10-11: narrow box + bone rain
  const nb = { x: 425, y: 264, w: 110, h: 150 };
  H.box(at(10), at(10) + 0.2, nb, 'outBack');
  H.hit(at(10), 1);
  H.cam(at(10), at(10, 0, 3), { roll: -0.08, zoom: 1.95, x: 480, y: 336, pitch: 0, yaw: 0 }, 'outExpo');
  H.cam(at(11), at(11, 0, 3), { roll: 0.08, zoom: 2.05, pitch: -0.18 }, 'outExpo');
  const SY = 360;
  const sideX = (k) => (k % 2 ? nb.x + nb.w - 22 : nb.x + 22);
  H.soulTo(at(10), at(10, 0, 2), sideX(0), SY, 'outExpo');
  for (let k = 1; k < 8; k++) H.dash(at(10, k) - S16, sideX(k), SY, S16 * 1.2);
  const spikeAt = [];
  // spikes on every beat in the half the soul just left: floor or ceiling, a different cluster
  // each time (count, spread, place, length, width, together or staggered; seeded, so repeatable)
  for (let k = 0; k < 8; k++) {
    const tc = at(10, k), soulLeft = sideX(k) < 480;
    const r = (i) => U.hash(k * 13.7 + i * 3.1 + 5);
    const side = r(0) < 0.35 ? 'top' : 'bottom';
    // 2-3 bones, never closer than 24 px so they read as separate bones
    const gapU = 24 / nb.w, lo = soulLeft ? 0.56 : 0.06, hi = soulLeft ? 0.94 : 0.44;
    const n = Math.min(2 + Math.floor(r(1) * 2), 1 + Math.floor((hi - lo) / gapU));
    const span = Math.min(hi - lo, Math.max((n - 1) * gapU, (hi - lo) * (0.5 + r(2) * 0.5))), a = lo + r(3) * (hi - lo - span);
    const stagger = r(14) < 0.4 ? S16 / 2 : 0;
    for (let i = 0; i < n; i++) {
      const u = a + (span * i) / (n - 1);
      const len = (side === 'top' ? 24 : 28) + Math.round(r(4 + i) * 34);
      spikeAt.push({ x: nb.x + u * nb.w, t0: tc - 0.06 + i * stagger, t1: tc + 0.4 });
      H.spike({ side, u, len, w: 8 + Math.round(r(9 + i) * 3), tHit: tc + 0.02 + i * stagger, tOut: tc + 0.3, puff: i % 2 === 0, sfx: i === 0 || stagger ? 0.3 : false });
    }
  }

  // rain: one bone per loud sixteenth, always on the half the soul is NOT in
  const FALL = 520;
  for (let s = 0; s < 32; s++) {
    const t = at(10, 0, s);
    const slot = T.slot(t + 0.001);
    const acc = Math.max(T.acc(slot, 'full'), T.acc(slot, 'high'));
    if (acc < 0.45 && s % 4 !== 0) continue;
    const len = 18 + Math.round(acc * 22);
    const tp = t + (SY - (nb.y - 40)) / FALL; // when it passes the soul's height
    const sx = TL.soul.at(tp).x, sx2 = TL.soul.at(tp - 0.08).x, sx3 = TL.soul.at(tp + 0.08).x;
    const left = sx > 480 && sx2 > 480 && sx3 > 480;
    const right = sx < 480 && sx2 < 480 && sx3 < 480;
    if (!left && !right) continue;
    // never through a spike that is standing while this bone falls
    const clear = (x) => spikeAt.every((k) => k.t1 < t || k.t0 > t + 0.6 || Math.abs(k.x - x) > 16);
    const cands = [0, 0.25, 0.5, 0.75, 1].map((f) => (U.hash(s) + f) % 1).map((f) => (left ? nb.x + 12 + f * 34 : nb.x + nb.w - 12 - f * 34));
    const x = cands.find(clear);
    if (x === undefined) continue;
    H.bone({ t0: t, t1: t + 0.6, w: acc > 0.7 ? 12 : 8, geo: (tt) => ({ x, y: nb.y - 40 - len + FALL * (tt - t), ang: Math.PI / 2, len }) });
  }

  // ---------------------------------------------------------------- bars 12-13: wide arena, combs from both sides
  const wb = { x: 330, y: 294, w: 300, h: 120 };
  H.box(at(12), at(12) + 0.22, wb, 'outBack');
  H.hit(at(12), 1.1);
  H.cam(at(12), at(12, 0, 2), { x: 480, y: 345, zoom: 1.5, pitch: 0.38, roll: 0.07, yaw: 0.16 }, 'outExpo');
  H.cam(at(12, 0, 2), at(14), { roll: -0.07, yaw: -0.16, pitch: 0.3 }, 'inOut');
  const gaps2 = [0.25, 0.7, 0.45, 0.2, 0.75, 0.5, 0.3, 0.66];
  for (let k = 0; k < 8; k++) {
    const tc = at(12, k) + BEAT * 0.5; // crossing on the off-beat, dash on the beat
    const b = TL.box.at(tc);
    const gy = b.y + gaps2[k] * b.h;
    H.dash(at(12, k) - S16 * 0.5, 480, gy, S16 * 1.3, k % 3 === 0 ? Math.PI * 2 : 0);
    H.gapWall({ tc, cross: 480, gapY: gy, gap: 42, speed: 620, dir: k % 2 ? 1 : -1, w: k % 2 ? 16 : 10 });
    H.punch(at(12, k), k % 2 ? 0.5 : 0.8);
  }
  // tiny fast bones skittering along the floor on the loud sixteenths
  for (let s = 0; s < 32; s++) {
    const t = at(12, 0, s);
    if (T.acc(T.slot(t + 0.001), 'high') < 0.55) continue;
    H.slide({ side: 'bottom', len: 12, w: 6, tc: t + 0.25, cross: 480, speed: 900, dir: s % 2 ? 1 : -1 });
  }

  // ---------------------------------------------------------------- bars 14-15: orbit + chasing spikes, UI gets hit
  H.box(at(14), at(14) + 0.2, { x: B0.x, y: B0.y, w: B0.w, h: B0.h }, 'outBack');
  H.hit(at(14), 1.2);
  H.cam(at(14), at(14, 0, 2), { x: 480, y: 340, zoom: 1.75, pitch: 0, roll: 0, yaw: 0 }, 'outExpo');
  H.cam(at(14, 0, 2), at(15, 3), { roll: -0.5, zoom: 1.45, y: 350 }, 'inOut');
  H.cam(at(15, 3), at(16), { roll: 0, zoom: 1.3, y: 320 }, 'outExpo');
  const C = C0, RAD = 42;
  const ang0 = -Math.PI / 2;
  const orbit = (t) => ang0 + ((t - at(14)) / (2 * H.BAR)) * Math.PI * 2 * 2; // 2 turns over 2 bars
  H.soulTo(at(14), at(14, 0, 2), C[0] + Math.cos(ang0) * RAD, C[1] + Math.sin(ang0) * RAD, 'outExpo');
  const oEnd = at(16) - 0.3; // hand over to the next section's first dash
  for (let i = 1; i <= 64; i++) {
    const t = at(14, 0, 2) + (i / 64) * (oEnd - at(14, 0, 2));
    const a = orbit(t);
    TL.soul.to(t - (oEnd - at(14, 0, 2)) / 64, t, { x: C[0] + Math.cos(a) * RAD, y: C[1] + Math.sin(a) * RAD }, 'lin');
  }
  // spikes stab from the wall point opposite the soul on every riff note
  for (const bar of [14, 15])
    H.riffTimes(bar).forEach((t, i) => {
      const a = orbit(t) + Math.PI + (i % 2 ? 0.5 : -0.5);
      const dx = Math.cos(a), dy = Math.sin(a);
      // pick the wall the ray from the centre hits
      const b = B0;
      const tx = dx > 0 ? (b.x + b.w - C[0]) / dx : (b.x - C[0]) / dx;
      const ty = dy > 0 ? (b.y + b.h - C[1]) / dy : (b.y - C[1]) / dy;
      let side, u;
      if (Math.abs(tx) < Math.abs(ty)) { side = dx > 0 ? 'right' : 'left'; u = (C[1] + dy * tx - b.y) / b.h; }
      else { side = dy > 0 ? 'bottom' : 'top'; u = (C[0] + dx * ty - b.x) / b.w; }
      const depth = side === 'left' || side === 'right' ? b.w : b.h;
      H.spike({ side, u: U.clamp(u, 0.08, 0.92), len: depth * 0.52, w: 10 + (i % 3) * 3, tHit: t + 0.02, rise: 0.04, tOut: t + 0.14, fall: 0.07 });
      H.punch(t, 0.35);
    });
  // 28.04: a huge bone skewers up through the ITEM button (outside the box)
  const bx = L.btnX[2] + 85;
  const tS = at(14);
  H.bone({ t0: tS - 0.05, t1: tS + 0.7, w: 22, clip: null, z: 25,
    geo: (t) => { const k = t < tS ? MV.EASE.outExpo((t - tS + 0.05) / 0.05) : t < tS + 0.45 ? 1 : 1 - MV.EASE.in((t - tS - 0.45) / 0.25); return { x: bx, y: 820 - 260 * k, ang: -Math.PI / 2, len: 250 }; } });
  TL.btn[2].to(tS, tS + 0.05, { dy: -8, dx: 4 }, 'outExpo');
  TL.btn[2].to(tS + 0.05, tS + 0.5, { dy: 0, dx: 0 }, 'outElastic');
  H.sfx(tS, 'BoneStab', 0.7);
  TL.burst(tS, { x: bx, y: L.btnY + 20, n: 30, speed: [80, 260], ang: [-Math.PI, 0], life: [0.3, 0.7], g: 500, colors: ['#ff7f27', '#ffffff'], size: [2, 4], z: 45 });
  // 30.04: another bone slams the HP bar -> KR poison
  const tB = at(15);
  const hx = L.hpBar.x + 70;
  H.bone({ t0: tB - 0.06, t1: tB + 0.5, w: 14, clip: null, z: 25,
    geo: (t) => { const k = t < tB ? MV.EASE.inExpo((t - tB + 0.06) / 0.06) : 1 - MV.EASE.in(U.clamp((t - tB - 0.25) / 0.25)); return { x: hx, y: 750 - 160 * k, ang: -Math.PI / 2, len: 150 }; } });
  H.hit(tB, 0.8, { dy: -1 });
  H.sfx(tB, 'PlayerDamaged', 0.6);
  TL.hud.to(tB, tB + 0.05, { hp: 80, kr: 12, barDy: -6 }, 'outExpo');
  TL.hud.to(tB + 0.05, tB + 0.4, { barDy: 0 }, 'outElastic');
  TL.hud.to(tB + 0.4, at(16, 2), { hp: 76, kr: 0 }, 'lin');
  TL.burst(tB, { x: hx, y: L.hpBar.y + 11, n: 20, speed: [60, 200], ang: [-Math.PI, 0], life: [0.2, 0.5], colors: ['#ff00ff', '#ffff00'], size: [2, 3], z: 45 });

});
