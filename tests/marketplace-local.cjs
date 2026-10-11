const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(() => localStorage.setItem('alusathi-lang', 'en'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      if (width >= 768 && width < 1024) await page.getByRole('button', { name: 'Open menu' }).click();
      const marketLink = page.locator(width >= 1024 ? '.site-header .top-nav[href="/marketplace/"]' : width >= 768 ? '.mobile-menu a[href="/marketplace/"]' : '.bottom-nav a[href="/marketplace/"]');
      await marketLink.click();
      await page.waitForURL(`${base}/auth`);
      await page.locator('.account-card button.main-button').click();
      await page.waitForURL(`${base}/farmer`);
      await page.goto(`${base}/marketplace/farmer.html#samples`);
      await page.locator('.farmer-portal').waitFor();
      await page.locator('.lot-card [data-action=select-lot]').first().click();
      assert.equal(await page.locator('.offer-card').count(), 3);
      await page.goto(`${base}/marketplace/buyer.html`);
      await page.locator('.buyer-portal').waitFor();
      await page.locator('.lot-card [data-action=offer-lot]').first().click();
      assert.equal(await page.locator('.buyer-profile input[required]').count(), 4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Marketplace routing and mobile/tablet/desktop layouts passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
