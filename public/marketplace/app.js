import { initialData, catalogueListings, estimateOffer, availableKg, storageBreakEven, todayPlus } from "./market.mjs";
import { offerSummary, offerTerms, passportDocument, passportText } from "./lot-tools.mjs";
import { potatoDetailsForm, readPotatoDraft, potatoDraftKey } from "./potato-details.mjs";
import { mountTransport, disposeTransport } from "./transport.mjs";
import { mountBuyerTransport } from "./buyer-transport.mjs";
import { districtPlaces } from "./districts.mjs";
import { prepareDemoForms } from "./demo-forms.mjs";
import { notebook, mountNotebook } from "./buyer-personal.mjs";
import { buyerExamples } from "./buyer-examples.mjs";
import { renderBuyerProfile as renderBuyerAccount, mountBuyerProfile, profileAvatar, mountProfileAvatars } from "./buyer-profile.mjs";
import { workspace, mountWorkspace, keepContact, mountWeightConverter, enquiryQuestions } from "./buyer-workspace.mjs";

const storeKey = "alusathi-marketplace-pilot-v1";
const SALES_FEATURE_ENABLED = false;
const langKey = "alusathi-marketplace-language";
const app = document.querySelector("#app");
let providers = null;
let formatter = new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 });
let rateFormatter = new Intl.NumberFormat("bn-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const varieties = [["Diamant", "ডায়মন্ড"], ["Cardinal", "কার্ডিনাল"], ["Granola", "গ্রানোলা"], ["Asterix", "অ্যাস্টেরিক্স"], ["Lady Rosetta", "লেডি রোসেটা"], ["Courage", "কারেজ"]];
let notesRecognition = null;
function stopNotesVoice() {
  if (notesRecognition) { notesRecognition.abort(); notesRecognition = null; }
}
function dictateNotes(button) {
  if (notesRecognition) { stopNotesVoice(); return; }
  const form = button.closest("form"), field = form.elements.notes;
  const status = form.querySelector(".notes-status");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { status.textContent = t("এই ব্রাউজারে বলা থেকে লেখা হয় না। নিচে লিখে দিন।", "Voice input is unavailable here. Please type your note."); field.focus(); return; }
  const recognition = new Recognition();
  notesRecognition = recognition;
  recognition.lang = language === "bn" ? "bn-BD" : "en-GB";
  recognition.interimResults = false;
  const previous = field.value.trim();
  button.textContent = t("থামান", "Stop"); button.setAttribute("aria-pressed", "true");
  status.textContent = t("বলুন, আপনার কথা এখানে লেখা হবে।", "Speak. Your words will appear below.");
  recognition.onresult = event => {
    const words = Array.from(event.results).filter(r => r.isFinal).map(r => r[0].transcript).join(" ");
    field.value = [previous, words].filter(Boolean).join(" ").slice(0, 300);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    status.textContent = t("লেখাটি মিলিয়ে নিন। চাইলে ঠিক করতে পারবেন।", "Check the text. You can edit it.");
  };
  recognition.onerror = () => { status.textContent = t("কথা শোনা যায়নি। মাইক্রোফোন চালু করে আবার বলুন, বা লিখে দিন।", "Could not hear you. Allow the microphone and retry, or type instead."); };
  recognition.onend = () => { if (notesRecognition === recognition) notesRecognition = null; button.textContent = t("বলুন", "Speak"); button.setAttribute("aria-pressed", "false"); };
  try { recognition.start(); } catch { recognition.onend(); status.textContent = t("আবার চেষ্টা করুন, বা লিখে দিন।", "Try again, or type your note."); }
}
const districts = [...Object.keys(districtPlaces), "Other"];
const districtNamesBn = Object.fromEntries(Object.entries(districtPlaces).map(([name, place]) => [name, place.bn]));
districtNamesBn.Other = "অন্য জেলা";
const iconPaths = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  camera: '<path d="M14 4h-4L8 7H3v13h18V7h-5l-2-3Z"/><circle cx="12" cy="13" r="3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A20 20 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.7L7.8 9.4a16 16 0 0 0 6.8 6.8l1.2-1.2a2 2 0 0 1 1.7-.6l2.8.5a2 2 0 0 1 1.7 2Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  bag: '<path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8c0-2 1-4 3-4s3 2 3 4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M20 4C9 4 4 9 4 16a4 4 0 0 0 4 4c7 0 12-5 12-16Z"/><path d="M5 19c4-5 8-8 13-10"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  scale: '<path d="M12 3v18M5 7h14M4 8l-2 5h5L4 8Zm16 0-3 5h6l-3-5ZM7 21h10"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z"/><path d="m9 11 2 2 4-4"/>',
  truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  warehouse: '<path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M7 21v-8h10v8M3 10h18"/>',
};
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
const t = (bn, en) => language === "bn" ? bn : en;
const h = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = value => `৳${formatter.format(Number(value) || 0)}`;
const rate = value => `৳${rateFormatter.format(Number(value) || 0)}`;
const kg = value => `${formatter.format(Number(value) || 0)} ${t("কেজি", "kg")}`;
const prettyDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(language === "bn" ? "bn-BD" : "en-BD", { day: "numeric", month: "short", year: "numeric" }) : "—";
const photoSrc = value => typeof value === "string" && value.length < 1_400_000 && (/^data:image\/jpeg;base64,[\w+/=]+$/.test(value) || value === "/marketplace/potato-harvest.png" || /^\/marketplace\/listing-photos\/(?:potato-0[123]|red-(?:crate|market|sacks|tray)|yellow-(?:basket|burlap|crates|display|small|sorted|table))\.webp$/.test(value)) ? value : "";
const uid = () => crypto.randomUUID();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    if (saved && ["listings", "offers", "deals", "quotes"].every(key => Array.isArray(saved[key]))) {
      const examples = initialData();
      saved.listings = [...saved.listings.filter(lot => !lot.sample), ...examples.listings];
      saved.offers = [...saved.offers.filter(offer => !offer.sample), ...examples.offers];
      saved.deals = saved.deals.filter(deal => !deal.sample);
      saved.quotes = saved.quotes.filter(quote => !quote.sample);
      return saved;
    }
  } catch { /* Invalid local demo data resets to the sample. */ }
  return initialData();
}

let data = load();
let language = (localStorage.getItem("alusathi-lang") || localStorage.getItem(langKey)) === "en" ? "en" : "bn";
function setNumberFormat() {
  const locale = language === "bn" ? "bn-BD" : "en-BD";
  formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  rateFormatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
setNumberFormat();
const role = ["farmer", "buyer"].includes(document.body.dataset.role) ? document.body.dataset.role : "choose";
const farmerPreview = role === "buyer" && new URLSearchParams(location.search).get("preview") === "farmer";
const publicPreview = role === "buyer" && new URLSearchParams(location.search).get("preview") === "public";
let showSamples = role === "farmer" && location.hash === "#samples";
const visibleListings = () => (role !== "farmer" || showSamples ? data.listings : data.listings.filter(item => !item.sample)).filter(item=>!item.archivedAt && !item.hiddenAt);
const visibleOffers = () => role !== "farmer" || showSamples ? data.offers : data.offers.filter(item => !item.sample && !data.listings.find(lot => lot.id === item.lotId)?.sample);
const visibleDeals = () => role !== "farmer" || showSamples ? data.deals : data.deals.filter(item => !item.sample);
const sessionKey = `alusathi-market-demo-${role}`;
let displayName = role === "farmer" ? "কৃষক" : "ক্রেতা";
try { if (role !== "choose" && !farmerPreview && !publicPreview) { sessionStorage.setItem("alusathi-role", role); sessionStorage.setItem("alusathi-demo", String(role === "farmer")); displayName = sessionStorage.getItem(sessionKey) || displayName; } } catch { /* Page remains usable without session storage. */ }
const buyerProfileKey = "alusathi-buyer-profile-v1";
function readBuyerProfile() {
  try { const value=JSON.parse(localStorage.getItem(buyerProfileKey) || "{}");return value && typeof value==='object' && !Array.isArray(value) ? value : {}; }
  catch {return {};}
}
let buyerProfile = readBuyerProfile();
let buyerProfileDraft = null;
const farmerProfileKey = "alusathi-farmer-profile-v1";
let farmerProfile = {};
try { farmerProfile = JSON.parse(localStorage.getItem(farmerProfileKey) || "{}") || {}; } catch { farmerProfile = {}; }
const buyerSavedKey = "alusathi-buyer-saved-v1";
const buyerCompareKey = "alusathi-buyer-compare-v1";
const legacyViews = ["purchases", "buyer-offers", "deals", "offers", "responses"];
const hiddenInitialView = !SALES_FEATURE_ENABLED && legacyViews.includes(location.hash.slice(1));
let buyerSaved = readIds(buyerSavedKey);
let buyerCompared = readIds(buyerCompareKey).slice(0, 4);
const practiceLots = buyerExamples(todayPlus(0));
let practiceCompared = practiceLots.map(lot => lot.id);
const buyerListing = id => data.listings.find(lot => lot.id === id) || practiceLots.find(lot => lot.id === id);
const planLots = () => {
  const selected = (catalogueSelection.length ? catalogueSelection : buyerCompared).map(buyerListing).filter(lot => lot && !lot.hiddenAt && !lot.archivedAt && availableKg(lot, data.deals) > 0);
  return selected.length ? selected : practiceLots.filter(lot => practiceCompared.includes(lot.id));
};
let buyerSearch = null;
let buyerSearchMessage = "";
let buyerSearchShowAll = false;
let buyerCataloguePage = 1;
let buyerCatalogueDistrict = "";
let buyerCatalogueVariety = "";
let buyerCatalogueQuantity = 0;
let publicSort = "";
let catalogueSelection = [];
let detailLotId = "";
let detailPhotoIndex = 0;
let catalogueReturnFocus = "";
let contactLotId = "";
let profileOpen = false;
let compareOpen = false;
let comparisonQuantity = 200;
let buyerPlan = readBuyerPlan();
let view = hiddenInitialView ? "unavailable" : ["#transport", "#deals", "#list", "#passport", "#offers", "#storage"].includes(location.hash) && role === "farmer" ? location.hash.slice(1) : role === "buyer" && ["#transport", "#buyer-plan", "#notebook", "#needs", "#contacts"].includes(location.hash) ? location.hash.slice(1) : location.hash === "#profile" ? "profile" : location.hash === "#saved" ? "saved" : "home";
let storageInputs = null;
let quoteOpen = false;
let selectedLotId = data.listings[0]?.id || "";
let draftLotId = "";
let reviewOfferId = "";
let notice = "";
let transportOfferId = "";

function readIds(key) { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter(item => typeof item === "string") : []; } catch { return []; } }

function summaryBlock(offer, quantity, open = false) {
  return `<details class="spoken-summary" ${open ? "open" : ""}><summary>${t("সহজ কথায় এই দর", "This offer in simple words")}</summary><p class="summary-text">${h(offerSummary(offer, quantity, language))}</p></details>`;
}

function renderPassport() {
  return potatoDetailsForm({t,h,profile:farmerProfile,district:localStorage.getItem('alusathi-district') || 'Rangpur',varieties,districtOptions,today:todayPlus(0),publish:view === 'list'});
}

function enhanceLotTools() {
  const form = document.querySelector("#lot-form");
  if (form && !form.closest('.sale-details-page')) {
    form.querySelector(".upload-box strong").textContent = t("সর্বোচ্চ ৩টি ছবি যোগ করুন", "Add up to 3 photos");
    form.querySelector(".upload-box small").textContent = t("ঐচ্ছিক · প্রতিটি সর্বোচ্চ ২ MB · শুধু এই ফোনে", "Optional · up to 2 MB each · stays on this device");
    form.elements.photo.multiple = true;
    const quantity = form.elements.quantityKg;
    quantity.closest("label").firstChild.textContent = t("মোট পরিমাণ", "Total quantity");
    quantity.closest("label").insertAdjacentHTML("afterend", `<label>${t("একক", "Unit")}<select name="quantityUnit"><option value="kg">${t("কেজি", "kg")}</option><option value="mon">${t("মণ", "mon")}</option><option value="bag">${t("বস্তা", "sacks")}</option></select></label><label class="bag-weight" hidden>${t("প্রতি বস্তায় কত কেজি?", "Kg in each sack?")}<input name="bagKg" type="number" min="1" max="100" step="1" inputmode="numeric" /></label><small class="quantity-conversion" aria-live="polite"></small>`);
    const unit = form.elements.quantityUnit, bagKg = form.elements.bagKg;
    const showConversion = () => {
      const isBag = unit.value === "bag";
      bagKg.closest("label").hidden = !isBag;
      bagKg.required = isBag;
      const factor = unit.value === "mon" ? 40 : isBag ? Number(bagKg.value) : 1;
      quantity.max = factor > 0 ? String(Math.floor(100000 / factor)) : "100000";
      quantity.setCustomValidity("");
      form.querySelector(".quantity-conversion").textContent = unit.value === "mon" ? t("হিসাব: ১ মণ = ৪০ কেজি। স্থানীয় বাজারে ওজন মিলিয়ে নিন।", "Using 1 mon = 40 kg; confirm your local market weight.") : isBag ? (factor > 0 && quantity.value ? `${t("মোট", "Total")}: ${kg(Number(quantity.value) * factor)} · ${t("বস্তার ওজন নিজে মিলিয়ে নিন", "Check the sack weight yourself")}` : t("বস্তার ওজন লিখুন; একেক জায়গায় আলাদা।", "Enter the weight per sack; it varies.")) : t("তথ্য কেজিতে রাখা হবে।", "The lot is saved in kg.");
    };
    let oldUnit = "kg";
    unit.addEventListener("change", () => {
      if (quantity.value && ["kg", "mon"].includes(oldUnit) && ["kg", "mon"].includes(unit.value)) quantity.value = String(Number(quantity.value) * (oldUnit === "mon" ? 40 : 1) / (unit.value === "mon" ? 40 : 1));
      else if (oldUnit !== unit.value) quantity.value = "";
      oldUnit = unit.value;
      showConversion();
    });
    quantity.addEventListener("input", showConversion);
    bagKg.addEventListener("input", showConversion);
    showConversion();
  }
  if (view === "home" && role === "farmer") document.querySelectorAll(".lot-card").forEach((card, index) => {
    const lot = visibleListings()[index];
    if (!lot) return;
    card.querySelector(".lot-copy").insertAdjacentHTML("beforeend", `<button class="passport-link" data-action="view-passport" data-id="${h(lot.id)}">${t("বিক্রির আলুর তথ্য", "Potato details for sale")} →</button>`);
  });
  const review = document.querySelector("#deal-form");
  if (review) {
    const offer = data.offers.find(item => item.id === reviewOfferId);
    review.querySelector(".deal-summary").insertAdjacentHTML("afterend", summaryBlock(offer, Number(review.elements.quantityKg.value), true));
  }
}

async function exportPassport(action) {
  const lot = selectedLot();
  if (!lot) return;
  const offers = data.offers.filter(offer => offer.lotId === lot.id);
  const file = new File([passportDocument(lot, offers, language)], `alusathi-lot-${String(lot.id).replace(/[^a-z0-9-]/gi, '').slice(0, 50)}.html`, { type: "text/html" });
  if (action === "print-passport") {
    const frame = document.createElement("iframe");
    frame.title = "Potato-lot passport print preview"; frame.className = "passport-print-frame";
    frame.onload = () => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 1000); };
    frame.srcdoc = passportDocument(lot, offers, language); document.body.append(frame); return;
  }
  if (action === "share-passport" && navigator.share) {
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: t("আলুর পরিচয়পত্র", "Potato-lot passport") });
      else await navigator.share({ title: t("আলুর পরিচয়পত্র", "Potato-lot passport"), text: passportText(lot, language) });
      return;
    } catch (error) { if (error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  notice = t("ছবিসহ পরিচয়পত্র ফাইলে রাখা হয়েছে। কাউকে পাঠালে তিনি আপনার দেওয়া তথ্য দেখতে পাবেন।", "Passport saved with photos. Anyone you send it to can read the details you included."); render();
}

function save() {
  try { localStorage.setItem(storeKey, JSON.stringify(data)); return true; }
  catch { notice = t("এই ফোনে আর তথ্য রাখা যাচ্ছে না। ছোট ছবি দিয়ে আবার চেষ্টা করুন।", "This device cannot save more data. Try a smaller photo."); return false; }
}

function setView(next) {
  if (role === 'buyer' && next === 'contacts') next = 'home';
  if (!SALES_FEATURE_ENABLED && legacyViews.includes(next)) next = "unavailable";
  const allowed = role === "farmer" ? ["home", "list", "offers", "transport", "storage", "deals", "passport", "profile", "unavailable"] : ["home", "transport", "saved", "profile", "buyer-plan", "notebook", "needs", "contacts", "unavailable"];
  if (!displayName || !allowed.includes(next)) return;
  if(role==='buyer' && next==='profile' && view!=='profile') buyerProfileDraft=null;
  view = next; reviewOfferId = ""; window.scrollTo({ top: 0, behavior: "smooth" }); render();
  const url = new URL(location.href); url.hash = next === "home" ? "" : next; history.replaceState(null, "", url);
}
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1) || "home";
  if (role === 'buyer' && next === 'contacts') { setView('home'); return; }
  const allowed = role === "farmer" ? ["home", "list", "offers", "transport", "storage", "deals", "passport", "profile", "unavailable"] : ["home", "transport", "saved", "profile", "buyer-plan", "notebook", "needs", "contacts", "unavailable"];
  if (!SALES_FEATURE_ENABLED && legacyViews.includes(next)) { view = "unavailable"; render(); return; }
  if (allowed.includes(next)) { view = next; render(); }
});
function captureFormState() {
  const form = document.querySelector("form");
  if (!form) return null;
  return [...form.elements].filter(field => field.name && field.type !== "file").map(field => ({ name: field.name, value: field.value }));
}
function restoreFormState(state) {
  if (!state) return;
  const form = document.querySelector("form");
  if (!form) return;
  for (const field of state) if (form.elements[field.name]) form.elements[field.name].value = field.value;
}
function selectedLot() { return visibleListings().find(lot => lot.id === selectedLotId) || visibleListings()[0]; }
function offerRemainingKg(offer, lot) {
  const requested = Math.max(0, Number(offer?.quantityKg) || 0);
  const committed = data.deals.filter(deal => deal.offer?.id === offer?.id).reduce((sum, deal) => sum + Math.max(0, Number(deal.quantityKg) || 0), 0);
  return Math.max(0, Math.min(requested - committed, availableKg(lot, data.deals)));
}
function districtOptions(selected = "Rangpur") { return districts.map(d => `<option value="${h(d)}" ${selected === d ? "selected" : ""}>${h(language === "bn" ? districtNamesBn[d] : d)}</option>`).join(""); }
function lotVariety(lot) { return language === "bn" ? varieties.find(([name]) => name === lot.variety)?.[1] || lot.variety : lot.variety; }
function lotNotes(lot) { return language === "bn" && lot.notesBn ? lot.notesBn : lot.notes; }
function lotPackaging(lot) { return language === "bn" && lot.packagingBn ? lot.packagingBn : lot.packaging; }
function lotFarmer(lot) { return language === "bn" && lot.farmerNameBn ? lot.farmerNameBn : lot.farmerName || lot.farmer?.name || lot.ownerName || t("আলুচাষি", "Potato farmer"); }
function contactLabel(lot) { return lot.sample ? t("যোগাযোগের নমুনা বার্তা", "Prepare example enquiry") : t("কৃষকের সঙ্গে কথা বলুন", "Contact farmer"); }
function photoOrArtwork(lot, className = "lot-photo") {
  const photo = photoSrc(lot.photo);
  return photo ? `<img class="${className}" src="${photo}" alt="${t("আলুর ছবি", "Potato lot photo")}" />` : `<div class="${className} lot-art" aria-hidden="true"><span class="art-leaf leaf-a"></span><span class="art-leaf leaf-b"></span><span class="art-potato potato-a"></span><span class="art-potato potato-b"></span><span class="art-potato potato-c"></span></div>`;
}

function navButton(label, key, symbol) {
  const active = view === key || (key === "buyer-plan" && view === "saved");
  return `<button class="nav-link ${active ? "active" : ""}" data-view="${key}" aria-current="${active ? "page" : "false"}">${icon(symbol, 18)}<span>${label}</span></button>`;
}

