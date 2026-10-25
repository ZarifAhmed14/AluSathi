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

      await page.goto(`${base}/selling-preparation`);
      await page.getByRole('heading', { name: 'বিক্রির আগে', level: 1 }).waitFor();
      const section = page.locator('#cold-storage');
      assert.equal(await section.count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'আপনার এলাকার ক্রেতারা' }).count(), 0);
      await page.getByRole('button', { name: 'ক্রেতার দর ও উত্তর দেখুন' }).click();
      await page.getByRole('status').filter({ hasText: 'ক্রেতার চাহিদা খুঁজছি' }).waitFor();
      await page.getByRole('heading', { name: 'আপনার এলাকার ক্রেতারা' }).waitFor();
      await page.getByRole('status').filter({ hasText: 'ক্রেতার চাহিদা খুঁজছি' }).waitFor({ state: 'detached' });
      assert.match(await page.locator('.selling-request-card').innerText(), /রহিম ট্রেডার্স[\s\S]*২০০ কেজি[\s\S]*৪,০০০/);
      await page.getByRole('button', { name: 'হিসাব খুলুন' }).click();
      const estimate = page.getByRole('dialog', { name: 'সম্ভাব্য লাভ–লোকসান' });
      await estimate.waitFor();
      await estimate.getByLabel('এই ২০০ কেজির মোট খরচ').fill('3500');
      assert.match(await estimate.innerText(), /৳৫০০/);
      await estimate.getByRole('button', { name: 'বন্ধ করুন' }).click();
      await page.getByRole('button', { name: 'ক্রেতার তালিকা বন্ধ করুন' }).click();
      assert.equal(await page.getByRole('heading', { name: 'আপনার এলাকার ক্রেতারা' }).count(), 0);
      assert.equal(await page.locator('.selling-route-teaser, .selling-intent').count(), 0);
      assert.equal(await page.getByText('ফোনে আগে জেনে নিন').count(), 0);
      await page.getByRole('button', { name: 'হিমাগার খুঁজুন' }).click();
      await page.getByRole('status').filter({ hasText: 'হিমাগারের যোগাযোগ খুঁজছি' }).waitFor();
      await section.getByRole('heading', { name: 'হিমাগারে সরাসরি ফোন করুন' }).waitFor();
      await page.getByRole('status').filter({ hasText: 'হিমাগারের যোগাযোগ খুঁজছি' }).waitFor({ state: 'detached' });
      const phoneLinks = section.getByRole('link', { name: 'ফোন করুন' });
      assert.ok((await phoneLinks.count()) <= 20);
      for (const href of await phoneLinks.evaluateAll(links => links.map(link => link.getAttribute('href')))) {
        assert.match(href, /^tel:\+?[\d]+$/);
      }
      await page.getByText('আরও', { exact: true }).click();
      await page.getByRole('button', { name: 'English' }).click();
      await page.getByRole('heading', { name: 'Before selling', level: 1 }).waitFor();
      await section.getByRole('heading', { name: 'Call a cold store directly' }).waitFor();
      assert.equal(await page.getByText('Ask before you pay').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/cold-storage-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Before-selling requests, estimate dialog, cold-storage disclosure, languages and layouts passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
