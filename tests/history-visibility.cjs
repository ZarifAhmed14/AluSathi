const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const signedIn of [false, true]) {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        await context.route('**/api/auth/session', route => route.fulfill({ json: signedIn ? {
          user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' }, access_token: 'ui-test-only'
        } : {} }));
        await context.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
        assert.equal(await page.locator('#diary').count(), signedIn ? 1 : 0);
        assert.equal(await page.locator('a[href="#diary"]').count(), signedIn ? 2 : 0);
        assert.equal(await page.locator('#scan').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
        console.log(`${signedIn ? 'Signed-in' : 'Guest'} ${width}px: passed`);
        await context.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