function renderShell(content) {
  const farmerNav = [["/farmer", t("আজকের কাজ", "Today"), "leaf"], ["/farmer#photos", t("ছবি", "Photos"), "bag"], ["/selling-preparation", t("বিক্রির আগে", "Before selling"), "truck"], ["/farmer#diary", t("খাতা", "Notebook"), "clock"]].map(([href, label, symbol]) => `<a class="nav-link ${href === "/selling-preparation" ? "active" : ""}" href="${href}" ${href === "/selling-preparation" ? 'aria-current="page"' : ""}>${icon(symbol, 18)}<span>${label}</span></a>`).join("");
  const buyerNav = [navButton(t("আলু খুঁজুন", "Find potatoes"), "home", "bag"), navButton(t("আমার চাহিদা", "My requirements"), "needs", "leaf"), navButton(t("খরচ ও লাভ", "Cost & profit"), "buyer-plan", "scale")].join("") + `<details class="buyer-tools-menu"><summary>${t('সরঞ্জাম','Tools')} ▾</summary><div>${navButton(t('খাতা','Notebook'),'notebook','clock')}${navButton(t('গাড়ির জন্য যোগাযোগ','Find a truck service'),'transport','truck')}</div></details>`;
  app.innerHTML = `
    <div class="site-wrap ${role}-portal">
      <header class="topbar">
        <button class="brand" data-view="home" aria-label="AluSathi marketplace home"><span class="brand-mark">${icon("leaf", 23)}</span><span><strong>আলুসাথী<span class="brand-dot">.</span></strong><small>${role === "farmer" ? t("কৃষকের পাতা", "Farmer page") : t("ক্রেতার পাতা", "Buyer page")}</small></span></button>
        <nav class="desktop-nav" aria-label="${t("প্রধান মেনু", "Main navigation")}">${role === "farmer" ? farmerNav : buyerNav}</nav>
        <div class="header-actions"><button class="account-name" data-action="open-profile" aria-label="${t("প্রোফাইল খুলুন", "Open profile")}">${h(role === "farmer" ? (farmerProfile.name || t("কৃষক", "Farmer")) : (buyerProfile.contactPerson || buyerProfile.businessName || t("ক্রেতা", "Buyer")))}</button><button class="language-btn" data-action="language" aria-label="Change language">${language === "bn" ? "EN" : "বাংলা"}</button><button class="mode-button" data-action="logout">${icon("arrow", 15)}${role === "farmer" ? t("মূল পাতায় ফিরুন", "Main page") : t("বের হন", "Sign out")}</button></div>
      </header>
      ${notice ? `<div class="notice" role="status">${h(notice)}<button data-action="dismiss" aria-label="Dismiss">×</button></div>` : ""}
      <main id="main">${role === "farmer" ? `<div class="page-shell farmer-market-tools"><a href="/selling-preparation">← ${t("বিক্রির আগে", "Before selling")}</a>${["passport","list"].includes(view) ? "" : `<details><summary>${t("বিক্রির আরও সরঞ্জাম", "More selling tools")}</summary><div>${[navButton(t("আমার আলু", "My potatoes"), "home", "bag"), navButton(t("আলু যোগ করুন", "Add potatoes"), "list", "bag"), navButton(t("গাড়ি", "Transport"), "transport", "truck")].join("")}</div></details>`}</div>` : ""}${content}</main>
      <footer class="footer"><div><strong>আলুসাথী বাজার</strong><p>${t("কৃষকের সিদ্ধান্ত, পরিষ্কার হিসাব।", "Your crop. Clear choices.")}</p></div><div><span>${t("শুধু এই ব্রাউজারে সেভ হয়", "Saved only in this browser")}</span><a class="main-return" href="${role === "farmer" ? "/farmer" : "/"}">${t("মূল অ্যাপে ফিরুন", "Back to AluSathi")}</a></div></footer>
      <nav class="mobile-nav" aria-label="${t("মোবাইল মেনু", "Mobile navigation")}">${role === "farmer" ? farmerNav : buyerNav}</nav>
      ${reviewOfferId && SALES_FEATURE_ENABLED ? renderReview() : ""}${detailLotId ? renderBuyerLotDialog() : ""}${contactLotId ? renderFarmerContactDialog() : ""}${profileOpen ? renderProfileDrawer() : ""}
    </div>`;
  document.documentElement.lang = language;
}

function renderHero() {
  return `<section class="hero page-shell"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-line"></span>${t("বাংলাদেশের আলুর বাজার", "Bangladesh potato market")}</p><h1>${t("সঠিক দরে", "Sell your potatoes")}<br><em>${t("আলু বিক্রি করুন।", "with a clear price.")}</em></h1><p class="hero-lead">${t("আলুর তথ্য দিন। দর মিলিয়ে দেখুন। তারপর ক্রেতা বেছে নিন।", "Add your crop. Compare offers. Then choose a buyer.")}</p><div class="hero-actions"><button class="button button-gold" data-view="list">${icon("plus", 19)}${t("আলুর তথ্য দিন", "Add my potatoes")}</button></div></div><div class="hero-visual" role="img" aria-label="${t("আলুর ক্ষেতে একজন কৃষক", "A farmer in a potato field")}"></div></section>`;
}

function renderLotCard(lot) {
  const remaining = availableKg(lot, data.deals);
  const offerCount = data.offers.filter(offer => offer.lotId === lot.id).length;
  return `<article class="lot-card">${photoOrArtwork(lot)}<div class="lot-copy"><div class="card-topline"><span class="small-label">${lot.sample ? t("উদাহরণ · যাচাই হয়নি", "EXAMPLE · NOT VERIFIED") : t("এই ফোনে সেভ", "SAVED ON THIS DEVICE")}</span><span class="status-pill">${remaining ? t("বিক্রির জন্য আছে", "Available") : t("সবটা চুক্তিতে", "Committed")}</span></div><h3>${h(lotVariety(lot) || t("আলু", "Potatoes"))} <span>· ${kg(lot.quantityKg)}</span></h3><p>${icon("pin", 16)}${h(lot.upazila)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} <span class="meta-dot">•</span> ${prettyDate(lot.readyDate)}</p><div class="lot-card-bottom"><span>${icon("bag", 16)} ${kg(remaining)} ${t("বাকি", "remaining")}</span><button class="text-arrow" data-action="select-lot" data-id="${h(lot.id)}">${formatter.format(offerCount)} ${t("টি দর দেখুন", "offers")}${icon("arrow", 16)}</button></div></div></article>`;
}

function renderFarmerListingHero() {
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("আমার আলুর তালিকা", "MY POTATO LISTINGS")}</p><h1>${t("আলুর তথ্য দেখুন", "Your potato listings")}</h1><p>${t("তালিকায় থাকা আলুর তথ্য দেখুন, বদলান বা নতুন আলুর তথ্য যোগ করুন।", "Review, update, or add information about your potato lots.")}</p></div><button class="button button-green" data-view="list">${icon("plus", 18)}${t("আলু যোগ করুন", "Add potatoes")}</button></section>`;
}

function renderFarmerHome() {
  const exampleOnly = visibleListings().length > 0 && visibleListings().every(lot => lot.sample);
  return `${renderFarmerListingHero()}<section class="section page-shell"><div class="section-header"><div><p class="section-kicker">${t("আপনার তালিকা", "YOUR LISTINGS")}</p><h2>${t("আলুর তালিকা", "Potato lots")}</h2><p>${exampleOnly ? t("নিজের আলুর তথ্যও যোগ করতে পারেন।", "Add your own lot details here.") : t("তালিকায় আলুর তথ্য দেখুন ও বদলান।", "Review and update your listed potatoes.")}</p></div><button class="button button-outline" data-view="list">${icon("plus", 18)}${exampleOnly ? t("আমার আলুর তথ্য দিন", "Add my potatoes") : t("আরও আলু যোগ", "Add another lot")}</button></div><div class="lot-grid">${visibleListings().length ? visibleListings().map(lot => `<article class="lot-card">${photoOrArtwork(lot)}<div class="lot-copy"><div class="card-topline"><span class="small-label">${t("আমার তালিকা", "MY LISTING")}</span><span class="status-pill">${kg(availableKg(lot, data.deals))}</span></div><h3>${h(lotVariety(lot) || t("আলু", "Potatoes"))}</h3><p>${h(lot.upazila)}, ${h(districtNamesBn[lot.district] && language === "bn" ? districtNamesBn[lot.district] : lot.district)} · ${prettyDate(lot.readyDate)}</p><p>${h(lot.notes || t("অবস্থা লেখা হয়নি", "Condition not provided"))}</p></div></article>`).join("") : `<div class="empty-state">${t("এখনো আলুর তথ্য নেই।", "No lots yet.")}</div>`}</div></section>`;
}

function renderListForm() {
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ধাপ ১ / আলুর তথ্য", "STEP 1 / YOUR POTATOES")}</p><h1>${t("কত আলু বিক্রি করবেন?", "What do you have to sell?")}</h1><p>${t("যা জানেন তাই লিখুন। ওজন নিশ্চিত হলে পরে নতুন তালিকা দিতে পারবেন।", "Enter what you know. This pilot keeps the record on this device only.")}</p></div><div class="inner-hero-mark">${icon("bag", 52)}</div></section><section class="form-layout page-shell lot-form-centered"><form id="lot-form" class="panel form-panel"><div class="form-intro"><span class="step-circle">1</span><div><h2>${t("আমার আলু", "My potato lot")}</h2><p>${t("ঠিকানা নয়—শুধু উপজেলা দেখানো হবে।", "Only your upazila is shown, not your exact address.")}</p></div></div><fieldset class="form-section"><legend>${t("কোথায়?", "Where?")}</legend><div class="form-grid"><label>${t("জেলা", "District")}<select name="district" required>${districtOptions()}</select></label><label>${t("উপজেলা", "Upazila")}<input name="upazila" required minlength="2" maxlength="60" placeholder="${t("যেমন: পীরগঞ্জ", "e.g. Pirganj")}" /></label></div></fieldset><fieldset class="form-section"><legend>${t("কী আলু, কতটা?", "What potatoes and how much?")}</legend><div class="form-grid"><label>${t("আলুর জাত", "Potato variety")}<select name="variety"><option value="">${t("জাত বেছে নিন", "Choose a variety")}</option>${varieties.map(([value, bn]) => `<option value="${value}">${h(t(bn, value))}</option>`).join("")}</select></label><label>${t("মোট পরিমাণ (কেজি)", "Quantity (kg)")}<input name="quantityKg" required type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="2000" /></label><label>${t("কবে বিক্রির জন্য প্রস্তুত?", "Ready date")}<input name="readyDate" required type="date" min="${todayPlus(0)}" value="${todayPlus(14)}" /></label></div><div class="lot-notes"><div class="notes-heading"><label for="lot-notes">${t("আলুর অবস্থা / আকার সম্পর্কে কিছু বলুন", "Size or condition")}</label><button type="button" class="button button-outline button-small" data-action="dictate-notes" aria-pressed="false">${t("বলুন", "Speak")}</button></div><textarea id="lot-notes" name="notes" rows="2" maxlength="300" placeholder="${t("যেমন: মাঝারি আকার বেশি, কিছু ছোট আছে", "e.g. Mostly medium potatoes, some small ones")}"></textarea><small class="notes-status" role="status">${t("বলতে চাপলে ফোনের ভয়েস সেবা মাইক্রোফোন ব্যবহার করবে। চাইলে লিখুন।", "Speak uses your phone’s voice service and microphone. You can also type.")}</small></div><label class="upload-box">${icon("plus", 21)}<span><strong>${t("একটি ছবি যোগ করুন", "Add one photo")}</strong><small>${t("ঐচ্ছিক · শুধু এই ফোনে থাকবে · সর্বোচ্চ ২ MB", "Optional · stays on this device · up to 2 MB")}</small></span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label></fieldset><div class="lot-save-actions"><button class="button button-outline submit" type="submit" name="afterSave" value="back">${t("সংরক্ষণ করে ফিরে যান", "Save and go back")}</button><button class="button button-green submit" type="submit" name="afterSave" value="market">${t("সংরক্ষণ করে বাজারে দিন", "Save and go to Sell Potatoes")}${icon("arrow", 18)}</button></div></form></section>`;
}

function renderOfferCard(offer, lot) {
  const remaining = availableKg(lot, data.deals);
  const result = estimateOffer(offer, Math.min(offer.quantityKg, remaining));
  const unsold = Math.max(0, remaining - result.acceptedKg);
  const expired = offer.expires < todayPlus(0);
  const names = { "sample-local": t("রহিম ট্রেডার্স", "Rahim Traders"), "sample-remote": t("করিম আলু ভান্ডার", "Karim Potato Store"), "sample-partial": t("নাহার স্টোর", "Nahar Store") };
  const perKg = result.acceptedKg ? result.net / result.acceptedKg : 0;
  return `<article class="offer-card simple-offer">
    <div class="offer-top"><div><span class="small-label">${offer.sample ? t("তুলনার জন্য নির্ধারিত দর", "PRESET COMPARISON PRICE") : t("ক্রেতার দেওয়া তথ্য · যাচাই হয়নি", "BUYER DETAILS · NOT VERIFIED")}</span><h3>${h(offer.sample && names[offer.id] ? names[offer.id] : offer.buyer)}</h3><p>${icon("pin", 15)}${h(language === "bn" ? districtNamesBn[offer.district] || offer.district : offer.district)}</p></div><span class="price-badge">${rate(offer.priceKg)}<small>/${t("কেজি", "kg")}</small></span></div>
    <div class="take-home"><span>${t("সব খরচ বাদে পাবেন", "You receive after costs")}</span><strong>${money(result.net)}</strong><small>${t("বিক্রি হওয়া প্রতি কেজিতে হাতে", "Net per kg actually sold")}: ${rate(perKg)} · ${t("বিক্রি না হওয়া", "Still unsold")}: ${kg(unsold)}</small><small>${t("আনুমানিক হিসাব, নিশ্চিত টাকা নয়", "Estimate, not guaranteed payment")}</small></div>
    <div class="offer-quickfacts"><span>${t("আলু নেবেন", "Will buy")}: <strong>${kg(result.acceptedKg)}</strong></span><span>${t("টাকা দেবেন", "Will pay")}: <strong>${offer.paymentDays === 0 ? t("আলু নেওয়ার দিন", "On pickup day") : `${formatter.format(offer.paymentDays)} ${t("দিনের মধ্যে", "days after pickup")}`}</strong></span><span><strong>${offer.pickup === "buyer" ? t("আপনার কাছ থেকে আলু নিয়ে যাবেন", "Buyer collects from you") : t("আপনাকে আলু পৌঁছে দিতে হবে", "You deliver the potatoes")}</strong></span></div>
    ${unsold > 0 ? `<p class="offer-leftover">${kg(unsold)} ${t("আলু থেকে যাবে। সেটুকুর জন্য আরেকজন ক্রেতা লাগবে।", "will remain. You need another buyer for it.")}</p>` : ""}
    <details class="offer-details"><summary>${t("খরচ ও শর্ত", "Costs and terms")}</summary><div class="offer-breakdown"><div><span>${t("আলু বিক্রির টাকা", "Sale amount")}</span><strong>${money(result.gross)}</strong></div><div><span>${t("গাড়িভাড়া", "Transport")}</span><strong>− ${money(offer.transport)}</strong></div><div><span>${t("বস্তা ও শ্রমিক", "Sacks and labour")}</span><strong>− ${money(offer.handling)}</strong></div><div><span>${t("অন্যান্য খরচ", "Other costs")}</span><strong>− ${money(offer.fee)}</strong></div><div><span>${t("আপনার হাতে থাকবে", "You keep")}</span><strong>${money(result.net)}</strong></div></div><p class="offer-terms">${h(offerTerms(offer, language))}</p>${offer.contact && /^(?:\+?88)?01[3-9]\d{8}$/.test(offer.contact.contactPhone) ? `<p class="offer-terms">${t("যোগাযোগ", "Contact")}: ${h(offer.contact.contactPerson)} · <a href="tel:${h(offer.contact.contactPhone)}">${h(offer.contact.contactPhone)}</a><br>${h(offer.contact.buyerUpazila)}, ${h(offer.district)} · ${h(offer.contact.buyerAddress)}</p>` : ""}${summaryBlock(offer, result.offeredKg)}<small>${t("দরটি থাকবে", "Offer valid until")} ${prettyDate(offer.expires)}</small></details>
    <div class="offer-bottom">${role === "farmer" ? `<button class="button button-green" data-action="review-offer" data-id="${h(offer.id)}" ${expired || remaining <= 0 || result.net <= 0 ? "disabled" : ""}>${expired ? t("দরের সময় শেষ", "Offer expired") : t("এই ক্রেতাকে বেছে নিন", "Choose this buyer")}${icon("arrow", 16)}</button>` : ""}</div>
  </article>`;
}

function renderOffers() {
  const lot = selectedLot();
  const matching = lot ? visibleOffers().filter(offer => offer.lotId === lot.id) : [];
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ধাপ ২ / দর তুলনা", "STEP 2 / COMPARE OFFERS")}</p><h1>${t("দর নয়, হাতে কত?", "Look beyond the price.")}</h1><p>${t("বেশি দর মানেই বেশি লাভ নয়। খরচ বাদে হাতে কত থাকবে, তা দেখুন।", "A higher price may leave less money. Compare what remains after costs.")}</p></div><div class="inner-hero-mark">${icon("scale", 52)}</div></section><section class="section page-shell">${lot ? `<div class="section-header offer-header"><div><p class="section-kicker">${t("আপনার কোন আলু", "YOUR POTATOES")}</p><h2>${h(lotVariety(lot))} · ${kg(availableKg(lot, data.deals))} ${t("বাকি", "available")}</h2><p>${h(lot.upazila)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} · ${prettyDate(lot.readyDate)}</p></div><select id="lot-switch" aria-label="${t("আলুর তালিকা বাছুন", "Select potato lot")}">${visibleListings().map(item => `<option value="${h(item.id)}" ${item.id === lot.id ? "selected" : ""}>${h(lotVariety(item))} · ${h(language === "bn" ? districtNamesBn[item.district] || item.district : item.district)} · ${kg(item.quantityKg)}</option>`).join("")}</select></div><div class="offer-grid">${matching.length ? matching.map(offer => renderOfferCard(offer, lot)).join("") : `<div class="empty-state"><h3>${t("এখনো কোনো দর নেই", "No offers yet")}</h3><p>${t("ক্রেতার পাতায় গিয়ে এই আলুর জন্য দর লিখতে পারেন।", "Go to the buyer page to make an offer for this lot.")}</p></div>`}</div>` : `<div class="empty-state"><h3>${t("আগে আলুর তথ্য দিন", "List a lot first")}</h3><button class="button button-green" data-view="list">${t("আলু যোগ করুন", "Add potatoes")}</button></div>`}<p class="section-footnote">${t("আংশিক দর হলে বাকি আলুর জন্যও ক্রেতা লাগবে। এই হিসাব আনুমানিক—চুক্তির আগে শর্ত মিলিয়ে নিন।", "A partial offer leaves some potatoes unsold. These are estimates—check the terms before agreeing.")}</p></section>`;
}

