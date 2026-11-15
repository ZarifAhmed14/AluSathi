import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ImagePlus, MapPin, MessageCircle, Package, Phone, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DISTRICT_NAMES } from "@/lib/district-names";
import { notebookToday } from "@/lib/notebook";
import { demoBuyerInterests } from "@/lib/demo-buyer-interests";
import { buyerInterests, draftKey, formDraftKey, marketEvent, ownLots, providedPhotos, publishLot, readObject, salePhoto, savedPhotos, text, type BuyerInterest, type SaleLot, type ListingDetails } from "@/lib/farmer-market";
import "@/farmer-market.css";
import { record } from "@/lib/farmer-market";

export default function FarmerMarketPages({view, district}: {view: "market" | "interest" | "my-listings"; district: string}) {
  const {language} = useLanguage(), bn = language === "bn";
  const t = (a:string,b:string) => bn ? a : b;
  const n = (value:number) => value.toLocaleString(bn ? "bn-BD" : "en-BD", {maximumFractionDigits: 2});
  const money = (value:number) => `৳${n(value)}`;
  const [draft] = useState(() => readObject(draftKey));
  const [unfinished] = useState(() => readObject(formDraftKey));
  const [details,setDetails] = useState<ListingDetails>(() => Object.fromEntries(["variety","notes","harvestDate","storageDescription","country","purpose","batchCode","packedMonth"].map(key => [key,text(record(unfinished.details)[key] ?? draft[key],key === "notes" ? 300 : key === "storageDescription" ? 200 : 60)])) as ListingDetails);
  const [pickupDays,setPickupDays] = useState([14,30].includes(Number(unfinished.pickupDays)) ? Number(unfinished.pickupDays) : 0);
  const [pickupChanged, setPickupChanged] = useState(false);
  const [quantity,setQuantity] = useState(typeof unfinished.quantity === "string" ? unfinished.quantity : String(draft.quantityKg || ""));
  const [price,setPrice] = useState(typeof unfinished.price === "string" ? unfinished.price : String(draft.askingPriceKg || ""));
  const [photos,setPhotos] = useState(() => savedPhotos(unfinished.photos ?? draft.photos));
  const [editing,setEditing] = useState(text(unfinished.editingId,100));
  const [draftWarning,setDraftWarning] = useState("");
  const [lots,setLots] = useState(ownLots), [interests,setInterests] = useState(buyerInterests);
  const [saved,setSaved] = useState<SaleLot | null>(null), [error,setError] = useState("");
  const [busy,setBusy] = useState(false), lock = useRef(false);
  const [filter,setFilter] = useState("all"), [contact,setContact] = useState<string | null>(null);
  const [showExamples,setShowExamples] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null), success = useRef<HTMLDivElement>(null);
  const profile = readObject("alusathi-farmer-profile-v1");
  const editLot = lots.find(l=>l.id===editing);
  const [area, setArea] = useState(() => editLot?.district || text(profile.district,60) || district);
  const [upazila, setUpazila] = useState(() => text(editLot?.upazila || profile.upazila || draft.upazila,60));
  const [editLocation, setEditLocation] = useState(false);
  const place = [upazila, bn ? DISTRICT_NAMES[area] || area : area].filter(Boolean).join(", ");
  function updateForm(values: {quantity?:string; price?:string; photos?:{src:string}[]; editingId?:string; details?:ListingDetails; pickupDays?:number}) {
    const next={quantity:values.quantity ?? quantity,price:values.price ?? price,photos:values.photos ?? photos,editingId:values.editingId ?? editing,details:values.details ?? details,pickupDays:values.pickupDays ?? pickupDays};
    setQuantity(next.quantity);setPrice(next.price);setPhotos(next.photos);setEditing(next.editingId);setDetails(next.details);setPickupDays(next.pickupDays);
    try { localStorage.setItem(formDraftKey,JSON.stringify(next));setDraftWarning(""); }
    catch { setDraftWarning(t("লেখা এই মুহূর্তে রাখা যায়নি। পাতা ছাড়ার আগে আবার চেষ্টা করুন।", "Could not save your unfinished details. Try again before leaving this page.")); }
  }
  function startNew() { setSaved(null);setError("");updateForm({quantity:"",price:"",photos:[],editingId:"",details:{variety:"",notes:"",harvestDate:"",storageDescription:""}}); }
  useEffect(() => {
    const refresh = () => { setLots(ownLots()); setInterests(buyerInterests()); };
    window.addEventListener("storage",refresh); window.addEventListener("focus",refresh); window.addEventListener(marketEvent,refresh);
    refresh(); return () => { window.removeEventListener("storage",refresh); window.removeEventListener("focus",refresh); window.removeEventListener(marketEvent,refresh); };
  }, []);
  useEffect(() => { if (saved) success.current?.focus(); }, [saved]);
  async function addPhotos(files: FileList | null) {
    if (!files?.length || lock.current) return;
    setError(""); if (files.length > 3) { setError(t("সর্বোচ্চ ৩টি ছবি দিন।", "Add up to 3 photos.")); return; }
    lock.current = true; setBusy(true);
    try { updateForm({photos:await Promise.all(Array.from(files).map(salePhoto))}); }
    catch { setError(t("ছবি রাখা যায়নি। JPG, PNG বা WEBP দিন; প্রতিটি ২ MB-এর মধ্যে।", "Could not add photos. Use JPG, PNG or WebP photos, up to 2 MB each.")); }
    finally { lock.current = false; setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  function publish(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    setError(""); lock.current = true;
    try { setSaved(publishLot(quantity,price,photos,area,editing || undefined,details,pickupDays,upazila,!editing || pickupChanged));updateForm({quantity:"",price:"",photos:[],editingId:"",pickupDays:0,details:{variety:"",notes:"",harvestDate:"",storageDescription:""}}); }
    catch (reason) { setError(reason instanceof Error && reason.message === "harvest" ? t("আলু তোলার সঠিক তারিখ দিন—ভবিষ্যতের নয়।", "Please check the harvest date. It cannot be in the future.") : reason instanceof Error && reason.message === "invalid" ? t("পরিমাণ, দাম ও অন্তত একটি ছবি দিন। এলাকা প্রোফাইলে ঠিক করুন।", "Enter the quantity, price and at least 1 photo. Set your location in your profile.") : t("রাখা যায়নি। ব্রাউজারের জায়গা খালি করে আবার চেষ্টা করুন; আপনার লেখা আছে।", "Could not save. Free some space in this browser and try again. Your details are still here.")); }
    finally { lock.current = false; }
  }
  const current = interests.filter(item => !/^\d{4}-\d{2}-\d{2}$/.test(item.expires) || item.expires >= notebookToday());
  const exampleMode = showExamples || !current.length;
  const examples: BuyerInterest[] = demoBuyerInterests.map(item => ({id:item.id,buyer:bn ? item.nameBn : item.name,quantity:item.quantity,lot:bn ? "ডায়মন্ড" : item.variety,notes:bn ? item.noteBn : item.note,district:item.district,price:item.price,phone:"",whatsapp:"",expires:""}));
  const displayed = (exampleMode ? examples : current).filter(item => filter === "all" || item.district === area);
  const preview = (lot:SaleLot) => `/marketplace/buyer.html?lot=${encodeURIComponent(lot.id)}&preview=farmer#buyer-detail`;
  if (view === "my-listings") return <section className="farmer-market-page app-shell"><h1>{t("আমার তালিকা", "My listings")}</h1>{lots.length ? lots.map(lot=><article className="fm-form" key={lot.id}><h2>{lot.variety}</h2><p>{n(lot.quantityKg)} {t("কেজি", "kg")} · {money(lot.askingPriceKg)} / {t("কেজি", "kg")}</p><p>{lot.upazila}, {bn ? DISTRICT_NAMES[lot.district] || lot.district : lot.district}</p><button type="button" onClick={()=>{updateForm({editingId:lot.id,quantity:String(lot.quantityKg),price:String(lot.askingPriceKg),photos:lot.photos,details:{variety:lot.variety,notes:text(lot.notes,300),harvestDate:text(lot.harvestDate,10),storageDescription:text(lot.storageDescription,200)}});window.location.hash="market";}}>{t("এডিট করুন", "Edit")}</button> <a href={preview(lot)}>{t("তালিকা দেখুন", "View listing")}</a></article>) : <p>{t("এখনো কোনো তালিকা নেই।", "No listings yet.")}</p>}<Link to="/farmer#market">{t("আলু বাজারে দিন", "List for sale")}</Link></section>;
  return <section className="farmer-market-page app-shell" aria-labelledby="farmer-market-title">
    <header className="fm-heading"><p className="section-kicker">{view === "market" ? <Package size={18}/> : <Users size={18}/>} {t("কৃষক ও ক্রেতার যোগাযোগ", "Farmer and Buyer contact")}</p><h1 id="farmer-market-title">{view === "market" ? t("আলু বাজারে দিন", "List your potatoes for sale") : t("ক্রেতার আগ্রহ", "Buyer interest")}</h1><p>{view === "market" ? t("পরিমাণ, দাম আর ছবি দিন—ক্রেতারা আপনার আলু দেখতে পারবেন।", "Add quantity, asking price and photos so buyers can see your potatoes.") : t("আপনার আলু নিতে আগ্রহী ক্রেতার তথ্য দেখে সরাসরি কথা বলুন।", "See Buyers interested in your potatoes and contact them directly.")}</p></header>
    {view === "market" ? <>
      {saved ? <div className="fm-success" ref={success} tabIndex={-1}><span><Check size={28}/></span><h2>{t("বাজারের তালিকায় রাখা হয়েছে", "Successfully listed")}</h2><p>{n(saved.quantityKg)} {t("কেজি", "kg")} · {money(saved.askingPriceKg)} / {t("কেজি", "kg")}</p><div className="fm-actions"><a className="main-button" href={preview(saved)} target="_blank" rel="noopener noreferrer">{t("ক্রেতার পাতায় দেখুন", "View Buyer page")}<ArrowRight size={18}/></a><button className="secondary-main" onClick={startNew}>{t("আরও আলু যোগ করুন", "Add another lot")}</button></div><small>{t("এটি তালিকায় যোগ হয়েছে—বিক্রি হয়ে যায়নি।", "Listed does not mean sold.")}</small></div> : <form className="fm-form" onSubmit={publish} noValidate>
        {editing && <div className="fm-editing"><strong>{t("আগের তালিকা বদলাচ্ছেন", "Editing an existing listing")}</strong><button type="button" className="secondary-main" onClick={startNew}>{t("বাতিল করুন", "Cancel edit")}</button></div>}
        <div className="fm-location"><MapPin size={19}/><span>{place}</span><button type="button" onClick={()=>setEditLocation(!editLocation)}>{t("বদলান", "Edit area")}</button></div>
        {editLocation && <div className="fm-fields"><label>{t("জেলা", "District")}<select value={area} onChange={e=>setArea(e.target.value)}>{Object.entries(DISTRICT_NAMES).map(([id,name])=><option key={id} value={id}>{bn ? name : id}</option>)}</select></label><label>{t("উপজেলা", "Upazila")}<input value={upazila} maxLength={60} onChange={e=>setUpazila(e.target.value)}/></label><button type="button" onClick={()=>setEditLocation(false)}>{t("ঠিক আছে", "Done")}</button></div>}
        <div className="fm-fields"><label><span>{n(1)} · {t("কত কেজি বিক্রি করবেন?", "How many kg?")}</span><div className="fm-unit"><input name="quantityKg" inputMode="decimal" value={quantity} maxLength={12} onChange={e=>updateForm({quantity:e.target.value})} placeholder={t("যেমন ২০০", "e.g. 200")}/><b>{t("কেজি", "kg")}</b></div></label><label><span>{n(2)} · {t("প্রতি কেজি কত টাকা চান?", "Asking price per kg?")}</span><div className="fm-unit"><input name="askingPriceKg" inputMode="decimal" value={price} maxLength={10} onChange={e=>updateForm({price:e.target.value})} placeholder={t("যেমন ২২", "e.g. 22")}/><b>৳ / {t("কেজি", "kg")}</b></div></label>
          <label className="fm-pickup"><span>{n(3)} · {t("কবে থেকে নিতে পারবেন?", "When can buyers collect?")}</span><select name="pickupDays" value={editing && !pickupChanged ? -1 : pickupDays} onChange={e=>{setPickupChanged(true);updateForm({pickupDays:Number(e.target.value)});}}>{editing && !pickupChanged && <option value={-1}>{t("আগের তারিখ", "Existing date")}: {text(editLot?.readyDate,10)}</option>}<option value={0}>{t("আজ থেকে", "From today")}</option><option value={14}>{t("২ সপ্তাহ পর", "In 2 weeks")}</option><option value={30}>{t("১ মাস পর", "In 1 month")}</option></select></label>
        </div>
        <fieldset className="fm-photos"><legend>{n(4)} · {t("আলুর ছবি দিন", "Add potato photos")}</legend><p>{t("নিজের ছবি দিন, অথবা নিচের দেওয়া ছবি বাছুন।", "Upload your photos or choose the provided photos below.")}</p><div className="fm-photo-strip">{photos.map((p,i)=><div key={i}><img src={p.src} alt={`${t("বাছাই করা ছবি", "Selected photo")} ${i+1}`}/><button type="button" disabled={busy} aria-label={`${t("ছবি সরান", "Remove photo")} ${i+1}`} onClick={()=>updateForm({photos:photos.filter((_,index)=>index!==i)})}>×</button></div>)}<label className="fm-upload"><ImagePlus size={26}/><strong>{busy ? t("ছবি তৈরি হচ্ছে…", "Preparing photos…") : t("ছবি যোগ করুন", "Add photos")}</strong><small>JPG / PNG / WEBP · 2 MB · {t("সর্বোচ্চ ৩টি", "up to 3")}</small><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>void addPhotos(e.target.files)}/></label></div><div className="fm-provided-photos" aria-label={t("দেওয়া ছবি", "Provided photos")}>{providedPhotos.map((p,i)=><button type="button" key={p.src} disabled={busy} aria-label={`${t("দেওয়া ছবি", "Provided photo")} ${i+1}`} aria-pressed={photos.some(s=>s.src===p.src)} onClick={()=>updateForm({photos:photos.some(s=>s.src===p.src) ? photos.filter(s=>s.src!==p.src) : [...photos,p].slice(-3)})}><img src={p.src} alt=""/><span>{t("ছবি", "Photo")} {n(i+1)}{photos.some(s=>s.src===p.src) && <Check size={15}/>}</span></button>)}</div><button type="button" className="fm-provided" disabled={busy} onClick={()=>updateForm({photos:providedPhotos})}>{t("তিনটি ছবিই নিন", "Use all three photos")}</button></fieldset>
        <Link className="text-button" to="/selling-preparation#potato-details">{t("আলুর পরিচিতি (ঐচ্ছিক)", "Potato information (optional)")}</Link>
        {draftWarning && <p className="fm-error" role="status">{draftWarning}</p>}{error && <p className="fm-error" role="alert">{error}</p>}<div className="fm-form-bottom"><p>{t("ক্রেতা যোগাযোগ করবেন। কেনাবেচার সিদ্ধান্ত আপনারা নেবেন।", "Buyers contact you. You decide any sale together.")}</p><button className="main-button" type="submit" disabled={busy}>{editing ? t("পরিবর্তন রাখুন", "Save changes") : t("বাজারে ছাড়ুন", "List for sale")}<ArrowRight size={19}/></button></div>
      </form>}
      {saved && error && <p className="fm-error" role="alert">{error}</p>}
    </> : <>
      <div className="fm-example-bar"><div><strong>{exampleMode ? t("ক্রেতার আগ্রহের উদাহরণ", "Example buyer enquiries") : t("আপনার ক্রেতার আগ্রহ", "Your buyer enquiries")}</strong><p>{exampleMode ? t("এই তালিকায় যোগাযোগের নম্বর নেই; কোনো বিজ্ঞপ্তি পাঠানো হয় না।", "These examples have no contact numbers. No notifications are sent.") : t("ক্রেতার সঙ্গে কথা বলুন। দর ও কেনাবেচা আপনারা বাইরে ঠিক করবেন।", "Talk directly. Agree any price and sale outside AluSathi.")}</p></div>{current.length > 0 && <button className="secondary-main" onClick={()=>{setShowExamples(!showExamples);setContact(null)}}>{exampleMode ? t("আসল আগ্রহ দেখুন", "Show actual enquiries") : t("উদাহরণ দেখুন", "View examples")}</button>}</div><div className="fm-interest-toolbar"><div className="fm-filters" aria-label={t("ক্রেতার তালিকা বাছুন", "Filter enquiries")}>{[["area",t("আমার জেলা", "My district")],["all",t("সব ক্রেতা", "All buyers")]].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div><span>{t("এলাকা", "Area")}: {bn ? DISTRICT_NAMES[area] || area : area}</span></div>
      <div className="fm-interest-list">{displayed.length ? displayed.map(item=><article key={item.id}>
        <div className="fm-buyer-avatar"><Users size={25}/></div><div className="fm-buyer-copy">
          {exampleMode && <span className="fm-example-label">{t("উদাহরণ", "Example")}</span>}<h2>{item.buyer || t("ক্রেতা", "Buyer")}</h2><p>{n(item.quantity)} {t("কেজি আলু নিতে আগ্রহী", "kg of potatoes wanted")} · {bn ? DISTRICT_NAMES[item.district] || item.district : item.district}</p>
          <dl><div><dt>{t("আলু", "Potatoes")}</dt><dd>{item.lot === "Potatoes" ? t("আলু", "Potatoes") : item.lot}</dd></div><div><dt>{item.contactOnly ? t("তালিকায় দেখানো দাম", "Listed asking price") : t("ক্রেতার বলা দাম", "Buyer’s stated price")}</dt><dd>{item.price ? `${money(item.price)} / ${t("কেজি", "kg")}` : t("কথা বলে জানুন", "Ask the buyer")}</dd></div><div><dt>{item.contactOnly ? t("ওই দরে মোট", "Total at that price") : t("মোট", "Total")}</dt><dd>{item.price ? money(item.quantity * item.price) : "—"}</dd></div></dl>
          {item.contactOnly && <p className="fm-enquiry-note">{t("এটি শুধু আগ্রহের খবর, দামে সম্মতি বা কেনাকাটা নয়।", "This is only an enquiry. It is not an agreed price or purchase.")}</p>}
          {exampleMode && <p className="fm-example-description">{item.notes}</p>}{!exampleMode && item.notes && <details><summary>{t("আরও কথা", "Notes")}</summary><p>{item.notes}</p></details>}
          <button className="secondary-main" aria-expanded={contact===item.id} onClick={()=>setContact(contact===item.id ? null : item.id)}><MessageCircle size={18}/>{t("যোগাযোগ করুন", "Contact buyer")}</button>
          {contact===item.id && <div className="fm-contact">{item.phone && <a className="main-button" href={`tel:${item.phone}`}><Phone size={17}/>{t("ফোন করুন", "Call")}</a>}{item.whatsapp && <a className="secondary-main" href={`https://wa.me/${item.whatsapp.replace(/^\+/,"")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{!item.phone && !item.whatsapp && <p>{exampleMode ? t("আসল ক্রেতা নম্বর দিলে এখানে ফোন ও WhatsApp বোতাম দেখা যাবে। উদাহরণ থেকে কাউকে কল করা যাবে না।", "Call and WhatsApp appear here if a Buyer shares a number. You cannot call anyone from an example.") : t("এই ক্রেতার যোগাযোগের নম্বর রাখা নেই।", "No contact number is saved for this buyer.")}</p>}</div>}
        </div></article>) : <div className="fm-empty fm-interest-empty"><Users size={36}/><h2>{t("এখন কোনো ক্রেতার খবর নেই", "No buyer enquiries here yet")}</h2><p>{filter === "area" && current.length ? t("আপনার জেলার জন্য চাহিদা নেই। অন্য জেলার ক্রেতাদেরও দেখতে পারেন।", "No enquiries match your district. You can also check other districts.") : t("আলু বাজারে রাখুন। এখানে ক্রেতার আগ্রহের তথ্য থাকলে দেখতে পারবেন।", "List your potatoes for sale. Any saved Buyer enquiries will appear here.")}</p><Link className="main-button" to="/farmer#market">{t("আলু বাজারে দিন", "List for sale")}<ArrowRight size={18}/></Link></div>}</div>
      <p className="fm-footnote">{t("এখানে রাখা আগ্রহের তথ্য দেখা যাচ্ছে; নতুন খবর অন্য ফোন থেকে নিজে আসবে না। যোগাযোগ মানেই বিক্রি নয়।", "These enquiries are saved in this browser. New enquiries from other devices do not appear automatically. Contact does not confirm a sale.")}</p>
    </>}
  </section>;
}
