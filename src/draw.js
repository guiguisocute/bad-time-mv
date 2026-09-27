// Pixel drawing primitives (world space = 960x540 view, sprites at 2x art scale).
(function () {
  const MV = window.MV, U = MV.U, SPR = MV.SPR, G = window.MV_GLYPHS;
  const D = (MV.D = {});
  MV.VW = 960; MV.VH = 540;
  MV.PADX = 240; MV.PADY = 135; // world canvas margin around the default view
  MV.ART_SCALE = 2;

  const tmp = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  };
  D.tmp = tmp;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  D.bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const R = Math.round;

  // ---------------------------------------------------------------- text
  // Unifont (8x16 latin, 16x16 CJK) — dialogue and button labels
  const glyphCache = {};
  function glyph(ch, color) {
    const key = ch + color;
    if (glyphCache[key]) return glyphCache[key];
    const g = G[ch] || G['?'];
    const w = g[0], rows = g[1];
    const [c, x] = tmp(w, 16);
    x.fillStyle = color;
    for (let j = 0; j < 16; j++) for (let i = 0; i < w; i++) if ((rows[j] >> (w - 1 - i)) & 1) x.fillRect(i, j, 1, 1);
    return (glyphCache[key] = c);
  }
  D.textWidth = (s, o = {}) => {
    let w = 0;
    for (const ch of s) w += ((G[ch] || G['?'])[0] + (o.spacing || 0)) * (o.scale || 2);
    return w;
  };
  // o: color, scale (default 2), align, alpha, glow (emi ctx), shake, seed, wave, spacing
  D.text = (ctx, s, x, y, o = {}) => {
    const sc = o.scale || 2, color = MV.hex6(o.color || '#ffffff');
    const w = D.textWidth(s, o);
    if (o.align === 'center') x -= w / 2;
    else if (o.align === 'right') x -= w;
    let cx = R(x), i = 0;
    y = R(y);
    for (const ch of s) {
      const g = glyph(ch, color);
      let jx = 0, jy = 0;
      if (o.shake) { jx = R(U.noise((o.seed || 0) + i * 3.1) * o.shake); jy = R(U.noise((o.seed || 0) + i * 5.7 + 9) * o.shake); }
      if (o.wave !== undefined) jy += R(Math.sin(o.wave + i * 0.8) * 3);
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.drawImage(g, cx + jx, y + jy, g.width * sc, 16 * sc);
      if (o.glow) { o.glow.globalAlpha = (o.glowA ?? 0.6) * (o.alpha ?? 1); o.glow.drawImage(g, cx + jx - 1, y + jy - 1, g.width * sc + 2, 16 * sc + 2); o.glow.globalAlpha = 1; }
      cx += (g.width + (o.spacing || 0)) * sc;
      i++;
    }
    ctx.globalAlpha = 1;
    return w;
  };
  // original HUD font (BattleFont, 5x5 glyphs in 6x6 cells) and the big damage font
  const bitmapText = (font) => (ctx, str, x, y, o = {}) => {
    const f = MV.FONTS[font], sc = o.scale || (font === 'battle' ? 2 : 1);
    const color = MV.hex6(o.color || '#ffffff');
    const adv = (f.cw + (o.spacing || 0)) * sc;
    const w = str.length * adv;
    if (o.align === 'center') x -= w / 2;
    else if (o.align === 'right') x -= w;
    let cx = R(x), i = 0;
    for (const ch of str) {
      if (ch !== ' ' && !(o.skip && o.skip(i))) {
        const g = MV.fontGlyph(font, ch, color);
        let jx = 0, jy = 0;
        if (o.shake) { jx = R(U.noise((o.seed || 0) + i * 3.1) * o.shake); jy = R(U.noise((o.seed || 0) + i * 5.7 + 9) * o.shake); }
        ctx.globalAlpha = o.alpha ?? 1;
        ctx.drawImage(g, cx + jx, R(y) + jy, f.cw * sc, f.ch * sc);
        if (o.glow) { o.glow.globalAlpha = (o.glowA ?? 0.6) * (o.alpha ?? 1); o.glow.drawImage(g, cx + jx - 1, R(y) + jy - 1, f.cw * sc + 2, f.ch * sc + 2); o.glow.globalAlpha = 1; }
      }
      cx += adv; i++;
    }
    ctx.globalAlpha = 1;
    return w;
  };
  D.hud = bitmapText('battle');
  D.dmg = bitmapText('damage');
  D.hudWidth = (s, sc = 2) => s.length * 6 * sc;

  // ---------------------------------------------------------------- shapes
  D.pixelRing = (ctx, x, y, r, w, color, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const n = Math.max(12, Math.ceil(r * 6.4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU;
      ctx.fillRect(R(x + Math.cos(a) * r - w / 2), R(y + Math.sin(a) * r - w / 2), w, w);
    }
    ctx.globalAlpha = 1;
  };
  D.rect = (ctx, x, y, w, h, color, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.fillRect(R(x), R(y), R(w), R(h));
    ctx.globalAlpha = 1;
  };

  // ---------------------------------------------------------------- bones
  // Generic bone: base end at (x, y), extending along angle `ang` for `len` px.
  // o: {w: knob width (any size), blue, color, t, glow, alpha, seed}
  D.bone = (ctx, emi, x, y, ang, len, o = {}) => {
    len = R(len);
    if (len < 2) return;
    const dm = MV.boneDims(o.w || 10);
    const col = MV.hex6(o.blue ? MV.COL.blue : o.color || '#ffffff');
    const end = MV.boneEnd(dm.w, col);
    const eh = Math.min(dm.end, Math.floor(len / 2));
    const a = o.alpha ?? 1;
    const draw = (c, glow) => {
      c.save();
      c.translate(R(x), R(y));
      c.rotate(ang - Math.PI / 2); // local +y runs along the bone
      const x0 = -Math.floor(dm.w / 2);
      if (glow) {
        c.globalAlpha = glow;
        c.fillStyle = col;
        c.fillRect(x0 - 3, -2, dm.w + 6, len + 4);
      } else {
        c.globalAlpha = a;
        c.fillStyle = col;
        c.fillRect(x0 + dm.off, eh, dm.shaft, len - eh * 2);
        c.drawImage(end, 0, 0, dm.w, eh * (dm.end / eh) > 0 ? eh : 1, x0, 0, dm.w, eh);
        c.save();
        c.translate(0, len);
        c.scale(1, -1);
        c.drawImage(end, 0, 0, dm.w, eh, x0, 0, dm.w, eh);
        c.restore();
      }
      c.restore();
    };
    draw(ctx, 0);
    if (emi) {
      if (o.blue) {
        draw(emi, 0.3 * (o.glow ?? 1) * Math.min(1, 16 / (o.w || 10))); // wide pillars would flood the bloom
        // blue flame licks along the edges
        const n = Math.max(2, Math.floor(len / 9));
        const cs = Math.cos(ang), sn = Math.sin(ang);
        for (let i = 0; i < n; i++) {
          const h = U.hash(i * 3.7 + (o.seed || 0));
          const fl = ((o.t || 0) * 4 + h) % 1;
          const along = h * len, side = (h > 0.5 ? 1 : -1) * (dm.w / 2 + 1 + fl * 6);
          const px = x + cs * along - sn * side, py = y + sn * along + cs * side - fl * 8;
          ctx.globalAlpha = (1 - fl) * a;
          ctx.fillStyle = fl < 0.35 ? '#d8f6ff' : '#2b8cff';
          ctx.fillRect(R(px), R(py), fl < 0.5 ? 2 : 1, 2);
          emi.globalAlpha = (1 - fl) * 0.35;
          emi.fillStyle = '#3aa8ff';
          emi.fillRect(R(px) - 1, R(py) - 1, 3, 4);
        }
        ctx.globalAlpha = 1; emi.globalAlpha = 1;
      } else if (o.glow) draw(emi, 0.35 * o.glow);
    }
  };
  D.boneHit = (x, y, ang, len, w, px, py, r = 6) => {
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const dx = px - x, dy = py - y;
    const along = dx * cs + dy * sn, perp = Math.abs(-dx * sn + dy * cs);
    return along > -r && along < len + r && perp < w * 0.4 + r;
  };

  // warning zone flashing where an attack will land
  D.warn = (ctx, emi, x, y, w, h, t, color = '#ff2030') => {
    const on = Math.floor(t * 20) % 2 === 0;
    ctx.globalAlpha = on ? 1 : 0.4;
    ctx.fillStyle = color;
    ctx.fillRect(R(x), R(y), R(w), 2); ctx.fillRect(R(x), R(y + h) - 2, R(w), 2);
    ctx.fillRect(R(x), R(y), 2, R(h)); ctx.fillRect(R(x + w) - 2, R(y), 2, R(h));
    ctx.globalAlpha = on ? 0.22 : 0.08;
    ctx.fillRect(R(x), R(y), R(w), R(h));
    ctx.globalAlpha = 1;
    if (emi) { emi.globalAlpha = on ? 0.45 : 0.15; emi.fillStyle = color; emi.fillRect(R(x), R(y), R(w), R(h)); emi.globalAlpha = 1; }
  };

  // ---------------------------------------------------------------- battle box
  // b: {x,y,w,h, th, draw: 0..1 perimeter fraction, bulge: {side:[amt,u,width]}, cracks:[{side,u,s,seed}], alpha, color}
  D.box = (ctx, emi, b) => {
    const X = R(b.x), Y = R(b.y), W = R(b.w), H = R(b.h);
    const th = b.th || 4;
    const col = b.color || '#ffffff';
    const frac = b.draw ?? 1;
    if (frac <= 0 || W < 2 || H < 2) return;
    const bul = b.bulge || {};
    const off = (side, u) => {
      const q = bul[side];
      if (!q || !q[0]) return 0;
      const d = (u - q[1]) / (q[2] || 0.2);
      return q[0] * Math.exp(-d * d);
    };
    const per = 2 * (W + H), lim = frac * per;
    ctx.globalAlpha = b.alpha ?? 1;
    ctx.fillStyle = col;
    if (emi) { emi.globalAlpha = 0.12 * (b.alpha ?? 1) * (b.glow ?? 1); emi.fillStyle = col; }
    let acc = 0;
    // walk the frame clockwise in 2px steps so partial drawing traces the outline
    const gaps = b.gaps || {};
    const seg = (side, len, fn) => {
      const gp = gaps[side];
      for (let i = 0; i < len; i += 2, acc += 2) {
        if (acc > lim) return;
        if (gp && i / len > gp[0] && i / len < gp[1]) continue;
        const [px, py, pw, ph] = fn(i, off(side, i / len));
        ctx.fillRect(px, py, pw, ph);
        if (emi) emi.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      }
    };
    seg('top', W, (i, o) => [X + i, Y - th - R(o), 2, th]);
    seg('right', H, (i, o) => [X + W + R(o), Y + i, th, 2]);
    seg('bottom', W, (i, o) => [X + W - 2 - i, Y + H + R(o), 2, th]);
    seg('left', H, (i, o) => [X - th - R(o), Y + H - 2 - i, th, 2]);
    if (frac >= 1) {
      ctx.fillRect(X - th, Y - th, th, th); ctx.fillRect(X + W, Y - th, th, th);
      ctx.fillRect(X - th, Y + H, th, th); ctx.fillRect(X + W, Y + H, th, th);
    }
    ctx.globalAlpha = 1;
    if (emi) emi.globalAlpha = 1;
    // cracks: black zig-zag cuts through the frame
    for (const c of b.cracks || []) {
      const rnd = U.rng(c.seed || 7);
      const horiz = c.side === 'bottom' || c.side === 'top';
      let px = horiz ? X + c.u * W : c.side === 'left' ? X - th : X + W;
      let py = horiz ? (c.side === 'top' ? Y - th : Y + H) : Y + c.u * H;
      const n = 3 + Math.floor((c.s || 1) * 6);
      ctx.fillStyle = '#000';
      for (let i = 0; i < n; i++) {
        ctx.fillRect(R(px), R(py), horiz ? 2 : th, horiz ? th : 2);
        const j = (rnd() - 0.5) * 8 + (i % 2 ? 4 : -4);
        if (horiz) px += j; else py += j;
      }
    }
  };
  D.clipRect = (ctx, x, y, w, h) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(R(x), R(y), R(w), R(h));
    ctx.clip();
  };

  // ---------------------------------------------------------------- soul
  // o: {col:'red'|'blue'|'white'|'yellow', rot, scale, alpha, aura, glow}
  D.soul = (ctx, emi, x, y, o = {}) => {
    const col = o.col || 'red';
    const name = 'soul_' + col;
    const sc = o.scale || 1;
    const glowC = col === 'blue' ? '#1e5cff' : col === 'red' ? '#ff1020' : '#ffffff';
    if (o.aura) {
      // pixel aura: jittered outline copies + soft glow
      for (let k = 0; k < 8; k++) {
        const an = (k / 8) * U.TAU + (o.t || 0) * 3;
        MV.spr(ctx, MV.sil(name, col === 'blue' ? '#5aa8ff' : '#ff6070'), x + R(Math.cos(an) * 2), y + R(Math.sin(an) * 2), { rot: o.rot, scale: sc, alpha: 0.3 * o.aura });
      }
      if (emi) { emi.globalAlpha = 0.3 * o.aura; MV.spr(emi, MV.sil(name, glowC), x, y, { rot: o.rot, scale: sc * 1.7 }); emi.globalAlpha = 1; }
    }
    const sq = o.sq ?? 1, sx = 1 / Math.sqrt(sq), sy = sq;
    MV.spr(ctx, name, x, y, { rot: o.rot, scale: sc, alpha: o.alpha, sx, sy });
    if (emi) { emi.globalAlpha = (o.alpha ?? 1) * (o.glow ?? (col === 'blue' ? 0.45 : 0.8)); MV.spr(emi, MV.sil(name, glowC), x, y, { rot: o.rot, scale: sc * 1.4, sx, sy }); emi.globalAlpha = 1; }
  };

  // ---------------------------------------------------------------- enemy (original parts, attached by image points)
  const EW = 140, EH = 120, FX = 70, FY = 116; // 1x scratch canvas, feet anchor
  const [ec, ex] = tmp(EW, EH);
  const [gc, gx] = tmp(EW, EH); // per-frame tinted copy (glow)
  const put = (img, meta, fr, x, y, ox = 0, oy = 0) => {
    // place frame so its hotspot lands on (x, y); return absolute image points
    const hx = meta.frames[fr]?.hx ?? meta.frames[0].hx, hy = meta.frames[fr]?.hy ?? meta.frames[0].hy;
    const px = R(x - hx * img.width + ox), py = R(y - hy * img.height + oy);
    ex.drawImage(img, px, py);
    const pts = {};
    const fpts = (meta.frames[fr] || meta.frames[0]).pts;
    for (const k in fpts) pts[k] = [px + fpts[k][0] * img.width - ox, py + fpts[k][1] * img.height - oy];
    return pts;
  };
  // (x, y) = feet centre in world. o: {head, body ('idle' | 'HandDown' | 'HandUp' | 'HandLeft' | 'HandRight'),
  //   frame, torso ('Default' | 'Shrug'), sweat 0-3, idleT, reveal, sil, alpha, t, scale}
  D.enemy = (ctx, emi, x, y, o = {}) => {
    const sc = o.scale || 2, M = MV.META;
    ex.clearRect(0, 0, EW, EH);
    const T2 = o.idleT ?? 0; // idle sway (original: period 1.2 s; here locked to 2 beats)
    const swayX = o.body === 'idle' || !o.body ? Math.sin(T2 * U.TAU) * (o.sway ?? 1) : 0;
    const swayY = o.body === 'idle' || !o.body ? Math.sin(T2 * U.TAU * 2) * (o.sway ?? 1) : 0;
    let headAt;
    if (!o.body || o.body === 'idle') {
      const legs = put(MV.frame('SansLegs', 'Standing'), M.SansLegs.Standing, 0, FX, FY);
      const tAnim = o.torso || 'Default';
      const torso = put(MV.frame('SansTorso', tAnim), M.SansTorso[tAnim], 0, legs.Torso[0], legs.Torso[1], R(swayX), R(swayY));
      headAt = [torso.Head[0] + R(swayX), torso.Head[1] + R(swayY)];
    } else {
      const f = U.clamp(o.frame ?? 4, 0, M.SansBody[o.body].n - 1) | 0;
      const body = put(MV.frame('SansBody', o.body, f), M.SansBody[o.body], f, FX, FY);
      headAt = body.Head;
    }
    const hAnim = o.head || 'Default';
    const hf = hAnim === 'BlueEye' ? o.eyeFrame || 0 : 0;
    const headImg = MV.frame('SansHead', hAnim, hf);
    const hy = headAt[1] - R(swayY * -0.4 * 0);
    const hp = put(headImg, M.SansHead[hAnim], hf, headAt[0], hy, 0, R(-Math.sin(T2 * U.TAU * 2) * 0.4 * (o.sway ?? 1)));
    if (o.sweat) ex.drawImage(MV.frame('SansSweat', 'Sweat' + o.sweat), R(hp.Sweat[0] - 16), R(hp.Sweat[1]));
    const headOrigin = [R(headAt[0] - 0.5 * headImg.width), R(hy - headImg.height)];
    if (o.reveal !== undefined && o.reveal < 1) {
      const id = ex.getImageData(0, 0, EW, EH);
      for (let j = 0; j < EH; j++)
        for (let i = 0; i < EW; i++) {
          const vv = o.reveal * 1.5 - (j / EH) * 0.5;
          if (D.bayer(i, j) > vv) id.data[(j * EW + i) * 4 + 3] = 0;
        }
      ex.putImageData(id, 0, 0);
    }
    if (o.composeOnly) return ec;
    const ox = R(x - FX * sc), oy = R(y - FY * sc);
    if (o.sil) {
      // afterimage: tint the line art and ADD it, so the black body stays invisible
      gx.globalCompositeOperation = 'copy';
      gx.drawImage(ec, 0, 0);
      gx.globalCompositeOperation = 'multiply';
      gx.fillStyle = o.sil;
      gx.fillRect(0, 0, EW, EH);
      gx.globalCompositeOperation = 'destination-in';
      gx.drawImage(ec, 0, 0);
      gx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.drawImage(gc, ox, oy, EW * sc, EH * sc);
      ctx.restore();
      if (emi) { emi.globalAlpha = (o.alpha ?? 1) * 0.5; emi.drawImage(gc, ox, oy, EW * sc, EH * sc); emi.globalAlpha = 1; }
      return;
    }
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.drawImage(ec, ox, oy, EW * sc, EH * sc);
    ctx.globalAlpha = 1;
    // eye glow + flame licks for the BlueEye head
    const eye = [ox + (headOrigin[0] + MV.EYE[0] + 0.5) * sc, oy + (headOrigin[1] + MV.EYE[1] + 0.5) * sc];
    D.lastEye = eye;
    const fire = hAnim === 'BlueEye' && !o.sil ? o.eyeFire || 0 : 0;
    if (fire > 0.01) {
      // a real flame out of the left eye: a blue outer flame wrapped round a yellow inner flame.
      // Pixel embers are born at the socket and rise, curl and cool; the outer ones burn blue and
      // reach higher, the inner ones burn white-yellow and die sooner, drawn on top
      const t = o.t || 0, A = o.alpha ?? 1, F = Math.min(fire, 1.6);
      const OUTER = ['#e8fdff', '#7ff0ff', '#00c8ff', '#1e6bff', '#0c2c9c'];
      const INNER = ['#fffbe0', '#ffff40', '#ffe000', '#ffb400', '#ff9000'];
      const ember = (i, inner) => {
        const h1 = U.hash(i * 1.37 + (inner ? 7.5 : 0.5)), h2 = U.hash(i * 2.91 + (inner ? 9.1 : 1.3));
        const life = (inner ? 0.22 : 0.36) + (inner ? 0.18 : 0.34) * h1, ph = (((t / life + h2) % 1) + 1) % 1, tb = t - ph * life;
        return { i, h1, ph, tb, inner };
      };
      const nO = Math.round(24 + 36 * F), nI = Math.round(20 + 28 * F), embers = [];
      for (let i = 0; i < nO; i++) embers.push(ember(i, false));
      for (let i = 0; i < nI; i++) embers.push(ember(i, true));
      // outer (blue) first, oldest first; the yellow core goes on top
      embers.sort((a, b) => (a.inner - b.inner) || (b.ph - a.ph));
      for (const { i, h1, ph, tb, inner } of embers) {
        const k = inner ? 0.55 : 1; // the core is narrower and shorter
        const rise = (24 + 26 * F) * k * ph ** 0.75;
        const sway = (Math.sin(tb * 7 + i) * (2 + 8 * ph) + Math.sin(t * 23 + i * 1.7) * ph * 4) * k + (16 + 22 * F) * k * ph * ph;
        const px = eye[0] + (h1 - 0.5) * (inner ? 6 : 14) * (1 - ph) + sway, py = eye[1] - 2 - rise;
        const s = 2 * Math.max(1, Math.round((1 - ph) ** 0.7 * (inner ? 2 + 2.2 * F : 2 + 2.6 * F)));
        const pal = inner ? INNER : OUTER;
        ctx.globalAlpha = A * (ph < 0.7 ? 1 : (1 - ph) / 0.3);
        ctx.fillStyle = pal[Math.min(4, Math.floor(ph * 5))];
        ctx.fillRect(R(px - s / 2), R(py - s / 2), s, s);
        if (emi) { emi.globalAlpha = A * (1 - ph) * (inner ? 0.25 : 0.2); emi.fillStyle = inner ? INNER[2] : OUTER[3]; emi.fillRect(R(px - s), R(py - s), s * 2, s * 2); }
      }
      // the body of the flame at the socket: a tall blue envelope, a yellow core, a white-hot heart
      const Hh = 10 + 22 * F;
      const col = (j, h, c) => {
        const hgt = h * (0.55 + 0.45 * Math.abs(U.noise(t * 31 + j * 4.3 + h)));
        ctx.fillStyle = c;
        ctx.fillRect(R(eye[0] + j * 3 - 1.5 + Math.sin(t * 17 + j) * 1.5), R(eye[1] + 3 - hgt), 3, R(hgt));
      };
      ctx.globalAlpha = A;
      for (let j = -3; j <= 3; j++) col(j, Hh * (1 - Math.abs(j) * 0.16), Math.abs(j) === 3 ? OUTER[3] : OUTER[2]);
      for (let j = -2; j <= 2; j++) col(j, Hh * 0.7 * (1 - Math.abs(j) * 0.22), Math.abs(j) === 2 ? INNER[3] : INNER[1]);
      col(0, Hh * 0.35, INNER[0]);
      ctx.globalAlpha = 1;
      if (emi) {
        emi.globalAlpha = A * Math.min(0.45, 0.2 + 0.15 * F); emi.fillStyle = OUTER[3]; emi.fillRect(R(eye[0]) - 13, R(eye[1]) - 24, 26, 32);
        emi.globalAlpha = A * 0.5; emi.fillStyle = INNER[2]; emi.fillRect(R(eye[0]) - 6, R(eye[1]) - 16, 12, 18);
        emi.globalAlpha = 1;
      }
    } else if (hAnim === 'BlueEye' && !o.sil && emi) {
      const gc = hf ? '#ffff40' : '#00e5ff', t = o.t || 0;
      emi.globalAlpha = 0.95 * (o.alpha ?? 1); emi.fillStyle = gc; emi.fillRect(R(eye[0]) - 9, R(eye[1]) - 9, 18, 18);
      for (let i = 0; i < 7; i++) {
        const ph = (t * 3 + i / 7) % 1;
        const fx = eye[0] + R(Math.sin(t * 11 + i * 2.3) * (2 + ph * 5)), fy = eye[1] - 6 - R(ph * 26);
        ctx.globalAlpha = (1 - ph) * 0.9 * (o.alpha ?? 1);
        ctx.fillStyle = ph < 0.3 ? '#ffffff' : gc;
        ctx.fillRect(R(fx) - 1, R(fy) - 1, ph < 0.4 ? 4 : 2, ph < 0.4 ? 4 : 2);
        emi.globalAlpha = (1 - ph) * 0.8; emi.fillStyle = gc; emi.fillRect(R(fx) - 4, R(fy) - 4, 8, 8);
      }
      ctx.globalAlpha = 1; emi.globalAlpha = 1;
    }
    if (o.handGlow && emi && o.body && o.body !== 'idle') {
      gx.globalCompositeOperation = 'copy';
      gx.drawImage(ec, 0, 0);
      gx.globalCompositeOperation = 'multiply';
      gx.fillStyle = '#2a6bff';
      gx.fillRect(0, 0, EW, EH);
      gx.globalCompositeOperation = 'destination-in';
      gx.drawImage(ec, 0, 0);
      gx.globalCompositeOperation = 'source-over';
      emi.globalAlpha = o.handGlow;
      emi.drawImage(gc, ox - 2, oy - 2, EW * sc + 4, EH * sc + 4);
      emi.globalAlpha = 1;
    }
  };

  // ---------------------------------------------------------------- skull cannon (original frames)
  // mouth faces angle `ang` (0 = +x). o: {open 0..1, charge 0..1, scale, alpha, col, glitch, seed, t, sil}
  D.cannon = (ctx, emi, x, y, ang, o = {}) => {
    const open = U.clamp(o.open || 0), ch = U.clamp(o.charge || 0);
    const img = open <= 0.01 ? MV.frame('GasterBlaster', 'Default') : MV.frame('GasterBlaster', 'Fire', Math.min(4, Math.floor(open * 4.99)));
    const hx = open <= 0.01 ? 0.491228 : 0.508772;
    const sc = o.scale || 2;
    const w = img.width, h = img.height;
    const src = o.sil ? MV.sil(img, o.sil) : ch > 0.55 ? MV.sil(img, ch > 0.85 ? '#ffffff' : '#e8fbff') : img;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.translate(R(x), R(y));
    ctx.rotate(ang);
    ctx.scale(sc, sc);
    const px = -R(w * hx), py = -R(h / 2);
    if (o.glitch) {
      for (let j = 0; j < h; j += 3) {
        const d = R(U.noise(j * 0.61 + (o.seed || 0) * 9 + (o.t || 0) * 30) * 14 * o.glitch);
        ctx.drawImage(src, 0, j, w, 3, px + d, py + j, w, 3);
      }
    } else ctx.drawImage(src, px, py);
    // flicker back to the original look on alternate frames while charged (strobe)
    if (ch > 0.55 && !o.sil && Math.floor((o.t || 0) * 30) % 2 === 0) { ctx.globalAlpha = 0.5 * (o.alpha ?? 1); ctx.drawImage(img, px, py); }
    ctx.restore();
    if (emi && (ch > 0 || open > 0)) {
      emi.save();
      emi.translate(R(x), R(y));
      emi.rotate(ang);
      emi.scale(sc, sc);
      emi.globalAlpha = ch * 0.8 * (o.alpha ?? 1);
      emi.drawImage(MV.sil(img, o.col || '#7fe8ff'), px - 1, py - 1, w + 2, h + 2);
      emi.globalAlpha = Math.max(ch * 0.5, open) * (o.alpha ?? 1);
      emi.fillStyle = '#ffffff';
      emi.fillRect(w * (1 - hx) - 16, -8, 22, 16);
      emi.restore();
    }
  };
  // world position of the mouth for a blaster at (x, y) facing ang
  D.mouth = (x, y, ang, sc = 2) => [x + Math.cos(ang) * 22 * sc, y + Math.sin(ang) * 22 * sc];

  // ---------------------------------------------------------------- beam
  // o: {w, t, alpha, col, len}
  D.beam = (ctx, emi, x, y, ang, o = {}) => {
    const len = o.len || 2000, W = o.w || 40, t = o.t || 0;
    if (W < 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = o.alpha ?? 1;
    const col = o.col || '#bff6ff';
    const step = 4;
    for (let i = 0; i < len; i += step) {
      const n = U.noise(i * 0.05 - t * 40) * 0.1 + U.noise(i * 0.21 + t * 70) * 0.05;
      const w = Math.max(1, W * (1 + n) * Math.min(1, (i + 6) / 18));
      ctx.fillStyle = col;
      ctx.fillRect(i, R(-w / 2) - 2, step, R(w) + 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(i, R(-w * 0.38), step, Math.max(1, R(w * 0.76)));
    }
    ctx.restore();
    if (emi) {
      emi.save();
      emi.translate(x, y);
      emi.rotate(ang);
      emi.globalAlpha = (o.alpha ?? 1) * 0.55;
      emi.fillStyle = col;
      emi.fillRect(0, -W * 0.68, len, W * 1.36);
      emi.fillStyle = '#ffffff';
      emi.globalAlpha = (o.alpha ?? 1) * 0.5;
      emi.fillRect(0, -W * 0.35, len, W * 0.7);
      emi.restore();
    }
  };
  D.beamHit = (x, y, ang, W, px, py, r = 6) => {
    const dx = px - x, dy = py - y;
    const along = dx * Math.cos(ang) + dy * Math.sin(ang);
    const perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
    return along > -10 && perp < W / 2 + r;
  };

  // ---------------------------------------------------------------- strike (original 6-frame slash)
  // u: 0..1 progress. Frames 0-3 grow downward from the top, 4-5 shrink to the bottom.
  const STRIKE_Y = [0, 0, 0, 0, 32, 52];
  D.strike = (ctx, emi, x, y, u, o = {}) => {
    if (u < 0 || u >= 1) return;
    const f = Math.min(5, Math.floor(u * 6));
    const img = MV.frame('Strike', 'Default', f);
    const sc = o.scale || 3;
    ctx.save();
    ctx.translate(R(x), R(y));
    ctx.rotate(o.rot ?? 0.5);
    ctx.drawImage(img, R(-img.width * sc / 2), R((STRIKE_Y[f] - 32) * sc), img.width * sc, img.height * sc);
    ctx.restore();
    if (emi) {
      emi.save(); emi.translate(R(x), R(y)); emi.rotate(o.rot ?? 0.5);
      emi.globalAlpha = 0.9;
      emi.drawImage(MV.sil(img, '#ff2040'), R(-img.width * sc / 2) - 3, R((STRIKE_Y[f] - 32) * sc) - 3, img.width * sc + 6, img.height * sc + 6);
      emi.restore(); emi.globalAlpha = 1;
    }
  };
})();
