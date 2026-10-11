const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    const base = process.env.BASE_URL || 'http://127.0.0.1:4180';
    await page.goto(`${base}/`);
    await page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 20000 });
    await page.goto(`${base}/marketplace/farmer.html`);
    await page.locator('.farmer-portal').waitFor();
    await page.goto(`${base}/marketplace/buyer.html`);
    await page.locator('.buyer-portal').waitFor();
    await context.setOffline(true);
    await page.goto(`${base}/marketplace/farmer.html`);
    await page.locator('.farmer-portal').waitFor();
    assert.equal(await page.locator('#root').count(), 0, 'Offline navigation did not fall back to the SPA shell');
    assert.match(await page.locator('.hero').evaluate(element => getComputedStyle(element).backgroundImage), /farmer-hero\.png/, 'Marketplace styles load offline');
    const loadedFonts = await page.evaluate(async () => ({ count: (await document.fonts.load('700 16px "Anek Bangla"')).length, entries: [...document.fonts].map(font => ({ family: font.family, status: font.status })) }));
    assert.equal(loadedFonts.count > 0, true, `Bangla font loads offline: ${JSON.stringify(loadedFonts)}`);
    await page.goto(`${base}/marketplace/buyer.html`);
    await page.locator('.buyer-portal').waitFor();
    console.log('Marketplace farmer and buyer pages work offline after installation.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
