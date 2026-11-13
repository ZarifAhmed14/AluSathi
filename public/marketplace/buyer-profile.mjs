export function profileAvatar({photo,t,h,icon,photoSrc}) {
  const src=photoSrc(photo);
  return `<div class="buyer-account-avatar">${src ? `<img src="${h(src)}" alt="${t('প্রোফাইল ছবি','Profile picture')}"/>` : ''}<span data-avatar-fallback ${src ? 'hidden' : ''}>${icon('user',42)}</span></div>`;
}

export function renderBuyerProfile({profile,t,h,icon,photoSrc}) {
  const value=key=>typeof profile[key]==='string' ? profile[key] : '';
  const field=(key,label,options='')=>`<label><span>${label}</span><input name="${key}" value="${h(value(key))}" ${options}/></label>`;
  const collectionPreference=`<label><span>${t('সংগ্রহের পছন্দ','Collection preference')}</span><select name="collectionPreference"><option value="">${t('পছন্দ নির্বাচন করুন','Choose a preference')}</option>${[['pickup',t('নিজে সংগ্রহ করব','Pickup')],['delivery',t('ডেলিভারি চাই','Delivery')],['discuss',t('বিক্রেতার সঙ্গে আলোচনা করব','Discuss with seller')]].map(([id,label])=>`<option value="${id}" ${value('collectionPreference')===id?'selected':''}>${label}</option>`).join('')}</select></label>`;
  return `<section class="page-shell buyer-account-page" aria-labelledby="buyer-profile-title">
    <header class="buyer-account-heading"><div><p class="section-kicker">${t('আমার পরিচয়','MY ACCOUNT')}</p><h1 id="buyer-profile-title">${t('ক্রেতার প্রোফাইল','Buyer profile')}</h1><p>${t('আপনার পরিচয় ও যোগাযোগের তথ্য—এক জায়গায়।','Your details and contact information, together.')}</p></div><span class="buyer-account-role">${icon('bag',17)}${t('ক্রেতা','Buyer')}</span></header>
    <div class="buyer-account-card"><form id="buyer-profile-form" data-demo="false">
      <section class="buyer-account-photo" aria-labelledby="buyer-photo-title"><div class="buyer-avatar-wrap">${profileAvatar({photo:profile.photo,t,h,icon,photoSrc})}<span class="buyer-avatar-camera" aria-hidden="true">${icon('camera',16)}</span></div><div><h2 id="buyer-photo-title">${t('প্রোফাইল ছবি','Profile picture')}</h2><p>${t('নিজের একটি পরিষ্কার ছবি দিন।','Add a clear photo of yourself.')}</p><div class="buyer-photo-controls"><label class="buyer-photo-upload">${icon('camera',17)}<span>${t('ছবি যোগ করুন','Upload photo')}</span><input type="file" name="profilePhoto" aria-label="${t('প্রোফাইল ছবি আপলোড','Upload profile picture')}" accept="image/jpeg,image/png,image/webp"/></label><button type="button" data-buyer-photo="remove" ${photoSrc(profile.photo) ? '' : 'hidden'}>${t('ছবি সরান','Remove photo')}</button></div><small>JPG, PNG, WebP</small><p class="buyer-photo-error" data-photo-error role="alert"></p></div></section>
      <fieldset><legend>${icon('user',20)}${t('ব্যক্তিগত তথ্য','Personal details')}</legend><div class="buyer-account-fields">${field('contactPerson',t('আপনার নাম','Your name'),'maxlength="80" minlength="2" required autocomplete="name"')}${field('businessName',`${t('ব্যবসার নাম','Business name')} <span class="buyer-field-optional">(${t('ঐচ্ছিক','optional')})</span>`,'maxlength="100" autocomplete="organization"')}</div></fieldset>
      <fieldset><legend>${icon('phone',20)}${t('যোগাযোগের নম্বর','Contact numbers')}</legend><div class="buyer-account-fields">${field('phone',t('ফোন','Phone'),'type="tel" maxlength="25" required autocomplete="tel"')}${field('whatsapp','WhatsApp','type="tel" maxlength="25"')}${collectionPreference}</div></fieldset>
      <p class="buyer-account-error" data-profile-error role="alert"></p><div class="buyer-account-actions"><button type="button" class="button button-outline" data-buyer-profile="cancel">${t('বাতিল করুন','Cancel')}</button><button type="submit" class="button button-green">${icon('check',18)}${t('সেভ করুন','Save profile')}</button></div><p class="buyer-account-status" data-profile-status role="status"></p>
    </form></div></section>`;
}

