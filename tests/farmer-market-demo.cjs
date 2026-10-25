const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const base = process.env.BASE_URL || "http://127.0.0.1:4176";

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: "block" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/marketplace/lots", route => route.fulfill({ json: [] }));
      await page.route("**/api/marketplace/me", route => route.fulfill({ json: { user: { id: "demo-farmer" }, profile: { contact_name: "Farzana Begum" }, lots: [], offers: [], purchases: [], pickups: [], payments: [], expenses: [] } }));
      await page.route("**/api/marketplace/catalogue-requests", route => route.fulfill({ json: [] }));
      await page.goto(`${base}/marketplace/farmer.html#list`, { waitUntil: "domcontentloaded" });
      await page.locator('.farmer-demo-photo-choice img').first().waitFor();
      assert.equal(await page.locator('.farmer-demo-photo-choice img').count(), 3);
      await page.locator('[data-action="use-demo-lot"]').click();
      assert.equal(await page.locator('#lot-form [name="quantityKg"]').inputValue(), '2000');
      assert.equal(await page.locator('#lot-form [name="photo"]').getAttribute('required'), null);
      await page.locator('[data-action="preview-farmer-lot"]').click();
      assert.equal(await page.locator('.farmer-preview-photos img').count(), 3);
      assert.match(await page.locator('#farmer-lot-preview').innerText(), /4,400|৪,৪০০/);
      await page.screenshot({ path: `artifacts/farmer-market-preview-${viewport.width}.png`, fullPage: true });
      await page.locator('#lot-form .submit').click();
      await page.locator('.farmer-lot-actions').first().waitFor();
      const lot = await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-farmer-demo-lots-v1'))[0]);
      assert.equal(lot.photos.length, 3);
      assert.equal(lot.askingPriceMin, 22);
      assert.equal(lot.published, true);
      await page.locator(`[data-action="edit-demo-lot"][data-id="${lot.id}"]`).click();
      assert.equal(await page.locator('#lot-form [name="quantityKg"]').inputValue(), '2000');
      await page.locator('#lot-form [name="quantityKg"]').fill('1500');
      await page.locator('#lot-form .submit').click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-farmer-demo-lots-v1'))[0].quantityKg), 1500);
      const buyer = await context.newPage();
      buyer.on("pageerror", error => errors.push(error.message));
      await buyer.goto(`${base}/marketplace/buyer.html`, { waitUntil: "domcontentloaded" });
      const card = buyer.locator(`[data-action="open-buyer-lot"][data-id="${lot.id}"]`);
      await card.waitFor();
      await card.click();
      assert.equal(await buyer.locator('[data-gallery-slide]').count(), 3);
      assert.match(await buyer.locator('.buyer-detail-info').innerText(), /1,500|১,৫০০/);
      await page.locator(`[data-action="toggle-demo-lot"][data-id="${lot.id}"]`).click();
      await buyer.reload({ waitUntil: "domcontentloaded" });
      assert.equal(await buyer.locator(`[data-action="open-buyer-lot"][data-id="${lot.id}"]`).count(), 0, 'hidden lot leaves buyer catalogue');
      await page.locator(`[data-action="toggle-demo-lot"][data-id="${lot.id}"]`).click();
      await buyer.goto(`${base}/marketplace/buyer.html`, { waitUntil: "domcontentloaded" });
      await buyer.locator(`[data-action="open-buyer-lot"][data-id="${lot.id}"]`).first().waitFor();
      await page.goto(`${base}/marketplace/farmer.html#list`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-action="use-demo-lot"]').click();
      await page.locator('#lot-form [name="photo"]').setInputFiles([2, 3, 4].map(number => path.join(__dirname, `../public/marketplace/demo-lots/potato-0${number}.webp`)));
      await page.locator('[data-action="preview-farmer-lot"]').click();
      await page.locator('.farmer-preview-photos img').first().waitFor();
      assert.equal(await page.locator('.farmer-preview-photos img').count(), 3);
      assert.match(await page.locator('.farmer-preview-photos img').first().getAttribute('src'), /^data:image\/jpeg;base64,/);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await context.close();
    }
    console.log('farmer market demo browser checks passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
