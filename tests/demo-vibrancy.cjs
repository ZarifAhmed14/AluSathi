const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const { catalogueListings, initialData, todayPlus } = await import('../public/marketplace/market.mjs');
  const { buyerExamples } = await import('../public/marketplace/buyer-examples.mjs');
  const lots = catalogueListings(), data = initialData();
  assert.equal(lots.length, 12);
  assert.equal(new Set(lots.map(l => l.farmerName)).size, 12);
  assert.equal(new Set(lots.map(l => l.readyDate)).size, 12);
  assert.equal(new Set(lots.map(l => l.notes)).size, 12);
  const upazilaCounts = lots.reduce((counts, lot) => (counts[lot.upazila] = (counts[lot.upazila] || 0) + 1, counts), {});
  assert(Math.max(...Object.values(upazilaCounts)) < lots.length * 0.4);
  assert(lots.every(l => l.readyDate >= todayPlus(0) && l.notesBn && l.packaging));
  assert(data.offers.every(o => lots.some(l => l.id === o.lotId && o.quantityKg <= l.quantityKg)));
  const images = lots.flatMap(l => l.photos.map(p => p.src));
  assert.equal(new Set(images).size, images.length);
  assert(images.every(src => existsSync(path.join(__dirname, '../public', src.slice(1)))));
  assert(buyerExamples(todayPlus(0)).every(l => l.photos.length === 0));

  const localChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ headless: true, ...(existsSync(localChrome) ? { executablePath: localChrome } : {}) });
  try {
    for (const [width, language] of [[390, 'bn'], [1365, 'en']]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(lang => localStorage.setItem('alusathi-lang', lang), language);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/marketplace/buyer.html`);
      assert.equal(await page.locator('.buyer-catalogue .buyer-contact-card').count(), 6);
      const first = page.locator('.buyer-catalogue .buyer-contact-card').first();
      assert.equal(await first.locator('.catalogue-row-gallery-slide img').count(), 3);
      const gallery = first.locator('.catalogue-row-gallery');
      const otherGallery = page.locator('.buyer-catalogue .catalogue-row-gallery').nth(1);
      for (const index of [1, 2, 0]) {
        await gallery.locator('.catalogue-row-next').press('Enter');
        assert.equal(await gallery.getAttribute('data-index'), String(index));
        assert.equal(await gallery.locator('[aria-pressed="true"]').getAttribute('data-slide'), String(index));
        assert.equal(await otherGallery.getAttribute('data-index'), '0');
        await gallery.locator('.catalogue-row-gallery-slide[aria-hidden="false"] img').evaluate(img => img.decode());
      }
      assert(await first.locator('img').first().evaluate(img => img.complete && img.naturalWidth > 0));
      await first.locator('[data-action="view-lot"]').click();
      assert(await page.locator('.catalogue-detail-copy dl').innerText().then(text => text.includes(language === 'bn' ? 'প্যাকিং' : 'Packing')));
      await page.locator('.catalogue-detail-dialog [data-action="close-lot"]').click();
      await first.locator('[data-action="contact-lot"]').click();
      assert(await page.locator('.catalogue-contact-dialog').innerText().then(text => text.includes(language === 'bn' ? 'নমুনা' : 'example')));
      assert.equal(await page.locator('.catalogue-contact-dialog a[href^="tel:"], .catalogue-contact-dialog a[href^="https://wa.me/"]').count(), 0);
      assert.equal(await page.locator('.catalogue-contact-dialog [data-action="copy-enquiry"]').count(), 1);
      await page.locator('.catalogue-contact-dialog [data-action="close-contact"]').click();
      if (width === 1365) {
        const grid = page.locator('.buyer-catalogue .lot-grid');
        assert.equal(await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 3);
        assert((await gallery.locator('.catalogue-row-gallery-window').boundingBox()).height > 200);
        const firstId = await first.locator('[data-action="view-lot"]').getAttribute('data-id');
        await page.locator('[data-action="catalogue-page"][data-page="2"]').click();
        assert.notEqual(await first.locator('[data-action="view-lot"]').getAttribute('data-id'), firstId);
        await page.locator('[data-action="catalogue-page"][data-page="1"]').last().click();
        assert.equal(await first.locator('[data-action="view-lot"]').getAttribute('data-id'), firstId);
        await page.locator('#buyer-catalogue-filters [name="district"]').selectOption('Bogura');
        await page.locator('#buyer-catalogue-filters button[type="submit"]').click();
        assert.equal(await page.locator('.buyer-catalogue .buyer-contact-card').count(), 2);
        await page.locator('[data-action="clear-buyer-filters"]').first().click();
        assert.equal(await page.locator('.buyer-catalogue .buyer-contact-card').count(), 6);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await context.addInitScript(() => { localStorage.setItem('alusathi-lang', 'en'); sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer'); });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/farmer#interest`);
    await page.locator('.fm-interest-list article').first().waitFor();
    assert.equal(await page.locator('.fm-interest-list article').count(), 3);
    assert(await page.locator('.fm-interest-list').innerText().then(text => ['Rahim Traders', 'Karim Potato Store', 'Nahar Store'].every(name => text.includes(name))));
    assert.deepEqual(errors, []);
    await context.close();
    const old = { listings: [{ id: 'sample-lot', sample: true, quantityKg: 2000, variety: 'Diamant', district: 'Rangpur', readyDate: todayPlus(0) }, { id: 'own-lot', sample: false, farmerName: 'Own farmer', district: 'Rangpur', upazila: 'Pirganj', variety: 'Diamant', quantityKg: 300, askingPriceKg: 22, readyDate: todayPlus(0), photo: '/marketplace/listing-photos/potato-01.webp' }], offers: [], deals: [], quotes: [] };
    const oldContext = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' });
    await oldContext.addInitScript(payload => { localStorage.setItem('alusathi-lang', 'en'); localStorage.setItem('alusathi-marketplace-pilot-v1', JSON.stringify(payload)); }, old);
    const oldPage = await oldContext.newPage();
    await oldPage.goto(`${base}/marketplace/buyer.html`);
    assert(await oldPage.locator('.buyer-catalogue .section-header').innerText().then(text => text.includes('13')));
    assert.equal(await oldPage.locator('[data-action="view-lot"][data-id="own-lot"]').count(), 1);
    assert.equal(await oldPage.locator('[data-action="view-lot"][data-id="sample-lot"]').count(), 0);
    await oldContext.close();
  } finally { await browser.close(); }
  console.log('Demo data and Buyer/Farmer pages: 12 varied lots, unique photos, live dates, linked offers, sample enquiry, mobile/desktop passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
