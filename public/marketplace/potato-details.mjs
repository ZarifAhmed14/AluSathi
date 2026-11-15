export const potatoDraftKey = 'alusathi-potato-sale-details-v1';
export function readPotatoDraft() {
  try {
    const value = JSON.parse(localStorage.getItem(potatoDraftKey) || '{}');
    const draft = {};
    for (const key of ['district','upazila','variety','quantityKg','askingPriceKg','readyDate','harvestDate','purpose','notes','storageDescription']) {
      if (typeof value?.[key] === 'string' || typeof value?.[key] === 'number') draft[key] = String(value[key]).slice(0,300);
    }
    draft.photos = Array.isArray(value?.photos) ? value.photos.filter(p => typeof p?.src === 'string' && p.src.length < 1400000 && /^data:image\/jpeg;base64,[\w+/=]+$/.test(p.src)).slice(0,3) : [];
    return draft;
  } catch { return { photos: [] }; }
}
export function potatoDetailsForm({t,h,profile,district,varieties,districtOptions,today,publish}) {
  const d = readPotatoDraft();
  const value = (key,fallback='') => h(d[key] ?? fallback);
  return `<section class="section page-shell sale-details-page"><header><p class="section-kicker">${t('বিক্রির আগে','Before selling')}</p><h1>${publish ? t('আলু বাজারে দিন','List your potatoes') : t('বিক্রির আলুর তথ্য','Potato details for sale')}</h1><p>${publish ? t('তথ্য মিলিয়ে বাজারে ছাড়ুন।','Review your details before listing.') : t('একবার লিখুন। বাজারে দেওয়ার সময় এই তথ্য নিজে থেকেই আসবে।','Enter these details once. They will appear in your sale listing.')}</p></header><form id="lot-form" data-demo="false" class="panel form-panel">
    <fieldset class="form-section"><legend>${t('কী আলু, কতটা?','Your potatoes')}</legend><div class="form-grid">
      <label>${t('আলুর জাত','Variety')}<select name="variety"><option value="">${t('জানা নেই','Not known')}</option>${varieties.map(([key,bn])=>`<option value="${h(key)}" ${d.variety===key?'selected':''}>${t(bn,key)}</option>`).join('')}</select></label>
      <label>${t('পরিমাণ (কেজি)','Quantity (kg)')}<input name="quantityKg" required type="number" min="1" max="100000" step="any" value="${value('quantityKg')}"/></label>
      <label>${t('প্রতি কেজির চাওয়া দাম (৳)','Asking price per kg (৳)')}<input name="askingPriceKg" required type="number" min="0.01" max="10000" step="0.01" value="${value('askingPriceKg')}"/></label>
      <label>${t('কবে থেকে নিতে পারবেন?','Ready for collection')}<input name="readyDate" required type="date" min="${today}" value="${value('readyDate',today)}"/></label>
    </div></fieldset>
    <fieldset class="form-section"><legend>${t('আলুর ছবি','Potato photos')}</legend><label class="upload-box"><span><strong>${t('ছবি যোগ করুন','Add photos')}</strong><small>${t('সর্বোচ্চ ৩টি · JPG, PNG বা WEBP · প্রতিটি ২ MB','Up to 3 · JPG, PNG or WEBP · 2 MB each')}</small></span><input name="photo" type="file" multiple accept="image/jpeg,image/png,image/webp"/></label>${d.photos.length ? `<div class="sale-details-photos">${d.photos.map(p=>`<img src="${h(p.src)}" alt="${t('আগে রাখা আলুর ছবি','Saved potato photo')}"/>`).join('')}</div><p>${t('নতুন ছবি দিলে আগের ছবিগুলো বদলাবে।','Choosing new photos replaces the saved photos.')}</p>` : ''}</fieldset>
    <fieldset class="form-section"><legend>${t('ক্রেতাকে আর কী জানাবেন?','What should the buyer know?')}</legend><label>${t('আকার ও অবস্থা','Size and condition')}<textarea name="notes" rows="2" maxlength="300" placeholder="${t('যেমন: মাঝারি আকার, শুকনো আলু','For example: medium size, dry potatoes')}">${value('notes')}</textarea></label><div class="form-grid"><label>${t('আলু কীভাবে রাখা আছে?','How are they stored?')}<input name="storageDescription" maxlength="200" value="${value('storageDescription')}" placeholder="${t('যেমন: ঘরে বস্তায়','For example: bagged indoors')}"/></label><label>${t('কবে তুলেছেন? (জানা থাকলে)','Harvest date (if known)')}<input name="harvestDate" type="date" max="${today}" value="${value('harvestDate')}"/></label><label>${t('কী কাজে ব্যবহার হবে?','Use')}<select name="purpose">${[['unknown',t('জানা নেই','Not known')],['table',t('খাওয়ার আলু','Potatoes for eating')],['seed',t('বীজ আলু','Seed potatoes')],['processing',t('চিপস বা কারখানার জন্য','For processing')]].map(([key,label])=>`<option value="${key}" ${d.purpose===key?'selected':''}>${label}</option>`).join('')}</select></label></div></fieldset>
    <fieldset class="form-section"><legend>${t('কোথা থেকে নেবেন?','Pickup area')}</legend><p>${t('প্রোফাইলের এলাকা থাকলে এখানে দেওয়া হবে।','Your saved profile location appears here if you have added it.')}</p><div class="form-grid"><label>${t('জেলা','District')}<select name="district" required>${districtOptions(d.district || profile.district || district)}</select></label><label>${t('উপজেলা','Upazila')}<input name="upazila" required minlength="2" maxlength="60" value="${value('upazila',profile.upazila || '')}"/></label></div></fieldset>
    <p class="form-warning" role="alert" data-sale-error hidden></p><div class="lot-save-actions">${publish ? `<a class="button button-outline" href="#passport">${t('তথ্য বদলান','Edit details')}</a><button class="button button-green" type="submit">${t('বাজারে ছাড়ুন','List for sale')}</button>` : `<button class="button button-outline" type="submit" name="afterSave" value="back">${t('রাখুন ও ফিরে যান','Save and go back')}</button><button class="button button-green" type="submit" name="afterSave" value="market">${t('রাখুন ও বাজারে দিন','Save and prepare listing')}</button>`}</div></form></section>`;
}
