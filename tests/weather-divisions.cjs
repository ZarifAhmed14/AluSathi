const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
const places = [
  ['Barishal',22.701,90.3535], ['Chattogram',22.3569,91.7832], ['Dhaka',23.8103,90.4125],
  ['Khulna',22.8456,89.5403], ['Mymensingh',24.7471,90.4203], ['Rajshahi',24.3745,88.6042],
  ['Rangpur',25.7439,89.2752], ['Sylhet',24.8949,91.8687],
];
const forecast = temperature => ({
  current:{temperature_2m:temperature,relative_humidity_2m:61,precipitation:0,weather_code:0},
  daily:{time:['2026-11-19'],temperature_2m_min:[18],temperature_2m_max:[30],precipitation_sum:[0],wind_gusts_10m_max:[10],weather_code:[0]},
  hourly:{time:[],temperature_2m:[],relative_humidity_2m:[]},
});
(async () => {
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
  await fs.mkdir('test-results/weather-divisions',{recursive:true});
  try {
    for (const width of [1440,390]) for (const lang of ['bn','en']) {
      const context = await browser.newContext({viewport:{width,height:width===1440?900:844},serviceWorkers:'block'});
      const page = await context.newPage(), errors = [], requests = [];
      let fail = false, releaseSlow;
      page.on('pageerror',error => errors.push(error.message));
      await context.addInitScript(lang => {
        sessionStorage.setItem('alusathi-demo','true');sessionStorage.setItem('alusathi-role','farmer');
        localStorage.setItem('alusathi-lang',lang);localStorage.setItem('alusathi-district','Rangpur');
        localStorage.setItem('alusathi-farmer-profile-v1',JSON.stringify({name:'Weather test',district:'Rangpur',land:'2',landUnit:'acre'}));
      },lang);
      await context.route('https://geocoding-api.open-meteo.com/**',route => {
        const url = new URL(route.request().url()), place = places.find(([name]) => name===url.searchParams.get('name'));
        assert.equal(url.searchParams.get('countryCode'),'BD');assert.ok(place);
        return route.fulfill({json:{results:[{latitude:place[1],longitude:place[2]}]}});
      });
      await context.route('https://api.open-meteo.com/**',async route => {
        const url = new URL(route.request().url());
        const index = places.findIndex(([,lat,lon]) => Number(url.searchParams.get('latitude'))===lat && Number(url.searchParams.get('longitude'))===lon);
        assert.ok(index>=0,'Forecast uses selected city coordinates');requests.push(places[index][0]);
        if (releaseSlow && places[index][0]==='Dhaka') await new Promise(resolve => {releaseSlow=resolve;});
        if (fail) return route.fulfill({status:503,body:'unavailable'});
        return route.fulfill({json:forecast(20+index)});
      });
      await page.goto(base+'/farmer');
      const card = page.locator('.today-weather-card'), select = card.getByRole('combobox');
      const temperature = card.locator('.weather-current strong');
      const number = value => value.toLocaleString(lang==='bn'?'bn-BD':'en-GB');
      await temperature.filter({hasText:number(26)+'°'}).waitFor();
      assert.equal(await select.getAttribute('aria-label'),lang==='bn'?'আবহাওয়ার বিভাগ বাছুন':'Choose weather division');
      assert.deepEqual(await select.locator('option').evaluateAll(options => options.map(option => option.value)),places.map(([name])=>name));
      const before = await page.evaluate(() => ({profile:localStorage.getItem('alusathi-farmer-profile-v1'),district:localStorage.getItem('alusathi-district'),tasks:document.querySelector('.today-task-list')?.textContent}));
      assert.ok(before.tasks);
      await select.focus();assert.equal(await select.evaluate(el=>el===document.activeElement),true);
      await select.press('Home');await select.press('Enter');
      for (const [index,[name]] of places.entries()) {
        await select.selectOption(name);await temperature.filter({hasText:number(20+index)+'°'}).waitFor();
        assert.equal(await card.getAttribute('aria-busy'),'false');
        if (name!=='Rangpur') assert.ok(await card.locator('.weather-location-note').isVisible());
        assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      }
      assert.ok(places.every(([name]) => requests.includes(name)),'All eight cities were fetched');
      // A late response must not replace the weather for a newer selection.
      releaseSlow=true;
      const slowRequest=page.waitForRequest(request => request.url().includes('api.open-meteo.com') && request.url().includes('latitude=23.8103'));
      await select.selectOption('Dhaka');await slowRequest;
      assert.equal(await temperature.innerText(),'—');
      await select.selectOption('Khulna');await temperature.filter({hasText:number(23)+'°'}).waitFor();
      const slowResponse=page.waitForResponse(response=>response.url().includes('latitude=23.8103'));
      releaseSlow();releaseSlow=null;await slowResponse;
      assert.equal(await temperature.innerText(),number(23)+'°');
      // A failed request uses only the selected city's cache, with a visible saved-data label.
      fail=true;await select.selectOption('Sylhet');await card.locator('.offline-status').waitFor();
      assert.equal(await temperature.innerText(),number(27)+'°');
      await page.evaluate(() => localStorage.removeItem('alusathi-weather-mymensingh'));
      await select.selectOption('Mymensingh');
      await card.getByText(lang==='bn'?'আবহাওয়া পাওয়া যায়নি':'Weather not available',{exact:true}).waitFor();
      assert.equal(await temperature.innerText(),'—');assert.equal(await card.locator('.weather-readings').count(),0);
      await select.selectOption('Rangpur');await temperature.filter({hasText:number(26)+'°'}).waitFor();
      const after = await page.evaluate(() => ({profile:localStorage.getItem('alusathi-farmer-profile-v1'),district:localStorage.getItem('alusathi-district'),tasks:document.querySelector('.today-task-list')?.textContent}));
      assert.deepEqual(after,before,'Browsing weather must preserve farm location, profile and tasks');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await card.screenshot({path:`test-results/weather-divisions/${lang}-${width}.png`});
      assert.deepEqual(errors,[]);await context.close();
      console.log(`${lang} ${width}px: eight divisions, keyboard, request races, failures, cache and farm data passed`);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
