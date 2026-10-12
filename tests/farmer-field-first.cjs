const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');

const base = process.env.BASE_URL || 'http://127.0.0.1:4175';
const weather = humid => ({
  current: { temperature_2m: 23, relative_humidity_2m: humid, precipitation: 0, weather_code: 3 },
  daily: { time: ['2026-10-10', '2026-10-11', '2026-10-12'], temperature_2m_min: [18, 18, 18], temperature_2m_max: [25, 25, 25], precipitation_sum: [0, 0, 0], wind_gusts_10m_max: [8, 8, 8], weather_code: [3, 3, 3] },
  hourly: { time: ['2026-10-10', '2026-10-11', '2026-10-12'].flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`)), temperature_2m: Array(72).fill(18), relative_humidity_2m: Array(72).fill(humid) },
});

async function lowContrast(page) {
  return page.evaluate(() => {
    const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
    const blend = (front, back) => front.slice(0, 3).map((v, i) => v * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
    const luminance = channels => channels.slice(0, 3).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const failures = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode; const text = node.textContent.trim();
      if (!text) continue;
      const element = node.parentElement; const range = document.createRange(); range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || getComputedStyle(element).visibility !== 'visible') continue;
      if (element.closest('input, option, script, style, noscript, [aria-hidden="true"]')) continue;
      let background = [247, 241, 223]; let painted = false;
      const ancestors = []; for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) ancestors.unshift(ancestor);
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        if (style.backgroundImage !== 'none') { painted = true; break; }
        const layer = rgb(style.backgroundColor);
        if (layer.length >= 4 && layer[3] === 0) continue;
        if (layer.length >= 3) background = blend(layer, background);
      }
      if (painted) continue; // CSS gradients/images cannot be sampled by computedStyle.
      const foreground = rgb(getComputedStyle(element).color);
      if (foreground.length < 3) continue;
      const a = luminance(blend(foreground, background)); const b = luminance(background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.5) failures.push({ text: text.slice(0, 55), ratio: +ratio.toFixed(2), tag: element.tagName, className: String(element.className).slice(0, 50) });
    }
    return failures;
  });
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 667 : 800 }, serviceWorkers: 'block', timezoneId: 'Asia/Dhaka' });
      await context.addInitScript(() => { localStorage.setItem('alusathi-lang', 'bn'); sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer'); });
      await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: weather(95) }));
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date('2026-10-12T02:00:00Z'));
      await page.goto(`${base}/farmer`);
      await page.locator('.weather-chip summary').getByText('২৩°').waitFor();
      assert.equal(await page.locator('.farmer-stage').count(), 0, 'No default crop stage');
      assert.equal(await page.locator('.field-risk-banner').count(), 0, 'No alert without a crop');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const positions = await page.evaluate(() => ({ field: document.querySelector('.farmer-day-card').getBoundingClientRect().top, photo: document.querySelector('.farmer-main-actions button').getBoundingClientRect().top, callBottom: document.querySelector('.farmer-main-actions a').getBoundingClientRect().bottom, weather: document.querySelector('.weather-chip').getBoundingClientRect().top }));
      assert.ok(positions.field < positions.photo && positions.photo < positions.weather);
      assert.ok(positions.callBottom < (width === 375 ? 600 : 700), `Call button below first screen: ${positions.callBottom}`);
      await page.locator('.farmer-main-actions button').focus();
      await page.keyboard.press('Tab');
      assert.ok(await page.locator('.farmer-main-actions a').evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).boxShadow !== 'none'), 'Keyboard focus follows actions and stays visible');
      assert.doesNotMatch(await page.locator('.weather-chip').innerText(), /[0-9]/, 'Weather chip uses Bangla numerals');
      assert.deepEqual(await lowContrast(page), [], 'Farmer home low-contrast text');
      await page.screenshot({ path: `test-results/field-first-${width}.png` });
      await page.locator('.planting-choices').first().getByRole('button', { name: '১–২ মাস', exact: true }).click();
      assert.match(await page.locator('.farmer-stage').innerText(), /প্রায় ১–২ মাস/);
      await page.locator('.field-risk-banner').waitFor();
      await page.locator('.farmer-main-actions button').click();
      await page.locator('#leaf-scan').waitFor();
      const photosTop = await page.locator('#leaf-scan').evaluate(el => el.getBoundingClientRect().top);
      const headerBottom = await page.locator('.farmer-header').evaluate(el => el.getBoundingClientRect().bottom);
      assert.ok(photosTop >= headerBottom, 'Photos section clears sticky header');
      assert.deepEqual(await lowContrast(page), [], 'Photo section low-contrast text');
      await page.locator(width === 375 ? '.farmer-bottom-tabs a[href="/farmer#diary"]' : '.farmer-tabs a[href="/farmer#diary"]').click();
      await page.locator('#diary').waitFor();
      assert.ok(await page.locator('.empty-diary').evaluate(el => el.getBoundingClientRect().height <= 160));
      assert.ok(await page.locator('#diary').evaluate(el => el.getBoundingClientRect().top) >= headerBottom);
      assert.deepEqual(await lowContrast(page), [], 'Diary low-contrast text');
      await page.screenshot({ path: `test-results/field-diary-${width}.png` });
      await page.locator(width === 375 ? '.farmer-bottom-tabs a[href="/farmer#photos"]' : '.farmer-tabs a[href="/farmer#photos"]').click();
      await page.locator('#leaf-scan input[type=file]').setInputFiles(path.resolve('public/alusathi-field-hero.webp'));
      await page.locator('#leaf-scan .main-button').click();
      await page.locator('.symptom-check fieldset').first().waitFor();
      assert.equal(await page.locator('.symptom-check fieldset').count(), 4);
      assert.deepEqual(await lowContrast(page), [], 'Photo questions low-contrast text');
      await page.screenshot({ path: `test-results/field-photos-${width}.png`, fullPage: true });
      await page.goto(`${base}/farmer#tools`);
      await page.locator('#tools').waitFor();
      assert.doesNotMatch(await page.locator('#tools').innerText(), /[0-9]/, 'Calculators use Bangla numerals');
      assert.deepEqual(await lowContrast(page), [], 'Calculator low-contrast text');
      await page.goto(`${base}/selling-preparation`);
      await page.locator('.selling-estimate').waitFor();
      assert.equal(await page.locator('[name=saleQuantity]').getAttribute('inputmode'), 'decimal');
      assert.equal(await page.locator('[name=salePrice]').getAttribute('inputmode'), 'decimal');
      assert.equal(await page.locator('[name=saleFreight]').getAttribute('inputmode'), 'decimal');
      const inputTops = await page.locator('.selling-inputs input').evaluateAll(elements => elements.map(el => Math.round(el.getBoundingClientRect().top)));
      if (width === 1280) assert.equal(new Set(inputTops).size, 1, 'Selling inputs align');
      assert.deepEqual(await lowContrast(page), [], 'Selling page low-contrast text');
      await page.screenshot({ path: `test-results/field-selling-${width}.png`, fullPage: true });
      await context.close();
    }
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(() => { localStorage.setItem('alusathi-lang', 'bn'); sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer'); localStorage.setItem('alusathi-planting-age', '30to60'); localStorage.setItem('alusathi-planting-age-recorded', '2026-10-12'); });
    await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: weather(50) }));
    const page = await context.newPage(); await page.goto(`${base}/farmer`);
    await page.locator('.weather-chip summary').getByText('২৩°').waitFor();
    assert.equal(await page.locator('.field-risk-banner').count(), 0, 'No alert under low weather risk');
    assert.ok(await page.locator('.farmer-stage').isVisible());
    await context.close();
    console.log('Farmer field-first layout, conditional alerts, numerals, contrast and selling inputs passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
