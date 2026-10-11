const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const language of ['en', 'bn']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addInitScript(lang => localStorage.setItem('alusathi-lang', lang), language);
      const farmer = await context.newPage(), buyer = await context.newPage();
      const errors = [];
      for (const page of [farmer, buyer]) page.on('pageerror', error => errors.push(error.message));
      const clearRequired = async form => {
        const closed = form.locator('details:not([open]) > summary');
        while (await closed.count()) await closed.first().click();
        for (const input of await form.locator('input[required]:not([type=file]):not([type=hidden]), textarea[required]').all()) await input.fill('');
      };
      await farmer.goto(`${base}/marketplace/farmer.html`);
      await farmer.locator('.farmer-portal').waitFor();
      await farmer.locator('[data-view=list]:visible').first().click();
      await clearRequired(farmer.locator('#lot-form'));
      await farmer.locator('#lot-form button[type=submit]').click();
      await farmer.locator('#lot-form').waitFor({ state: 'detached' });
      const lots = await farmer.evaluate(() => JSON.parse(localStorage.getItem('alusathi-marketplace-pilot-v1')).listings);
      assert.equal(lots[0].quantityKg, 2000);
      assert.equal(lots[0].upazila, 'Pirganj');
      await farmer.locator('[data-view=storage]:visible').first().click();
      assert.ok(await farmer.locator('.service-card').count() > 0, 'Storage providers render');
      assert.ok(await farmer.locator('.service-call[href^="tel:"]').count() > 0, 'Storage call buttons render');

      await buyer.goto(`${base}/marketplace/buyer.html`);
      await buyer.locator('.buyer-portal').waitFor();
      await buyer.locator('[data-action=offer-lot]').first().click();
      await clearRequired(buyer.locator('#offer-form'));
      await buyer.locator('#offer-form [name=contactPerson]').fill('Rahim');
      await buyer.locator('#offer-form [name=contactPhone]').fill('01712345678');
      await buyer.locator('#offer-form [name=buyerUpazila]').fill('Pirganj');
      await buyer.locator('#offer-form [name=buyerAddress]').fill('Main potato market, Pirganj');
      await buyer.locator('#offer-form button[type=submit]').click();
      await buyer.locator('#offer-form').waitFor({ state: 'detached' });
      assert.equal(await buyer.locator('.offer-card').count(), 1);

      await farmer.reload();
      await farmer.locator('[data-action=select-lot]').first().click();
      await farmer.locator('[data-action=review-offer]').first().click();
      await farmer.locator('#deal-form [name=quantityKg]').fill('');
      await farmer.locator('#deal-form button[type=submit]').click();
      await farmer.locator('.deal-card').waitFor();
      await buyer.reload();
      await buyer.locator('[data-view=deals]:visible').first().click();
      await buyer.locator('[data-form=pickup] [name=actualAcceptedKg]').fill('');
      await buyer.locator('[data-form=pickup] button').click();
      await farmer.reload();
      await farmer.locator('[data-view=deals]:visible').first().click();
      await farmer.locator('[data-action=confirm-pickup]').click();
      await buyer.reload();
      await buyer.locator('[data-view=deals]:visible').first().click();
      await clearRequired(buyer.locator('[data-form=payment]'));
      await buyer.locator('[data-form=payment] button').click();
      const deal = await buyer.evaluate(() => JSON.parse(localStorage.getItem('alusathi-marketplace-pilot-v1')).deals[0]);
      assert.equal(deal.status, 'payment_pending');
      assert.equal(deal.paymentRef, 'NOT-VERIFIED');

      await farmer.goto(`${base}/marketplace/farmer.html#transport`);
      await farmer.locator('[data-view=transport]:visible').first().click();
      assert.deepEqual(errors, [], 'No errors before opening transport');
      // The sold lot has no remaining crop; choose the existing sample lot.
      await farmer.locator('#lot-switch').selectOption('sample-lot');
      await farmer.locator('[name=to]').selectOption('Bogura');
      assert.equal(await farmer.locator('#transport-plan .demo-form-note').count(), 1);
      assert.equal(await farmer.locator('[data-transport=save]').isDisabled(), true, 'A missing fare cannot become a quote');
      await farmer.locator('#transport-plan [name=fare]').fill('8000');
      await farmer.locator('#transport-plan [name=operator]').fill('Local truck operator');
      await farmer.locator('[data-transport=save]').click();
      assert.equal(await farmer.locator('.transport-quote').count(), 1);
      assert.match(await farmer.locator('.transport-quote .small-label').innerText(), language === 'bn' ? /বুকিং নয়/ : /NOT BOOKED/);
      await farmer.locator('[name=quantityKg]').fill('-5');
      assert.equal(await farmer.locator('[data-transport=save]').isDisabled(), true, 'Invalid typed quantities remain blocked');
      assert.equal(await farmer.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Marketplace forms passed: listing, buyer contact and offer, deal, pickup, payment, storage and transport; EN/BN, mobile and invalid-number protection.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
