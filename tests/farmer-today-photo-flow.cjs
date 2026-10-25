const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block', timezoneId: 'Asia/Dhaka' });
    await context.addInitScript(() => {
      localStorage.setItem('alusathi-lang', 'bn');
      localStorage.setItem('alusathi-planting-date', '');
      sessionStorage.setItem('alusathi-demo', 'true');
      sessionStorage.setItem('alusathi-role', 'farmer');
    });
    await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { temperature_2m: 24, relative_humidity_2m: 75, precipitation: 0, weather_code: 3 }, daily: { time: ['2026-10-21', '2026-10-22', '2026-10-23'], precipitation_sum: [0, 4, 1], temperature_2m_max: [29, 28, 30], temperature_2m_min: [20, 21, 22], wind_gusts_10m_max: [12, 15, 10], weather_code: [2, 61, 2] }, hourly: { time: [], temperature_2m: [], relative_humidity_2m: [] } } }));
    const page = await context.newPage();
    await page.goto(`${base}/farmer`);
    await page.screenshot({ path: 'test-results/farmer-today-initial.png' });
    await page.locator('.today-photo-action button').click();
    await page.locator('.potato-scan').waitFor();
    assert.match(page.url(), /#photos$/, 'Today opens the photo scanner');
    await page.screenshot({ path: 'test-results/farmer-today-expanded.png' });
    assert.equal(await page.locator('.potato-scan .scan-workspace').isVisible(), true, 'Upload box is shown');
    assert.equal(await page.locator('.potato-scan .photo-demo-card').count(), 0, 'Sample photo examples are removed');
    assert.equal(await page.getByRole('button', { name: 'স্ক্যানার চালু করুন', exact: true }).count(), 0, 'Scanner activation gate is removed');
    assert.equal(await page.getByRole('button', { name: 'ছবি পরীক্ষা করুন', exact: true }).isDisabled(), true, 'Scanner is directly available and waits for a photo');
    assert.equal(await page.locator('.today-photo-action .main-button').count(), 1, 'One primary photo action');
    await page.locator('.farmer-tabs a[href="/farmer"]').click();
    await page.locator('.today-field-tools').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.today-field-tools').isVisible(), true, 'Field inputs and care tools live on Today');
    await page.locator('.today-field-tools .ledger-panel').first().getByLabel('জমির পরিমাণ').fill('1');
    await page.locator('.today-field-tools .ledger-panel').first().getByLabel('একক').selectOption('acre');
    assert.match(await page.locator('.today-field-tools .ledger-panel').first().locator('output').innerText(), /৪,০৪৬|৪০৪৬/);
    const future = await page.evaluate(() => { const date = new Date(); date.setDate(date.getDate() + 4); return date.toLocaleDateString('en-CA'); });
    await page.locator('.today-fertilizer-calendar input[type=date]').fill(future);
    assert.match(await page.locator('.today-fertilizer-calendar').innerText(), /আর ৪ দিন পরে/);
    assert.match(await page.locator('.today-forecast').innerText(), /আগামী ৩ দিন/);
    assert.match(await page.locator('.today-spray-caution').innerText(), /শুধু ছবি বা আবহাওয়া দেখে সিদ্ধান্ত নেবেন না/);
    assert.equal(await page.locator('.farmer-tools-page .ledger-panel').filter({ hasText: 'জমির মাপ' }).count(), 0, 'Field size moved out of হিসাব');
    await page.getByRole('button', { name: 'হ্যাঁ, খাতায় রাখুন' }).first().click();
    await page.locator('.notebook-sheet').waitFor();
    assert.match(await page.locator('.notebook-sheet').innerText(), /সার/);
    assert.equal(await page.getByText('এখনও কোনো ছবি রাখা হয়নি', { exact: true }).count(), 0);
    await page.goto(`${base}/farmer#today`);
    const spray = page.locator('.today-field-tools .ledger-panel').filter({ hasText: 'স্প্রে দরকার কি?' });
    await spray.getByLabel('লেবেলের হার').fill('2');
    await spray.getByLabel('পানি (লিটার)').fill('16');
    await spray.getByRole('button', { name: 'হ্যাঁ, খাতায় রাখুন' }).click();
    await page.locator('.notebook-sheet').waitFor();
    assert.match(await page.locator('.notebook-sheet').innerText(), /স্প্রে/);
    await page.evaluate(() => {
      const old = new Date(); old.setDate(old.getDate() - 35);
      const date = old.toLocaleDateString('en-CA');
      const rows = JSON.parse(localStorage.getItem('alusathi-field-actions-v1') || '[]');
      rows.push({ id: 'old-photo', date, district: 'Rangpur', kind: 'observation', category: 'photo', text: 'ছবি পরীক্ষা', status: 'সুস্থ', details: 'স্বাভাবিক বাছাই', variety: 'ডায়মন্ড', cropAge: 'প্রায় ৭৫ দিন' });
      localStorage.setItem('alusathi-field-actions-v1', JSON.stringify(rows));
    });
    await page.goto(`${base}/selling-preparation`);
    const sellingCards = page.locator('.selling-focus-card h2');
    assert.equal(await sellingCards.nth(0).innerText(), 'আলুর পরিচয়পত্র');
    assert.equal(await sellingCards.nth(1).innerText(), 'হিমাগার খুঁজুন');
    await page.getByRole('link', { name: 'পরিচয়পত্র তৈরি করুন' }).click();
    await page.locator('#lot-form').waitFor();
    assert.equal(await page.locator('#lot-form [name=district]').inputValue(), 'Rangpur');
    assert.match(await page.locator('.history-prefill-note').innerText(), /এক মাসের বেশি পুরোনো খাতা/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No desktop horizontal overflow');
    await page.screenshot({ path: 'test-results/farmer-today-photo-inline.png', fullPage: true });
    console.log('Today photo flow passed: direct scanner access, no sample gallery, field area, fertilizer reminder and cautious spray guidance.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
