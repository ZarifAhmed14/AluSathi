const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const modelRequests = [];
  page.on('request', request => {
    if (/potato_mobilenet_v3\.onnx|\/api\/disease\/predict/.test(request.url())) modelRequests.push(request.url());
  });
  try {
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4175/', { waitUntil: 'networkidle' });
    await page.locator('.leaf-check-details summary').click();
    for (const [shade, expected] of [['#0b0b0b', /আলো কম|too dark/], ['#d0d0d0', /ঝাপসা|blurry/]]) {
      const data = await page.evaluate(color => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256; const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 256, 256); return canvas.toDataURL('image/png').split(',')[1]; }, shade);
      await page.locator('#leaf-scan input[type=file]').setInputFiles({ name: 'unusable.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
      await page.locator('#leaf-scan').getByRole('button', { name: /ছবি যোগ করুন|Add photo/ }).click();
      assert.match(await page.locator('#leaf-scan [role=alert]').innerText(), expected);
      assert.equal(await page.locator('.symptom-check').count(), 0);
    }
    await page.locator('#leaf-scan').getByRole('button', { name: /এই ছবিই ব্যবহার করুন|Use anyway/ }).click();
    await page.locator('.symptom-check').waitFor();
    await page.locator('.field-summary').getByRole('button', { name: /New scan|নতুন ছবি/ }).click();
    const blurred = await page.evaluate(async () => {
      const source = await createImageBitmap(await fetch('/life-cycle/growth-foliage.png').then(response => response.blob()));
      const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
      const context = canvas.getContext('2d'); context.fillStyle = '#eee9dd'; context.fillRect(0, 0, canvas.width, canvas.height); context.filter = 'blur(12px)'; context.drawImage(source, 0, 0); source.close();
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.locator('#leaf-scan input[type=file]').setInputFiles({ name: 'blurred.png', mimeType: 'image/png', buffer: Buffer.from(blurred, 'base64') });
    await page.locator('#leaf-scan').getByRole('button', { name: /ছবি যোগ করুন|Add photo/ }).click();
    assert.match(await page.locator('#leaf-scan [role=alert]').innerText(), /ঝাপসা|blurry/);
    await page.locator('#leaf-scan').getByRole('button', { name: /এই ছবিই ব্যবহার করুন|Use anyway/ }).click();
    await page.locator('.symptom-check').waitFor();
    await page.locator('.field-summary').getByRole('button', { name: /New scan|নতুন ছবি/ }).click();
    await page.locator('#leaf-scan input[type=file]').setInputFiles(path.resolve('public/life-cycle/growth-foliage.png'));
    await page.locator('#leaf-scan').getByRole('button', { name: /ছবি যোগ করুন|Add photo/ }).click();
    await page.locator('.symptom-check').waitFor();
    await page.locator('.report-context input').nth(0).fill('Pirganj');
    await page.locator('.report-context input').nth(1).fill('Diamant');
    await page.locator('.report-context input').nth(2).fill('01712345678');
    assert.match(await page.locator('#farmer-report').innerText(), /Pirganj[\s\S]*Diamant[\s\S]*01712345678/);
    assert.doesNotMatch(await page.locator('#farmer-report').innerText(), /পাতার লক্ষণ লিখে নিন/);
    assert.equal(await page.locator('.symptom-check fieldset').count(), 4);
    await page.locator('.symptom-check fieldset').first().locator('input[value=irregular]').check();
    await page.locator('.symptom-check fieldset').nth(1).locator('input[value=yes]').check();
    await page.locator('.symptom-check fieldset').last().locator('input[value=unsure]').check();
    assert.match(await page.locator('#farmer-report').innerText(), /এলোমেলো কিনারা/);
    assert.equal(modelRequests.length, 0, 'Leaf flow must not load the locked model');
    await page.getByRole('button', { name: /Change language|ভাষা বদলান/ }).click();
    assert.equal(await page.locator('.symptom-check fieldset').first().locator('input[value=irregular]').isChecked(), true);
    assert.match(await page.locator('#farmer-report').innerText(), /Irregular edges/);
    assert.equal(await page.locator('.spread-outlook').count(), 1);
    fs.mkdirSync('test-results', { recursive: true });
    await page.locator('.symptom-check').screenshot({ path: 'test-results/leaf-triage-mobile.png' });
    await page.locator('.field-summary').getByRole('button', { name: /New scan|নতুন ছবি/ }).click();
    await context.setOffline(true);
    await page.locator('#leaf-scan input[type=file]').setInputFiles(path.resolve('public/life-cycle/growth-foliage.png'));
    await page.locator('#leaf-scan').getByRole('button', { name: /ছবি যোগ করুন|Add photo/ }).click();
    await page.locator('.symptom-check').waitFor();
    assert.equal(modelRequests.length, 0);
    console.log('leaf triage: photo, four questions, language, weather, no locked inference OK');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
