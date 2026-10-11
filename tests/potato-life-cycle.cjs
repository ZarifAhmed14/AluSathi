const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4175/life-cycle';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(() => localStorage.setItem('alusathi-lang', 'en'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Sprouting eyes' }).waitFor();
      assert.equal(await page.locator('.life-timeline button').count(), 5);
      const slider = page.getByRole('slider', { name: 'Time in the potato life' });
      assert.equal(await slider.getAttribute('max'), '90');
      assert.equal(await page.locator('.life-growth-seed').count(), 1, 'Seed potato must be separate from the static soil');
      const seedState = () => page.locator('.life-growth-seed').evaluate(node => {
        const style = getComputedStyle(node);
        return { transform: style.transform, opacity: style.opacity, filter: style.filter };
      });
      const earlySeed = await seedState();
      await page.locator('.life-botanical').evaluate(async node => {
        await Promise.all([...node.querySelectorAll('img')].map(image => image.decode()));
        const seed = new Image();
        seed.src = getComputedStyle(node.querySelector('.life-growth-seed')).backgroundImage.slice(5, -2);
        await seed.decode();
      });
      await slider.fill('21');
      const transition = await page.locator('.life-botanical').evaluate(node => ({
        sprout: Number(node.style.getPropertyValue('--sprout-scale')),
        foliage: Number(node.style.getPropertyValue('--foliage-scale')),
        opacity: getComputedStyle(node.querySelector('.life-growth-preflower')).opacity,
      }));
      assert.ok(transition.sprout * .76 <= transition.foliage * .53, 'Young shoot must not tower above its replacement canopy');
      assert.equal(transition.opacity, '1', 'New foliage should reveal in place, not appear as a ghost plant');
      await page.screenshot({ path: `test-results/potato-transition-${viewport.width}.png`, fullPage: true });
      await slider.fill('15');
      const earlyScale = await page.locator('.life-botanical').evaluate(node => node.style.getPropertyValue('--foliage-scale'));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/potato-growth-early-${viewport.width}.png`, fullPage: true });
      await slider.fill('60');
      assert.equal(await slider.inputValue(), '60');
      const lateScale = await page.locator('.life-botanical').evaluate(node => node.style.getPropertyValue('--foliage-scale'));
      assert.ok(Number(lateScale) > Number(earlyScale), 'Foliage should grow continuously with the day value');
      const lateSeed = await seedState();
      assert.notEqual(lateSeed.transform, earlySeed.transform, 'Mother tuber must change shape as its reserves are used');
      assert.notEqual(lateSeed.filter, earlySeed.filter, 'Seed tuber must darken with age');
      await slider.fill('15');
      assert.deepEqual(await seedState(), earlySeed, 'Scrubbing backward must restore the exact earlier seed state');
      await slider.fill('0');
      assert.equal(await page.locator('.life-underground').evaluate(node => node.style.getPropertyValue('--shoot-growth')), '0.000');
      await slider.fill('60');
      await page.screenshot({ path: `test-results/potato-growth-late-${viewport.width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Day 90: Harvest ready' }).click();
      await page.getByRole('heading', { name: 'Harvest ready' }).waitFor();
      assert.ok(Number((await seedState()).opacity) < Number(earlySeed.opacity), 'Original seed recedes by harvest');
      await page.screenshot({ path: `test-results/potato-growth-harvest-${viewport.width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Change language' }).click();
      await page.getByRole('heading', { name: 'তোলার সময়' }).waitFor();
      await page.getByRole('button', { name: 'পুরো সময় দেখুন' }).click();
      assert.equal(await page.getByRole('button', { name: 'থামান' }).getAttribute('aria-pressed'), 'true');
      await page.waitForTimeout(250);
      assert.ok(Number(await page.getByRole('slider', { name: 'আলুর বৃদ্ধির সময়' }).inputValue()) > 0, 'Playback should advance through days');
      await page.getByRole('button', { name: 'থামান' }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `test-results/potato-life-${viewport.width}.png`, fullPage: true });
      await page.goto(baseUrl.replace('/life-cycle', '/'), { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('.potato-life-page').count(), 0, 'Life cycle must not appear on the dashboard');
      await context.close();
    }
    console.log('Potato life cycle page browser checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
