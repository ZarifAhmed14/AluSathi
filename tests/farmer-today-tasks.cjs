const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4176';
const weather = {
  current: { temperature_2m: 23, relative_humidity_2m: 95, precipitation: 2, weather_code: 61 },
  daily: { time: ['2026-10-17', '2026-10-18', '2026-10-19'], temperature_2m_max: [25, 25, 25], temperature_2m_min: [18, 18, 18], precipitation_sum: [4, 2, 0], wind_gusts_10m_max: [20, 20, 20], weather_code: [61, 61, 3] },
  hourly: { time: ['2026-10-17', '2026-10-18', '2026-10-19'].flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`)), temperature_2m: Array(72).fill(18), relative_humidity_2m: Array(72).fill(95) },
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 667 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      await context.addInitScript(() => {
        localStorage.setItem('alusathi-lang', 'bn');
        localStorage.setItem('alusathi-planting-age', '30to60');
        localStorage.setItem('alusathi-planting-age-recorded', '2026-10-17');
        localStorage.setItem('alusathi-field-diary-v1', JSON.stringify([{ id: 'check-1', createdAt: new Date().toISOString(), mode: 'quick', risk: 'uncertain', label: 'unknown', district: 'Rangpur', scanCount: 1, affectedCount: 0, triage: true, thumbnails: ['data:image/jpeg;base64,/9j/2Q=='] }]));
        sessionStorage.setItem('alusathi-demo', 'true');
        sessionStorage.setItem('alusathi-role', 'farmer');
      });
      await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: weather }));
      const page = await context.newPage();
      await page.goto(`${base}/farmer`, { waitUntil: 'domcontentloaded' });
      await page.locator('.field-risk-banner').waitFor();

      assert.equal(await page.locator('.weather-chip select').count(), 0, 'District is not in the weather chip');
      assert.ok(await page.locator('.today-task').count() <= 3, 'At most three tasks');
      assert.equal(await page.locator('.humidity-chart i').count(), 3, 'Alert explains humidity hours');
      assert.match(await page.locator('.last-checkin-strip').innerText(), /শেষ ছবি আজ/);
      assert.equal(await page.locator('.last-checkin-strip img').count(), 1, 'Last check-in thumbnail is shown');

      await page.locator('.today-more-tasks > summary').click();
      await page.locator('.today-task input').first().check();
      const taskActions = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-field-actions-v1') || '[]'));
      assert.equal(taskActions[0].kind, 'task', 'Ticking a task saves a dated action');

      await page.getByRole('button', { name: 'দেখেছি, সমস্যা নেই' }).click();
      assert.equal(await page.locator('.field-risk-banner').count(), 0, 'Acknowledged alert is hidden');
      const allActions = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-field-actions-v1') || '[]'));
      assert.ok(allActions.some(action => action.kind === 'observation'), 'Alert acknowledgement is logged');

      await page.locator(viewport.width > 760 ? '.farmer-tabs a[href="/farmer#diary"]' : '.farmer-bottom-tabs a[href="/farmer#diary"]').click();
      await page.locator('#diary').waitFor();
      assert.equal(await page.locator('.diary-card').count(), 3, 'Saved photo, completed task and observation share one timeline');
      assert.match(await page.locator('#diary').innerText(), /ছবি, কাজ ও জমির নোট/);
      assert.equal(await page.locator('.diary-action-card').count(), 2, 'Both existing local action types are visible in the record');

      if (viewport.width > 760) {
        await page.locator('.farmer-more summary').click();
        await page.getByRole('link', { name: 'জেলা ও চাষের সময়' }).click();
        await page.locator('.farmer-settings select').waitFor();
      }
      await page.goto(`${base}/farmer`, { waitUntil: 'domcontentloaded' });
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await page.getByText('অফলাইনে আছেন — ছবি ফোনে সেভ হবে').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'No horizontal overflow');
      await page.screenshot({ path: `test-results/farmer-today-${viewport.width}.png`, fullPage: true });
      await context.close();
    }
    console.log('Farmer today tasks, alert, settings, offline state and responsive layout passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
