// Frame composition: evaluates the timeline at time t and paints the world,
// emissive (bloom source) and screen-overlay canvases.
(function () {
  const MV = window.MV, U = MV.U, D = MV.D, TL = MV.TL, T = MV.T;
  const R = Math.round;

  // ---------------------------------------------------------------- layout
  // The original 640x480 battle layout, placed 1:1 in the 960x540 world (+160, +30).
  const L = (MV.LAYOUT = {
    enemy: [480, 254],
    box: { x: 405, y: 274, w: 150, h: 140 },
    menuBox: { x: 192, y: 270, w: 576, h: 144 },
    hudY: 436,
    name: 190, lv: 292, hpLabel: 384, krLabel: 533, num: 566,
    hpBar: { x: 415, y: 430, w: 110, h: 20 },
    btnY: 462, btnH: 42, btnW: 110, btnX: [192, 345, 505, 660],
  });

  // ---------------------------------------------------------------- UI pieces
  D.button = (ctx, emi, i, x, y, o = {}) => {
    const sel = (o.sel || 0) > 0.5;
    ctx.globalAlpha = o.a ?? 1;
    ctx.drawImage(MV.SPR['btn' + i + (sel ? 'h' : '')], R(x), R(y));
    ctx.globalAlpha = 1;
    if (sel && o.soul !== false) D.soul(ctx, emi, x + 16, y + 21, { col: 'red' });
    if (emi && sel) { emi.globalAlpha = 0.22 * (o.a ?? 1); emi.fillStyle = MV.COL.yellow; emi.fillRect(R(x) - 3, R(y) - 3, L.btnW + 6, L.btnH + 6); emi.globalAlpha = 1; }
  };
  D.hpBar = (ctx, emi, x, y, hp, kr, max, a = 1) => {
    const w = L.hpBar.w, h = L.hpBar.h;
    const fw = R(w * U.clamp(hp / max)), kw = R(w * U.clamp(kr / max));
    ctx.globalAlpha = a;
    ctx.fillStyle = MV.COL.hpRed; ctx.fillRect(R(x), R(y), w, h);
    ctx.fillStyle = MV.COL.hpYellow; ctx.fillRect(R(x), R(y), fw, h);
    if (kw > 0) { ctx.fillStyle = MV.COL.kr; ctx.fillRect(R(x) + fw - kw, R(y), kw, h); }
    ctx.globalAlpha = 1;
  };
  // the original attack target + cursor (cursor x in world px, blink = frame 1)
  D.meter = (ctx, emi, b, a = 1, cursorX, blink) => {
    const img = MV.SPR.target;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.globalAlpha = a;
    ctx.drawImage(img, R(cx - img.width / 2), R(cy - img.height * 0.504));
    if (cursorX !== undefined) {
      const c = MV.SPR.choice[blink ? 1 : 0];
      ctx.drawImage(c, R(cursorX - c.width / 2), R(cy - c.height / 2));
      if (emi) { emi.globalAlpha = 0.5 * a; emi.fillStyle = '#ffffff'; emi.fillRect(R(cursorX - 9), R(cy - 66), 18, 132); }
    }
    ctx.globalAlpha = 1;
    if (emi) { emi.globalAlpha = 0.12 * a; emi.drawImage(img, R(cx - img.width / 2), R(cy - img.height * 0.504)); emi.globalAlpha = 1; }
  };

  // ---------------------------------------------------------------- state
  MV.state = (t) => {
    const fx = TL.fxAt(t);
    const cam = TL.cam.at(t);
    cam.x += fx.sx; cam.y += fx.sy;
    cam.zoom *= 1 + fx.zoom;
    cam.roll += fx.rot;
    const box = TL.box.at(t);
    // wall bulges from slams
    box.bulge = {};
    for (const h of TL.boxHits) {
      const dt = t - h.t;
      if (dt < 0 || dt > 0.8) continue;
      const k = h.amt * Math.exp(-dt * 9) * Math.cos(dt * 38);
      const q = box.bulge[h.side];
      if (!q || Math.abs(k) > Math.abs(q[0])) box.bulge[h.side] = [k, h.u, 0.22];
    }
    box.cracks = TL.cracks.filter((c) => t >= c.t0 && t < c.t1);
    box.gaps = {};
    for (const g of TL.boxGaps) if (t >= g.t0 && t < g.t1) box.gaps[g.side] = [g.u0, g.u1];
    return {
      t, fx, cam, box,
      soul: TL.soul.at(t),
      soulCol: TL.soulCol.at(t),
      aura: TL.aura.at(t).v,
      enemy: TL.enemy.at(t),
      head: TL.head.at(t), body: TL.body.at(t), bodySince: TL.body.since(t), torso: TL.torso.at(t), sweat: TL.sweat.at(t),
      hud: TL.hud.at(t),
      btn: TL.btn.map((b) => b.at(t)),
      btnState: TL.btnState.map((b) => b.at(t)),
      hpState: TL.hpState.at(t),
      post: TL.post.at(t),
    };
  };

  // ---------------------------------------------------------------- scene
  MV.Scene = class {
    constructor() {
      const W = MV.VW + MV.PADX * 2, H = MV.VH + MV.PADY * 2;
      [this.world, this.ctx] = D.tmp(W, H);
      [this.emiC, this.emi] = D.tmp(W, H);
      [this.glowA, this.gA] = D.tmp(W >> 2, H >> 2);
      [this.glowB, this.gB] = D.tmp(W >> 3, H >> 3);
      [this.screen, this.sctx] = D.tmp(MV.SW, MV.SH);
      this.W = W; this.H = H;
    }
    render(t, only3D) {
      const { ctx, emi, sctx } = this;
      const S = (this.S = MV.state(t));
      if (only3D) {
        sctx.clearRect(0, 0, MV.SW, MV.SH);
        for (const e of TL.active(t)) if (e.screen) e.draw(sctx, null, t, S);
        return S;
      }
      for (const c of [ctx, emi]) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, this.W, this.H);
        c.setTransform(1, 0, 0, 1, MV.PADX, MV.PADY);
        c.imageSmoothingEnabled = false;
        c.globalAlpha = 1;
      }
      sctx.clearRect(0, 0, MV.SW, MV.SH);
      const evs = TL.active(t);
      const layer = (z0, z1, filter) => {
        for (const e of evs) if (e.z >= z0 && e.z < z1 && !e.screen && (!filter || filter(e))) e.draw(ctx, emi, t, S);
      };
      // enemy (+ dodge afterimages)
      const en = S.enemy;
      if (en.a > 0.001) {
        const pose = (tt, extra) => ({
          head: S.head, body: S.body, frame: S.body === 'idle' ? 0 : Math.floor(S.bodySince / en.spf), torso: S.torso, sweat: S.sweat,
          idleT: (tt - T.off) / (T.beat * 2), sway: en.sway, nod: en.nod, eyeFrame: Math.floor((tt - T.off) / T.s16) % 2, t: tt, ...extra,
        });
        if (en.ghost > 0.01)
          for (let k = 4; k >= 1; k--) {
            const p = TL.enemy.at(t - k * 0.035);
            D.enemy(ctx, emi, p.x, p.y, pose(t, { sil: k % 2 ? '#5ab4ff' : '#ffffff', alpha: en.ghost * (0.55 - k * 0.1) * en.a }));
          }
        D.enemy(ctx, emi, en.x, en.y, pose(t, { reveal: en.reveal, alpha: en.a, handGlow: en.handGlow, eyeFire: en.eyeFire }));
      }
      layer(-100, 0);
      // arena
      const b = S.box;
      if (b.fill > 0) D.rect(ctx, b.x, b.y, b.w, b.h, '#000', b.fill);
      D.clipRect(ctx, b.x, b.y, b.w, b.h);
      D.clipRect(emi, b.x - 40, b.y - 40, b.w + 80, b.h + 80);
      layer(0, 10, (e) => e.clip === 'box');
      ctx.restore(); emi.restore();
      D.box(ctx, emi, b);
      this.drawHud(S, t);
      layer(0, 40, (e) => e.clip !== 'box');
      this.drawSoul(S, t);
      layer(40, 1000);
      for (const e of evs) if (e.screen) e.draw(sctx, null, t, S);
      // bloom sources: quarter + eighth resolution blurs
      const { gA, gB } = this;
      gA.setTransform(1, 0, 0, 1, 0, 0); gB.setTransform(1, 0, 0, 1, 0, 0);
      gA.clearRect(0, 0, this.glowA.width, this.glowA.height);
      gB.clearRect(0, 0, this.glowB.width, this.glowB.height);
      gA.imageSmoothingEnabled = gB.imageSmoothingEnabled = true;
      gA.filter = 'blur(2px)';
      gA.drawImage(this.emiC, 0, 0, this.glowA.width, this.glowA.height);
      gA.filter = 'none';
      gB.filter = 'blur(3px)';
      gB.drawImage(this.emiC, 0, 0, this.glowB.width, this.glowB.height);
      gB.filter = 'none';
      return S;
    }
    drawHud(S, t) {
      const { ctx, emi } = this;
      const h = S.hud;
      if (h.a > 0.001) {
        const y = L.hudY, jit = h.jit || 0;
        const back = (key, i) => (TL.hudBack && TL.hudBack[key] && TL.hudBack[key][i] !== undefined ? TL.hudBack[key][i] : TL.hudRestore || 1e9);
        const gone = (key) => { const d = TL.hudDetach[key]; return d ? (i) => d[i] !== undefined && t >= d[i] && t < back(key, i) : null; };
        D.hud(ctx, 'BOMEI', L.name, y, { alpha: h.a * h.nameA, shake: jit, seed: t * 60, skip: gone('name') });
        D.hud(ctx, 'LV 19', L.lv, y, { alpha: h.a * h.lvA, shake: jit, seed: t * 61, skip: gone('lv') });
        const labelsGone = TL.hudDetach.labels && t >= TL.hudDetach.labels && t < (TL.hudRestore || 1e9);
        if (!labelsGone) { ctx.globalAlpha = h.a * h.lvA; ctx.drawImage(MV.SPR.hpLabel, L.hpLabel, y); ctx.globalAlpha = 1; }
        if (S.hpState === 'ok' && !(TL.hudDetach.bar && t >= TL.hudDetach.bar && t < (TL.hudRestore || 1e9))) D.hpBar(ctx, emi, L.hpBar.x, L.hpBar.y + (h.barDy || 0), h.hp, h.kr, 92, h.a * h.barA);
        const kr = h.kr > 0.5;
        ctx.globalAlpha = labelsGone ? 0 : h.a * h.barA;
        ctx.drawImage(kr ? MV.SPR.krLabelKR : MV.SPR.krLabel, L.krLabel, y);
        ctx.globalAlpha = 1;
        const num = String(Math.max(h.hp < 0.5 ? 0 : 1, R(h.hp))).padStart(2, ' ') + ' / 92';
        D.hud(ctx, num, L.num, y, { alpha: h.a * h.barA, color: kr ? MV.COL.kr : '#ffffff', shake: jit, seed: t * 62, skip: gone('num') });
      }
      for (let i = 0; i < 4; i++) {
        const bs = S.btn[i], st = S.btnState[i];
        if (bs.a <= 0.001 || st !== 'ok') continue;
        D.button(ctx, emi, i, L.btnX[i] + (bs.dx || 0), L.btnY + (bs.dy || 0), { a: bs.a, sel: bs.sel });
      }
    }
    drawSoul(S, t) {
      const { ctx, emi } = this;
      const s = S.soul;
      if (s.a <= 0.001) return;
      // speed-based afterimage trail
      const p1 = TL.soul.at(t - 1 / 60);
      const sp = Math.hypot(s.x - p1.x, s.y - p1.y) * 60;
      const trail = U.clamp((sp - 150) / 600) * s.a;
      if (trail > 0.02) {
        for (let k = 6; k >= 1; k--) {
          const p = TL.soul.at(t - k * 0.012);
          MV.spr(ctx, MV.sil('soul_' + S.soulCol, S.soulCol === 'blue' ? '#3c7bff' : '#ff3c50'), p.x, p.y, { rot: p.rot, scale: p.sc, alpha: trail * (0.6 - k * 0.08), sx: 1 / Math.sqrt(p.sq || 1), sy: p.sq || 1 });
          if (emi) { emi.globalAlpha = trail * (0.5 - k * 0.06); MV.spr(emi, 'soul_' + S.soulCol, p.x, p.y, { rot: p.rot, scale: p.sc * 1.3 }); emi.globalAlpha = 1; }
        }
      }
      D.soul(ctx, emi, s.x, s.y, { col: S.soulCol, rot: s.rot, scale: s.sc, sq: s.sq, alpha: s.a, aura: S.aura, t });
    }
  };
})();
