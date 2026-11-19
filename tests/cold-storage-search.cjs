const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.BASE_URL || 'http://127.0.0.1:8080';

(async () => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
  const data = JSON.parse(await fs.readFile('public/marketplace/providers.json','utf8'));
  assert.equal(data.filter(item=>item.kind==='storage').length,2);
  await fs.mkdir('test-results/cold-storage-search',{recursive:true});
  try {
    for (const width of [1440,390]) for (const lang of ['bn','en']) {
      const reduced = width===390 && lang==='en';
      const context = await browser.newContext({viewport:{width,height:width===1440?900:844},serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'});
      await context.addInitScript(lang=>{
        sessionStorage.setItem('alusathi-demo','true');sessionStorage.setItem('alusathi-role','farmer');
        localStorage.setItem('alusathi-lang',lang);
        localStorage.setItem('alusathi-farmer-profile-v1',JSON.stringify({name:'Search test',district:'Rangpur'}));
      },lang);
      let fail = false, requests = 0;
      await context.route('**/marketplace/providers.json',route=>{
        requests++;
        return fail ? route.fulfill({status:503,body:'unavailable'}) : route.fulfill({json:data});
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+'/selling-preparation');
      const section = page.locator('#cold-storage'), select = section.locator('select'), button = section.locator('button[type=submit]');
      async function search(area) {
        await select.selectOption(area);
        const started = performance.now();
        await button.press('Enter');
        assert.ok(await button.isDisabled());assert.ok(await select.isDisabled());
        assert.equal(await section.locator('[aria-busy=true]').count(),1);
        assert.equal(await section.locator('.storage-spinner').count(),1);
        assert.equal(await section.locator('.storage-contact').count(),0);
        assert.equal(await section.locator('.storage-spinner').evaluate(el=>getComputedStyle(el).animationName),reduced?'none':'storage-spin');
        await page.waitForTimeout(500);
        assert.equal(await section.locator('.storage-contact').count(),0,'Results wait for the loading animation');
        if (fail) await section.getByRole('alert').waitFor();
        else await section.locator('.storage-contact').first().waitFor();
        assert.ok(performance.now()-started>=1000,'Loading remains visible for at least one second');
        assert.equal(await section.locator('.storage-spinner').count(),0);
        assert.ok(await button.isEnabled());assert.ok(await select.isEnabled());
      }
      await search('Rangpur');
      assert.equal(await section.locator('.storage-contact').count(),2);
      assert.match(await section.locator('.storage-contact').first().innerText(),lang==='bn'?/মা আয়েশা/:/Maa Aysha/);
      assert.equal(await section.locator('.storage-no-local').count(),0);
      assert.doesNotMatch(await section.innerText(),/তালিকার যোগাযোগগুলো জেলার আনুমানিক|আপনার জেলার কোনো যোগাযোগ এই তালিকায় নেই|Contacts are listed by how near their districts are|No Rangpur contacts in the directory/);
      const links = await section.locator('.storage-call').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
      assert.equal(new Set(links).size,2);
      for (const link of links) assert.match(link,/^tel:\+880\d{10}$/);
      await search('Munshiganj');
      assert.match(await section.locator('.storage-contact').first().innerText(),lang==='bn'?/রিভার ভিউ/:/River View/);
      assert.equal(await section.locator('.storage-contact').count(),2);
      fail=true;await search('Bogura');assert.equal(await section.locator('.storage-contact').count(),0);
      fail=false;await search('Bogura');assert.equal(await section.locator('.storage-contact').count(),2);
      assert.equal(requests,4,'One directory request per search');
      assert.equal(await section.locator('.storage-result-label').count(),1);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await section.screenshot({path:`test-results/cold-storage-search/${lang}-${width}.png`});
      assert.deepEqual(errors,[]);await context.close();
      console.log(`${lang} ${width}px: one-second loading, two distinct contacts, district order, failure/retry, keyboard and layout passed`);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