function renderBuyerHome() {
  if (!publicPreview && view === 'notebook') return notebook({t,h,money:rate,prettyDate,today:todayPlus(0)});
  const lots = visibleListings().filter(lot => availableKg(lot, data.deals) > 0);
  const filtered = lots.filter(lot => (!buyerCatalogueDistrict || lot.district === buyerCatalogueDistrict)
    && (!buyerCatalogueVariety || lot.variety === buyerCatalogueVariety)
    && (!buyerCatalogueQuantity || availableKg(lot, data.deals) >= buyerCatalogueQuantity));
  const searchLots = buyerSearch ? getBuyerPicks(filtered, buyerSearch) : [];
  const selected = lots.filter(lot => catalogueSelection.includes(lot.id));
  const cards = items => items.map(lot => {
    const compared = catalogueSelection.includes(lot.id);
    const farmer = lotFarmer(lot);
    const available = availableKg(lot, data.deals);
    const availability = `<div><dt>${t("পাওয়া যাবে", "Available")}</dt><dd>${kg(available)}</dd></div>`;
    const price = `<div><dt>${t("দর", "Price")}</dt><dd>${cataloguePriceText(lot)}</dd></div>`;
    return `<article class="lot-card buyer-contact-card"><div class="catalogue-card-identity">${catalogueRowPhoto(lot)}<div>${lot.sample && !publicPreview ? `<small>${t("কাল্পনিক তালিকা · যাচাই হয়নি", "Illustrative listing · not verified")}</small>` : ""}${publicPreview ? '<div class="public-lot-name">' : ""}<h3>${h(lotVariety(lot) || t("আলু", "Potatoes"))}</h3>${publicPreview ? `<span class="catalogue-farmer">${h(farmer)}</span></div>` : ""}${publicPreview ? "" : `<p class="catalogue-farmer">${h(farmer)}</p>`}<p>${h(cataloguePlace(lot))}</p></div></div><dl class="catalogue-card-facts">${publicPreview ? availability + price : price + availability}<div><dt>${t("কবে নিতে পারবেন", "Ready for collection")}</dt><dd>${catalogueReady(lot)}</dd></div></dl><div class="buyer-card-actions"><button class="button ${publicPreview ? "button-green" : "button-outline"}" data-action="view-lot" data-id="${h(lot.id)}">${(publicPreview ? t("বিস্তারিত দেখুন", "View details") : t("বিস্তারিত", "Details"))}</button>${publicPreview ? "" : `<button class="button button-outline" data-action="catalogue-compare-toggle" data-id="${h(lot.id)}" aria-pressed="${compared}">${compared ? t("তুলনায় আছে", "In comparison") : t("তুলনায় রাখুন", "Add to comparison")}</button><button class="button button-outline" data-action="lot-costs" data-id="${h(lot.id)}">${t("খরচ ও লাভ", "Cost & profit")}</button><button class="button button-green" data-action="contact-lot" data-id="${h(lot.id)}">${t("কৃষকের সঙ্গে কথা বলুন", "Contact farmer")}</button>`}</div></article>`;
  }).join("");
  let catalogueLots = buyerSearchShowAll && buyerSearch?.applied ? filterBuyerLots(filtered, buyerSearch) : filtered;
  if (publicPreview) catalogueLots.sort((a, b) => {
    if (publicSort === "price") return (publicKgPrice(a) ?? Infinity) - (publicKgPrice(b) ?? Infinity) || 0;
    if (publicSort === "quantity") return availableKg(b, data.deals) - availableKg(a, data.deals);
    const timestamp = lot => Date.parse(lot.createdAt) || 0;
    return publicSort === "oldest" ? timestamp(a) - timestamp(b) : timestamp(b) - timestamp(a);
  });
  const pageCount = Math.max(1, Math.ceil(catalogueLots.length / 6));
  buyerCataloguePage = Math.min(buyerCataloguePage, pageCount);
  const pageLots = catalogueLots.slice((buyerCataloguePage - 1) * 6, buyerCataloguePage * 6);
  const filters = `<form id="buyer-catalogue-filters" data-demo="false" class="buyer-catalogue-filters"><label>${t("জেলা", "District")}<select name="district"><option value="">${t("সব জেলা", "All districts")}</option>${districtOptions(buyerCatalogueDistrict)}</select></label><label>${t("জাত", "Variety")}<select name="variety"><option value="">${t("সব জাত", "All varieties")}</option>${varieties.map(([value, bn]) => `<option value="${h(value)}" ${buyerCatalogueVariety === value ? "selected" : ""}>${h(t(bn, value))}</option>`).join("")}</select></label><label>${t("কত কেজি লাগবে?", "Minimum quantity (kg)")}<input name="minKg" inputmode="decimal" maxlength="12" value="${buyerCatalogueQuantity || ""}">${publicPreview ? `<span class="public-kg-unit" aria-hidden="true">${t("কেজি", "kg")}</span>` : ""}</label><button class="button button-green" type="submit">${t("খুঁজুন", "Search")}</button><button class="${publicPreview ? "button button-outline" : "text-arrow"}" type="button" data-action="clear-buyer-filters">${t("ফিল্টার সরান", "Clear filters")}</button><p role="status" class="catalogue-filter-error"></p>${publicPreview ? `<div class="public-sort-chips" role="group" aria-label="${t("তালিকা সাজান", "Sort listings")}">${[["", t("নতুন আগে", "Newest")], ["quantity", t("বেশি পরিমাণ", "Largest lots")], ["price", t("কম দর", "Lowest price")], ["oldest", t("পুরোনো আগে", "Oldest")]].map(([key, label]) => `<button type="submit" name="sort" value="${key}" aria-pressed="${key === publicSort}">${label}</button>`).join("")}</div>` : ""}</form>`;
  const typedSearch = `<details class="catalogue-written-search" ${buyerSearch ? "open" : ""}><summary>${t("লিখে খুঁজুন", "Need a quantity, place or date? Search in your own words")}</summary><form id="buyer-search-prompt" data-demo="false" class="buyer-search-panel"><label for="catalogue-query">${t("আপনার প্রয়োজন", "Your requirement")}</label><div class="catalogue-query-row"><input id="catalogue-query" name="query" maxlength="240" value="${h(buyerSearch?.query || "")}" placeholder="${t("যেমন: রংপুরে এই সপ্তাহে ৫০০ কেজি আলু", "e.g. 500 kg near Rangpur, ready this week")}" /><button class="button button-green" type="submit">${t("খুঁজুন", "Search")}</button></div>${buyerSearchMessage ? `<p role="status">${h(buyerSearchMessage)}</p>` : ""}</form>${buyerSearch ? `<form id="buyer-search-edit" data-demo="false" class="buyer-search-edit"><strong>${t("তথ্য মিলিয়ে নিন", "Check your search details")}</strong><div class="form-grid"><label>${t("জেলা", "District")}<select name="district"><option value="">${t("জেলা বাছুন", "Select district")}</option>${districtOptions(buyerSearch.district)}</select></label><label>${t("কত কেজি", "Quantity (kg)")}<input name="quantity" type="number" min="1" max="100000" value="${buyerSearch.quantity || ""}" required /></label><label>${t("কবে লাগবে", "Needed by")}<input name="readyDate" type="date" value="${h(buyerSearch.readyDate || "")}" /></label><label>${t("মোট বাজেট (ঐচ্ছিক)", "Total budget (optional)")}<input name="budget" type="number" min="1" max="100000000" value="${buyerSearch.budget || ""}" /></label></div><div class="catalogue-search-confirm"><small>${t("বাজেটে শুধু আলুর দাম ধরা হবে, গাড়িভাড়া নয়।", "Budget covers potatoes only, not transport.")}</small><button class="button button-green" type="submit">${t("মিল দেখুন", "Show matches")}</button></div></form>` : ""}</details>`;
  const picks = buyerSearch?.applied && !buyerSearchShowAll ? `<section class="buyer-picks"><div class="section-header"><h2>${t("আপনার খোঁজের সঙ্গে মেলে", "Matches your search")}</h2><span>${formatter.format(searchLots.length)} ${t("টি লট", "lots")}</span></div>${searchLots.length ? `<div class="lot-grid">${cards(searchLots, true)}</div><div class="buyer-search-actions"><button class="button button-outline" data-action="buyer-see-all">${t("মিল থাকা সব লট দেখুন", "See all matching lots")}</button><button class="text-arrow" data-action="buyer-expand-area">${buyerSearch.expanded ? t("সব জেলা দেখানো হচ্ছে", "All districts included") : t("অন্য জেলাও দেখুন", "Expand area")}</button></div>` : `<div class="empty-state"><h3>${t("এই শর্তে লট পাওয়া যায়নি", "No lots match these requirements")}</h3><p>${t("পরিমাণ বা সময় বদলান, অথবা অন্য জেলা দেখুন।", "Change quantity or date, or include other districts.")}</p><button class="button button-outline" data-action="buyer-expand-area">${t("অন্য জেলাও দেখুন", "Include other districts")}</button></div>`}</section>` : "";
  const catalogue = `<section class="buyer-catalogue"><div class="section-header"><h2${publicPreview ? ' tabindex="-1"' : ""}>${buyerSearchShowAll ? t("মিল থাকা সব লট", "All matching lots") : publicPreview ? t("আলুর তালিকা", "Potato listings") : t("যে আলু পাওয়া যাবে", "Available potatoes")}</h2><span${publicPreview ? ' role="status"' : ""}>${formatter.format(catalogueLots.length)} ${t("টি লট", "lots")}</span></div>${publicPreview && pageLots.some(lot => lot.sample) ? `<p class="public-listing-note">${publicPhotoLabel()}</p>` : ""}${catalogueLots.length ? `<div class="lot-grid">${cards(pageLots)}</div>${pageCount > 1 ? `<nav class="catalogue-pagination" aria-label="${t("তালিকার পৃষ্ঠা", "Catalogue pages")}"><button class="button button-outline" data-action="catalogue-page" data-page="${buyerCataloguePage - 1}" ${buyerCataloguePage === 1 ? "disabled" : ""}>${t("আগের", "Previous")}</button><span>${formatter.format(buyerCataloguePage)} / ${formatter.format(pageCount)}</span><button class="button button-outline" data-action="catalogue-page" data-page="${buyerCataloguePage + 1}" ${buyerCataloguePage === pageCount ? "disabled" : ""}>${t("পরের", "Next")}</button></nav>` : ""}` : `<div class="empty-state"><h3>${t("এই খোঁজে কোনো লট পাওয়া যায়নি", "No lots match these filters")}</h3><button class="button button-outline" data-action="clear-buyer-filters">${t(publicPreview ? "ফিল্টার সরান" : "বাছাই মুছুন", "Clear filters")}</button></div>`}</section>`;
  if (publicPreview) return `<section class="section page-shell buyer-discovery public-market catalogue-photo-grid"><div class="catalogue-hero"><div class="catalogue-hero-copy"><p class="section-kicker">${t("আলুসাথী বাজার", "AluSathi market")}</p><h1>${t("আলু কিনুন", "Browse potatoes")}</h1><p>${t("জেলা, জাত আর পরিমাণ দিয়ে আলু খুঁজুন।", "Find potatoes by district, variety and quantity.")}</p></div></div>${filters}${catalogue}</section>`;
  return `<section class="section page-shell buyer-discovery catalogue-photo-grid"><div class="catalogue-hero"><div class="catalogue-hero-copy"><h1>${t("আলু খুঁজুন", "Find potatoes")}</h1><p>${t("আলু বাছুন, তথ্য মিলিয়ে বার্তা প্রস্তুত করুন।", "Choose a lot, check the details, and prepare an enquiry.")}</p></div></div>${filters}${typedSearch}${picks}${catalogue}<div id="catalogue-shortlist">${catalogueShortlist(selected)}</div></section>`;
}
const cataloguePlace = lot => [lot.upazila, language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district].filter(Boolean).join(", ");
const catalogueReady = lot => lot.readyDate && lot.readyDate <= todayPlus(0) ? t("এখনই নিতে পারবেন", "Ready now") : prettyDate(lot.readyDate);

function catalogueShortlist(lots) {
  return `<span class="sr-only" role="status">${lots.length ? `${formatter.format(lots.length)} ${t("টি লট তুলনায় আছে", "lots selected")}` : t("তুলনায় কোনো লট নেই", "No lots selected")}</span>${lots.length ? `<aside class="catalogue-shortlist-tray" aria-label="${t("তুলনার লট", "Comparison shortlist")}"><div class="catalogue-shortlist-items">${lots.map(lot => `<button type="button" data-action="catalogue-compare-toggle" data-id="${h(lot.id)}" aria-label="${h(t("তুলনা থেকে সরান", "Remove from comparison") + ": " + lotVariety(lot))}">${h(lotVariety(lot))} <span aria-hidden="true">×</span></button>`).join("")}</div>${lots.length === 1 ? `<span>${t("আর ১টি লট বাছুন", "Choose one more lot")}</span>` : ""}<button class="button button-green" data-action="catalogue-compare-open" ${lots.length < 2 ? "disabled" : ""}>${t("পাশাপাশি দেখুন", "Compare side by side")}</button></aside>` : ""}`;
}

function openCatalogueComparison() {
  const lots = catalogueSelection.map(buyerListing).filter(lot => lot && !lot.archivedAt && !lot.hiddenAt && availableKg(lot, data.deals) > 0);
  if (lots.length < 2) return;
  const dialog = document.createElement("dialog");
  dialog.className = "catalogue-comparison";
  dialog.setAttribute("aria-labelledby", "catalogue-comparison-title");
  const facts = [
    [t("কৃষক", "Farmer"), lot => h(lotFarmer(lot))],
    [t("এলাকা", "Location"), lot => h(cataloguePlace(lot))],
    [t("দর", "Price"), priceText],
    [t("পাওয়া যাবে", "Available"), lot => kg(availableKg(lot, data.deals))],
    [t("কবে নিতে পারবেন", "Ready for collection"), catalogueReady],
    [t("আলুর অবস্থা", "Condition"), lot => h(lotNotes(lot) || t("জানানো হয়নি", "Not provided"))],
    [t("প্যাকিং", "Packing"), lot => h(lotPackaging(lot) || t("জানানো হয়নি", "Not provided"))],
    [t("কৃষকের সঙ্গে কথা বলুন", "Contact farmer"), lot => `<button class="button button-green" data-action="contact-lot" data-id="${h(lot.id)}">${t("যোগাযোগ", "Contact")}</button>`],
  ];
  dialog.innerHTML = `<header><h2 id="catalogue-comparison-title">${t("পাশাপাশি দেখুন", "Compare side by side")}</h2><form method="dialog"><button class="button button-outline" autofocus>${t("বন্ধ করুন", "Close")}</button></form></header><div class="catalogue-comparison-table"><table class="liked-comparison-table"><thead><tr><th scope="col">${t("আলুর তথ্য", "Lot facts")}</th>${lots.map(lot => `<th scope="col">${h(lotVariety(lot))}</th>`).join("")}</tr></thead><tbody>${facts.map(([label, value]) => `<tr><th scope="row">${label}</th>${lots.map(lot => `<td>${value(lot)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="catalogue-comparison-next"><button class="button button-green" data-action="catalogue-costs">${t("খরচ ও লাভ দেখুন", "Compare costs and profit")}</button></p>`;
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

function priceText(lot) {
  const asking = Number(lot.askingPriceKg ?? lot.priceKg ?? lot.askingPrice);
  return Number.isFinite(asking) && asking > 0 ? `${rate(asking)} / ${t("কেজি", "kg")}` : t("দর দেওয়া নেই", "Price not provided");
}

function publicKgPrice(lot) {
  for (const value of [lot.askingPriceKg, lot.priceKg]) {
    if ((typeof value === "number" || typeof value === "string") && Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
  }
  // Stable display-only prices for sample lots; never fill in a farmer's asking price.
  return lot.sample ? 22 + Array.from(String(lot.id)).reduce((sum, char) => sum + char.codePointAt(0), 0) % 9 : null;
}
function cataloguePriceText(lot) {
  if (publicPreview) {
    const price = publicKgPrice(lot);
    return price === null ? t("দর দেওয়া নেই", "Price not provided") : `${rate(price)}/${t("কেজি", "kg")}`;
  }
  const asking = Number(lot.askingPriceKg ?? lot.priceKg ?? lot.askingPrice);
  return Number.isFinite(asking) && asking > 0
    ? priceText(lot)
    : t(`পুরো লটের দাম ${money(5000)} থেকে`, `Whole lot from ${money(5000)}`);
}

function getBuyerPicks(lots, brief) {
  return filterBuyerLots(lots, brief).slice(0, 5);
}

function filterBuyerLots(lots, brief) {
  const matched = lots.filter(lot => {
    if (!brief.expanded && brief.district && lot.district !== brief.district) return false;
    if (brief.quantity && availableKg(lot, data.deals) < brief.quantity) return false;
    if (brief.readyDate && lot.readyDate > brief.readyDate) return false;
    const price = Number(lot.askingPriceKg ?? lot.priceKg ?? lot.askingPrice);
    if (brief.budget && (!Number.isFinite(price) || price * brief.quantity > brief.budget)) return false;
    return true;
  });
  return matched.sort((a, b) => Number(a.askingPriceKg ?? a.priceKg ?? a.askingPrice ?? Infinity) - Number(b.askingPriceKg ?? b.priceKg ?? b.askingPrice ?? Infinity) || a.readyDate.localeCompare(b.readyDate) || a.id.localeCompare(b.id));
}

function parseBuyerQuery(query) {
  const western = String(query).replace(/[০-৯]/g, digit => "০১২৩৪৫৬৭৮৯".indexOf(digit));
  const quantity = western.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|কেজি)/i)?.[1];
  const district = districts.find(name => name !== "Other" && new RegExp(name, "i").test(western)) || Object.entries(districtNamesBn).find(([name, bn]) => name !== "Other" && western.includes(bn))?.[0] || "";
  const budget = western.match(/(?:budget|max(?:imum)?|সর্বোচ্চ|বাজেট)\D{0,16}(\d{2,})/i)?.[1] || "";
  let readyDate = "";
  if (/this week|এই সপ্তাহ/i.test(western)) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(part => [part.type, part.value]));
    const dhakaToday = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
    const daysToSunday = (7 - dhakaToday.getUTCDay()) % 7;
    dhakaToday.setUTCDate(dhakaToday.getUTCDate() + daysToSunday);
    readyDate = dhakaToday.toISOString().slice(0, 10);
  } else readyDate = western.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] || "";
  return { quantity: quantity ? Number(quantity) : "", district, readyDate, budget: budget ? Number(budget) : "", expanded: false, applied: false };
}

function renderUnavailable() { return `<section class="section page-shell"><div class="empty-state"><h1>${t("এই অংশটি এখন বন্ধ আছে", "This section is currently unavailable")}</h1></div></section>`; }

function renderBuyerProfilePage() {
  buyerProfileDraft ||= {...buyerProfile};
  return renderBuyerAccount({profile:buyerProfileDraft,t,h,icon,photoSrc});
}

function renderFarmerProfilePage() {
  const p = farmerProfile;
  return `<section class="section page-shell profile-page"><p class="section-kicker">${t("প্রোফাইল", "PROFILE")}</p><h1>${t("কৃষকের তথ্য", "Farmer profile")}</h1><p>${t("সব তথ্য ঐচ্ছিক। এই ব্রাউজারেই রাখা হবে।", "All fields are optional. Details stay in this browser.")}</p>${notice ? `<p class="profile-notice" role="status">${h(notice)}</p>` : ""}<form id="farmer-profile-form" class="panel form-grid"><label>${t("নাম", "Name")}<input name="name" maxlength="100" value="${h(p.name || "")}" /></label><label>${t("জেলা", "District")}<select name="district">${districtOptions(p.district || "")}</select></label><label>${t("উপজেলা", "Upazila")}<input name="upazila" maxlength="80" value="${h(p.upazila || "")}" /></label><label>${t("গ্রাম (ঐচ্ছিক)", "Village (optional)")}<input name="village" maxlength="80" value="${h(p.village || "")}" /></label><label>${t("ফোন (ঐচ্ছিক)", "Phone (optional)")}<input name="phone" inputmode="tel" maxlength="25" value="${h(p.phone || "")}" /></label><label>${t("WhatsApp (ঐচ্ছিক)", "WhatsApp (optional)")}<input name="whatsapp" inputmode="tel" maxlength="25" value="${h(p.whatsapp || "")}" /></label><label>${t("জমির পরিমাণ", "Cultivated land")}<input name="land" type="number" min="0" step="0.01" value="${h(p.land || "")}" /></label><label>${t("জমির একক", "Land unit")}<select name="landUnit"><option value="acre" ${p.landUnit === "acre" ? "selected" : ""}>${t("একর", "Acres")}</option><option value="decimal" ${p.landUnit === "decimal" ? "selected" : ""}>${t("শতাংশ", "Decimals")}</option><option value="bigha" ${p.landUnit === "bigha" ? "selected" : ""}>${t("বিঘা", "Bigha")}</option></select></label><label>${t("নিজস্ব / ইজারা", "Owned / leased")}<select name="tenure"><option value="">—</option><option value="owned" ${p.tenure === "owned" ? "selected" : ""}>${t("নিজস্ব", "Owned")}</option><option value="leased" ${p.tenure === "leased" ? "selected" : ""}>${t("ইজারা", "Leased")}</option><option value="mixed" ${p.tenure === "mixed" ? "selected" : ""}>${t("দুই ধরনের", "Both")}</option></select></label><label>${t("ভাষা", "Language")}<select name="preferredLanguage"><option value="bn" ${p.preferredLanguage !== "en" ? "selected" : ""}>বাংলা</option><option value="en" ${p.preferredLanguage === "en" ? "selected" : ""}>English</option></select></label><label class="profile-sharing"><input type="checkbox" name="contactSharingEnabled" value="true" ${p.contactSharingEnabled ? "checked" : ""} />${t("আমার দেওয়া যোগাযোগের তথ্য লটের সঙ্গে দেখান", "Show my contact details with my lots")}</label><button class="button button-green" type="submit">${t("সংরক্ষণ করুন", "Save profile")}</button></form><div class="profile-shortcuts"><a class="button button-outline" href="/farmer#market">${t("আমার তালিকা", "My listings")}</a></div></section>`;
}

function renderProfileDrawer() {
  const profile = role === "farmer" ? farmerProfile : buyerProfile;
  const name = role === "farmer" ? (profile.name || t("কৃষক", "Farmer")) : (profile.contactPerson || profile.businessName || t("ক্রেতা", "Buyer"));
  const buyerIdentity=role==='buyer' ? profileAvatar({photo:profile.photo,t,h,icon,photoSrc}) : '';
  return `<div class="modal-backdrop profile-backdrop" data-action="close-profile"><aside class="profile-drawer" role="dialog" aria-modal="true" aria-label="${t("প্রোফাইল", "Profile")}"><button class="modal-close" data-action="close-profile" aria-label="Close">×</button><p class="section-kicker">${t("আমার প্রোফাইল", "MY PROFILE")}</p>${buyerIdentity}<h2>${h(name)}</h2>${role==='buyer' ? `<p>${t('ক্রেতা','Buyer')}${typeof profile.businessName==='string' && profile.businessName ? ` · ${h(profile.businessName)}` : ''}</p>` : ''}${role==='farmer' ? `<p>${h(profile.district || t("জেলা যোগ করা হয়নি", "District not set"))}</p>` : ''}<button class="button button-green" data-action="profile-page">${t("প্রোফাইল দেখুন", "View profile")}</button>${role === "buyer" ? `<button class="button button-outline" data-view="saved">${t("পছন্দের লট ও তুলনা", "Liked lots and comparison")}</button>` : `<a class="button button-outline" href="/farmer#market">${t("আমার তালিকা", "My listings")}</a>`}</aside></div>`;
}

function comparisonTotal(lot, quantity) {
  if (!quantity) return `<span class="liked-warning">${t("সঠিক কেজি দিন", "Enter a valid quantity")}</span>`;
  if (availableKg(lot, data.deals) < quantity) return `<span class="liked-warning">${t("এই পরিমাণ নেই", "Not enough available")}</span>`;
  const price = Number(lot.askingPriceKg ?? lot.priceKg ?? lot.askingPrice);
  return Number.isFinite(price) && price > 0 ? `<strong>${money(price * quantity)}</strong>` : t("দর দেওয়া নেই", "Price not provided");
}

