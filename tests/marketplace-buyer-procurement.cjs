const { chromium } = require("playwright");

const base = process.env.BASE_URL || "http://127.0.0.1:4176";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${base}/marketplace/buyer.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (await page.locator("#buyer-brief-form [name=readyDate]").count() !== 1) throw new Error("buyer filters missing");
  await page.locator("#buyer-brief-form [name=district]").selectOption("Dinajpur");
  await page.locator("#buyer-brief-form").evaluate(form => form.requestSubmit());
  await page.waitForTimeout(30);
  if (await page.locator(".lot-card").count() !== 0) throw new Error("district filter did not empty results");
  await page.locator("#buyer-brief-form [name=district]").selectOption("");
  await page.locator("#buyer-brief-form").evaluate(form => form.requestSubmit());
  await page.locator("button[data-action=offer-lot]").first().click();
  await page.locator("details.offer-disclosure summary").click();
  for (const [name, value] of [["buyer", "Test buyer"], ["contactPerson", "Buyer Person"], ["contactPhone", "01712345678"], ["buyerUpazila", "Pirganj"], ["buyerAddress", "Market road"], ["priceKg", "25"], ["terms", "Weigh at pickup"]]) await page.locator(`[name=${name}]`).fill(value);
  await page.locator("[name=cost_transport]").fill("1000");
  await page.locator("[name=known_loadingSacks]").check();
  await page.locator("[name=cost_taxes]").fill("200");
  await page.locator("[name=cost_marketFees]").fill("50");
  await page.locator("[name=cost_other]").fill("25");
  await page.locator("#offer-form button[type=submit]").click();
  await page.waitForTimeout(50);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("alusathi-marketplace-pilot-v1")));
  const offer = saved.offers.find(item => item.buyer === "Test buyer");
  if (!offer || offer.buyerCosts.loadingSacks !== 0 || offer.buyerCosts.transport !== 1000) throw new Error("buyer costs were not persisted");
  await page.reload();
  await page.locator('[data-view="buyer-offers"]').first().click();
  if (!(await page.locator("text=Test buyer").count())) throw new Error("saved offer did not survive refresh");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error("horizontal overflow");
  await browser.close();
  console.log("marketplace buyer procurement flow passed");
})().catch(error => { console.error(error); process.exit(1); });
