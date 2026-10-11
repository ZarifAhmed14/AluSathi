const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const language of ['bn', 'en']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('alusathi-lang', lang), language);
      const page = await context.newPage();
      const check = async () => assert.doesNotMatch(await page.locator('body').innerText(), /ডেমো|\bdemo\b/i, `${language}: ${page.url()}`);
      for (const path of ['/auth']) {
        await page.goto(`${base}${path}`);
        await check();
      }
      for (const role of ['farmer', 'buyer']) {
        await page.goto(`${base}/marketplace/${role}.html`);
        await check();
        await page.locator(`.${role}-portal`).waitFor();
        const views = await page.locator('.desktop-nav [data-view]').evaluateAll(nodes => nodes.map(node => node.dataset.view));
        for (const view of views) {
          await page.locator(`.desktop-nav [data-view="${view}"]`).click();
          await check();
        }
      }
      await context.close();
    }
    console.log('Visible role and marketplace copy has no repeated demo wording in BN/EN.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