export function mountProfileAvatars(root) {
  root.querySelectorAll('.buyer-account-avatar img').forEach(image=>{
    const fallback=()=>{image.hidden=true;image.parentElement.querySelector('[data-avatar-fallback]').hidden=false;};
    image.addEventListener('error',fallback);
    if(image.complete && !image.naturalWidth) fallback();
  });
}

export function mountBuyerProfile({draft,getProfile,onSave,t,h,icon,photoSrc,compressPhoto}) {
  const form=document.querySelector('#buyer-profile-form');
  if(!form) return;
  const fields=['contactPerson','businessName','phone','whatsapp','collectionPreference'];
  const error=form.querySelector('[data-profile-error]'),status=form.querySelector('[data-profile-status]'),photoError=form.querySelector('[data-photo-error]');
  const upload=form.elements.profilePhoto,uploadLabel=form.querySelector('.buyer-photo-upload span');
  let busy=false;
  const clear=()=>{error.textContent='';status.textContent='';};
  const showPhoto=()=>{
    form.querySelector('.buyer-account-avatar').outerHTML=profileAvatar({photo:draft.photo,t,h,icon,photoSrc});
    form.querySelector('[data-buyer-photo=remove]').hidden=!photoSrc(draft.photo);
    mountProfileAvatars(form);
  };
  form.addEventListener('input',event=>{
    if(fields.includes(event.target.name)) {draft[event.target.name]=event.target.value;clear();}
  });
  upload.addEventListener('change',async()=>{
    const file=upload.files?.[0];
    if(!file || busy) return;
    busy=true;clear();photoError.textContent='';
    form.querySelectorAll('button,input[type=file]').forEach(control=>control.disabled=true);
    uploadLabel.textContent=t('ছবি তৈরি হচ্ছে…','Preparing photo…');
    try {
      const photo=await compressPhoto(file,{maxBytes:50*1024*1024,maxEdge:512});
      if(!photoSrc(photo)) throw new Error('photo');
      if(form.isConnected) {draft.photo=photo;showPhoto();}
    } catch {
      if(form.isConnected) photoError.textContent=t('ছবিটি নেওয়া যায়নি। ৫০ MB-এর মধ্যে একটি বৈধ JPG, PNG বা WebP ছবি দিন।','Could not read this photo. Choose a valid JPG, PNG or WebP image under 50 MB.');
    } finally {
      busy=false;
      if(form.isConnected) {
        form.querySelectorAll('button,input[type=file]').forEach(control=>control.disabled=false);
        uploadLabel.textContent=t('ছবি যোগ করুন','Upload photo');upload.value='';
      }
    }
  });
  form.querySelector('[data-buyer-photo=remove]').addEventListener('click',()=>{draft.photo='';photoError.textContent='';clear();showPhoto();});
  form.querySelector('[data-buyer-profile=cancel]').addEventListener('click',()=>{
    const saved=getProfile();
    for(const field of fields) {draft[field]=typeof saved[field]==='string' ? saved[field] : '';form.elements[field].value=draft[field];}
    draft.photo=photoSrc(saved.photo);photoError.textContent='';clear();showPhoto();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();event.stopPropagation();
    if(busy) return;
    clear();
    const next={...getProfile(),photo:photoSrc(draft.photo)};
    for(const field of fields) next[field]=form.elements[field].value.trim().slice(0,field==='contactPerson'?80:field==='businessName'?100:25);
    if(!form.reportValidity()) return;
    if(!['','pickup','delivery','discuss'].includes(next.collectionPreference)) {error.textContent=t('তালিকা থেকে সংগ্রহের পছন্দ বাছুন।','Choose a listed collection preference.');form.elements.collectionPreference.focus();return;}
    if(next.contactPerson.length<2) {error.textContent=t('আপনার নাম লিখুন।','Enter your name.');form.elements.contactPerson.focus();return;}
    for(const field of ['phone','whatsapp']) {
      next[field]=next[field].replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/[\s()-]/g,'');
      if((field==='phone' || next[field]) && !/^\+?[0-9]{8,15}$/.test(next[field])) {error.textContent=t('ফোন বা WhatsApp নম্বরটি ঠিক করে লিখুন।','Enter a valid phone or WhatsApp number.');form.elements[field].focus();return;}
    }
    try {
      onSave(next);Object.assign(draft,next);
      for(const field of fields) form.elements[field].value=next[field];
      status.textContent=t('প্রোফাইল সেভ হয়েছে।','Profile saved.');
    } catch {error.textContent=t('সেভ হয়নি। আপনার লেখা আছে—আবার চেষ্টা করুন।','Could not save. Your edits are still here; try again.');}
  });
  mountProfileAvatars(form);
}
