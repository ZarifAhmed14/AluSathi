const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:4176';

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(() => {
      sessionStorage.setItem('alusathi-demo', 'true');
      sessionStorage.setItem('alusathi-role', 'farmer');
      localStorage.setItem('alusathi-lang', 'bn');
      localStorage.setItem('alusathi-field-actions-v1', JSON.stringify([{
        id: 'demo-sample-2-old', date: '2026-10-23', district: 'Rangpur', kind: 'observation', category: 'photo',
        text: 'ছবি পরীক্ষা', image: '/demo-potatoes/sample-2.webp',
        body: 'এই স্থির ডেমো নমুনায় কয়েকটি হালকা বাইরের দাগ দেখা যাচ্ছে।', details: 'দাগ দেখুন', advice: 'observe',
      }]));
    });
    const page = await context.newPage();
    await page.goto(`${base}/farmer#today`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'আজকের কাজ' }).waitFor();
    assert.equal(await page.locator('.today-demo-result').count(), 0, 'Today starts without an old photo result');
    assert.equal(await page.getByText('এই স্থির ডেমো নমুনায় কয়েকটি হালকা বাইরের দাগ দেখা যাচ্ছে।').count(), 0, 'Old demo wording is absent');
    const sprayPanel = page.locator('.today-field-tools .ledger-panel').filter({ hasText: 'স্প্রে দিন' });
    await page.locator('.today-field-tools .ledger-panel').first().getByLabel('জমির পরিমাণ').fill('10');
    assert.equal(await sprayPanel.getByText('এই ছবির দাগ দেখে এখনই স্প্রে নয়। আক্রান্ত অংশ আলাদা করে আবার দেখুন।', { exact: true }).count(), 0, 'Old photo advice does not appear before a new photo');
    assert.match(await sprayPanel.innerText(), /কখন স্প্রে করবেন/);
    assert.match(await sprayPanel.innerText(), /১০ লিটার/);
    assert.match(await sprayPanel.innerText(), /ওষুধের নাম/);
    assert.match(await sprayPanel.innerText(), /পণ্যের লেবেল অনুযায়ী/);
    await page.locator('.today-photo-action button').click();
    await page.locator('.photo-demo-card').first().click();
    await page.locator('.today-demo-result').waitFor();
    assert.match(await page.locator('.today-demo-result').innerText(), /ছবির ফল/);
    assert.match(await sprayPanel.innerText(), /এই ছবিতে স্প্রে দরকার নেই/);
    assert.match(await sprayPanel.innerText(), /০ গ্রাম/);
    assert.match(await sprayPanel.innerText(), /০ লিটার/);
    assert.match(await sprayPanel.innerText(), /প্রয়োজন নেই/);
    await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
    await page.locator('.photo-demo-card').nth(2).click();
    await page.locator('.today-demo-result').waitFor();
    assert.match(await sprayPanel.innerText(), /২০ গ্রাম/);
    assert.match(await sprayPanel.innerText(), /১০ লিটার/);
    assert.match(await sprayPanel.innerText(), /অনুমোদিত ম্যানকোজেব ছত্রাকনাশক/);
    await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
    await page.locator('.photo-demo-card').nth(3).click();
    await sprayPanel.getByText('অনুমোদিত কার্বেন্ডাজিম ছত্রাকনাশক', { exact: true }).waitFor();
    assert.match(await sprayPanel.innerText(), /১০ গ্রাম/);
    await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
    await page.locator('.photo-demo-card').nth(4).click();
    await sprayPanel.getByText('অনুমোদিত ইমিডাক্লোপ্রিড কীটনাশক', { exact: true }).waitFor();
    assert.match(await sprayPanel.innerText(), /৫ মিলিলিটার/);
    await page.locator('.farmer-tabs a[href="/farmer#photos"]').click();
    await page.locator('.farmer-tabs a[href="/farmer"]').click();
    assert.equal(await page.locator('.today-demo-result').count(), 0, 'Returning to Today starts blank');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'আজকের কাজ' }).waitFor();
    assert.equal(await page.locator('.today-demo-result').count(), 0, 'Photo result does not return on next open');
    console.log('Today starts blank; selected photos appear only during the current visit');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