function renderSavedLots() {
  const available = lot => lot && !lot.hiddenAt && !lot.archivedAt && availableKg(lot, data.deals) > 0;
  const farmer = lot => lot.practice ? t("তুলনার জন্য দেওয়া আলু", "Example for comparison") : lotFarmer(lot);
  const place = lot => [lot.upazila, language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district].filter(Boolean).join(", ");
  const ready = lot => lot.readyDate && lot.readyDate <= todayPlus(0) ? t("এখনই প্রস্তুত", "Ready now") : prettyDate(lot.readyDate);
  const actions = lot => lot.practice ? `<button class="button button-outline" data-action="view-lot" data-id="${h(lot.id)}">${t("বিস্তারিত", "Details")}</button><button class="button button-green" data-view="buyer-plan">${t("লাভের হিসাব দেখুন", "Explore profit")}</button>` : `<button class="button button-outline" data-action="view-lot" data-id="${h(lot.id)}">${t("বিস্তারিত", "Details")}</button><button class="button button-green" data-action="contact-lot" data-id="${h(lot.id)}">${t("যোগাযোগ", "Contact")}</button>`;
  const saved = buyerSaved.length ? buyerSaved.map(id => buyerListing(id) || { id }) : practiceLots;
  const compared = (buyerSaved.length ? buyerCompared : practiceCompared).map(buyerListing).filter(available);
  if (compareOpen && compared.length >= 2) {
    const rows = [
      [t("কৃষক", "Farmer"), lot => h(farmer(lot))],
      [t("জায়গা", "Location"), lot => h(place(lot))],
      [t("পাওয়া যাবে", "Available"), lot => kg(availableKg(lot, data.deals))],
      [t("নিতে পারবেন", "Ready for collection"), ready],
      [t("দর / কেজি", "Asking price / kg"), priceText],
      [t("এই পরিমাণের মোট", "Total for this quantity"), lot => `<span data-comparison-total="${h(lot.id)}">${comparisonTotal(lot, comparisonQuantity)}</span>`],
      [t("আলুর অবস্থা", "Condition"), lot => h(lotNotes(lot) || t("তথ্য দেওয়া হয়নি", "Not provided"))],
      [t("আরও দেখুন", "Next step"), lot => `<div class="liked-table-actions">${actions(lot)}</div>`]
    ];
    return `<section class="section page-shell liked-page liked-comparison-page"><div class="section-header"><div><p class="section-kicker">${t("পছন্দের লট", "LIKED LOTS")}</p><h1>${t("পাশাপাশি তুলনা করুন", "Compare side by side")}</h1></div><button class="button button-outline" data-action="close-comparison">← ${t("পছন্দের লটে ফিরুন", "Back to liked lots")}</button></div><div class="liked-quantity-strip"><label for="comparison-quantity">${t("কত কেজি তুলনা করবেন?", "How many kilograms?")}<input id="comparison-quantity" name="comparisonQuantity" inputmode="decimal" value="${comparisonQuantity || ""}" maxlength="12" /></label><p>${t("সব লটে একই পরিমাণের দাম দেখুন। মোটে শুধু আলুর দাম, গাড়িভাড়া নয়।", "Compare the same quantity across lots. Totals include potatoes only, not transport.")}</p></div><table class="liked-comparison-table"><caption class="sr-only">${t("বাছাই করা আলুর লটের তুলনা", "Comparison of selected potato lots")}</caption><colgroup><col class="liked-row-label" />${compared.map(() => "<col />").join("")}</colgroup><thead><tr><th scope="col">${t("আলুর তথ্য", "Lot facts")}</th>${compared.map(lot => `<th scope="col"><div>${cataloguePhoto(lot)}<h2>${h(lotVariety(lot))}</h2></div></th>`).join("")}</tr></thead><tbody>${rows.map(([label, value], index) => `<tr ${index === 5 ? 'class="liked-total-row"' : ""}><th scope="row">${label}</th>${compared.map(lot => `<td>${value(lot)}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="liked-footnote">${t("তথ্য কৃষকের দেওয়া। সিদ্ধান্ত নেওয়ার আগে সরাসরি কথা বলে মিলিয়ে নিন।", "Facts are supplied by farmers. Confirm details with them before deciding.")}</p></section>`;
  }
  return `<div class="buyer-purchases-banner"><img src="/marketplace/banners/buyer-purchases-street-v1/banner.png" alt="${t("বাজারের দোকানে আলুর মান নিয়ে কথা বলছেন কৃষক ও ক্রেতা।", "A farmer and buyer discussing potatoes at a market shop.")}" /><svg viewBox="0 0 2172 304" preserveAspectRatio="none" aria-hidden="true"><g class="buyer-purchases-birds"><g class="bird bird-one"><path d="M0 10 Q11 -2 22 10 M22 10 Q34 -2 46 10"/><path d="M58 20 Q66 12 74 20 M74 20 Q82 12 90 20"/></g><g class="bird bird-two"><path d="M0 10 Q11 -2 22 10 M22 10 Q34 -2 46 10"/></g><g class="bird bird-three"><path d="M0 10 Q11 -2 22 10 M22 10 Q34 -2 46 10"/></g></g></svg></div><section class="section page-shell liked-page"><div class="section-header"><div><p class="section-kicker">${t("আপনার পছন্দ", "YOUR LIKED LOTS")}</p><h1>${t("পছন্দের লট ও তুলনা", "Liked lots and comparison")}</h1><p>${t("পাশাপাশি দেখতে ২–৪টি লটে টিক দিন।", "Tick 2–4 lots to compare side by side.")}</p></div><button class="button button-outline" data-view="home">${t("আরও আলু দেখুন", "Browse potatoes")} →</button></div>${saved.length ? `<div class="liked-selection-bar"><strong>${formatter.format(compared.length)} / ${formatter.format(4)} ${t("টি বাছাই", "selected")}</strong><span>${formatter.format(saved.length)} ${t("টি পছন্দের লট", "liked lots")}</span><button class="button button-green" data-action="compare-selected" ${compared.length < 2 ? "disabled" : ""}>${t("পাশাপাশি তুলনা করুন", "Compare side by side")}</button></div><p class="liked-selection-status" role="status"></p><ul class="liked-library">${saved.map(lot => {
    const active = available(lot);
    return `<li class="liked-row ${active ? "" : "liked-unavailable"}"><label class="liked-select"><input type="checkbox" data-action="compare-lot" data-id="${h(lot.id)}" ${buyerCompared.includes(lot.id) && active ? "checked" : ""} ${active ? "" : "disabled"} aria-label="${h(`${t("তুলনায় রাখুন", "Compare")} · ${lotVariety(lot) || t("পুরোনো লট", "Older lot")} · ${farmer(lot)}`)}" /></label>${lot.variety ? cataloguePhoto(lot) : `<span class="liked-missing-photo" aria-hidden="true">${icon("bag", 28)}</span>`}<div class="liked-identity"><h2>${h(lot.variety ? lotVariety(lot) : t("পুরোনো লট", "Older lot"))}</h2><strong>${h(lot.variety ? farmer(lot) : "")}</strong><p>${h(place(lot))}</p></div><div class="liked-availability">${active ? `<strong>${kg(availableKg(lot, data.deals))}</strong><small>${ready(lot)}</small>` : `<strong>${t("এখন পাওয়া যাচ্ছে না", "Currently unavailable")}</strong>`}</div><div class="liked-price">${lot.variety ? priceText(lot) : "—"}</div><div class="liked-row-actions">${active ? actions(lot) : ""}<button class="liked-remove" data-action="save-lot" data-id="${h(lot.id)}" aria-label="${h(`${t("পছন্দ থেকে সরান", "Remove from liked lots")} · ${lotVariety(lot) || lot.id}`)}">×</button></div></li>`;
  }).join("")}</ul>` : `<div class="empty-state"><h2>${t("এখনো কোনো লট পছন্দে রাখেননি", "No liked lots yet")}</h2><p>${t("আলুর তালিকায় ♡ চাপলে লট এখানে থাকবে।", "Press ♡ on a catalogue lot to keep it here.")}</p><button class="button button-green" data-view="home">${t("আলুর তালিকা দেখুন", "Browse potatoes")}</button></div>`}</section>`;
}
function readBuyerPlan() {
  const defaults = { quantity: "", budget: "50000", totalCost: "50000", other: "", unloading: "", resale: "", quoteMode: "itemized", tolls: "", packing: "", marketFees: "", weighing: "", storage: "", loss: "5", commissionMode: "off", commission: "" };
  try {
    const saved = JSON.parse(localStorage.getItem("alusathi-buyer-plan-v1") || "{}");
    const text = (value, fallback = "") => typeof value === "string" && value.length <= 16 ? value : fallback;
    return {
      inputs: Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, text(saved.inputs?.[key], value)])),
      fares: Object.fromEntries([...data.listings, ...practiceLots].map(lot => [lot.id, text(saved.fares?.[lot.id])])),
      prices: Object.fromEntries([...data.listings, ...practiceLots].map(lot => [lot.id, text(saved.prices?.[lot.id])])),
      checks: Object.fromEntries([...data.listings, ...practiceLots].map(lot => [lot.id, Array.isArray(saved.checks?.[lot.id]) ? [...new Set(saved.checks[lot.id].filter(value => ["weight", "deductions", "transport", "receipts"].includes(value)))] : []])),
      checklistLot: typeof saved.checklistLot === "string" ? saved.checklistLot : ""
    };
  } catch { return { inputs: defaults, fares: {}, prices: {}, checks: {}, checklistLot: "" }; }
}

function saveBuyerPlan() {
  const status = document.querySelector("#buyer-plan-save-status");
  try { localStorage.setItem("alusathi-buyer-plan-v1", JSON.stringify(buyerPlan)); if (status) status.textContent = ""; }
  catch { if (status) status.textContent = t("সেভ হয়নি। পাতা রিফ্রেশ করলে এই পরিবর্তন থাকবে না।", "Not saved. These changes will be lost on refresh."); }
}

function planNumber(value, optional = false) {
  const raw = String(value ?? "").trim().replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  if (!raw) return optional ? 0 : null;
  if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isFinite(number) && number <= 100000000 ? number : null;
}

function renderPotatoPriceHistory(container) {
  const months = t("জানু ফেব্রু মার্চ এপ্রি মে জুন জুলাই আগ সেপ্ট অক্টো নভে ডিসে", "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec").split(" ");
  const markets = [
    [t("ঢাকা", "Dhaka"), [35, 35.5, 28, 28, 28, 28, 27, 27, 18, 19, 16, 16]],
    [t("রংপুর", "Rangpur"), [28, 27.5, 28, 27.5, 28, 28, 25, 25, 20, 20, 16, 16.1]],
    [t("চট্টগ্রাম", "Chattogram"), [35, 34, 28, 28, 28, 28, 25, 25, 20, 19, 16, 16]],
    [t("রাজশাহী", "Rajshahi"), [31.4, 29.5, 20.4, 20.5, 20.5, 20.5, 22, 22, 20, 20, 16.8, 16.8]],
    [t("খুলনা", "Khulna"), [32.5, 31, 22.5, 25, 23.5, 23.2, 19, 19.2, 19, 18.8, 15, 16]],
    [t("সিলেট", "Sylhet"), [32, 32, 22, 22, 22.2, 22.2, 22.2, 22.2, 20, 20, 16.2, 16.5]],
  ];
  const format = new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en");
  const x = i => 61 + i * 62;
  const y = price => 252 - price * 4.75;
  const title = t("আলুর পাইকারি দর · ২০২৫", "Wholesale potato prices · 2025");
  const source = "https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-bbs/";
  const renderSeries = ([name, values]) => `
    <div class="plan-price-stage">
      <svg class="plan-price-plot" viewBox="0 0 780 285" role="group" aria-label="${name} · ${title}">
        ${[0, 10, 20, 30, 40].map(price => `<line x1="49" x2="753" y1="${y(price)}" y2="${y(price)}" stroke="var(--home-line)"/><text x="38" y="${y(price) + 5}" text-anchor="end">${format.format(price)}</text>`).join("")}
        ${months.map((_, i) => `<path d="M${x(i)} 62V252" stroke="var(--home-line)"/>`).join("")}
        <path d="M49 57V252H755" fill="none" stroke="var(--home-muted)" stroke-width="2"/>
        <polyline class="plan-price-line" pathLength="1" points="${values.map((price, i) => `${x(i)},${y(price)}`).join(" ")}"/>
        ${months.map((month, i) => {
          const label = `${month} · ৳${format.format(values[i])}/${t("কেজি", "kg")}`;
          return `<g class="plan-price-month" tabindex="0" role="img" aria-label="${label}">
            <rect class="plan-price-hit" x="${x(i) - 25}" y="59" width="50" height="193"/>
            <circle class="plan-price-point" cx="${x(i)}" cy="${y(values[i])}" r="5" style="animation-delay:${i * 45}ms"/>
            <text x="${x(i)}" y="274" text-anchor="middle">${month}</text>
            <g class="plan-price-tooltip" aria-hidden="true"><rect x="279" y="6" width="222" height="34" rx="17"/><text x="390" y="28" text-anchor="middle">${label}</text></g>
          </g>`;
        }).join("")}
      </svg>
    </div>
    <details><summary>${t("মাসের দর দেখুন", "View monthly prices")}</summary>
      <table><caption>${t("মাসের গড় পাইকারি দর (৳/কেজি)", "Monthly wholesale averages (৳/kg)")}</caption>
      <thead><tr><th scope="col">${t("মাস", "Month")}</th><th scope="col">${name}</th></tr></thead>
      <tbody>${months.map((month, i) => `<tr><th scope="row">${month}</th><td>${format.format(values[i])}</td></tr>`).join("")}</tbody></table>
    </details>`;
  container.insertAdjacentHTML("afterend", `<section class="plan-chart-panel plan-price-history" aria-labelledby="plan-price-title">
    <h2 id="plan-price-title">${title}</h2>
    <p>${t("বিভাগীয় শহরের মাসের গড় দর (৳/কেজি)। এগুলো আগের বাজারদর, এখনকার দর নয়।", "Monthly wholesale averages by divisional city (৳/kg). Historical prices, not current quotes.")}</p>
    <label class="plan-price-select">${t("বিভাগীয় শহর", "Divisional city")}
      <select>${markets.map(([name], i) => `<option value="${i}">${name}</option>`).join("")}</select>
    </label>
    <div class="plan-price-series">${renderSeries(markets[0])}</div>
    <p>${t("সূত্র: বাংলাদেশ পরিসংখ্যান ব্যুরো, টেবিল ৩.১", "Source: Bangladesh Bureau of Statistics, Table 3.1")} · <a href="${source}2024/12/5f334e11020f42259d9dc80df2ddb392.pdf">${t("জানুয়ারি–জুন", "Jan–Jun")}</a> · <a href="${source}2026/3/41334f24-b49c-413e-8201-3fe480c44ee3.pdf">${t("জুলাই–ডিসেম্বর", "Jul–Dec")}</a></p>
  </section>`);
  const chart = container.nextElementSibling;
  chart.querySelector("select").addEventListener("change", event => {
    const market = markets[Number(event.target.value)];
    if (market) chart.querySelector(".plan-price-series").innerHTML = renderSeries(market);
  });
}

let costLotId = "";

function renderBuyerPlan() {
  const lot = buyerListing(costLotId);
  const asking = Number(lot?.askingPriceKg ?? lot?.priceKg ?? lot?.askingPrice);
  const costField = (name, bn, en, value = "") => `<label>${t(bn,en)}<input name="${name}" inputmode="decimal" maxlength="16" value="${h(value)}"></label>`;
  return `<section class="section page-shell buyer-plan-page">
    <div class="section-header"><div><h1>${t("খরচ ও লাভ", "Cost & profit")}</h1>
    <p>${t("কত কেজি বিক্রি করবেন আর কত দামে, তা দিয়ে হিসাব করুন।", "Enter how many kilos you’ll sell and your resale price.")}</p></div></div>
    ${lot ? `<p class="plan-selected-lot"><strong>${h(lotVariety(lot))}</strong> · ${h(cataloguePlace(lot))} · ${kg(availableKg(lot, data.deals))} ${t("পাওয়া যাবে", "available")}</p>` : ""}
    <form id="buyer-plan-form" class="plan-inputs">
      <label>${t("কত কেজি বিক্রি করবেন?", "How many kg will you sell?")}<input name="quantity" inputmode="decimal" maxlength="16" value="${h(buyerPlan.inputs.quantity)}"></label>
      <label>${t("বিক্রির দাম / কেজি (৳)", "Resale price per kg (৳)")}<input name="resale" inputmode="decimal" maxlength="16" value="${h(buyerPlan.inputs.resale)}"></label>
      <details class="plan-optional plan-budget-editor"><summary><span id="plan-estimated-budget"></span><span>${t("এডিট করুন", "Edit")}</span></summary>
      ${costField("totalCost","মোট খরচ (৳)","Total cost (৳)",buyerPlan.inputs.totalCost)}
      <details class="plan-cost-breakdown"><summary>${t("বিস্তারিত দেখুন", "View breakdown")}</summary>
        <p>${t("এখানে কেনা ও বিক্রির কেজি একই ধরে হিসাব হবে। কোনো ফি আগে ধরা থাকলে আবার লিখবেন না।", "Uses the same quantity for buying and selling. Don’t enter fees already included elsewhere.")}</p>
        <div class="plan-cost-fields">
          ${costField("buyPrice","আলু কেনার দাম / কেজি (৳)","Buying price per kg (৳)",asking > 0 && Number.isFinite(asking) ? asking : "")}
          ${costField("transportCost","গাড়িভাড়া (৳)","Transport (৳)")}
          ${costField("laborCost","ওঠানো-নামানো (৳)","Loading and unloading (৳)")}
          ${costField("weighingCost","ওজন মাপার খরচ (৳)","Weighing fee (৳)")}
          ${costField("packingCost","বস্তা ও বাছাই (৳)","Packaging and sorting (৳)")}
          ${costField("marketCost","বাজারের ফি (৳)","Market fees (৳)")}
          ${costField("storageCost","আলু রাখার খরচ (৳)","Storage (৳)")}
          ${costField("otherCost","অন্য খরচ (৳)","Other costs (৳)")}
        </div>
        <button type="button" class="button button-outline" data-action="apply-lot-costs">${t("মোট খরচে বসান", "Use this total")}</button>
        <p id="plan-breakdown-status" role="status"></p>
      </details></details>
      <button type="submit" class="button button-green plan-calculate">${t("হিসাব করুন", "Calculate")}</button>
    </form>
    <p id="buyer-plan-validation" role="status"></p>
    <div id="buyer-plan-results" aria-live="polite"></div>
    <p id="buyer-plan-save-status" role="status"></p>
  </section>`;
}

function updateBuyerPlan(calculate = false) {
  const form = document.querySelector("#buyer-plan-form");
  if (!form) return;
  const { quantity, resale, totalCost } = buyerPlan.inputs;
  const kgToSell = planNumber(quantity), price = planNumber(resale), cost = planNumber(totalCost);
  const status = document.querySelector("#buyer-plan-validation");
  const result = document.querySelector("#buyer-plan-results");
  document.querySelector("#plan-estimated-budget").textContent = `${t("আনুমানিক মোট খরচ", "Estimated total cost")}: ${cost === null ? "—" : rate(cost)}`;
  status.textContent = "";
  result.replaceChildren();
  if (!calculate) return;
  if (form.dataset.breakdownStale) {
    status.textContent = t("বিস্তারিত থেকে মোট খরচ আবার বসান, অথবা মোট খরচ নিজে লিখুন।", "Apply the updated breakdown or enter the total cost directly.");
    return;
  }
  if (!(kgToSell > 0) || kgToSell > 1000000 || price === null || cost === null) {
    status.textContent = t("সঠিক কেজি, বিক্রির দাম ও মোট খরচ লিখুন।", "Enter valid kilos, resale price, and total cost.");
    return;
  }
  const revenue = Math.round(kgToSell * price * 100) / 100;
  const profit = Math.round((revenue - cost) * 100) / 100;
  const breakEven = Math.ceil(cost * 100 / kgToSell - 1e-8) / 100;
  result.innerHTML = `<section class="plan-chart-panel plan-simple-result">
    <h2 class="${profit < 0 ? "plan-loss" : "plan-profit"}">${profit === 0 ? t("লাভ–লোকসান নেই", "Break-even") : `${rate(Math.abs(profit))} ${profit < 0 ? t("আনুমানিক লোকসান", "estimated loss") : t("আনুমানিক লাভ", "estimated profit")}`}</h2>
    <p>${t("বিক্রির টাকা", "Sales revenue")}: ${rate(revenue)} · ${t("খরচ তুলতে প্রতি কেজি", "Break-even per kg")}: ${rate(breakEven)}</p>
  </section>`;
}

function closeCatalogueDialog() {
  detailLotId = ""; contactLotId = ""; render();
  if (catalogueReturnFocus) document.querySelector(catalogueReturnFocus)?.focus({ preventScroll: true });
}

const publicSampleGalleries = new Map([
  ["Diamant", [1, 2, 4]],
  ["Cardinal", [2, 1, 5]],
  ["Granola", [3, 2, 3]],
  ["Asterix", [4, 1, 4]],
  ["Lady Rosetta", [5, 3, 5]],
]);

const publicReferencePhotos = [1, 2, 3, 4, 5].map(n => `/marketplace/demo-lots/potato-gallery-0${n}.webp`);

function cataloguePhotos(lot) {
  const photos = [...(Array.isArray(lot.photos) ? lot.photos.map(photo => typeof photo === "string" ? photo : photo?.src) : []), lot.photo].map(photoSrc).filter(Boolean);
  const originals = [...new Set(photos)];
  if (lot.sample) {
    const [cover, second, third] = publicSampleGalleries.get(lot.variety) ?? [1, 2, 4];
    const base = "/marketplace/demo-lots/potato-";
    const references = cover === 1
      ? [publicReferencePhotos[third - 1], publicReferencePhotos[second - 1], `${base}01.webp`]
      : [`${base}0${cover}-v2.png`, publicReferencePhotos[second - 1], publicReferencePhotos[third - 1]];
    const listingNumber = Number(/^illustrative-lot-(\d+)$/.exec(lot.id)?.[1]) || 1;
    const offset = Math.floor((listingNumber - 1) / 5) % references.length;
    return [...new Set([...originals, ...references.slice(offset), ...references.slice(0, offset)])].slice(0, 3);
  }
  if (!publicPreview || originals.length >= 3) return originals;
  const offset = Array.from(String(lot.id)).reduce((sum, char) => sum + char.codePointAt(0), 0) % publicReferencePhotos.length;
  const references = [...publicReferencePhotos.slice(offset), ...publicReferencePhotos.slice(0, offset)];
  return [...originals, ...references].slice(0, 3);
}

const publicPhotoLabel = () => t("নমুনা লটের নাম, ছবি ও দর শুধু দেখার জন্য।", "Sample lots use illustrative names, photos and prices.");
function publicLotImage(src) {
  return `${src ? `<img class="lot-photo" src="${h(src)}" alt="${t("আলুর ছবি", "Potato photo")}" loading="lazy">` : ""}<span class="public-photo-fallback" ${src ? "hidden" : ""}>${t("ছবি পাওয়া যায়নি", "Photo unavailable")}</span><span class="public-reference-label">${t("প্রতীকী ছবি", "Representative photo")}</span>`;
}

function catalogueRowPhoto(lot) {
  const photos = cataloguePhotos(lot);

  const visible = photos.length ? photos.slice(0, 3) : [""];
  return `<div class="catalogue-row-gallery${lot.sample ? " public-sample-gallery" : ""}" data-index="0"><div class="catalogue-row-gallery-window"><div class="catalogue-row-gallery-track">${visible.map((src, i) => `<div class="catalogue-row-gallery-slide" aria-hidden="${i !== 0}">${publicLotImage(src)}</div>`).join("")}</div>${visible.length > 1 ? `<button type="button" class="catalogue-row-prev" data-action="catalogue-row-photo" data-step="-1" aria-label="${t("আগের ছবি", "Previous photo")}">‹</button><button type="button" class="catalogue-row-next" data-action="catalogue-row-photo" data-step="1" aria-label="${t("পরের ছবি", "Next photo")}">›</button>` : ""}</div>${visible.length > 1 ? `<div class="catalogue-row-dots">${visible.map((_, i) => `<button type="button" data-action="catalogue-row-photo" data-slide="${i}" aria-pressed="${i === 0}" aria-label="${t("ছবি", "Photo")} ${formatter.format(i + 1)}"></button>`).join("")}</div>` : ""}${photos.length > 3 ? `<small class="catalogue-photo-count">${formatter.format(photos.length)} ${t("টি ছবি", "photos")}</small>` : ""}</div>`;
}

