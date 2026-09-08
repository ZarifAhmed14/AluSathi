const { chromium } = require('../../node_modules/playwright');
const assert = require('node:assert/strict');

const future = (days) => {
  const date = new Date(); date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.route('**/api/auth/**', route => route.fulfill({ json: {} }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/auth', { waitUntil: 'networkidle' });
      await page.waitForURL('http://127.0.0.1:4173/');
      await page.getByRole('button', { name: 'Change language' }).click();
      const market = page.locator('#harvest-market');
      await market.locator('input[type=date]').first().fill(future(10));
      await market.getByLabel('Available to sell (kg)').fill('1200');
      await market.getByLabel('Estimated transport to buyer (BDT/kg)').fill('3');
      await market.getByRole('button', { name: 'Record a real buyer request' }).click();
      await market.getByLabel('Buyer or business name').fill('Verified pilot buyer');
      await market.getByLabel('Payment terms').fill('same-day after delivery');
      const dates = market.locator('.demand-form input[type=date]');
      await dates.nth(0).fill(future(7)); await dates.nth(1).fill(future(14));
      await market.getByLabel('Minimum (kg)').fill('1000');
      await market.getByLabel('Maximum (kg)').fill('2000');
      await market.getByLabel('Offered price (BDT/kg)').fill('32');
      await market.getByRole('button', { name: 'Add buyer request' }).click();
      await assert.rejects(() => market.getByText('All three requirements match').waitFor({ timeout: 1 }), /Timeout/).catch(() => {});
      assert.match(await market.innerText(), /All three requirements match/);
      assert.match(await market.innerText(), /Estimated take-home\s*৳29\/kg/);
      assert.match(await market.innerText(), /Estimated total\s*৳34,800/);
      await market.getByRole('button', { name: 'Delete request' }).click();
      assert.match(await market.innerText(), /No buyer requests recorded yet/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      console.log(`Harvest market ${width}px: passed`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
