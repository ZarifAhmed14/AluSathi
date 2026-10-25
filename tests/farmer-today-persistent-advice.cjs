const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, serviceWorkers: 'block', timezoneId: 'Asia/Dhaka' });
    await context.addInitScript(() => {
      if (!localStorage.getItem('today-test-seeded')) {
        localStorage.clear();
        localStorage.setItem('today-test-seeded', 'true');
        localStorage.setItem('alusathi-lang', 'bn');
        localStorage.setItem('alusathi-field-actions-v1', JSON.stringify([{
        id: 'photo-demo', date: new Date().toLocaleDateString('en-CA'), district: 'Rangpur', kind: 'observation', category: 'photo',
        text: 'ছবি পরীক্ষা', status: 'অসুস্থ', variety: 'কার্ডিনাল', cropAge: 'প্রায় ৯০ দিন', advice: 'late-blight',
        cause: 'আলুর গায়ে ছড়িয়ে থাকা স্পষ্ট বাইরের দাগ দেখা গেছে; এটি ক্ষত, পচন বা রোগের লক্ষণ হতে পারে।',
        details: 'আক্রান্ত আলু আলাদা রাখুন এবং জমির গাছেও একই দাগ আছে কি না দেখুন।',
        }]));
      }
      sessionStorage.setItem('alusathi-demo', 'true');
      sessionStorage.setItem('alusathi-role', 'farmer');
    });
    await context.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
      current: { temperature_2m: 25, relative_humidity_2m: 80, precipitation: 0, weather_code: 3 },
      daily: { time: ['2026-10-22'], temperature_2m_min: [20], temperature_2m_max: [29], precipitation_sum: [0], wind_gusts_10m_max: [12], weather_code: [3] },
      hourly: { time: [], temperature_2m: [], relative_humidity_2m: [] },
    } }));

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/farmer`);
    await page.locator('.farmer-today').waitFor();

    const body = page.locator('body');
    assert.match(await page.locator('.today-advice-card').innerText(), /ছড়িয়ে থাকা স্পষ্ট বাইরের দাগ/);
    assert.equal(await body.getByText('১৬১২৩', { exact: false }).count(), 0, 'Call-centre content is removed');
    assert.equal(await body.getByText('এখন আপনার ছবি AI প্রশিক্ষণে ব্যবহার করা হয় না।', { exact: true }).count(), 0, 'Training notice is removed');

    const panels = page.locator('.today-field-tools .ledger-panel');
    assert.match(await panels.nth(1).innerText(), /১০ টন \/ হেক্টর/);
    assert.match(await panels.nth(2).innerText(), /২ গ্রাম \/ ১ লিটার পানি/);
    assert.equal(await body.getByText('হিসাবের ভিত্তি', { exact: true }).count(), 0);
    assert.equal(await body.getByText('সারের তারিখ মনে রাখুন', { exact: true }).count(), 0);
    assert.equal(await body.getByText('আপনার পরামর্শে পরের তারিখ', { exact: true }).count(), 0);

    await panels.nth(0).getByLabel('জমির পরিমাণ').fill('10');
    await panels.nth(0).getByLabel('একক').selectOption('decimal');
    assert.match(await panels.nth(2).innerText(), /১০ লিটার/);
    assert.match(await panels.nth(2).innerText(), /২০ গ্রাম/);

    await page.getByRole('button', { name: 'হ্যাঁ, আজকে দিয়েছি', exact: true }).first().click();
    assert.match(await page.getByRole('status').last().innerText(), /২ সপ্তাহ পর আজকের কাজে মনে করিয়ে দেব/);
    assert.match(await page.evaluate(() => localStorage.getItem('alusathi-next-fertilizer-guest') || ''), /^\d{4}-\d{2}-\d{2}$/);

    await page.locator('.farmer-tabs a[href="/farmer#diary"]').click();
    await page.locator('.notebook-sheet').waitFor();
    await page.locator('.farmer-tabs a[href="/farmer"]').click();
    await page.locator('.farmer-today').waitFor();
    assert.match(await page.locator('.today-advice-card').innerText(), /ছড়িয়ে থাকা স্পষ্ট বাইরের দাগ/);
    assert.equal(await page.locator('.today-field-tools').getByLabel('জমির পরিমাণ').inputValue(), '10');
    assert.match(await page.locator('.today-field-tools .ledger-panel').nth(2).innerText(), /২০ গ্রাম/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No desktop horizontal overflow');
    assert.deepEqual(errors, []);

    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(`${base}/farmer`);
    await mobile.locator('.farmer-today').waitFor();
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No mobile horizontal overflow');
    await mobile.screenshot({ path: 'test-results/farmer-today-persistent-advice-mobile.png', fullPage: true });
    console.log('Farmer Today advice passed: cause, fertilizer, photo-based spray, reminder, navigation persistence, and responsive layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
