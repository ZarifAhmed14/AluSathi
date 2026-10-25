const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await context.addInitScript(() => { sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer'); });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${base}/farmer#tools`, { waitUntil: 'domcontentloaded' });
    await page.locator('.hisab-estimate').waitFor();
    assert.equal(await page.locator('.hisab-picture details').count(), 3);
    assert.equal(await page.locator('.farmer-tools-page .care-library-card').count(), 0);
    await page.getByLabel('কত কেজি বিক্রি করবেন?').fill('1000');
    await page.getByLabel('প্রতি কেজি কত টাকা পাবেন?').fill('25');
    await page.locator('.selling-costs summary').click();
    const sellingCosts = page.locator('.selling-costs');
    await sellingCosts.getByLabel('পরিবহন').fill('1000');
    await sellingCosts.getByLabel('লোডিং / বস্তা').fill('500');
    await sellingCosts.getByLabel('অন্যান্য').fill('0');
    assert.match(await page.locator('.sale-breakdown').innerText(), /২৫,০০০/);
    assert.match(await page.locator('.sale-breakdown').innerText(), /২৩,৫০০/);
    await page.locator('.whole-crop-check input').uncheck();
    assert.match(await page.locator('.hisab-picture').innerText(), /আংশিক বিক্রিতে/);
    await page.locator('.offer-comparison summary').click();
    await page.getByLabel('দ্বিতীয় দর (টাকা/কেজি)').fill('27');
    const comparison = page.locator('.offer-comparison');
    await comparison.getByLabel('পরিবহন').fill('2000');
    await comparison.getByLabel('লোডিং / বস্তা').fill('500');
    await comparison.getByLabel('অন্যান্য').fill('0');
    assert.match(await page.locator('.offer-compare-result').innerText(), /দ্বিতীয় দর ভালো/);
    await page.getByRole('link', { name: 'খরচ যোগ করুন' }).click();
    await page.locator('#diary').waitFor();
    assert.equal(await page.locator('.notebook-tabs .active').innerText(), 'খরচ');
    await page.locator('.notebook-expense-form').waitFor();
    await page.locator('.notebook-expense-form input[type=number]').fill('500');
    await page.locator('.notebook-expense-form button').click();
    assert.match(await page.locator('.notebook-expense-form').innerText(), /খাতায় রাখা হয়েছে/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('Hisab flow passed.');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
