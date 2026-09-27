// Sprite/asset layer. Sans, the blasters, the strike, target, hearts, HUD
// labels and fonts come from src/assets.js (c2-sans-fight, original hotspots);
// bones are generated procedurally so they can take any length / thickness.
(function () {
  const MV = window.MV, AS = window.MV_ASSETS, G = window.MV_GLYPHS;

  MV.COL = {
    blue: '#14a9ff', // blue bones
    soulRed: '#ff0000', soulBlue: '#003cff',
    orange: '#ff7f27', yellow: '#ffff40', hpRed: '#ff0000', hpYellow: '#ffff00', kr: '#ff00ff',
  };
  const hex6 = (h) => (h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h);
  MV.hex6 = hex6;
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    return [c, x];
  };
  MV.canvas = canvas;

  // ------------------------------------------------------------ silhouettes / tints
  const silCache = new Map();
  MV.sil = (src, color) => {
    if (typeof src === 'string') src = MV.SPR[src];
    let m = silCache.get(src);
    if (!m) silCache.set(src, (m = {}));
    if (m[color]) return m[color];
    const [c, x] = canvas(src.width, src.height);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return (m[color] = c);
  };

  // draw a sprite: (x,y) is the anchor; ax/ay anchor fractions; scale = art pixel size
  MV.spr = (ctx, img, x, y, o = {}) => {
    if (typeof img === 'string') img = MV.SPR[img];
    if (o.color) img = MV.sil(img, o.color);
    const ax = o.ax ?? 0.5, ay = o.ay ?? 0.5, s = o.scale || 1;
    const w = img.width, h = img.height;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale((o.flip ? -1 : 1) * s * (o.sx ?? 1), (o.flipY ? -1 : 1) * s * (o.sy ?? 1));
    ctx.drawImage(img, -Math.round(w * ax), -Math.round(h * ay));
    ctx.restore();
  };

  // ------------------------------------------------------------ bones (any length / width)
  // end cap of the original bone texture (10 px wide, 6 px tall; shaft = cols 2..8)
  const END = ['.XX....XX.', 'XXXX..XXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', '.XXXXXXXX.', '.XXXXXXXX.'];
  const endCache = {};
  MV.boneEnd = (w, color) => {
    const key = w + color;
    if (endCache[key]) return endCache[key];
    const eh = Math.max(2, Math.round(w * 0.6));
    const [c, x] = canvas(w, eh);
    x.fillStyle = hex6(color);
    for (let j = 0; j < eh; j++)
      for (let i = 0; i < w; i++) if (END[Math.floor((j * 6) / eh)][Math.floor((i * 10) / w)] === 'X') x.fillRect(i, j, 1, 1);
    return (endCache[key] = c);
  };
  MV.boneDims = (w) => {
    const s = Math.max(1, Math.round(w * 0.7));
    return { w, shaft: s, off: Math.round((w - s) / 2), end: Math.max(2, Math.round(w * 0.6)) };
  };

  // ------------------------------------------------------------ loading
  const IMG = (MV.IMG = {});
  MV.META = AS.meta;
  MV.SPR = {};
  MV.frame = (obj, anim, i = 0) => {
    const m = AS.meta[obj][anim];
    return IMG[`${obj}/${anim}/${((i % m.n) + m.n) % m.n}`];
  };
  MV.loadAssets = () =>
    Promise.all(
      Object.entries(AS.img).map(
        ([k, src]) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = rej; im.src = src; })
      )
    ).then(build);

  function build() {
    const S = MV.SPR;
    // souls: the original heart is white and stored point-right (the game shows it
    // at 90 degrees), so turn it upright once; tint per mode
    const rot90 = (img) => {
      const [c, x] = canvas(img.height, img.width);
      x.translate(img.height, 0);
      x.rotate(Math.PI / 2);
      x.drawImage(img, 0, 0);
      return c;
    };
    const heart = rot90(MV.frame('PlayerHeart', 'Default'));
    S.soul_red = MV.sil(heart, MV.COL.soulRed);
    S.soul_blue = MV.sil(heart, MV.COL.soulBlue);
    S.soul_white = MV.sil(heart, '#ffffff');
    S.soul_yellow = MV.sil(heart, '#ffff00');
    S.soul_split = MV.sil(rot90(MV.frame('PlayerHeart', 'Split')), MV.COL.soulRed);
    for (let i = 0; i < 4; i++) S['shard' + i] = MV.sil(MV.frame('HeartShard', 'Default', i), MV.COL.soulRed);

    // Chinese command buttons built on the original button art (border + icon kept)
    const labels = ['战斗', '行动', '物品', '仁慈'];
    ['UIFight', 'UIAct', 'UIItem', 'UIMercy'].forEach((obj, i) => {
      for (const hl of [false, true]) {
        const src = MV.frame(obj, hl ? 'Highlight' : 'Default');
        const [c, x] = canvas(src.width, src.height);
        x.drawImage(src, 0, 0);
        x.fillStyle = '#000';
        x.fillRect(29, 2, src.width - 31, src.height - 4);
        const col = hl ? MV.COL.yellow : MV.COL.orange;
        let gx = 38;
        for (const ch of labels[i]) {
          const g = G[ch];
          x.fillStyle = col;
          for (let j = 0; j < 16; j++) for (let k = 0; k < 16; k++) if ((g[1][j] >> (15 - k)) & 1) x.fillRect(gx + k * 2, 5 + j * 2, 2, 2);
          gx += 32;
        }
        S[`btn${i}${hl ? 'h' : ''}`] = c;
      }
    });
    S.hpLabel = MV.frame('HP', 'Default');
    S.krLabel = MV.frame('KR', 'Default');
    // purple KR (karma active): multiply-tint only the letters; the label has an opaque background
    {
      const src = S.krLabel, [c, x] = canvas(src.width, src.height);
      x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = MV.COL.kr;
      x.fillRect(0, 0, src.width, src.height);
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(src, 0, 0);
      S.krLabelKR = c;
    }
    S.target = MV.frame('Target', 'Default');
    S.choice = [MV.frame('TargetChoice', 'Default', 0), MV.frame('TargetChoice', 'Default', 1)];

    // locate the glowing eye inside the BlueEye head frames (coloured pixels)
    const be = MV.frame('SansHead', 'BlueEye', 0);
    const [c, x] = canvas(be.width, be.height);
    x.drawImage(be, 0, 0);
    const d = x.getImageData(0, 0, be.width, be.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let j = 0; j < be.height; j++)
      for (let i = 0; i < be.width; i++) {
        const k = (j * be.width + i) * 4;
        if (d[k + 3] > 0 && !(d[k] > 200 && d[k + 1] > 200 && d[k + 2] > 200) && (d[k] + d[k + 1] + d[k + 2]) > 60) { sx += i; sy += j; n++; }
      }
    MV.EYE = n ? [sx / n, sy / n] : [22, 14];
  }

  // ------------------------------------------------------------ bitmap fonts from the original textures
  const FONTS = {
    battle: { img: 'BattleFont', cw: 6, ch: 6, first: 32 }, // HUD (name, LV, numbers)
    damage: { img: 'DamageFont', cw: 33, ch: 32, first: 32 }, // MISS / damage numbers
    dialog: { img: 'DefaultFont', cw: 10, ch: 16, first: 32 },
  };
  const fontCache = {};
  MV.fontGlyph = (font, chr, color) => {
    const key = font + chr + color;
    if (fontCache[key]) return fontCache[key];
    const f = FONTS[font];
    const code = chr.toUpperCase && font === 'battle' ? chr.toUpperCase().charCodeAt(0) : chr.charCodeAt(0);
    const idx = code - f.first;
    const img = IMG[f.img];
    const cols = img.width / f.cw;
    const [c, x] = canvas(f.cw, f.ch);
    const sx = (idx % cols) * f.cw, sy = Math.floor(idx / cols) * f.ch;
    x.drawImage(img, sx, sy, f.cw, f.ch, 0, 0, f.cw, f.ch);
    // multiply-tint keeps the black outline of the damage font black
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = color;
    x.fillRect(0, 0, f.cw, f.ch);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(img, sx, sy, f.cw, f.ch, 0, 0, f.cw, f.ch);
    return (fontCache[key] = c);
  };
  MV.FONTS = FONTS;
})();
