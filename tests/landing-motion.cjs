const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    fs.mkdirSync('test-results', { recursive: true });
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);

      assert.equal(await page.locator('.public-landing').count(), 1);
      assert.equal(await page.locator('.public-role-grid article').count(), 2);
      assert.ok(await page.locator('.public-hero img').getAttribute('src').then(src => src.endsWith('/alusathi-potato-sorting.webp')));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px has no horizontal overflow`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `test-results/public-landing-${width}.png`, fullPage: true });
      await context.close();
    }

    const farmerContext = await browser.newContext({ serviceWorkers: 'block' });
    const farmerPage = await farmerContext.newPage();
    await farmerPage.goto(base);
    await farmerPage.getByRole('button', { name: 'কৃষকের পাতায় যান' }).click();
    await farmerPage.waitForURL(`${base}/farmer`);
    await farmerPage.locator('.farmer-v2').waitFor();
    assert.equal(await farmerPage.locator('.farmer-v2').count(), 1);
    await farmerContext.close();

    const buyerContext = await browser.newContext({ serviceWorkers: 'block' });
    const buyerPage = await buyerContext.newPage();
    await buyerPage.goto(base);
    assert.equal(await buyerPage.getByRole('link', { name: 'ব্যবসায়ীর পাতায় যান' }).getAttribute('href'), '/marketplace/buyer.html');
    await buyerContext.close();

    console.log('Public landing: artwork, role choices, routes and responsive layout passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
