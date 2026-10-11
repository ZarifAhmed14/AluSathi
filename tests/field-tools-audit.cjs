const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const results = [];
const note = (check, evidence) => { results.push({ check, evidence }); console.log(check, evidence); };
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('alusathi-lang', 'en'));
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4175', { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    const tools = page.locator('#tools');
    await tools.getByLabel('Land area', { exact: true }).fill('10');
    note('area-ten-decimals', await tools.locator('output').first().innerText());
    await tools.getByText('Calculate from the product label', { exact: true }).click();
    await tools.getByLabel('Label amount', { exact: true }).fill('5');
    note('dosage-before-confirm', await tools.locator('output').count());
    await tools.getByLabel('I checked the label rate and units').check();
    note('dosage-after-confirm', await tools.locator('output').last().innerText());
    await tools.getByLabel('Land area', { exact: true }).fill('-10');
    note('negative-area-outputs', await tools.locator('output').count());
    await tools.getByLabel('Land area', { exact: true }).fill('10');
    await tools.getByText('Yield estimate', { exact: true }).click();
    await tools.getByLabel('Area of each sample plot (m²)').fill('10');
    for (let i = 1; i <= 3; i++) await tools.getByLabel(`Sample ${i} (kg)`).fill(String(i * 2));
    await tools.getByRole('button', { name: 'Calculate estimate' }).click();
    note('sample-yield', await tools.locator('output').last().innerText());
    await tools.getByText('Treatment reminder', { exact: true }).click();
    await tools.getByLabel('What task?').fill('Inspect crop');
    await tools.getByLabel('When?').fill('2027-01-01T09:00');
    const downloading = page.waitForEvent('download');
    await tools.getByRole('button', { name: 'Add to phone calendar', exact: true }).click();
    const download = await downloading;
    note('guest-calendar-reminder', download.suggestedFilename());
    await context.setOffline(true);
    await page.locator('#scan input[type=file]').setInputFiles(path.resolve('.ml-data/plantvillage/raw/color/Potato___Early_blight/001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG'));
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Check this photo', exact: true }).click();
      await page.locator(i === 2 ? '.field-summary' : '.photo-accepted').waitFor({ timeout: 90000 });
      if (i < 2) {
        await page.getByRole('button', { name: 'Take next photo', exact: true }).click();
        await page.locator('#scan input[type=file]').setInputFiles(path.resolve('.ml-data/plantvillage/raw/color/Potato___Early_blight/001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG'));
      }
    }
    note('true-offline-leaf-scan', await page.locator('.field-summary').innerText());
    await page.locator('.severity-tool summary').click();
    const svg = page.locator('.severity-canvas');
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    async function draw(points) {
      await page.mouse.move(box.x + box.width * points[0][0], box.y + box.height * points[0][1]);
      await page.mouse.down();
      for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 8 });
      await page.mouse.up();
    }
    await draw([[.1,.1],[.9,.1],[.9,.9],[.1,.9],[.1,.1]]);
    await draw([[.1,.1],[.5,.1],[.5,.9],[.1,.9],[.1,.1]]);
    note('manual-severity-half', await page.locator('.scan-insights .tool-result').innerText());
    note('disease-weather-visible', await page.locator('.spread-outlook').innerText());
    await page.getByRole('button', { name: 'Clear and redraw' }).click();
    note('severity-reset', { resultCount: await page.locator('.scan-insights .tool-result').count(), spreadCount: await page.locator('.spread-outlook').count() });
  } finally {
    fs.writeFileSync('test-results/october-audit/field-tools.json', JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
