const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4175/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /অফলাইনে চালাতে ফাইল নামান|Download for offline use/ }).click();
    await page.getByText(/আলুর ছবি পরীক্ষার ফাইল এই ফোনে রাখা হয়েছে|Potato scanner files are saved/).waitFor({ timeout: 120000 });
    const count = await page.evaluate(async () => (await (await caches.open('ml-assets')).keys()).length);
    assert.equal(count, 4);
    await page.locator('.potato-scan details summary').click();
    assert.match(await page.locator('.potato-scan details').innerText(), /not field validated|মাঠে যাচাই হয়নি/);
    console.log('offline pack: 4 potato scanner assets cached OK');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
