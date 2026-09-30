// Offline export: renders every frame in (headless) Chromium, mixes the sound
// effects over music.mp3, and encodes an MP4 — or just writes a frame sequence.
//
//   npm i -g playwright && npx playwright install chromium        # once
//   node tools/render.cjs [options]
//
// Options (all optional):
//   --cut=tiktok                     the vertical short (1080x1920, bar 44 to the end, extra sound design)
//   --fps=60 --w=1920 --h=1080       output format
//   --t0=0 --t1=160                  time range in seconds (default: the whole video / the cut's own range)
//   --limit / --limit=0              look-ahead peak limiter on the mix (default: on for cuts) instead of
//                                    scaling the whole mix down when the sound effects push it over
//   --workers=2                      parallel browser instances
//   --gpu                            render WebGL on the real GPU (default: SwiftShader, CPU)
//   --channel=chrome                 use an installed Chrome/Edge instead of Playwright's Chromium
//   --headful                        show the browser windows (some GPU drivers need this)
//   --vcodec=libx264                 e.g. h264_nvenc | hevc_nvenc | h264_amf | h264_qsv | libx264
//   --vopts="-preset p5 -cq 19"      extra encoder options (default depends on --vcodec)
//   --frames=dist/frames             write JPEG frames + dist/mix.wav instead of encoding
//   --audio-only                     mix soundtrack and exit (no video)
//   --out=dist/mv_1080p60.mp4
// Environment: FFMPEG=/path/to/ffmpeg (default: ffmpeg on PATH)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const opt = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const CUT = opt.cut && opt.cut !== true ? opt.cut : '';
const VERTICAL = CUT === 'tiktok';
const FPS = +(opt.fps || 60), W = +(opt.w || (VERTICAL ? 1080 : 1920)), H = +(opt.h || (VERTICAL ? 1920 : 1080)), WORKERS = +(opt.workers || 2);
const OUT = opt.out || (CUT ? `dist/mv_${CUT}_${W}x${H}_${FPS}.mp4` : `dist/mv_${H}p${FPS}.mp4`);
const LIMIT = opt.limit === undefined ? !!CUT : opt.limit !== '0';
const TMP = path.join('dist', '.tmp');
const VCODEC = opt.vcodec || 'libx264';
const VOPTS = (opt.vopts || (VCODEC === 'libx264' ? '-preset medium -crf 20 -tune animation' : VCODEC.includes('nvenc') ? '-preset p5 -rc vbr -cq 19 -b:v 0' : '-b:v 40M')).split(/\s+/).filter(Boolean);
const AR = 48000;
const MUSIC_GAIN = 10 ** (-4 / 20); // -4 dB headroom so SFX do not squash the already-full-scale mp3
const CEILING = 10 ** (-1 / 20);    // -1 dBFS encoder true-peak margin
function aacArgs() {
  try {
    const list = execFileSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (/\baac_mf\b/.test(list)) return ['-c:a', 'aac_mf', '-b:a', '320k'];
  } catch (_) {}
  return ['-c:a', 'aac', '-b:a', '320k', '-aac_coder', 'twoloop'];
}
const AAC = aacArgs();
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const ARGS = opt.gpu
  ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--allow-file-access-from-files']
  : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'];
const URL = 'file://' + path.resolve('index.html').replace(/\\/g, '/') + `?render=1&w=${W}&h=${H}` + (CUT ? `&cut=${CUT}` : '');

async function openPage() {
  const browser = await chromium.launch({ args: ARGS, headless: !opt.headful, channel: opt.channel || undefined });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.MV && window.MV.ready, null, { timeout: 120000 });
  return { browser, page };
}

