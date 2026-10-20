const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Dhaka', serviceWorkers: 'block' });
  await context.addInitScript(() => { sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer'); });
  await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
    current: { temperature_2m: 24, relative_humidity_2m: 82, precipitation: 0, weather_code: 3 },
    daily: { time: ['2026-10-19'], temperature_2m_min: [18], temperature_2m_max: [27], precipitation_sum: [0], wind_gusts_10m_max: [12], weather_code: [3] },
    hourly: { time: [], temperature_2m: [], relative_humidity_2m: [] },
  } }));
  const page = await context.newPage(); const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(`${base}/farmer#tools`);
    await page.locator('.farmer-tools-page').waitFor();
    assert.equal(await page.locator('.farmer-tabs a').count(), 5);
    const panels = page.locator('.farmer-tools-page .ledger-panel');
    assert.equal(await panels.count(), 3, 'Field area, fertilizer and spray are moved out of হিসাব');
    const beforeInvalidExpense = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-farm-ledger-v1') || '[]').length);
    await panels.nth(0).getByRole('button').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-farm-ledger-v1') || '[]').length), beforeInvalidExpense, 'Required empty expense is not saved');
    await panels.nth(0).locator('input[type=number]').fill('1000');
    await panels.nth(0).locator('input[type=date]').fill('2026-10-19');
    await panels.nth(0).getByRole('button').click();
    await panels.nth(1).locator('input').fill('0');
    assert.equal(await panels.nth(1).locator('output').count(), 0, 'Zero sale quantity has no break-even result');
    await panels.nth(1).locator('input').fill('100');
    assert.match(await panels.nth(1).locator('output').innerText(), /১০/);

    await page.locator('.farmer-tabs a[href="/farmer"]').click();
    await page.locator('.today-field-tools').waitFor();
    const todayPanels = page.locator('.today-field-tools .ledger-panel');
    assert.equal(await todayPanels.count(), 3, 'Today contains field size, fertilizer and spray');
    await todayPanels.nth(0).getByLabel('জমির পরিমাণ').fill('1');
    await todayPanels.nth(0).getByLabel('একক').selectOption('acre');
    await todayPanels.nth(0).getByRole('button').click();
    const fertilizer = todayPanels.nth(1);
    assert.match(await fertilizer.innerText(), /৪\.০৫.*টন/);
    await fertilizer.getByRole('button').click();
    assert.match(await page.locator('.ledger-feedback').innerText(), /খাতায়/);
    assert.equal(await page.locator('.today-input-guidance').count(), 0, 'Unreviewed seasonal rates are not presented as today advice');
    await fertilizer.locator('input[type=date]').fill('2026-10-23');
    assert.match(await fertilizer.innerText(), /আর ৪ দিন পরে/);
    const spray = todayPanels.nth(2);
    await spray.getByLabel('লেবেলের হার').fill('2');
    await spray.getByLabel('একক').selectOption('g');
    await spray.getByLabel('প্রতি লিটার পানি').fill('15');
    assert.match(await spray.locator('output').innerText(), /৩০ গ্রাম/);
    await spray.getByRole('button').click();
    assert.match(await page.locator('.ledger-feedback').innerText(), /খাতায়/);
    await spray.getByLabel('লেবেলের হার').fill('-2');
    assert.equal(await spray.locator('output').count(), 0, 'Invalid spray rates do not show a result');
    assert.equal(await spray.getByRole('button').isDisabled(), true, 'Invalid spray rates cannot be saved');
    await spray.getByLabel('লেবেলের হার').fill('2');
    assert.match(await spray.locator('output').innerText(), /৩০ গ্রাম/);
    await page.locator('.farmer-tabs a[href="/farmer#tools"]').click();
    await panels.nth(2).locator('input').nth(0).fill('1');
    await panels.nth(2).getByRole('button').click();
    assert.match(await page.locator('.ledger-feedback').innerText(), /নমুনা ওজন/);
    for (let index = 0; index < 3; index++) await panels.nth(2).locator('input').nth(index + 1).fill(String(10 + index));
    await panels.nth(2).getByRole('button').click();
    const plantedDate = await page.evaluate(() => {
      const planted = new Date(); planted.setDate(planted.getDate() - 32);
      return `${planted.getFullYear()}-${String(planted.getMonth() + 1).padStart(2, '0')}-${String(planted.getDate()).padStart(2, '0')}`;
    });
    await page.locator('.farmer-more summary').click();
    await page.locator('.farmer-more a[href="/farmer#settings"]').click();
    await page.locator('.farmer-settings input[type="date"]').fill(plantedDate);
    await page.locator('.farmer-tabs a[href="/farmer"]').click();
    assert.equal(await page.locator('.today-input-guidance').count(), 0, 'Saved area and planting date do not create unreviewed daily doses');
    await page.locator('.farmer-tabs a[href="/farmer#tools"]').click();
    await page.locator('.farmer-tools-page').waitFor();
    await page.getByLabel('বিষয় খুঁজুন').fill('গাছ');
    assert.equal(await page.locator('.care-library-card').count(), 1);
    await page.locator('.farmer-tabs a[href="/farmer#diary"]').click();
    assert.equal(await page.locator('.ledger-diary-card').count(), 5);
    await page.reload();
    assert.equal(await page.locator('.ledger-diary-card').count(), 5, 'Saved ledger entries survive refresh');

    await page.goto(`${base}/selling-preparation`);
    assert.equal(await page.locator('.selling-estimate button.main-button').isDisabled(), true, 'Empty sale inputs cannot be saved');
    await page.locator('[name=saleQuantity]').fill('100');
    await page.locator('[name=salePrice]').fill('50');
    await page.locator('[name=saleFreight]').fill('500');
    assert.match(await page.locator('.sale-breakdown').innerText(), /৳৫,০০০/);
    await page.locator('.offer-comparison summary').click();
    await page.locator('[name=offer2Price]').fill('52');
    await page.locator('[name=offer2Freight]').fill('800');
    assert.match(await page.locator('.offer-compare-result').innerText(), /প্রস্তাব ১-এ হাতে বেশি/);
    await page.locator('.selling-estimate button.main-button').click();
    assert.match(await page.getByRole('status').last().innerText(), /খাতায়/);
    await page.goto(`${base}/farmer#diary`);
    assert.equal(await page.locator('.ledger-diary-card').count(), 6, 'Selling calculation joins the same notebook');
    await page.goto(`${base}/farmer#tools`);
    await page.locator('.farmer-more summary').click();
    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('heading', { name: 'Tools and learning' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No desktop horizontal overflow in English');
    await page.goto(`${base}/farmer`);
    await page.locator('.weather-chip small').waitFor();
    assert.match(await page.locator('.weather-chip small').innerText(), /Fetched .*current/);
    assert.deepEqual(pageErrors, []);
    console.log('Farmer ledger flow passed: area, expense, break-even, sample yield, fertilizer, spray, care search, save/reload, offer comparison, notebook, desktop overflow, and runtime errors.');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
