const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
const today = '2026-11-18';
const instant = new Date(`${today}T10:00:00+06:00`);
const profileKey = 'alusathi-farmer-profile-v1';
const screenshotFolder = 'test-results/local-bug-fixes';

(async () => {
  const {initialData} = await import('../public/marketplace/market.mjs');
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
  await fs.mkdir(screenshotFolder, {recursive:true});
  const errors = [];
  async function session(width, lang, seed = {}) {
    const context = await browser.newContext({viewport:{width,height:width === 1440 ? 900 : 844}, timezoneId:'Asia/Dhaka',serviceWorkers:'block'});
    await context.addInitScript(({lang,seed}) => {
      localStorage.setItem('alusathi-lang',lang);
      localStorage.setItem('alusathi-marketplace-language',lang);
      sessionStorage.setItem('alusathi-demo','true');
      sessionStorage.setItem('alusathi-role','farmer');
      for (const [key,value] of Object.entries(seed)) {
        if (localStorage.getItem(key) === null) localStorage.setItem(key,typeof value === 'string' ? value : JSON.stringify(value));
      }
    },{lang,seed});
    let priceFeed = null;
    await context.route('**/api/retail-potato-prices',route => priceFeed
      ? route.fulfill({json:priceFeed}) : route.fulfill({status:503,body:'unavailable'}));
    const page = await context.newPage();
    page.on('pageerror',error => errors.push(error.message));
    await page.clock.setFixedTime(instant);
    return {context,page,setPriceFeed:value => {priceFeed = value;}};
  }
  const noOverflow = async page => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  try {
    for (const width of [1440,390]) for (const lang of ['bn','en']) {
      const bn = lang === 'bn';
      const format = value => new Intl.NumberFormat(bn ? 'bn-BD' : 'en-GB',{maximumFractionDigits:2}).format(value);
      // Existing accounts, including the old preset marker, retain every saved field.
      for (const preset of [undefined,'zarif-v1']) {
        const profile = {name:'Existing Farmer',district:'Bogura',upazila:'Shibganj',land:'3',landUnit:'hectare',variety:'Cardinal',...(preset ? {accountPreset:preset} : {})};
        const seed = {[profileKey]:profile,'alusathi-planting-date':'2026-10-01','alusathi-care-area':{value:'3',unit:'hectare',bigha:'33'}};
        const {context,page} = await session(width,lang,seed);
        await page.goto(base+'/farmer#profile');
        await page.locator('.farmer-profile-form').waitFor();
        await page.reload();
        await page.locator('.farmer-profile-form').waitFor();
        const saved = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key,localStorage.getItem(key)])),Object.keys(seed));
        for (const [key,value] of Object.entries(seed)) assert.equal(saved[key],typeof value === 'string' ? value : JSON.stringify(value));
        await noOverflow(page);
        await context.close();
      }
      // A partial farm record also prevents applying new-account defaults.
      {
        const {context,page} = await session(width,lang,{'alusathi-planting-date':'2026-10-01'});
        await page.goto(base+'/farmer#profile');await page.locator('.farmer-profile-form').waitFor();
        assert.equal(await page.evaluate(() => localStorage.getItem('alusathi-planting-date')),'2026-10-01');
        assert.equal(await page.locator('[name=name]').inputValue(),'');
        await context.close();
      }
      // Failed and partially successful feeds never invent a price for an unknown shop.
      {
        const {context,page,setPriceFeed} = await session(width,lang);
        await page.goto(base+'/marketplace/buyer.html#buyer-plan');
        await page.locator('[data-retail-group] [role=status]').first().filter({hasText:bn ? 'এখন দাম দেখা যাচ্ছে না' : 'Prices are temporarily unavailable'}).waitFor();
        assert.deepEqual(await page.locator('.retail-price-cell strong').allTextContents(),Array(7).fill('—'));
        assert.equal(await page.locator('.retail-price-cell span').filter({hasText:bn ? 'দর পাওয়া যায়নি' : 'Price not available'}).count(),7);
        await noOverflow(page);
        await page.screenshot({path:`${screenshotFolder}/prices-${lang}-${width}.png`});
        setPriceFeed({checkedAt:instant.toISOString(),prices:{'chaldal-regular':32}});
        await page.locator('.retail-refresh').first().click();
        await page.locator('.retail-price-cell strong').first().filter({hasText:format(32)}).waitFor();
        assert.equal(await page.locator('.retail-price-cell strong').filter({hasText:'—'}).count(),6);
        setPriceFeed(null);await page.locator('.retail-refresh').first().click();
        await page.locator('[data-retail-group] [role=status]').first().filter({hasText:bn ? 'এখন দাম দেখা যাচ্ছে না' : 'Prices are temporarily unavailable'}).waitFor();
        assert.equal(await page.locator('.retail-price-cell strong').first().innerText(),format(32));
        await context.close();
      }
      // Preset quotes stop at one truck's capacity, while manual quotes support larger loads.
      {
        const lot = {...initialData().listings[0],id:'regression-large-load',sample:false,quantityKg:10000};
        const {context,page} = await session(width,lang,{'alusathi-marketplace-pilot-v1':{listings:[lot],offers:[],deals:[],quotes:[]}});
        await page.goto(base+'/marketplace/buyer.html');
        await page.locator('[data-action=lot-costs][data-id=regression-large-load]').click();
        const modal = page.locator('.buyer-budget-modal');
        await modal.locator('[name=budget]').fill('300000');await modal.locator('[name=quantity]').fill('6000');
        await modal.locator('[data-expense-mode=estimate]').click();await modal.locator('[type=submit]').click();
        await modal.locator('.budget-incomplete').filter({hasText:bn ? '৫,০০০' : '5,000'}).waitFor();
        assert.equal(await modal.locator('.budget-total,.budget-profit').count(),0);
        assert.match(await modal.locator('[data-budget-assumed]').innerText(),bn ? /কোট প্রয়োজন/ : /quote needed/);
        await noOverflow(page);assert.ok(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await page.screenshot({path:`${screenshotFolder}/truck-${lang}-${width}.png`});
        await modal.locator('[data-expense-mode=manual]').click();
        for (const [key,value] of Object.entries({transport:'29000',labour:'2400',loading:'1000',toll:'2000',phone:'100',other:'0'})) await modal.locator(`[name=${key}]`).fill(value);
        await modal.locator('[type=submit]').click();
        await modal.locator('.budget-total strong').filter({hasText:format(133500)}).waitFor();
        await modal.locator('[name=quantity]').fill('5000');await modal.locator('[data-expense-mode=estimate]').click();
        await modal.locator('[type=submit]').click();await modal.locator('.budget-total strong').filter({hasText:format(172700)}).waitFor();
        await context.close();
      }
      // Invalid requests cannot display unrelated listings as matching results.
      {
        const {context,page} = await session(width,lang);
        await page.goto(base+'/marketplace/buyer.html');
        await page.locator('#catalogue-query').fill(bn ? 'রংপুরে ২০০০০০ কেজি ডায়মন্ড' : '200000 kg Diamant in Rangpur');
        await page.locator('#buyer-search-prompt [type=submit]').click();
        assert.equal(await page.locator('.buyer-catalogue .lot-card').count(),0);
        assert.match(await page.locator('#buyer-search-prompt').innerText(),bn ? /১,০০,০০০/ : /100,000/);
        assert.equal(await page.locator('.buyer-catalogue h2').innerText(),bn ? 'খোঁজের তথ্য ঠিক করুন' : 'Check your search details');
        await page.locator('#catalogue-query').fill('500 kg Diamant in Rangpur');await page.locator('#buyer-search-prompt [type=submit]').click();
        assert.ok(await page.locator('.buyer-catalogue .lot-card').count()>0);
        for (const title of await page.locator('.buyer-catalogue .lot-card h3').allTextContents()) assert.equal(title,bn ? 'ডায়মন্ড' : 'Diamant');
        await noOverflow(page);
        await page.locator('#catalogue-query').fill('<img src=x onerror="window.copyInjected=1">');await page.locator('#buyer-search-prompt [type=submit]').click();
        assert.equal(await page.locator('img[onerror]').count(),0);assert.equal(await page.evaluate(() => window.copyInjected),undefined);
        await context.close();
      }
      // Pagination and date filtering use matching expense dates, not calculation dates.
      {
        const ledger = [...Array.from({length:3},(_,i)=>({type:'calculation',id:`calc-${i}`,date:`2026-11-${18-i}`,category:'profit',title:`Saved estimate ${i}`,result:{gross:100}})),...Array.from({length:4},(_,i)=>({type:'expense',id:`expense-${i}`,date:`2026-11-${15-i}`,category:'labour',amount:100,note:`Expense ${i}`}))];
        const {context,page} = await session(width,lang,{[profileKey]:{name:'Existing Farmer'},'alusathi-farm-ledger-v1':ledger});
        await page.goto(base+'/farmer#diary');await page.getByRole('button',{name:bn ? 'খরচ' : 'Expenses',exact:true}).click();
        assert.equal(await page.locator('.notebook-day').count(),3);assert.equal(await page.locator('.notebook-estimates').count(),0);
        assert.deepEqual(await page.locator('.notebook-day>header time').evaluateAll(elements=>elements.map(el=>el.dateTime)),['2026-11-15','2026-11-14','2026-11-13']);
        await page.getByRole('button',{name:bn ? 'আরও দেখুন' : 'Show more',exact:true}).click();assert.equal(await page.locator('.notebook-day').count(),4);
        await page.locator('.notebook-date-filter input').fill('2026-11-12');assert.equal(await page.locator('.notebook-day').count(),1);
        await noOverflow(page);await context.close();
      }
      // The first 90-day plan never labels an old date as today's crop day.
      for (const [planting,day] of [['2026-11-18',1],['2026-11-11',8],['2026-11-10',9],['2026-11-04',15],['2026-08-21',90],['2026-08-20',91],['2026-07-01',141]]) {
        const {context,page} = await session(width,lang,{[profileKey]:{name:'Existing Farmer'},'alusathi-planting-date':planting});
        await page.goto(base+'/farmer#season');await page.locator('.season-calendar-title').waitFor();
        assert.ok((await page.locator('.season-calendar-title').innerText()).includes(format(day)));
        assert.equal(await page.locator('.season-track progress').getAttribute('value'),String(Math.min(day,90)));
        const timeline = page.locator('.season-upcoming');
        assert.equal(await timeline.locator('h2').innerText(),bn ? 'আলু চাষের টাইমলাইন' : 'Potato growing timeline');
        assert.equal(await timeline.locator('li').count(),7);
        assert.equal(await timeline.locator('.season-upcoming-jump').first().innerText(),bn ? 'দিন ১–১৫' : 'Days 1–15');
        assert.equal(await timeline.locator('.season-today-badge strong').innerText(),bn ? `${format(day)}ম দিন` : `Day ${format(day)}`);
        const currentWork = timeline.locator('[aria-current=step]');
        if (day<=90) {
          assert.equal(await currentWork.count(),1);
          if (day<=15) assert.equal(await currentWork.innerText(),day<15 ? (bn ? 'দিন ১–১৫' : 'Days 1–15') : (bn ? 'দিন ১৫–৩০' : 'Days 15–30'));
        } else assert.equal(await currentWork.count(),0);
        const current = page.locator('.season-calendar-grid [aria-current=date]');
        if (day<=90) {assert.equal(await current.count(),1);assert.equal(await current.locator('time').getAttribute('datetime'),today);}
        else {
          assert.equal(await current.count(),0);assert.equal(await page.locator('.season-calendar-grid').getByText(/Today ·|আজ ·/).count(),0);
          await page.locator('.season-return-today').click();assert.equal(await page.locator('.season-calendar-grid [aria-pressed=true]').getAttribute('data-day'),'90');
          await page.screenshot({path:`${screenshotFolder}/season-${lang}-${width}.png`});
        }
        if (day===9) {
          const plantingBefore = await page.evaluate(() => localStorage.getItem('alusathi-planting-date'));
          await timeline.locator('.season-upcoming-jump').last().press('Enter');
          assert.equal(await page.locator('.season-calendar-grid [aria-pressed=true]').getAttribute('data-day'),'71');
          assert.equal(await timeline.locator('.season-today-badge strong').innerText(),bn ? '৯ম দিন' : 'Day 9');
          assert.equal(await currentWork.innerText(),bn ? 'দিন ১–১৫' : 'Days 1–15');
          assert.equal(await page.evaluate(() => localStorage.getItem('alusathi-planting-date')),plantingBefore);
          await page.locator('.season-return-today').click();
          assert.equal(await page.locator('.season-calendar-grid [aria-pressed=true]').getAttribute('data-day'),'9');
          await timeline.screenshot({path:`${screenshotFolder}/timeline-${lang}-${width}.png`});
          await page.locator('.season-calendar-head').screenshot({path:`${screenshotFolder}/calendar-header-${lang}-${width}.png`});
          assert.equal(await page.locator('.season-calendar-head').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 250, 240)');
        }
        await noOverflow(page);await context.close();
      }
      console.log(`${lang} ${width}px: all six bug regressions passed`);
    }
    assert.deepEqual(errors,[]);
    console.log('No browser page errors. User data preserved; missing data remains unknown.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
