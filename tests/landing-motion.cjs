const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    fs.mkdirSync('test-results', { recursive: true });
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
      await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      assert.equal(await page.locator('.landing-motion .hero-section').count(), 1);
      assert.equal(await page.locator('.hero-photo').evaluate(el => getComputedStyle(el).animationName), 'field-arrive');
      await page.locator('.hero-photo').evaluate(el => el.getAnimations()[0]?.finished);
      await page.screenshot({ path: `test-results/landing-motion-hero-${width}.png` });
      await page.locator('.weather-compact-wrap').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !document.querySelector('.weather-compact-wrap')?.classList.contains('landing-reveal-pending'));
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.weather-compact-wrap')).opacity) > .99);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px has no horizontal overflow`);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `test-results/landing-motion-${width}.png` });
      await context.close();
    }
    const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(base);
    assert.equal(await page.locator('.landing-reveal-pending').count(), 0);
    assert.equal(await page.locator('.hero-photo').evaluate(el => getComputedStyle(el).animationName), 'none');
    await context.close();
    console.log('Landing motion: desktop, mobile, and reduced motion passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
