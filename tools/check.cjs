// Validate choreography: node tools/check.cjs [t0] [t1]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [t0 = '0', t1 = ''] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
  await page.goto('file://' + path.resolve('index.html') + '?render=1&w=320&h=180');
  await page.waitForFunction(() => window.MV && window.MV.ready);
  const hits = await page.evaluate(([a, b]) => window.MV.checkHits(+a, b ? +b : window.MV.T.end), [t0, t1]);
  if (!hits.length) console.log('OK: no collisions');
  for (const h of hits) console.log(JSON.stringify(h));
  // first person: no beam or white bone may reach the camera
  const pov = await page.evaluate(() => (window.MV.checkPov ? window.MV.checkPov() : []));
  console.log(pov.length ? `first person: ${pov.length} samples too close` : 'OK: first person clear');
  for (const h of pov.slice(0, 20)) console.log(JSON.stringify(h));
  await browser.close();
})();
