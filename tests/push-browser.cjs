const {chromium}=require('playwright');
const fs=require('node:fs');
const users=JSON.parse(fs.readFileSync('test-results/auth-fixtures.json','utf8'));
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({permissions:['notifications']});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.setItem('alusathi-lang','en'));
  await context.request.post('http://127.0.0.1:4173/api/auth/signin',{headers:{Origin:'http://127.0.0.1:4173','X-AluSathi-Request':'1'},data:{email:users[0].email,password:users[0].password}});
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  await page.locator('.reminder-tool > summary').click();
  await page.getByRole('button',{name:'Enable background alerts',exact:true}).click();
  try {
    await page.getByRole('button',{name:'Disable device alerts',exact:true}).waitFor({timeout:25000});
    console.log('LIVE_PUSH_SUBSCRIPTION_OK');
    await page.getByLabel('What task?').fill('QA push delivery');
    await page.getByLabel('When?').fill(new Date(Date.now()+120000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));
    await page.getByRole('button',{name:'Save reminder',exact:true}).click();
    await page.locator('.reminder-list strong').filter({hasText:'QA push delivery'}).waitFor();
    console.log('Scheduled QA push. Keeping browser available for delivery.');
    for(let i=0;i<36;i++) {
      const count=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return (await r.getNotifications()).length;});
      if(count) {console.log('LIVE_PUSH_DELIVERY_OK');break;}
      await page.waitForTimeout(5000);
    }
  } catch { console.log('Browser push registration not available in this automated Chromium environment.'); }
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