// ---------------------------------------------------------------- audio: music + sound effects
function decode(file) {
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-af', 'aresample=resampler=soxr', '-f', 'f32le', '-ac', '2', '-ar', String(AR), '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}
// Look-ahead peak limiter on interleaved stereo: the gain reaches its target 5 ms before
// each peak (trailing min + box average) and recovers over ~80 ms, so only the few
// overshooting transients are turned down instead of the whole mix.
function limit(x, ceiling) {
  const N = x.length / 2, Wn = Math.round(AR * 0.005), rel = Math.exp(-1 / (AR * 0.08));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(x[2 * i]), Math.abs(x[2 * i + 1])); need[i] = p > ceiling ? ceiling / p : 1; }
  const g1 = new Float32Array(N), dq = new Int32Array(N);
  let h = 0, tl = 0;
  for (let i = 0; i < N; i++) { // min over need[i - Wn + 1 .. i]
    while (tl > h && need[dq[tl - 1]] >= need[i]) tl--;
    dq[tl++] = i;
    if (dq[h] <= i - Wn) h++;
    g1[i] = need[dq[h]];
  }
  let sum = 0, g = 1, reduced = 0;
  for (let i = 0; i < Wn && i < N; i++) sum += g1[i];
  for (let i = 0; i < N; i++) { // mean over g1[i .. i + Wn - 1], then a smooth release
    const g2 = sum / Wn;
    sum += (i + Wn < N ? g1[i + Wn] : 1) - g1[i];
    g = Math.min(g2, 1 - (1 - g) * rel);
    if (g < 0.999) reduced++;
    x[2 * i] *= g; x[2 * i + 1] *= g;
  }
  return reduced / AR;
}
function mixAudio(sfx, wavPath, dur, o = {}) {
  const gain = 0.55;
  const music = decode('music.mp3');
  const src = fs.readFileSync('src/assets.js', 'utf8');
  const assets = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
  const bank = {};
  for (const [name, url] of Object.entries(assets.sfx)) {
    const f = path.join(TMP, name + '.mp3');
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    bank[name] = decode(f);
  }
  // procedural sounds (src/synth.js), mono -> stereo
  const SYN = require(path.resolve('src/synth.js'));
  for (const name of new Set(sfx.map((e) => e.name))) {
    if (bank[name] || !SYN.has(name)) continue;
    const m = SYN.make(name, AR), st = new Float32Array(m.length * 2);
    for (let i = 0; i < m.length; i++) st[2 * i] = st[2 * i + 1] = m[i];
    bank[name] = st;
  }
  // padded with silence up to the end of the video (the ending runs past the music)
  const mix = new Float32Array(Math.max(music.length, Math.ceil(dur * AR) * 2));
  for (let i = 0; i < music.length; i++) mix[i] = music[i] * MUSIC_GAIN;
  for (const e of sfx) {
    const s = bank[e.name];
    if (!s) { console.warn('missing sound', e.name); continue; }
    const i0 = Math.round(e.t * AR) * 2;
    const g = e.vol * gain;
    for (let i = 0; i < s.length && i0 + i < mix.length; i++) if (i0 + i >= 0) mix[i0 + i] += s[i] * g;
  }
  // a cut that starts mid-song: 12 ms fade-in so the first sample does not click
  if (o.fadeIn > 0) {
    const a = Math.round(o.fadeIn * AR), n = Math.round(0.012 * AR);
    for (let i = 0; i < n && (a + i) * 2 + 1 < mix.length; i++) { mix[(a + i) * 2] *= i / n; mix[(a + i) * 2 + 1] *= i / n; }
  }
  let limited = 0;
  if (o.limit) limited = limit(mix, CEILING * 0.98);
  let peak = 0;
  for (let i = 0; i < mix.length; i++) {
    const a = Math.abs(mix[i]);
    if (a > peak) peak = a;
  }
  // scale down only if the sum clips; no tanh limiter (that rounds off transients)
  const scale = peak > CEILING ? CEILING / peak : 1;
  if (o.limit) console.log(`limiter active for ${limited.toFixed(2)} s`);
  const bytes = mix.length * 4;
  const pcm = Buffer.alloc(bytes);
  for (let i = 0; i < mix.length; i++) pcm.writeFloatLE(mix[i] * scale, i * 4);
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + bytes, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(AR, 24);
  hdr.writeUInt32LE(AR * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write('data', 36); hdr.writeUInt32LE(bytes, 40);
  fs.mkdirSync(path.dirname(wavPath), { recursive: true });
  fs.writeFileSync(wavPath, Buffer.concat([hdr, pcm]));
  console.log(`mixed ${sfx.length} sfx -> ${wavPath}  peak ${peak.toFixed(3)}  scale ${scale.toFixed(3)}  ${AR} Hz float`);
}

// ---------------------------------------------------------------- video
async function worker(id, f0, f1) {
  const { browser, page } = await openPage();
  let ff = null, seg = null;
  if (!opt.frames) {
    seg = path.join(TMP, `seg_${String(id).padStart(2, '0')}.mp4`);
    ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', VCODEC, ...VOPTS, '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  }
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate((t) => window.MV.exportFrame(t, 'image/jpeg', 0.95), f / FPS);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (ff) { if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); }
    else fs.writeFileSync(path.join(opt.frames, String(f).padStart(5, '0') + '.jpg'), buf);
    if ((f - f0) % 120 === 0) {
      const done = f - f0 + 1, rate = done / ((Date.now() - t0) / 1000);
      console.log(`[w${id}] ${done}/${f1 - f0} frames  ${rate.toFixed(1)} fps  eta ${((f1 - f) / rate / 60).toFixed(1)} min`);
    }
  }
  if (ff) { ff.stdin.end(); await new Promise((r) => ff.on('close', r)); }
  await browser.close();
  return seg;
}

