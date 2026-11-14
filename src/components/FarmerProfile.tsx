import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Camera, Check, MapPin, Package, Plus, Phone, Sprout, UserRound } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DISTRICT_NAMES } from "@/lib/district-names";
import { FARMER_LOCATIONS } from "@/data/farmer-locations";
import { PROFILE_CHANGED } from "@/lib/farmer-profile";
import { marketEvent, ownLots, phoneLink, photoSource, readObject, record, profilePhoto, text as safeText, type SaleLot } from "@/lib/farmer-market";
import { notebookToday, validDay } from "@/lib/notebook";
import "@/farmer-profile.css";

const key = "alusathi-farmer-profile-v1";
type Profile = { photo?: string; name?: string; district?: string; upazila?: string; village?: string; phone?: string; whatsapp?: string; land?: string; landUnit?: string; tenure?: string; preferredLanguage?: string; contactSharingEnabled?: boolean };
function readProfile(): Profile {
  try {
    const value=JSON.parse(localStorage.getItem(key) || "{}");
    if(!value||typeof value!=="object"||Array.isArray(value))return {};
    for(const field of ["name","district","upazila","village","phone","whatsapp","land","landUnit","tenure","preferredLanguage"])if(typeof value[field]!=="string")delete value[field];
    if(typeof value.contactSharingEnabled!=="boolean")delete value.contactSharingEnabled;
    value.photo = photoSource(value.photo);
    return value;
  } catch { return {}; }
}

