const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      assert.equal(await page.locator('#cold-storage').count(), 0);
      await page.goto(`${base}/auth`);
      await page.locator('.account-card button.main-button').click();
      await page.waitForURL(`${base}/farmer`);
      assert.equal(await page.locator('#cold-storage').count(), 0);

      if (width < 1024) await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('navigation', { name: width < 1024 ? 'Mobile navigation' : 'Primary navigation' })
        .getByRole('link', { name: 'বিক্রির প্রস্তুতি' }).click();
      await page.waitForURL(`${base}/selling-preparation`);
      await page.getByRole('heading', { name: 'বিক্রির প্রস্তুতি', level: 1 }).waitFor();
      const section = page.locator('#cold-storage');
      await section.getByRole('heading', { name: 'হিমাগারে সরাসরি ফোন করুন' }).waitFor();
      assert.equal(await section.getByRole('link', { name: 'ফোন করুন' }).count(), 3);
      for (const href of await section.getByRole('link', { name: 'ফোন করুন' }).evaluateAll(links => links.map(link => link.getAttribute('href')))) {
        assert.match(href, /^tel:\+?[\d]+$/);
      }
      await page.getByRole('button', { name: 'Change language' }).click();
      await page.getByRole('heading', { name: 'Prepare to sell', level: 1 }).waitFor();
      await section.getByRole('heading', { name: 'Call a cold store directly' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/cold-storage-${width}.png`, fullPage: true });
      await page.getByRole('link', { name: 'Back to my page' }).click();
      await page.waitForURL(`${base}/farmer`);
      await page.goto(`${base}/cold-storage`);
      await page.waitForURL(`${base}/selling-preparation`);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Cold storage separate route, links, languages and layouts passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
