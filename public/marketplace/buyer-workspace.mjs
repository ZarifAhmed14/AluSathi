const needsKey = 'alusathi-buyer-needs-v1';
const contactsKey = 'alusathi-buyer-contacts-v1';
const number = value => Number(String(value).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)));
const read = key => { try { const rows = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(rows) ? rows.filter(r => r && typeof r.id === 'string').slice(0, 100) : []; } catch { return []; } };
const write = (key, rows) => { if(rows.length>100) throw new Error('Record limit reached'); localStorage.setItem(key, JSON.stringify(rows)); };
export function enquiryQuestions(lot, t, condition) {
  return [
    !condition && t('আলুর আকার ও অবস্থা কেমন?', 'What size and condition are the potatoes?'),
    !lot.storageDescription && !lot.storage && t('আলু কোথায় রাখা আছে?', 'Where are the potatoes stored?'),
    !(Number(lot.kgPerSack) > 0) && t('বস্তা হলে প্রতি বস্তায় কত কেজি?', 'If bagged, how many kg per bag?'),
  ].filter(Boolean).join(' ');
}

export function mountWeightConverter(root, t) {
  if (!root) return;
  root.insertAdjacentHTML('beforeend', `<details class="sourcing-panel" id="buyer-weight-converter"><summary>${t('কেজি, মণ ও বস্তার হিসাব','Convert kg, maunds and bags')}</summary><div class="sourcing-fields"><label>${t('পরিমাণ','Amount')}<input name="amount" inputmode="decimal" maxlength="12"></label><label>${t('একক','Unit')}<select name="unit"><option value="kg">${t('কেজি','kg')}</option><option value="maund">${t('মণ','maund')}</option><option value="bag">${t('বস্তা','Sack')}</option></select></label><label>${t('প্রতি বস্তায় কেজি','kg per sack')}<input name="bagKg" inputmode="decimal" maxlength="12"></label></div><p>${t('১ মণ = ৪০ কেজি','1 maund = 40 kg')}</p><output aria-live="polite">—</output></details>`);
  const box = root.querySelector('#buyer-weight-converter');
  box.addEventListener('input', () => {
    const amount = number(box.querySelector('[name=amount]').value), bag = number(box.querySelector('[name=bagKg]').value), unit = box.querySelector('select').value;
    const kg = amount * (unit === 'maund' ? 40 : unit === 'bag' ? bag : 1);
    const format = new Intl.NumberFormat(t('bn-BD','en-BD'), {maximumFractionDigits: 3});
    const validBag = Number.isFinite(bag) && bag > 0 && bag <= 10000;
    box.querySelector('output').textContent = !Number.isFinite(kg) || amount <= 0 || kg > 10000000 || (unit === 'bag' && !validBag) ? '—' :
      `${format.format(kg)} ${t('কেজি','kg')} · ${format.format(kg / 40)} ${t('মণ','maunds')}${validBag ? ` · ${format.format(kg / bag)} ${t('বস্তা','sacks')}` : ''}`;
  });
}
export function keepContact(lot) {
  if (!lot || lot.practice) return false;
  const rows = read(contactsKey);
  if (!rows.some(row => row.lotId === lot.id)) write(contactsKey, [{id: crypto.randomUUID(), lotId: lot.id, name: String(lot.farmerName || lot.farmer?.name || lot.ownerName || '').slice(0, 80), variety: String(lot.variety || '').slice(0, 60), district: String(lot.district || '').slice(0, 60), stage: 'saved', note: '', price: '', updatedAt: new Date().toISOString()}, ...rows]);
  return true;
}
export function workspace(view, c) {
  const {t,h,kg,prettyDate,districtOptions,today} = c;
  if (view === 'needs') return `<section class="section page-shell sourcing-workspace buyer-needs" id="buyer-workspace">
    <header class="sourcing-heading"><div><h1>${t('আমার চাহিদা','My potato needs')}</h1><p>${t('কতটা আলু লাগবে লিখুন। কৃষক দেখে আপনাকে ফোন করতে পারবেন।','Write how many potatoes you need. Farmers can view this and call you.')}</p></div></header>
    <form id="buyer-need-form" class="sourcing-panel" data-demo="false">
      <input name="id" type="hidden">
      <div class="sourcing-fields">
        <label>${t('কত কেজি লাগবে?','How many kg?')}<input name="quantity" inputmode="decimal" maxlength="10" required></label>
        <label>${t('কোন জেলা থেকে?','Which district?')}<select name="district" required><option value="">${t('জেলা বাছুন','Choose a district')}</option>${districtOptions('')}</select></label>
        <label>${t('কবে লাগবে?','Needed by')}<input name="readyDate" type="date" min="${today}" required></label>
      </div>
      <details class="need-options"><summary>${t('বাজেট ও নোট (চাইলে)','Budget and note (optional)')}</summary><label>${t('আলুর বাজেট (৳)','Potato budget (৳)')}<input name="budget" inputmode="decimal" maxlength="12"></label><label>${t('আর কিছু জানাতে চান?','Anything else?')}<textarea name="note" maxlength="240" rows="2"></textarea></label></details>
      <label class="need-share"><input type="checkbox" name="share" value="yes"> <span>${t('কৃষকেরা আমার প্রোফাইলের ফোন নম্বর দেখতে পারবেন','Let farmers see my profile phone number')}</span></label>
      <p class="sourcing-footnote">${t('প্রকাশ করলে এই ব্রাউজারের বিক্রির আগে পাতায় দেখা যাবে।','Published requests appear on Before selling in this browser.')}</p>
      <div class="sourcing-actions"><button class="button button-green" type="submit">${t('চাহিদা প্রকাশ করুন','Publish request')}</button><button class="button button-outline" type="submit" value="private">${t('শুধু নিজের জন্য রাখুন','Save privately')}</button><button class="text-arrow" type="button" data-need-clear hidden>${t('এডিট বাতিল করুন','Cancel edit')}</button></div>
      <p class="sourcing-status" role="status"></p>
    </form>
    <div class="sourcing-section-title"><h2>${t('আপনার চাহিদার তালিকা','Your requests')}</h2></div><div data-need-list></div>
  </section>`;
  return `<section class="section page-shell sourcing-workspace" id="buyer-workspace"><header class="sourcing-heading"><div><p class="section-kicker">${t('পরিচয় থেকে সম্পর্ক','Farmer contacts')}</p><h1>${t('কৃষকের সঙ্গে কথাবার্তা','Farmer conversations')}</h1><p>${t('কার সঙ্গে কী কথা হলো, পরেরবার কী জানতে হবে—এক জায়গায় রাখুন।','Keep notes of who you spoke to and what to ask next.')}</p></div><button class="button button-green" data-view="home">${t('কৃষক খুঁজুন','Find farmers')} →</button></header><div class="sourcing-contact-guide"><strong>${t('প্রথমবার কথা বলবেন?','First conversation?')}</strong><span>${t('আলু আছে? → বর্তমান দর কত? → অবস্থা কেমন? → কোথা থেকে, কবে নেওয়া যাবে?','Available now? → Current price? → Condition? → Where and when to collect?')}</span></div><div data-contact-list></div><aside class="sourcing-panel sourcing-example"><h2>${t('একটি কাজের নোট কেমন হয়','What a useful note looks like')}</h2><p>${t('“৫০০ কেজি দরকার। বর্তমান ছবি চেয়েছি। শুক্রবার আবার ফোন করব।”','“Need 500 kg. Asked for current photos. Call again Friday.”')}</p><span>${t('এটি লেখার উদাহরণ—আপনার কথাবার্তার রেকর্ড নয়।','This is a writing example. It is not your conversation record.')}</span></aside></section>`;
}
export function mountWorkspace(view, c) {
  const root = document.querySelector('#buyer-workspace'); if (!root) return;
  const {t,h,kg,money,findLot,findMatches,today,districtName} = c;
  const prettyDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(2,4)}` : '—';
  const status = text => { const el=root.querySelector('.sourcing-status'); if(el) el.textContent=text; };
  if (view === 'needs') {
    const form=root.querySelector('form');
    const draw=()=>{
      const rows=read(needsKey);
      root.querySelector('[data-need-list]').innerHTML=rows.length ? rows.map(row=>`<article class="sourcing-record ${row.paused?'is-paused':''}"><div><span class="sourcing-label">${row.paused?t('বন্ধ','Paused'):t('আলু খুঁজছি','Looking for potatoes')}</span><h3>${kg(row.quantity)} · ${h(districtName(row.district))}</h3><p>${t('দরকার','Needed by')}: ${prettyDate(row.readyDate)}${row.budget?` · ${t('আলুর বাজেট','Potato budget')}: ${money(row.budget)}`:''}</p><p>${h(row.note || '')}</p></div><div class="sourcing-actions"><button class="button button-green" data-need-find="${h(row.id)}">${t('মিল থাকা আলু দেখুন','Find matching lots')}</button><button class="button button-outline" data-need-edit="${h(row.id)}">${t('এডিট করুন','Edit')}</button><button class="button button-outline" data-need-pause="${h(row.id)}">${row.paused?t('আবার চালু','Resume'):t('বন্ধ করুন','Pause')}</button></div></article>`).join('') : `<div class="sourcing-empty"><p>${t('এখনও কোনো চাহিদা নেই।','No potato requests yet.')}</p></div>`;
      root.querySelectorAll('.sourcing-record .sourcing-label').forEach((label,i) => {
        if (!rows[i].paused) label.textContent = rows[i].readyDate < today ? t('সময় পেরিয়েছে','Expired') : rows[i].contact ? t('প্রকাশ হয়েছে','Published') : t('শুধু নিজের জন্য','Private');
      });
    };
    const reset=()=>{form.reset();form.elements.id.value='';form.querySelector('[data-need-clear]').hidden=true;status('');};
    form.addEventListener('submit',e=>{
      e.preventDefault();const v=Object.fromEntries(new FormData(form)),quantity=number(v.quantity),budget=v.budget.trim()?number(v.budget):0;
      if(!Number.isFinite(quantity)||quantity<=0||quantity>1000000||!Number.isFinite(budget)||budget<0||budget>100000000||!c.validDistrict(v.district)||!/^\d{4}-\d{2}-\d{2}$/.test(v.readyDate)||v.readyDate<today||Number.isNaN(Date.parse(v.readyDate))) {status(t('কেজি, এলাকা, তারিখ ও বাজেট মিলিয়ে দিন।','Check quantity, district, date and budget.'));return;}
      const row={id:v.id||crypto.randomUUID(),quantity,district:v.district,readyDate:v.readyDate,budget,note:v.note.trim().slice(0,240),paused:false};
      const publish=e.submitter?.value!=='private';
      if(publish){
        if(v.share!=='yes'){status(t('প্রকাশ করতে ফোন নম্বর দেখানোর ঘরে টিক দিন।','To publish, allow farmers to see your phone number.'));form.elements.share.focus();return;}
        const phone=String(c.profile.phone||'').replace(/[\s()-]/g,'');
        if(!/^\+?[0-9]{8,15}$/.test(phone)){status(t('শেয়ার করতে আগে প্রোফাইলে ফোন নম্বর দিন।','Add a phone number to your profile before sharing.'));return;}
        row.contact={phone,name:String(c.profile.businessName||c.profile.contactPerson||'').slice(0,100)};
      }
      try{const rows=read(needsKey);write(needsKey,v.id?rows.map(r=>r.id===v.id?row:r):[row,...rows]);draw();reset();status(publish?t('চাহিদা প্রকাশ হয়েছে।','Request published.'):t('শুধু আপনার জন্য সেভ হয়েছে।','Saved privately.'));}catch{status(t('সেভ হয়নি। আপনার লেখা আছে—আবার চেষ্টা করুন।','Could not save. Your entries remain; try again.'));}
    });
    root.addEventListener('click',e=>{
      if(e.target.closest('[data-need-clear]'))reset();
      const button=e.target.closest('[data-need-find],[data-need-edit],[data-need-pause]');if(!button)return;
      const id=button.dataset.needFind||button.dataset.needEdit||button.dataset.needPause,row=read(needsKey).find(r=>r.id===id);if(!row)return;
      if(button.dataset.needFind)findMatches(row);
      if(button.dataset.needEdit){for(const key of ['id','quantity','district','readyDate','budget','note'])form.elements[key].value=row[key]||'';form.elements.share.checked=Boolean(row.contact);form.querySelector('.need-options').open=Boolean(row.note||row.budget);form.querySelector('[data-need-clear]').hidden=false;form.elements.quantity.focus();}
      if(button.dataset.needPause){
        if(row.paused && row.readyDate<today){status(t('আবার চালু করতে তারিখ বদলান।','Change the date before reopening.'));return;}
        try{write(needsKey,read(needsKey).map(r=>r.id===id?{...r,paused:!r.paused}:r));draw();root.querySelector(`[data-need-pause="${CSS.escape(id)}"]`)?.focus({preventScroll:true});status(row.paused?t('আবার চালু হয়েছে।','Request reopened.'):t('চাহিদা বন্ধ হয়েছে।','Request closed.'));}catch{status(t('পরিবর্তন সেভ হয়নি।','Change could not be saved.'));}
      }
    });draw();return;
  }
  const stages=[['saved','কথা বলব','To contact'],['spoke','কথা হয়েছে','Spoke to Farmer'],['later','আবার কথা বলব','Follow up']];
  const draw=()=>{
    const rows=read(contactsKey);
    root.querySelector('[data-contact-list]').innerHTML=rows.length?rows.map(row=>{const lot=findLot(row.lotId);return `<form class="sourcing-panel contact-note" data-contact-id="${h(row.id)}" data-demo="false"><header><div><h2>${h(row.name||t('কৃষক','Farmer'))}</h2><p>${h(row.variety)} · ${h(districtName(row.district))}</p></div>${lot?`<button type="button" class="button button-outline" data-action="contact-lot" data-id="${h(row.lotId)}">${t('যোগাযোগের তথ্য','Contact details')}</button>`:`<span>${t('আগের বিজ্ঞাপন এখন নেই','Original listing not available')}</span>`}</header><div class="sourcing-fields"><label>${t('কোথায় আছেন?','Your progress')}<select name="stage">${stages.map(([id,bn,en])=>`<option value="${id}" ${row.stage===id?'selected':''}>${t(bn,en)}</option>`).join('')}</select></label><label>${t('ফোনে বলা দর / কেজি · চাইলে','Discussed price / kg · optional')}<input name="price" inputmode="decimal" maxlength="12" value="${h(row.price||'')}"></label></div><label>${t('কথার নোট','Conversation note')}<textarea name="note" maxlength="240" rows="2">${h(row.note||'')}</textarea></label><div class="sourcing-actions"><button class="button button-green" type="submit">${t('নোট সেভ করুন','Save note')}</button><span>${t('আপনার নিজের লেখা; কৃষকের নিশ্চিত করা দর নয়।','This is your note. The Farmer has not confirmed the price.')}</span></div><p role="status" class="contact-status"></p></form>`;}).join(''):`<div class="sourcing-empty"><strong>${t('এখানে কৃষকের তথ্য রাখুন','Keep Farmer contacts here')}</strong><p>${t('আলুর বিস্তারিত থেকে যোগাযোগ খুলুন, তারপর “তালিকায় রাখুন” চাপুন। ফোন বা WhatsApp খোলা মানেই কথা হয়েছে নয়।','Open a lot\'s contact details and choose “Save contact in Khata”. Opening a phone or WhatsApp link does not mean you spoke.')}</p><button class="button button-outline" data-view="home">${t('আলু খুঁজুন','Find potatoes')} →</button></div>`;
  };
  root.addEventListener('submit',e=>{const form=e.target.closest('[data-contact-id]');if(!form)return;e.preventDefault();const v=Object.fromEntries(new FormData(form)),price=v.price.trim()?number(v.price):null,output=form.querySelector('.contact-status');if(!stages.some(s=>s[0]===v.stage)||(price!==null&&(!Number.isFinite(price)||price<=0||price>10000))){output.textContent=t('সঠিক দর লিখুন, অথবা ফাঁকা রাখুন।','Enter a valid price or leave it blank.');return;}try{write(contactsKey,read(contactsKey).map(r=>r.id===form.dataset.contactId?{...r,stage:v.stage,price:price===null?'':String(price),note:v.note.trim().slice(0,240),updatedAt:new Date().toISOString()}:r));output.textContent=t('আপনার নোট সেভ হয়েছে।','Your note is saved.');}catch{output.textContent=t('সেভ হয়নি। লেখা আছে—আবার চেষ্টা করুন।','Not saved. Your text is still here. Please try again.');}});draw();
  root.querySelectorAll('.contact-note').forEach(form => {
    const helper = document.createElement('button');
    helper.type = 'button'; helper.className = 'button button-outline'; helper.textContent = t('নোট থেকে তথ্য বের করুন','Find details in note');
    form.querySelector('.sourcing-actions').append(helper);
    helper.onclick = () => {
      const note = form.elements.note.value.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
      const quantity = note.match(/(\d+(?:\.\d+)?)\s*(?:kg\b|কেজি)/i)?.[1];
      const price = note.match(/(?:৳\s*)?(\d+(?:\.\d+)?)\s*(?:টাকা\s*|BDT\s*)?(?:\/\s*|per\s+|প্রতি\s*)(?:kg\b|কেজি)/i)?.[1];
      const followup = note.split(/[।\n;]+/).find(line => /আবার|follow.up|call back|call again/i.test(line))?.trim();
      if (price && number(price) > 0 && number(price) <= 10000) form.elements.price.value = price;
      form.querySelector('.contact-status').textContent = [quantity && `${t('পরিমাণ','Quantity')}: ${quantity} kg`, price && `${t('লেখা দর','Price in your note')}: ৳${price}/kg`, followup && `${t('আবার যোগাযোগ','Follow-up')}: ${followup}`].filter(Boolean).join(' · ') || t('কেজি, প্রতি কেজির দর বা আবার যোগাযোগের কথা পাওয়া যায়নি।','No kg, price per kg or follow-up details found.');
    };
  });
}
