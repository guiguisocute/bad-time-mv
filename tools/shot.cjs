// Usage: node tools/shot.cjs <url-or-file> <out.png> [width] [height] [evalJS]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [, , target, out, w = '1600', h = '900', js] = process.argv;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const url = target.startsWith('http') || target.startsWith('file:') ? target : 'file://' + path.resolve(target);
  await page.goto(url);
  await page.waitForTimeout(300);
  if (js) console.log(await page.evaluate(js));
  await page.screenshot({ path: out });
  await browser.close();
})();
