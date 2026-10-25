const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const base = process.env.BASE_URL || "http://127.0.0.1:4176";
const purchases = [
  { id: "purchase-one", lot_id: "sample-lot", agreed_quantity_kg: 200, agreed_total: 4400, stage: "agreed", buyer_id: "buyer-one", price_kg: 22, price_unit: "kg", price_unit_kg: 1, created_at: new Date().toISOString() },
  { id: "purchase-two", lot_id: "sample-lot-cardinal", agreed_quantity_kg: 150, agreed_total: 3300, stage: "agreed", buyer_id: "buyer-one", price_kg: 22, price_unit: "kg", price_unit_kg: 1, created_at: new Date().toISOString() },
];

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await page.clock.install();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/marketplace/lots", route => route.fulfill({ json: [] }));
    await page.route("**/api/marketplace/me", route => route.fulfill({ json: { user: { id: "buyer-one" }, profile: { business_name: "Rahim Traders" }, lots: [], offers: [], purchases, pickups: [], payments: [], expenses: [] } }));
    await page.route("**/api/marketplace/catalogue-requests", route => route.fulfill({ json: [] }));

    await page.goto(`${base}/marketplace/buyer.html?lot=sample-lot#buyer-detail`, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".buyer-detail-hero-image").count(), 3, "lot gallery remains intact");
    await page.locator('#catalogue-request-form input[value="custom"]').check();
    await page.locator('#catalogue-request-form input[name="quantityKg"]').fill("200");
    await page.locator('[data-action="preview-transport"]').click();
    assert.equal(new URL(page.url()).searchParams.get("transportKg"), "200");
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), "Dhaka");
    assert.match(await page.locator('#buyer-trip-text').inputValue(), /২০০/);
    assert.equal(await page.locator('.buyer-transport-arrangement').count(), 0, "preview cannot save arrangement");
    assert.equal(await page.locator('.buyer-map-art img').getAttribute('src'), './buyer-map-regions.png');
    await page.locator('.buyer-map-art img').evaluate(image => image.decode());
    assert.equal(await page.locator('.buyer-map-art img').evaluate(image => image.complete && image.naturalWidth > 0), true, 'painted map loads');
    assert.equal(await page.locator('.buyer-map-sidebar').count(), 1, 'route summary sits beside the map');
    assert.equal(await page.locator('.buyer-map-city').count(), 8, 'eight division cities are marked');
    assert.match(await page.locator('.buyer-map-divisions').innerText(), /চট্টগ্রাম/);
    assert.equal(await page.locator('.buyer-map-route').count(), 1);
    const truckStart = await page.locator('.buyer-map-truck').boundingBox();
    await page.waitForTimeout(900);
    const truckLater = await page.locator('.buyer-map-truck').boundingBox();
    assert.ok(Math.abs(truckLater.x - truckStart.x) + Math.abs(truckLater.y - truckStart.y) > 4, 'truck moves along the route');
    await page.locator('#buyer-transport-to').selectOption('Bogura');
    assert.match(await page.locator('#buyer-map-to').innerText(), /বগুড়া/);
    await page.locator('#buyer-transport-to').selectOption('Rangpur');
    assert.equal(await page.locator('.buyer-map-truck').count(), 0, "same district has no truck movement");
    await page.locator('#buyer-transport-to').selectOption('Dhaka');
    await page.locator('#buyer-transport-from').selectOption('Panchagarh');
    await page.locator('#buyer-transport-to').selectOption('Rajshahi');
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/marketplace/catalogue-requests')),
      page.clock.fastForward(16_000),
    ]);
    assert.equal(await page.locator('#buyer-transport-from').inputValue(), 'Panchagarh', 'polling preserves selected pickup');
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), 'Rajshahi', 'polling preserves selected destination');
    assert.equal(await page.locator('.buyer-map-route').count(), 1, 'polling keeps the route visible');
    assert.equal(await page.locator('.buyer-map-truck image').getAttribute('href'), './buyer-truck-top.png', 'top-down truck is used');
    assert.equal((await page.request.get(`${base}/marketplace/buyer-truck-top.png`)).ok(), true, 'truck artwork loads');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#buyer-transport-from').inputValue(), 'Panchagarh', 'reload preserves selected pickup');
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), 'Rajshahi', 'reload preserves selected destination');
    assert.equal(await page.locator('.buyer-map-route').count(), 1, 'reload keeps the route visible');
    await page.locator('#buyer-map-motion').click();
    assert.equal(await page.locator('#buyer-map-motion').getAttribute('aria-pressed'), 'true');
    await page.locator('#buyer-map-motion').click();
    assert.equal(await page.locator('#buyer-map-motion').getAttribute('aria-pressed'), 'false');

    await page.locator('[data-view="purchases"]').first().click();
    assert.equal(await page.locator('.deal-card').count(), 2);
    await page.locator('[data-action="arrange-transport"][data-id="purchase-one"]').click();
    assert.match(await page.locator('.buyer-transport-context').innerText(), /২০০/);
    assert.match(await page.locator('.buyer-transport-context').innerText(), /৪,৪০০/);
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), 'Dhaka');
    await page.locator('a[href="https://trucklagbe.com/"]').click();
    assert.equal(await page.locator('.buyer-arrangement-facts').count(), 0, "provider link does not save arrangement");
    await page.locator('input[name="operator"]').fill('Local transport operator');
    await page.locator('input[name="fare"]').fill('400');
    await page.locator('#buyer-transport-form button[type="submit"]').click();
    assert.match(await page.locator('.buyer-arrangement-facts').innerText(), /৪,৮০০/);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('input[name="fare"]').inputValue(), '400');
    await page.locator('input[name="fare"]').fill('500');
    await page.locator('#buyer-transport-form button[type="submit"]').click();
    assert.match(await page.locator('.buyer-arrangement-facts').innerText(), /৪,৯০০/);

    await page.locator('[data-view="purchases"]').first().click();
    await page.locator('[data-action="arrange-transport"][data-id="purchase-two"]').click();
    assert.equal(await page.locator('input[name="fare"]').inputValue(), '', 'second purchase has separate fare');
    await page.locator('input[name="operator"]').fill('<img src=x onerror=alert(1)>');
    await page.locator('input[name="fare"]').fill('100');
    await page.locator('#buyer-transport-form button[type="submit"]').click();
    assert.equal(await page.locator('#buyer-arrangement-summary img').count(), 0, 'local text is escaped');
    assert.equal(await page.locator('#buyer-clear-transport').isVisible(), true);
    await page.locator('#buyer-clear-transport').click();
    assert.equal(await page.locator('.buyer-arrangement-facts').count(), 0);
    await page.locator('[data-view="transport"]').first().click();
    assert.equal(await page.locator('#transport-purchase-select').count(), 1, 'direct tab asks for a purchase');
    assert.equal(await page.locator('.buyer-transport-map').count(), 1, 'blank demo still shows the map');
    assert.equal(await page.locator('.buyer-transport-provider').count(), 1, 'blank demo still shows provider handoff');
    assert.equal(await page.locator('.buyer-transport-arrangement').count(), 1, 'blank demo shows arrangement form');
    assert.equal(await page.locator('#buyer-transport-from').inputValue(), '');
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), '');
    assert.equal(await page.locator('#buyer-transport-date').inputValue(), '');
    assert.equal(await page.locator('input[name="fare"]').inputValue(), '');
    assert.equal(await page.locator('#buyer-transport-form button[type="submit"]').isDisabled(), true);
    assert.equal(await page.locator('.buyer-map-route').count(), 0, 'no route is invented');
    await page.screenshot({ path: 'artifacts/buyer-transport-blank-demo.png', fullPage: true });
    await page.locator('#buyer-sample-route').click();
    assert.equal(await page.locator('#buyer-transport-from').inputValue(), 'Rangpur');
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), 'Dhaka');
    assert.equal(await page.locator('.buyer-map-route').count(), 1, 'sample route can be explored');
    assert.equal(await page.locator('#buyer-transport-form button[type="submit"]').isDisabled(), true);
    await page.locator('#transport-purchase-select').selectOption('purchase-one');
    assert.equal(await page.locator('input[name="fare"]').inputValue(), '500');

    await page.locator('#buyer-transport-to').selectOption('Bogura');
    await page.locator('[data-action="language"]').first().click();
    assert.match(await page.locator('.buyer-transport-head h1').innerText(), /Plan the pickup/);
    assert.match(await page.locator('.buyer-map-divisions').innerText(), /Chattogram.*Seaport/s);
    assert.equal(await page.locator('#buyer-transport-to').inputValue(), 'Bogura');
    assert.match(await page.locator('#buyer-trip-text').inputValue(), /Destination: Bogura/);
    await page.locator('#buyer-transport-to').selectOption('Dhaka');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/buyer-transport-mobile.png', fullPage: true });
    await page.locator('.buyer-transport-map').screenshot({ path: 'artifacts/buyer-transport-regions-mobile.png' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'mobile has no horizontal overflow');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'artifacts/buyer-transport-desktop.png', fullPage: true });
    assert.deepEqual(errors, []);

    const reduced = await browser.newPage({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await reduced.goto(`${base}/marketplace/buyer.html?lot=sample-lot&transportLot=sample-lot&transportKg=200#transport`, { waitUntil: 'domcontentloaded' });
    assert.equal(await reduced.locator('#buyer-map-motion').isDisabled(), true);
    assert.equal(await reduced.locator('.buyer-map-truck animateMotion').count(), 0);
    assert.match(await reduced.locator('.buyer-map-truck').getAttribute('transform'), /^translate\(/);

    const live = await browser.newPage({ serviceWorkers: 'block' });
    const response = await live.goto(`${base}/marketplace/buyer.html?transportLot=sample-lot&transportKg=200#transport`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await live.locator('.buyer-map-art').waitFor();
    assert.equal(await live.locator('#buyer-transport-to').inputValue(), 'Dhaka');
    await live.locator('.buyer-map-art').screenshot({ path: 'artifacts/buyer-transport-bangladesh-map.png' });
    await live.screenshot({ path: 'artifacts/buyer-transport-live-preview.png', fullPage: true });
    console.log('Buyer transport browser flow passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
