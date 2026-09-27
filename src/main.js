// Player: audio-synced live playback, scrubbing, and a frame API for export.
(function () {
  const MV = window.MV, TL = MV.TL, T = MV.T, U = MV.U;
  const q = new URLSearchParams(location.search);
  const RENDER = q.has('render');

  MV.loadAssets().then(start).catch((e) => console.error(e));
  function start() {
  MV.buildTimeline();
  TL.finalize();
  const canvas = document.getElementById('mv');
  const scene = (MV.scene = new MV.Scene());
  const post = new MV.Post(canvas);
  const voxel = new MV.Voxel(post.gl, 480, 270);

  // audio latency calibration (seconds, + = visuals later)
  const LAT = parseFloat(q.get('lat') || '0');

  let lastCam = null;
  MV.renderFrame = (tReal) => {
    const t = TL.vt(tReal);
    const vhs = TL.vhsAt(tReal);
    const pov = TL.pov && t >= TL.pov.t0 && t < TL.pov.t1 ? TL.pov : null;
    const S = scene.render(t, !!pov);
    let tex3D = null;
    if (pov) tex3D = voxel.render(pov.scene(t));
    const P = S.post, fx = S.fx;
    const env = T.env(t, 'rms');
    // motion smear from camera velocity (whip pans)
    const cam = S.cam;
    let smear = [0, 0];
    // (keyframed camera only: shake must not smear)
    const c1 = TL.cam.at(t), c0 = TL.cam.at(t - 1 / 60);
    const vx = (c1.x - c0.x) * c1.zoom, vy = (c1.y - c0.y) * c1.zoom;
    const vr = (c1.roll - c0.roll) * 300 + (c1.yaw - c0.yaw) * 400;
    const vm = Math.hypot(vx + vr, vy);
    // hard cuts jump hundreds of px in one frame: never smear those
    if (vm > 12 && vm < 140) { const k = (Math.min(vm, 60) - 12) / vm; smear = [((vx + vr) * k) / MV.VW, (vy * k) / MV.VH]; }
    const src = { world: scene.world, glowA: scene.glowA, glowB: scene.glowB, screen: scene.screen, tex3D };
    const params = {
      time: t, ca: P.ca + fx.ca, inv: fx.inv, bw: fx.bw, flash: Math.min(1, fx.flash), glitch: Math.max(P.glitch, fx.glitch),
      bloom: P.bloom * (0.85 + env * 0.4), vig: P.vig, desat: P.desat, tintAmt: Math.max(P.tintAmt, P.tint * 0.35), grid: P.grid * U.clamp(cam.zoom - 0.6),
      scan: P.scan + vhs * 0.25, vhs, mode3D: !!pov, letter: P.letter, bg: P.bg * (0.7 + env * 0.5), bgHue: P.bgHue, smear, seed: Math.floor(t * 30) % 97,
      flashCol: fx.flashCol || [1, 1, 1],
    };
    post.render(src, cam, params);
    return S;
  };

  function resize() {
    if (RENDER) {
      canvas.width = +(q.get('w') || 1920);
      canvas.height = +(q.get('h') || 1080);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw, (vh * 16) / 9);
    canvas.style.width = w + 'px';
    canvas.style.height = (w * 9) / 16 + 'px';
    canvas.width = Math.min(1920, Math.round(w * dpr));
    canvas.height = Math.round((canvas.width * 9) / 16);
  }
  resize();
  window.addEventListener('resize', resize);

  // choreography validator: white bones / beams must never touch the soul;
  // blue bones may only pass through it while it is standing still.
  MV.checkHits = (t0 = 0, t1 = T.end, step = 1 / 240) => {
    const out = [];
    let last = null;
    for (let t = t0; t < t1; t += step) {
      const s = TL.soul.at(t);
      if (s.a < 0.5) continue;
      const p = TL.soul.at(t - step);
      const speed = Math.hypot(s.x - p.x, s.y - p.y) / step;
      for (const e of TL.active(t)) {
        if (!e.hit || e.harmless) continue;
        if (e.kind === 'blue' && speed < 15) continue;
        if (e.hit(t, s.x, s.y)) {
          const key = e.kind + e.t0;
          if (last && last.key === key && t - last.t1 < 0.05) last.t1 = t;
          else out.push((last = { key, kind: e.kind, t0: +t.toFixed(3), t1: t, bar: +T.barOf(t).toFixed(2), speed: Math.round(speed), x: Math.round(s.x), y: Math.round(s.y), geo: e.geo ? JSON.stringify(e.geo(t), (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)) : '' }));
        }
      }
    }
    return out.map((o) => Object.assign(o, { t1: +o.t1.toFixed(3) }));
  };

  if (RENDER) {
    // export API used by tools/render.cjs
    MV.exportFrame = (t, type = 'image/jpeg', quality = 0.93) => {
      MV.renderFrame(t);
      return canvas.toDataURL(type, quality);
    };
    MV.ready = true;
    const t0 = parseFloat(q.get('t') || '0');
    MV.renderFrame(t0);
    return;
  }

  // ---------------------------------------------------------------- live player
  const audio = document.getElementById('audio');
  const ui = document.getElementById('ui');
  const bar = document.getElementById('bar');
  const info = document.getElementById('info');
  let playing = false, clockT = parseFloat(q.get('t') || '0'), clockAt = performance.now();
  audio.currentTime = clockT;
  // past the end of the mp3 the clock runs on its own (silent tail up to T.end)
  const inTail = (t) => t >= (audio.duration || T.dur) - 0.02;
  const now = () => {
    if (!playing) return clockT;
    // smooth clock between (coarse) audio.currentTime updates
    const est = clockT + (performance.now() - clockAt) / 1000;
    if (audio.ended || inTail(est)) return Math.min(est, T.end);
    const drift = audio.currentTime - est;
    if (Math.abs(drift) > 0.05) { clockT = audio.currentTime; clockAt = performance.now(); return clockT; }
    return est;
  };
  const start = () => { playing = true; clockAt = performance.now(); ui.classList.add('hide'); };
  const play = () => {
    if (clockT >= T.end - 0.01) seek(0);
    if (inTail(clockT)) return start();
    audio.play().then(() => { clockT = audio.currentTime; start(); }).catch(() => {});
  };
  const pause = () => { clockT = now(); audio.pause(); playing = false; ui.classList.remove('hide'); };
  const seek = (t) => {
    t = U.clamp(t, 0, T.end);
    audio.currentTime = Math.min(t, audio.duration || T.dur);
    clockT = t; clockAt = performance.now();
    if (playing && !inTail(t) && audio.paused) audio.play().catch(() => {});
  };
  ui.addEventListener('click', () => (playing ? pause() : play()));
  canvas.addEventListener('click', () => (playing ? pause() : play()));
  document.getElementById('timeline').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * T.end);
    e.stopPropagation();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'Enter') { playing ? pause() : play(); e.preventDefault(); }
    if (e.code === 'ArrowRight') seek(now() + (e.shiftKey ? T.bar : 2));
    if (e.code === 'ArrowLeft') seek(now() - (e.shiftKey ? T.bar : 2));
    if (e.code === 'KeyD') info.classList.toggle('show');
  });
  // ---------------------------------------------------------------- live sound effects
  let actx = null, bufs = {}, scheduled = new Set(), sfxGain = null;
  const SFX = TL.sfx.slice().sort((a, b) => a.t - b.t);
  const initAudio = () => {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = actx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(actx.destination);
    for (const [k, url] of Object.entries(window.MV_ASSETS.sfx))
      fetch(url).then((r) => r.arrayBuffer()).then((b) => actx.decodeAudioData(b)).then((d) => (bufs[k] = d)).catch(() => {});
  };
  ui.addEventListener('click', initAudio);
  canvas.addEventListener('click', initAudio);
  window.addEventListener('keydown', initAudio);
  let lastSfxT = -1;
  const pumpSfx = (t) => {
    if (!actx || !playing) { lastSfxT = t; return; }
    if (t < lastSfxT - 0.05 || t > lastSfxT + 0.5) scheduled.clear(); // seek
    const ahead = 0.12;
    for (const e of SFX) {
      if (e.t < t - 0.02) continue;
      if (e.t > t + ahead) break;
      const key = e.name + e.t;
      if (scheduled.has(key) || !bufs[e.name]) continue;
      scheduled.add(key);
      const src = actx.createBufferSource(), g = actx.createGain();
      src.buffer = bufs[e.name];
      g.gain.value = e.vol;
      src.connect(g).connect(sfxGain);
      src.start(actx.currentTime + Math.max(0, e.t - t));
    }
    lastSfxT = t;
  };
  function loop() {
    if (playing && now() >= T.end) { playing = false; clockT = T.end; ui.classList.remove('hide'); }
    const t = now() - LAT;
    pumpSfx(t);
    MV.renderFrame(t);
    bar.style.width = (100 * t) / T.end + '%';
    if (info.classList.contains('show')) {
      const b = T.barOf(t);
      info.textContent = `t=${t.toFixed(2)}  bar ${Math.floor(b)}  beat ${Math.floor((b % 1) * 4) + 1}  [${T.section(t).name}]`;
    }
    requestAnimationFrame(loop);
  }
  loop();
  }
})();