function cataloguePhoto(lot) {
  const src = cataloguePhotos(lot)[0];
  return src ? `<img class="lot-photo" src="${h(src)}" alt="${h(lotVariety(lot))}" loading="lazy" />` : photoOrArtwork(lot);
}

function lotContact(lot) {
  const name = lot.farmerName || lot.farmer?.name || lot.ownerName || "";
  const ownProfile = Boolean(name && name === farmerProfile.name);
  const sharing = lot.contactSharingEnabled ?? lot.farmer?.contactSharingEnabled ?? (ownProfile && farmerProfile.contactSharingEnabled);
  const number = value => {
    const raw = String(value || "").replace(/[\s()-]/g, "");
    const digits = /^01[3-9]\d{8}$/.test(raw) ? `+88${raw}` : raw;
    return /^\+?[0-9]{8,15}$/.test(digits) ? digits : "";
  };
  return sharing ? {
    phone: number(lot.farmerPhone || lot.farmer?.phone || lot.contactPhone || (ownProfile ? farmerProfile.phone : "")),
    whatsapp: number(lot.farmerWhatsapp || lot.farmer?.whatsapp || (ownProfile ? farmerProfile.whatsapp : ""))
  } : { phone: "", whatsapp: "" };
}

function contactChannels(lot) {
  if (lot.sample) return `<div class="catalogue-contact-missing"><strong>${t("এটি নমুনা কথাবার্তা", "This is an example enquiry")}</strong><p>${t("নিচের বার্তা কপি করে দেখুন। এই নমুনায় কোনো কৃষকের নম্বর নেই, বার্তা পাঠানো হবে না।", "Try the message below. This example has no farmer number and sends nothing.")}</p></div>`;
  const contact = lotContact(lot);
  return contact.phone || contact.whatsapp ? `<div class="catalogue-contact-channels">${contact.phone ? `<a class="button button-outline" href="tel:${h(contact.phone)}">${t("ফোন করুন", "Call farmer")}<small>${h(contact.phone)}</small></a>` : ""}${contact.whatsapp ? `<a class="button button-green" href="https://wa.me/${h(contact.whatsapp.replace(/^\+/, ""))}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>` : ""}</div>` : `<div class="catalogue-contact-missing"><strong>${t("যোগাযোগের নম্বর দেওয়া নেই", "Contact number not provided")}</strong><p>${t("এই লটে এখন সরাসরি যোগাযোগ করা যাচ্ছে না। অন্য লট দেখতে পারেন।", "This lot has no shared contact channel yet. You can browse other lots.")}</p></div>`;
}

function renderBuyerLotDialog() {
  const lot = buyerListing(detailLotId);
  if (!lot) return "";
  const photos = cataloguePhotos(lot);
  const gallery = photos.length ? photos : [""];
  detailPhotoIndex = Math.min(detailPhotoIndex, gallery.length - 1);
  const farmer = lot.practice ? t("তুলনার জন্য দেওয়া আলু", "Example for comparison") : lotFarmer(lot);
  const available = availableKg(lot, data.deals);
  const asking = Number(lot.askingPriceKg ?? lot.priceKg ?? lot.askingPrice);
  return `<div class="modal-backdrop" data-action="close-lot"><section class="modal buyer-lot-modal catalogue-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="buyer-lot-title"><button class="modal-close" data-action="close-lot" aria-label="${t("বন্ধ করুন", "Close")}">×</button><div class="catalogue-detail-gallery">${publicLotImage(gallery[detailPhotoIndex])}${gallery.length > 1 ? `<div class="catalogue-gallery-controls"><button class="button button-outline" data-action="lot-photo" data-step="-1" aria-label="${t("আগের ছবি", "Previous photo")}">←</button><span aria-live="polite">${formatter.format(detailPhotoIndex + 1)} / ${formatter.format(gallery.length)}</span><button class="button button-outline" data-action="lot-photo" data-step="1" aria-label="${t("পরের ছবি", "Next photo")}">→</button></div>` : ""}</div><div class="catalogue-detail-copy"><p class="section-kicker">${t("আলুর বিস্তারিত", "LOT DETAILS")}</p><h2 id="buyer-lot-title">${h(lotVariety(lot))}</h2><p>${h(farmer)} · ${h(lot.upazila || "")}${lot.upazila ? ", " : ""}${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p><div class="catalogue-detail-price"><strong>${publicPreview ? cataloguePriceText(lot) : priceText(lot)}</strong>${!publicPreview && Number.isFinite(asking) && asking > 0 ? `<span>${t("পুরো লট", "Whole lot")}: ${money(asking * available)}</span>` : ""}</div>${publicPreview && lot.sample ? `<p>${publicPhotoLabel()}</p>` : ""}<dl><div><dt>${t("পাওয়া যাবে", "Available")}</dt><dd>${kg(available)}</dd></div><div><dt>${t("নিতে পারবেন", "Ready date")}</dt><dd>${prettyDate(lot.readyDate)}</dd></div><div class="catalogue-condition"><dt>${t("আলুর অবস্থা", "Condition")}</dt><dd>${h(lotNotes(lot) || t("তথ্য দেওয়া হয়নি", "Not provided"))}</dd></div>${lotPackaging(lot) ? `<div><dt>${t("প্যাকিং", "Packing")}</dt><dd>${h(lotPackaging(lot))}</dd></div>` : ""}</dl>${publicPreview ? "" : `<button class="button button-green" data-action="contact-lot" data-id="${h(lot.id)}">${t("কৃষকের সঙ্গে যোগাযোগ করুন", "Contact farmer")}</button>`}</div></section></div>`;
}

function renderFarmerContactDialog() {
  const lot = data.listings.find(item => item.id === contactLotId);
  if (!lot) return "";
  const farmer = lotFarmer(lot);
  return `<div class="modal-backdrop" data-action="close-contact"><section class="modal buyer-contact-modal catalogue-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="buyer-contact-title"><button class="modal-close" data-action="close-contact" aria-label="${t("বন্ধ করুন", "Close")}">×</button><p class="section-kicker">${t("কৃষকের সঙ্গে যোগাযোগ", "CONTACT THE FARMER")}</p><div class="catalogue-contact-identity">${cataloguePhoto(lot)}<div><h2 id="buyer-contact-title">${h(farmer)}</h2><p>${h(lotVariety(lot))} · ${kg(availableKg(lot, data.deals))}</p><p>${h(lot.upazila || "")} · ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p></div></div>${contactChannels(lot)}<p class="catalogue-contact-note">${t("দাম, আলুর অবস্থা আর কবে নেবেন, কৃষকের সঙ্গে কথা বলে ঠিক করুন। কেনাবেচা আলুসাথীতে হয় না।", "Discuss price, condition and collection directly. Buying and selling happen outside AluSathi.")}</p></section></div>`;
}
function readInterests() {
  const rows=JSON.parse(localStorage.getItem("alusathi-buyer-interest-v1") || "[]");
  if (!Array.isArray(rows)) throw new Error("Unreadable interest history");
  return rows;
}

function renderBuyerProfile() {
  return `<fieldset class="form-section buyer-profile"><legend>${t("যোগাযোগ ও ঠিকানা", "Contact and address")}</legend><p>${t("প্রথম দর দেওয়ার সময় লিখুন। পরেরবার আর লিখতে হবে না।", "Add this on your first offer. It will be saved for later offers.")}</p><div class="form-grid"><label>${t("যোগাযোগের ব্যক্তির নাম", "Contact person")}<input name="contactPerson" required minlength="2" maxlength="80" autocomplete="name" value="${h(buyerProfile.contactPerson || "")}" /></label><label>${t("মোবাইল নম্বর", "Mobile number")}<input name="contactPhone" required inputmode="tel" autocomplete="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" title="Bangladesh mobile number" value="${h(buyerProfile.contactPhone || "")}" /></label><label>${t("উপজেলা / থানা", "Upazila / area")}<input name="buyerUpazila" required minlength="2" maxlength="80" value="${h(buyerProfile.buyerUpazila || "")}" /></label><label>${t("বাজার বা সংগ্রহের ঠিকানা", "Market or collection address")}<input name="buyerAddress" required minlength="5" maxlength="180" value="${h(buyerProfile.buyerAddress || "")}" /></label></div><small>${t("এই তথ্য ব্রাউজারে থাকে; পরিচয় যাচাই হয় না।", "These details stay in this browser; identity is not verified.")}</small></fieldset>`;
}

function renderOfferForm() {
  const lot = data.listings.find(item => item.id === draftLotId);
  if (!lot) return "";
  const remaining = availableKg(lot, data.deals);
  return `<form id="offer-form" class="panel offer-form"><input type="hidden" name="lotId" value="${h(lot.id)}" /><div class="section-header"><div><p class="section-kicker">${t("এই আলুর জন্য দর", "OFFER FOR THIS LOT")}</p><h2>${h(lot.variety)} · ${kg(remaining)}</h2></div><button type="button" class="text-arrow" data-action="close-offer">${t("বন্ধ করুন", "Close")}</button></div><fieldset class="form-section"><legend>${t("১ · দর ও পরিমাণ", "1 · Price and quantity")}</legend><div class="form-grid"><label>${t("আপনার ব্যবসার নাম", "Business name")}<input name="buyer" required minlength="2" maxlength="80" placeholder="${t("ক্রেতা", "Buyer")}" /></label><label>${t("ক্রেতার জেলা", "Buyer district")}<select name="district">${districtOptions("Bogura")}</select></label><label>${t("যত কেজি নিতে চান", "Quantity you can buy (kg)")}<input name="quantityKg" required type="number" min="1" max="${remaining}" step="1" inputmode="numeric" value="${Math.min(remaining, 1000)}" /></label><label>${t("দর (টাকা/কেজি)", "Price (BDT/kg)")}<input name="priceKg" required type="number" min="1" max="10000" step="0.01" inputmode="decimal" placeholder="25" /></label></div></fieldset><fieldset class="form-section"><legend>${t("২ · নেওয়া ও টাকা", "2 · Pickup and payment")}</legend><div class="form-grid"><label>${t("আনুমানিক কত % আলু নেবেন?", "How much of the lot will you take? (%)")}<input name="acceptedPercent" required type="number" min="1" max="100" step="1" inputmode="numeric" value="100" /></label><label>${t("কে আলু নিয়ে যাবেন?", "Who collects?")}<select name="pickup"><option value="buyer">${t("ক্রেতা", "Buyer")}</option><option value="farmer">${t("কৃষক পাঠাবেন", "Farmer delivers")}</option></select></label><label>${t("টাকা কত দিনে দেবেন?", "Payment within how many days?")}<input name="paymentDays" required type="number" min="0" max="30" step="1" inputmode="numeric" value="0" /></label></div></fieldset><fieldset class="form-section"><legend>${t("৩ · খরচ ও শর্ত", "3 · Costs and terms")}</legend><div class="form-grid"><label>${t("কৃষকের গাড়িভাড়া (মোট টাকা)", "Farmer transport cost (total BDT)")}<input name="transport" required type="number" min="0" max="1000000" step="1" inputmode="numeric" value="0" /></label><label>${t("ওঠানো / প্যাকেট খরচ (মোট টাকা)", "Handling / sacks (total BDT)")}<input name="handling" required type="number" min="0" max="1000000" step="1" inputmode="numeric" value="0" /></label><label>${t("অন্যান্য ফি (মোট টাকা)", "Other fees (total BDT)")}<input name="fee" required type="number" min="0" max="1000000" step="1" inputmode="numeric" value="0" /></label><label>${t("দরের শেষ দিন", "Offer expires")}<input name="expires" required type="date" min="${todayPlus(0)}" value="${todayPlus(7)}" /></label></div><label>${t("গ্রেড, ওজন ও কাটতির নিয়ম", "Grade, weighing and deduction terms")}<textarea name="terms" required maxlength="400" rows="3" placeholder="${t("যেমন: মাঝারি আলু, ওজন তোলার সময়; কাটতি হলে ছবি দিতে হবে", "e.g. Medium potatoes; weigh at pickup; show photos for any rejection")}"></textarea></label></fieldset><p class="form-warning">${t("আপনার দর শুধু এই ব্রাউজারে থাকবে; পরিচয় যাচাই হয় না।", "Your offer stays in this browser; identity is not verified.")}</p><button class="button button-green submit" type="submit">${t("দর রাখুন", "Save offer")}${icon("arrow", 18)}</button></form>`;
}

function renderBuyerOffers() {
  const offers = data.offers.filter(offer => !offer.sample);
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ক্রেতার বোর্ড", "BUYER BOARD")}</p><h1>${t("আপনার দেওয়া দর", "Offers entered here")}</h1><p>${t("সব দর শুধু এই ব্রাউজারে থাকে।", "All offers stay in this browser.")}</p></div><div class="inner-hero-mark">${icon("scale", 52)}</div></section><section class="section page-shell"><div class="offer-grid">${offers.length ? offers.map(offer => { const lot = data.listings.find(item => item.id === offer.lotId); return lot ? renderOfferCard(offer, lot) : ""; }).join("") : `<div class="empty-state"><h2>${t("এখনো দর দেননি", "No offers entered yet")}</h2><button class="button button-green" data-view="home">${t("আলুর তালিকা দেখুন", "Browse lots")}</button></div>`}</div></section>`;
}

function renderReview() {
  const offer = data.offers.find(item => item.id === reviewOfferId);
  const lot = offer && data.listings.find(item => item.id === offer.lotId);
  if (!lot) return "";
  const remaining = availableKg(lot, data.deals);
  const quantity = offerRemainingKg(offer, lot);
  const result = estimateOffer(offer, quantity);
  if (!quantity) return `<div class="modal-backdrop" data-action="close-review"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button class="modal-close" data-action="close-review" aria-label="Close">×</button><h2 id="review-title">${t("এই দর আর নেওয়া যাবে না", "This offer is no longer available")}</h2><p>${t("এই ক্রেতার চাওয়া পরিমাণ বা জমির বাকি আলু অন্য চুক্তিতে চলে গেছে।", "The buyer's requested amount or the farmer's remaining potatoes are already committed.")}</p><div class="modal-actions"><button type="button" class="button button-green" data-action="close-review">${t("ফিরে যান", "Go back")}</button></div></div></div>`;
  return `<div class="modal-backdrop" data-action="close-review"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button class="modal-close" data-action="close-review" aria-label="Close">×</button><p class="section-kicker">${t("চুক্তির আগে মিলিয়ে নিন", "CHECK BEFORE AGREEING")}</p><h2 id="review-title">${t("এই শর্তে বিক্রি করবেন?", "Agree to these terms?")}</h2><p>${t("এটি এখানে রাখা নথি; এর মাধ্যমে টাকা দেওয়া হয় না।", "This is a record saved here; it does not send a payment.")}</p><form id="deal-form"><input type="hidden" name="offerId" value="${h(offer.id)}" /><label>${t("এই দর থেকে কত কেজি বিক্রি করবেন?", "How many kilograms from this offer?")}<input name="quantityKg" required type="number" min="1" max="${quantity}" value="${quantity}" step="1" inputmode="numeric" /></label><div class="deal-summary"><div><span>${t("ক্রেতা", "Buyer")}</span><strong>${h(offer.buyer)} ${offer.sample ? `(${t("আগে থেকে রাখা", "starting offer")})` : ""}</strong></div><div><span>${t("দর", "Price")}</span><strong>${rate(offer.priceKg)}/${t("কেজি", "kg")}</strong></div><div><span>${t("বর্তমান আনুমানিক হাতে", "Current estimated take-home")}</span><strong data-preview-net>${money(result.net)}</strong></div><div><span>${t("ওজন ও কাটতির নিয়ম", "Weight and deduction terms")}</span><strong>${h(offer.terms)}</strong></div><div><span>${t("টাকা পাওয়ার সময়", "Payment timing")}</span><strong>${offer.paymentDays === 0 ? t("সেদিন", "Same day") : `${h(offer.paymentDays)} ${t("দিন", "days")}`}</strong></div></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-review">${t("আরও দেখি", "Keep looking")}</button><button type="submit" class="button button-green">${t("চুক্তির নথি রাখুন", "Save deal record")}</button></div></form></div></div>`;
}

function updateReviewPreview(form) {
  const offer = data.offers.find(item => item.id === reviewOfferId);
  if (!offer || !form) return;
  const input = form.elements.quantityKg;
  const quantity = validNumber(input.value, 1, Number(input.max));
  const summary = form.querySelector(".summary-text");
  const net = form.querySelector("[data-preview-net]");
  if (summary) summary.textContent = quantity ? offerSummary(offer, quantity, language) : t("সঠিক কেজি লিখুন।", "Enter a valid quantity.");
  if (net) net.textContent = quantity ? money(estimateOffer(offer, quantity).net) : "—";
}

function dealStatus(deal) {
  return ({ agreed: t("চুক্তি হয়েছে", "Agreed"), pickup_pending: t("ওজন নিশ্চিতের অপেক্ষা", "Weight awaiting farmer"), collected: t("তোলা হয়েছে", "Collected"), payment_pending: t("টাকা নিশ্চিতের অপেক্ষা", "Payment awaiting farmer"), paid: t("টাকা পাওয়া গেছে", "Paid") })[deal.status] || "—";
}

function renderDealCard(deal) {
  const offer = deal.offer;
  const estimate = estimateOffer(offer, deal.quantityKg);
  const actualNet = deal.actualAcceptedKg != null ? deal.actualAcceptedKg * offer.priceKg - estimate.costs : estimate.net;
  let action = "";
  if (deal.status === "agreed" && role === "buyer") action = `<form class="inline-form" data-form="pickup" data-id="${h(deal.id)}"><label>${t("মাপা ওজন (কেজি)", "Accepted weight (kg)")}<input name="actualAcceptedKg" type="number" min="1" max="${h(deal.quantityKg)}" value="${h(deal.quantityKg)}" required /></label><label>${t("ওজন / কাটতির কথা", "Weight or rejection note")}<input name="pickupNote" maxlength="180" placeholder="${t("যেমন: ১০ কেজি বাদ", "e.g. 10 kg rejected")}" /></label><button class="button button-green button-small">${t("ওজন পাঠান", "Submit weight")}</button></form>`;
  if (deal.status === "pickup_pending" && role === "farmer") action = `<div class="action-box"><p>${t("ক্রেতা বলছেন গ্রহণ করেছেন", "Buyer reports accepted")}: <strong>${kg(deal.actualAcceptedKg)}</strong>. ${h(deal.pickupNote || "")}</p><button class="button button-green button-small" data-action="confirm-pickup" data-id="${h(deal.id)}">${t("ওজন মেনে নিন", "Approve weight")}</button><button class="text-arrow" data-action="dispute" data-id="${h(deal.id)}">${t("মিলছে না—সহায়তা চাই", "Dispute this")}</button></div>`;
  if (deal.status === "collected" && role === "buyer") { const due = Math.max(0, actualNet); const paid = Math.max(0, Number(deal.paidAmount) || 0); const balance = Math.max(0, due - paid); action = `<form class="inline-form" data-form="payment" data-id="${h(deal.id)}"><p>${t("বাকি টাকা", "Remaining balance")}: <strong>${money(balance)}</strong></p><label>${t("পাঠানো টাকার পরিমাণ", "Amount sent (BDT)")}<input name="paymentAmount" type="number" min="1" max="${balance}" value="${balance}" required /></label><label>${t("লেনদেন নম্বর / রসিদ", "Payment reference")}<input name="paymentRef" maxlength="80" required /></label><button class="button button-green button-small">${t("টাকার কথা রাখুন", "Record payment")}</button></form>`; }
  if (deal.status === "payment_pending" && role === "farmer") action = `<div class="action-box"><p>${t("ক্রেতা পাঠানোর কথা লিখেছেন", "Buyer claims to have sent")}: <strong>${money(deal.paymentAmount)}</strong> · ${t("মোট পাওয়া", "Total recorded")}: <strong>${money(deal.paidAmount)}</strong> · ${t("বাকি", "Remaining")}: <strong>${money(deal.remainingBalance)}</strong> · ${t("রেফারেন্স", "Reference")}: ${h(deal.paymentRef)}. ${t("নিজের হিসাবে টাকা দেখে তারপর নিশ্চিত করুন।", "Check your own account before confirming.")}</p><button class="button button-green button-small" data-action="confirm-payment" data-id="${h(deal.id)}">${t("টাকা পেয়েছি", "I received the money")}</button><button class="text-arrow" data-action="dispute" data-id="${h(deal.id)}">${t("পাইনি—সমস্যা লিখুন", "Not received")}</button></div>`;
  return `<article class="deal-card"><div class="deal-card-header"><div><span class="small-label">${deal.sample ? t("চুক্তির নথি", "DEAL RECORD") : t("চুক্তির নথি", "DEAL RECORD")}</span><h3>${h(offer.buyer)} <span>· ${h(deal.variety)}</span></h3></div><span class="status-pill ${deal.status === "paid" ? "status-paid" : ""}">${dealStatus(deal)}</span></div><div class="deal-facts"><div><span>${t("চুক্তির পরিমাণ", "Agreed quantity")}</span><strong>${kg(deal.quantityKg)}</strong></div><div><span>${t("দর", "Price")}</span><strong>${rate(offer.priceKg)}/${t("কেজি", "kg")}</strong></div><div><span>${t("হাতে আসার হিসাব", "Estimated take-home")}</span><strong>${money(estimate.net)}</strong></div><div><span>${t("আসল গ্রহণ", "Accepted at pickup")}</span><strong>${deal.actualAcceptedKg == null ? t("এখনো নয়", "Not yet") : kg(deal.actualAcceptedKg)}</strong></div></div><p class="deal-terms">${icon("shield", 18)}${h(offer.terms)} ${t("· গাড়িভাড়া", "· Transport")}: ${money(offer.transport)} · ${t("অন্য খরচ", "Other costs")}: ${money(offer.handling + offer.fee)} · ${t("টাকা", "Payment")}: ${h(offer.paymentDays)} ${t("দিনে", "days")}</p>${action}${deal.status === "paid" ? `<p class="paid-note">${icon("check", 18)}${t("কৃষক টাকা পেয়েছেন বলে লিখেছেন; টাকা যাচাই করা হয়নি।", "Farmer marked payment received; the payment was not verified.")}</p>` : ""}<div class="deal-card-footer"><span>${t("চুক্তির নম্বর", "Deal ID")}: ${h(deal.id.slice(0, 8))}</span><button class="text-arrow" data-action="print-deal" data-id="${h(deal.id)}">${t("চুক্তি ছাপুন", "Print deal card")}${icon("arrow", 15)}</button></div></article>`;
}