(async () => {
  const { browser, page } = await openPage();
  const dur = await page.evaluate(() => window.MV.T.end || window.MV.T.dur);
  const range = await page.evaluate(() => window.MV.T.cut || { t0: 0, t1: window.MV.T.end });
  const sfx = await page.evaluate(() => window.MV.TL.sfx);
  await browser.close();
  const t0 = +(opt.t0 ?? range.t0), t1 = +(opt.t1 ?? range.t1);
  const F0 = Math.round(t0 * FPS), F1 = Math.round(t1 * FPS);
  const wav = opt.frames
    ? path.join(path.dirname(opt.frames), 'mix.wav')
    : (opt['audio-only']
      ? (String(opt.out || '').toLowerCase().endsWith('.wav') ? opt.out : 'dist/mix_hq.wav')
      : path.join(TMP, 'mix.wav'));
  if (opt.frames) fs.mkdirSync(opt.frames, { recursive: true });
  mixAudio(sfx, wav, Math.max(dur, t1), { limit: LIMIT, fadeIn: t0 });
  if (opt['audio-only']) return;
  console.log(`rendering ${F1 - F0} frames (${t0}s-${t1}s) at ${W}x${H}@${FPS}, ${WORKERS} workers, ${opt.gpu ? 'GPU' : 'SwiftShader'}${CUT ? ', cut=' + CUT : ''}`);
  const per = Math.ceil((F1 - F0) / WORKERS), jobs = [];
  for (let i = 0; i < WORKERS; i++) {
    const a = F0 + i * per, b = Math.min(F1, a + per);
    if (a < b) jobs.push(worker(i, a, b));
  }
  const segs = await Promise.all(jobs);
  if (opt.frames) {
    const rel = (p) => p.replace(/\\/g, '/');
    console.log('\nframes written. encode with e.g.:');
    console.log(`ffmpeg -framerate ${FPS} -start_number ${F0} -i ${rel(opt.frames)}/%05d.jpg -ss ${t0} -i ${rel(wav)} -map 0:v -map 1:a -c:v h264_nvenc -preset p5 -rc vbr -cq 19 -b:v 0 -pix_fmt yuv420p ${AAC.join(' ')} -shortest -movflags +faststart ${rel(OUT)}`);
    return;
  }
  const list = path.join(TMP, 'segs.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${path.resolve(s).replace(/\\/g, '/')}'`).join('\n'));
  execFileSync(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(t0), '-t', String(t1 - t0), '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', ...AAC, '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB');
})();
