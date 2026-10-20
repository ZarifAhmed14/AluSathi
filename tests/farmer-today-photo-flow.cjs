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
    await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { temperature_2m: 24, relative_humidity_2m: 75, precipitation: 0, weather_code: 3 }, daily: { time: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [], wind_gusts_10m_max: [], weather_code: [] }, hourly: { time: [], temperature_2m: [], relative_humidity_2m: [] } } }));
    const page = await context.newPage();
    await page.goto(`${base}/farmer`);
    await page.screenshot({ path: 'test-results/farmer-today-initial.png' });
    await page.locator('.today-photo-action button').click();
    await page.locator('.potato-scan').waitFor();
    assert.match(page.url(), /#photos$/, 'Today opens the photo scanner');
    await page.screenshot({ path: 'test-results/farmer-today-expanded.png' });
    assert.equal(await page.locator('.potato-scan .scan-workspace').isVisible(), true, 'Upload box is shown before the sample gallery');
    assert.equal(await page.locator('.potato-scan .photo-demo-card').count(), 5, 'Five compact demo samples are available below upload');
    assert.ok((await page.locator('.potato-scan .photo-demo-card').first().boundingBox()).height < 180, 'Demo thumbnails stay compact');
    assert.equal(await page.locator('.today-photo-action .main-button').count(), 1, 'One primary photo action');
    await page.locator('.potato-scan .photo-demo-card').nth(2).click();
    await page.locator('.photo-demo-calculating').waitFor();
    await page.locator('.today-demo-result').waitFor({ timeout: 5000 });
    assert.match(await page.locator('.today-demo-result').innerText(), /দাগগুলো আরও স্পষ্ট/);
    assert.match(await page.locator('.today-demo-result').innerText(), /নরম, ভেজা বা গভীর/);
    assert.doesNotMatch(await page.locator('.today-demo-result').innerText(), /রোগের নাম নিশ্চিত|healthy|late blight|early blight/i, 'No disease claim from the photo');
    assert.equal(await page.locator('.farmer-tabs a[href="/farmer"]').getAttribute('aria-current'), 'page', 'Sample result returns to Today');
    assert.equal(await page.locator('.today-field-tools').isVisible(), true, 'Field inputs and care tools live on Today');
    await page.locator('.today-field-tools .ledger-panel').first().getByLabel('জমির পরিমাণ').fill('1');
    await page.locator('.today-field-tools .ledger-panel').first().getByLabel('একক').selectOption('acre');
    assert.match(await page.locator('.today-field-tools .ledger-panel').first().locator('output').innerText(), /৪,০৪৬|৪০৪৬/);
    await page.locator('.today-fertilizer-calendar input[type=date]').fill('2026-10-23');
    assert.match(await page.locator('.today-fertilizer-calendar').innerText(), /আর ৪ দিন পরে/);
    assert.match(await page.locator('.today-spray-caution').innerText(), /শুধু আবহাওয়া বা ছবি দেখে স্প্রে দেবেন না/);
    assert.equal(await page.locator('.farmer-tools-page .ledger-panel').filter({ hasText: 'জমির মাপ' }).count(), 0, 'Field size moved out of হিসাব');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No desktop horizontal overflow');
    await page.screenshot({ path: 'test-results/farmer-today-photo-inline.png', fullPage: true });
    console.log('Today photo-to-action flow passed: compact examples, calculating state, stable Today details, field area, fertilizer reminder and cautious spray guidance.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
