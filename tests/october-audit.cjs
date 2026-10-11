const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const BASE = 'http://127.0.0.1:4175';
const LEAF = path.resolve('.ml-data/plantvillage/raw/color/Potato___Early_blight/001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG');
const results = [];
const note = (check, evidence) => { results.push({ check, evidence }); console.log(check + ': ' + JSON.stringify(evidence)); };

(async () => {
  fs.mkdirSync('test-results/october-audit', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(BASE, { waitUntil: 'networkidle' });
      note('home-' + width, await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, text: document.querySelector('h1')?.innerText, height: document.documentElement.scrollHeight })));
      await page.getByRole('button', { name: 'Change language' }).click();
      await page.locator('#scan').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/october-audit/scan-${width}.png` });
      if (width === 390) {
        await page.locator('a[href="/auth"]').first().click();
        await page.locator('#cold-storage').waitFor();
        await page.locator('.reminder-tool > summary').click();
        note('demo-login-reminders', await page.locator('.reminder-tool').innerText());
        await page.locator('#tools > .farmer-tools-grid > details').nth(1).locator('summary').first().click();
        note('demo-login-yield', await page.locator('#tools').innerText());
        const storage = page.locator('#cold-storage');
        await storage.locator('summary').first().click();
        await storage.getByLabel('Total potatoes (kg)').fill('1000');
        const quote = storage.locator('fieldset').first();
        for (const [label, value] of [['Rate per kg (BDT)', '5'], ['Total outward + return transport (BDT)', '2000'], ['Total handling + bags (BDT)', '500'], ['Other charges including taxes (BDT)', '0']]) await quote.getByLabel(label).fill(value);
        note('storage-calculation', await quote.locator('output').innerText());
        await quote.getByLabel('Rate per kg (BDT)').fill('-1');
        note('storage-negative-rejected', await quote.locator('output').count() === 0);
        const sources = await page.locator('.source-links a').evaluateAll(nodes => nodes.map(a => ({ text: a.textContent, url: a.href })));
        note('external-sources', sources);
        await page.locator('#scan input[type=file]').setInputFiles(LEAF);
        for (let i = 0; i < 3; i++) {
          const started = Date.now();
          await page.getByRole('button', { name: 'Check this photo', exact: true }).click();
          await page.locator(i === 2 ? '.field-summary' : '.photo-accepted').waitFor({ timeout: 90000 });
          note('actual-leaf-inference-' + (i + 1), { ms: Date.now() - started, text: await page.locator('.result-stage').innerText() });
          if (i < 2) {
            await page.getByRole('button', { name: 'Take next photo', exact: true }).click();
            await page.locator('#scan input[type=file]').setInputFiles(LEAF);
          }
        }
        await page.locator('.field-summary').screenshot({ path: 'test-results/october-audit/actual-leaf-result.png' });
        const reportDownload = page.waitForEvent('download');
        await page.locator('.report-actions').getByRole('button', { name: 'Download', exact: true }).click();
        const download = await reportDownload;
        note('report-download', download.suggestedFilename());
        await page.emulateMedia({ media: 'print' });
        note('print-report', await page.locator('#farmer-report').isVisible());
        await page.emulateMedia({ media: 'screen' });
        await page.locator('#tuber summary').click();
        await page.locator('#tuber input[type=file]').setInputFiles(path.resolve('public/pwa-192x192.png'));
        await page.locator('#tuber [role=status]').waitFor({ timeout: 90000 });
        note('unrelated-image-tuber', await page.locator('#tuber [role=status]').innerText());
        await page.getByRole('button', { name: 'Logout', exact: true }).click();
        note('logout-hides-history', await page.locator('#diary').count() === 0);
      }
      note('browser-errors-' + width, errors);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    note('pwa-controller', await page.evaluate(() => Boolean(navigator.serviceWorker.controller)));
    await page.goto(BASE + '/marketplace/', { waitUntil: 'networkidle' });
    note('marketplace-after-pwa', { url: page.url(), gateway: await page.locator('.portal-card').count(), text: (await page.locator('body').innerText()).slice(0, 400) });
    await page.screenshot({ path: 'test-results/october-audit/marketplace-after-pwa.png' });
    await context.setOffline(true);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    note('offline-home', await page.locator('#scan').count());
    await context.close();
  } finally {
    await browser.close();
    fs.writeFileSync('test-results/october-audit/results.json', JSON.stringify(results, null, 2));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
