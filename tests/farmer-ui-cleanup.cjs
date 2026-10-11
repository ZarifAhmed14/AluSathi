const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch();
  await fs.mkdir('test-results/ui-cleanup', { recursive: true });
  try {
    for (const [width, lang] of [[1440, 'bn'], [390, 'bn'], [390, 'en']]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(lang => {
        localStorage.setItem('alusathi-lang', lang);
        localStorage.setItem('alusathi-marketplace-language', lang);
        sessionStorage.setItem('alusathi-market-demo-farmer', 'Demo farmer');
        window.SpeechRecognition = class {
          start() { this.onresult({ results: [Object.assign([{ transcript: 'Medium potatoes' }], { isFinal: true })] }); this.onend(); }
          abort() { this.onend(); }
        };
      }, lang);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ json: { results: [{ latitude: 25.7, longitude: 89.2 }] } }));
      await page.route('https://api.open-meteo.com/**', r => r.fulfill({ json: {
        current: { temperature_2m: 29, relative_humidity_2m: 75, precipitation: 1.2, weather_code: 61 },
        daily: { time: ['2026-10-06'], temperature_2m_max: [31], temperature_2m_min: [22], precipitation_sum: [12], wind_gusts_10m_max: [20], weather_code: [61] }, hourly: { time: [] }
      } }));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('#scan input[type=file]').waitFor({ state: 'attached' });
      assert.match(await page.locator('h1').innerText(), lang === 'bn' ? /বাংলাদেশের আলুচাষির/ : /Bangladesh/);
      assert.equal(await page.locator('#scan .result-stage').count(), 0);
      assert.equal(await page.locator('.trust-grid, .help-grid, .listen-button').count(), 0);
      assert.equal(await page.locator('.leaf-check-details').getAttribute('open'), null);
      await page.locator('.weather-top strong').filter({ hasText: '29°' }).waitFor();
      const firstTip = await page.locator('.care-slide h3').innerText();
      await page.locator('.care-controls > button').last().click();
      assert.notEqual(await page.locator('.care-slide h3').innerText(), firstTip);
      await page.locator('.care-controls > button').first().click();
      assert.equal(await page.locator('.care-slide h3').innerText(), firstTip);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `test-results/ui-cleanup/home-${width}-${lang}.png`, fullPage: true });
      const image = await page.screenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } });
      await page.locator('#scan input[type=file]').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: image });
      await page.locator('#scan .result-stage').waitFor();
      assert.ok(await page.locator('#scan .main-button').isEnabled());
      assert.equal(await page.locator('#scan .camera-stage img').count(), 1);
      await page.goto(base + '/marketplace/farmer.html', { waitUntil: 'domcontentloaded' });
      await page.locator('[data-view=list]:visible').first().click();
      await page.locator('#lot-form').waitFor();
      assert.equal(await page.locator('[name=purpose], .side-note, .passport-fields').count(), 0);
      assert.equal(await page.locator('select[name=variety] option:not([value=""])').count(), 6);
      await page.locator('select[name=variety]').selectOption('Granola');
      await page.locator('[data-action=dictate-notes]').click();
      assert.equal(await page.locator('[name=notes]').inputValue(), 'Medium potatoes');
      assert.equal(await page.locator('[data-action=dictate-notes]').getAttribute('aria-pressed'), 'false');
      await page.locator('[data-action=language]').click();
      assert.equal(await page.locator('[name=notes]').inputValue(), 'Medium potatoes');
      assert.equal(await page.locator('[name=variety]').inputValue(), 'Granola');
      const bounds = await page.locator('.lot-form-centered').boundingBox();
      assert.ok(Math.abs(bounds.x + bounds.width / 2 - width / 2) < 2, 'Form stays centered');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `test-results/ui-cleanup/form-${width}-${lang}.png`, fullPage: true });
      await page.locator('#lot-form [type=submit]').click();
      await page.locator('#lot-form').waitFor({ state: 'detached' });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-marketplace-pilot-v1')).listings[0]);
      assert.equal(saved.variety, 'Granola');
      assert.equal(saved.notes, 'Medium potatoes');
      assert.equal(saved.purpose, 'unknown');
      await page.locator('[data-view=list]:visible').first().click();
      await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
      await page.locator('[data-action=dictate-notes]').click();
      assert.ok((await page.locator('.notes-status').innerText()).length > 0);
      assert.equal(await page.locator('[name=notes]').evaluate(el => el === document.activeElement), true);
      await page.locator('[name=notes]').fill('Manual fallback');
      await page.evaluate(() => {
        window.SpeechRecognition = class {
          start() { this.onerror({ error: 'not-allowed' }); this.onend(); }
          abort() { this.onend(); }
        };
      });
      await page.locator('[data-action=dictate-notes]').click();
      assert.equal(await page.locator('[name=notes]').inputValue(), 'Manual fallback');
      assert.equal(await page.locator('[data-action=dictate-notes]').getAttribute('aria-pressed'), 'false');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px ${lang}: weather, photo preview, tips, six varieties, voice transcript, language preservation, save`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
