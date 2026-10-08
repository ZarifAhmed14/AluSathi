const { chromium } = require('../../node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const url = process.env.BASE_URL || 'http://127.0.0.1:4175/';
const potato = path.resolve('tests/fixtures/potato-diamant.jpg');
const anotherSide = path.resolve('tests/fixtures/potato-diamant-side.jpg');
const unclear = path.resolve('public/marketplace/potato-harvest.png');
const notPotato = path.resolve('public/marketplace/farmer-hero.png');
const publicNotPotato = path.resolve('tests/fixtures/not-potato-orange.jpg');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport, serviceWorkers: 'block' });
      const uploads = [];
      page.on('request', request => {
        if (request.method() === 'GET') return;
        const body = request.postDataBuffer();
        const type = request.headers()['content-type'] || '';
        if (/multipart\/form-data|image\//i.test(type) ||
            (body && (body.length > 1024 * 1024 || body.includes(Buffer.from('data:image')) ||
              body.includes(Buffer.from('JFIF')) || body.includes(Buffer.from('PNG'))))) {
          uploads.push(request.url());
        }
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const scanner = page.locator('.potato-scan');
      await scanner.waitFor();
      if (viewport.width === 1440) {
        await page.getByRole('button', { name: 'Change language' }).click();
        await scanner.getByText('Start with one potato photo').waitFor();
      }
      const input = scanner.locator('input[type=file]');
      const button = scanner.getByRole('button', { name: /ছবি পরীক্ষা করুন|Check photo/ });
      if (await scanner.locator('input[type=checkbox]').count()) throw new Error('Scanner must not require an opt-in checkbox');

      await input.setInputFiles(potato);
      await button.click();
      await scanner.getByText(/experimental AI check|পরীক্ষামূলক AI ফল|another photo|আরেক দিক থেকে ছবি/).first().waitFor({ timeout: 90000 });
      if (/another photo|আরেক দিক থেকে ছবি/.test(await scanner.innerText()) && !/experimental|পরীক্ষামূলক/.test(await scanner.innerText())) {
        await input.setInputFiles(anotherSide);
        await button.click();
        await scanner.getByText(/experimental AI check|পরীক্ষামূলক AI ফল/).first().waitFor({ timeout: 90000 });
      }
      const result = await scanner.innerText();
      if (!/Diamant|Asterix/.test(result) || !/seed record|বীজের রেকর্ড/.test(result)) {
        throw new Error('Potato result must show the limited variety comparison');
      }
      await scanner.locator('label').filter({ hasText: /^(Sprouts|অঙ্কুর আছে)$/ }).click();
      if (!/1–5 months|১–৫ মাস/.test(await scanner.innerText())) throw new Error('Sprouting estimate missing');
      fs.mkdirSync('test-results', { recursive: true });
      await scanner.screenshot({ path: `test-results/variety-scanner-${viewport.width}.png` });

      for (const object of [notPotato, publicNotPotato]) {
        await input.setInputFiles(object);
        await button.click();
        await scanner.getByText(/Not a potato|এটি আলু নয়/).waitFor({ timeout: 90000 });
        if (/Closest photo match|ছবিতে সবচেয়ে মিলছে|How long since harvest|তোলার পর কতদিন/.test(await scanner.innerText())) {
          throw new Error('Non-potato photo must not receive variety or age result');
        }
      }
      await page.getByRole('button', { name: 'Change language' }).click();
      await scanner.getByText(viewport.width === 1440 ? 'এটি আলু নয়।' : 'Not a potato.').waitFor();
      await page.getByRole('button', { name: 'Change language' }).click();

      await input.setInputFiles(unclear);
      await button.click();
      await scanner.getByText(/another clear photo|আরেক দিক থেকে পরিষ্কার ছবি/).waitFor({ timeout: 90000 });
      if (await scanner.getByText(/Closest photo match|ছবিতে সবচেয়ে মিলছে/).count()) {
        throw new Error('Unclear first photo must ask for another view, not force a variety');
      }
      await input.setInputFiles(anotherSide);
      await button.click();
      await scanner.getByText(/experimental AI check|পরীক্ষামূলক AI ফল/).first().waitFor({ timeout: 90000 });

      for (let photo = 0; photo < 3; photo++) {
        await input.setInputFiles(unclear);
        await button.click();
        await scanner.getByText(photo === 2
          ? /couldn't confirm a potato|আলু বা তার জাত নিশ্চিত করা যায়নি/
          : /another clear photo|আরেক দিক থেকে পরিষ্কার ছবি/).waitFor({ timeout: 90000 });
      }
      if (/Closest photo match|ছবিতে সবচেয়ে মিলছে/.test(await scanner.innerText())) {
        throw new Error('Three unclear views must not force a variety');
      }

      await input.setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') });
      if (await button.isEnabled()) throw new Error('SVG upload must be rejected');
      await input.setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(9 * 1024 * 1024) });
      if (await button.isEnabled()) throw new Error('Oversized upload must be rejected');
      if (uploads.length) throw new Error(`Photo was uploaded: ${uploads.join(', ')}`);
      if (await page.locator('vite-error-overlay').count()) throw new Error('Vite error overlay is visible');
      await page.close();
    }
    console.log('Potato scanner mobile/desktop and non-potato gate passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
