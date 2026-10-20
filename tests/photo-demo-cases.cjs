const { chromium } = require('playwright');
const fs = require('node:fs');

const url = process.env.BASE_URL || 'http://127.0.0.1:4176/auth';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const modelRequests = [];
    page.on('request', request => { if (/\.onnx(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /কৃষক হিসেবে ঢুকুন|Continue as farmer|Farmer/i }).first().click();
    await page.locator('.farmer-tabs').waitFor();
    await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
    const scanner = page.locator('.potato-scan');
    await scanner.waitFor({ timeout: 30000 });
    const cards = scanner.locator('.photo-demo-card');
    if (await cards.count() !== 5) throw new Error(`Expected 5 photo examples, found ${await cards.count()}`);
    await page.waitForTimeout(500);
    const initialStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith('alusathi-weather-')).map(key => [key, localStorage.getItem(key)]))));
    for (let index = 0; index < 5; index++) {
      await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
      const card = page.locator('.potato-scan .photo-demo-card').nth(index);
      const bounds = await card.boundingBox();
      if (!bounds || bounds.height > 180) throw new Error('Demo samples should be compact thumbnails, not large cards');
      await card.click();
      if (!/লক্ষণ মিলিয়ে দেখা হচ্ছে|Checking visible signs/.test(await page.getByRole('status').last().innerText())) throw new Error('Sample selection must show a calculating state');
      await page.locator('.today-demo-result').waitFor({ timeout: 5000 });
      const first = await page.locator('.today-demo-result').innerText();
      if (!/উদাহরণ ফল|example result/.test(first) || !/করণীয়|What to do/.test(first)) throw new Error('Today must show the fixed example result and actionable guidance');
      if (/late blight|early blight|রোগের নাম নিশ্চিত/.test(first)) throw new Error('Demo must not claim a disease diagnosis');
      await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
      await page.locator('.potato-scan .photo-demo-card').nth(index).click();
      await page.locator('.today-demo-result').waitFor({ timeout: 5000 });
      if (await page.locator('.today-demo-result').innerText() !== first) throw new Error(`Sample ${index + 1} did not return a stable Today result`);
    }
    await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
    fs.mkdirSync('test-results', { recursive: true });
    await scanner.screenshot({ path: 'test-results/photo-scanner-desktop.png' });
    const brokenImages = await cards.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).length);
    if (brokenImages) throw new Error(`${brokenImages} sample images did not load`);
    const finalStorage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith('alusathi-weather-')).map(key => [key, localStorage.getItem(key)]))));
    if (finalStorage !== initialStorage) throw new Error('Demo clicks must not change scanner or farmer records');
    if (modelRequests.length) throw new Error(`Demo clicks must not load models: ${modelRequests.join(', ')}`);
    await page.getByRole('button', { name: /Enable scanner|স্ক্যানার চালু করুন/ }).click();
    await scanner.locator('input[type=file]').waitFor();
    console.log('Photo demo gallery: 5 assets loaded; each result stable; no model requests or storage writes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
