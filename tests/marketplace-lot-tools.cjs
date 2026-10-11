const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const { offerSummary, passportDocument } = await import('../public/marketplace/lot-tools.mjs');
  const { initialData } = await import('../public/marketplace/market.mjs');
  const sample = initialData();
  assert.match(offerSummary(sample.offers[0], 500, 'en'), /11,000 taka/);
  assert.match(offerSummary(sample.offers[1], 500, 'en'), /accept 475 kg and reject 25 kg/);
  assert.match(offerSummary(sample.offers[1], 500, 'en'), /2,825 taka/);
  assert.match(offerSummary(sample.offers[0], 500, 'bn'), /১১,০০০ টাকা/);
  const hostile = { ...sample.listings[0], variety: '<script>alert(1)</script>', notes: '<img src=x onerror=alert(1)>', photos: [{ src: 'javascript:alert(1)' }] };
  const document = passportDocument(hostile, [{ ...sample.offers[0], buyer: '<svg onload=alert(1)>', terms: '<script>bad()</script>', sample: false }]);
  assert(!document.includes('<script>'));
  assert(!document.includes('src="javascript:'));
  assert(document.includes('&lt;script&gt;'));
  assert(document.includes('Content-Security-Policy'));
  assert(!passportDocument(sample.listings[0], []).includes('<img'));
  assert(!passportDocument({ ...sample.listings[0], photos: [null, { src: '<svg>' }] }, []).includes('<img'));

  const browser = await chromium.launch({ headless: true });
  await fs.mkdir('test-results/lot-tools', { recursive: true });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
      await context.addInitScript(() => {
        localStorage.setItem('alusathi-lang', 'en');
        window.__spoken = [];
        window.__voices = [{ lang: 'en-US', name: 'Test English' }, { lang: 'bn-BD', name: 'Test Bangla' }];
        window.__cancelled = 0;
        window.SpeechSynthesisUtterance = class {
          constructor(text) { this.text = text; }
        };
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
          getVoices: () => window.__voices,
          speak: utterance => window.__spoken.push({ text: utterance.text, lang: utterance.lang }),
          cancel: () => window.__cancelled++,
        } });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/marketplace/farmer.html`);
      await page.locator('[data-action=view-passport]').first().click();
      await page.locator('.lot-passport').waitFor();
      assert.match(await page.locator('.passport-source').innerText(), /NOT VERIFIED/);
      assert.equal(await page.locator('.passport-photos img').count(), 0);
      assert.match(await page.locator('.passport-caution').innerText(), /not been independently checked/);
      await page.locator('[data-view=home]').first().click();
      await page.locator('[data-action=select-lot]').first().click();
      await page.locator('[data-action=review-offer][data-id=sample-local]').click();
      const form = page.locator('#deal-form');
      await form.locator('[name=quantityKg]').fill('500');
      assert.match(await form.locator('.summary-text').innerText(), /11,000 taka/);
      assert.match(await form.locator('.deal-summary').innerText(), /৳11,000/);
      await form.locator('[name=quantityKg]').fill('0');
      assert.equal(await form.evaluate(element => element.checkValidity()), false);
      await page.locator('.modal-close').click();
      await page.locator('[data-action=language]').click();
      const firstSummary = page.locator('.spoken-summary').first();
      await page.locator('.offer-details').first().locator('summary').first().click();
      await firstSummary.locator('summary').click();
      assert.match(await firstSummary.innerText(), /টাকা/);
      await page.locator('[data-action=language]').click();
      await page.locator('[data-view=list]:visible').first().click();
      await page.locator('[name=upazila]').fill('Pirganj');
      await page.locator('[name=variety]').selectOption('Diamant');
      await page.locator('#lot-form [name=quantityKg]').fill('750');
      await page.locator('[name=notes]').fill('Mostly medium. Farmer description, not a certified grade.');
      const jpeg = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ac7c39'; ctx.fillRect(0,0,32,32); return canvas.toDataURL('image/jpeg'); });
      const upload = { name: 'potato.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg.split(',')[1], 'base64') };
      await page.locator('[name=photo]').setInputFiles([upload, { ...upload, name: 'potato-2.jpg' }]);
      await page.locator('#lot-form button[type=submit]').click();
      await page.locator('.offer-header').waitFor();
      await page.reload();
      await page.locator('[data-action=view-passport]').first().click();
      assert.equal(await page.locator('.passport-photos img').count(), 2);
      assert.match(await page.locator('.passport-source').innerText(), /NOT VERIFIED/);
      assert.match(await page.locator('.passport-photos figcaption').first().innerText(), /Photo date: Not recorded/);
      assert.match(await page.locator('.passport-photos figcaption').first().innerText(), /Added:/);
      assert.match(await page.locator('.lot-passport').innerText(), /750 kg/);
      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-action=download-passport]').click();
      const download = await downloadPromise;
      const content = await fs.readFile(await download.path(), 'utf8');
      assert.match(content, /data:image\/jpeg;base64/);
      assert.match(content, /Not a disease|not a disease/);
      assert(!content.includes('<script'));
      await page.evaluate(() => {
        window.__shared = [];
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async value => window.__shared.push({ title: value.title, count: value.files?.length || 0, type: value.files?.[0]?.type, text: value.text }) });
      });
      await page.locator('[data-action=share-passport]').click();
      assert.deepEqual(await page.evaluate(() => ({ count: window.__shared.at(-1).count, type: window.__shared.at(-1).type })), { count: 1, type: 'text/html' });
      await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); });
      await page.locator('[data-action=share-passport]').click();
      assert.match(await page.evaluate(() => window.__shared.at(-1).text), /does not include photos/);
      await page.locator('[data-action=print-passport]').click();
      await page.waitForFunction(() => document.querySelector('.passport-print-frame')?.contentDocument?.querySelector('.lot-passport'));
      assert.match(await page.locator('.passport-print-frame').getAttribute('srcdoc'), /Content-Security-Policy/);
      await page.waitForFunction(() => !document.querySelector('.passport-print-frame'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/lot-tools/passport-${width}.png`, fullPage: true });
      await page.goto(`${base}/marketplace/buyer.html`);
      await page.locator('[data-action=view-passport]').first().click();
      assert.equal(await page.locator('.passport-photos img').count(), 2);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Lot tools passed: EN/BN summaries, partial quantity, farmer/buyer passport, photos, persistence, safe download and 320/390/1440px layouts. Native share sheet needs physical-device testing.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
