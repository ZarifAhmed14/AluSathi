const { chromium } = require('playwright');
const fs = require('node:fs');
const base = 'http://127.0.0.1:4175/marketplace';
const key = 'alusathi-marketplace-pilot-v1';
const results = [];
const note = (check, evidence) => { results.push({ check, evidence }); console.log(check, evidence); };

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.addInitScript(() => localStorage.setItem('alusathi-lang', 'en'));
  const page = await context.newPage();
  async function enter(role) {
    await page.goto(`${base}/${role}.html`, { waitUntil: 'networkidle' });
    if (await page.locator('#demo-login').count()) {
      await page.locator('[name=displayName]').fill('Audit ' + role);
      await page.locator('#demo-login button').click();
    }
  }
  async function nav(view) { await page.locator(`.mobile-nav [data-view=${view}]`).click(); }
  async function offers() { await nav('offers'); }
  async function agree(id, quantity) {
    await offers();
    await page.locator(`[data-action=review-offer][data-id=${id}]`).click();
    await page.locator('#deal-form [name=quantityKg]').fill(String(quantity));
    await page.locator('#deal-form button[type=submit]').click();
  }
  try {
    await enter('farmer');
    await offers();
    await page.locator('[data-action=review-offer][data-id=sample-local]').click();
    const before = await page.locator('.deal-summary').innerText();
    await page.locator('#deal-form [name=quantityKg]').fill('500');
    const after = await page.locator('.deal-summary').innerText();
    note('partial-sale-preview', { before, after, expectedTakeHome: 11000, unchanged: before === after });
    await page.keyboard.press('Escape');
    note('dialog-escape', { stillOpen: await page.locator('[role=dialog]').count() > 0 });
    let escaped = false;
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      escaped ||= await page.evaluate(() => !document.activeElement.closest('[role=dialog]'));
    }
    note('dialog-focus', { focusEscaped: escaped });
    if (await page.locator('.modal-close').count()) await page.locator('.modal-close').click();
    await agree('sample-partial', 1000);
    await agree('sample-partial', 1000);
    note('buyer-demand-oversubscribed', await page.evaluate(key => {
      const data = JSON.parse(localStorage.getItem(key));
      const totalCommittedKg = data.deals.filter(d => d.offer.id === 'sample-partial').reduce((sum, d) => sum + d.quantityKg, 0);
      return { requestedKg: 1500, totalCommittedKg, withinRequest: totalCommittedKg <= 1500, dealCount: data.deals.length };
    }, key));
    await page.evaluate(key => localStorage.removeItem(key), key);
    await page.reload({ waitUntil: 'networkidle' });
    await agree('sample-local', 500);
    await enter('buyer');
    await nav('deals');
    await page.locator('[data-form=pickup] button').click();
    await enter('farmer');
    await nav('deals');
    await page.locator('[data-action=confirm-pickup]').click();
    await enter('buyer');
    await nav('deals');
    await page.locator('[name=paymentAmount]').fill('0');
    await page.locator('[name=paymentRef]').fill('AUDIT-ZERO');
    await page.locator('[data-form=payment] button').click();
    note('zero-payment-blocked', await page.evaluate(key => {
      const deal = JSON.parse(localStorage.getItem(key)).deals[0];
      return { amount: deal.paymentAmount || 0, status: deal.status, remainsUnpaid: deal.status !== 'paid' };
    }, key));
    await page.locator('[name=paymentAmount]').fill('11000');
    await page.locator('[data-form=payment] button').click();
    await enter('farmer');
    await nav('deals');
    page.once('dialog', d => d.accept());
    await page.locator('[data-action=confirm-payment]').click();
    note('positive-payment-paid', await page.evaluate(key => {
      const deal = JSON.parse(localStorage.getItem(key)).deals[0];
      return { amount: deal.paymentAmount, status: deal.status, expectedAmount: 11000 };
    }, key));
    await page.screenshot({ path: 'test-results/october-audit/zero-payment-paid.png', fullPage: true });
    await nav('list');
    await page.locator('#lot-form [name=upazila]').fill('Audit unsaved');
    await page.getByRole('button', { name: 'Change language' }).click();
    note('language-switch-unsaved-input', await page.locator('#lot-form [name=upazila]').inputValue());
  } finally {
    fs.writeFileSync('test-results/october-audit/marketplace-edges.json', JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