function renderDeals() {
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ধাপ ৩ / বিক্রির নথি", "STEP 3 / DEAL RECORD")}</p><h1>${t("কথা নয়, লিখিত শর্ত।", "Keep the terms in writing.")}</h1><p>${t("ওজন, কাটতি ও টাকা পাওয়ার খবর একই জায়গায় রাখুন।", "Keep weighing, deductions and payment claims in one place.")}</p></div><div class="inner-hero-mark">${icon("shield", 52)}</div></section><section class="section page-shell"><div class="comparison-alert">${icon("shield", 22)}<p>${t("এই রেকর্ড আইনি চুক্তি বা পেমেন্ট যাচাই নয়।", "This record is not a legal contract or verified payment.")}</p></div><div class="deals-list">${visibleDeals().length ? visibleDeals().map(renderDealCard).join("") : `<div class="empty-state"><h2>${t("এখনো কোনো চুক্তির নথি নেই", "No deal records yet")}</h2><p>${t("দর দেখে একটি চুক্তি রাখলে এখানে দেখাবে।", "Review an offer and save a deal to see it here.")}</p><button class="button button-green" data-view="offers">${t("দর দেখুন", "See offers")}</button></div>`}</div></section>`;
}

function renderStorage() { return renderServices("storage"); }

function renderServices(kind) {
  const storage = kind === "storage";
  const list = providers?.filter(item => item.kind === kind);
  return `<section class="inner-hero page-shell service-hero"><div><p class="section-kicker">${storage ? t("আলু রাখার ব্যবস্থা", "POTATO STORAGE") : t("আলু পাঠানোর ব্যবস্থা", "POTATO TRANSPORT")}</p><h1>${storage ? t("হিমাগারে কথা বলুন", "Call a cold store") : t("ট্রাক ভাড়া নিতে চান?", "Need a truck?")}</h1><p>${storage ? t("কাছের হিমাগার বেছে ফোন করুন। কত আলু রাখবেন আর কতদিন রাখবেন, জানান।", "Choose a cold store and call. Say how much you have and how long you want to store it.") : t("নিচের নম্বরে ফোন করে গাড়ি চাইতে পারেন। কোথা থেকে কোথায় যাবেন, কত আলু নেবেন—জানান।", "Call a provider below. Say where the load starts, where it goes, and how many sacks you have.")}</p></div></section>
    <section class="section page-shell service-directory"><div class="service-grid">${list ? list.map(item => `<article class="service-card"><div class="service-card-head"><span class="service-icon">${icon(storage ? "warehouse" : "truck", 26)}</span><span class="verification-badge">${h(language === "bn" ? item.verificationBn : item.verification)}</span></div><h2>${h(language === "bn" ? item.nameBn : item.name)}</h2><p class="service-area">${icon("pin", 16)}${h(language === "bn" ? item.areaBn : item.area)}</p><p>${h(language === "bn" ? item.noteBn : item.note)}</p><a class="button button-green service-call" href="tel:${h(/^\+880\d{10}$/.test(item.phone) ? item.phone : "")}">${t("ফোন করুন", "Call")}</a><span class="service-phone">${h(item.phone)}</span><a class="service-source" href="${h(item.source.startsWith("https://") ? item.source : "#")}" target="_blank" rel="noopener noreferrer">${t("তথ্য কোথা থেকে পাওয়া", "View contact source")} ↗</a></article>`).join("") : `<p role="status">${t("যোগাযোগের তথ্য আসছে…", "Loading contacts…")}</p>`}</div>
    ${list?.length === 0 ? `<p role="status">${t("তালিকা খোলা যায়নি। ইন্টারনেট এলে পেজটি আবার খুলুন।", "Contacts could not load. Reopen this page when online.")}</p>` : ""}
    <aside class="service-advice"><h2>${t("ফোনে যা জেনে নেবেন", "Ask on the call")}</h2><ul>${(storage ? [t("জায়গা আছে? আপনার আলু রাখতে পারবে?", "Is there space for your potatoes?"), t("ভাড়া, বস্তা ও ওঠানো-নামানো মিলিয়ে মোট কত?", "What is the full charge including bags and handling?"), t("আলু নষ্ট হলে বা ওজন কমলে কী নিয়ম? রসিদ দেবে?", "What happens if potatoes spoil or lose weight? Will you get a receipt?")] : [t("আপনার রুটে ওই দিনে গাড়ি দিতে পারবে?", "Can they provide a truck on your route and date?"), t("ভাড়া, টোল ও শ্রমিক মিলিয়ে মোট কত?", "What is the full fare including tolls and labour?"), t("চালকের নাম, নম্বর ও গাড়ির নম্বর দেবে?", "Will they give you the driver’s name, phone and vehicle number?")]).map(text => `<li>${text}</li>`).join("")}</ul></aside>
    <p class="service-note">${t("নম্বরগুলো প্রতিষ্ঠানের ওয়েবসাইট বা সরকারি তালিকা থেকে নেওয়া। আমরা সেবা পরীক্ষা করিনি। ভাড়া বা জায়গা নিশ্চিত নয়; ফোনে সব ঠিক করে তারপর টাকা দিন। আলুসাথীতে বুকিং হয় না।", "Contacts come from company websites or a government registry. We have not tested these services. Confirm price and availability directly before paying. AluSathi does not book vehicles or storage.")}</p></section>`;
}

function prepareDemo() {
  if (role === "farmer" && !showSamples) return;
  prepareDemoForms(app, {
    displayName: role === 'farmer' ? t('কৃষক', 'Farmer') : t('ক্রেতা', 'Buyer'),
    upazila: 'Pirganj', variety: 'Diamant', quantityKg: 2000, priceKg: 25,
    buyer: t('ক্রেতা', 'Buyer'), name: t('হিমাগার', 'Cold store'),
    area: 'Rangpur', terms: t('দর ও জায়গা যাচাই করে নিন।', 'Price and availability have not been confirmed.'),
    acceptedPercent: 100, paymentDays: 0, transport: 0, handling: 0, fee: 0, other: 0,
    partnerKg: 0,
    paymentRef: 'NOT-VERIFIED', months: 2, feeKgMonth: 1.5, lossPercent: 4, oneTimeCost: 2500,
  }, '');
}

function render() {
  if (role === 'buyer' && view === 'contacts') { view = 'home'; history.replaceState(null, '', location.pathname + location.search); }
  if (role === "farmer" && view === "list") { location.replace("/farmer#market"); return; }
  stopNotesVoice();
  disposeTransport();
  document.documentElement.lang = language;
  if (publicPreview) {
    document.body.classList.add("buyer-portal");
    app.innerHTML = `<div class="public-market-page"><header class="page-shell public-market-header"><a class="brand" href="/" aria-label="${t("আলুসাথীর মূল পাতা", "AluSathi home")}"><span class="brand-mark">${icon("leaf", 21)}</span><strong>${t("আলুসাথী", "AluSathi")}</strong></a><div><button type="button" class="language-btn" data-action="language" aria-label="${t("English", "বাংলা")}">${t("EN", "বাংলা")}</button><a href="/auth">${t("লগইন করুন", "Log in")}</a></div></header><main>${renderBuyerHome()}</main></div>${detailLotId ? renderBuyerLotDialog() : ""}`;
    if (detailLotId) app.querySelector(".public-market-page").inert = true;
    return;
  }
  if (farmerPreview) {
    const lot = data.listings.find(item => !item.archivedAt && !item.hiddenAt && item.id === new URLSearchParams(location.search).get("lot"));
    const photos = lot ? (Array.isArray(lot.photos) ? lot.photos.map(p => photoSrc(p?.src)).filter(Boolean).slice(0,3) : [photoSrc(lot.photo)].filter(Boolean)) : [];
    app.innerHTML = `<main class="section page-shell"><a class="button button-outline" href="/farmer#market">← ${t("কৃষকের পাতায় ফিরুন", "Back to farmer page")}</a><section class="panel" style="margin-top:24px"><p class="section-kicker">${t("ক্রেতা যেমন দেখবেন", "BUYER VIEW · READ ONLY")}</p>${lot ? `<h1>${h(lot.variety === "Potatoes" ? t("আলু", "Potatoes") : lot.variety)}</h1><p>${h(lot.farmerName)} · ${h(lot.upazila)} ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p><div class="sale-details-photos">${photos.map(src=>`<img src="${h(src)}" alt="${t("আলুর ছবি", "Potato photo")}"/>`).join("")}</div><dl><div><dt>${t("পরিমাণ", "Quantity")}</dt><dd>${kg(lot.quantityKg)}</dd></div><div><dt>${t("চাওয়া দাম", "Asking price")}</dt><dd>${rate(lot.askingPriceKg)} / ${t("কেজি", "kg")}</dd></div><div><dt>${t("মোট চাওয়া টাকা", "Asking total")}</dt><dd>${money(lot.quantityKg * lot.askingPriceKg)}</dd></div><div><dt>${t("কবে থেকে নিতে পারবেন", "Ready date")}</dt><dd>${prettyDate(lot.readyDate)}</dd></div><div><dt>${t("আলুর অবস্থা", "Condition")}</dt><dd>${h(lot.notes || t("তথ্য দেওয়া হয়নি", "Not provided"))}</dd></div></dl>` : `<h1>${t("তালিকাটি পাওয়া যায়নি", "Listing not found")}</h1>`}</section></main>`;
    return;
  }
  if (role === "choose") { let selected = ""; try { selected = sessionStorage.getItem("alusathi-role") || ""; } catch { /* Role choice is available at /auth. */ } location.replace(selected === "buyer" ? "./buyer.html" : selected === "farmer" ? "./farmer.html" : "../auth"); return; }
  if (view === "storage") quoteOpen = document.querySelector(".quote-disclosure")?.open ?? quoteOpen;
  const sourcingContext = {t,h,kg,money:rate,prettyDate,districtOptions,today:todayPlus(0),findLot:buyerListing,validDistrict:name=>districts.includes(name)&&name!=='Other',districtName:name=>language==='bn'?districtNamesBn[name]||name:name,findMatches:row=>{buyerSearch={query:'',district:row.district,quantity:row.quantity,readyDate:row.readyDate,budget:row.budget,applied:true,expanded:false};buyerSearchShowAll=false;buyerCatalogueDistrict='';buyerCatalogueVariety='';setView('home');document.querySelector('.buyer-picks')?.scrollIntoView({block:'start'});}};
  const content = role === 'buyer' && ['needs','contacts'].includes(view) ? workspace(view,sourcingContext) : view === "unavailable" ? renderUnavailable() : view === "profile" ? role === "buyer" ? renderBuyerProfilePage() : renderFarmerProfilePage() : view === "saved" && role === "buyer" ? renderSavedLots() : view === "buyer-plan" && role === "buyer" ? renderBuyerPlan() : view === "transport" ? '<section class="section page-shell" id="transport-root"></section>' : view === "passport" || view === "list" ? renderPassport() : view === "offers" && role === "farmer" ? SALES_FEATURE_ENABLED ? renderOffers() : renderUnavailable() : view === "deals" || view === "buyer-offers" ? SALES_FEATURE_ENABLED ? view === "deals" ? renderDeals() : renderBuyerOffers() : renderUnavailable() : view === "storage" ? renderStorage() : role === "buyer" ? renderBuyerHome() : renderFarmerHome();
  renderShell(content);
  if (role === 'buyer' && view === 'saved' && compareOpen) document.querySelector('.liked-quantity-strip')?.insertAdjacentHTML('beforeend', `<button class="button button-outline" data-action="compare-costs">${t('এই পরিমাণে খরচ দেখুন','Compare delivered costs for this quantity')}</button>`);
  if(role==='buyer') document.querySelector('.footer > div > p').textContent=t('কৃষকের সঙ্গে পরিচয়, সিদ্ধান্ত আপনার।','Connect with farmers. Decide for yourself.');
  sourcingContext.profile = buyerProfile;
  if(role==='buyer' && ['needs','contacts'].includes(view)) mountWorkspace(view,sourcingContext);
  if(role==='buyer' && view==='needs') {
    const form = document.querySelector('#buyer-need-form');
    form.querySelector('.sourcing-fields').insertAdjacentHTML('afterend', `<details class="need-text"><summary>${t('এক লাইনে লিখুন','Fill in a requirement from text')}</summary><label>${t('আপনার চাহিদা','Your requirement')}<textarea maxlength="240" rows="2"></textarea></label><button type="button" class="button button-outline">${t('তথ্য বসান','Fill in fields')}</button></details>`);
    const helper = form.querySelector('.need-text');
    helper.querySelector('button').onclick = () => {
      const parsed = parseBuyerQuery(helper.querySelector('textarea').value);
      for (const field of ['quantity','district','readyDate','budget']) form.elements[field].value = parsed[field] || '';
      if(parsed.budget) form.querySelector('.need-options').open = true;
      form.querySelector('.sourcing-status').textContent = t('ঘরগুলো দেখে ঠিক করুন। এখনও সেভ হয়নি।','Review the fields and fill in anything missing. Nothing saved yet.');
      form.elements.quantity.focus();
    };
  }
  if(role==='buyer') document.querySelectorAll('[data-action="contact-lot"]').forEach(button => { if (buyerListing(button.dataset.id)?.sample) button.textContent = contactLabel(buyerListing(button.dataset.id)); });
  if (role === 'buyer' && detailLotId) {
    const lot = buyerListing(detailLotId);
    if (lot?.sample) document.querySelector('.catalogue-detail-copy .section-kicker').textContent = t('নমুনা আলুর তথ্য · যাচাই হয়নি', 'ILLUSTRATIVE LOT · NOT VERIFIED');
  }
  if(role==='buyer' && contactLotId && !buyerListing(contactLotId)?.practice) {
    const lot=buyerListing(contactLotId),dialog=document.querySelector('.catalogue-contact-dialog');
    const enquiry=t(`আপনার ${lotVariety(lot)} আলু দেখেছি। ${buyerSearch?.quantity ? kg(buyerSearch.quantity)+' ' : ''}আলু নিতে চাই। এখন কতটা আছে, বর্তমান দর কত এবং কবে নেওয়া যাবে?`,`I saw your ${lotVariety(lot)} potatoes. I am interested${buyerSearch?.quantity ? ' in '+buyerSearch.quantity+' kg' : ''}. How much is available, what is the current price, and when can it be collected?`);
    const draft = `${enquiry}\n${enquiryQuestions(lot, t, lotNotes(lot))}`.trim();
    dialog?.insertAdjacentHTML('beforeend', `<details class="contact-enquiry" ${lot.sample ? 'open' : ''}><summary>${lot.sample ? t('নমুনা বার্তা','Example message') : t('কথা শুরু করার বার্তা','Message to start a conversation')}</summary><textarea maxlength="800" aria-label="${t('পাঠানোর বার্তা','Enquiry message')}">${h(draft)}</textarea><button class="button button-outline" data-action="copy-enquiry">${t('বার্তা কপি করুন','Copy message')}</button></details>${lot.sample ? '' : `<button type="button" class="button button-outline" data-action="keep-contact-note">${t('খাতায় যোগাযোগ রাখুন','Keep contact in notebook')}</button>`}<span class="enquiry-status" role="status"></span>`);
    if (lot.sample) dialog.querySelector('.catalogue-contact-note').textContent = t('এই নমুনা লটে কোনো বাস্তব যোগাযোগ বা কেনাবেচা হয় না।','This example lot does not start a real conversation or sale.');
    const whatsapp=dialog?.querySelector('a[href^="https://wa.me/"]');
    if(whatsapp){
      const field=dialog.querySelector('textarea');
      const update=()=>{const url=new URL(whatsapp.href);url.searchParams.set('text',field.value);whatsapp.href=url.href;};
      field.addEventListener('input',update);update();
    }
  }
  if (role === 'buyer' && view === 'notebook') {
    mountNotebook({t,h,money:rate,prettyDate,today:todayPlus(0)});
    app.querySelector('main')?.insertAdjacentHTML('beforeend', `<details class="page-shell contact-enquiry"><summary>${t('কৃষকের সঙ্গে কথার নোট','Farmer follow-up notes')}</summary>${workspace('contacts',sourcingContext)}</details>`);
    mountWorkspace('contacts',sourcingContext);
  }
  if (role === 'buyer' && view === 'profile') mountBuyerProfile({
    draft:buyerProfileDraft,getProfile:()=>buyerProfile,t,h,icon,photoSrc,compressPhoto,
    onSave:profile=>{
      localStorage.setItem(buyerProfileKey,JSON.stringify(profile));
      buyerProfile=profile;
      const account=document.querySelector('[data-action=open-profile]');
      if(account) account.textContent=profile.contactPerson || profile.businessName || t('ক্রেতা','Buyer');
      window.dispatchEvent(new Event('alusathi-buyer-profile-changed'));
    }
  });
  if (role === 'buyer' && profileOpen) {
    document.querySelector('.profile-drawer').insertAdjacentHTML('beforeend', `<button class="button button-outline" data-action="open-notebook">${t('খাতা','Notebook')}</button>`);
    mountProfileAvatars(document.querySelector('.profile-drawer'));
    document.querySelector('.profile-drawer .modal-close')?.focus();
  }
  if (detailLotId) {
    const lot = buyerListing(detailLotId);
    const use = {table:t('খাওয়ার আলু','Food potatoes'),seed:t('বীজ আলু','Seed potatoes'),processing:t('চিপস বা কারখানার জন্য','Processing')};
    const facts = [[t('আলু রাখার জায়গা','Storage'),lot?.storageDescription],[t('ফসল তোলার তারিখ','Harvest date'),lot?.harvestDate ? prettyDate(lot.harvestDate) : ''],[t('ব্যবহার','Intended use'),use[lot?.purpose]],[t('যে দেশে ফলানো হয়েছে','Country grown in'),lot?.country],[t('বস্তার চিহ্ন','Bag mark'),lot?.batchCode],[t('প্যাক করার মাস','Packing month'),lot?.packedMonth]];
    document.querySelector('.buyer-lot-modal dl')?.insertAdjacentHTML('beforeend',facts.filter(([,value])=>value).map(([label,value])=>`<div><dt>${label}</dt><dd>${h(value)}</dd></div>`).join(''));
  }
  if (role === "buyer" && ["home", "buyer-plan"].includes(view)) {
    const banner = document.createElement("iframe");
    banner.className = view === "home" ? "buyer-market-banner" : "buyer-offers-banner";
    banner.src = view === "home" ? "/marketplace/banners/buyer-market-living-v1/banner.html" : "/marketplace/banners/buyer-offers-calculating-v1/banner.html";
    banner.title = view === "home" ? t("আলুর বাজারে মান যাচাই করছেন এক ক্রেতা", "A buyer checking potatoes at a market") : t("আলুর বাজারে দর হিসাব করছেন এক ক্রেতা", "A buyer calculating an offer in the potato market");
    banner.loading = "eager";
    if (view === "home") {
      banner.tabIndex = -1;
      document.querySelector(".catalogue-hero")?.prepend(banner);
    } else document.querySelector(".buyer-plan-page")?.before(banner);
  }
  if (role === "buyer" && ["saved", "buyer-plan"].includes(view)) {
    document.querySelector('.buyer-plan-page > .section-header, .liked-page > .section-header')?.insertAdjacentHTML('afterend', `<nav class="buyer-cost-nav" aria-label="${t('খরচ ও লাভের বিভাগ','Cost and profit sections')}">${[['buyer-plan',t('খরচের হিসাব','Cost calculator')],['saved',t('পছন্দ ও তুলনা','Saved & compare')]].map(([key,label])=>`<button type="button" class="button ${view===key?'button-green':'button-outline'}" data-view="${key}" aria-current="${view===key?'page':'false'}">${label}</button>`).join('')}</nav>`);
    const planResults = view === "buyer-plan" && document.querySelector("#buyer-plan-results, .buyer-plan-page > .empty-state");
    if (planResults) renderPotatoPriceHistory(planResults);
    const showingPractice = view === 'saved' ? !buyerSaved.length : planLots().some(lot => lot.practice);
    document.body.classList.toggle('buyer-practice', showingPractice);
    if (showingPractice && view === 'buyer-plan') {
      document.querySelector('.buyer-plan-page .section-header')?.insertAdjacentHTML('afterend', `<p class="practice-note">${t('আলুর তালিকা থেকে লট তুলনায় রাখুন, অথবা নিজের দাম বসিয়ে হিসাব করুন। ওপরের দরগুলো কৃষকের দেওয়া নয়।', 'Select lots in the catalogue or enter your own prices. The starting prices are assumptions, not quotes from farmers.')}</p>`);
    }
    if (showingPractice && view === 'saved') {
      const page = document.querySelector(view === 'saved' ? '.liked-page' : '.buyer-plan-page');
      page?.querySelector('.section-header')?.insertAdjacentHTML('afterend', `<aside class="practice-note"><strong>${t('তুলনার উদাহরণ', 'Comparison examples')}</strong><span>${t('তুলনার জন্য তিনটি আলুর দাম ও ওজন বদলে দেখুন।', 'Compare three potato lots by changing prices and quantities.')}</span></aside>`);
      if (view === 'saved') {
        document.querySelectorAll('.liked-select input').forEach(box => { box.checked = practiceCompared.includes(box.dataset.id); });
        document.querySelectorAll('.liked-remove').forEach(button => button.remove());
        const count = document.querySelector('.liked-selection-bar span');
        if (count) count.textContent = t('৩টি আলুর তথ্য', '3 example lots');
      }
    }
    if (view === 'saved' && !compareOpen) document.querySelector('.liked-selection-bar')?.insertAdjacentHTML('beforeend', `<button class="button button-outline" data-view="buyer-plan">${t('লাভের হিসাব দেখুন', 'Explore profit')} →</button>`);
  } else document.body.classList.remove('buyer-practice');
  if (buyerListing(detailLotId)?.practice) {
    const contact = document.querySelector('.buyer-lot-modal [data-action="contact-lot"]');
    if (contact) { contact.dataset.view = 'buyer-plan'; contact.removeAttribute('data-action'); contact.textContent = t('লাভের হিসাব দেখুন', 'Explore profit'); }
  }
  if (role === "buyer" && view === "buyer-plan") {
    mountWeightConverter(document.querySelector('.buyer-plan-page'), t);
    updateBuyerPlan();
  }
  if (role === 'buyer' && view === 'buyer-plan') document.querySelector('.buyer-plan-page h1').textContent=t('খরচ ও লাভ','Cost & profit');
  if (buyerProfile.businessName && document.querySelector("#offer-form [name=buyer]")) document.querySelector("#offer-form [name=buyer]").value = buyerProfile.businessName;
  enhanceLotTools();
  if (view === "transport") {
    const lot = selectedLot();
    if (role === "buyer") {
      const params = new URL(location.href).searchParams;
      const requestedLot = params.get("transportLot");
      const linkedLot = requestedLot ? data.listings.find(item => item.id === requestedLot) : null;
      const requestedKg = Number(params.get("transportKg"));
      mountBuyerTransport(document.querySelector("#transport-root"), { language, lot: linkedLot, quantityKg: requestedKg > 0 ? requestedKg : linkedLot ? availableKg(linkedLot, data.deals) : 0 });
    } else mountTransport(document.querySelector("#transport-root"), { language, lot, lots: visibleListings(), remaining: lot ? availableKg(lot, data.deals) : 0, offers: { selectedId: transportOfferId, items: visibleOffers().filter(offer => offer.lotId === lot?.id) }, prepareDemo });
  }
  if (role === "farmer" && view === "home") document.querySelector(".choice-strip")?.insertAdjacentHTML("beforeend", `<button class="choice-card transport-home-link" data-view="transport"><span class="choice-icon green">${icon("truck", 26)}</span><strong>${t("গাড়ির হিসাব", "Plan transport")}</strong><small>${t("পথ, গাড়ির দর ও ভাগের খরচ", "Route, quotes and shared costs")}</small>${icon("arrow", 18)}</button>`);
  if (role === "farmer" && view === "offers") document.querySelectorAll(".offer-card").forEach((card, index) => {
    const offer = visibleOffers().filter(item => item.lotId === selectedLot()?.id)[index];
    if (offer) card.querySelector(".offer-bottom").insertAdjacentHTML("beforebegin", `<button class="text-arrow transport-offer-link" data-action="plan-transport" data-id="${h(offer.id)}">${icon("truck", 18)}${t("এই দরে গাড়ির খরচ দেখুন", "Plan transport for this offer")}</button>`);
  });
  if (view === "storage" && storageInputs) {
    const form = document.querySelector("#storage-form");
    for (const [key, value] of Object.entries(storageInputs)) form.elements[key].value = value;
    showStorageResult(form, storageInputs);
  }
  if (view !== "transport" || role !== "buyer") prepareDemo();
}

fetch("./providers.json")
  .then(response => { if (!response.ok) throw new Error("contacts unavailable"); return response.json(); })
  .then(items => { providers = Array.isArray(items) ? items : []; if (["transport", "storage"].includes(view)) render(); })
  .catch(() => { providers = []; if (["transport", "storage"].includes(view)) render(); });

function showStorageResult(form, input) {
  const result = storageBreakEven(input);
  form.querySelector("#storage-result").innerHTML = `<span>${t("পরে অন্তত এই দর লাগবে", "Future price needed to break even")}</span><strong>${rate(result.futurePriceKg)}<small>/${t("কেজি", "kg")}</small></strong><p>${t("আজ বিক্রি করলে", "Sell today")}: ${money(result.todayValue)} · ${t("সংরক্ষণ ও অন্য খরচ", "Storage and extra costs")}: ${money(result.storageCost)} · ${t("পরে বিক্রিযোগ্য অনুমান", "Estimated saleable later")}: ${kg(result.saleableKg)}</p><small>${t("সুদ, অজানা ফি বা দরের ওঠানামা ধরা নেই।", "Does not include financing, unknown fees or changing market prices.")}</small>`;
}

async function compressPhoto(file, {maxBytes=2_000_000,maxEdge=900}={}) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > maxBytes) throw new Error(t("শুধু JPG, PNG বা WEBP ছবি দিন, সর্বোচ্চ ২ MB।", "Use a JPG, PNG or WEBP image under 2 MB."));
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signatureMatches = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === "image/png" ? [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte) : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!signatureMatches) throw new Error(t("ফাইলটি সঠিক ছবি নয়। অন্য ছবি দিন।", "This is not a valid image file. Choose another photo."));
  const bitmap = await createImageBitmap(file);
  if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 32_000_000) { bitmap.close(); throw new Error(t("ছবিটি খুব বড়। ছোট ছবি দিন।", "The image dimensions are too large. Choose a smaller photo.")); }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context=canvas.getContext("2d");
  if(maxEdge===512) {context.fillStyle="white";context.fillRect(0,0,canvas.width,canvas.height);}
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

function validNumber(value, min, max) { const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : null; }
function formValues(form) { return Object.fromEntries(new FormData(form)); }
function getDeal(id) { return data.deals.find(deal => deal.id === id); }

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { if (publicPreview) return; if(role==='buyer') profileOpen=false; setView(viewButton.dataset.view); return; }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (publicPreview && !["view-lot", "close-lot", "lot-photo", "catalogue-row-photo", "clear-buyer-filters", "catalogue-page", "language"].includes(action)) return;
  if(action==='copy-enquiry') {const field=document.querySelector('.contact-enquiry textarea'),status=document.querySelector('.enquiry-status');if(field){navigator.clipboard?.writeText(field.value).then(()=>{status.textContent=t('কপি হয়েছে।','Copied.');}).catch(()=>{field.focus();field.select();status.textContent=t('লেখা সিলেক্ট করা আছে। Ctrl+C চাপুন।','Text selected. Press Ctrl+C.');});if(!navigator.clipboard){field.focus();field.select();status.textContent=t('Ctrl+C চাপুন।','Press Ctrl+C.');}}return;}
  if (action === 'open-notebook' && role === 'buyer') {profileOpen=false;setView('notebook');return;}
  if (action === "open-profile") { profileOpen = true; render(); return; }
  if (action === "close-profile") { if (button === event.target || button.classList.contains("modal-close")) { profileOpen = false; render(); if(role==='buyer')document.querySelector('[data-action=open-profile]')?.focus(); } return; }
  if (action === "profile-page") { profileOpen = false; setView("profile"); return; }
  if (action === "keep-contact-note") {
    const status = button.parentElement.querySelector('.enquiry-status');
    try { if (keepContact(buyerListing(contactLotId))) status.textContent = t('খাতায় রাখা হয়েছে।','Saved in your notebook.'); }
    catch { status.textContent = t('সেভ হয়নি। আবার চেষ্টা করুন।','Could not save. Try again.'); }
    return;
  }
  if (action === "compare-costs") {
    buyerPlan.inputs.quantity = String(comparisonQuantity || '');
    saveBuyerPlan();
    setView('buyer-plan');
    return;
  }
  if (action === "catalogue-compare-open") { openCatalogueComparison(); return; }
  if (action === "catalogue-costs") { costLotId = ""; button.closest("dialog").close(); setView("buyer-plan"); return; }
  if (action === "lot-costs" && role === "buyer") {
    const lot = buyerListing(button.dataset.id);
    if (!lot) return;
    costLotId = lot.id;
    const available = availableKg(lot, data.deals);
    buyerPlan.inputs.quantity = available > 0 ? String(Math.min(200, available)) : "";
    setView("buyer-plan");
    return;
  }
  if (action === "apply-lot-costs" && role === "buyer") {
    const form = button.closest("#buyer-plan-form");
    const status = form.querySelector("#plan-breakdown-status");
    const quantity = planNumber(form.elements.quantity.value);
    const price = planNumber(form.elements.buyPrice.value);
    const fees = ["transportCost", "laborCost", "weighingCost", "packingCost", "marketCost", "storageCost", "otherCost"].map(key => planNumber(form.elements[key].value, true));
    const total = Math.round((quantity * price + fees.reduce((sum, fee) => sum + fee, 0)) * 100) / 100;
    if (!(quantity > 0) || quantity > 1000000 || price === null || fees.includes(null) || total > 100000000) {
      status.textContent = t("কেজি, কেনার দাম আর খরচ মিলিয়ে দেখুন।", "Check quantity, buying price and costs.");
      return;
    }
    form.elements.totalCost.value = String(total);
    form.elements.totalCost.dispatchEvent(new Event("input", { bubbles: true }));
    form.dataset.breakdownApplied = "true";
    status.textContent = t("মোট খরচ বসানো হয়েছে। লাভ দেখতে হিসাব করুন চাপুন।", "Total updated. Press Calculate to see profit or loss.");
    return;
  }
  if (action === "catalogue-compare-toggle") {
    const id = button.dataset.id, selected = catalogueSelection.includes(id);
    const shortlist = document.querySelector("#catalogue-shortlist");
    if (!selected && catalogueSelection.length >= 4) {
      shortlist.querySelector('[role="status"]').textContent = t("চারটি লট বাছা আছে। আগে একটি সরান।", "Four lots selected. Remove one before adding another.");
      shortlist.querySelector('[role="status"]').classList.remove("sr-only");
      return;
    }
    catalogueSelection = selected ? catalogueSelection.filter(value => value !== id) : [...catalogueSelection, id];
    const toggles = document.querySelectorAll(`.buyer-contact-card [data-action="catalogue-compare-toggle"][data-id="${CSS.escape(id)}"]`);
    toggles.forEach(toggle => {
      toggle.setAttribute("aria-pressed", String(!selected));
      toggle.textContent = selected ? t("তুলনায় রাখুন", "Add to comparison") : t("তুলনায় আছে", "In comparison");
    });
    const removedFromTray = shortlist.contains(button);
    shortlist.innerHTML = catalogueShortlist(catalogueSelection.map(buyerListing).filter(Boolean));
    if (removedFromTray) (toggles[0] || shortlist.querySelector("button") || document.querySelector("#buyer-catalogue-filters select"))?.focus({ preventScroll: true });
    return;
  }
  if (action === "view-lot" || action === "contact-lot") {
    if (publicPreview && !visibleListings().some(lot => lot.id === button.dataset.id && availableKg(lot, data.deals) > 0)) return;
    const comparison = button.closest(".catalogue-comparison");
    comparison?.close();
    if (!detailLotId && !contactLotId) catalogueReturnFocus = comparison ? '[data-action="catalogue-compare-open"]' : `[data-action="${action}"][data-id="${CSS.escape(button.dataset.id)}"]`;
    detailPhotoIndex = 0;
    detailLotId = action === "view-lot" ? button.dataset.id : "";
    contactLotId = action === "contact-lot" ? button.dataset.id : "";
    render(); document.querySelector('.catalogue-detail-dialog .modal-close, .catalogue-contact-dialog .modal-close')?.focus(); return;
  }
  if (action === "catalogue-row-photo") {
    const gallery = button.closest(".catalogue-row-gallery");
    const count = gallery.querySelectorAll(".catalogue-row-gallery-slide").length;
    const index = button.dataset.slide === undefined
      ? (Number(gallery.dataset.index) + Number(button.dataset.step) + count) % count
      : Number(button.dataset.slide);
    gallery.dataset.index = index;
    gallery.querySelectorAll(".catalogue-row-gallery-slide").forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== index)));
    gallery.querySelectorAll("[data-slide]").forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === index)));
    return;
  }
  if (action === "lot-photo") {
    const lot = buyerListing(detailLotId);
    const photos = lot ? cataloguePhotos(lot) : [];
    if (!photos.length) return;
    detailPhotoIndex = (detailPhotoIndex + Number(button.dataset.step) + photos.length) % photos.length;
    const image = document.querySelector('.catalogue-detail-gallery img');
    image.hidden = false;
    image.nextElementSibling.hidden = true;
    image.src = photos[detailPhotoIndex];
    image.alt = `${lotVariety(lot)} · ${t("ছবি", "Photo")} ${formatter.format(detailPhotoIndex + 1)}`;
    document.querySelector('.catalogue-gallery-controls span').textContent = `${formatter.format(detailPhotoIndex + 1)} / ${formatter.format(photos.length)}`;
    return;
  }
  if (action === "withdraw-interest") {
    try { localStorage.setItem("alusathi-buyer-interest-v1", JSON.stringify(readInterests().map(row=>row?.lotId===button.dataset.id && row.status==="active" ? {...row,status:"withdrawn",updatedAt:new Date().toISOString()} : row))); render(); }
    catch { const status=document.querySelector('.interest-status'); if(status)status.textContent=t("আগ্রহ সরানো যায়নি। আবার চেষ্টা করুন।","Could not withdraw interest. Please retry."); }
    return;
  }
  if (action === "close-lot" || action === "close-contact") { if (button === event.target || button.classList.contains("modal-close")) closeCatalogueDialog(); return; }
  if (action === "save-lot") {
    const id = button.dataset.id;
    const previousSaved = buyerSaved;
    const previousCompared = buyerCompared;
    buyerSaved = buyerSaved.includes(id) ? buyerSaved.filter(value => value !== id) : [...buyerSaved, id];
    if (!buyerSaved.includes(id)) buyerCompared = buyerCompared.filter(value => value !== id);
    try { localStorage.setItem(buyerSavedKey, JSON.stringify(buyerSaved)); localStorage.setItem(buyerCompareKey, JSON.stringify(buyerCompared)); }
    catch { buyerSaved = previousSaved; buyerCompared = previousCompared; notice = t("পছন্দের তালিকা সেভ হয়নি।", "Could not save liked lots."); }
    render(); return;
  }
  if (action === "buyer-see-all") { buyerSearch.expanded = false; buyerSearch.applied = true; buyerSearchShowAll = true; buyerCataloguePage = 1; render(); document.querySelector(".buyer-catalogue")?.scrollIntoView({ behavior: "smooth" }); return; }
  if (action === "buyer-expand-area") { if (buyerSearch) { buyerSearch.expanded = true; buyerSearch.applied = true; buyerSearchShowAll = false; render(); } return; }
  if (action === "clear-buyer-filters") { publicSort = ""; buyerCatalogueDistrict = ""; buyerCatalogueVariety = ""; buyerCatalogueQuantity = 0; buyerSearch = null; buyerSearchShowAll = false; buyerSearchMessage = ""; buyerCataloguePage = 1; render(); if (publicPreview) document.querySelector('#buyer-catalogue-filters select')?.focus({preventScroll: true}); return; }
  if (action === "catalogue-page") { buyerCataloguePage = Math.max(1, Number(button.dataset.page) || 1); render(); document.querySelector(".buyer-catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (action === "compare-selected") { const selected = buyerSaved.length ? buyerCompared : practiceCompared; if (selected.length >= 2 && selected.length <= 4) { compareOpen = true; render(); window.scrollTo({top:0, behavior:"instant"}); document.querySelector('#comparison-quantity')?.focus({preventScroll:true}); } return; }
  if (action === "close-comparison") { compareOpen = false; render(); document.querySelector('[data-action=compare-selected]')?.focus({preventScroll:true}); return; }
  if (action === "toggle-samples") { showSamples = !showSamples; selectedLotId = visibleListings()[0]?.id || ""; transportOfferId = ""; reviewOfferId = ""; render(); return; }
  if (action === "plan-transport") { transportOfferId = button.dataset.id; setView("transport"); return; }
  if (action === "dictate-notes") { dictateNotes(button); return; }
  if (action === "view-passport") { selectedLotId = button.dataset.id; setView("passport"); return; }
  if (["download-passport", "share-passport", "print-passport"].includes(action)) { exportPassport(action); return; }
  if (action === "language") { const formState = captureFormState(); language = language === "bn" ? "en" : "bn"; setNumberFormat(); localStorage.setItem(langKey, language); localStorage.setItem("alusathi-lang", language); render(); restoreFormState(formState); }
  if (action === "logout") { try { sessionStorage.removeItem(sessionKey); sessionStorage.removeItem("alusathi-role"); sessionStorage.setItem("alusathi-demo", "false"); } catch { /* Session can still end by leaving this page. */ } location.assign("/"); }
  if (action === "dismiss") { notice = ""; render(); }
  if (action === "reset" && confirm(t("এই ব্রাউজারের রাখা তথ্য মুছে আবার শুরু করবেন?", "Clear saved data in this browser and start over?"))) { data = initialData(); buyerProfile = {}; try { localStorage.removeItem(buyerProfileKey); } catch { /* Data remains editable in memory. */ } selectedLotId = data.listings[0].id; storageInputs = null; quoteOpen = false; save(); setView("home"); }
  if (action === "select-lot") { selectedLotId = button.dataset.id; setView("offers"); }
  if (action === "offer-lot") { if (SALES_FEATURE_ENABLED) { draftLotId = button.dataset.id; render(); document.querySelector("#offer-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); } }
  if (action === "close-offer") { draftLotId = ""; render(); }
  if (action === "review-offer") { reviewOfferId = button.dataset.id; render(); document.querySelector(".modal input[name=quantityKg]")?.focus(); }
  if (action === "close-review" && (button === event.target || button.closest(".modal-close") || button.tagName === "BUTTON")) { reviewOfferId = ""; render(); }
  if (action === "confirm-pickup") { const deal = getDeal(button.dataset.id); if (deal?.status === "pickup_pending") { deal.status = "collected"; save(); render(); } }
  if (action === "confirm-payment") { const deal = getDeal(button.dataset.id); if (deal?.status === "payment_pending" && Number(deal.paymentAmount) > 0 && confirm(t("নিজের হিসাবে টাকা পেয়েছেন? পেয়ে থাকলে তবেই নিশ্চিত করুন।", "Have you checked your own account and received the money?"))) { deal.status = Number(deal.remainingBalance) > 0 ? "collected" : "paid"; save(); render(); } }
  if (action === "dispute") { notice = t("এখানে বিরোধ মেটানোর সেবা নেই।", "Dispute support is not available here."); render(); }
  if (action === "print-deal") printDeal(button.dataset.id);
});

document.addEventListener("change", event => {
  if (event.target.id === "lot-switch") { selectedLotId = event.target.value; transportOfferId = ""; render(); return; }
  const checkbox = event.target.closest?.('[data-action="compare-lot"]');
  if (!checkbox) return;
  const id = checkbox.dataset.id;
  if (practiceLots.some(lot => lot.id === id)) {
    practiceCompared = checkbox.checked ? [...new Set([...practiceCompared, id])] : practiceCompared.filter(value => value !== id);
    render(); return;
  }
  buyerCompared = buyerCompared.filter(key => data.listings.some(lot => lot.id === key && !lot.archivedAt && !lot.hiddenAt && availableKg(lot, data.deals) > 0));
  if (checkbox.checked && !buyerCompared.includes(id) && buyerCompared.length >= 4) {
    checkbox.checked = false;
    const message = t("সর্বোচ্চ ৪টি লট তুলনা করা যাবে। আগে একটি টিক সরান।", "Compare up to four lots. Untick one first.");
    const status = document.querySelector('.liked-selection-status');
    if (status) status.textContent = message; else notice = message;
    return;
  }
  buyerCompared = checkbox.checked ? [...buyerCompared, id] : buyerCompared.filter(value => value !== id);
  try { localStorage.setItem(buyerCompareKey, JSON.stringify(buyerCompared)); } catch { notice = t("তুলনার তালিকা সেভ হয়নি।", "Could not save comparison selection."); }
  render();
});

document.addEventListener("input", event => {
  if (event.target.closest('#buyer-plan-form')) {
    const form = event.target.closest("#buyer-plan-form");
    if (event.target.name === "totalCost") {
      delete form.dataset.breakdownApplied;
      delete form.dataset.breakdownStale;
    } else if (form.dataset.breakdownApplied && (event.target.name === "quantity" || event.target.closest(".plan-cost-breakdown"))) {
      form.dataset.breakdownStale = "true";
    }
    form.querySelector("#plan-breakdown-status").textContent = "";
    if (["quantity", "resale", "totalCost"].includes(event.target.name)) buyerPlan.inputs[event.target.name] = event.target.value;
    updateBuyerPlan(); saveBuyerPlan(); return;
  }
  if (event.target.name === "comparisonQuantity") {
    const value = event.target.value.trim().replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
    comparisonQuantity = /^\d+(?:\.\d{1,3})?$/.test(value) ? validNumber(value, .001, 1000000) || 0 : 0;
    document.querySelectorAll('[data-comparison-total]').forEach(cell => {
      const lot = buyerListing(cell.dataset.comparisonTotal);
      if (lot) cell.innerHTML = comparisonTotal(lot, comparisonQuantity);
    });
    return;
  }
  if (event.target.name !== "quantityKg" || event.target.form?.id !== "deal-form") return;
  updateReviewPreview(event.target.form);
});

document.addEventListener("change", event => {
  if (event.target.name === "quantityKg" && event.target.form?.id === "deal-form") updateReviewPreview(event.target.form);
});
document.addEventListener("error", event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.nextElementSibling?.matches(".public-photo-fallback")) return;
  if (publicPreview && !publicReferencePhotos.includes(image.getAttribute("src"))) {
    image.src = publicReferencePhotos[0];
    return;
  }
  image.hidden = true;
  image.nextElementSibling.hidden = false;
}, true);

document.addEventListener("keydown", event => {
  if(event.key==='Escape' && !profileOpen && !detailLotId && !contactLotId) { const menu=document.querySelector('.desktop-nav .buyer-tools-menu[open]');if(menu){menu.open=false;menu.querySelector('summary').focus();return;} }
  if (profileOpen && role === 'buyer') {
    const drawer = document.querySelector('.profile-drawer');
    if (event.key === 'Escape') { event.preventDefault(); profileOpen=false; render(); document.querySelector('[data-action=open-profile]')?.focus(); return; }
    if (event.key === 'Tab' && drawer) {
      const controls = [...drawer.querySelectorAll('button,a[href],input,select')];
      const first=controls[0],last=controls[controls.length-1];
      if (!drawer.contains(document.activeElement) || (event.shiftKey && document.activeElement===first)) {event.preventDefault();(event.shiftKey?last:first)?.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
    }
    return;
  }
  if (detailLotId || contactLotId) {
    const dialog = document.querySelector('.catalogue-detail-dialog, .catalogue-contact-dialog');
    if (!dialog) return;
    if (event.key === "Escape") { event.preventDefault(); closeCatalogueDialog(); return; }
    if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], input, select, textarea')];
      const first = controls[0], last = controls[controls.length - 1];
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (!reviewOfferId) return;
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return;
  if (event.key === "Escape") { event.preventDefault(); reviewOfferId = ""; render(); return; }
  if (event.key !== "Tab") return;
  const focusable = [...dialog.querySelectorAll('button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])')].filter(item => !item.disabled);
  if (!focusable.length) return;
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.addEventListener("pagehide", () => { stopNotesVoice(); disposeTransport(); });

document.addEventListener("submit", async event => {
  if (publicPreview && event.target.id !== "buyer-catalogue-filters") { event.preventDefault(); return; }
  if (event.target.id === "buyer-plan-form") {
    event.preventDefault();
    updateBuyerPlan(true);
    return;
  }
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.method === "dialog") return;
  event.preventDefault();
  const values = formValues(form);
  if (!displayName) return;
  if (form.id === "buyer-interest-form") {
    if (form.dataset.saving === "true") return;
    const status=form.querySelector('.interest-status');
    const value=String(values.quantityKg).trim().replace(/[০-৯]/g,d=>String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    let lot; try {const latest=JSON.parse(localStorage.getItem(storeKey));lot=latest?.listings?.find(item=>item.id===values.lotId && !item.archivedAt && !item.hiddenAt);} catch {status.textContent=t("তালিকা পড়া যায়নি। লেখা আছে—আবার চেষ্টা করুন।","Could not read the listing. Your entries remain; please retry.");return;}
    const quantity=/^\d+(?:\.\d{1,2})?$/.test(value) ? validNumber(value, .01, 100000) : null;
    if (!lot || !quantity || quantity>availableKg(lot,data.deals)) { status.textContent=t("উপলভ্য পরিমাণের মধ্যে সঠিক কেজি লিখুন।","Enter a valid quantity within the available amount.");return; }
    form.dataset.saving="true";
    try {
      const rows=readInterests(), previous=rows.find(row=>row?.lotId===lot.id && row.status==="active");
      const profile=JSON.parse(localStorage.getItem(buyerProfileKey) || "{}");
      const safeText=value=>typeof value==="string" ? value.slice(0,100) : "";
      const safeNumber=value=>{const n=safeText(value).replace(/[\s()-]/g,"");return /^\+?[0-9]{8,15}$/.test(n) ? n : ""};
      const price=Number(lot.askingPriceKg ?? lot.priceKg);
      const row={id:previous?.id || uid(),lotId:lot.id,status:"active",quantityKg:quantity,askingPriceKg:Number.isFinite(price)&&price>0&&price<=10000?price:null,note:String(values.note || "").trim().slice(0,200),buyer:{businessName:safeText(profile?.businessName),contactPerson:safeText(profile?.contactPerson),district:safeText(profile?.district),phone:safeNumber(profile?.phone),whatsapp:safeNumber(profile?.whatsapp)},createdAt:previous?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
      localStorage.setItem("alusathi-buyer-interest-v1",JSON.stringify(previous ? rows.map(old=>old?.id===previous.id?row:old) : [row,...rows]));
      render();
    } catch { status.textContent=t("আগ্রহ রাখা যায়নি। লেখা আছে—আবার চেষ্টা করুন।","Could not save interest. Your entries remain; please retry."); }
    finally {form.dataset.saving="false";}
    return;
  }
  if (form.id === "buyer-search-prompt") {
    buyerSearch = parseBuyerQuery(values.query || "");
    buyerSearch.query = String(values.query || "").slice(0, 240);
    const missing = [];
    if (!buyerSearch.quantity) missing.push(t("পরিমাণ", "quantity"));
    if (!buyerSearch.district) missing.push(t("জেলা", "district"));
    buyerSearchMessage = missing.length ? `${t("চাহিদা পুরো বোঝা যায়নি। নিচের ঘরগুলো পূরণ করুন: ", "Some details were not found. Complete these fields: ")}${missing.join(t(" ও ", " and "))}.` : "";
    buyerSearchShowAll = false;
    render();
    document.querySelector("#buyer-search-edit [name=quantity]")?.focus();
    return;
  }
  if (form.id === "buyer-search-edit") {
    const quantity = validNumber(values.quantity, 1, 100000);
    const budget = values.budget === "" ? "" : validNumber(values.budget, 1, 100000000);
    if (!quantity || !districts.includes(values.district) || (values.budget !== "" && budget === null) || (values.readyDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.readyDate))) { buyerSearchMessage = t("পরিমাণ, জেলা, তারিখ বা বাজেট ঠিক করে দিন।", "Check the quantity, district, date, or budget."); return render(); }
    buyerSearch = { ...buyerSearch, quantity, district: values.district, readyDate: values.readyDate, budget, applied: true };
    buyerSearchMessage = ""; buyerSearchShowAll = false; render(); return;
  }
  if (form.id === "buyer-catalogue-filters") {
    const raw = String(values.minKg || "").trim().replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
    const quantity = raw ? (/^\d+(?:\.\d{1,3})?$/.test(raw) ? validNumber(raw, 0.001, 1000000) : null) : 0;
    if (quantity === null) {
      form.querySelector(".catalogue-filter-error").textContent = t("কত কেজি লাগবে, ঠিক করে লিখুন।", "Enter a valid quantity in kilograms.");
      form.elements.minKg.focus();
      return;
    }
    buyerCatalogueQuantity = quantity;
    if (publicPreview) {
      const sort = event.submitter?.name === "sort" ? event.submitter.value : publicSort;
      publicSort = ["price", "quantity", "oldest"].includes(sort) ? sort : "";
    }
    buyerCatalogueDistrict = districts.includes(values.district) ? values.district : "";
    buyerCatalogueVariety = varieties.some(([value]) => value === values.variety) ? values.variety : "";
    if (publicPreview) {
      buyerCataloguePage = 1;
      render();
      document.querySelector(event.submitter?.name === "sort" ? '.public-sort-chips [aria-pressed="true"]' : ".buyer-catalogue h2")?.focus({preventScroll: true});
      return;
    }
    buyerCataloguePage = 1;
    render(); return;
  }
  if (form.id === "farmer-profile-form") {
    const keys=["name","district","upazila","village","phone","whatsapp","land","landUnit","tenure","preferredLanguage"];
    const profile={...farmerProfile,...Object.fromEntries(keys.map(key=>[key,String(values[key] || "").trim().slice(0,key==='phone' || key==='whatsapp'?25:100)])),contactSharingEnabled:form.elements.contactSharingEnabled.checked};
    if (profile.land && validNumber(profile.land,0,100000)===null) {notice=t('জমির পরিমাণ ঠিক করে দিন।','Enter a valid land area.');render();return;}
    try {localStorage.setItem(farmerProfileKey,JSON.stringify(profile));farmerProfile=profile;notice=t('প্রোফাইল সংরক্ষণ হয়েছে।','Profile saved.');}
    catch {notice=t('সংরক্ষণ করা যায়নি। জায়গা খালি করে আবার চেষ্টা করুন।','Could not save. Free browser storage and try again.');}
    render();return;
  }
  if (form.id === "lot-form") {
    if (form.closest('.sale-details-page')) {
      if (form.dataset.saving === 'true' || !form.reportValidity()) return;
      const amount = validNumber(values.quantityKg, 1, 100000);
      const price = validNumber(values.askingPriceKg, .01, 10000);
      const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
      const errorBox = form.querySelector('[data-sale-error]');
      if (!amount || !price || !districts.includes(values.district) || !String(values.upazila).trim() || !validDate(values.readyDate) || values.readyDate < todayPlus(0) || (values.harvestDate && (!validDate(values.harvestDate) || values.harvestDate > todayPlus(0)))) {
        errorBox.hidden = false; errorBox.textContent = t('পরিমাণ, দাম, এলাকা ও তারিখ মিলিয়ে দিন।','Check quantity, price, area and dates.'); return;
      }
      form.dataset.saving = 'true';
      const buttons = [...form.querySelectorAll('button[type=submit]')]; buttons.forEach(b=>b.disabled=true);
      try {
        const files = [...form.elements.photo.files];
        if (files.length > 3) throw new Error(t('সর্বোচ্চ ৩টি ছবি দিন।','Choose up to 3 photos.'));
        const photos = files.length ? [] : readPotatoDraft().photos;
        for (const file of files) photos.push({src:await compressPhoto(file),addedAt:new Date().toISOString()});
        const details = {district:values.district,upazila:String(values.upazila).trim().slice(0,60),variety:varieties.some(([key])=>key===values.variety)?values.variety:'Potatoes',quantityKg:amount,askingPriceKg:price,priceKg:price,readyDate:values.readyDate,harvestDate:values.harvestDate || '',purpose:['table','seed','processing'].includes(values.purpose)?values.purpose:'unknown',notes:String(values.notes || '').trim().slice(0,300),storageDescription:String(values.storageDescription || '').trim().slice(0,200),photos,photo:photos[0]?.src || ''};
        localStorage.setItem(potatoDraftKey,JSON.stringify(details));
        if (view === 'passport') {
          if (event.submitter?.value === 'back') { location.href='/selling-preparation'; return; }
          notice=t('তথ্য রাখা হয়েছে। মিলিয়ে বাজারে ছাড়ুন।','Details saved. Review and publish when ready.'); setView('list'); return;
        }
        let preparation = { checks: [], checkedOn: '' };
        try {
          const entry = JSON.parse(localStorage.getItem('alusathi-selling-prep-v1') || '{}')?.draft;
          const allowed = ['sort','bag','weight','label','photos','example','scales','terms'];
          preparation = { checks: Array.isArray(entry?.checks) ? entry.checks.filter(id=>allowed.includes(id)) : [], checkedOn: typeof entry?.checkedOn === 'string' && validDate(entry.checkedOn) && entry.checkedOn <= todayPlus(0) ? entry.checkedOn : '' };
        } catch { /* Invalid stored preparation is not copied into a listing. */ }
        const lot = { ...details,id:uid(),sample:false,farmerName:farmerProfile.name || displayName,createdAt:new Date().toISOString(),preparation };
        data.listings.unshift(lot); selectedLotId=lot.id;
        if (!save()) { data.listings.shift(); throw new Error(notice); }
        notice=t('আলু বাজারের তালিকায় যোগ হয়েছে।','Your potatoes have been listed.');
        try {
          const saved = JSON.parse(localStorage.getItem('alusathi-selling-prep-v1') || '{}');
          const records = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
          records[lot.id] = preparation; delete records.draft;
          localStorage.setItem('alusathi-selling-prep-v1',JSON.stringify(records));
          localStorage.setItem('alusathi-selling-prep-selected',lot.id);
        } catch { notice += t(' প্রস্তুতির টিক লটের সঙ্গে আছে; লটটি বেছে দেখুন।',' Preparation is saved with the listing; select that lot to view it.'); }
        setView('home'); return;
      } catch (error) { errorBox.hidden=false; errorBox.textContent=error.message || t('রাখা যায়নি। আবার চেষ্টা করুন।','Could not save. Please retry.'); }
      finally { form.dataset.saving='false'; buttons.forEach(b=>b.disabled=false); }
      return;
    }
    const unitKg = values.quantityUnit === "mon" ? 40 : values.quantityUnit === "bag" ? validNumber(values.bagKg, 1, 100) : 1;
    const quantityKg = unitKg && validNumber(Number(values.quantityKg) * unitKg, 1, 100000);
    if (!quantityKg || !districts.includes(values.district) || !/^\d{4}-\d{2}-\d{2}$/.test(values.readyDate)) {
      form.elements.quantityKg.setCustomValidity(t("পরিমাণ ও একক মিলিয়ে দিন।", "Check the quantity and unit."));
      form.elements.quantityKg.reportValidity();
      return;
    }
    for (const value of [values.harvestDate, values.photoTakenOn]) {
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value).getTime()) || new Date(value).toISOString().slice(0, 10) !== value || value > todayPlus(0))) { notice = t("তারিখ ঠিক করে দিন। ভবিষ্যতের তোলার তারিখ নয়।", "Check the dates. Harvest and photo dates cannot be in the future."); render(); return; }
    }
    try {
      const files = [...form.elements.photo.files];
      if (files.length > 3) throw new Error(t("সর্বোচ্চ ৩টি ছবি দিন।", "Choose at most 3 photos."));
      form.querySelector('[type="submit"]').disabled = true;
      const photos = [];
      for (const file of files) photos.push({ src: await compressPhoto(file), takenOn: values.photoTakenOn || "", addedAt: new Date().toISOString() });
      const lot = { id: uid(), sample: false, district: values.district, upazila: String(values.upazila).trim().slice(0, 60), variety: varieties.some(([value]) => value === values.variety) ? values.variety : t("জানা নেই", "Unknown"), purpose: "unknown", quantityKg, readyDate: values.readyDate, harvestDate: values.harvestDate || "", notes: String(values.notes || "").trim().slice(0, 300), photo: photos[0]?.src || "", photos, createdAt: new Date().toISOString() };
      data.listings.unshift(lot); selectedLotId = lot.id;
      if (!save()) { data.listings.shift(); return render(); }
      notice = t("আলুর তথ্য এই ফোনে রাখা হয়েছে—এখনো কোনো ক্রেতার কাছে যায়নি।", "Lot saved on this device—not sent to any buyer."); setView("offers");
    } catch (error) { notice = error.message; render(); }
  }
  if (form.id === "offer-form") {
    const profile = { businessName: String(values.buyer || "").trim().slice(0, 80), contactPerson: String(values.contactPerson || "").trim().slice(0, 80), contactPhone: String(values.contactPhone || "").trim(), buyerUpazila: String(values.buyerUpazila || "").trim().slice(0, 80), buyerAddress: String(values.buyerAddress || "").trim().slice(0, 180) };
    if (profile.businessName.length < 2 || profile.contactPerson.length < 2 || !/^(?:\+?88)?01[3-9]\d{8}$/.test(profile.contactPhone) || profile.buyerUpazila.length < 2 || profile.buyerAddress.length < 5) { notice = t("ব্যবসার নাম, যোগাযোগের নাম, বাংলাদেশি মোবাইল নম্বর ও ঠিকানা ঠিক করে দিন।", "Check the business name, contact, Bangladesh mobile number and address."); return render(); }
    const lot = data.listings.find(item => item.id === values.lotId);
    const fields = { quantityKg: validNumber(values.quantityKg, 1, lot ? availableKg(lot, data.deals) : 0), priceKg: validNumber(values.priceKg, 1, 10000), acceptedPercent: validNumber(values.acceptedPercent, 1, 100), transport: validNumber(values.transport, 0, 1000000), handling: validNumber(values.handling, 0, 1000000), fee: validNumber(values.fee, 0, 1000000), paymentDays: validNumber(values.paymentDays, 0, 30) };
    if (!lot || Object.values(fields).some(value => value === null) || !districts.includes(values.district) || values.expires < todayPlus(0)) { notice = t("দরের তথ্য ঠিক করে আবার দিন।", "Check the offer details and try again."); return render(); }
    const offer = { id: uid(), sample: false, lotId: lot.id, buyer: String(values.buyer).trim().slice(0, 80), district: values.district, contact: profile, ...fields, pickup: values.pickup === "farmer" ? "farmer" : "buyer", terms: String(values.terms).trim().slice(0, 400), expires: values.expires, createdAt: new Date().toISOString() };
    data.offers.unshift(offer); if (!save()) { data.offers.shift(); return render(); }
    buyerProfile = profile;
    try { localStorage.setItem(buyerProfileKey, JSON.stringify(profile)); } catch { /* Offer remains saved; profile can be entered again. */ }
    draftLotId = ""; notice = t("দর রাখা হয়েছে। এই ব্রাউজারে কৃষকের পাতায়ও দেখা যাবে।", "Offer saved. It will appear on the farmer page in this browser."); setView("buyer-offers");
  }
  if (form.id === "deal-form") {
    const offer = data.offers.find(item => item.id === values.offerId);
    const lot = offer && data.listings.find(item => item.id === offer.lotId);
    const quantityKg = validNumber(values.quantityKg, 1, offer && lot ? offerRemainingKg(offer, lot) : 0);
    if (!offer || !lot || !quantityKg || offer.expires < todayPlus(0) || estimateOffer(offer, quantityKg).net <= 0) { notice = t("এই দর বা পরিমাণ আর পাওয়া যাচ্ছে না। আবার দর দেখুন।", "This offer or quantity is no longer available. Review the offers again."); reviewOfferId = ""; return render(); }
    data.deals.unshift({ id: uid(), sample: offer.sample || lot.sample, lotId: lot.id, variety: lot.variety, quantityKg, offer: { ...offer }, status: "agreed", actualAcceptedKg: null, createdAt: new Date().toISOString() });
    if (!save()) { data.deals.shift(); return render(); }
    notice = t("চুক্তির নথি রাখা হয়েছে। কোনো পেমেন্ট হয়নি।", "Deal record saved. No payment was made."); setView("deals");
  }
  if (form.dataset.form === "pickup") {
    const deal = getDeal(form.dataset.id);
    const accepted = validNumber(values.actualAcceptedKg, 1, deal?.quantityKg || 0);
    if (!deal || deal.status !== "agreed" || !accepted) return;
    deal.actualAcceptedKg = accepted; deal.pickupNote = String(values.pickupNote || "").trim().slice(0, 180); deal.status = "pickup_pending"; save(); render();
  }
  if (form.dataset.form === "payment") {
    const deal = getDeal(form.dataset.id);
    const amount = validNumber(values.paymentAmount, 0, 100000000);
    const estimate = deal ? estimateOffer(deal.offer, deal.actualAcceptedKg ?? deal.quantityKg) : null;
    const due = estimate ? Math.max(0, estimate.net) : 0;
    const paid = Math.max(0, Number(deal?.paidAmount) || 0);
    const remaining = Math.max(0, due - paid);
    if (!deal || deal.status !== "collected" || amount === null || amount <= 0 || amount > remaining || !String(values.paymentRef || "").trim()) { notice = t("টাকার পরিমাণ শূন্য হতে পারবে না এবং বাকি টাকার বেশি হতে পারবে না।", "Payment must be above zero and cannot exceed the remaining balance."); return render(); }
    deal.paymentAmount = amount; deal.paidAmount = paid + amount; deal.remainingBalance = Math.max(0, due - deal.paidAmount); deal.paymentRef = String(values.paymentRef).trim().slice(0, 80); deal.status = "payment_pending"; save(); render();
  }
  if (form.id === "storage-form") {
    const bounds = { quantityKg: [1, 100000], priceKg: [0, 10000], months: [0.1, 12], feeKgMonth: [0, 1000], lossPercent: [0, 80], oneTimeCost: [0, 1000000] };
    const input = Object.fromEntries(Object.entries(bounds).map(([key, [min, max]]) => [key, validNumber(values[key], min, max)]));
    if (Object.values(input).some(value => value === null)) return;
    storageInputs = input;
    showStorageResult(form, input);
  }
  if (form.id === "quote-form") {
    const quote = { id: uid(), name: String(values.name).trim().slice(0, 80), area: String(values.area).trim().slice(0, 80), phone: String(values.phone || "").trim().slice(0, 25), terms: String(values.terms).trim().slice(0, 250) };
    if (!quote.name || !quote.area || !quote.terms) return;
    data.quotes.unshift(quote); if (!save()) { data.quotes.shift(); return render(); }
    notice = t("হিমাগারের দর লিখে রাখা হয়েছে। খালি জায়গা ও শর্ত আবার নিশ্চিত করুন।", "Quote saved. Confirm capacity and terms with the operator."); render();
  }
});

function printDeal(id) {
  const deal = getDeal(id);
  if (!deal) return;
  const estimate = estimateOffer(deal.offer, deal.quantityKg);
  const title = h(t("আলুসাথী চুক্তির নথি", "AluSathi deal record"));
  const content = `<h1>${title}</h1><p>${h(t("হিসাবের কপি · আইনি চুক্তি নয়।", "Calculation copy · not a legal contract."))}</p><dl><dt>${h(t("ক্রেতা", "Buyer"))}</dt><dd>${h(deal.offer.buyer)}</dd><dt>${h(t("আলু", "Potatoes"))}</dt><dd>${h(deal.variety)} · ${kg(deal.quantityKg)}</dd><dt>${h(t("দর", "Price"))}</dt><dd>${rate(deal.offer.priceKg)}/kg</dd><dt>${h(t("আনুমানিক হাতে", "Estimated take-home"))}</dt><dd>${money(estimate.net)}</dd><dt>${h(t("ওজন / কাটতির নিয়ম", "Weight and deduction terms"))}</dt><dd>${h(deal.offer.terms)}</dd><dt>${h(t("পেমেন্ট", "Payment"))}</dt><dd>${h(deal.offer.paymentDays)} ${h(t("দিনে", "days"))}</dd><dt>ID</dt><dd>${h(deal.id)}</dd></dl>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed"; frame.style.width = "0"; frame.style.height = "0"; frame.style.border = "0";
  document.body.append(frame);
  frame.contentDocument.write(`<!doctype html><html><head><title>${title}</title><style>body{font:18px sans-serif;padding:32px;color:#173d30}dt{font-weight:bold;margin-top:20px}dd{margin:4px 0;border-bottom:1px solid #ddd;padding-bottom:10px}</style></head><body>${content}</body></html>`);
  frame.contentDocument.close();
  frame.contentWindow.focus(); frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}

render();
