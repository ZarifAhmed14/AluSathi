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
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'domcontentloaded' });

      assert.equal(await page.locator('.public-landing').count(), 1);
      assert.equal(await page.locator('.journey-step').count(), 3);
      assert.equal(await page.locator('.workflow-steps li').count(), 3);
      assert.equal(await page.locator('.tool-card').count(), 2);
      assert.ok(await page.locator('.hero-art').getAttribute('src').then(src => src.endsWith('/alusathi-home-market.webp')));
      assert.ok(await page.locator('.workflow-art-wrap img').getAttribute('src').then(src => src.endsWith('/alusathi-home-photo-guide.webp')));
      assert.ok(await page.locator('.business-art-wrap img').getAttribute('src').then(src => src.endsWith('/alusathi-home-selling.webp')));
      assert.ok(await page.locator('.sample-note').innerText().then(text => text.includes('নমুনা লট')));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px has no horizontal overflow`);
      await page.locator('.business-art-wrap img').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `test-results/public-landing-${width}.png`, fullPage: true });
      await context.close();
    }

    const languageContext = await browser.newContext({ serviceWorkers: 'block' });
    const languagePage = await languageContext.newPage();
    await languagePage.goto(base, { waitUntil: 'domcontentloaded' });
    await languagePage.getByRole('button', { name: 'ইংরেজি ভাষা দেখুন' }).click();
    assert.ok((await languagePage.locator('#home-title').innerText()).includes('From potato field to market'));
    await languageContext.close();

    const reducedContext = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(base, { waitUntil: 'domcontentloaded' });
    const motionDuration = await reducedPage.locator('.hero-birds').evaluate(el => Number.parseFloat(getComputedStyle(el).animationDuration));
    assert.ok(motionDuration <= 0.0001, 'decorative animation respects reduced motion');
    await reducedContext.close();

    const farmerContext = await browser.newContext({ serviceWorkers: 'block' });
    const farmerPage = await farmerContext.newPage();
    await farmerPage.goto(base, { waitUntil: 'domcontentloaded' });
    await farmerPage.getByRole('button', { name: 'আমি কৃষক' }).click();
    await farmerPage.waitForURL(`${base}/farmer`);
    await farmerPage.locator('.farmer-v2').waitFor();
    assert.equal(await farmerPage.locator('.farmer-v2').count(), 1);
    await farmerContext.close();

    const toolContext = await browser.newContext({ serviceWorkers: 'block' });
    const toolPage = await toolContext.newPage();
    await toolPage.goto(base, { waitUntil: 'domcontentloaded' });
    await toolPage.getByRole('link', { name: /আজকের কাজ/ }).click();
    await toolPage.waitForURL(`${base}/farmer`);
    await toolPage.locator('.farmer-v2').waitFor();
    assert.equal(await toolPage.locator('.farmer-v2').count(), 1);
    await toolContext.close();

    const buyerContext = await browser.newContext({ serviceWorkers: 'block' });
    const buyerPage = await buyerContext.newPage();
    await buyerPage.goto(base, { waitUntil: 'domcontentloaded' });
    assert.equal(await buyerPage.getByRole('link', { name: 'আমি ব্যবসায়ী' }).getAttribute('href'), '/marketplace/buyer.html');
    await buyerContext.close();

    console.log('Public landing: artwork, sections, language toggle, motion preference, routes and responsive layout passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