export default function FarmerProfile() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [status, setStatus] = useState("");
  const [failed,setFailed]=useState(false);
  const [busy, setBusy] = useState(false);
  const photoRequest = useRef(0);
  const [failedPhoto, setFailedPhoto] = useState("");
  const [lots, setLots] = useState(ownLots);
  const [market, setMarket] = useState(() => readObject("alusathi-marketplace-pilot-v1"));
  const location=useLocation();
  useEffect(()=>{
    const requests=photoRequest;
    requests.current++;setBusy(false);
    if(location.hash==="#profile"){setProfile(readProfile());setStatus("");}
    return()=>{requests.current++;};
  },[location.key,location.hash]);
  useEffect(() => {
    const refresh = () => { setLots(ownLots()); setMarket(readObject("alusathi-marketplace-pilot-v1")); };
    refresh();
    window.addEventListener(marketEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(marketEvent, refresh); window.removeEventListener("storage", refresh); };
  }, [location.key]);
  const text = (bengali: string, english: string) => bn ? bengali : english;
  const upazilas = FARMER_LOCATIONS[profile.district || ""]?.upazilas || [];
  const selectedUpazila = upazilas.find(place => [place.en, place.bn].some(name => name.normalize("NFC") === profile.upazila?.normalize("NFC")))?.en || "";
  const number = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-BD", {maximumFractionDigits: 2});
  function remaining(lot: SaleLot) {
    const deals = Array.isArray(market.deals) ? market.deals : [];
    const committed = deals.reduce((sum: number, raw: unknown) => {
      const deal = record(raw);
      if (deal.lotId !== lot.id) return sum;
      const kg = ["collected", "payment_pending", "paid"].includes(String(deal.status)) ? deal.actualAcceptedKg : deal.quantityKg;
      return sum + (typeof kg === "number" && Number.isFinite(kg) && kg > 0 ? kg : 0);
    }, 0);
    return Math.max(0, lot.quantityKg - committed);
  }
  async function upload(file?: File) {
    if (!file) return;
    const request=++photoRequest.current;
    setBusy(true); setStatus("");
    try {
      const photo = await profilePhoto(file);
      if(request!==photoRequest.current) return;
      setProfile(current => ({...current, photo: photo.src}));
      setFailed(false);
    } catch { if(request!==photoRequest.current) return;setFailed(true); setStatus(text("ছবিটি নেওয়া যায়নি। ৫০ MB-এর মধ্যে একটি বৈধ JPG, PNG বা WebP ছবি দিন।", "Could not read this photo. Choose a valid JPG, PNG or WebP image under 50 MB.")); }
    finally { if(request===photoRequest.current) setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy) return;
    const form = new FormData(event.currentTarget);
    const next = Object.fromEntries(["name", "district", "upazila", "village", "phone", "whatsapp", "land", "landUnit"].map(field => [field, String(form.get(field) || "").trim().slice(0, field === "phone" || field === "whatsapp" ? 25 : 100)])) as Profile;
    next.photo = photoSource(profile.photo);
    next.contactSharingEnabled = form.get("contactSharingEnabled") === "on";
    setFailed(true);
    if(next.district&&!Object.prototype.hasOwnProperty.call(FARMER_LOCATIONS,next.district)){setStatus(text("তালিকা থেকে জেলা বাছুন।", "Choose a listed district."));return;}
    if(next.upazila && !FARMER_LOCATIONS[next.district || ""]?.upazilas.some(place => place.en === next.upazila)){setStatus(text("নির্বাচিত জেলার উপজেলা বাছুন।", "Choose an upazila in the selected district."));return;}
    for(const field of ["phone","whatsapp"] as const){
      const value=(next[field]||"").replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));
      if(value&&!phoneLink(value)){setStatus(text("ফোন বা WhatsApp নম্বরটি ঠিক করে লিখুন।", "Enter a valid phone or WhatsApp number."));return;}
      next[field]=value?phoneLink(value):"";
    }
    if(next.contactSharingEnabled&&!next.phone&&!next.whatsapp){setStatus(text("যোগাযোগ দেখাতে আগে ফোন বা WhatsApp নম্বর দিন।", "Add a phone or WhatsApp number before sharing contact details."));return;}
    if(next.land)next.land=next.land.replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    const land = next.land ? Number(next.land) : null;
    if (land !== null && (!/^\d+(?:\.\d+)?$/.test(next.land!) || !Number.isFinite(land) || land <= 0 || land > 100000 || !["decimal","acre","bigha","hectare"].includes(next.landUnit||""))) { setStatus(text("জমির পরিমাণ ঠিক করে দিন।", "Enter a valid land area.")); return; }
    try { const saved = {...readProfile(), ...next}; localStorage.setItem(key, JSON.stringify(saved)); window.dispatchEvent(new Event(PROFILE_CHANGED)); setProfile(saved); setFailed(false); setStatus(text("প্রোফাইল সেভ হয়েছে।", "Profile saved.")); }
    catch { setStatus(text("সেভ হয়নি। ব্রাউজারে জায়গা খালি করে আবার চেষ্টা করুন।", "Could not save. Free browser storage and try again.")); }
  }
  const labelClass = "farmer-profile-field";
  return <section className="app-shell farmer-profile-page" aria-labelledby="profile-title"><header><div><p className="section-kicker">{text("আমার পরিচয়", "MY ACCOUNT")}</p><h1 id="profile-title">{text("কৃষকের প্রোফাইল", "Farmer profile")}</h1><p>{text("আপনার পরিচয়, জমি আর বিক্রির আলু—এক জায়গায়।", "Your details, land and potatoes for sale, together.")}</p></div><span className="profile-role"><Sprout size={17}/>{text("কৃষক", "Farmer")}</span></header><div className="profile-account-card"><form className="farmer-profile-form" onSubmit={save} onChange={()=>setStatus("")}>
    <section className="profile-photo-section" aria-labelledby="profile-photo-title"><div className="profile-photo-preview">{profile.photo && profile.photo !== failedPhoto ? <img src={profile.photo} alt={text("আপনার প্রোফাইল ছবি", "Your profile picture")} onError={()=>setFailedPhoto(profile.photo || "")}/> : <UserRound size={42} aria-hidden="true"/>}<span aria-hidden="true"><Camera size={16}/></span></div><div><h2 id="profile-photo-title">{text("প্রোফাইল ছবি", "Profile picture")}</h2><p>{text("নিজের একটি পরিষ্কার ছবি দিন।", "Add a clear photo of yourself.")}</p><div className="profile-photo-controls"><label className="profile-upload-button"><Camera size={17}/>{busy ? text("ছবি তৈরি হচ্ছে…", "Preparing photo…") : text("ছবি যোগ করুন", "Upload photo")}<input type="file" aria-label={text("প্রোফাইল ছবি আপলোড", "Upload profile picture")} accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{void upload(event.target.files?.[0]);event.target.value="";}}/></label>{profile.photo && <button type="button" disabled={busy} onClick={()=>{setProfile({...profile,photo:""});setStatus("");}}>{text("ছবি সরান", "Remove photo")}</button>}</div><small>JPG, PNG, WebP</small></div></section>
    <fieldset><legend><UserRound size={20}/>{text("ব্যক্তিগত তথ্য", "Personal details")}</legend><div className="profile-fields">
    <label className={labelClass}>{text("নাম", "Name")}<input name="name" maxLength={100} value={profile.name || ""} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
    <label className={labelClass}>{text("জেলা", "District")}<select name="district" value={profile.district || ""} onChange={e => setProfile({ ...profile, district: e.target.value, upazila: "" })}><option value="">{text("জেলা নির্বাচন করুন", "Choose a district")}</option>{Object.entries(DISTRICT_NAMES).filter(([id]) => id !== "Other").map(([id, name]) => <option key={id} value={id}>{bn ? name : id}</option>)}</select></label>
    <label className={labelClass}>{text("উপজেলা", "Upazila")}<select name="upazila" value={selectedUpazila} disabled={!profile.district || !upazilas.length} aria-describedby={!profile.district ? "profile-upazila-help" : undefined} onChange={e => setProfile({ ...profile, upazila: e.target.value })}><option value="">{!profile.district ? text("আগে জেলা নির্বাচন করুন", "Choose a district first") : text("উপজেলা নির্বাচন করুন", "Choose an upazila")}</option>{upazilas.map(place => <option key={place.en} value={place.en}>{bn ? place.bn : place.en}</option>)}</select>{!profile.district && <small id="profile-upazila-help">{text("আগে জেলা নির্বাচন করুন।", "Please choose a district first.")}</small>}</label>
    <label className={labelClass}>{text("গ্রাম (ঐচ্ছিক)", "Village (optional)")}<input name="village" maxLength={80} value={profile.village || ""} onChange={e => setProfile({ ...profile, village: e.target.value })} /></label>
    </div></fieldset>
    <fieldset><legend><Phone size={21}/>{text("যোগাযোগের নম্বর", "Contact numbers")}</legend><p>{text("ক্রেতা কোন নম্বরে কথা বলবেন, তা লিখে রাখুন।", "Save the numbers buyers can use to reach you.")}</p><div className="profile-fields">
    <label className={labelClass}>{text("ফোন", "Phone")}<input name="phone" type="tel" autoComplete="tel" maxLength={25} value={profile.phone || ""} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></label>
    <label className={labelClass}>WhatsApp<input name="whatsapp" type="tel" maxLength={25} value={profile.whatsapp || ""} onChange={e => setProfile({ ...profile, whatsapp: e.target.value })} /></label>
    </div><label className="profile-sharing"><input name="contactSharingEnabled" type="checkbox" checked={Boolean(profile.contactSharingEnabled)} onChange={e => setProfile({ ...profile, contactSharingEnabled: e.target.checked })} /><span>{text("আলুর লটের সঙ্গে আমার ফোন ও WhatsApp দেখান", "Show my phone and WhatsApp with my potato lots")}<small>{text("ক্রেতা সরাসরি কথা বলবেন। কেনাবেচা আলুসাথীর বাইরে হবে।", "Buyers contact you directly. Buying and selling happen outside AluSathi.")}</small></span></label></fieldset>
    <fieldset><legend><Sprout size={21}/>{text("জমির তথ্য", "Your land")}</legend><div className="profile-fields">
    <label className={labelClass}>{text("চাষের জমি", "Cultivated land")}<input name="land" inputMode="decimal" maxLength={12} value={profile.land || ""} onChange={e => setProfile({ ...profile, land: e.target.value })} /></label>
    <label className={labelClass}>{text("জমির একক", "Land unit")}<select name="landUnit" value={profile.landUnit || "decimal"} onChange={e => setProfile({ ...profile, landUnit: e.target.value })}><option value="decimal">{text("শতক", "Shotok")}</option><option value="acre">{text("একর", "Acres")}</option><option value="bigha">{text("বিঘা", "Bigha")}</option><option value="hectare">{text("হেক্টর", "Hectares")}</option></select></label>
    </div></fieldset>
    <div className="farmer-profile-actions"><button className="secondary-main" type="button" disabled={busy} onClick={()=>{setProfile(readProfile());setStatus("");}}>{text("বাতিল করুন", "Cancel")}</button><button className="main-button" type="submit" disabled={busy}><Check size={18}/>{text("সেভ করুন", "Save profile")}</button></div>{status && <p role={failed?"alert":"status"} className="farmer-profile-status">{status}</p>}
  </form></div>
  <section className="profile-sale-section" aria-labelledby="profile-listings-title"><header><div><p className="section-kicker">{text("আমার তালিকা", "MY LISTINGS")}</p><h2 id="profile-listings-title">{text("বিক্রির জন্য আলু", "Potatoes for sale")}</h2></div><Link className="secondary-main" to="/farmer#market"><Plus size={18}/>{text("আলু যোগ করুন", "Add potatoes")}</Link></header>
    {lots.length ? <div className="profile-listings">{lots.map(lot=>{const kg=remaining(lot),ready=safeText(lot.readyDate,10),dated=validDay(ready);return <article className="profile-lot" key={lot.id}>{lot.photos[0] ? <img src={lot.photos[0].src} alt={lot.variety} loading="lazy"/> : <span className="profile-lot-placeholder"><Package size={30}/></span>}<div className="profile-lot-body"><div className="profile-lot-heading"><h3>{lot.variety === "Potatoes" ? text("আলু", "Potatoes") : lot.variety}</h3><span className={lot.hiddenAt || !kg ? "profile-lot-status muted" : "profile-lot-status"}>{lot.hiddenAt ? text("লুকানো", "Hidden") : !kg ? text("অবশিষ্ট নেই", "None remaining") : dated && ready > notebookToday() ? text("শিগগির পাওয়া যাবে", "Available soon") : dated ? text("নেওয়া যাবে", "Ready to collect") : text("তারিখ দেওয়া নেই", "Date not set")}</span></div><p><MapPin size={15}/>{[lot.upazila,bn ? DISTRICT_NAMES[lot.district] || lot.district : lot.district].filter(Boolean).join(", ")}</p><dl><div><dt>{text("অবশিষ্ট পরিমাণ", "Remaining quantity")}</dt><dd>{number(kg)} {text("কেজি", "kg")}</dd></div><div><dt>{text("নেওয়ার তারিখ", "Collection date")}</dt><dd>{dated ? new Date(`${ready}T12:00:00`).toLocaleDateString(bn ? "bn-BD" : "en-GB",{day:"numeric",month:"short",year:"numeric"}) : text("দেওয়া নেই", "Not provided")}</dd></div></dl><Link to="/farmer#my-listings">{text("তালিকা দেখুন ও বদলান", "View and manage listing")} →</Link></div></article>;})}</div> : <div className="profile-listings-empty"><span><Package size={28}/></span><h3>{text("বিক্রির আলু এখনো যোগ করেননি", "No potatoes listed yet")}</h3><p>{text("আলুর ছবি, পরিমাণ ও নেওয়ার সময় দিলে এখানে দেখা যাবে।", "Add photos, quantity and collection time to see your potatoes here.")}</p><Link className="main-button" to="/farmer#market"><Plus size={18}/>{text("প্রথম তালিকা যোগ করুন", "Add your first listing")}</Link></div>}
  </section></section>;
}
