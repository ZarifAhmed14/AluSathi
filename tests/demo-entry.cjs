const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      await page.goto(`${base}/auth`);
      await page.locator('.account-card button.main-button').click();
      await page.waitForURL(`${base}/farmer`);
      assert.equal(await page.locator('#cold-storage').count(), 0);
      await page.goto(`${base}/selling-preparation`);
      await page.locator('#cold-storage').waitFor();
      await page.goto(`${base}/farmer`);
      await page.locator('.site-header').getByRole('button', { name: 'বের হন' }).click();
      await page.waitForURL(`${base}/`);
      assert.equal(await page.locator('#cold-storage').count(), 0);
      assert.equal(await page.locator('#diary').count(), 0);
      await context.close();
    }
    console.log('Farmer entry, storage route and sign-out passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
