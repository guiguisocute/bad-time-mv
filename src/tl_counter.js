// Bars 40-47: the player's turn. MERCY is gone, ITEM and ACT are gone; only
// FIGHT is left. Every strike is on the beat, every strike MISSES.
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, H = MV.H, U = MV.U, D = MV.D, L = MV.LAYOUT;
  const at = H.at, S16 = H.S16, BEAT = H.BEAT;
  const MB = L.menuBox, B0 = L.box, C0 = H.C0;
  const [ex, ey] = L.enemy;

  const t0 = at(40);
  TL.post.set(t0, { bloom: 0.8, vig: 0.7, bg: 0.25, ca: 0.4, desat: 0.2 });
  TL.box.set(t0, { x: MB.x, y: MB.y, w: MB.w, h: MB.h });
  TL.soul.set(t0, { a: 0, x: L.btnX[0] + 16, y: L.btnY + 21, rot: 0, sc: 1 });
  TL.hud.set(t0, { hp: 61, kr: 0 });
  H.cut(t0, { x: 480, y: 300, zoom: 1.05, pitch: 0, roll: 0, yaw: 0 });
  H.cam(t0, at(42), { zoom: 1.2, y: 310 }, 'inOut');
  TL.head.set(t0, 'Default');
  H.say(at(40, 0, 2), at(41), '* 你只剩下「战斗」。', { x: MB.x + 26, y: MB.y + 22 });
  TL.btn[0].to(at(41), at(41) + 0.01, { sel: 1 }, 'step');
  H.sfx(at(41), 'MenuSelect', 0.5);

  // one strike: cursor lands dead centre on tHit, the enemy is already gone
  const meter = (tA, tEnd, cursors) =>
    TL.add({
      t0: tA, t1: tEnd, z: 3,
      draw(ctx, emi, t) {
        const b = TL.box.at(t);
        const a = U.clamp((t - tA) / 0.1) * U.clamp((tEnd - t) / 0.12);
        D.meter(ctx, emi, b, a);
        for (const c of cursors) {
          if (t < c.t0 || t > c.hit + 0.4) continue;
          const u = U.clamp((t - c.t0) / (c.hit - c.t0));
          const from = c.fromRight ? b.x + b.w - 16 : b.x + 16;
          const x = U.lerp(from, b.x + b.w / 2, u);
          D.meter(ctx, emi, b, 0, x, t > c.hit && Math.floor((t - c.hit) / (S16 / 2)) % 2 === 0);
          const cImg = MV.SPR.choice[t > c.hit && Math.floor((t - c.hit) / (S16 / 2)) % 2 === 0 ? 1 : 0];
          ctx.globalAlpha = a * (t > c.hit ? U.clamp(1 - (t - c.hit - 0.25) / 0.15) : 1);
          ctx.drawImage(cImg, Math.round(x - 7), Math.round(b.y + b.h / 2 - 64));
          ctx.globalAlpha = 1;
        }
      },
    });
  const strike = (tHit, dodge, missY, cam, missX = ex) => {
    TL.add({ t0: tHit, t1: tHit + 0.36, z: 55, draw(ctx, emi, t) { D.strike(ctx, emi, ex, ey - 80, (t - tHit) / 0.36, { scale: 4, rot: 0.5 * (dodge > 0 ? 1 : -1) }); } });
    TL.burst(tHit + 0.1, { x: ex, y: ey - 80, n: 20, speed: [80, 280], life: [0.2, 0.45], colors: ['#ff2040', '#ffffff'], size: [2, 4], z: 56 });
    H.sfx(tHit, 'PlayerFight', 0.7);
    H.hit(tHit, 1.1, { dx: dodge > 0 ? 1 : -1 });
    TL.enemy.to(tHit - S16 * 0.6, tHit + 0.08, { x: ex + dodge, ghost: 1 }, 'outExpo');
    TL.enemy.to(tHit + 0.08, tHit + 0.25, { ghost: 0 }, 'lin');
    H.miss(tHit + BEAT * 0.5, missX, missY, { dur: 0.9 });
    if (cam) H.cut(tHit, cam);
  };

  // attempt 1
  meter(at(41), at(42, 3), [{ t0: at(41), hit: at(42) }]);
  TL.btn[0].to(at(42), at(42) + 0.01, { sel: 0 }, 'step');
  strike(at(42), -96, ey - 150, { x: ex - 40, y: ey - 90, zoom: 2.3, pitch: -0.1, roll: 0.05, yaw: 0 });
  TL.head.set(at(42) - S16, 'Wink');
  TL.enemy.to(at(42, 2), at(42, 3), { x: ex, ghost: 1 }, 'outExpo');
  TL.enemy.to(at(42, 3), at(42, 3, 2), { ghost: 0 }, 'lin');
  H.cam(at(42, 2), at(43), { x: 480, y: 290, zoom: 1.2, roll: 0, pitch: 0 }, 'inOut');
  TL.head.set(at(43), 'Default');
  TL.torso.set(at(43), 'Shrug');
  TL.torso.set(at(44), 'Default');
  H.say(at(43), at(43, 3, 2), '* 他只是笑了笑。', { x: MB.x + 26, y: MB.y + 22, voice: 'SansSpeak', vol: 0.25 });

  // attempt 2: four cursors, four strikes on the four beats of bar 45 — four MISSes
  TL.btn[0].to(at(44), at(44) + 0.01, { sel: 1 }, 'step');
  H.sfx(at(44), 'MenuSelect', 0.5);
  TL.btn[0].to(at(44, 2), at(44, 2) + 0.01, { sel: 0 }, 'step');
  const cs = [0, 1, 2, 3].map((k) => ({ t0: at(44, 2) + k * BEAT * 0.5, hit: at(45, k), fromRight: k % 2 === 1 }));
  meter(at(44, 2), at(46, 1), cs);
  const cams = [
    { x: ex + 60, y: ey - 100, zoom: 2.6, roll: -0.12, pitch: 0, yaw: 0.2 },
    { x: ex - 70, y: ey - 60, zoom: 1.9, roll: 0.12, pitch: 0.25, yaw: -0.2 },
    { x: ex + 30, y: ey - 130, zoom: 3.0, roll: -0.05, pitch: -0.3, yaw: 0 },
    { x: ex, y: ey - 40, zoom: 1.6, roll: 0.2, pitch: 0.1, yaw: 0.3 },
  ];
  const side = [96, -96, 110, -110];
  for (let k = 0; k < 4; k++) {
    strike(at(45, k), side[k], ey - 150 - (k % 2) * 34, cams[k], ex + side[k] * 0.35);
    TL.enemy.to(at(45, k) - S16 * 0.6, at(45, k) + 0.08, { x: ex + side[k] }, 'outExpo');
  }
  TL.head.set(at(45) - S16, 'LookLeft');
  TL.head.set(at(45, 2), 'Wink');
  TL.enemy.to(at(46), at(46, 0, 3), { x: ex, ghost: 1 }, 'outExpo');
  TL.enemy.to(at(46, 0, 3), at(46, 1), { ghost: 0 }, 'lin');
  H.cut(at(46), { x: 480, y: 280, zoom: 1.15, roll: 0, pitch: 0, yaw: 0 });

  // bar 46: he answers from a speech bubble — and quietly plants the ending
  TL.head.set(at(46), 'Wink');
  TL.head.set(at(46, 2), 'Default');
  const tT = at(46) - 0.06, tEndB = at(47, 2);
  const lines = ['什么？你觉得我会', '呆呆站在这里给你打？'];
  // spoken in phrases on the beat: 什么？ | 你觉得我会 | 呆呆站在这里 | 给你打？ (as the eye ignites on bar 47)
  const sayT = [
    at(46, 0, 0), at(46, 0, 1), at(46, 0, 2),
    at(46, 1, 0), at(46, 1, 1), at(46, 1, 2), at(46, 1, 3), at(46, 2, 0),
    at(46, 2, 2), at(46, 2, 3), at(46, 3, 0), at(46, 3, 1), at(46, 3, 2), at(46, 3, 3),
    at(47, 0, 0), at(47, 0, 1), at(47, 0, 2), at(47, 0, 3),
  ];
  const bubbleX = ex + 62, bubbleY = ey - 146;
  TL.add({
    t0: tT, t1: tEndB, z: 64,
    draw(ctx, emi, t) {
      const img = MV.frame('SpeechBubble', 'Default');
      const pop = MV.EASE.outBack(U.clamp((t - tT) / 0.1));
      const fade = U.clamp((tEndB - t) / 0.1);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(bubbleX, bubbleY + 52);
      ctx.scale(pop, pop);
      ctx.drawImage(img, 0, -52);
      ctx.restore();
      let n = 0;
      for (const tt of sayT) if (t >= tt) n++;
      let y = bubbleY + 22;
      for (const ln of lines) {
        const k = Math.min(n, [...ln].length);
        D.text(ctx, [...ln].slice(0, k).join(''), bubbleX + 42, y, { scale: 1, color: '#000000', alpha: fade });
        n -= k; y += 26;
      }
    },
  });
  sayT.forEach((tt) => H.sfx(tt, 'SansSpeak', 0.3));
  if (MV.TIKTOK) {
    // vertical cut: hold one shot that holds him and the whole bubble until the last word has
    // landed, then cut straight to the eye (bubble: x 542..779, y 108..212)
    const tEye = at(47, 1);
    H.cut(at(46), { x: 600, y: 200, zoom: 1.3, roll: 0, pitch: 0, yaw: 0 });
    H.cam(at(46), tEye - 0.01, { zoom: 1.36, x: 602 }, 'lin');
    TL.pcam.set(at(46), { k: 0.6, dx: 0 });
    TL.pcam.set(tEye, { k: 0.62, dx: 0 });
    H.cut(tEye, { x: ex, y: ey - 104, zoom: 2.6, roll: -0.03, pitch: -0.05, yaw: 0 });
    H.cam(tEye, at(47, 3, 2), { zoom: 3.4, roll: -0.05, pitch: -0.1 }, 'in2');
    H.punch(tEye, 0.8);
  }
  if (!MV.TIKTOK) H.cam(at(46), at(46, 0, 3), { x: ex + 60, y: ey - 90, zoom: 2.1, roll: 0, pitch: 0 }, 'outExpo');
  // his turn: the menu box closes into the arena and the soul is pulled in from the FIGHT button
  const tS = at(46, 3);
  TL.btn[0].to(tS, tS + 0.01, { sel: 0 }, 'step');
  H.box(tS, tS + 0.3, B0, 'outBack');
  TL.soul.set(tS, { a: 1, x: L.btnX[0] + 16, y: L.btnY + 21, rot: 0, sc: 1 });
  TL.soul.to(tS, at(47), { x: C0[0], y: C0[1] }, 'inOut');
  if (!MV.TIKTOK) H.cam(tS, at(47), { x: 480, y: 300, zoom: 1.25 }, 'inOut');
  TL.post.to(at(47), at(47, 1), { bloom: 1, vig: 0.4, bg: 0.6, ca: 0.6, desat: 0 }, 'inOut');
  // bar 47: the eye ignites, the camera creeps in, sixteenth stutters into the frenzy
  TL.head.set(at(47), 'BlueEye');
  if (!MV.TIKTOK) H.cam(at(47), at(47, 3, 2), { x: ex, y: ey - 110, zoom: 3.2, roll: -0.04, pitch: -0.1 }, 'inOut');
  for (let s = 8; s < 16; s++) H.punch(at(47, 0, s), 0.2 + (s - 8) * 0.1);
  for (let s = 12; s < 16; s++) TL.glitch(at(47, 0, s), at(47, 0, s) + 0.05, 0.3 + (s - 12) * 0.2);
});
