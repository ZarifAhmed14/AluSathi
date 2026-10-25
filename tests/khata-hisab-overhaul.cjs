const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', timezoneId: 'Asia/Dhaka' });
    await context.addInitScript(() => {
      if (localStorage.getItem('khata-test-seeded')) return;
      localStorage.clear(); localStorage.setItem('khata-test-seeded', 'true'); localStorage.setItem('alusathi-lang', 'bn');
      sessionStorage.setItem('alusathi-demo', 'true'); sessionStorage.setItem('alusathi-role', 'farmer');
      localStorage.setItem('alusathi-farm-ledger-v1', JSON.stringify([
        { type: 'expense', id: 'expense-3', date: '2026-10-22', category: 'transport', amount: 300, note: 'তৃতীয় খরচ' },
        { type: 'expense', id: 'expense-2', date: '2026-10-21', category: 'labour', amount: 200, note: 'দ্বিতীয় খরচ' },
        { type: 'expense', id: 'expense-1', date: '2026-10-20', category: 'seed', amount: 100, note: 'প্রথম খরচ' },
      ]));
      localStorage.setItem('alusathi-field-actions-v1', JSON.stringify([
        { id: 'care-fertilizer-2026-10-22', date: '2026-10-22', district: 'Rangpur', kind: 'task', category: 'fertilizer', status: 'সম্পন্ন', text: 'আজ সার দেওয়া হয়েছে', details: '১০ শতক জমি' },
        { id: 'care-spray-2026-10-21', date: '2026-10-21', district: 'Rangpur', kind: 'task', category: 'spray', status: 'সম্পন্ন', text: 'আজ স্প্রে দেওয়া হয়েছে', details: '১০ গ্রাম ওষুধ + ১০ লিটার পানি' },
      ]));
      localStorage.setItem('alusathi-next-fertilizer-guest', '2026-11-05');
    });
    const page = await context.newPage();
    await page.goto(`${base}/farmer#diary`, { waitUntil: 'domcontentloaded' });
    await page.locator('.notebook-sheet').waitFor();

    const nav = page.locator('.farmer-tabs a');
    assert.equal(await nav.nth(2).innerText(), 'খাতা', 'Khata must appear before Hisab');
    assert.equal(await page.locator('.notebook-day-row').count(), 2, 'Work records are separated into two clear days');
    assert.match(await page.locator('.notebook-day-row').nth(0).innerText(), /২২ অক্টোবর,? ২০২৬/);
    assert.match(await page.locator('.notebook-day-row').nth(1).innerText(), /২১ অক্টোবর,? ২০২৬/);
    assert.match(await page.locator('.notebook-entry-row').nth(0).innerText(), /সার দেওয়া.*কবে সার দিতে হবে.*৫ নভেম্বর,? ২০২৬/, 'Fertilizer row shows the work and next due date');
    assert.match(await page.locator('.notebook-entry-row').nth(1).innerText(), /স্প্রে দেওয়া/, 'Spray work is clearly named');
    const quickWork = page.locator('.notebook-quick-work');
    await quickWork.locator('input[type=date]').fill('2026-10-20');
    await quickWork.getByRole('button', { name: 'হ্যাঁ, সার দিয়েছি' }).click();
    assert.equal(await page.locator('.notebook-day-row').count(), 3, 'Quick work creates a new dated group');
    assert.match(await page.locator('.notebook-entry-row').last().innerText(), /সার দেওয়া/);
    await quickWork.getByRole('button', { name: 'হ্যাঁ, স্প্রে দিয়েছি' }).click();
    assert.equal(await page.locator('.notebook-entry-row').filter({ hasText: 'স্প্রে দেওয়া' }).count(), 2, 'Quick spray work is recorded');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.match(await page.locator('.notebook-entry-row').last().innerText(), /সার দেওয়া/, 'Quick work survives refresh');
    await page.screenshot({ path: 'test-results/khata-quick-work.png', fullPage: true });

    await page.getByRole('tab', { name: 'খরচ' }).click();
    assert.match(await page.locator('.notebook-date-bn').innerText(), /২০২৬/, 'Expense date is shown in Bangla');
    const rows = page.locator('.notebook-entry-row');
    await rows.nth(0).getByRole('checkbox').check();
    await rows.nth(2).getByRole('checkbox').check();
    assert.match(await page.locator('.notebook-selected-total').innerText(), /৳৪০০/, 'Rows 1 and 3 can be added');

    await rows.nth(0).getByRole('button', { name: 'সম্পাদনা' }).click();
    const form = page.locator('.notebook-expense-form');
    await form.locator('input[type=number]').fill('350');
    await form.getByRole('button', { name: 'পরিবর্তন রাখুন' }).click();
    assert.match(await page.locator('.notebook-entry-row').first().innerText(), /৳৩৫০/, 'Edited expense replaces the old row');
    await page.screenshot({ path: 'test-results/khata-overhaul-desktop.png', fullPage: true });

    assert.equal(await page.locator('.farmer-tabs a[href="/farmer#tools"]').count(), 0, 'Hisab is not in the main navigation');
    await page.getByRole('button', { name: /প্রোফাইল/ }).first().click();
    await page.locator('.farmer-profile-drawer a[href="/farmer#tools"]').click();
    await page.locator('.hisab-estimate').waitFor();
    await page.getByLabel('কত কেজি বিক্রি করবেন?').fill('1000');
    await page.getByLabel('প্রতি কেজি কত টাকা পাবেন?').fill('25');
    assert.match(await page.locator('.sale-breakdown').innerText(), /৳২৫,০০০/, 'Main inputs calculate immediately with optional costs at zero');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'test-results/hisab-overhaul-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
    await page.screenshot({ path: 'test-results/hisab-overhaul-mobile.png', fullPage: true });
    console.log('Khata and Hisab overhaul passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
