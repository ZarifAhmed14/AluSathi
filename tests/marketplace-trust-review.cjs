const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const { initialData } = await import('../public/marketplace/market.mjs');
  const examples = initialData();
  assert.ok(examples.listings[0].readyDate <= examples.offers[0].expires, 'Sample offers remain valid when the lot is ready');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/`);
    await page.locator('input[type=file]').first().waitFor();
    assert.equal(await page.locator('input[type=file][capture]').count(), 0, 'Scanners allow gallery selection');
    assert.equal(await page.locator('html').getAttribute('lang'), 'bn');

    await page.goto(`${base}/life-cycle`);
    await page.getByRole('heading', { name: 'অঙ্কুর বের হয়' }).waitFor();
    assert.equal(await page.getByText('মিষ্টি আলু', { exact: true }).count(), 0);
    assert.equal(await page.getByText('বসন্ত', { exact: false }).count(), 0);
    assert.match(await page.title(), /আলুর জীবন/);

    await page.goto(`${base}/selling-preparation`);
    await page.getByText('রিভার ভিউ হিমাগার').waitFor();
    assert.equal(await page.getByText('মা আয়শা হিমাগার').count(), 0);
    assert.equal(await page.getByText('রাজ্জাক স্পেশালাইজড হিমাগার').count(), 0);

    await page.goto(`${base}/marketplace/farmer.html`);
    await page.locator('.farmer-portal').waitFor();
    assert.ok(await page.locator('meta[http-equiv="Content-Security-Policy"]').count());
    await page.locator('[data-view=offers]:visible').first().click();
    assert.equal(await page.locator('.offer-card').count(), 3);
    assert.match(await page.locator('.offer-card').first().innerText(), /উদাহরণ দর/);
    assert.match(await page.locator('.offer-card').first().innerText(), /প্রতি কেজিতে হাতে/);
    await page.locator('[data-view=list]:visible').first().click();
    assert.equal(await page.locator('#lot-form [name=quantityKg]').inputValue(), '2000', 'Fallback is visible before save');
    assert.equal(await page.locator('#lot-form [name=upazila]').inputValue(), 'Pirganj');
    assert.match(await page.locator('#lot-form [name=district]').innerText(), /ঠাকুরগাঁও/);
    await page.locator('#lot-form [name=quantityUnit]').selectOption('mon');
    assert.equal(await page.locator('#lot-form [name=quantityKg]').inputValue(), '50', 'Switching units keeps the same weight');
    await page.locator('#lot-form [name=quantityKg]').fill('125');
    await page.locator('#lot-form button[type=submit]').click();
    const savedLots = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-marketplace-pilot-v1')).listings);
    assert.equal(savedLots[0].quantityKg, 5000, 'Mon is converted to kg before saving');
    await page.locator('[data-view=list]:visible').first().click();
    await page.locator('#lot-form [name=quantityUnit]').selectOption('bag');
    assert.equal(await page.locator('#lot-form [name=quantityKg]').inputValue(), '', 'Sacks do not assume a weight');
    await page.locator('#lot-form [name=bagKg]').fill('50');
    await page.locator('#lot-form [name=quantityKg]').fill('10');
    await page.locator('#lot-form button[type=submit]').click();
    const bagLots = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-marketplace-pilot-v1')).listings);
    assert.equal(bagLots[0].quantityKg, 500, 'Sack quantity uses the farmer-entered sack weight');

    examples.listings.push({ ...examples.listings[0], id: 'large-lot', sample: false, quantityKg: 5000 });
    await page.evaluate(value => localStorage.setItem('alusathi-marketplace-pilot-v1', JSON.stringify(value)), examples);
    await page.reload();
    await page.locator('.farmer-portal').waitFor();
    await page.locator('[data-view=transport]:visible').first().click();
    await page.locator('#lot-switch').selectOption('large-lot');
    assert.equal(await page.locator('#transport-plan [name=quantityKg]').getAttribute('max'), '5000');
    assert.equal(await page.locator('.route-preview animateMotion').count(), 0, 'Truck does not animate under reduced motion');
    examples.listings[1].notes = '<img src=x onerror="window.__xss=1">';
    examples.listings[1].upazila = '<script>window.__xss=1</script>';
    await page.evaluate(value => localStorage.setItem('alusathi-marketplace-pilot-v1', JSON.stringify(value)), examples);
    await page.goto(`${base}/marketplace/buyer.html`);
    await page.locator('.buyer-portal').waitFor();
    assert.equal(await page.locator('.lot-card img[src="x"], .lot-card script').count(), 0, 'Entered lot text is not injected as HTML');
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Marketplace trust review passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
