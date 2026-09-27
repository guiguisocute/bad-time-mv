// Offline export: renders every frame in (headless) Chromium, mixes the sound
// effects over music.mp3, and encodes an MP4 — or just writes a frame sequence.
//
//   npm i -g playwright && npx playwright install chromium        # once
//   node tools/render.cjs [options]
//
// Options (all optional):
//   --fps=60 --w=1920 --h=1080       output format
//   --t0=0 --t1=160                  time range in seconds (default: the whole video, music + silent ending)
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
const FPS = +(opt.fps || 60), W = +(opt.w || 1920), H = +(opt.h || 1080), WORKERS = +(opt.workers || 2);
const OUT = opt.out || `dist/mv_${H}p${FPS}.mp4`;
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
const URL = 'file://' + path.resolve('index.html').replace(/\\/g, '/') + `?render=1&w=${W}&h=${H}`;

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
function mixAudio(sfx, wavPath, dur, gain = 0.55) {
  const music = decode('music.mp3');
  const src = fs.readFileSync('src/assets.js', 'utf8');
  const assets = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
  const bank = {};
  for (const [name, url] of Object.entries(assets.sfx)) {
    const f = path.join(TMP, name + '.mp3');
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    bank[name] = decode(f);
  }
  // padded with silence up to the end of the video (the ending runs past the music)
  const mix = new Float32Array(Math.max(music.length, Math.ceil(dur * AR) * 2));
  for (let i = 0; i < music.length; i++) mix[i] = music[i] * MUSIC_GAIN;
  for (const e of sfx) {
    const s = bank[e.name];
    if (!s) continue;
    const i0 = Math.round(e.t * AR) * 2;
    const g = e.vol * gain;
    for (let i = 0; i < s.length && i0 + i < mix.length; i++) mix[i0 + i] += s[i] * g;
  }
  let peak = 0;
  for (let i = 0; i < mix.length; i++) {
    const a = Math.abs(mix[i]);
    if (a > peak) peak = a;
  }
  // scale down only if the sum clips; no tanh limiter (that rounds off transients)
  const scale = peak > CEILING ? CEILING / peak : 1;
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
  const sfx = await page.evaluate(() => window.MV.TL.sfx);
  await browser.close();
  const t0 = +(opt.t0 || 0), t1 = +(opt.t1 || dur);
  const F0 = Math.round(t0 * FPS), F1 = Math.round(t1 * FPS);
  const wav = opt.frames
    ? path.join(path.dirname(opt.frames), 'mix.wav')
    : (opt['audio-only']
      ? (String(opt.out || '').toLowerCase().endsWith('.wav') ? opt.out : 'dist/mix_hq.wav')
      : path.join(TMP, 'mix.wav'));
  if (opt.frames) fs.mkdirSync(opt.frames, { recursive: true });
  mixAudio(sfx, wav, Math.max(dur, t1));
  if (opt['audio-only']) return;
  console.log(`rendering ${F1 - F0} frames (${t0}s-${t1}s) at ${W}x${H}@${FPS}, ${WORKERS} workers, ${opt.gpu ? 'GPU' : 'SwiftShader'}`);
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
