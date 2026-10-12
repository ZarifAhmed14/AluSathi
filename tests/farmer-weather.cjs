const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer'); localStorage.setItem('alusathi-lang', 'en'); });
    await context.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({ json: { results: [{ latitude: 25.7, longitude: 89.3 }] } }));
    const forecastUrls = [];
    await context.route('https://api.open-meteo.com/**', route => { forecastUrls.push(route.request().url()); return route.fulfill({ json: {
      current: { temperature_2m: 20, relative_humidity_2m: 87, precipitation: 0, weather_code: 3 },
      daily: { time: ['2026-10-08', '2026-10-09', '2026-10-10'], temperature_2m_min: [17, 18, 18], temperature_2m_max: [25, 26, 27], precipitation_sum: [0, 12, 5], wind_gusts_10m_max: [8, 15, 12], weather_code: [3, 61, 3] },
      hourly: { time: ['2026-10-08', '2026-10-09'].flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`)), temperature_2m: Array(48).fill(18), relative_humidity_2m: Array(48).fill(95) },
    } }); });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/farmer`);
    const planted = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 20); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    await page.locator('.planting-edit summary').click(); await page.locator('.planting-edit input').fill(planted);
    await page.locator('.field-risk-banner').waitFor();
    await page.locator('.weather-chip > summary').click();
    await page.locator('.weather-chip-body').getByText('Weather favours late blight. Check lower leaves and nearby plants.').waitFor();
    await page.locator('.weather-chip-body select').selectOption('Kurigram');
    await page.waitForFunction(() => localStorage.getItem('alusathi-district') === 'Kurigram');
    assert.ok(forecastUrls.some(url => url.includes('latitude=25.81') && url.includes('longitude=89.64')), 'Weather uses the shared Kurigram district coordinates');
    await page.locator('.planting-edit summary').click();
    await page.screenshot({ path: 'test-results/farmer-hero-mobile.png' });
    assert.match(await page.locator('.farmer-stage').innerText(), /fertilizer/);
    await page.locator('.farmer-forecast summary').click();
    assert.equal(await page.locator('.farmer-forecast p').filter({ hasText: /°/ }).count(), 3);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Farmer crop timing and compact 3-day weather passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
