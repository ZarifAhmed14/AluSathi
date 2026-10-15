const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const vercel = require('../vercel.json');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

assert.ok(vercel.rewrites.some(route => route.source === '/account' && route.destination === '/index.html'), 'Vercel must serve /account on direct visits and refreshes');

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    for (const language of ['bn', 'en']) {
      for (const width of [390, 1280]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        await context.addInitScript(lang => localStorage.setItem('alusathi-lang', lang), language);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/auth`);
        await page.goto(`${base}/account`);
        assert.match(await page.locator('.account-card h1').innerText(), language === 'bn' ? /জমির খাতা/ : /field notebook/);
        await page.goto(`${base}/auth`);
        const bn = language === 'bn';
        const buttons = await page.locator('.account-card > .main-button').evaluateAll(elements => elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, background: getComputedStyle(element).backgroundColor })));
        assert.equal(buttons.length, 2);
        assert.deepEqual(buttons[0], buttons[1]);

        await page.locator('.account-card button.main-button').click();
        await page.waitForURL(`${base}/farmer`);
        assert.equal(await page.locator('a[href="/account"]').count(), 0, 'Do not advertise login when the API is disabled');
        assert.equal(await page.evaluate(() => sessionStorage.getItem('alusathi-role')), 'farmer');
        await page.locator('.farmer-today').waitFor();
        assert.equal(await page.locator('.farmer-header').count(), 1);
        await page.locator('.planting-edit summary').click(); await page.locator('.planting-edit input').fill('2026-09-18');
        assert.match(await page.locator('.farmer-stage').innerText(), bn ? /সার/ : /fertilizer/);
        assert.equal(await page.locator('.farmer-tabs a').count(), 4);
        assert.equal(await page.locator('.site-header .top-nav').getByText(bn ? 'সাহায্য' : 'Help').count(), 0);
        assert.equal(await page.locator('.connection-chip').count(), 0);
        assert.match(await page.locator('.farmer-field-scene').evaluate(element => getComputedStyle(element).backgroundImage), /alusathi-farmer-field-children\.webp/);
        await page.evaluate(() => scrollTo(0, 0));
        if (bn && width === 390) await page.screenshot({ path: 'test-results/farmer-home-mobile.png', fullPage: true });
        if (bn && width === 1280) await page.screenshot({ path: 'test-results/farmer-home-desktop.png' });
        await page.locator('.farmer-more summary').click(); await page.locator('.farmer-more').getByRole('button', { name: bn ? 'মূল পাতায় ফিরুন' : 'Return to main page' }).click();
        await page.waitForURL(`${base}/`);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('alusathi-role')), '');
        assert.equal(await page.locator('.role-badge').count(), 0);
        await page.goto(`${base}/auth`);
        await page.locator('.account-card button.main-button').click();
        await page.waitForURL(`${base}/farmer`);
        await page.goto(`${base}/marketplace/`);
        await page.waitForURL(`${base}/marketplace/farmer.html`);
        await page.locator('.farmer-portal').waitFor();
        assert.equal(await page.locator('#demo-login').count(), 0);

        await page.goto(`${base}/auth`);
        await page.locator('.account-card a.main-button').click();
        await page.waitForURL(`${base}/marketplace/buyer.html`);
        await page.locator('.buyer-portal').waitFor();
        assert.equal(await page.locator('#demo-login').count(), 0);
        await page.getByText(bn ? 'ব্যবসায়ী হিসেবে আছেন' : 'Businessman page').waitFor();
        await page.locator('.lot-card [data-action=offer-lot]').first().click();
        await page.locator('#offer-form [name=contactPerson]').fill('Rahim');
        await page.locator('#offer-form [name=contactPhone]').fill('01712345678');
        await page.locator('#offer-form [name=buyerUpazila]').fill('Pirganj');
        await page.locator('#offer-form [name=buyerAddress]').fill('Main potato market, Pirganj');
        await page.locator('.header-actions [data-action=language]').click();
        assert.equal(await page.locator('#offer-form [name=contactPhone]').inputValue(), '01712345678');
        assert.equal(await page.locator('#offer-form [name=buyerAddress]').inputValue(), 'Main potato market, Pirganj');
        await page.locator('#offer-form [type=submit]').click();
        await page.locator('.buyer-portal [data-view=buyer-offers].active').first().waitFor({ state: 'attached' });
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alusathi-buyer-profile-v1')).contactPhone), '01712345678');
        await page.goto(`${base}/marketplace/`);
        await page.waitForURL(`${base}/marketplace/buyer.html`);
        await page.goto(base);
        await page.locator('.public-landing').waitFor();
        assert.equal(await page.locator('.public-role-grid article').count(), 2);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('alusathi-role')), 'buyer');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
        if (bn && width === 390) await page.screenshot({ path: 'test-results/login-roles-mobile.png', fullPage: true });
        await context.close();
      }
    }
    const hostile = await browser.newContext({ serviceWorkers: 'block' });
    await hostile.addInitScript(() => localStorage.setItem('alusathi-buyer-profile-v1', JSON.stringify({ businessName: '<img src=x onerror="window.__xss=1">', contactPerson: '<svg onload="window.__xss=1">', contactPhone: '01712345678', buyerUpazila: '<script>bad()</script>', buyerAddress: '<img src=x onerror="window.__xss=1">' })));
    const hostilePage = await hostile.newPage();
    await hostilePage.goto(`${base}/marketplace/buyer.html`);
    await hostilePage.locator('.lot-card [data-action=offer-lot]').first().click();
    assert.equal(await hostilePage.evaluate(() => window.__xss), undefined);
    assert.equal(await hostilePage.locator('.buyer-profile img, .buyer-profile svg[onload], .buyer-profile script').count(), 0);
    await hostile.close();
    console.log('Role flow passed in Bengali and English on mobile and desktop.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
