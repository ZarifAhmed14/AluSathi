const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const base = process.env.BASE_URL || "http://127.0.0.1:4175";
const lot = {
  id: "demo-lot-1", seller_id: "farmer-1", variety: "Diamant", quantity_kg: 500, reserved_kg: 0,
  district: "Rangpur", upazila: "Pirganj", ready_date: "2026-10-28", harvest_date: "2026-10-20",
  purpose: "table", notes: "Clean, dry demo harvest.", size_description: "Medium and large",
  condition_description: "Firm; no visible damage", storage_description: "Cool, ventilated store",
  photos: [{ src: "/marketplace/demo-lots/potato-01.webp" }], asking_price_min: 22, asking_price_max: 25,
  farmer_name: "Farzana Begum", contact_phone: null,
};

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = [];
    const sent = [];
    let role = "buyer";
    let request = null;

    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/marketplace/lots", route => route.fulfill({ json: [lot] }));
    await page.route("**/api/marketplace/me", route => route.fulfill({ json: {
      user: { id: role === "buyer" ? "buyer-1" : "farmer-1" },
      profile: role === "buyer" ? { business_name: "Rahim Traders", business_type: "wholesaler" } : { contact_name: "Farzana Begum", business_type: "farmer", district: "Rangpur" },
      lots: [], offers: [], purchases: [],
    } }));
    await page.route("**/api/marketplace/catalogue-requests", async route => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        sent.push(body);
        request = {
          id: "request-1", lot_id: lot.id, seller_id: "farmer-1", buyer_id: "buyer-1",
          quantity_kg: body.quantityKg, quoted_total: Number(body.totalOffer), status: "pending", version: 1,
          awaiting_user_id: "farmer-1", is_read: false,
          lot: { variety: lot.variety, photos: lot.photos, district: lot.district, upazila: lot.upazila, asking_price_min: 22, asking_price_max: 25 },
          buyer: { name: "Rahim", business_name: "Rahim Traders", district: "Bogura", mobile: null },
          farmer: { name: "Farzana Begum", business_name: null, mobile: null },
        };
        await route.fulfill({ json: { id: request.id } });
      } else await route.fulfill({ json: request ? [request] : [] });
    });
    await page.route("**/api/marketplace/catalogue-requests/*/read", route => route.fulfill({ json: {} }));
    await page.route("**/api/marketplace/catalogue-requests/*/respond", async route => {
      const body = route.request().postDataJSON();
      sent.push(body);
      request.status = body.action === "accept" ? "agreed" : "pending";
      request.version += 1;
      await route.fulfill({ json: { offer: { id: request.id, status: request.status } } });
    });

    await page.goto(`${base}/marketplace/buyer.html`, { waitUntil: "networkidle" });
    await page.locator('[data-action="open-buyer-lot"]').first().click();
    await page.locator('#catalogue-request-form input[value="custom"]').check();
    await page.locator('#catalogue-request-form input[name="quantityKg"]').fill("200");
    assert.match(await page.locator("[data-range]").innerText(), /৪,৪০০.*৫,০০০/);
    await page.locator('#catalogue-request-form input[name="totalOffer"]').fill("4000");
    assert.equal(await page.locator('#catalogue-request-form input[name="totalOffer"]').inputValue(), "4000");
    await page.locator('#catalogue-request-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector(".profile-drawer"));
    assert.equal(sent[0].quantityKg, 200);
    assert.equal(sent[0].totalOffer, "4000.00");
    assert.equal(await page.locator('#catalogue-request-form input[name="priceKg"]').count(), 0);

    const fallbackPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await fallbackPage.route("**/api/marketplace/lots", route => route.fulfill({ status: 503, json: { detail: "Unavailable" } }));
    await fallbackPage.goto(`${base}/marketplace/buyer.html`, { waitUntil: "domcontentloaded" });
    await fallbackPage.locator(".buyer-catalogue-card").nth(4).waitFor();
    assert.equal(await fallbackPage.locator(".buyer-catalogue-card").count(), 5, await fallbackPage.locator(".buyer-catalogue-card").allTextContents());
    assert.equal(await fallbackPage.locator(".buyer-card-range").count(), 5);
    assert.equal(await fallbackPage.locator(".buyer-card-image").count(), 5);
    assert.match(await fallbackPage.locator(".buyer-card-range").first().innerText(), /৪,৪০০.*৫,০০০/);
    assert.equal(await fallbackPage.locator(".buyer-card-image").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
    await fallbackPage.locator('[data-action="open-buyer-lot"]').first().click();
    await fallbackPage.locator(".buyer-detail-facts").waitFor();
    assert.match(await fallbackPage.locator(".buyer-detail-facts").innerText(), /Medium and large; mostly uniform/);
    assert.match(await fallbackPage.locator(".buyer-detail-notes").innerText(), /Food-grade potatoes/);
    assert.equal(await fallbackPage.locator(".buyer-detail-hero-image:not([hidden])").evaluate(image => image.complete && image.naturalWidth > 0), true);
    for (let index = 0; index < 5; index++) {
      await fallbackPage.goto(`${base}/marketplace/buyer.html?lot=${["sample-lot", "sample-lot-cardinal", "sample-lot-granola", "sample-lot-asterix", "sample-lot-rosetta"][index]}#buyer-detail`, { waitUntil: "domcontentloaded" });
      await fallbackPage.locator(".buyer-detail-gallery").waitFor();
      const slides = fallbackPage.locator(".buyer-detail-hero-image[data-gallery-slide]");
      assert.equal(await slides.count(), 3, `lot ${index + 1} should have three slides`);
      assert.equal(await fallbackPage.locator(".buyer-detail-hero-image:not([hidden])").count(), 1, `lot ${index + 1} should show only one photo at a time`);
      assert.equal(await fallbackPage.locator(".buyer-detail-photo-count").innerText(), "১ / ৩");
      const sources = await slides.evaluateAll(images => images.map(image => image.getAttribute("src")));
      assert.equal(new Set(sources).size, 3, `lot ${index + 1} should have three different photos`);
      await slides.evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.equal(await slides.evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true, `lot ${index + 1} photos should load`);
      const original = await fallbackPage.locator(".buyer-detail-hero-image:not([hidden])").getAttribute("src");
      await fallbackPage.getByRole("button", { name: /Next photo|পরের ছবি/ }).click();
      assert.equal(await fallbackPage.locator(".buyer-detail-photo-count").innerText(), "২ / ৩");
      assert.notEqual(await fallbackPage.locator(".buyer-detail-hero-image:not([hidden])").getAttribute("src"), original, `lot ${index + 1} next control should switch photos`);
      assert.equal(await fallbackPage.locator(".buyer-detail-hero-image:not([hidden])").count(), 1);
      await fallbackPage.getByRole("button", { name: /Previous photo|আগের ছবি/ }).click();
      assert.equal(await fallbackPage.locator(".buyer-detail-photo-count").innerText(), "১ / ৩");
      assert.equal(await fallbackPage.locator(".buyer-detail-hero-image:not([hidden])").getAttribute("src"), original, `lot ${index + 1} previous control should return to the first photo`);
      await fallbackPage.getByRole("button", { name: /Previous photo|আগের ছবি/ }).click();
      assert.equal(await fallbackPage.locator(".buyer-detail-photo-count").innerText(), "৩ / ৩", `lot ${index + 1} slider should wrap around`);
    }

    const farmerPage = await context.newPage();
    await farmerPage.route("**/api/auth/session", route => route.fulfill({ json: { access_token: "demo-token", user: { id: "farmer-1", email: "farmer@example.test" } } }));
    await farmerPage.route("**/api/marketplace/profile", route => route.fulfill({ json: { profile: { contact_name: "Farzana Begum", district: "Rangpur" } } }));
    await farmerPage.route("**/api/marketplace/catalogue-requests", route => route.fulfill({ json: request ? [request] : [] }));
    await farmerPage.route("**/api/marketplace/catalogue-requests/*/read", async route => { request.is_read = true; await route.fulfill({ json: {} }); });
    await farmerPage.route("**/api/marketplace/catalogue-requests/*/respond", async route => {
      const body = route.request().postDataJSON();
      sent.push(body);
      request.status = body.action === "accept" ? "agreed" : "pending";
      request.version += 1;
      await route.fulfill({ json: { offer: { id: request.id, status: request.status } } });
    });
    await farmerPage.goto(`${base}/farmer`, { waitUntil: "domcontentloaded" });
    await farmerPage.getByRole("button", { name: /Profile and buyer requests|প্রোফাইল ও ক্রেতার অনুরোধ/ }).waitFor();
    assert.equal(await farmerPage.locator(".farmer-profile-trigger b").innerText(), "1");
    await farmerPage.getByRole("button", { name: /Profile and buyer requests|প্রোফাইল ও ক্রেতার অনুরোধ/ }).click();
    const inbox = farmerPage.locator(".farmer-profile-request");
    await inbox.first().waitFor();
    assert.equal(await inbox.count(), 1);
    assert.equal(await inbox.locator("img").count(), 1);
    assert.match(await inbox.innerText(), /Rahim Traders/);
    await inbox.getByRole("button", { name: /Accept|মেনে নিন/ }).click();
    assert.deepEqual(sent[1], { action: "accept", revision: 1 });
    assert.deepEqual(errors, []);
    console.log("marketplace catalogue UI flow passed (API mocked; not a Supabase integration test)");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
