const { chromium } = require('../../node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(() => localStorage.setItem('alusathi-lang', 'en'));
      await context.route('**/api/auth/session', r => r.fulfill({ json: {} }));
      await context.route('**/api/health', r => r.fulfill({ json: { status: 'ready', field_validated: false } }));
      await context.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ json: { results: [{ latitude: 25, longitude: 89 }] } }));
      await context.route('https://api.open-meteo.com/**', r => r.fulfill({ json: {
        current: { temperature_2m: 22, relative_humidity_2m: 70, precipitation: 0, weather_code: 1 },
        daily: { time: ['2026-09-05'] }
      } }));
      let scans = 0;
      await context.route('**/api/disease/predict', r => {
        scans++;
        return r.fulfill({ json: {
          label: 'unknown', labels: { en: 'Uncertain result', bn: 'অনিশ্চিত ফলাফল' }, confidence: 0.7,
          quality_warning: false, quality: { brightness: 100, contrast: 40, issues: [] },
          rejection_reasons: ['field_validation_pending'], field_validated: false,
          probabilities: { healthy: 0.7, early_blight: 0.2, late_blight: 0.1 },
          next_steps: { en: ['Check again', 'Watch plants', 'Ask an expert'], bn: [] }
        } });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      await page.locator('#scan').waitFor();
      assert.equal(await page.locator('.extreme-weather').count(), 0, 'Missing minimum temperature must not create cold alerts');
      const file = path.resolve('public/pwa-192x192.png');
      const input = page.locator('#scan input[type=file]');
      const analyze = page.getByRole('button', { name: 'Check this photo', exact: true });
      for (let i = 0; i < 3; i++) {
        await input.setInputFiles(file);
        await analyze.click();
        await page.locator(i === 2 ? '.field-summary' : '.photo-accepted').waitFor();
        assert.equal(await analyze.isDisabled(), true, 'Accepted photos cannot be counted twice');
        assert.equal(await input.isDisabled(), true, 'Accepted photo cannot be replaced without advancing');
        if (i < 2) await page.getByRole('button', { name: 'Take next photo' }).click();
      }
      assert.equal(scans, 3);
      assert.equal(await page.locator('#diary').count(), 0);
      await page.getByRole('button', { name: 'New scan', exact: true }).click();
      assert.equal(await input.isDisabled(), false);
      assert.equal(await page.locator('.field-path .done').count(), 0);
      await context.route('**/api/disease/predict', r => r.fulfill({ json: {
        label: 'healthy', labels: { en: 'Healthy', bn: 'ভালো' }, confidence: 0.95,
        quality_warning: false, quality: { brightness: 100, contrast: 40, issues: [] },
        rejection_reasons: [], field_validated: false,
        probabilities: { healthy: 0.95, early_blight: 0.03, late_blight: 0.02 },
        next_steps: { en: [], bn: [] }
      } }));
      await input.setInputFiles(file);
      await analyze.click();
      await page.locator('.field-summary').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Take next photo' }).count(), 0, 'Clear first photo completes immediately');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `test-results/review-${width}.png`, fullPage: true });
      await context.close();
      console.log(`Review regression checks passed at ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
