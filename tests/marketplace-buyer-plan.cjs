const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const base = process.env.BASE_URL || "http://127.0.0.1:4176";

(async () => {
  const { compareLotCosts } = await import("../public/marketplace/buyer-plan.mjs");
  const example = compareLotCosts({ askingPriceMin: 22, askingPriceMax: 25 }, 200, 30, 400, 100);
  assert.equal(example.costMin, 4900);
  assert.equal(example.costMax, 5500);
  assert.equal(example.profitMin, 500);
  assert.equal(example.profitMax, 1100);
  assert.equal(example.roiMin, 9.09);
  assert.equal(example.marginMin, 8.33);
  assert.equal(compareLotCosts({ askingPriceMin: 22, askingPriceMax: 25 }, 0, 30, 400, 0), null);
  const browser = await chromium.launch();
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: "block" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/marketplace/lots", route => route.fulfill({ json: [] }));
      await page.route("**/api/marketplace/me", route => route.fulfill({ json: { user: { id: "demo-buyer" }, profile: { business_name: "Rahim Traders" }, lots: [], offers: [], purchases: [], pickups: [], payments: [], expenses: [] } }));
      await page.route("**/api/marketplace/catalogue-requests", route => route.fulfill({ json: [] }));
      await page.goto(`${base}/marketplace/buyer.html#buyer-plan`, { waitUntil: "domcontentloaded" });
      await page.locator(".buyer-plan-lot").first().waitFor();
      assert.equal(await page.locator('.desktop-nav [data-view="buyer-plan"]').count(), 1);
      assert.equal(await page.locator(".buyer-plan-lot").count(), 2);
      assert.match(await page.locator('[data-plan-totals="first"]').innerText(), /4,400|৪,৪০০/);
      assert.match(await page.locator('[data-plan-totals="first"]').innerText(), /transport|গাড়িভাড়া/i);
      await page.locator('[data-plan-action="example"]').click();
      await page.screenshot({ path: `artifacts/buyer-plan-${viewport.width}.png`, fullPage: true });
      const first = await page.locator('[data-plan-totals="first"]').innerText();
      assert.match(first, /4,900|৪,৯০০/, "low advertised cost plus example expenses");
      assert.match(first, /6,000|৬,০০০/, "example revenue is shown");
      assert.match(first, /ROI|Return on buying cost|লাভের অনুপাত/i);
      assert.match(first, /Profit margin|বিক্রির টাকার ওপর লাভের অনুপাত/i);
      await page.locator('[name="resale"]').fill("10");
      assert.match(await page.locator('[data-plan-totals="first"]').innerText(), /loss|লোকসান/i);
      await page.locator('[name="resale"]').fill("৩০");
      assert.match(await page.locator('[data-plan-totals="first"]').innerText(), /6,000|৬,০০০/, "Bangla digits calculate");
      await page.locator('[data-plan-check="lot"]').check();
      assert.match(await page.locator('.buyer-plan-check-progress').innerText(), /1 \/ 6|১ \/ ৬/);
      await page.locator('[name="collection"]').selectOption('lot:sample-lot-cardinal');
      assert.equal(await page.locator('[data-plan-check="lot"]').isChecked(), false, "checklists are separate by lot");
      await page.locator('[name="collection"]').selectOption('lot:sample-lot');
      assert.equal(await page.locator('[data-plan-check="lot"]').isChecked(), true);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('[data-plan-check="lot"]').waitFor();
      assert.equal(await page.locator('[data-plan-check="lot"]').isChecked(), true, "checks survive refresh");
      assert.equal(await page.locator('[name="resale"]').inputValue(), "৩০", "estimates survive refresh");
      await page.locator('[data-plan-action="reset-checks"]').click();
      assert.equal(await page.locator('[data-plan-check="lot"]').isChecked(), false);
      await page.locator('[data-action="language"]').click();
      assert.match(await page.locator('#buyer-plan-cost-title').innerText(), /Cost & estimated profit/);
      assert.equal(await page.locator('[name="resale"]').inputValue(), "৩০", "switching language preserves figures");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `no horizontal overflow at ${viewport.width}px: ${overflow}px`);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log("buyer plan browser checks passed");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
