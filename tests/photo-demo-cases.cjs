const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      await context.addInitScript(() => {
        localStorage.setItem('alusathi-lang', 'bn');
        sessionStorage.setItem('alusathi-demo', 'true');
        sessionStorage.setItem('alusathi-role', 'farmer');
      });
      const page = await context.newPage();
      const modelRequests = [];
      page.on('request', request => { if (/\.onnx(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
      await page.goto(`${base}/farmer#photos`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const scanner = page.locator('.potato-scan');
      await scanner.waitFor();
      assert.equal(await scanner.locator('.photo-demo-card').count(), 5, 'Five fixed demo photos are available');
      assert.equal(await scanner.getByText('অফলাইনে চালাতে ফাইল নামান', { exact: false }).count(), 0, 'Offline download prompt is removed');
      assert.equal(await scanner.getByRole('button', { name: 'ছবি পরীক্ষা করুন', exact: true }).isDisabled(), true, 'Photo check is directly available');
      assert.equal(modelRequests.length, 0, 'Models do not load before the farmer selects a photo');
      await scanner.locator('.photo-demo-card').nth(2).click();
      await page.locator('.farmer-today').waitFor();
      assert.equal(await page.locator('.today-demo-result').count(), 1, 'Today shows the full photo result card');
      assert.match(await page.locator('.today-demo-result').innerText(), /ছবি ৩ · নির্ধারিত ফল/);
      assert.match(await page.locator('.today-advice-card').innerText(), /দাগগুলো আরও স্পষ্ট/);
      assert.match(await page.locator('.today-field-tools .ledger-panel').nth(2).innerText(), /২ গ্রাম \/ ১ লিটার পানি/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      await page.goto(`${base}/farmer#photos`, { waitUntil: 'domcontentloaded' });
      await scanner.waitFor();
      await scanner.locator('input[type=file]').setInputFiles({
        name: 'camera-potato.webp',
        mimeType: 'image/webp',
        buffer: fs.readFileSync(path.join(__dirname, '..', 'public', 'demo-potatoes', 'sample-3.webp')),
      });
      await scanner.getByRole('button', { name: 'ছবি পরীক্ষা করুন', exact: true }).click();
      await page.locator('.farmer-today').waitFor({ timeout: 15000 });
      assert.match(await page.locator('.today-demo-result').innerText(), /ছবি ১ · নির্ধারিত ফল/, 'Any accepted upload uses the preset result');
      await context.close();
    }
    console.log('Photo page: five demo photos, fixed Today results, and no offline-download prompt on mobile and desktop.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
