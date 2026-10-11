const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
  const server = await (await import('vite')).createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    const page = await browser.newPage();
    await page.route(server.resolvedUrls.local[0], route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Preprocessing check</title>' }));
    await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded', timeout: 60000 });
    const actual = await page.evaluate(async () => {
      const blob = await (await fetch('/marketplace/potato-harvest.png')).blob();
      const { potatoImageTensor } = await import('/src/lib/potato-image.ts');
      return Array.from((await potatoImageTensor(new File([blob], 'potato.png', { type: 'image/png' }))).data);
    });
    const python = process.env.PYTHON || (process.platform === 'win32' ? '.venv/Scripts/python.exe' : 'python3');
    const script = `import json,sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB').resize((224,224),Image.Resampling.BILINEAR)\np=list(im.getdata())\nm=(.485,.456,.406); s=(.229,.224,.225)\nprint(json.dumps([(rgb[c]/255-m[c])/s[c] for c in range(3) for rgb in p]))`;
    const result = spawnSync(python, ['-c', script, path.resolve('public/marketplace/potato-harvest.png')], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(result.stderr || `Python exited ${result.status}`);
    const expected = JSON.parse(result.stdout);
    assert.equal(actual.length, expected.length);
    const meanError = actual.reduce((sum, value, i) => sum + Math.abs(value - expected[i]), 0) / actual.length;
    assert.ok(meanError < 0.08, `Browser/Python normalized pixel difference ${meanError}`);
    console.log(`potato preprocessing: browser/Python mean difference ${meanError.toFixed(4)}`);
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
