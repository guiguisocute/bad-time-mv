// Render selected frames to images for review.
// Usage: node tools/frames.cjs <outDir> <t1> <t2> ... [--w=960 --h=540]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const args = process.argv.slice(2);
  const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
  const [out, ...ts] = args.filter((a) => !a.startsWith('--'));
  fs.mkdirSync(out, { recursive: true });
  const w = opts.w || 960, h = opts.h || 540;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  await page.goto('file://' + path.resolve('index.html') + `?render=1&w=${w}&h=${h}`);
  await page.waitForFunction(() => window.MV && window.MV.ready, null, { timeout: 20000 });
  for (const t of ts) {
    const url = await page.evaluate((t) => window.MV.exportFrame(+t, 'image/png'), t);
    fs.writeFileSync(path.join(out, `f_${(+t).toFixed(3)}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
})();
