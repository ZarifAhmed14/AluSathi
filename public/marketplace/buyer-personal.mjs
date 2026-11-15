const key = 'alusathi-buyer-notebook-v1';
const kinds = [['transport','গাড়িভাড়া','Truck fare'],['handling','ওঠানো-নামানো','Loading / unloading'],['other','অন্য খরচ','Other expense'],['note','নোট','Note']];
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
function read() {
  const rows = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(rows) || rows.some(r => !r || typeof r.id !== 'string' || !validDate(r.date) || !kinds.some(k => k[0] === r.kind) || typeof r.note !== 'string' || !Number.isFinite(r.amount) || r.amount < 0)) throw new Error('invalid notebook');
  return rows;
}
export function notebook({t,h,money,prettyDate,today}) {
  let rows;
  try { rows = read(); } catch { return `<section class="section page-shell buyer-personal"><h1>${t('খাতা','Khata')}</h1><p role="alert">${t('খাতা পড়া যাচ্ছে না। আগের তথ্য বদলানো হয়নি।','Could not open your Khata. Your saved records have not changed.')}</p></section>`; }
  return `<section class="section page-shell buyer-personal" id="buyer-notebook"><header class="personal-heading"><div><p class="section-kicker">${t('নিজের হিসাব','Personal records')}</p><h1>${t('খরচ ও কথার খাতা','Expenses and notes')}</h1><p>${t('নিজের খরচ ও কৃষকের সঙ্গে কথার নোট রাখুন। এটি কেনাবেচার প্রমাণ নয়।','Keep your expenses and notes from talks with Farmers. This is not proof of a sale.')}</p></div><button class="button button-outline" data-view="buyer-plan">${t('লাভের হিসাব দেখুন','Check costs and profit')}</button></header>
  <form class="personal-entry" data-notebook-form><input type="hidden" name="id"><label>${t('তারিখ','Date')}<input name="date" type="date" required value="${today}"></label><label>${t('ধরন','Type')}<select name="kind">${kinds.map(([id,bn,en])=>`<option value="${id}">${t(bn,en)}</option>`).join('')}</select></label><label>${t('টাকা (৳)','Amount (৳)')}<input name="amount" inputmode="decimal" maxlength="14" required></label><label class="personal-note">${t('বিবরণ','Description')}<input name="note" maxlength="240" required placeholder="${t('যেমন: রংপুরের আলু নামানোর খরচ','e.g. Unloading potatoes from Rangpur')}"></label><button type="submit" class="button button-green">${t('সেভ করুন','Save entry')}</button><button type="button" class="button button-outline" data-note-cancel hidden>${t('বাতিল','Cancel edit')}</button><p class="personal-status" role="status" aria-live="polite"></p></form>
  <div class="personal-records"><div class="personal-toolbar"><label>${t('দেখুন','Show')}<select data-note-filter><option value="">${t('সব খরচ ও নোট','All expenses and notes')}</option>${kinds.map(([id,bn,en])=>`<option value="${id}">${t(bn,en)}</option>`).join('')}</select></label><p>${t('খাতায় লেখা মোট খরচ','Total recorded expenses')}: <strong data-note-total></strong></p></div><table class="personal-table"><caption class="personal-sr">${t('নিজের খরচ ও নোট','Personal expenses and notes')}</caption><thead><tr>${['তারিখ|Date','ধরন|Type','বিবরণ|Description','টাকা|Amount','|Actions'].map(s=>`<th scope="col">${t(...s.split('|'))}</th>`).join('')}</tr></thead><tbody></tbody></table><p class="personal-empty"></p></div><p class="personal-footnote">${t('এই ব্রাউজারেই সেভ হয়। লাভের সম্ভাব্য হিসাব এখানে খরচ হিসেবে যোগ হয় না।','Saved only in this browser. Estimated profit is not added as an expense.')}</p></section>`;
}
export function mountNotebook(ctx) {
  const root = document.querySelector('#buyer-notebook'); if (!root) return;
  const {t,h,money,prettyDate,today} = ctx;
  const form = root.querySelector('form'), filter = root.querySelector('[data-note-filter]');
  form.dataset.demo='false';
  let rows = read(), undo = null;
  const status = text => { root.querySelector('.personal-status').textContent = text; };
  const persist = next => { try { localStorage.setItem(key,JSON.stringify(next)); rows = next; return true; } catch { status(t('সেভ হয়নি। লেখা ঠিক আছে—আবার চেষ্টা করুন।','Could not save. Your entry is still here. Please try again.')); return false; } };
  const draw = () => {
    const shown = rows.filter(r=>!filter.value || r.kind === filter.value).sort((a,b)=>b.date.localeCompare(a.date));
    root.querySelector('[data-note-total]').textContent = money(rows.reduce((s,r)=>s+r.amount,0));
    root.querySelector('tbody').innerHTML = shown.map(r=>`<tr><td>${prettyDate(r.date)}</td><td>${t(...kinds.find(k=>k[0]===r.kind).slice(1))}</td><td>${h(r.note)}</td><td>${r.kind === 'note' ? '—' : money(r.amount)}</td><td><button type="button" data-note-edit="${h(r.id)}">${t('এডিট','Edit')}</button><button type="button" data-note-delete="${h(r.id)}">${t('মুছুন','Remove')}</button></td></tr>`).join('');
    root.querySelector('.personal-empty').textContent = shown.length ? '' : t('এখন কোনো লেখা নেই। ওপরের ঘরে প্রথম খরচ বা নোট লিখুন।','No entries yet. Add your first expense or note above.');
  };
  const reset = () => { form.reset(); form.elements.id.value=''; form.elements.amount.disabled=false; form.elements.amount.required=true; root.querySelector('[data-note-cancel]').hidden=true; };
  filter.addEventListener('change',draw);
  form.elements.kind.addEventListener('change',()=>{ const note=form.elements.kind.value==='note'; form.elements.amount.disabled=note; form.elements.amount.required=!note; });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form)), text = String(v.amount || '').replace(/[০-৯]/g,d=>'০১২৩৪৫৬৭৮৯'.indexOf(d));
    const amount=v.kind==='note' ? 0 : /^\d+(?:\.\d{1,2})?$/.test(text) ? Number(text) : NaN;
    if (!validDate(v.date) || v.date > today || !kinds.some(k=>k[0]===v.kind) || !v.note.trim() || !Number.isFinite(amount) || amount<0 || amount>100000000) { status(t('তারিখ, বিবরণ ও টাকার পরিমাণ মিলিয়ে দিন।','Check the date, description and amount.')); return; }
    const row={id:v.id || crypto.randomUUID(),date:v.date,kind:v.kind,note:v.note.trim().slice(0,240),amount};
    if(persist(v.id ? rows.map(r=>r.id===v.id?row:r) : [row,...rows])) { reset(); draw(); status(t('খাতায় সেভ হয়েছে।','Entry saved.')); }
  });
  root.addEventListener('click',e=>{
    const edit=e.target.closest('[data-note-edit]'), del=e.target.closest('[data-note-delete]');
    if(e.target.closest('[data-note-cancel]')) { reset(); status(''); }
    if(edit) { const row=rows.find(r=>r.id===edit.dataset.noteEdit); for(const k of ['id','date','kind','amount','note']) form.elements[k].value=row[k]; form.elements.kind.dispatchEvent(new Event('change')); root.querySelector('[data-note-cancel]').hidden=false; form.elements.note.focus(); }
    if(del) { const row=rows.find(r=>r.id===del.dataset.noteDelete); if(persist(rows.filter(r=>r.id!==row.id))) { undo=row; reset(); draw(); status(t('মুছে ফেলা হয়েছে।','Entry removed.')); const b=document.createElement('button'); b.type='button'; b.textContent=t('ফিরিয়ে আনুন','Undo'); b.addEventListener('click',()=>{if(undo && persist([...rows,undo])) {undo=null;draw();status(t('ফিরিয়ে আনা হয়েছে।','Entry restored.'));}}); root.querySelector('.personal-status').append(' ',b); } }
  });
  draw();
}
