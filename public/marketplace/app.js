import { initialData, estimateOffer, availableKg, purchaseCost, storageBreakEven, todayPlus } from "./market.mjs";
import { offerSummary, offerTerms, passportBody, passportDocument, passportText } from "./lot-tools.mjs";
import { mountTransport, disposeTransport } from "./transport.mjs";
import { mountBuyerTransport, disposeBuyerTransport, readBuyerTransport } from "./buyer-transport.mjs";
import { mountBuyerPlan } from "./buyer-plan.mjs";
import { districtPlaces } from "./districts.mjs";
import { prepareDemoForms } from "./demo-forms.mjs";
import { marketplaceRequest, toMarketplaceLot, toMarketplaceOffer, toMarketplaceRequest } from "./shared-api.mjs";

const storeKey = "alusathi-marketplace-pilot-v1";
const localLotsKey = "alusathi-farmer-demo-lots-v1";
const buyerRequestsKey = "alusathi-buyer-lot-requests-v1";
function readBuyerLotRequests() {
  try {
    const records = JSON.parse(localStorage.getItem(buyerRequestsKey) || "[]");
    return Array.isArray(records) ? records.filter(item => item && typeof item.id === "string" && typeof item.lotId === "string" && typeof item.createdAt === "string" && Number.isFinite(Number(item.quantityKg)) && Number(item.quantityKg) > 0 && Number.isFinite(Number(item.totalOffer)) && Number(item.totalOffer) > 0 && item.status === "pending") : [];
  } catch { return []; }
}
let buyerLotRequests = readBuyerLotRequests();
const demoLotPhotos = ["/marketplace/demo-lots/potato-01.webp", "/marketplace/demo-lots/potato-gallery-02.webp", "/marketplace/demo-lots/potato-gallery-04.webp"];
function readLocalLots() {
  try { const lots = JSON.parse(localStorage.getItem(localLotsKey) || "[]"); return Array.isArray(lots) ? lots.filter(lot => lot && lot.demoPublished && typeof lot.id === "string") : []; }
  catch { return []; }
}
function saveLocalLot(lot) {
  const lots = [...readLocalLots().filter(item => item.id !== lot.id), lot];
  localStorage.setItem(localLotsKey, JSON.stringify(lots));
  data.listings = [...data.listings.filter(item => item.id !== lot.id), lot];
}
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
const photoSrc = value => {
  if (typeof value !== "string") return "";
  if (value.length < 1_400_000 && /^data:image\/jpeg;base64,[\w+/=]+$/.test(value)) return value;
  if (/^\/marketplace\/demo-lots\/potato-(?:0[1-5]|gallery-0[1-5])\.webp$/.test(value)) return value;
  if (/^\/marketplace\/demo-lots\/potato-0[2-5]-v2\.png$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co") && /^\/storage\/v1\/object\/public\/market-lot-photos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/.test(url.pathname) ? url.href : "";
  } catch { return ""; }
};
const uid = () => crypto.randomUUID();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    if (saved && ["listings", "offers", "deals", "quotes"].every(key => Array.isArray(saved[key]))) {
      const names = { "sample-local": "Local trader", "sample-remote": "District wholesaler", "sample-partial": "Potato processor" };
      for (const offer of saved.offers) if (offer.sample && names[offer.id]) offer.buyer = names[offer.id];
      for (const deal of saved.deals) if (deal.offer?.sample && names[deal.offer.id]) deal.offer.buyer = names[deal.offer.id];
      const sample = saved.listings.find(lot => lot.id === "sample-lot" && lot.sample);
      if (sample && saved.offers.some(offer => offer.sample && offer.lotId === sample.id && offer.expires < sample.readyDate)) {
        sample.readyDate = todayPlus(0);
        sample.notes = "Stored potatoes; mixed medium and large sizes.";
      }
      return saved;
    }
  } catch { /* Invalid local demo data resets to the sample. */ }
  return initialData();
}

let data = load();
data.listings = [...data.listings.filter(lot => !lot.demoPublished), ...readLocalLots()];
data.buyingRequests ??= [];
data.buyerActivity ??= [];
let language = (localStorage.getItem("alusathi-lang") || localStorage.getItem(langKey)) === "en" ? "en" : "bn";
function setNumberFormat() {
  const locale = language === "bn" ? "bn-BD" : "en-BD";
  formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  rateFormatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
setNumberFormat();
const role = ["farmer", "buyer"].includes(document.body.dataset.role) ? document.body.dataset.role : "choose";
if (role === "buyer") {
  const demoLots = initialData().listings;
  const demoIds = new Set(demoLots.map(lot => lot.id));
  data.listings = [...demoLots, ...data.listings.filter(lot => !demoIds.has(lot.id) && lot.published !== false)];
}
let sharedUserId = "";
let sharedLoading = false;
let sharedProfile = {};
let catalogueRequests = [];
let profileOpen = false;
let buyerProfileTab = "saved";
let buyerLotDialogId = "";
let buyerLotDialogMode = "details";
let buyerLotDialogTriggerId = "";
let showSamples = role === "farmer" && location.hash === "#samples";
const visibleListings = () => role !== "farmer" || showSamples ? data.listings : data.listings.filter(item => !item.sample || item.demoPublished);
const visibleOffers = () => role !== "farmer" || showSamples ? data.offers : data.offers.filter(item => !item.sample && !data.listings.find(lot => lot.id === item.lotId)?.sample);
const visibleDeals = () => role !== "farmer" || showSamples ? data.deals : data.deals.filter(item => !item.sample);
const sessionKey = `alusathi-market-demo-${role}`;
const farmerPreview = role === "buyer" && new URL(location.href).searchParams.get("preview") === "1";
let displayName = role === "farmer" ? "কৃষক" : "ব্যবসায়ী";
try { if (role !== "choose") { if (!farmerPreview) { sessionStorage.setItem("alusathi-role", role); sessionStorage.setItem("alusathi-demo", String(role === "farmer")); } displayName = sessionStorage.getItem(sessionKey) || displayName; } } catch { /* Page remains usable without session storage. */ }
const buyerProfileKey = "alusathi-buyer-profile-v1";
let buyerProfile = {};
try { buyerProfile = JSON.parse(localStorage.getItem(buyerProfileKey) || "{}") || {}; } catch { buyerProfile = {}; }
const farmerViews = ["home", "list", "offers", "transport", "storage", "deals", "passport", "responses"];
const buyerViews = ["home", "purchases", "transport", "notebook", "buyer-plan", "buyer-detail", "passport"];
let view = farmerPreview ? "buyer-detail" : role === "farmer" && farmerViews.includes(location.hash.slice(1)) ? location.hash.slice(1) : role === "buyer" && buyerViews.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
let storageInputs = null;
let quoteOpen = false;
let selectedLotId = new URL(location.href).searchParams.get("lot") || data.listings[0]?.id || "";
let editingLotId = "";
let demoPhotoSelection = false;
const buyerOfferDraftKey = "alusathi-buyer-offer-draft-v1";
let buyerOfferDraft = {};
try { buyerOfferDraft = JSON.parse(localStorage.getItem(buyerOfferDraftKey) || "{}") || {}; } catch { buyerOfferDraft = {}; }
let draftLotId = role === "buyer" && data.listings.some(item => item.id === buyerOfferDraft.lotId) ? buyerOfferDraft.lotId : "";
let reviewOfferId = "";
let counterOfferId = "";
let highlightedOfferId = "";
let notice = "";
let transportOfferId = "";
let buyerBrief = { variety: "", quantityKg: "", destination: "", district: "", purpose: "", readyDate: "", sort: "ready" };
try { buyerBrief = { ...buyerBrief, ...(JSON.parse(localStorage.getItem("alusathi-buyer-brief-v1") || "{}") || {}) }; } catch { /* Keep the blank brief. */ }
const buyerCatalogueKey = "alusathi-buyer-catalogue-v1";
let buyerCatalogue = { savedLotIds: [], compareLotIds: [], recentLotIds: [], tab: "all" };
try { buyerCatalogue = { ...buyerCatalogue, ...(JSON.parse(localStorage.getItem(buyerCatalogueKey) || "{}") || {}) }; } catch { /* Keep buyer catalogue preferences in memory. */ }
buyerCatalogue.savedLotIds = Array.isArray(buyerCatalogue.savedLotIds) ? buyerCatalogue.savedLotIds.slice(0, 4) : [];
buyerCatalogue.compareLotIds = Array.isArray(buyerCatalogue.compareLotIds) ? buyerCatalogue.compareLotIds.slice(0, 3) : [];
buyerCatalogue.recentLotIds = Array.isArray(buyerCatalogue.recentLotIds) ? buyerCatalogue.recentLotIds.slice(0, 8) : [];
let buyerPage = 1;
let compareOpen = false;
let buyerRequestOpen = false;
let editingBuyerRequestId = "";
let proposalRequestId = "";

function lotMatchesBrief(lot) {
  const quantity = Number(buyerBrief.quantityKg) || 0;
  const variety = String(buyerBrief.variety || "").trim();
  const destination = String(buyerBrief.district || buyerBrief.destination || "").trim();
  const purpose = String(buyerBrief.purpose || "").trim();
  const readyDate = String(buyerBrief.readyDate || "").trim();
  return (!quantity || availableKg(lot, data.deals) >= quantity)
    && (!variety || lot.variety === variety)
    && (!destination || lot.district === destination)
    && (!purpose || lot.purpose === purpose)
    && (!readyDate || lot.readyDate <= readyDate);
}

function saveBuyerCatalogue() {
  try { localStorage.setItem(buyerCatalogueKey, JSON.stringify(buyerCatalogue)); } catch { /* Preferences remain available for this session. */ }
}

function saveBuyerOfferDraft(form) {
  if (role !== "buyer" || !form) return;
  buyerOfferDraft = Object.fromEntries([...form.elements].filter(field => field.name && field.type !== "file").map(field => [field.name, field.type === "checkbox" ? field.checked : field.value]));
  try { localStorage.setItem(buyerOfferDraftKey, JSON.stringify(buyerOfferDraft)); } catch { /* The draft remains in memory. */ }
}

function restoreBuyerOfferDraft(form) {
  if (!form || buyerOfferDraft.lotId !== form.elements.lotId?.value) return;
  for (const [name, value] of Object.entries(buyerOfferDraft)) {
    const field = form.elements[name];
    if (!field || name === "lotId") continue;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = String(value ?? "");
  }
}

function recordBuyerActivity(type, refs = {}) {
  if (role !== "buyer") return;
  const signature = `${type}:${refs.lotId || refs.offerId || refs.buyingRequestId || refs.dealId || ""}`;
  const latest = data.buyerActivity[0];
  if (latest?.signature === signature && Date.now() - Date.parse(latest.createdAt) < 60_000) return;
  data.buyerActivity.unshift({ id: uid(), type, signature, ...refs, createdAt: new Date().toISOString() });
  data.buyerActivity = data.buyerActivity.slice(0, 100);
  save();
}

function openBuyerLot(lotId, push = true) {
  const lot = data.listings.find(item => item.id === lotId);
  if (!lot) return;
  selectedLotId = lot.id;
  buyerCatalogue.recentLotIds = [lot.id, ...buyerCatalogue.recentLotIds.filter(id => id !== lot.id)].slice(0, 8);
  saveBuyerCatalogue();
  recordBuyerActivity("lot_viewed", { lotId: lot.id });
  view = "buyer-detail";
  const url = new URL(location.href);
  url.searchParams.set("lot", lot.id);
  url.hash = "buyer-detail";
  history[push ? "pushState" : "replaceState"](null, "", url);
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function openBuyerLotDialog(lotId, focusOffer = false) {
  const lot = data.listings.find(item => item.id === lotId);
  if (!lot) return;
  selectedLotId = lot.id;
  buyerLotDialogId = lot.id;
  buyerLotDialogMode = focusOffer ? "offer" : "details";
  buyerLotDialogTriggerId = lot.id;
  buyerCatalogue.recentLotIds = [lot.id, ...buyerCatalogue.recentLotIds.filter(id => id !== lot.id)].slice(0, 8);
  saveBuyerCatalogue();
  recordBuyerActivity("lot_viewed", { lotId: lot.id });
  render();
  if (focusOffer) {
    const form = document.querySelector(".buyer-detail-dialog #catalogue-request-form");
    form?.scrollIntoView({ block: "center" });
    (form?.querySelector('input[name="totalOffer"]') || document.querySelector(".buyer-detail-close"))?.focus({ preventScroll: true });
  } else document.querySelector(".buyer-detail-dialog [data-action='close-buyer-detail']")?.focus();
}

function closeBuyerLotDialog() {
  buyerLotDialogId = "";
  render();
  const action = buyerLotDialogMode === "offer" ? "make-buyer-offer" : "open-buyer-lot";
  [...document.querySelectorAll(`[data-action="${action}"]`)].find(button => button.dataset.id === buyerLotDialogTriggerId)?.focus();
}

function validContactPhone(value) {
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(String(value || "").trim());
}

function whatsappPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.startsWith("88") ? digits : `88${digits}`;
}

function buyerReadiness(lot) {
  return String(lot.readyDate || "") <= todayPlus(0) ? "ready" : "later";
}

function renderBuyerFilterChips() {
  const chips = [];
  if (buyerBrief.district) chips.push(["district", language === "bn" ? districtNamesBn[buyerBrief.district] || buyerBrief.district : buyerBrief.district]);
  if (buyerBrief.variety) chips.push(["variety", lotVariety({ variety: buyerBrief.variety })]);
  if (buyerBrief.quantityKg) chips.push(["quantityKg", `${kg(buyerBrief.quantityKg)}+`]);
  if (buyerBrief.purpose) chips.push(["purpose", purposeLabel(buyerBrief.purpose)]);
  if (buyerBrief.readyDate) chips.push(["readyDate", `${t("প্রস্তুত", "Ready by")} ${prettyDate(buyerBrief.readyDate)}`]);
  if (!chips.length) return "";
  return `<div class="buyer-filter-chips">${chips.map(([key, label]) => `<button type="button" data-action="clear-buyer-filter" data-key="${h(key)}" aria-label="${h(t("বাছাই সরান", "Remove filter"))}: ${h(label)}">${h(label)} <span aria-hidden="true">×</span></button>`).join("")}<button type="button" class="clear-all" data-action="clear-buyer-filters">${t("সব মুছুন", "Clear all")}</button></div>`;
}

function buyerLotStatus(lot) {
  const remaining = availableKg(lot, data.deals);
  if (remaining <= 0) return t("শেষ", "Sold out");
  return buyerReadiness(lot) === "ready" ? t("এখন প্রস্তুত", "Ready now") : t("পরে প্রস্তুত", "Ready later");
}

function buyerLotPriceRange(lot, quantityKg = 200) {
  const minimumRate = Number(lot.askingPriceMin ?? lot.askingPrice);
  const maximumRate = Number(lot.askingPriceMax ?? lot.askingPrice);
  if (!Number.isFinite(minimumRate) || !Number.isFinite(maximumRate) || minimumRate < 0 || maximumRate < minimumRate) return "";
  const minimum = Math.round(minimumRate * quantityKg * 100) / 100;
  const maximum = Math.round(maximumRate * quantityKg * 100) / 100;
  return minimum === maximum ? money(minimum) : `${money(minimum)}–${money(maximum)}`;
}

function lotAskingPriceLabel(lot) {
  const min = Number(lot.askingPriceMin ?? lot.askingPrice);
  const max = Number(lot.askingPriceMax ?? lot.askingPrice);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) return t("দর প্রস্তাব করুন", "Make an offer");
  return min === max ? `${rate(min)}/${t("কেজি", "kg")}` : `${rate(min)}–${rate(max)}/${t("কেজি", "kg")}`;
}

function renderBuyerLotCard(lot) {
  const remaining = availableKg(lot, data.deals);
  const saved = buyerCatalogue.savedLotIds.includes(lot.id);
  const compared = buyerCatalogue.compareLotIds.includes(lot.id);
  const priceRange = buyerLotPriceRange(lot);
  return `<article class="buyer-catalogue-card ${remaining <= 0 ? "is-closed" : ""}">
    <div class="buyer-card-photo">${photoOrArtwork(lot, "buyer-card-image")}<span class="buyer-ready-badge">${buyerLotStatus(lot)}</span><button type="button" class="buyer-save ${saved ? "selected" : ""}" data-action="toggle-save-lot" data-id="${h(lot.id)}" aria-label="${saved ? t("পছন্দ থেকে সরান", "Remove saved lot") : t("পছন্দের লট রাখুন", "Save lot")}" aria-pressed="${saved}">${saved ? "♥" : "♡"}</button></div>
    <div class="buyer-card-body"><h3>${h(lotVariety(lot))}</h3><p class="buyer-card-place">${icon("pin", 16)}${h(lot.upazila || "—")}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p>
    ${lot.farmerName ? `<p class="buyer-card-farmer"><span>${t("কৃষক", "Farmer")}</span><strong>${h(lot.farmerName)}</strong></p>` : ""}
    ${priceRange ? `<div class="buyer-card-range"><span>${t("২০০ কেজির চাওয়া মোট", "Asking total for 200 kg")}</span><strong>${priceRange}</strong></div>` : ""}
    <dl><div><dt>${t("মোট লট", "Lot size")}</dt><dd>${kg(lot.quantityKg)}</dd></div><div><dt>${t("এখন পাওয়া যাবে", "Available now")}</dt><dd>${kg(remaining)}</dd></div><div><dt>${t("প্রস্তুতির তারিখ", "Ready date")}</dt><dd>${prettyDate(lot.readyDate)}</dd></div></dl>
    ${catalogueRequests.some(item => item.lot_id === lot.id && item.buyer_id === sharedUserId && ["pending", "agreed"].includes(item.status)) ? `<p class="buyer-card-request-status">${t("আপনার অনুরোধের অবস্থা", "Your request")}: ${catalogueStatus(catalogueRequests.find(item => item.lot_id === lot.id && item.buyer_id === sharedUserId && ["pending", "agreed"].includes(item.status)))}</p>` : ""}
    <div class="buyer-card-actions"><div class="buyer-card-buttons"><button class="button button-green" type="button" data-action="open-buyer-lot" data-id="${h(lot.id)}">${t("বিস্তারিত", "Details")}</button><button class="button button-outline" type="button" data-action="make-buyer-offer" data-id="${h(lot.id)}">${t("দর দিন", "Make offer")}</button></div><label class="compare-check"><input type="checkbox" data-action="toggle-compare-lot" data-id="${h(lot.id)}" ${compared ? "checked" : ""} /> ${t("তুলনা", "Compare")}</label></div></div>
  </article>`;
}

function renderBuyerComparison() {
  const lots = buyerCatalogue.compareLotIds.map(id => data.listings.find(item => item.id === id)).filter(Boolean);
  if (!compareOpen || lots.length < 2) return "";
  const row = (bn, en, value) => `<div class="comparison-label">${t(bn, en)}</div>${lots.map(value).join("")}`;
  return `<section class="buyer-comparison panel" aria-labelledby="comparison-title"><div class="section-header"><div><p class="section-kicker">${t("পাশাপাশি", "SIDE BY SIDE")}</p><h2 id="comparison-title">${t("লট তুলনা", "Compare lots")}</h2></div><button type="button" class="text-arrow" data-action="close-comparison">${t("বন্ধ করুন", "Close")}</button></div><div class="comparison-table" style="--compare-count:${lots.length}">${row("ছবি ও লট", "Photo and lot", lot => `<div class="comparison-lot">${photoOrArtwork(lot, "comparison-photo")}<strong>${h(lotVariety(lot))}</strong><a class="text-arrow" href="./buyer.html?lot=${encodeURIComponent(lot.id)}#buyer-detail" data-action="open-buyer-lot" data-id="${h(lot.id)}">${t("লট দেখুন", "View lot")}</a></div>`)}${row("কৃষক", "Farmer", lot => `<span>${h(lot.farmerBusinessName || lot.farmerName || t("তথ্য নেই", "Not provided"))}</span>`)}${row("এলাকা", "Location", lot => `<span>${h(lot.upazila || "—")}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</span>`)}${row("পাওয়া যাবে", "Available", lot => `<span>${kg(availableKg(lot, data.deals))}</span>`)}${row("প্রস্তুত", "Ready", lot => `<span>${prettyDate(lot.readyDate)}</span>`)}${row("অবস্থা", "Condition", lot => `<span>${h(lot.conditionDescription || t("তথ্য নেই", "Not provided"))}</span>`)}${row("দর · ২০০ কেজি", "Asking · 200 kg", lot => `<strong>${buyerLotPriceRange(lot, 200) || t("তথ্য নেই", "Not provided")}</strong>`)}</div></section>`;
}

function catalogueStatus(request) {
  return ({ pending: t("উত্তরের অপেক্ষা", "Awaiting reply"), rejected: t("কৃষক রাজি হননি", "Farmer declined"), withdrawn: t("অনুরোধ তুলে নেওয়া হয়েছে", "Request withdrawn"), agreed: t("সম্মতি হয়েছে", "Agreed"), expired: t("সময় শেষ", "Expired") })[request.status] || request.status;
}

function renderCatalogueRequest(request) {
  const incoming = request.seller_id === sharedUserId;
  const farmer = request.farmer || {};
  const buyer = request.buyer || {};
  const phone = incoming ? buyer.mobile : farmer.mobile;
  const person = incoming ? (buyer.business_name || buyer.name) : (farmer.business_name || farmer.name);
  const lot = request.lot || {};
  const pending = request.status === "pending";
  const canAct = pending && request.awaiting_user_id === sharedUserId;
  const resend = !incoming && request.status === "rejected";
  const cancel = request.status === "agreed";
  return `<article class="catalogue-request-row"><div class="catalogue-request-thumb">${photoOrArtwork({ variety: lot.variety, photos: lot.photos || [], photo: lot.photos?.[0]?.src || "" }, "catalogue-request-photo")}</div><div class="catalogue-request-copy"><span class="status-pill">${catalogueStatus(request)}</span><h3>${h(lot.variety || t("আলু", "Potatoes"))} · ${kg(request.quantity_kg)}</h3><p>${t("মোট প্রস্তাব", "Total offer")}: <strong>${money(request.quoted_total)}</strong> · ${h(person || t("অ্যাকাউন্ট", "Account"))}</p><small>${incoming ? t("আপনার চাওয়া দর", "Your asking range") : t("কৃষকের চাওয়া দর", "Farmer’s asking range")}: ${buyerLotPriceRange(data.listings.find(item => item.id === request.lot_id) || {}, request.quantity_kg) || t("তথ্য নেই", "Not provided")}</small>${phone && validContactPhone(phone) ? `<div class="catalogue-contact"><a href="tel:${h(phone)}">${t("ফোন", "Call")}</a><a href="https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(t("আলুসাথীর আলুর অনুরোধ নিয়ে কথা বলতে চাই।", "I want to discuss this AluSathi potato request."))}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>` : ""}<div class="catalogue-request-actions">${incoming && canAct ? `<button class="button button-green button-small" data-action="catalogue-response" data-response="accept" data-id="${h(request.id)}" data-revision="${request.version}">${t("মেনে নিন", "Accept")}</button><button class="button button-outline button-small" data-action="catalogue-response" data-response="decline" data-id="${h(request.id)}" data-revision="${request.version}">${t("না বলুন", "Decline")}</button>` : ""}${!incoming && canAct ? `<button class="button button-outline button-small" data-action="catalogue-response" data-response="withdraw" data-id="${h(request.id)}" data-revision="${request.version}">${t("অনুরোধ তুলে নিন", "Withdraw request")}</button>` : ""}${resend ? `<form class="catalogue-resend" data-form="catalogue-resend" data-id="${h(request.id)}" data-revision="${request.version}"><label>${t("নতুন মোট প্রস্তাব", "Revised total offer")}<input name="totalOffer" inputmode="decimal" type="number" min="0" step="0.01" value="${Number(request.quoted_total)}" required /></label><button class="button button-green button-small">${t("আবার পাঠান", "Resend")}</button></form>` : ""}${cancel ? `<button class="button button-outline button-small" data-action="catalogue-response" data-response="cancel" data-id="${h(request.id)}" data-revision="${request.version}">${t("সম্মতি বাতিল করুন", "Cancel agreement")}</button>` : ""}</div></div></article>`;
}

function renderProfileDrawer() {
  const requests = catalogueRequests.filter(request => request.buyer_id === sharedUserId || request.seller_id === sharedUserId);
  if (role === "buyer") return renderBuyerProfileDrawer(requests);
  return `<div class="profile-backdrop" data-action="close-profile"><section class="profile-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button class="profile-close" data-action="close-profile" aria-label="${t("বন্ধ করুন", "Close")}">×</button><p class="section-kicker">${t("আমার প্রোফাইল", "MY PROFILE")}</p><h2 id="profile-title">${h(sharedProfile.business_name || sharedProfile.contact_name || t("পরিচয় বাছুন", "Choose a role"))}</h2><p>${h(sharedProfile.district || "")}</p>${!sharedUserId ? `<a class="button button-green" href="/auth">${t("পরিচয় বাছুন", "Choose role")}</a>` : `<h3>${role === "farmer" ? t("ক্রেতার অনুরোধ", "Buyer requests") : t("আপনার অনুরোধ", "Your requests")}</h3><div class="catalogue-request-list">${requests.length ? requests.map(renderCatalogueRequest).join("") : `<p>${t("এখন কোনো অনুরোধ নেই।", "No requests yet.")}</p>`}</div>`}</section></div>`;
}

function renderBuyerProfileDrawer(sharedRequests) {
  const savedLots = buyerCatalogue.savedLotIds.map(id => data.listings.find(lot => lot.id === id)).filter(Boolean);
  const localRequests = buyerLotRequests.filter(item => item.status === "pending");
  const purchases = data.deals.filter(deal => !deal.sample);
  const tabs = [["saved", "সংরক্ষিত লট", "Saved lots", savedLots.length], ["requests", "অনুরোধ", "Requests", localRequests.length + sharedRequests.length], ["history", "কেনার ইতিহাস", "Purchase history", purchases.length]];
  const tab = (key, bn, en, count) => `<button type="button" class="${buyerProfileTab === key ? "active" : ""}" data-action="buyer-profile-tab" data-tab="${key}">${t(bn, en)}${count ? ` <span>${formatter.format(count)}</span>` : ""}</button>`;
  const saved = savedLots.length ? savedLots.map(lot => `<article class="buyer-profile-row"><div>${photoOrArtwork(lot, "buyer-profile-photo")}</div><div><strong>${h(lotVariety(lot))}</strong><p>${h(lot.upazila || "")}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p><small>${buyerLotPriceRange(lot) || t("তথ্য নেই", "Not provided")}</small></div><button type="button" class="text-arrow" data-action="open-buyer-lot" data-id="${h(lot.id)}">${t("বিস্তারিত", "Details")}</button></article>`).join("") : `<div class="profile-empty"><p>${t("এখনো কোনো লট সংরক্ষণ করা হয়নি।", "No lots saved yet.")}</p><button type="button" class="button button-outline button-small" data-view="home">${t("আলুর তালিকা দেখুন", "Browse lots")}</button></div>`;
  const requests = [...localRequests.map(request => `<article class="buyer-profile-row"><div>${photoOrArtwork(data.listings.find(lot => lot.id === request.lotId) || { variety: request.variety, photo: request.photo }, "buyer-profile-photo")}</div><div><strong>${h(request.variety)} · ${kg(request.quantityKg)}</strong><p>${t("মোট প্রস্তাব", "Total offer")}: ${money(request.totalOffer)}</p><small>${t("কৃষকের উত্তরের অপেক্ষায়", "Awaiting the farmer’s reply")}</small></div><button type="button" class="text-arrow" data-action="open-buyer-lot" data-id="${h(request.lotId)}">${t("বিস্তারিত", "Details")}</button></article>`), ...sharedRequests.map(renderCatalogueRequest)];
  const history = purchases.length ? purchases.map(deal => `<article class="buyer-profile-row"><div class="buyer-profile-record">${icon("bag", 20)}</div><div><strong>${h(deal.variety || t("আলু", "Potatoes"))} · ${kg(deal.quantityKg)}</strong><p>${t("সম্মত মোট", "Agreed total")}: ${money(deal.agreedTotal ?? 0)}</p><small>${dealStatus(deal)}</small></div><button type="button" class="text-arrow" data-view="purchases">${t("খুলুন", "Open")}</button></article>`).join("") : `<div class="profile-empty"><p>${t("এখনো কোনো নিশ্চিত কেনাকাটা নেই।", "No agreed purchases yet.")}</p></div>`;
  const body = buyerProfileTab === "saved" ? saved : buyerProfileTab === "requests" ? (requests.length ? requests.join("") : `<div class="profile-empty"><p>${t("এখন কোনো অনুরোধ নেই।", "No requests yet.")}</p></div>`) : history;
  const name = sharedProfile.business_name || buyerProfile.businessName || "Rahim Traders";
  const location = sharedProfile.district || buyerProfile.district || "Bogura";
  return `<div class="profile-backdrop" data-action="close-profile"><section class="profile-drawer buyer-profile-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button class="profile-close" data-action="close-profile" aria-label="${t("বন্ধ করুন", "Close")}">×</button><p class="section-kicker">${t("ব্যবসার প্রোফাইল", "BUSINESS PROFILE")}</p><h2 id="profile-title">${h(name)}</h2><p>${h(location)}</p><div class="buyer-profile-summary"><span>${icon("bag", 20)}</span><div><strong>${formatter.format(savedLots.length)} ${t("টি সংরক্ষিত লট", "saved lots")}</strong><small>${t("পছন্দের আলু, অনুরোধ ও কেনাকাটা এক জায়গায়।", "Saved lots, requests, and purchases in one place.")}</small></div></div><div class="buyer-profile-tabs" role="tablist">${tabs.map(([key, bn, en, count]) => tab(key, bn, en, count)).join("")}</div><div class="buyer-profile-content">${body}</div></section></div>`;
}

function renderBuyerRequestForm() {
  if (!buyerRequestOpen) return "";
  const request = data.buyingRequests.find(item => item.id === editingBuyerRequestId) || {};
  return `<div class="modal-backdrop" data-action="close-buyer-request"><div class="modal buyer-request-modal" role="dialog" aria-modal="true" aria-labelledby="buyer-request-title"><button type="button" class="modal-close" data-action="close-buyer-request" aria-label="${t("বন্ধ করুন", "Close")}">×</button><p class="section-kicker">${t("কেনার চাহিদা", "BUYING REQUEST")}</p><h2 id="buyer-request-title">${request.id ? t("চাহিদা বদলান", "Edit buying request") : t("আপনি কী কিনতে চান?", "What do you want to buy?")}</h2><form id="buyer-request-form"><input type="hidden" name="requestId" value="${h(request.id || "")}" /><div class="form-grid"><label>${t("আলুর জাত", "Variety")}<select name="variety"><option value="">${t("যেকোনো উপযুক্ত জাত", "Any suitable variety")}</option>${varieties.map(([value, bn]) => `<option value="${h(value)}" ${request.variety === value ? "selected" : ""}>${h(t(bn, value))}</option>`).join("")}</select></label><label>${t("ব্যবহার", "Intended use")}<select name="purpose"><option value="table" ${request.purpose === "table" ? "selected" : ""}>${t("খাওয়ার", "Food")}</option><option value="seed" ${request.purpose === "seed" ? "selected" : ""}>${t("বীজ", "Seed")}</option><option value="processing" ${request.purpose === "processing" ? "selected" : ""}>${t("প্রক্রিয়াজাত", "Processing")}</option></select></label><label>${t("কত কেজি দরকার", "Quantity wanted (kg)")}<input name="quantityKg" required type="number" min="1" max="100000" step="1" inputmode="numeric" value="${h(request.quantityKg || "")}" /></label><label>${t("দর (টাকা/কেজি)", "Offered price (BDT/kg)")}<input name="priceKg" required type="number" min="1" max="10000" step="0.01" inputmode="decimal" value="${h(request.priceKg || "")}" /></label><label>${t("কোন জেলা থেকে", "Sourcing district")}<select name="district" required><option value="">${t("জেলা বাছুন", "Choose district")}</option>${districts.map(d => `<option value="${h(d)}" ${request.district === d ? "selected" : ""}>${h(language === "bn" ? districtNamesBn[d] || d : d)}</option>`).join("")}</select></label><label>${t("কোথায় পৌঁছাতে হবে", "Delivery destination")}<input name="destination" required minlength="2" maxlength="100" value="${h(request.destination || "")}" /></label><label>${t("কবে দরকার", "Needed by")}<input name="neededBy" required type="date" min="${todayPlus(0)}" value="${h(request.neededBy || todayPlus(7))}" /></label><label>${t("কে সংগ্রহ করবে", "Who collects")}<select name="pickup"><option value="buyer" ${request.pickup !== "farmer" ? "selected" : ""}>${t("ক্রেতা", "Buyer")}</option><option value="farmer" ${request.pickup === "farmer" ? "selected" : ""}>${t("কৃষক পাঠাবেন", "Farmer delivers")}</option></select></label></div><label class="request-negotiable"><input name="negotiable" type="checkbox" value="yes" ${request.negotiable !== false ? "checked" : ""} /> ${t("দর আলোচনা করা যাবে", "Price is negotiable")}</label><label>${t("আরও শর্ত", "Additional terms")}<textarea name="terms" maxlength="300" rows="3">${h(request.terms || "")}</textarea></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-buyer-request">${t("বাদ দিন", "Cancel")}</button><button type="submit" class="button button-green">${request.id ? t("পরিবর্তন রাখুন", "Save changes") : t("চাহিদা রাখুন", "Save request")}</button></div></form></div></div>`;
}

function renderBuyerRequests() {
  if (!data.buyingRequests.length) return "";
  return `<details class="buyer-requests panel"><summary>${t("আমার কেনার চাহিদা", "My buying requests")} <span>${formatter.format(data.buyingRequests.length)}</span></summary><div class="buyer-request-list">${data.buyingRequests.map(request => `<article><div><span class="status-pill">${request.status === "closed" ? t("বন্ধ", "Closed") : t("চলছে", "Open")}</span><h3>${request.variety ? h(lotVariety({ variety: request.variety })) : t("যেকোনো উপযুক্ত জাত", "Any suitable variety")}</h3><p>${kg(request.remainingKg ?? request.quantityKg)} ${t("বাকি", "remaining")} · ${rate(request.priceKg)}/${t("কেজি", "kg")} · ${h(language === "bn" ? districtNamesBn[request.district] || request.district : request.district)} · ${prettyDate(request.neededBy)}</p></div><div class="buyer-request-actions"><button type="button" class="text-arrow" data-action="edit-buyer-request" data-id="${h(request.id)}">${t("দেখুন / বদলান", "View / edit")}</button><button type="button" class="text-arrow" data-action="toggle-buyer-request" data-id="${h(request.id)}">${request.status === "closed" ? t("আবার খুলুন", "Reopen") : t("বন্ধ করুন", "Close")}</button></div></article>`).join("")}</div></details>`;
}

function buyerCostLines(offer) {
  if (offer.buyerCosts && typeof offer.buyerCosts === "object") {
    return { transport: offer.buyerCosts.transport, loadingSacks: offer.buyerCosts.loadingSacks, taxes: offer.buyerCosts.taxes, marketFees: offer.buyerCosts.marketFees, other: offer.buyerCosts.other };
  }
  return { transport: Number(offer.transport) || 0, loadingSacks: Number(offer.handling) || 0, taxes: 0, marketFees: Number(offer.fee) || 0, other: 0 };
}

function buyerCostState(offer) {
  const lines = buyerCostLines(offer);
  const values = Object.values(lines);
  return { lines, known: values.every(value => value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0), total: values.reduce((sum, value) => sum + (Number(value) || 0), 0) };
}

function buyerCostSummary(offer, lot) {
  const available = availableKg(lot, data.deals);
  const offeredKg = Math.min(Number(offer.quantityKg) || 0, available);
  const acceptedKg = Math.floor(offeredKg * Math.min(100, Math.max(0, Number(offer.acceptedPercent) || 0)) / 100);
  const costs = buyerCostState(offer);
  const result = purchaseCost({ acceptedKg, priceKg: offer.priceKg, costs: costs.lines });
  return { offeredKg, acceptedKg, total: result.total, costs, deliveredPerKg: result.costPerAcceptedKg };
}

function summaryBlock(offer, quantity, open = false) {
  return `<details class="spoken-summary" ${open ? "open" : ""}><summary>${t("সহজ কথায় এই দর", "This offer in simple words")}</summary><p class="summary-text">${h(offerSummary(offer, quantity, language))}</p></details>`;
}

function renderPassport() {
  const lot = selectedLot();
  if (!lot) return `<section class="section page-shell">${t("আগে আলুর তথ্য দিন।", "Add a potato lot first.")}</section>`;
  return `<section class="section page-shell passport-page"><div class="passport-actions"><button class="text-arrow" data-view="home">← ${t("তালিকায় ফিরুন", "Back to lots")}</button><button class="button button-outline button-small" data-action="download-passport">${t("ফাইল রাখুন", "Save file")}</button><button class="button button-green button-small" data-action="share-passport">${t("পরিচয়পত্র পাঠান", "Share passport")}</button><button class="text-arrow" data-action="print-passport">${t("ছাপুন / PDF", "Print / PDF")}</button></div>${passportBody(lot, data.offers.filter(offer => offer.lotId === lot.id), language)}</section>`;
}

function farmerHistoryPrefill() {
  try {
    const diary = JSON.parse(localStorage.getItem("alusathi-field-diary-v1") || "[]");
    const actions = JSON.parse(localStorage.getItem("alusathi-field-actions-v1") || "[]");
    const dates = [
      ...(Array.isArray(diary) ? diary.map(item => Date.parse(item?.createdAt || "")) : []),
      ...(Array.isArray(actions) ? actions.map(item => Date.parse(`${item?.date || ""}T12:00:00`)) : []),
    ].filter(Number.isFinite);
    if (!dates.length || Date.now() - Math.min(...dates) < 30 * 86_400_000) return null;
    const photo = Array.isArray(actions) ? actions.find(item => item?.category === "photo") : null;
    const district = localStorage.getItem("alusathi-district") || "";
    return {
      district: districts.includes(district) ? district : "",
      variety: varieties.some(([value, bn]) => value === photo?.variety || bn === photo?.variety) ? varieties.find(([value, bn]) => value === photo.variety || bn === photo.variety)[0] : "",
      notes: [photo?.status, photo?.details].filter(Boolean).join(" · ").slice(0, 300),
    };
  } catch { return null; }
}

function enhanceLotTools() {
  const form = document.querySelector("#lot-form");
  if (form) {
    document.querySelector(".inner-hero h1").textContent = t("আলু বাজারে দিন", "Put potatoes on the market");
    form.querySelector(".form-intro h2").textContent = editingLotId ? t("লটের তথ্য বদলান", "Edit lot details") : t("বিক্রির লট তৈরি করুন", "Create a sale lot");
    form.querySelector(".upload-box").insertAdjacentHTML("beforebegin", `<div class="farmer-demo-photo-choice"><div><strong>${t("তৈরি ছবি ব্যবহার করুন", "Use ready photos")}</strong><p>${t("এই ৩টি ছবি ও পূরণ করা তথ্য এক চাপে ব্যবহার করুন। চাইলে নিজের ছবি দিন।", "Use these three photos and filled-in details in one click, or upload your own.")}</p></div><div class="farmer-demo-photo-strip">${demoLotPhotos.map((src, index) => `<img src="${src}" alt="${t(`আলুর ছবি ${index + 1}`, `Potato photo ${index + 1}`)}" />`).join("")}</div><button type="button" class="button button-outline button-small" data-action="use-demo-lot">${t("তৈরি লট বসান", "Use ready lot")}</button><small>${t("এই লটটি শুধু এই ব্রাউজারের ক্রেতার পাতায় দেখা যাবে।", "This lot appears on the buyer page in this browser only.")}</small></div>`);
    form.querySelector(".submit").insertAdjacentHTML("beforebegin", `<button type="button" class="button button-outline farmer-preview-button" data-action="preview-farmer-lot">${t("ক্রেতা যা দেখবেন", "Preview buyer view")}</button><div class="farmer-lot-preview" id="farmer-lot-preview" hidden></div>`);
    form.querySelector(".upload-box strong").textContent = t("৩টি ছবি যোগ করুন", "Add three photos");
    form.querySelector(".upload-box small").textContent = t("ক্রেতারা দেখবেন · প্রতিটি সর্বোচ্চ ২ MB", "Buyers will see these · up to 2 MB each");
    form.elements.photo.multiple = true;
    form.elements.photo.required = !demoPhotoSelection && !editingLotId;
    form.elements.askingPriceMin.required = true;
    form.elements.askingPriceMin.closest("label").firstChild.textContent = t("দর (টাকা/কেজি)", "Price (BDT/kg)");
    form.elements.askingPriceMax.closest("label").firstChild.textContent = t("সর্বোচ্চ দর (ঐচ্ছিক)", "Maximum price (optional)");
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
    const history = farmerHistoryPrefill();
    if (history) {
      if (history.district) form.elements.district.value = history.district;
      if (history.variety) form.elements.variety.value = history.variety;
      if (history.notes) form.elements.notes.value = history.notes;
      form.querySelector(".form-intro").insertAdjacentHTML("afterend", `<p class="history-prefill-note">${t("এক মাসের বেশি পুরোনো খাতা থেকে জানা তথ্য বসানো হয়েছে। পরিমাণ ও প্রস্তুতির তারিখ মিলিয়ে নিন।", "Known details were filled from more than one month of notebook history. Check the quantity and ready date.")}</p>`);
    }
    if (editingLotId) {
      const lot = readLocalLots().find(item => item.id === editingLotId);
      if (lot) {
        for (const key of ["district", "upazila", "variety", "quantityKg", "readyDate", "harvestDate", "askingPriceMin", "askingPriceMax", "sizeDescription", "storageDescription"]) if (form.elements[key]) form.elements[key].value = lot[key] ?? "";
        form.elements.notes.value = lot.conditionDescription || lot.notes || "";
        demoPhotoSelection = !!lot.demoPhotoSelection;
        form.elements.photo.required = false;
      }
    }
    form.classList.toggle("using-demo-photos", demoPhotoSelection);
  }
  if (view === "home") document.querySelectorAll(".lot-card").forEach((card, index) => {
    const lot = visibleListings()[index];
    if (!lot) return;
    card.querySelector(".lot-copy").insertAdjacentHTML("beforeend", `<button class="passport-link" data-action="view-passport" data-id="${h(lot.id)}">${t("আলুর পরিচয়পত্র দেখুন", "View lot passport")} →</button>`);
    if (lot.demoPublished) {
      card.querySelector(".card-topline .small-label").textContent = t("এই ব্রাউজারে রাখা", "SAVED IN THIS BROWSER");
      card.querySelector(".card-topline .status-pill").textContent = lot.published === false ? t("লুকানো", "Hidden") : t("বিক্রির জন্য আছে", "Available");
      card.querySelector(".lot-copy").insertAdjacentHTML("beforeend", `<div class="farmer-lot-actions"><button type="button" class="button button-outline button-small" data-action="edit-demo-lot" data-id="${h(lot.id)}">${t("তথ্য বদলান", "Edit details")}</button><button type="button" class="button button-outline button-small" data-action="toggle-demo-lot" data-id="${h(lot.id)}">${lot.published === false ? t("আবার দেখান", "Show again") : t("তালিকা থেকে লুকান", "Hide listing")}</button></div>`);
    }
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

function setView(next, transportTarget = null) {
  const allowed = role === "farmer" ? farmerViews : buyerViews;
  if (!displayName || !allowed.includes(next)) return;
  buyerLotDialogId = "";
  view = next; reviewOfferId = ""; window.scrollTo({ top: 0, behavior: "smooth" });
  const url = new URL(location.href); url.hash = next === "home" ? "" : next;
  if (role === "buyer") {
    for (const key of ["transportLot", "transportPurchase", "transportKg"]) url.searchParams.delete(key);
    if (next === "transport" && transportTarget?.lotId) { url.searchParams.set("transportLot", transportTarget.lotId); url.searchParams.set("transportKg", String(transportTarget.quantityKg)); }
    if (next === "transport" && transportTarget?.purchaseId) url.searchParams.set("transportPurchase", transportTarget.purchaseId);
  }
  history.replaceState(null, "", url);
  render();
  if (role === "farmer" && (next === "responses" || (next === "list" && !editingLotId))) loadSharedMarketplace();
}

function requireMarketplaceSignIn() {
  const next = `${location.pathname}${location.search}${location.hash}`;
  location.assign(`/auth?next=${encodeURIComponent(next)}`);
}

function mapPurchase(purchase, offers, lots, pickups, payments, expenses) {
  const offer = offers.find(item => item.id === purchase.offer_id) || {
    id: purchase.offer_id, lotId: purchase.lot_id, quantityKg: Number(purchase.agreed_quantity_kg), priceKg: Number(purchase.price_kg) / (Number(purchase.price_unit_kg) || 1), quotedPrice: Number(purchase.price_kg),
    priceUnit: purchase.price_unit || "kg", priceUnitKg: Number(purchase.price_unit_kg) || 1, paymentMethod: "cash", paymentDays: 0,
    buyer: "", buyerCosts: {}, acceptedPercent: 100, transport: 0, handling: 0, fee: 0, terms: "",
  };
  const lot = lots.find(item => item.id === purchase.lot_id);
  const purchasePickups = pickups.filter(row => row.purchase_id === purchase.id).map(row => ({ ...row, pickupDate: row.pickup_date, grossKg: Number(row.gross_kg), tareKg: Number(row.tare_kg), netKg: Number(row.net_kg), acceptedKg: Number(row.accepted_kg), deductionKg: Number(row.deduction_kg) }));
  const purchasePayments = payments.filter(row => row.purchase_id === purchase.id).map(row => ({ ...row, reportedBy: row.reported_by, reportedAt: row.created_at, reference: row.reference || "", confirmedAt: row.confirmed_at }));
  const openPickup = purchasePickups.find(row => row.status === "pending");
  const openPayment = purchasePayments.find(row => row.status === "reported" && row.reported_by === purchase.buyer_id);
  let status = purchase.stage === "received" || purchase.stage === "settled" ? "collected" : purchase.stage;
  if (openPickup) status = "pickup_pending";
  else if (openPayment) status = "payment_pending";
  else if (purchase.stage === "settled") status = "paid";
  return {
    ...purchase, id: purchase.id, lotId: purchase.lot_id, variety: lot?.variety || offer.variety || "Potato",
    quantityKg: Number(purchase.agreed_quantity_kg), status, agreedTotal: purchase.agreed_total == null ? null : Number(purchase.agreed_total),
    actualAcceptedKg: Number(purchase.accepted_kg) || 0, offer,
    pickups: purchasePickups, paymentReports: purchasePayments,
    expenses: expenses.filter(row => row.purchase_id === purchase.id),
    createdAt: purchase.created_at, pickupDate: offer.pickupDate || "",
  };
}

async function loadSharedMarketplace() {
  if (role === "choose" || (role === "farmer" && !["responses", "list", "home"].includes(view))) return;
  sharedLoading = true;
  try {
    const lots = await marketplaceRequest("/lots");
    const publishedLots = (lots || []).map(toMarketplaceLot);
    const localLots = readLocalLots();
    const fallbackSamples = role === "buyer" && !publishedLots.length ? initialData().listings : [];
    data.listings = [...publishedLots, ...localLots.filter(lot => (role === "farmer" || lot.published !== false) && !publishedLots.some(item => item.id === lot.id)), ...fallbackSamples];
    try {
      const mine = await marketplaceRequest("/me");
      sharedUserId = mine.user?.id || "";
      sharedProfile = Array.isArray(mine.profile) ? mine.profile[0] || {} : mine.profile || {};
      const ownLots = (mine.lots || []).map(toMarketplaceLot);
      data.listings = [...ownLots, ...data.listings.filter(lot => !ownLots.some(own => own.id === lot.id))];
      data.offers = (mine.offers || []).map(toMarketplaceOffer);
      data.buyingRequests = (mine.requests || []).map(toMarketplaceRequest);
      if (role === "farmer" && view === "responses") {
        const openRequests = await marketplaceRequest("/requests");
        data.buyingRequests = [...data.buyingRequests, ...(openRequests || []).map(toMarketplaceRequest).filter(item => !data.buyingRequests.some(own => own.id === item.id))];
      }
      data.deals = (mine.purchases || []).map(purchase => mapPurchase(purchase, data.offers, data.listings, mine.pickups || [], mine.payments || [], mine.expenses || []));
    } catch (error) {
      if (error.status === 401) { sharedUserId = ""; sharedProfile = {}; data.offers = []; data.deals = []; }
      else if (role === "farmer" && view === "responses") throw error;
    }
    try { catalogueRequests = await marketplaceRequest("/catalogue-requests"); }
    catch (error) { if (error.status === 401) catalogueRequests = []; else throw error; }
  } catch (error) {
    if (role !== "buyer" || !data.listings.some(lot => lot.sample)) notice = error.message;
  } finally {
    sharedLoading = false;
    render();
  }
}
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
function purposeLabel(value) { return ({ table: t("খাওয়ার", "Food"), seed: t("বীজ", "Seed"), processing: t("প্রক্রিয়াজাত", "Processing") })[value] || t("লেখা নেই", "Not recorded"); }
function lotNotes(lot) { return lot.sample && language === "bn" ? "হিমাগারে রাখা আলু; মাঝারি ও বড় আকারের মিশ্রণ।" : lot.notes; }
function photoOrArtwork(lot, className = "lot-photo") {
  const photo = photoSrc(lot.photo);
  return photo ? `<img class="${className}" src="${photo}" alt="${h(t(`${lotVariety(lot)} আলুর লট`, `${lot.variety} potato lot`))}" />` : `<div class="${className} lot-art" aria-hidden="true"><span class="art-leaf leaf-a"></span><span class="art-leaf leaf-b"></span><span class="art-potato potato-a"></span><span class="art-potato potato-b"></span><span class="art-potato potato-c"></span></div>`;
}

function renderBuyerLotGallery(lot) {
  const photos = [...new Set([lot.photo, ...(Array.isArray(lot.photos) ? lot.photos.map(photo => typeof photo === "string" ? photo : photo?.src) : [])].map(photoSrc).filter(Boolean))].slice(0, 3);
  if (!photos.length) return `<div class="buyer-detail-gallery">${photoOrArtwork(lot, "buyer-detail-hero-image")}</div>`;
  const alt = h(t(`${lotVariety(lot)} আলুর লট`, `${lot.variety} potato lot`));
  return `<div class="buyer-detail-gallery" data-gallery data-photo-index="0">${photos.map((photo, index) => `<img class="buyer-detail-hero-image" src="${photo}" data-gallery-slide ${index ? "hidden" : ""} alt="${alt} · ${t(`ছবি ${formatter.format(index + 1)}`, `Photo ${index + 1}`)}" />`).join("")}${photos.length > 1 ? `<button class="buyer-detail-slider-control buyer-detail-slider-previous" type="button" data-action="step-lot-photo" data-direction="-1" aria-label="${t("আগের ছবি", "Previous photo")}">‹</button><button class="buyer-detail-slider-control buyer-detail-slider-next" type="button" data-action="step-lot-photo" data-direction="1" aria-label="${t("পরের ছবি", "Next photo")}">›</button><span class="buyer-detail-photo-count" aria-live="polite">${formatter.format(1)} / ${formatter.format(photos.length)}</span>` : ""}</div>`;
}

function marketUrl(key) {
  const page = role === "farmer" ? "./farmer.html" : "./buyer.html";
  return key === "home" ? page : `${page}#${encodeURIComponent(key)}`;
}
function navButton(label, key, symbol) {
  const attrs = `class="nav-link ${view === key ? "active" : ""}" data-view="${key}" aria-current="${view === key ? "page" : "false"}`;
  if (role === "farmer") return `<button ${attrs}">${icon(symbol, 18)}<span>${label}</span></button>`;
  return `<a ${attrs}" href="${marketUrl(key)}">${icon(symbol, 18)}<span>${label}</span></a>`;
}

function renderShell(content) {
  const farmerNav = [["/farmer", t("আজকের কাজ", "Today"), "leaf"], ["/farmer#photos", t("ছবি", "Photos"), "bag"], ["/selling-preparation", t("বিক্রির আগে", "Before selling"), "truck"], ["/farmer#diary", t("খাতা", "Notebook"), "clock"]].map(([href, label, symbol]) => `<a class="nav-link ${href === "/selling-preparation" ? "active" : ""}" href="${href}" ${href === "/selling-preparation" ? 'aria-current="page"' : ""}>${icon(symbol, 18)}<span>${label}</span></a>`).join("");
  const buyerNav = [navButton(t("আলুর তালিকা", "Lots"), "home", "bag"), navButton(t("আমার কেনাকাটা", "My purchases"), "purchases", "shield"), navButton(t("পরিবহন", "Transport"), "transport", "truck"), navButton(t("খাতা", "Notebook"), "notebook", "clock"), navButton(t("লাভ ও সংগ্রহ", "Profit & pickup"), "buyer-plan", "scale")].join("");
  app.innerHTML = `
    <div class="site-wrap ${role}-portal">
      <header class="topbar">
        ${farmerPreview ? `<a class="brand" href="/farmer#market"><span class="brand-mark">${icon("leaf", 23)}</span><span><strong>আলুসাথী<span class="brand-dot">.</span></strong><small>${t("আমার লটের প্রদর্শন", "My listing preview")}</small></span></a>` : `<button class="brand" data-view="home" aria-label="AluSathi marketplace home"><span class="brand-mark">${icon("leaf", 23)}</span><span><strong>আলুসাথী<span class="brand-dot">.</span></strong><small>${role === "farmer" ? t("কৃষকের পাতা", "Farmer page") : t("ক্রেতার পাতা", "Buyer page")}</small></span></button>`}
        <nav class="desktop-nav" aria-label="${t("প্রধান মেনু", "Main navigation")}">${farmerPreview ? `<a class="nav-link" href="/farmer#market">${icon("arrow", 18)}<span>${t("বাজারে দিন", "Farmer listings")}</span></a>` : role === "farmer" ? farmerNav : buyerNav}</nav>
         <div class="header-actions">${farmerPreview ? "" : `<button class="profile-trigger" data-action="toggle-profile" aria-expanded="${profileOpen}" aria-label="${t("প্রোফাইল ও অনুরোধ", "Profile and requests")}"><span class="profile-avatar">${h((sharedProfile.contact_name || sharedProfile.business_name || (role === "farmer" ? "F" : "B")).trim().slice(0, 1))}</span><span>${h(sharedProfile.business_name || sharedProfile.contact_name || t("প্রোফাইল", "Profile"))}</span>${catalogueRequests.filter(item => item.awaiting_user_id === sharedUserId && !item.is_read).length ? `<b class="profile-count">${formatter.format(catalogueRequests.filter(item => item.awaiting_user_id === sharedUserId && !item.is_read).length)}</b>` : ""}</button>`}<button class="language-btn" data-action="language" aria-label="Change language">${language === "bn" ? "EN" : "বাংলা"}</button>${farmerPreview ? "" : `<button class="mode-button" data-action="logout">${icon("arrow", 15)}${role === "farmer" ? t("মূল পাতায় ফিরুন", "Main page") : t("বের হন", "Sign out")}</button>`}</div>
      </header>
      ${notice ? `<div class="notice" role="status">${h(notice)}<button data-action="dismiss" aria-label="Dismiss">×</button></div>` : ""}
      <main id="main">${role === "farmer" ? `<div class="page-shell farmer-market-tools"><a href="/selling-preparation">← ${t("বিক্রির আগে", "Before selling")}</a><details><summary>${t("বিক্রির আরও সরঞ্জাম", "More selling tools")}</summary><div>${[navButton(t("আমার আলু", "My potatoes"), "home", "bag"), navButton(t("আলু যোগ করুন", "Add potatoes"), "list", "bag"), navButton(t("দর", "Offers"), "offers", "scale"), navButton(t("ক্রেতার দর ও উত্তর", "Buyer offers and responses"), "responses", "shield"), navButton(t("গাড়ি", "Transport"), "transport", "truck"), navButton(t("রাখা নথি", "Records"), "deals", "shield")].join("")}</div></details><button class="sample-switch" data-action="toggle-samples" aria-pressed="${showSamples}">${showSamples ? t("অতিরিক্ত লট লুকান", "Hide more lots") : t("আরও লট দেখুন", "Show more lots")}</button></div>` : ""}${content}</main>
      <footer class="footer"><div><strong>আলুসাথী বাজার</strong><p>${t("কৃষকের সিদ্ধান্ত, পরিষ্কার হিসাব।", "Your crop. Clear choices.")}</p></div><div><span>${t("খসড়া এই ব্রাউজারে থাকে", "Drafts stay in this browser")}</span><a class="main-return" href="${farmerPreview ? "/farmer#market" : role === "farmer" ? "/farmer" : "/"}">${t("মূল অ্যাপে ফিরুন", "Back to AluSathi")}</a>${farmerPreview ? "" : `<button data-action="reset">${t("আবার শুরু করুন", "Start over")}</button>`}</div></footer>
      <nav class="mobile-nav" aria-label="${t("মোবাইল মেনু", "Mobile navigation")}">${farmerPreview ? `<a class="nav-link" href="/farmer#market">${t("বাজারে দিন", "Farmer listings")}</a>` : role === "farmer" ? farmerNav : buyerNav}</nav>
       ${reviewOfferId ? renderReview() : ""}${profileOpen ? renderProfileDrawer() : ""}${role === "buyer" && buyerLotDialogId ? renderBuyerLotDialog() : ""}
    </div>`;
  document.documentElement.lang = language;
}

function renderBuyerLotDialog() {
  const lot = data.listings.find(item => item.id === buyerLotDialogId);
  if (!lot) return "";
  const offerOnly = buyerLotDialogMode === "offer";
  const title = offerOnly ? t("দর দিন", "Make offer") : t("লটের বিস্তারিত", "Lot details");
  const content = offerOnly ? `<header class="buyer-offer-dialog-heading"><h2>${h(lotVariety(lot))}</h2><p>${h(lot.upazila || "")}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p></header>${renderBuyerPurchasePanel(lot)}` : renderBuyerLotDetail(lot, true);
  return `<div class="modal-backdrop buyer-detail-dialog-backdrop" data-action="close-buyer-detail"><section class="buyer-detail-dialog ${offerOnly ? "buyer-offer-dialog" : "buyer-info-dialog"}" role="dialog" aria-modal="true" aria-label="${h(title)}"><button type="button" class="modal-close buyer-detail-close" data-action="close-buyer-detail" aria-label="${t("বন্ধ করুন", "Close")}">×</button><div class="buyer-detail-dialog-scroll">${content}</div></section></div>`;
}

function renderHero() {
  return `<section class="hero page-shell"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-line"></span>${t("বাংলাদেশের আলুর বাজার", "Bangladesh potato market")}</p><h1>${t("সঠিক দরে", "Sell your potatoes")}<br><em>${t("আলু বিক্রি করুন।", "with a clear price.")}</em></h1><p class="hero-lead">${t("আলুর তথ্য দিন। দর মিলিয়ে দেখুন। তারপর ক্রেতা বেছে নিন।", "Add your crop. Compare offers. Then choose a buyer.")}</p><div class="hero-actions"><button class="button button-gold" data-view="list">${icon("plus", 19)}${t("আলুর তথ্য দিন", "Add my potatoes")}</button></div></div><div class="hero-visual" role="img" aria-label="${t("আলুর ক্ষেতে একজন কৃষক", "A farmer in a potato field")}"></div></section>`;
}

function renderLotCard(lot) {
  const remaining = availableKg(lot, data.deals);
  const offerCount = data.offers.filter(offer => offer.lotId === lot.id).length;
  return `<article class="lot-card">${photoOrArtwork(lot)}<div class="lot-copy"><div class="card-topline"><span class="small-label">${t("আলুর লট", "POTATO LOT")}</span><span class="status-pill">${remaining ? t("বিক্রির জন্য আছে", "Available") : t("সবটা চুক্তিতে", "Committed")}</span></div><h3>${h(lotVariety(lot) || t("আলু", "Potatoes"))} <span>· ${kg(lot.quantityKg)}</span></h3><p>${icon("pin", 16)}${h(language === "bn" && lot.sample ? "পীরগঞ্জ" : lot.upazila)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} <span class="meta-dot">•</span> ${prettyDate(lot.readyDate)}</p><div class="lot-card-bottom"><span>${icon("bag", 16)} ${kg(remaining)} ${t("বাকি", "remaining")}</span><button class="text-arrow" data-action="select-lot" data-id="${h(lot.id)}">${formatter.format(offerCount)} ${t("টি দর দেখুন", "offers")}${icon("arrow", 16)}</button></div></div></article>`;
}

function renderFarmerHome() {
  const exampleOnly = visibleListings().length > 0 && visibleListings().every(lot => lot.sample);
  return `${renderHero()}<section class="section page-shell"><div class="section-header"><div><p class="section-kicker">${t("আপনার তালিকা", "YOUR LISTINGS")}</p><h2>${t("আলুর তালিকা", "Potato lots")}</h2><p>${exampleOnly ? t("নিচের আলুর তথ্য দেখুন। নিজের আলুর তথ্যও যোগ করতে পারেন।", "Explore the listed lots, or add your own potatoes.") : t("আপনার আলুতে চাপ দিয়ে তার দর দেখুন।", "Tap your lot to see its offers.")}</p></div><button class="button button-outline" data-view="list">${icon("plus", 18)}${exampleOnly ? t("আমার আলুর তথ্য দিন", "Add my potatoes") : t("আরও আলু যোগ", "Add another lot")}</button></div><div class="lot-grid">${visibleListings().length ? visibleListings().map(renderLotCard).join("") : `<div class="empty-state">${t("এখনো আলুর তথ্য নেই।", "No lots yet.")}</div>`}</div></section><section class="choice-strip page-shell"><div class="choice-title"><p class="section-kicker">${t("এখন কী করবেন?", "WHAT NEXT?")}</p><h2>${t("দর দেখুন, নাকি কিছুদিন রাখুন?", "Compare offers or wait?")}</h2></div><button class="choice-card" data-view="offers"><span class="choice-icon gold">${icon("scale", 26)}</span><strong>${t("দর তুলনা", "Compare offers")}</strong><small>${t("কত টাকা হাতে পাবেন দেখুন", "See estimated money in hand")}</small>${icon("arrow", 18)}</button><button class="choice-card" data-view="storage"><span class="choice-icon green">${icon("warehouse", 26)}</span><strong>${t("হিমাগারে ফোন করুন", "Call a cold store")}</strong><small>${t("নম্বর ও যোগাযোগের তথ্য দেখুন", "See contacts and call directly")}</small>${icon("arrow", 18)}</button></section>`;
}

function renderListForm() {
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ধাপ ১ / আলুর তথ্য", "STEP 1 / YOUR POTATOES")}</p><h1>${t("কত আলু বিক্রি করবেন?", "What do you have to sell?")}</h1><p>${t("তথ্য দিলে লটটি ক্রেতাদের তালিকায় প্রকাশিত হবে।", "Publishing makes this lot visible to buyers.")}</p></div><div class="inner-hero-mark">${icon("bag", 52)}</div></section><section class="form-layout page-shell lot-form-centered"><form id="lot-form" class="panel form-panel"><div class="form-intro"><span class="step-circle">1</span><div><h2>${t("আমার আলু", "My potato lot")}</h2><p>${t("ঠিকানা নয়—শুধু উপজেলা দেখানো হবে।", "Only your upazila is shown, not your exact address.")}</p></div></div><fieldset class="form-section"><legend>${t("কোথায়?", "Where?")}</legend><div class="form-grid"><label>${t("জেলা", "District")}<select name="district" required>${districtOptions()}</select></label><label>${t("উপজেলা", "Upazila")}<input name="upazila" required minlength="2" maxlength="60" placeholder="${t("যেমন: পীরগঞ্জ", "e.g. Pirganj")}" /></label></div></fieldset><fieldset class="form-section"><legend>${t("কী আলু, কতটা?", "What potatoes and how much?")}</legend><div class="form-grid"><label>${t("আলুর জাত", "Potato variety")}<select name="variety"><option value="">${t("জাত বেছে নিন", "Choose a variety")}</option>${varieties.map(([value, bn]) => `<option value="${value}">${h(t(bn, value))}</option>`).join("")}</select></label><label>${t("মোট পরিমাণ (কেজি)", "Quantity (kg)")}<input name="quantityKg" required type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="2000" /></label><label>${t("কবে বিক্রির জন্য প্রস্তুত?", "Ready date")}<input name="readyDate" required type="date" min="${todayPlus(0)}" value="${todayPlus(14)}" /></label><label>${t("তোলার তারিখ", "Harvest date")}<input name="harvestDate" type="date" max="${todayPlus(0)}" /></label><label>${t("সাধারণ চাওয়া দর সর্বনিম্ন (টাকা/কেজি)", "Typical asking price · minimum (BDT/kg)")}<input name="askingPriceMin" type="number" min="0" max="100000" step="0.01" inputmode="decimal" /></label><label>${t("সর্বোচ্চ (টাকা/কেজি)", "Maximum (BDT/kg)")}<input name="askingPriceMax" type="number" min="0" max="100000" step="0.01" inputmode="decimal" /></label><label>${t("আকার", "Size")}<input name="sizeDescription" maxlength="120" /></label></div><div class="lot-notes"><div class="notes-heading"><label for="lot-notes">${t("আলুর অবস্থা সম্পর্কে বলুন", "Condition")}</label><button type="button" class="button button-outline button-small" data-action="dictate-notes" aria-pressed="false">${t("বলুন", "Speak")}</button></div><textarea id="lot-notes" name="notes" rows="2" maxlength="300" placeholder="${t("যেমন: পরিষ্কার, শুকনো, পচা আলু নেই", "e.g. Clean and dry; no rot")}"></textarea><small class="notes-status" role="status">${t("বলতে চাপলে ফোনের ভয়েস সেবা মাইক্রোফোন ব্যবহার করবে। চাইলে লিখুন।", "Speak uses your phone’s voice service and microphone. You can also type.")}</small></div><label>${t("সংরক্ষণের বিবরণ", "Storage") }<textarea name="storageDescription" maxlength="200" rows="2" placeholder="${t("যেমন: শুকনো ঘরে রাখা", "e.g. Stored in a dry room")}"></textarea></label><label class="upload-box">${icon("plus", 21)}<span><strong>${t("একটি ছবি যোগ করুন", "Add one photo")}</strong><small>${t("ঐচ্ছিক · ক্রেতাদের কাছে প্রকাশিত হবে না", "Optional · remains private on this device")}</small></span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label></fieldset><div class="lot-save-actions"><button class="button button-outline submit" type="submit" name="afterSave" value="back">${t("সংরক্ষণ করে ফিরে যান", "Save and go back")}</button><button class="button button-green submit" type="submit" name="afterSave" value="market">${t("সংরক্ষণ করে বাজারে দিন", "Save and go to Sell Potatoes")}${icon("arrow", 18)}</button></div></form></section>`;
}

function renderOfferCard(offer, lot) {
  const remaining = availableKg(lot, data.deals);
  const result = estimateOffer(offer, Math.min(offer.quantityKg, remaining));
  const unsold = Math.max(0, remaining - result.acceptedKg);
  const expired = offer.expires < todayPlus(0);
  const names = { "sample-local": t("এলাকার ব্যবসায়ী", "Local trader"), "sample-remote": t("অন্য জেলার পাইকার", "District wholesaler"), "sample-partial": t("আলুর কারখানা", "Potato processor") };
  const perKg = result.acceptedKg ? result.net / result.acceptedKg : 0;
  const buyerCost = buyerCostSummary(offer, lot);
  const buyerView = role === "buyer";
  return `<article class="offer-card simple-offer">
    <div class="offer-top"><div><span class="small-label">${offer.sample ? t("দরের ঝলক", "OFFER PREVIEW") : t("ক্রেতার দর", "BUYER OFFER")}</span><h3>${h(offer.sample && names[offer.id] ? names[offer.id] : offer.buyer)}</h3><p>${icon("pin", 15)}${h(language === "bn" ? districtNamesBn[offer.district] || offer.district : offer.district)}</p></div><span class="price-badge">${rate(offer.priceKg)}<small>/${t("কেজি", "kg")}</small></span></div>
    <div class="take-home"><span>${buyerView ? t("ক্রেতার আনুমানিক মোট খরচ", "Estimated buyer cost") : t("সব খরচ বাদে পাবেন", "You receive after costs")}</span><strong>${buyerView ? (buyerCost.total == null ? t("অসম্পূর্ণ", "Incomplete") : money(buyerCost.total)) : money(result.net)}</strong><small>${buyerView ? `${t("গ্রহণ করা", "Accepted")}: ${kg(buyerCost.acceptedKg)} · ${buyerCost.deliveredPerKg == null ? t("সব খরচ জানা নেই", "Some costs are unknown") : `${t("গ্রহণ করা প্রতি কেজির খরচ", "Delivered cost per accepted kg")}: ${rate(buyerCost.deliveredPerKg)}`}` : `${t("বিক্রি হওয়া প্রতি কেজিতে হাতে", "Net per kg actually sold")}: ${rate(perKg)} · ${t("বিক্রি না হওয়া", "Still unsold")}: ${kg(unsold)}`}</small><small>${t("আনুমানিক হিসাব, নিশ্চিত টাকা নয়", "Estimate, not guaranteed payment")}</small></div>
    <div class="offer-quickfacts"><span>${t("আলু নেবেন", "Will buy")}: <strong>${kg(result.acceptedKg)}</strong></span><span>${t("টাকা দেবেন", "Will pay")}: <strong>${offer.paymentDays === 0 ? t("আলু নেওয়ার দিন", "On pickup day") : `${formatter.format(offer.paymentDays)} ${t("দিনের মধ্যে", "days after pickup")}`}</strong></span><span><strong>${offer.pickup === "buyer" ? t("আপনার কাছ থেকে আলু নিয়ে যাবেন", "Buyer collects from you") : t("আপনাকে আলু পৌঁছে দিতে হবে", "You deliver the potatoes")}</strong></span></div>
    ${unsold > 0 ? `<p class="offer-leftover">${kg(unsold)} ${t("আলু থেকে যাবে। সেটুকুর জন্য আরেকজন ক্রেতা লাগবে।", "will remain. You need another buyer for it.")}</p>` : ""}
    <details class="offer-details"><summary>${buyerView ? t("ক্রেতার খরচ ও শর্ত", "Buyer cost and terms") : t("খরচ ও শর্ত", "Costs and terms")}</summary><div class="offer-breakdown">${buyerView ? `<div><span>${t("আলুর মূল্য", "Potato value")}</span><strong>${money(buyerCost.acceptedKg * offer.priceKg)}</strong></div>${Object.entries(buyerCost.costs.lines).map(([key, value]) => `<div><span>${key === "loadingSacks" ? t("লোড / বস্তা", "Loading / sacks") : key === "marketFees" ? t("বাজার ফি", "Market fees") : key === "taxes" ? t("কর", "Taxes") : key === "other" ? t("অন্যান্য", "Other") : t("পরিবহন", "Transport")}</span><strong>${value == null ? t("জানা নেই", "Unknown") : `+ ${money(value)}`}</strong></div>`).join("")}<div><span>${t("মোট ক্রেতার খরচ", "Total buyer cost")}</span><strong>${buyerCost.total == null ? t("অসম্পূর্ণ", "Incomplete") : money(buyerCost.total)}</strong></div>` : `<div><span>${t("আলু বিক্রির টাকা", "Sale amount")}</span><strong>${money(result.gross)}</strong></div><div><span>${t("ক্রেতার আলাদা খরচ", "Buyer-paid costs")}</span><strong>${offer.buyerCosts ? (buyerCost.total == null ? t("জানা নেই", "Unknown") : money(buyerCost.total - buyerCost.acceptedKg * offer.priceKg)) : t("পুরনো দর: আলাদা তথ্য নেই", "Legacy offer: not recorded")}</strong></div><div><span>${t("আপনার হাতে থাকবে", "You keep")}</span><strong>${money(result.net)}</strong></div>`}</div><p class="offer-terms">${h(offerTerms(offer, language))}</p>${offer.contact && /^(?:\+?88)?01[3-9]\d{8}$/.test(offer.contact.contactPhone) ? `<p class="offer-terms">${t("যোগাযোগ", "Contact")}: ${h(offer.contact.contactPerson)} · <a href="tel:${h(offer.contact.contactPhone)}">${h(offer.contact.contactPhone)}</a><br>${h(offer.contact.buyerUpazila)}, ${h(offer.district)} · ${h(offer.contact.buyerAddress)}</p>` : ""}${summaryBlock(offer, result.offeredKg)}<small>${t("দরটি থাকবে", "Offer valid until")} ${prettyDate(offer.expires)}</small></details>
    <div class="offer-bottom">${role === "farmer" ? `<button class="button button-green" data-action="review-offer" data-id="${h(offer.id)}" ${expired || remaining <= 0 || result.net <= 0 ? "disabled" : ""}>${expired ? t("দরের সময় শেষ", "Offer expired") : t("এই ক্রেতাকে বেছে নিন", "Choose this buyer")}${icon("arrow", 16)}</button>` : offer.sample ? `<button class="button button-outline button-small" data-action="offer-lot" data-id="${h(lot.id)}">${t("এই ধরনের দর লিখুন", "Edit this scenario")}${icon("arrow", 15)}</button>` : `<span>${t("আপনার রাখা দর", "Your saved offer")}</span>`}</div>
  </article>`;
}

function renderOffers() {
  const lot = selectedLot();
  const matching = lot ? visibleOffers().filter(offer => offer.lotId === lot.id) : [];
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ধাপ ২ / দর তুলনা", "STEP 2 / COMPARE OFFERS")}</p><h1>${t("দর নয়, হাতে কত?", "Look beyond the price.")}</h1><p>${t("বেশি দর মানেই বেশি লাভ নয়। খরচ বাদে হাতে কত থাকবে, তা দেখুন।", "A higher price may leave less money. Compare what remains after costs.")}</p></div><div class="inner-hero-mark">${icon("scale", 52)}</div></section><section class="section page-shell">${lot ? `<div class="section-header offer-header"><div><p class="section-kicker">${t("আপনার কোন আলু", "YOUR POTATOES")}</p><h2>${h(lotVariety(lot))} · ${kg(availableKg(lot, data.deals))} ${t("বাকি", "available")}</h2><p>${h(language === "bn" && lot.sample ? "পীরগঞ্জ" : lot.upazila)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} · ${prettyDate(lot.readyDate)}</p></div><select id="lot-switch" aria-label="${t("আলুর তালিকা বাছুন", "Select potato lot")}">${visibleListings().map(item => `<option value="${h(item.id)}" ${item.id === lot.id ? "selected" : ""}>${h(lotVariety(item))} · ${h(language === "bn" ? districtNamesBn[item.district] || item.district : item.district)} · ${kg(item.quantityKg)}</option>`).join("")}</select></div><div class="offer-grid">${matching.length ? matching.map(offer => renderOfferCard(offer, lot)).join("") : `<div class="empty-state"><h3>${t("এখনো কোনো দর নেই", "No offers yet")}</h3><p>${t("ক্রেতার পাতায় গিয়ে এই আলুর জন্য দর লিখতে পারেন।", "Go to the buyer page to make an offer for this lot.")}</p></div>`}</div>` : `<div class="empty-state"><h3>${t("আগে আলুর তথ্য দিন", "List a lot first")}</h3><button class="button button-green" data-view="list">${t("আলু যোগ করুন", "Add potatoes")}</button></div>`}<p class="section-footnote">${t("আংশিক দর হলে বাকি আলুর জন্যও ক্রেতা লাগবে। এই হিসাব আনুমানিক—চুক্তির আগে শর্ত মিলিয়ে নিন।", "A partial offer leaves some potatoes unsold. These are estimates—check the terms before agreeing.")}</p></section>`;
}

function renderBuyerHome() {
  if (sharedLoading && !data.listings.length) return `<section class="buyer-workspace page-shell"><div class="empty-state" role="status">${t("আলুর তালিকা আনা হচ্ছে…", "Loading published lots…")}</div></section>`;
  const today = todayPlus(0);
  const upcoming = data.deals.filter(deal => !deal.sample && ["agreed", "pickup_pending"].includes(deal.status) && (!deal.pickupDate || deal.pickupDate >= today));
  const due = data.deals.filter(deal => !deal.sample && ["collected", "payment_pending"].includes(deal.status) && potatoPaymentDue(deal) > confirmedPayments(deal));
  const saved = new Set(buyerCatalogue.savedLotIds);
  let matchedLots = data.listings.filter(lot => lotMatchesBrief(lot));
  if (buyerCatalogue.tab === "ready") matchedLots = matchedLots.filter(lot => buyerReadiness(lot) === "ready");
  if (buyerCatalogue.tab === "later") matchedLots = matchedLots.filter(lot => buyerReadiness(lot) === "later");
  if (buyerCatalogue.tab === "saved") matchedLots = matchedLots.filter(lot => saved.has(lot.id));
  matchedLots.sort((a, b) => buyerBrief.sort === "quantity" ? availableKg(b, data.deals) - availableKg(a, data.deals) : buyerBrief.sort === "recent" ? String(b.createdAt || "").localeCompare(String(a.createdAt || "")) : String(a.readyDate || "").localeCompare(String(b.readyDate || "")));
  if (buyerCatalogue.tab === "all") {
    const featuredIds = new Set(initialData().listings.map(lot => lot.id));
    matchedLots = [...matchedLots.filter(lot => featuredIds.has(lot.id)), ...matchedLots.filter(lot => !featuredIds.has(lot.id))];
  }
  const pageCount = Math.ceil(matchedLots.length / 6);
  buyerPage = Math.min(buyerPage, pageCount || 1);
  const pageLots = matchedLots.slice((buyerPage - 1) * 6, buyerPage * 6);
  const activity = [buyerLotRequests.length ? ["purchases", buyerLotRequests.length, t("সংরক্ষিত প্রস্তাব", "Saved lot requests")] : null, upcoming.length ? ["purchases", upcoming.length, t("আসন্ন সংগ্রহ", "Upcoming collection")] : null, due.length ? ["purchases", due.length, t("পেমেন্ট বাকি", "Payment due")] : null].filter(Boolean);
  const tab = (key, bn, en) => `<button type="button" class="${buyerCatalogue.tab === key ? "active" : ""}" data-action="buyer-catalogue-tab" data-tab="${key}" aria-pressed="${buyerCatalogue.tab === key}">${t(bn, en)}</button>`;
   return `<div class="buyer-home-layout"><div class="buyer-market-banner"><iframe src="/marketplace/banners/buyer-market-living-v1/banner.html" title="${t("আলুর বাজারে মান যাচাই করছেন এক ক্রেতা", "A buyer checking potatoes at a market")}" loading="eager"></iframe></div>
  <section class="buyer-workspace page-shell"><header class="buyer-title buyer-catalogue-title"><div><p class="section-kicker">${t("আলুর তালিকা", "POTATO LOTS")}</p><h1>${t("কৃষকের কাছ থেকে সরাসরি আলু কিনুন", "Buy potatoes directly from farmers")}</h1><p>${t("আলু দেখুন, পছন্দের লট বেছে কৃষকের সঙ্গে যোগাযোগ করুন।", "Browse potatoes, choose a lot, and contact the farmer.")}</p></div></header>
  ${activity.length ? `<nav class="buyer-activity-strip" aria-label="${t("করণীয়", "Tasks")}">${activity.map(([destination, count, label]) => `<a href="${marketUrl(destination)}" data-view="${destination}"><strong>${formatter.format(count)}</strong><span>${label}</span>${icon("arrow", 17)}</a>`).join("")}</nav>` : ""}
  <section class="buyer-brief panel"><form id="buyer-brief-form" class="brief-grid"><label>${t("District", "District")}<select name="district"><option value="">${t("যেকোনো জেলা", "Any district")}</option>${districts.map(d => `<option value="${h(d)}" ${buyerBrief.district === d ? "selected" : ""}>${h(language === "bn" ? districtNamesBn[d] || d : d)}</option>`).join("")}</select></label><label>${t("জাত", "Variety")}<select name="variety"><option value="">${t("যেকোনো জাত", "Any variety")}</option>${varieties.map(([value,bn]) => `<option value="${h(value)}" ${buyerBrief.variety === value ? "selected" : ""}>${h(t(bn,value))}</option>`).join("")}</select></label><label>${t("প্রয়োজন (কেজি)", "Quantity needed (kg)")}<input name="quantityKg" type="number" min="0" max="100000" step="1" value="${h(buyerBrief.quantityKg)}" placeholder="${t("পরিমাণ লিখুন", "Enter quantity")}" /></label><button class="button button-green brief-submit" type="submit">${t("খুঁজুন", "Search")}</button><details class="buyer-more-filter"><summary>${t("আরও বাছাই", "More filters")}</summary><div><label>${t("ব্যবহার", "Purpose")}<select name="purpose"><option value="" ${!buyerBrief.purpose ? "selected" : ""}>${t("সব", "All")}</option><option value="table" ${buyerBrief.purpose === "table" ? "selected" : ""}>${t("খাওয়ার", "Food")}</option><option value="seed" ${buyerBrief.purpose === "seed" ? "selected" : ""}>${t("বীজ", "Seed")}</option><option value="processing" ${buyerBrief.purpose === "processing" ? "selected" : ""}>${t("প্রক্রিয়াজাত", "Processing")}</option></select></label><label>${t("প্রস্তুত হওয়ার মধ্যে", "Ready by")}<input name="readyDate" type="date" value="${h(buyerBrief.readyDate)}" /></label></div></details></form>${renderBuyerFilterChips()}</section>
  <div class="buyer-catalogue-controls"><div class="buyer-tabs" role="group" aria-label="${t("লটের ধরন", "Lot availability")}">${tab("all", "সব লট", "All lots")}${tab("ready", "এখন প্রস্তুত", "Ready now")}${tab("later", "পরে প্রস্তুত হবে", "Ready later")}${tab("saved", "পছন্দের লট", "Saved")}</div><div class="buyer-sort"><span>${formatter.format(matchedLots.length)} ${t("টি লট", "lots")}</span><label>${t("সাজান", "Sort")}<select id="buyer-sort"><option value="recent" ${buyerBrief.sort === "recent" ? "selected" : ""}>${t("সর্বশেষ যোগ", "Recently added")}</option><option value="ready" ${buyerBrief.sort === "ready" ? "selected" : ""}>${t("আগে প্রস্তুত", "Earliest readiness")}</option><option value="quantity" ${buyerBrief.sort === "quantity" ? "selected" : ""}>${t("বেশি পরিমাণ", "Largest quantity")}</option></select></label></div></div>
   <div class="buyer-catalogue-grid">${matchedLots.length ? pageLots.map(renderBuyerLotCard).join("") : `<div class="empty-state"><h2>${t("এই বাছাইয়ে লট নেই", "No lots match")}</h2><p>${t("ফিল্টার সরিয়ে আবার দেখুন।", "Clear filters and try again.")}</p><button type="button" class="button button-green" data-action="clear-buyer-filters">${t("সব ফিল্টার সরান", "Clear filters")}</button></div>`}</div>
  ${pageCount > 1 ? `<nav class="buyer-pagination" aria-label="${t("লটের পৃষ্ঠা", "Lot pages")}"><button type="button" class="button button-outline button-small" data-action="buyer-page" data-page="${buyerPage - 1}" ${buyerPage === 1 ? "disabled" : ""}>${t("আগের পৃষ্ঠা", "Previous")}</button><span>${t("পৃষ্ঠা", "Page")} <strong>${formatter.format(buyerPage)}</strong> / ${formatter.format(pageCount)}</span><button type="button" class="button button-outline button-small" data-action="buyer-page" data-page="${buyerPage + 1}" ${buyerPage === pageCount ? "disabled" : ""}>${t("পরের পৃষ্ঠা", "Next")}</button></nav>` : ""}
  ${buyerCatalogue.compareLotIds.length ? `<div class="buyer-compare-tray"><span>${t("তুলনার জন্য বেছে নিয়েছেন", "Selected to compare")}: <strong>${formatter.format(buyerCatalogue.compareLotIds.length)}</strong> / ${formatter.format(3)}</span><div><button type="button" class="button button-outline button-small" data-action="clear-comparison">${t("মুছুন", "Clear")}</button><button type="button" class="button button-green button-small" data-action="open-comparison" ${buyerCatalogue.compareLotIds.length < 2 ? "disabled" : ""}>${t("তুলনা করুন", "Compare")}</button></div></div>` : ""}
   ${renderBuyerComparison()}
   <div class="buyer-catalogue-next"><a class="button button-green" href="${marketUrl("purchases")}" data-view="purchases">${t("আমার কেনাকাটায় যান", "Go to My Purchases")}${icon("arrow", 18)}</a></div>
  </section></div>`;
}

function renderBuyerLotDetail(lot, detailsOnly = false) {
  if (farmerPreview) {
    const unavailable = t("তথ্য দেওয়া হয়নি", "Not provided");
    const locationLabel = [lot.upazila, language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district].filter(Boolean).map(h).join(", ");
    return `<section class="buyer-page buyer-detail-page page-shell"><a class="buyer-back-link" href="/farmer#market">← ${t("বাজারে দিন পাতায় ফিরুন", "Back to farmer listing")}</a><div class="buyer-detail-layout"><div class="buyer-detail-main">${renderBuyerLotGallery(lot)}<section class="panel buyer-detail-info"><div class="buyer-detail-heading"><div><span class="status-pill">${t("আপনার লটের প্রদর্শন", "Your listing preview")}</span><h1>${h(lotVariety(lot))}</h1><p>${icon("pin", 17)}${locationLabel}</p></div></div><h2>${t("আলুর তথ্য", "Potato details")}</h2><dl class="buyer-detail-facts"><div><dt>${t("পরিমাণ", "Quantity")}</dt><dd>${kg(lot.quantityKg)}</dd></div><div><dt>${t("চাওয়া দাম", "Asking price")}</dt><dd>${money(lot.askingPriceMin)} / ${t("কেজি", "kg")}</dd></div><div><dt>${t("মোট চাওয়া দাম", "Asking total")}</dt><dd>${money(Number(lot.quantityKg) * Number(lot.askingPriceMin))}</dd></div><div><dt>${t("প্রস্তুত", "Ready")}</dt><dd>${prettyDate(lot.readyDate)}</dd></div><div><dt>${t("সংগ্রহের স্থান", "Pickup location")}</dt><dd>${locationLabel || unavailable}</dd></div><div><dt>${t("কৃষক", "Farmer")}</dt><dd>${h(lot.farmerName || unavailable)}</dd></div></dl></section></div><aside class="panel buyer-purchase-panel"><p class="section-kicker">${t("ব্যবসায়ীর পাতায় যেমন দেখাবে", "AS SHOWN TO BUYERS")}</p><h2>${money(Number(lot.quantityKg) * Number(lot.askingPriceMin))}</h2><p>${kg(lot.quantityKg)} · ${locationLabel}</p><p>${t("এটি শুধু দেখার পাতা। নিজের লট কেনা যাবে না।", "Read-only preview. You cannot buy your own lot.")}</p></aside></div></section>`;
  }
  const remaining = availableKg(lot, data.deals);
  const phone = validContactPhone(lot.contactPhone) ? String(lot.contactPhone).trim() : "";
  const message = encodeURIComponent(t(`আলুসাথী লট ${lot.id}: ${lotVariety(lot)} আলু সম্পর্কে কথা বলতে চাই।`, `I want to discuss AluSathi lot ${lot.id}: ${lotVariety(lot)} potatoes.`));
  const saved = buyerCatalogue.savedLotIds.includes(lot.id);
  const updated = lot.updatedAt || lot.createdAt;
  const farmerName = lot.farmerBusinessName || lot.farmerName || t("কৃষক", "Farmer");
  const unavailable = t("তথ্য দেওয়া হয়নি", "Not provided");
  return `<section class="buyer-page buyer-detail-page page-shell"><a class="buyer-back-link" href="${marketUrl("home")}" data-view="home">← ${t("আলুর তালিকায় ফিরুন", "Back to potato lots")}</a><div class="buyer-detail-layout"><div class="buyer-detail-main">${renderBuyerLotGallery(lot)}<section class="panel buyer-detail-info"><div class="buyer-detail-heading"><div><span class="status-pill">${buyerLotStatus(lot)}</span><h1>${h(lotVariety(lot))}</h1><p>${icon("pin", 17)}${h(lot.upazila || unavailable)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p></div><button type="button" class="buyer-save ${saved ? "selected" : ""}" data-action="toggle-save-lot" data-id="${h(lot.id)}" aria-pressed="${saved}">${saved ? "♥" : "♡"} ${saved ? t("রাখা হয়েছে", "Saved") : t("পছন্দে রাখুন", "Save")}</button></div><h2>${t("আলুর তথ্য", "Potato details")}</h2><dl class="buyer-detail-facts"><div><dt>${t("পাওয়া যাবে", "Available")}</dt><dd>${kg(remaining)}</dd></div><div><dt>${t("আকার", "Size")}</dt><dd>${h(lot.sizeDescription || unavailable)}</dd></div><div><dt>${t("মান / অবস্থা", "Condition")}</dt><dd>${h(lot.conditionDescription || unavailable)}</dd></div><div><dt>${t("ব্যবহার", "Purpose")}</dt><dd>${purposeLabel(lot.purpose)}</dd></div><div><dt>${t("তোলার তারিখ", "Harvest date")}</dt><dd>${prettyDate(lot.harvestDate)}</dd></div><div><dt>${t("প্রস্তুত", "Ready")}</dt><dd>${prettyDate(lot.readyDate)}</dd></div><div><dt>${t("রাখার বিবরণ", "Storage")}</dt><dd>${h(lot.storageDescription || unavailable)}</dd></div><div><dt>${t("সংগ্রহের স্থান", "Pickup location")}</dt><dd>${h(lot.upazila || unavailable)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</dd></div></dl><div class="buyer-detail-notes"><h2>${t("কৃষকের বিবরণ", "Farmer description")}</h2><p>${h(lot.notes || unavailable)}</p>${updated ? `<small>${t("হালনাগাদ", "Updated")}: ${prettyDate(String(updated).slice(0, 10))}</small>` : ""}</div><section class="buyer-farmer-profile"><h2>${t("কৃষক", "Farmer")}</h2><strong>${h(farmerName)}</strong><p>${h(lot.upazila || unavailable)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)}</p>${phone ? `<a href="tel:${h(phone)}">${t("ফোন করুন", "Call farmer")}</a> <a href="https://wa.me/${whatsappPhone(phone)}?text=${message}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : `<span>${t("যোগাযোগের নম্বর শেয়ার করা হয়নি", "Contact number not shared")}</span>`}</section></section></div>${detailsOnly ? "" : renderBuyerPurchasePanel(lot)}</div></section>`;
}

function renderBuyerPurchasePanel(lot) {
  const remaining = availableKg(lot, data.deals);
  const phone = validContactPhone(lot.contactPhone) ? String(lot.contactPhone).trim() : "";
  const message = encodeURIComponent(t(`আলুসাথী লট ${lot.id}: ${lotVariety(lot)} আলু সম্পর্কে কথা বলতে চাই।`, `I want to discuss AluSathi lot ${lot.id}: ${lotVariety(lot)} potatoes.`));
  const existing = buyerLotRequests.find(item => item.lotId === lot.id && item.status === "pending") || catalogueRequests.find(item => item.lot_id === lot.id && item.buyer_id === sharedUserId && ["pending", "agreed"].includes(item.status));
  const minRate = Number(lot.askingPriceMin ?? lot.askingPrice ?? 0);
  const initialRange = buyerLotPriceRange(lot, remaining);
  const unavailable = t("তথ্য দেওয়া হয়নি", "Not provided");
  return `<aside class="panel buyer-purchase-panel"><p class="section-kicker">${t("ক্রয় অনুরোধ", "BUYING REQUEST")}</p><h2>${initialRange || t("দর দেওয়া হয়নি", "No asking range")}</h2><p>${t("এই পরিমাণে কৃষকের চাওয়া মোট", "Farmer’s asking total for this quantity")} · ${kg(remaining)}</p>${existing ? `<div class="buyer-request-status"><strong>${existing.status === "agreed" ? t("সম্মতি হয়েছে", "Agreed") : t("কৃষকের উত্তরের অপেক্ষায়", "Awaiting farmer response")}</strong><span>${kg(existing.quantityKg ?? existing.quantity_kg)} · ${money(existing.totalOffer ?? existing.quoted_total)}</span></div>${buyerLotRequests.some(item => item.id === existing.id) ? `<p class="form-note">${t("কৃষক মেনে নিলে এটি নিশ্চিত কেনাকাটায় যাবে।", "Once the farmer accepts, this will become an agreed purchase.")}</p><a class="button button-outline" href="${marketUrl("purchases")}" data-view="purchases">${t("আমার কেনাকাটা দেখুন", "View my purchases")}</a>` : ""}` : `<form id="catalogue-request-form" data-lot-id="${h(lot.id)}" data-min-rate="${minRate}" data-max-kg="${remaining}"><fieldset><legend>${t("কত কেজি নেবেন?", "How many kilograms?")}</legend><label class="quantity-choice"><input type="radio" name="quantityMode" value="whole" checked /> ${t("পুরো লট", "Whole available lot")} (${kg(remaining)})</label><label class="quantity-choice"><input type="radio" name="quantityMode" value="custom" /> ${t("নিজের পরিমাণ", "Custom quantity")}</label><label class="custom-quantity" hidden>${t("পরিমাণ (কেজি)", "Quantity (kg)")}<input name="quantityKg" inputmode="decimal" type="number" min="0.001" max="${remaining}" step="0.001" value="${remaining}" /></label></fieldset><p class="buyer-total-range" aria-live="polite"><span>${t("এই পরিমাণে চাওয়া মোট", "Asking total for this quantity")}</span><strong data-range>${initialRange || unavailable}</strong></p><label>${t("আপনার মোট প্রস্তাব", "Your total offer")}<input name="totalOffer" inputmode="decimal" type="number" min="0.01" step="0.01" value="${Math.round(minRate * remaining * 100) / 100}" required /></label><small>${t("কৃষক মেনে নিলে এটি নিশ্চিত কেনাকাটায় যাবে।", "Once the farmer accepts, this will become an agreed purchase.")}</small><button class="button button-green" type="submit" ${remaining <= 0 ? "disabled" : ""}>${t("প্রস্তাব দিন", "Make proposal")}</button></form>`}${phone ? `<a class="button button-outline" href="tel:${h(phone)}">${t("ফোন করুন", "Call farmer")}</a><a class="button button-outline" href="https://wa.me/${whatsappPhone(phone)}?text=${message}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ""}</aside>`;
}

function renderBuyerProfile() {
  return `<fieldset class="form-section buyer-profile"><legend>${t("যোগাযোগ ও ঠিকানা", "Contact and address")}</legend><p>${t("প্রথম দর দেওয়ার সময় লিখুন। পরেরবার আর লিখতে হবে না।", "Add this on your first offer. It will be saved for later offers.")}</p><div class="form-grid"><label>${t("যোগাযোগের ব্যক্তির নাম", "Contact person")}<input name="contactPerson" required minlength="2" maxlength="80" autocomplete="name" value="${h(buyerProfile.contactPerson || "")}" /></label><label>${t("মোবাইল নম্বর", "Mobile number")}<input name="contactPhone" required inputmode="tel" autocomplete="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" title="Bangladesh mobile number" value="${h(buyerProfile.contactPhone || "")}" /></label><label>${t("উপজেলা / থানা", "Upazila / area")}<input name="buyerUpazila" required minlength="2" maxlength="80" value="${h(buyerProfile.buyerUpazila || "")}" /></label><label>${t("বাজার বা সংগ্রহের ঠিকানা", "Market or collection address")}<input name="buyerAddress" required minlength="5" maxlength="180" value="${h(buyerProfile.buyerAddress || "")}" /></label></div><small>${t("এই তথ্য ব্রাউজারে থাকে; পরিচয় যাচাই হয় না।", "These details stay in this browser; identity is not verified.")}</small></fieldset>`;
}

function renderOfferForm() {
  const lot = data.listings.find(item => item.id === draftLotId);
  if (!lot) return "";
  const remaining = availableKg(lot, data.deals);
  const cost = (name, bn, en) => `<label>${t(bn, en)}<input name="cost_${name}" type="number" min="0" max="1000000" step="1" inputmode="numeric" placeholder="${t("অজানা", "Unknown")}" /><span class="cost-confirm"><input name="known_${name}" type="checkbox" value="yes" /> ${t("খরচ নেই", "No charge")}</span></label>`;
  return `<form id="offer-form" class="panel offer-form"><input type="hidden" name="lotId" value="${h(lot.id)}" /><div class="section-header"><div><p class="section-kicker">${t("এই আলুর জন্য দর", "OFFER FOR THIS LOT")}</p><h2>${h(lot.variety)} · ${kg(remaining)}</h2></div><button type="button" class="text-arrow" data-action="close-offer">${t("বন্ধ করুন", "Close")}</button></div><fieldset class="form-section"><legend>${t("১ · দর ও পরিমাণ", "1 · Price and quantity")}</legend><div class="form-grid"><label>${t("আপনার ব্যবসার নাম", "Business name")}<input name="buyer" required minlength="2" maxlength="80" placeholder="${t("ক্রেতা", "Buyer")}" /></label><label>${t("ক্রেতার জেলা", "Buyer district")}<select name="district">${districtOptions("Bogura")}</select></label><label>${t("যত কেজি নিতে চান", "Quantity you can buy (kg)")}<input name="quantityKg" required type="number" min="1" max="${remaining}" step="1" inputmode="numeric" value="${Math.min(remaining, 1000)}" /></label><label>${t("দর (টাকা/কেজি)", "Price (BDT/kg)")}<input name="priceKg" required type="number" min="1" max="10000" step="0.01" inputmode="decimal" placeholder="25" /></label></div></fieldset><fieldset class="form-section"><legend>${t("২ · নেওয়া ও টাকা", "2 · Pickup and payment")}</legend><div class="form-grid"><label>${t("আনুমানিক কত % আলু নেবেন?", "How much of the lot will you take? (%)")}<input name="acceptedPercent" required type="number" min="1" max="100" step="1" inputmode="numeric" value="100" /></label><label>${t("কে আলু নিয়ে যাবেন?", "Who collects?")}<select name="pickup"><option value="buyer">${t("ক্রেতা", "Buyer")}</option><option value="farmer">${t("কৃষক পাঠাবেন", "Farmer delivers")}</option></select></label><label>${t("চাইবার তারিখ", "Requested pickup date")}<input name="pickupDate" type="date" min="${todayPlus(0)}" /></label><label>${t("টাকা দেওয়ার মাধ্যম", "Payment method")}<select name="paymentMethod"><option value="cash">${t("নগদ", "Cash")}</option><option value="mfs">${t("মোবাইল ওয়ালেট", "Mobile wallet")}</option><option value="bank">${t("ব্যাংক", "Bank")}</option></select></label><label>${t("টাকা কত দিনে দেবেন?", "Payment within how many days?")}<input name="paymentDays" required type="number" min="0" max="30" step="1" inputmode="numeric" value="0" /></label></div></fieldset><details class="offer-disclosure"><summary>${t("আরও শর্ত ও খরচ", "More terms and costs")}</summary><fieldset class="form-section"><legend>${t("আপনার আলাদা খরচ", "Your separate costs")}</legend><p class="form-note">${t("দরদাতার কাছ থেকে পাওয়া কোট লিখুন। ফাঁকা মানে জানা নেই; কেবল নিশ্চিত হলে ‘খরচ নেই’ টিক দিন।", "Enter quoted buyer costs. Blank means unknown; tick ‘No charge’ only when confirmed.")}</p><div class="form-grid cost-grid">${cost("transport", "পরিবহন", "Transport")}${cost("loadingSacks", "লোড / বস্তা", "Loading / sacks")}${cost("taxes", "কর", "Taxes")}${cost("marketFees", "বাজার ফি", "Market fees")}${cost("other", "অন্যান্য", "Other")}</div><div id="buyer-purchase-estimate" class="buyer-purchase-estimate" aria-live="polite">${t("সব খরচ জানা হলে মোট দেখাবে।", "Total appears when every cost is known.")}</div><label>${t("দরের শেষ দিন", "Offer expires")}<input name="expires" required type="date" min="${todayPlus(0)}" value="${todayPlus(2)}" /></label><label>${t("গ্রেড, ওজন ও কাটতির নিয়ম", "Grade, weighing and deduction terms")}<textarea name="terms" required maxlength="400" rows="3" placeholder="${t("যেমন: মাঝারি আলু; ওজনের সময় কাটতি হলে ছবি দেবেন", "e.g. Medium potatoes; show photos for any rejection at weighing")}"></textarea></label></fieldset></details><p class="form-warning">${t("আলুসাথী টাকা পাঠায় না বা স্টক যাচাই করে না।", "AluSathi does not transfer money or verify stock.")}</p><button class="button button-green submit" type="submit">${t("দর পাঠান", "Send offer")}${icon("arrow", 18)}</button></form>`;
}

function renderFarmerRequest(request) {
  const lots = data.listings.filter(lot => lot.sellerId === sharedUserId && lot.quantityKg - lot.reservedKg > 0);
  const expanded = proposalRequestId === request.id;
  return `<article class="panel buyer-offer-row"><div><span class="status-pill">${t("খোলা চাহিদা", "Open request")}</span><h3>${h(request.variety || t("যেকোনো জাত", "Any variety"))} · ${kg(request.remainingKg)}</h3><p>${h(language === "bn" ? districtNamesBn[request.district] || request.district : request.district)} → ${h(request.destination)} · ${t("লক্ষ্য দর", "Target price")}: ${rate(request.targetPrice)} / ${h(request.priceUnit)}</p><small>${t("লট ও সরবরাহের পরিমাণ বেছে প্রস্তাব দিন।", "Choose a published lot and propose a partial supply.")}</small></div>${lots.length ? `<button class="button button-green button-small" data-action="open-request-proposal" data-id="${h(request.id)}">${t("লট প্রস্তাব করুন", "Propose a lot")}</button>` : `<p>${t("আগে আলুর লট প্রকাশ করুন।", "Publish a lot before proposing supply.")}</p>`}${expanded ? `<form class="inline-form" data-form="request-proposal" data-id="${h(request.id)}"><label>${t("আপনার লট", "Your published lot")}<select name="lotId" required>${lots.map(lot => `<option value="${h(lot.id)}">${h(lot.variety)} · ${kg(lot.quantityKg - lot.reservedKg)}</option>`).join("")}</select></label><label>${t("প্রস্তাবিত পরিমাণ (কেজি)", "Proposed quantity (kg)")}<input name="quantityKg" type="number" min="0.001" max="${request.remainingKg}" step="0.001" required /></label><label>${t("দর (টাকা/কেজি)", "Price (BDT/kg)")}<input name="price" type="number" min="0" step="0.01" required value="${request.targetPrice}" /></label><button class="button button-green button-small">${t("প্রস্তাব পাঠান", "Send proposal")}</button></form>` : ""}</article>`;
}

function renderCounterOfferForm(offer) {
  const open = counterOfferId === offer.id;
  if (!open) return "";
  return `<form class="panel inline-form" data-form="counter-offer" data-id="${h(offer.id)}"><label>${t("পরিমাণ (কেজি)", "Quantity (kg)")}<input name="quantityKg" type="number" min="0.001" step="0.001" required value="${h(offer.quantityKg)}" /></label><label>${t("দর", "Price")}<input name="price" type="number" min="0" step="0.01" required value="${h(offer.quotedPrice ?? offer.priceKg)}" /><small>/${h(offer.priceUnit || "kg")}</small></label><label>${t("সংগ্রহের তারিখ", "Pickup date")}<input name="pickupDate" type="date" value="${h(offer.pickupDate || "")}" /></label><label>${t("সংগ্রহ করবে", "Collection responsibility")}<select name="pickupResponsibility"><option value="buyer">${t("ক্রেতা", "Buyer")}</option><option value="farmer" ${offer.pickup === "farmer" ? "selected" : ""}>${t("কৃষক", "Farmer")}</option></select></label><label>${t("টাকা দেওয়ার সময়", "Payment timing")}<select name="paymentTiming"><option value="on_collection">${t("সংগ্রহের সময়", "On collection")}</option><option value="advance">${t("অগ্রিম", "Advance")}</option><option value="after_7_days">${t("৭ দিনের মধ্যে", "Within 7 days")}</option></select></label><label>${t("পেমেন্টের মাধ্যম", "Payment method")}<select name="paymentMethod"><option value="cash">${t("নগদ", "Cash")}</option><option value="mfs">${t("মোবাইল ওয়ালেট", "Mobile wallet")}</option><option value="bank">${t("ব্যাংক", "Bank")}</option></select></label><label>${t("গন্তব্য", "Destination")}<input name="destination" maxlength="180" value="${h(offer.destination || "")}" /></label><label>${t("আরও শর্ত", "Notes")}<textarea name="notes" maxlength="500">${h(offer.terms || "")}</textarea></label><button class="button button-green button-small">${t("পাল্টা দর পাঠান", "Send counteroffer")}</button><button type="button" class="text-arrow" data-action="cancel-counter">${t("বাদ দিন", "Cancel")}</button></form>`;
}

function renderFarmerResponses() {
  if (sharedLoading) return `<section class="section page-shell"><div class="empty-state" role="status">${t("তথ্য আনা হচ্ছে…", "Loading shared records…")}</div></section>`;
  if (!sharedUserId) return `<section class="section page-shell"><header class="compact-page-head"><div><p class="section-kicker">${t("ক্রেতার দর ও উত্তর", "BUYER OFFERS")}</p><h1>${t("কৃষকের উত্তর", "Farmer responses")}</h1></div></header><div class="empty-state"><p>${t("কৃষকের দর ও উত্তর দেখতে কৃষক পরিচয় বেছে নিন।", "Choose the farmer role to see offers and replies.")}</p><a class="button button-green" href="/auth">${t("পরিচয় বাছুন", "Choose role")}</a></div></section>`;
  const requests = catalogueRequests.filter(item => item.seller_id === sharedUserId && item.status === "pending");
  return `<section class="section page-shell"><header class="compact-page-head"><div><p class="section-kicker">${t("বিক্রির আগে", "BEFORE SELLING")}</p><h1>${t("ক্রেতার অনুরোধ", "Buyer requests")}</h1><p>${t("পরিমাণ ও মোট প্রস্তাব দেখে মেনে নিন বা না বলুন।", "Review the quantity and total, then accept or decline.")}</p></div></header><div class="catalogue-request-list">${requests.length ? requests.map(renderCatalogueRequest).join("") : `<div class="empty-state"><p>${t("এখন কোনো ক্রেতার অনুরোধ নেই।", "No buyer requests right now.")}</p></div>`}</div></section>`;
}

function renderBuyerOffers() {
  const offers = data.offers.filter(offer => !offer.sample);
  return `<section class="buyer-page page-shell"><header class="compact-page-head"><div><p class="section-kicker">${t("আমার দর", "MY OFFERS")}</p><h1>${t("দর ও উত্তর", "Offers and responses")}</h1><p>${t("প্রতিটি দরের বর্তমান শর্ত ও পরের কাজ এখানে দেখুন।", "See the latest terms and next action for every offer.")}</p></div><a href="${marketUrl("home")}" class="button button-green" data-view="home">${t("আলুর তালিকা", "Browse lots")}</a></header><div class="offer-grid buyer-offer-grid">${offers.length ? offers.map(offer => { const lot = data.listings.find(item => item.id === offer.lotId); return lot ? renderBuyerOfferRow(offer, lot) : ""; }).join("") : `<div class="empty-state"><h2>${t("এখনো কোনো দর নেই", "No offers yet")}</h2><p>${t("একটি লট খুলে দর ও সংগ্রহের শর্ত লিখুন।", "Open a lot to enter price and collection terms.")}</p><a class="button button-green" href="${marketUrl("home")}" data-view="home">${t("লট দেখুন", "See lots")}</a></div>`}</div></section>`;
}

function buyerOfferStatus(offer) {
  const status = offer.status || "pending";
  return ({ draft: t("খসড়া", "Draft"), pending: t("কৃষকের উত্তরের অপেক্ষা", "Awaiting farmer"), counter: t("পাল্টা দর এসেছে", "Counteroffer"), agreed: t("সম্মতি হয়েছে", "Agreed"), rejected: t("গ্রহণ হয়নি", "Rejected"), withdrawn: t("তুলে নেওয়া", "Withdrawn"), expired: t("সময় শেষ", "Expired") })[status] || t("অপেক্ষমাণ", "Pending");
}
function renderBuyerOfferRow(offer, lot) {
  const summary = buyerCostSummary(offer, lot);
  const expired = offer.expires && offer.expires < todayPlus(0);
  const latest = expired && offer.status === "pending" ? "expired" : offer.status || "pending";
  const detailUrl = `./buyer.html?lot=${encodeURIComponent(lot.id)}#buyer-detail`;
  const canRespond = sharedUserId && offer.awaitingUserId === sharedUserId && ["pending", "counter"].includes(offer.status) && !expired;
  const canWithdraw = sharedUserId && offer.latestProposer === sharedUserId && ["pending", "counter"].includes(offer.status);
  return `<article class="buyer-offer-row ${highlightedOfferId === offer.id ? "highlighted" : ""}" id="offer-${h(offer.id)}"><div><span class="status-pill">${buyerOfferStatus({ ...offer, status: latest })}</span><h2>${h(lotVariety(lot))} · ${kg(offer.quantityKg)}</h2><p>${t("ব্যবসা", "Business")}: ${h(offer.buyer)} · ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} · ${t("সংগ্রহ", "Pickup")}: ${prettyDate(offer.pickupDate)}</p></div><div><span>${t("দর", "Price")}</span><strong>${rate(offer.quotedPrice ?? offer.priceKg)}/${h(offer.priceUnit || "kg")}</strong></div><div><span>${t("আনুমানিক মোট খরচ", "Estimated total")}</span><strong>${summary.total === null ? t("অসম্পূর্ণ", "Incomplete") : money(summary.total)}</strong><small>${summary.total === null ? t("সব খরচ জানা নেই", "Some costs are unknown") : `${rate(summary.deliveredPerKg)}/${t("গ্রহণ কেজি", "accepted kg")}`}</small></div><div class="buyer-offer-actions">${canRespond ? `<button class="button button-green button-small" data-action="respond-shared-offer" data-response="accept" data-id="${h(offer.id)}">${t("মেনে নিন", "Accept")}</button><button class="button button-outline button-small" data-action="open-counter" data-id="${h(offer.id)}">${t("পাল্টা দর দিন", "Counteroffer")}</button><button class="button button-outline button-small" data-action="respond-shared-offer" data-response="decline" data-id="${h(offer.id)}">${t("গ্রহণ করবেন না", "Decline")}</button>` : ""}${canWithdraw ? `<button class="text-arrow" data-action="withdraw-offer" data-id="${h(offer.id)}">${t("দর তুলে নিন", "Withdraw")}</button>` : ""}<a class="text-arrow" href="${detailUrl}" data-action="open-buyer-lot" data-id="${h(lot.id)}">${t("লট দেখুন", "View lot")}</a></div>${renderCounterOfferForm(offer)}</article>`;
}

function renderBuyerPurchases() {
  const deals = data.deals.filter(deal => !deal.sample);
  const requests = buyerLotRequests.filter(request => request.status === "pending");
  const requestCards = requests.map(request => `<article class="deal-card buyer-lot-request"><div class="deal-card-header"><div><span class="status-pill">${t("কৃষকের উত্তরের অপেক্ষায়", "Awaiting farmer response")}</span><h3>${h(request.variety)} <span>· ${kg(request.quantityKg)}</span></h3><p>${h(request.upazila)}, ${h(language === "bn" ? districtNamesBn[request.district] || request.district : request.district)}</p></div><strong>${money(request.totalOffer)}</strong></div><p class="deal-terms">${t("কৃষক মেনে নিলে এটি নিশ্চিত কেনাকাটায় যাবে।", "Once the farmer accepts, this will become an agreed purchase.")}</p><div class="deal-card-footer"><span>${t("আপনার মোট প্রস্তাব", "Your total offer")} · ${prettyDate(request.createdAt.slice(0, 10))}</span><a class="text-arrow" href="./buyer.html?lot=${encodeURIComponent(request.lotId)}#buyer-detail" data-action="open-buyer-lot" data-id="${h(request.lotId)}">${t("বিস্তারিত দেখুন", "View details")}</a></div></article>`).join("");
  return `<div class="buyer-purchases-layout"><div class="buyer-purchases-banner"><img src="/marketplace/banners/buyer-purchases-street-v1/banner.png" alt="${t("বাজারের দোকানে আলুর কেনাবেচা নিয়ে কথা বলছেন কৃষক ও ব্যবসায়ী।", "A farmer and buyer discussing a potato deal at a market shop.")}" /><svg viewBox="0 0 2172 304" preserveAspectRatio="none" aria-hidden="true"><g class="buyer-purchases-birds"><g class="bird bird-one"><path d="M0 10 Q11 -2 22 10 M22 10 Q34 -2 46 10"/><path d="M58 20 Q66 12 74 20 M74 20 Q82 12 90 20"/></g><g class="bird bird-two"><path d="M0 10 Q11 -2 22 10 M22 10 Q34 -2 46 10"/></g><g class="bird bird-three"><path d="M0 10 Q11 -2 22 10 M22 10 Q34 -2 46 10"/></g></g></svg></div><section class="buyer-page page-shell"><header class="compact-page-head"><div><p class="section-kicker">${t("আমার কেনাকাটা", "MY PURCHASES")}</p><h1>${t("সংগ্রহ, ওজন ও টাকা", "Collection, weight, and payments")}</h1><p>${t("আপনার প্রস্তাব ও কৃষকের সম্মতি পাওয়া কেনাকাটা আলাদা দেখানো হবে।", "Your proposals and farmer-approved purchases are shown separately.")}</p></div></header><section class="buyer-agreed-purchases"><h2>${t("নিশ্চিত কেনাকাটা", "Agreed purchases")}</h2><div class="deals-list">${deals.length ? deals.map(renderDealCard).join("") : `<div class="empty-state buyer-agreed-empty"><h3>${t("এখনো কোনো কেনাকাটা হয়নি", "No agreed purchases yet")}</h3></div>`}</div></section>${requests.length ? `<section class="buyer-outgoing-requests"><h2>${t("আপনার প্রস্তাব", "Your proposals")}</h2><div class="deals-list">${requestCards}</div></section>` : ""}<div class="buyer-purchases-footer"><a class="button button-outline" href="${marketUrl("transport")}" data-view="transport">${icon("truck", 18)}${t("পরিবহনে যান", "Go to transport")}</a></div></section></div>`;
}

function renderBuyerNotebook() {
  const rows = data.deals.filter(deal => !deal.sample).map(deal => {
    const accepted = Number(deal.accepted_kg) || 0;
    const payable = potatoPaymentDue(deal);
    const expenses = (deal.expenses || []).filter(item => item.status === "actual" && item.amount != null).reduce((sum, item) => sum + Number(item.amount), 0);
    const incomplete = (deal.expenses || []).some(item => item.status === "unknown");
    const confirmed = confirmedPayments(deal);
    const pending = (deal.paymentReports || []).filter(item => item.status === "reported" && item.reported_by === deal.buyer_id).reduce((sum, item) => sum + Number(item.amount), 0);
    const total = payable + expenses;
    const perKg = accepted > 0 ? money(Math.round(total / accepted * 100) / 100) : "—";
    return `<tr><td>${prettyDate(deal.createdAt?.slice(0, 10))}</td><td>${h(deal.variety)} · ${h(deal.id.slice(0, 8))}</td><td>${accepted ? kg(accepted) : t("ওজন বাকি", "Pending")}</td><td>${money(payable)}</td><td>${incomplete ? `${money(expenses)} · ${t("অসম্পূর্ণ", "incomplete")}` : money(expenses)}</td><td>${money(confirmed)}${pending ? ` · ${money(pending)} ${t("অপেক্ষায়", "pending")}` : ""}</td><td>${money(Math.max(0, payable - confirmed))}</td><td>${perKg}</td><td>${dealStatus(deal)}</td></tr>`;
  }).join("");
  return `<div class="buyer-notebook-layout"><div class="buyer-offers-banner"><iframe src="/marketplace/banners/buyer-offers-calculating-v1/banner.html" title="${t("আলুর বাজারে দর হিসাব করছেন এক ব্যবসায়ী", "A buyer calculating an offer in the potato market")}" loading="eager"></iframe></div><section class="buyer-page page-shell"><header class="compact-page-head"><div><p class="section-kicker">${t("খাতা", "NOTEBOOK")}</p><h1>${t("কেনাকাটার খাতা", "Purchase notebook")}</h1><p>${t("প্রাপ্য, নিশ্চিত পেমেন্ট, অপেক্ষমান নিশ্চিতকরণ ও আসল খরচ আলাদা করে দেখুন।", "Track payable amounts, confirmed and pending payments, expenses, and cost per accepted kg.")}</p></div><button class="button button-outline" data-action="print-buyer-notebook">${t("ছাপুন", "Print")}</button></header><div class="notebook-table-wrap"><table><thead><tr><th>${t("তারিখ", "Date")}</th><th>${t("কেনাকাটা", "Purchase")}</th><th>${t("গৃহীত", "Accepted")}</th><th>${t("আলুর পাওনা", "Potato payable")}</th><th>${t("আসল খরচ", "Actual expense")}</th><th>${t("পেমেন্ট", "Payments")}</th><th>${t("বাকি", "Balance")}</th><th>${t("প্রতি গৃহীত কেজি", "Cost / accepted kg")}</th><th>${t("অবস্থা", "Status")}</th></tr></thead><tbody>${rows || `<tr><td colspan="9">${t("চুক্তি হলে হিসাব এখানে আসবে।", "Agreed purchases will appear here.")}</td></tr>`}</tbody></table></div><p class="notebook-note">${t("শুধু নিশ্চিত ওজন, নিশ্চিত পেমেন্ট এবং আসল খরচ গণনায় আসে। অজানা খরচ আলাদা চিহ্নিত।", "Only confirmed weight, confirmed payments, and actual expenses enter totals. Unknown expenses remain marked incomplete.")}</p></section></div>`;
}

function renderReview() {
  const offer = data.offers.find(item => item.id === reviewOfferId);
  const lot = offer && data.listings.find(item => item.id === offer.lotId);
  if (!lot) return "";
  const remaining = availableKg(lot, data.deals);
  const quantity = offerRemainingKg(offer, lot);
  const result = estimateOffer(offer, quantity);
  if (!quantity) return `<div class="modal-backdrop" data-action="close-review"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button class="modal-close" data-action="close-review" aria-label="Close">×</button><h2 id="review-title">${t("এই দর আর নেওয়া যাবে না", "This offer is no longer available")}</h2><p>${t("এই ক্রেতার চাওয়া পরিমাণ বা জমির বাকি আলু অন্য চুক্তিতে চলে গেছে।", "The buyer's requested amount or the farmer's remaining potatoes are already committed.")}</p><div class="modal-actions"><button type="button" class="button button-green" data-action="close-review">${t("ফিরে যান", "Go back")}</button></div></div></div>`;
  return `<div class="modal-backdrop" data-action="close-review"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button class="modal-close" data-action="close-review" aria-label="Close">×</button><p class="section-kicker">${t("চুক্তির আগে মিলিয়ে নিন", "CHECK BEFORE AGREEING")}</p><h2 id="review-title">${t("এই দর মেনে নেবেন?", "Accept these terms?")}</h2><p>${t("মেনে নিলে দুই অ্যাকাউন্টে কেনাকাটার নথি তৈরি হবে।", "Accepting creates the shared purchase record for both accounts.")}</p><form id="deal-form"><input type="hidden" name="offerId" value="${h(offer.id)}" /><div class="deal-summary"><div><span>${t("ক্রেতা", "Buyer")}</span><strong>${h(offer.buyer || t("আলুসাথী ক্রেতা", "AluSathi buyer"))}</strong></div><div><span>${t("পরিমাণ", "Quantity")}</span><strong>${kg(quantity)}</strong></div><div><span>${t("দর", "Price")}</span><strong>${rate(offer.quotedPrice ?? offer.priceKg)}/${h(offer.priceUnit || "kg")}</strong></div><div><span>${t("সংগ্রহ", "Collection")}</span><strong>${prettyDate(offer.pickupDate)}</strong></div><div><span>${t("ওজন ও কাটতির নিয়ম", "Weight and deduction terms")}</span><strong>${h(offer.terms || "—")}</strong></div><div><span>${t("টাকা দেওয়ার সময়", "Payment timing")}</span><strong>${h(offer.paymentTiming || "on collection")}</strong></div></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-review">${t("ফিরে যান", "Go back")}</button><button type="submit" class="button button-green">${t("দর মেনে নিন", "Accept offer")}</button></div></form></div></div>`;
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
  return ({ agreed: t("চুক্তি হয়েছে", "Agreed"), pickup_pending: t("ওজন নিশ্চিতের অপেক্ষা", "Weight awaiting farmer"), collected: t("তোলা হয়েছে", "Collected"), payment_pending: t("টাকা নিশ্চিতের অপেক্ষা", "Payment awaiting farmer"), paid: t("টাকা পাওয়া গেছে", "Paid"), disputed: t("পার্থক্য আছে", "Difference recorded") })[deal.status] || "—";
}

function potatoPaymentDue(deal) {
  const acceptedKg = deal.actualAcceptedKg ?? deal.quantityKg;
  if (Number.isFinite(deal.agreedTotal) && deal.quantityKg > 0) return Math.round(deal.agreedTotal * Math.min(acceptedKg, deal.quantityKg) / deal.quantityKg * 100) / 100;
  return purchaseCost({ acceptedKg, priceKg: deal.offer.priceKg, costs: buyerCostLines(deal.offer) }).potatoPayment;
}
function confirmedPayments(deal) {
  return (deal.paymentReports || []).filter(item => item.status === "confirmed" && item.reported_by === deal.buyer_id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}
function pendingPayment(deal) {
  return [...(deal.paymentReports || [])].reverse().find(item => item.status === "reported" && item.reported_by === deal.buyer_id) || null;
}

function renderDealCard(deal) {
  const offer = deal.offer;
  const estimate = estimateOffer(offer, deal.quantityKg);
  let action = "";
  if (deal.status === "agreed") action = `<form class="inline-form" data-form="pickup" data-id="${h(deal.id)}"><label>${t("তোলার তারিখ", "Pickup date")}<input name="pickupDate" type="date" required value="${todayPlus(0)}" /></label><label>${t("মোট ওজন (কেজি)", "Gross weight (kg)")}<input name="grossKg" type="number" min="0.001" max="${deal.quantityKg}" step="0.001" required /></label><label>${t("বস্তা / পাত্র (কেজি)", "Sacks / container (kg)")}<input name="tareKg" type="number" min="0" step="0.001" value="0" /></label><label>${t("কাটতি একক", "Deduction type")}<select name="deductionType"><option value="kg">${t("কেজি", "kg")}</option><option value="percent">%</option></select></label><label>${t("কাটতি", "Deduction")}<input name="deductionValue" type="number" min="0" step="0.001" value="0" /></label><label>${t("মন্তব্য", "Notes")}<input name="note" maxlength="500" /></label><button class="button button-green button-small">${t("ওজন পাঠান", "Report pickup")}</button></form>`;
  const pickup = deal.pickups?.find(item => item.status === "pending");
  if (pickup && pickup.reported_by !== sharedUserId) action = `<div class="action-box"><p>${t("অন্য পক্ষের ওজন প্রতিবেদন", "Other participant reported")}: <strong>${kg(pickup.netKg)} · ${kg(pickup.acceptedKg)} ${t("গ্রহণযোগ্য", "accepted")}</strong></p><button class="button button-green button-small" data-action="confirm-pickup" data-id="${h(pickup.id)}">${t("ওজন নিশ্চিত করুন", "Confirm pickup")}</button></div>`;
  const potatoDue = potatoPaymentDue(deal);
  const confirmed = confirmedPayments(deal);
  const balance = Math.max(0, potatoDue - confirmed);
  if (deal.status === "collected" && role === "buyer") action = `<form class="inline-form" data-form="payment" data-id="${h(deal.id)}"><p>${t("কৃষকের নিশ্চিত পাওনা", "Confirmed amount due to farmer")}: <strong>${money(balance)}</strong></p><label>${t("পাঠানো টাকার পরিমাণ", "Amount sent (BDT)")}<input name="paymentAmount" type="number" min="0.01" max="${balance || 100000000}" step="0.01" value="${balance}" required /></label><label>${t("তারিখ", "Date")}<input name="paymentDate" type="date" value="${todayPlus(0)}" required /></label><label>${t("মাধ্যম", "Method")}<select name="paymentMethod"><option value="cash">${t("নগদ", "Cash")}</option><option value="mfs">${t("মোবাইল ওয়ালেট", "Mobile wallet")}</option><option value="bank">${t("ব্যাংক", "Bank")}</option></select></label><label>${t("লেনদেন নম্বর / রসিদ নোট", "Transaction reference / receipt note")}<input name="paymentRef" maxlength="80" /></label><button class="button button-green button-small">${t("পেমেন্ট জানান", "Report payment")}</button></form>`;
  if (deal.status === "payment_pending") { const report = pendingPayment(deal); action = report ? `<div class="action-box"><p>${t("ক্রেতার রিপোর্ট করা টাকা", "Buyer-reported payment")}: <strong>${money(report.amount)}</strong> · ${t("রেফারেন্স", "Reference")}: ${h(report.reference || "—")} · ${t("নিজের হিসাবে টাকা দেখে তারপর নিশ্চিত করুন।", "Check your account before confirming.")}</p><button class="button button-green button-small" data-action="confirm-payment" data-id="${h(report.id)}">${t("টাকা পেয়েছি", "Confirm received")}</button></div>` : ""; }
  const costs = buyerCostState(offer);
  const acceptedKg = deal.pickups?.filter(item => item.status === "confirmed" || item.status === "corrected").reduce((sum, item) => sum + item.acceptedKg, 0) || deal.actualAcceptedKg || 0;
  const displayedPrice = deal.agreedTotal != null ? money(deal.agreedTotal) : `${rate(offer.quotedPrice ?? offer.priceKg)}/${h(offer.priceUnit || "kg")}`;
  return `<article class="deal-card"><div class="deal-card-header"><div><span class="small-label">${t("চুক্তির নথি", "PURCHASE RECORD")}</span><h3>${h(role === "farmer" ? t("ক্রেতা", "Buyer") : t("কৃষক", "Farmer"))} <span>· ${h(deal.variety)}</span></h3></div><span class="status-pill ${deal.status === "paid" ? "status-paid" : ""}">${dealStatus(deal)}</span></div><div class="deal-facts"><div><span>${t("চুক্তির পরিমাণ", "Agreed quantity")}</span><strong>${kg(deal.quantityKg)}</strong></div><div><span>${deal.agreedTotal != null ? t("সম্মত মোট দাম", "Agreed total") : t("দর", "Price")}</span><strong>${displayedPrice}</strong></div><div><span>${t("প্রাপ্য আলুর মূল্য", "Potato payable")}</span><strong>${money(potatoDue)}</strong></div><div><span>${t("গৃহীত", "Accepted")}</span><strong>${acceptedKg ? kg(acceptedKg) : t("এখনো নয়", "Not yet")}</strong></div></div><p class="deal-terms">${icon("shield", 18)}${h(offer.terms)} · ${t("তোলা", "Collection")}: ${formatter.format(deal.pickups?.filter(item => item.status === "confirmed" || item.status === "corrected").reduce((sum, item) => sum + item.netKg, 0) || 0)} / ${kg(deal.quantityKg)} · ${t("নিশ্চিত পেমেন্ট", "Confirmed paid")}: ${money(confirmed)} · ${t("বাকি", "Balance")}: ${money(balance)}</p>${action}<div class="deal-card-footer"><span>${t("কেনাকাটার নম্বর", "Purchase ID")}: ${h(deal.id.slice(0, 8))}</span><button class="text-arrow" data-action="print-deal" data-id="${h(deal.id)}">${t("ছাপুন", "Print")}${icon("arrow", 15)}</button></div></article>`;
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
  if (role !== "farmer" || !showSamples) return;
  prepareDemoForms(app, {
    displayName: role === 'farmer' ? t('কৃষক', 'Farmer') : t('ক্রেতা', 'Buyer'),
    upazila: 'Pirganj', variety: 'Diamant', quantityKg: 2000, priceKg: 25,
    buyer: t('ক্রেতা', 'Buyer'), name: t('হিমাগার', 'Cold store'),
    area: 'Rangpur', terms: t('দর ও জায়গা যাচাই করে নিন।', 'Price and availability have not been confirmed.'),
    acceptedPercent: 100, paymentDays: 0, transport: 0, handling: 0, fee: 0, other: 0,
    partnerKg: 0,
    paymentRef: 'NOT-VERIFIED', months: 2, feeKgMonth: 1.5, lossPercent: 4, oneTimeCost: 2500,
  }, t('আগে থেকে বসানো তথ্য দেখে বদলে নিন।', 'Review and change the prefilled values.'));
}

function render() {
  stopNotesVoice();
  disposeTransport();
  disposeBuyerTransport();
  document.documentElement.lang = language;
  if (role === "choose") { let selected = ""; try { selected = sessionStorage.getItem("alusathi-role") || ""; } catch { /* Role choice is available at /auth. */ } location.replace(selected === "buyer" ? "./buyer.html" : selected === "farmer" ? "./farmer.html" : "../auth"); return; }
  if (view === "storage") quoteOpen = document.querySelector(".quote-disclosure")?.open ?? quoteOpen;
  const buyerDetailLot = role === "buyer" && view === "buyer-detail" ? data.listings.find(item => item.id === selectedLotId) : null;
  const content = role === "farmer" && view === "responses" ? renderFarmerResponses() : role === "buyer" && view === "buyer-detail" && buyerDetailLot ? renderBuyerLotDetail(buyerDetailLot) : role === "buyer" && view === "purchases" ? renderBuyerPurchases() : role === "buyer" && view === "notebook" ? renderBuyerNotebook() : role === "buyer" && view === "buyer-plan" ? '<section class="buyer-plan page-shell" id="buyer-plan-root"></section>' : view === "transport" ? '<section class="section page-shell" id="transport-root"></section>' : view === "passport" ? renderPassport() : view === "list" ? renderListForm() : view === "offers" ? renderOffers() : view === "deals" ? renderDeals() : view === "storage" ? renderStorage() : view === "buyer-offers" ? renderBuyerOffers() : role === "buyer" ? renderBuyerHome() : renderFarmerHome();
  renderShell(content);
  if (role === "farmer" && view === "home") {
    document.querySelector(".hero-actions button").innerHTML = `${icon("plus", 19)}${t("আলু বাজারে দিন", "Put potatoes on the market")}`;
    document.querySelector(".farmer-portal .section-header h2").textContent = t("আমার লট", "My lots");
  }
  if (role === "buyer" && view === "buyer-plan") mountBuyerPlan(document.querySelector("#buyer-plan-root"), { language, lots: data.listings.map(lot => ({ ...lot, quantityKg: availableKg(lot, data.deals) })), deals: data.deals.filter(deal => !deal.sample), comparedIds: buyerCatalogue.compareLotIds, savedLotIds: buyerCatalogue.savedLotIds, photoSrc });
  if (role === "buyer" && view === "purchases") {
    data.deals.filter(deal => !deal.sample).forEach((deal, index) => {
      const card = document.querySelectorAll(".deal-card")[index];
      const saved = readBuyerTransport(deal.id);
      card?.querySelector(".deal-card-footer")?.insertAdjacentHTML("beforeend", `<button type="button" class="text-arrow" data-action="arrange-transport" data-id="${h(deal.id)}">${icon("truck", 18)}${t("পরিবহন ঠিক করুন", "Arrange transport")}</button>${saved ? `<span class="buyer-transport-record">${t("আপনার লেখা গাড়িভাড়া", "Buyer-reported fare")}: ${money(saved.fare)} · ${h(saved.operator || t("নাম নেই", "Unnamed"))} · ${h(saved.date)}</span>` : ""}`);
    });
  }
  restoreBuyerOfferDraft(document.querySelector("#offer-form"));
  if (highlightedOfferId) document.querySelector(`#offer-${CSS.escape(highlightedOfferId)}`)?.scrollIntoView({ block: "center" });
  enhanceLotTools();
  if (view === "transport") {
    if (role === "buyer") {
      const params = new URL(location.href).searchParams;
      const purchase = data.deals.find(deal => deal.id === params.get("transportPurchase") && !deal.sample);
      const lot = data.listings.find(item => item.id === (purchase?.lotId || params.get("transportLot")));
      const remaining = lot ? availableKg(lot, data.deals) : 0;
      const requestedKg = Number(params.get("transportKg"));
      mountBuyerTransport(document.querySelector("#transport-root"), { language, lot, purchase, purchases: data.deals.filter(deal => !deal.sample), quantityKg: requestedKg > 0 && requestedKg <= remaining ? requestedKg : remaining, provider: providers?.find(item => item.kind === "transport" && item.name === "Truck Lagbe"), onSelectPurchase: purchaseId => setView("transport", { purchaseId }) });
    } else {
      const lot = selectedLot();
      mountTransport(document.querySelector("#transport-root"), { language, lot, lots: visibleListings(), remaining: lot ? availableKg(lot, data.deals) : 0, offers: { selectedId: transportOfferId, items: visibleOffers().filter(offer => offer.lotId === lot?.id) }, prepareDemo });
    }
  }
  if (role === "farmer" && view === "home") document.querySelector(".choice-strip").insertAdjacentHTML("beforeend", `<button class="choice-card transport-home-link" data-view="transport"><span class="choice-icon green">${icon("truck", 26)}</span><strong>${t("গাড়ির হিসাব", "Plan transport")}</strong><small>${t("পথ, গাড়ির দর ও ভাগের খরচ", "Route, quotes and shared costs")}</small>${icon("arrow", 18)}</button>`);
  if (role === "farmer" && view === "offers") document.querySelectorAll(".offer-card").forEach((card, index) => {
    const offer = visibleOffers().filter(item => item.lotId === selectedLot()?.id)[index];
    if (offer) card.querySelector(".offer-bottom").insertAdjacentHTML("beforebegin", `<button class="text-arrow transport-offer-link" data-action="plan-transport" data-id="${h(offer.id)}">${icon("truck", 18)}${t("এই দরে গাড়ির খরচ দেখুন", "Plan transport for this offer")}</button>`);
  });
  if (view === "storage" && storageInputs) {
    const form = document.querySelector("#storage-form");
    for (const [key, value] of Object.entries(storageInputs)) form.elements[key].value = value;
    showStorageResult(form, storageInputs);
  }
  prepareDemo();
}

fetch("./providers.json")
  .then(response => { if (!response.ok) throw new Error("contacts unavailable"); return response.json(); })
  .then(items => { providers = Array.isArray(items) ? items : []; if (["transport", "storage"].includes(view)) render(); })
  .catch(() => { providers = []; if (["transport", "storage"].includes(view)) render(); });

function showStorageResult(form, input) {
  const result = storageBreakEven(input);
  form.querySelector("#storage-result").innerHTML = `<span>${t("পরে অন্তত এই দর লাগবে", "Future price needed to break even")}</span><strong>${rate(result.futurePriceKg)}<small>/${t("কেজি", "kg")}</small></strong><p>${t("আজ বিক্রি করলে", "Sell today")}: ${money(result.todayValue)} · ${t("সংরক্ষণ ও অন্য খরচ", "Storage and extra costs")}: ${money(result.storageCost)} · ${t("পরে বিক্রিযোগ্য অনুমান", "Estimated saleable later")}: ${kg(result.saleableKg)}</p><small>${t("সুদ, অজানা ফি বা দরের ওঠানামা ধরা নেই।", "Does not include financing, unknown fees or changing market prices.")}</small>`;
}

async function compressPhoto(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2_000_000) throw new Error(t("শুধু JPG, PNG বা WEBP ছবি দিন, সর্বোচ্চ ২ MB।", "Use a JPG, PNG or WEBP image under 2 MB."));
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signatureMatches = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === "image/png" ? [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte) : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!signatureMatches) throw new Error(t("ফাইলটি সঠিক ছবি নয়। অন্য ছবি দিন।", "This is not a valid image file. Choose another photo."));
  const bitmap = await createImageBitmap(file);
  if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 32_000_000) { bitmap.close(); throw new Error(t("ছবিটি খুব বড়। ছোট ছবি দিন।", "The image dimensions are too large. Choose a smaller photo.")); }
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.72, data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 725_000 && quality > 0.4) { quality -= 0.08; data = canvas.toDataURL("image/jpeg", quality); }
  if (data.length > 725_000) throw new Error(t("ছবিটি ছোট করে আবার দিন।", "This photo is too large after compression. Choose a smaller image."));
  return data;
}

async function farmerFormPhotos(form) {
  const files = [...form.elements.photo.files];
  if (files.length && files.length !== 3) throw new Error(t("নিজের হলে ঠিক ৩টি ছবি দিন।", "Choose exactly three of your own photos."));
  if (files.length) return Promise.all(files.map(async file => ({ src: await compressPhoto(file), addedAt: new Date().toISOString() })));
  if (demoPhotoSelection) return demoLotPhotos.map(src => ({ src, addedAt: new Date().toISOString() }));
  const previous = readLocalLots().find(lot => lot.id === editingLotId)?.photos;
  if (previous?.length) return previous;
  throw new Error(t("ক্রেতাদের জন্য আলুর ছবি দিন বা দেওয়া ৩টি ছবি ব্যবহার করুন।", "Add potato photos or use the three provided photos."));
}

function showFarmerLotPreview(form, photos) {
  const values = formValues(form);
  const factor = values.quantityUnit === "mon" ? 40 : values.quantityUnit === "bag" ? Number(values.bagKg) : 1;
  const quantity = Number(values.quantityKg) * factor;
  const low = Number(values.askingPriceMin), high = values.askingPriceMax ? Number(values.askingPriceMax) : low;
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(low) || low < 0 || !Number.isFinite(high) || high < low) throw new Error(t("পরিমাণ ও দর ঠিক করুন।", "Check the quantity and asking price."));
  const preview = form.querySelector("#farmer-lot-preview");
  preview.hidden = false;
  preview.innerHTML = `<p class="section-kicker">${t("ক্রেতার পাতায় এমন দেখাবে", "BUYER VIEW PREVIEW")}</p><div class="farmer-preview-layout"><div class="farmer-preview-photos">${photos.map((photo, index) => `<img src="${h(photoSrc(photo.src))}" alt="${h(t(`আলুর ছবি ${index + 1}`, `Potato photo ${index + 1}`))}" />`).join("")}</div><div><h3>${h(lotVariety({ variety: values.variety }))}</h3><p>${h(values.upazila)}, ${h(language === "bn" ? districtNamesBn[values.district] || values.district : values.district)}</p><dl><div><dt>${t("পাওয়া যাবে", "Available")}</dt><dd>${kg(quantity)}</dd></div><div><dt>${t("প্রস্তুত", "Ready")}</dt><dd>${prettyDate(values.readyDate)}</dd></div><div><dt>${t("চাওয়া দর · ২০০ কেজি", "Asking · 200 kg")}</dt><dd>${money(low * 200)}${high !== low ? `–${money(high * 200)}` : ""}</dd></div></dl><p>${h(values.sizeDescription || t("আকার দেওয়া হয়নি", "Size not provided"))} · ${h(values.notes || t("অবস্থা দেওয়া হয়নি", "Condition not provided"))}</p><small>${t("প্রকাশ করতে নিচের বোতাম চাপুন।", "Publish using the button below.")}</small></div></div>`;
  preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function validNumber(value, min, max) { const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : null; }
function formValues(form) { return Object.fromEntries(new FormData(form)); }
function getDeal(id) { return data.deals.find(deal => deal.id === id); }

document.addEventListener("click", async event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    if (viewButton.tagName === "A" && (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1)) return;
    if (viewButton.dataset.view === "list") { editingLotId = ""; demoPhotoSelection = false; }
    event.preventDefault(); setView(viewButton.dataset.view); return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.tagName === "A" && (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1)) return;
  const action = button.dataset.action;
  if (action === "step-lot-photo") {
    const gallery = button.closest(".buyer-detail-gallery");
    const slides = [...(gallery?.querySelectorAll("[data-gallery-slide]") || [])];
    if (slides.length > 1) {
      const index = (Number(gallery.dataset.photoIndex) + Number(button.dataset.direction) + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== index; });
      gallery.dataset.photoIndex = String(index);
      const counter = gallery.querySelector(".buyer-detail-photo-count");
      if (counter) counter.textContent = `${formatter.format(index + 1)} / ${formatter.format(slides.length)}`;
    }
    return;
  }
  if (action === "toggle-profile") {
    profileOpen = true;
    try {
      await loadSharedMarketplace();
      for (const item of catalogueRequests.filter(row => row.awaiting_user_id === sharedUserId && !row.is_read)) {
        await marketplaceRequest(`/catalogue-requests/${encodeURIComponent(item.id)}/read`, { method: "POST", body: JSON.stringify({ revision: item.version }) });
      }
      if (catalogueRequests.some(row => row.awaiting_user_id === sharedUserId && !row.is_read)) catalogueRequests = await marketplaceRequest("/catalogue-requests");
    } catch { /* The drawer still shows cached records when refresh is unavailable. */ }
    render(); return;
  }
  if (action === "close-profile") { profileOpen = false; render(); return; }
  if (action === "buyer-profile-tab") { buyerProfileTab = ["saved", "requests", "history"].includes(button.dataset.tab) ? button.dataset.tab : "saved"; render(); return; }
  if (action === "catalogue-response") {
    const request = catalogueRequests.find(item => item.id === button.dataset.id);
    if (!request) return;
    const response = button.dataset.response;
    if (response === "cancel" && !confirm(t("এই কেনার সম্মতি বাতিল করবেন?", "Cancel this agreed purchase?"))) return;
    button.disabled = true;
    try {
      await marketplaceRequest(`/catalogue-requests/${encodeURIComponent(request.id)}/respond`, { method: "POST", body: JSON.stringify({ action: response, revision: Number(button.dataset.revision) }) });
      notice = t(response === "accept" ? "অনুরোধ মেনে নেওয়া হয়েছে।" : response === "decline" ? "অনুরোধে না বলা হয়েছে।" : response === "withdraw" ? "অনুরোধ তুলে নেওয়া হয়েছে।" : "সম্মতি বাতিল হয়েছে।", response === "accept" ? "Request accepted." : response === "decline" ? "Request declined." : response === "withdraw" ? "Request withdrawn." : "Agreement cancelled.");
      await loadSharedMarketplace();
      profileOpen = true;
      render();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (action === "open-request-proposal") { proposalRequestId = button.dataset.id; render(); return; }
  if (action === "open-counter") { counterOfferId = button.dataset.id; render(); document.querySelector('[data-form="counter-offer"] input[name="quantityKg"]')?.focus(); return; }
  if (action === "cancel-counter") { counterOfferId = ""; render(); return; }
  if (action === "reveal-farmer-contact") {
    button.disabled = true;
    try {
      const contact = await marketplaceRequest(`/lots/${encodeURIComponent(button.dataset.id)}/contact`);
      const lot = data.listings.find(item => item.id === button.dataset.id);
      const mobile = typeof contact?.mobile === "string" ? contact.mobile : "";
      if (!lot || !validContactPhone(mobile)) throw new Error(t("কৃষক যোগাযোগের তথ্য প্রকাশ করেননি।", "The farmer has not shared contact details."));
      lot.contactPhone = mobile;
      if (typeof contact.contact_name === "string") lot.contactName = contact.contact_name;
      render();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (action === "respond-shared-offer") {
    const offer = data.offers.find(item => item.id === button.dataset.id);
    if (!offer || !sharedUserId) { requireMarketplaceSignIn(); return; }
    button.disabled = true;
    try {
      await marketplaceRequest(`/offers/${encodeURIComponent(offer.id)}/respond`, { method: "POST", body: JSON.stringify({ action: button.dataset.response, revision: offer.revision }) });
      notice = t(button.dataset.response === "accept" ? "দর মেনে নেওয়া হয়েছে; কেনাকাটার নথি তৈরি হয়েছে।" : "দরটি গ্রহণ করা হয়নি।", button.dataset.response === "accept" ? "Offer accepted; a shared purchase record was created." : "Offer declined.");
      await loadSharedMarketplace();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (action === "use-demo-lot") {
    const form = document.querySelector("#lot-form");
    if (!form) return;
    const example = { district: "Rangpur", upazila: "Pirganj", variety: "Diamant", quantityKg: "2000", quantityUnit: "kg", readyDate: todayPlus(0), harvestDate: todayPlus(-2), askingPriceMin: "22", askingPriceMax: "25", sizeDescription: "Medium and large; mostly uniform", notes: "Firm, dry, with only light surface marks", storageDescription: "Kept in a cool, ventilated store" };
    for (const [key, value] of Object.entries(example)) form.elements[key].value = value;
    form.elements.photo.value = "";
    form.elements.photo.required = false;
    demoPhotoSelection = true;
    form.classList.add("using-demo-photos");
    form.querySelector("#farmer-lot-preview").hidden = true;
    form.querySelector(".farmer-demo-photo-choice small").textContent = t("৩টি ছবি বেছে নেওয়া হয়েছে। চাইলে নিজের ছবি দিয়ে বদলান।", "Three photos selected. Upload your own to replace them.");
    return;
  }
  if (action === "preview-farmer-lot") {
    const form = document.querySelector("#lot-form");
    if (!form?.reportValidity()) return;
    button.disabled = true;
    try { showFarmerLotPreview(form, await farmerFormPhotos(form)); }
    catch (error) { notice = error.message; render(); }
    finally { button.disabled = false; }
    return;
  }
  if (action === "edit-demo-lot") { editingLotId = button.dataset.id; demoPhotoSelection = false; setView("list"); return; }
  if (action === "toggle-demo-lot") {
    const lot = readLocalLots().find(item => item.id === button.dataset.id);
    if (!lot) return;
    try { saveLocalLot({ ...lot, published: lot.published === false }); notice = lot.published === false ? t("লট আবার ক্রেতার তালিকায় দেখা যাবে।", "Lot is visible to buyers again.") : t("লট ক্রেতার তালিকা থেকে লুকানো হয়েছে।", "Lot hidden from the buyer catalogue."); render(); }
    catch { notice = t("লটের অবস্থা রাখা যায়নি।", "Could not save the listing status."); render(); }
    return;
  }
  if (action === "toggle-samples") { showSamples = !showSamples; selectedLotId = visibleListings()[0]?.id || ""; transportOfferId = ""; reviewOfferId = ""; render(); return; }
  if (action === "preview-transport") { const lot = data.listings.find(item => item.id === button.dataset.id); if (lot) { const form = document.querySelector("#catalogue-request-form"); const remaining = availableKg(lot, data.deals); const custom = form?.elements.quantityMode.value === "custom" ? Number(form.elements.quantityKg.value) : remaining; setView("transport", { lotId: lot.id, quantityKg: custom > 0 && custom <= remaining ? custom : remaining }); } return; }
  if (action === "arrange-transport") { if (getDeal(button.dataset.id)) setView("transport", { purchaseId: button.dataset.id }); return; }
  if (action === "plan-transport") { transportOfferId = button.dataset.id; setView("transport"); return; }
  if (action === "dictate-notes") { dictateNotes(button); return; }
  if (action === "view-passport") { selectedLotId = button.dataset.id; setView("passport"); return; }
  if (["download-passport", "share-passport", "print-passport"].includes(action)) { exportPassport(action); return; }
  if (action === "language") { const formState = captureFormState(); language = language === "bn" ? "en" : "bn"; setNumberFormat(); localStorage.setItem(langKey, language); localStorage.setItem("alusathi-lang", language); render(); restoreFormState(formState); if (role === "buyer" && view === "transport") for (const name of ["from", "to", "date"]) document.querySelector(`#buyer-transport-form [name="${name}"]`)?.dispatchEvent(new Event("change")); }
  if (action === "logout") { try { sessionStorage.removeItem(sessionKey); sessionStorage.removeItem("alusathi-role"); sessionStorage.setItem("alusathi-demo", "false"); } catch { /* Session can still end by leaving this page. */ } location.assign("/"); }
  if (action === "dismiss") { notice = ""; render(); }
  if (action === "reset" && confirm(t("এই ব্রাউজারের রাখা তথ্য মুছে আবার শুরু করবেন?", "Clear saved data in this browser and start over?"))) { data = initialData(); data.buyingRequests = []; data.buyerActivity = []; buyerLotRequests = []; buyerProfile = {}; buyerBrief = { variety: "", quantityKg: "", destination: "", district: "", purpose: "", readyDate: "", sort: "ready" }; buyerCatalogue = { savedLotIds: [], compareLotIds: [], recentLotIds: [], tab: "all" }; buyerOfferDraft = {}; editingLotId = ""; demoPhotoSelection = false; try { localStorage.removeItem(buyerProfileKey); localStorage.removeItem("alusathi-buyer-brief-v1"); localStorage.removeItem(buyerCatalogueKey); localStorage.removeItem(buyerOfferDraftKey); localStorage.removeItem(localLotsKey); localStorage.removeItem(buyerRequestsKey); } catch { /* Data remains editable in memory. */ } selectedLotId = data.listings[0].id; storageInputs = null; quoteOpen = false; save(); setView("home"); }
  if (action === "select-lot") { selectedLotId = button.dataset.id; setView("offers"); }
  if (action === "open-buyer-lot") { event.preventDefault(); draftLotId = ""; openBuyerLotDialog(button.dataset.id); return; }
  if (action === "make-buyer-offer") { event.preventDefault(); draftLotId = ""; openBuyerLotDialog(button.dataset.id, true); return; }
  if (action === "close-buyer-detail") { if (button === event.target || button.classList.contains("buyer-detail-close")) closeBuyerLotDialog(); return; }
  if (action === "toggle-save-lot") { const id = button.dataset.id; const wasSaved = buyerCatalogue.savedLotIds.includes(id); if (wasSaved) buyerCatalogue.savedLotIds = buyerCatalogue.savedLotIds.filter(item => item !== id); else if (buyerCatalogue.savedLotIds.length < 4) buyerCatalogue.savedLotIds = [id, ...buyerCatalogue.savedLotIds]; else notice = t("একসাথে সর্বোচ্চ ৪টি লট পছন্দে রাখা যায়।", "You can save up to four lots at once."); saveBuyerCatalogue(); if (wasSaved || buyerCatalogue.savedLotIds.includes(id)) recordBuyerActivity(wasSaved ? "lot_unsaved" : "lot_saved", { lotId: id }); render(); return; }
  if (action === "toggle-compare-lot") { const id = button.dataset.id; if (buyerCatalogue.compareLotIds.includes(id)) buyerCatalogue.compareLotIds = buyerCatalogue.compareLotIds.filter(item => item !== id); else if (buyerCatalogue.compareLotIds.length < 3) buyerCatalogue.compareLotIds.push(id); else notice = t("একসাথে সর্বোচ্চ ৩টি লট তুলনা করা যায়।", "You can compare up to three lots at once."); saveBuyerCatalogue(); render(); return; }
  if (action === "clear-comparison") { buyerCatalogue.compareLotIds = []; compareOpen = false; saveBuyerCatalogue(); render(); return; }
  if (action === "open-comparison") { if (buyerCatalogue.compareLotIds.length >= 2) { compareOpen = true; render(); document.querySelector(".buyer-comparison")?.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
  if (action === "close-comparison") { compareOpen = false; render(); return; }
  if (action === "buyer-page") { buyerPage = Number(button.dataset.page) || 1; render(); document.querySelector(".buyer-catalogue-controls")?.scrollIntoView({ block: "nearest" }); return; }
  if (action === "buyer-catalogue-tab") { buyerCatalogue.tab = ["all", "ready", "later", "saved"].includes(button.dataset.tab) ? button.dataset.tab : "all"; buyerPage = 1; saveBuyerCatalogue(); render(); return; }
  if (action === "clear-buyer-filter") { buyerBrief[button.dataset.key] = ""; buyerPage = 1; try { localStorage.setItem("alusathi-buyer-brief-v1", JSON.stringify(buyerBrief)); } catch { /* Filters stay available for this session. */ } render(); return; }
  if (action === "clear-buyer-filters") { buyerBrief = { variety: "", quantityKg: "", destination: "", district: "", purpose: "", readyDate: "", sort: buyerBrief.sort || "ready" }; buyerPage = 1; try { localStorage.setItem("alusathi-buyer-brief-v1", JSON.stringify(buyerBrief)); } catch { /* Filters stay available for this session. */ } render(); return; }
  if (action === "new-buyer-request") { buyerRequestOpen = true; editingBuyerRequestId = ""; render(); document.querySelector("#buyer-request-form select")?.focus(); return; }
  if (action === "edit-buyer-request") { buyerRequestOpen = true; editingBuyerRequestId = button.dataset.id; render(); document.querySelector("#buyer-request-form select")?.focus(); return; }
  if (action === "close-buyer-request") { if (button === event.target || button.closest(".modal-close") || button.tagName === "BUTTON") { buyerRequestOpen = false; editingBuyerRequestId = ""; render(); } return; }
  if (action === "toggle-buyer-request") { const request = data.buyingRequests.find(item => item.id === button.dataset.id); if (request) { request.status = request.status === "closed" ? "open" : "closed"; request.updatedAt = new Date().toISOString(); recordBuyerActivity(request.status === "closed" ? "buying_request_closed" : "buying_request_reopened", { buyingRequestId: request.id }); save(); render(); } return; }
  if (action === "contact-farmer") {
    const lot = data.listings.find(item => item.id === button.dataset.id);
    if (button.dataset.channel === "whatsapp" && lot && validContactPhone(lot.contactPhone)) {
      const form = document.querySelector(`#offer-form [name="lotId"][value="${CSS.escape(lot.id)}"]`)?.form;
      const quantity = Number(form?.elements.quantityKg?.value || buyerBrief.quantityKg);
      const price = Number(form?.elements.priceKg?.value);
      const pickupDate = String(form?.elements.pickupDate?.value || "");
      const lines = [t(`আলুসাথী লট ${lot.id}: ${lotVariety(lot)} আলু সম্পর্কে কথা বলতে চাই।`, `I want to discuss AluSathi lot ${lot.id}: ${lotVariety(lot)} potatoes.`)];
      if (Number.isFinite(quantity) && quantity > 0) lines.push(`${t("পরিমাণ", "Quantity")}: ${kg(quantity)}`);
      if (Number.isFinite(price) && price > 0) lines.push(`${t("প্রস্তাবিত দর", "Proposed price")}: ${rate(price)}/${t("কেজি", "kg")}`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) lines.push(`${t("সংগ্রহের তারিখ", "Requested collection date")}: ${prettyDate(pickupDate)}`);
      button.href = `https://wa.me/${whatsappPhone(lot.contactPhone)}?text=${encodeURIComponent(lines.join("\n"))}`;
    }
    recordBuyerActivity("farmer_contact_opened", { lotId: button.dataset.id, channel: button.dataset.channel }); return;
  }
  if (action === "offer-lot") { draftLotId = button.dataset.id; selectedLotId = button.dataset.id; if (role === "buyer" && buyerOfferDraft.lotId !== draftLotId) { buyerOfferDraft = { lotId: draftLotId }; try { localStorage.setItem(buyerOfferDraftKey, JSON.stringify(buyerOfferDraft)); } catch { /* Draft stays in memory. */ } } if (role === "buyer") { if (view !== "buyer-detail") openBuyerLot(button.dataset.id); else { render(); document.querySelector("#offer-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); } } else { render(); document.querySelector("#offer-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
  if (action === "edit-offer") { const offer = data.offers.find(item => item.id === button.dataset.id); if (offer && offer.status === "pending") { draftLotId = offer.lotId; selectedLotId = offer.lotId; openBuyerLot(offer.lotId); } return; }
  if (action === "withdraw-offer") { const offer = data.offers.find(item => item.id === button.dataset.id); if (!offer || !sharedUserId) { requireMarketplaceSignIn(); return; } try { await marketplaceRequest(`/offers/${encodeURIComponent(offer.id)}/respond`, { method: "POST", body: JSON.stringify({ action: "withdraw", revision: offer.revision }) }); notice = t("দর তুলে নেওয়া হয়েছে।", "Offer withdrawn."); await loadSharedMarketplace(); } catch (error) { notice = error.message; render(); } return; }
  if (action === "close-offer") { draftLotId = ""; render(); }
  if (action === "review-offer") { reviewOfferId = button.dataset.id; render(); document.querySelector(".modal input[name=quantityKg]")?.focus(); }
  if (action === "close-review" && (button === event.target || button.closest(".modal-close") || button.tagName === "BUTTON")) { reviewOfferId = ""; render(); }
  if (action === "confirm-pickup") {
    button.disabled = true;
    try { await marketplaceRequest(`/collections/${encodeURIComponent(button.dataset.id)}/confirm`, { method: "POST", body: "{}" }); notice = t("ওজন নিশ্চিত হয়েছে।", "Pickup confirmed."); await loadSharedMarketplace(); }
    catch (error) { notice = error.message; render(); }
    return;
  }
  if (action === "confirm-payment") {
    if (!confirm(t("নিজের হিসাবে টাকা পেয়েছেন? পেয়ে থাকলে তবেই নিশ্চিত করুন।", "Have you checked your account and received the money? Confirm only if you have."))) return;
    button.disabled = true;
    try { await marketplaceRequest(`/payments/${encodeURIComponent(button.dataset.id)}/confirm`, { method: "POST", body: "{}" }); notice = t("পেমেন্ট নিশ্চিত হয়েছে।", "Payment receipt confirmed."); await loadSharedMarketplace(); }
    catch (error) { notice = error.message; render(); }
    return;
  }
  if (action === "dispute") {
    const deal = getDeal(button.dataset.id); const issue = deal && prompt(t("কী মিলছে না?", "What does not match?"));
    if (deal && issue?.trim()) { try { await marketplaceRequest(`/purchases/${encodeURIComponent(deal.id)}/differences`, { method: "POST", body: JSON.stringify({ detail: issue.trim().slice(0, 300) }) }); notice = t("পার্থক্যটি উভয় পক্ষের নথিতে রাখা হয়েছে।", "Difference recorded for both participants."); await loadSharedMarketplace(); } catch (error) { notice = error.message; render(); } }
    return;
  }
  if (action === "print-deal") printDeal(button.dataset.id);
  if (action === "print-buyer-notebook") { window.print(); }
});

window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1) || "home";
  if (role === "buyer" && buyerViews.includes(next) && next !== view) { view = next; render(); }
  if (role === "farmer" && farmerViews.includes(next) && next !== view) { view = next; render(); if (view === "responses") loadSharedMarketplace(); }
});
window.addEventListener("popstate", () => {
  if (role === "farmer") { view = farmerViews.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home"; render(); if (view === "responses") loadSharedMarketplace(); return; }
  if (role !== "buyer") return;
  const next = location.hash.slice(1) || "home";
  const lotId = new URL(location.href).searchParams.get("lot");
  view = buyerViews.includes(next) ? next : "home";
  if (view === "buyer-detail" && lotId) selectedLotId = lotId;
  render();
});

document.addEventListener("change", event => {
  if (event.target.name === "photo" && event.target.form?.id === "lot-form" && event.target.files.length) {
    demoPhotoSelection = false;
    event.target.form.classList.remove("using-demo-photos");
    event.target.form.querySelector("#farmer-lot-preview").hidden = true;
  }
  if (event.target.id === "lot-switch") { selectedLotId = event.target.value; transportOfferId = ""; render(); }
  if (event.target.id === "buyer-sort") { buyerBrief.sort = ["recent", "ready", "quantity"].includes(event.target.value) ? event.target.value : "ready"; buyerPage = 1; try { localStorage.setItem("alusathi-buyer-brief-v1", JSON.stringify(buyerBrief)); } catch { /* Sort remains available for this session. */ } render(); }
  if (event.target.form?.id === "offer-form") event.target.dispatchEvent(new Event("input", { bubbles: true }));
});

document.addEventListener("input", event => {
  if (event.target.form?.id === "catalogue-request-form" && ["quantityKg", "quantityMode"].includes(event.target.name)) {
    const form = event.target.form;
    const custom = form.elements.quantityMode.value === "custom";
    const quantityField = form.elements.quantityKg;
    const quantity = custom ? validNumber(quantityField.value, 0.001, Number(form.dataset.maxKg)) : Number(form.dataset.maxKg);
    const lot = data.listings.find(item => item.id === form.dataset.lotId);
    if (quantity && lot) {
      const minimum = Number(lot.askingPriceMin ?? lot.askingPrice ?? 0);
      const maximum = Number(lot.askingPriceMax ?? lot.askingPrice ?? minimum);
      const low = Math.round(minimum * quantity * 100) / 100;
      const high = Math.round(maximum * quantity * 100) / 100;
      form.querySelector("[data-range]").textContent = low === high ? money(low) : `${money(low)}–${money(high)}`;
      form.elements.totalOffer.value = low.toFixed(2);
    }
  }
  if (event.target.form?.id === "offer-form") {
    const form = event.target.form, box = form.querySelector("#buyer-purchase-estimate");
    saveBuyerOfferDraft(form);
    if (box) {
      const quantity = Number(form.elements.quantityKg.value) || 0, accepted = Math.floor(quantity * (Number(form.elements.acceptedPercent.value) || 0) / 100), price = Number(form.elements.priceKg.value) || 0;
      const costs = Object.fromEntries(["transport", "loadingSacks", "taxes", "marketFees", "other"].map(key => [key, form.elements[`known_${key}`].checked ? 0 : (form.elements[`cost_${key}`].value === "" ? null : Number(form.elements[`cost_${key}`].value))]));
      const estimate = purchaseCost({ acceptedKg: accepted, priceKg: price, costs });
      box.textContent = estimate.total !== null && accepted > 0 && price > 0 ? `${t("গ্রহণ", "Accepted")}: ${kg(accepted)} · ${t("মোট", "Total")}: ${money(estimate.total)} · ${t("প্রতি কেজি", "Per accepted kg")}: ${rate(estimate.costPerAcceptedKg)}` : t("সব খরচ জানা হলে মোট দেখাবে।", "Total appears when every cost is known.");
    }
  }
  if (event.target.name !== "quantityKg" || event.target.form?.id !== "deal-form") return;
  updateReviewPreview(event.target.form);
});

document.addEventListener("change", event => {
  if (event.target.form?.id === "catalogue-request-form" && event.target.name === "quantityMode") {
    const form = event.target.form, custom = form.elements.quantityMode.value === "custom";
    const field = form.querySelector(".custom-quantity"); field.hidden = !custom;
    if (custom) form.elements.quantityKg.focus();
    else form.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (event.target.form?.id === "catalogue-request-form" && event.target.name === "quantityKg") event.target.dispatchEvent(new Event("input", { bubbles: true }));
  if (event.target.name === "quantityKg" && event.target.form?.id === "deal-form") updateReviewPreview(event.target.form);
});
document.addEventListener("keydown", event => {
  if (!reviewOfferId && !buyerRequestOpen && !buyerLotDialogId) return;
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return;
  if (event.key === "Escape") { event.preventDefault(); if (buyerLotDialogId) { closeBuyerLotDialog(); return; } reviewOfferId = ""; buyerRequestOpen = false; editingBuyerRequestId = ""; render(); return; }
  if (event.key !== "Tab") return;
  const focusable = [...dialog.querySelectorAll('button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])')].filter(item => !item.disabled);
  if (!focusable.length) return;
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.addEventListener("pagehide", () => { stopNotesVoice(); disposeTransport(); });

document.addEventListener("submit", async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const values = formValues(form);
  if (form.id === "catalogue-request-form") {
    const custom = values.quantityMode === "custom";
    const quantityKg = custom ? validNumber(values.quantityKg, 0.001, Number(form.dataset.maxKg)) : Number(form.dataset.maxKg);
    const totalOffer = validNumber(values.totalOffer, 0.01, 999999999999.99);
    if (!quantityKg || totalOffer === null) { notice = t("পরিমাণ ও মোট টাকা ঠিক করে দিন।", "Enter a valid quantity and total offer."); render(); return; }
    const lot = data.listings.find(item => item.id === form.dataset.lotId);
    if (!lot || quantityKg > availableKg(lot, data.deals)) { notice = t("লটটি আর পাওয়া যাচ্ছে না।", "This lot is no longer available."); render(); return; }
    const request = { id: uid(), lotId: lot.id, variety: lotVariety(lot), photo: lot.photos?.[0]?.src || lot.photo || "", district: lot.district || "", upazila: lot.upazila || "", quantityKg, totalOffer, createdAt: new Date().toISOString(), status: "pending" };
    buyerLotRequests = [request, ...buyerLotRequests];
    try { localStorage.setItem(buyerRequestsKey, JSON.stringify(buyerLotRequests)); }
    catch { buyerLotRequests = buyerLotRequests.filter(item => item.id !== request.id); notice = t("এই ব্রাউজারে অনুরোধটি রাখা যায়নি। জায়গা খালি করে আবার চেষ্টা করুন।", "Could not save this request in the browser. Free some storage and try again."); render(); return; }
    notice = t("প্রস্তাবটি রাখা হয়েছে। কৃষকের উত্তরের অপেক্ষায়।", "Proposal saved. Awaiting the farmer’s response.");
    buyerLotDialogId = "";
    setView("purchases");
    return;
  }
  if (form.dataset.form === "catalogue-resend") {
    try {
      await marketplaceRequest(`/catalogue-requests/${encodeURIComponent(form.dataset.id)}/respond`, { method: "POST", body: JSON.stringify({ action: "resend", revision: Number(form.dataset.revision), totalOffer: String(values.totalOffer) }) });
      notice = t("নতুন মোট প্রস্তাব পাঠানো হয়েছে।", "Revised total offer sent.");
      await loadSharedMarketplace(); profileOpen = true; render();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (form.dataset.form === "farmer-profile") {
    try {
      const result = await marketplaceRequest("/profile", { method: "PUT", body: JSON.stringify({ contactName: values.contactName, mobile: values.mobile, shareContact: values.shareContact === "on" }) });
      sharedProfile = Array.isArray(result) ? result[0] || {} : result || {};
      notice = t("যোগাযোগের পছন্দ সংরক্ষিত হয়েছে।", "Contact preference saved.");
      render();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (form.dataset.form === "counter-offer") {
    const offer = data.offers.find(item => item.id === form.dataset.id);
    const quantityKg = validNumber(values.quantityKg, 0.001, 1_000_000);
    const price = validNumber(values.price, 0, 100_000_000);
    if (!offer || offer.awaitingUserId !== sharedUserId || quantityKg === null || price === null) { notice = t("পাল্টা দরটির তথ্য যাচাই করুন।", "Check the counteroffer details."); render(); return; }
    try {
      await marketplaceRequest(`/offers/${encodeURIComponent(offer.id)}/respond`, { method: "POST", body: JSON.stringify({ action: "counter", revision: offer.revision, terms: { quantity_kg: quantityKg, price, price_unit: offer.priceUnit || "kg", price_unit_kg: offer.priceUnitKg || 1, pickup_date: values.pickupDate || "", pickup_responsibility: values.pickupResponsibility, payment_timing: values.paymentTiming, payment_method: values.paymentMethod, destination: String(values.destination || "").trim().slice(0, 180), notes: String(values.notes || "").trim().slice(0, 500), buyer_costs: offer.buyerCosts || {} } }) });
      counterOfferId = ""; notice = t("পাল্টা দর পাঠানো হয়েছে।", "Counteroffer sent."); await loadSharedMarketplace();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (!displayName) return;
  if (form.id === "buyer-brief-form") {
    const quantityKg = validNumber(values.quantityKg || 0, 0, 100000);
    if (quantityKg === null) { notice = t("পরিমাণ ঠিক করে দিন।", "Check the quantity."); render(); return; }
    buyerBrief = { variety: varieties.some(([value]) => value === values.variety) ? values.variety : "", quantityKg: quantityKg || "", district: districts.includes(values.district) ? values.district : "", destination: districts.includes(values.district) ? values.district : "", purpose: ["table", "seed", "processing"].includes(values.purpose) ? values.purpose : "", readyDate: /^\d{4}-\d{2}-\d{2}$/.test(values.readyDate || "") ? values.readyDate : "", sort: ["recent", "quantity"].includes(values.sort) ? values.sort : buyerBrief.sort || "ready" };
    buyerPage = 1;
    try { localStorage.setItem("alusathi-buyer-brief-v1", JSON.stringify(buyerBrief)); } catch { /* Filtering still works for this session. */ }
    render();
    document.querySelector("#buyer-brief-form")?.elements.variety?.focus();
    return;
  }
  if (form.id === "buyer-request-form") {
    const quantityKg = validNumber(values.quantityKg, 1, 100000);
    const priceKg = validNumber(values.priceKg, 1, 10000);
    const neededBy = /^\d{4}-\d{2}-\d{2}$/.test(values.neededBy || "") && values.neededBy >= todayPlus(0) ? values.neededBy : "";
    if (!quantityKg || !priceKg || !neededBy || !districts.includes(values.district) || String(values.destination || "").trim().length < 2) { notice = t("চাহিদার পরিমাণ, দর, জেলা, গন্তব্য ও তারিখ ঠিক করুন।", "Check the quantity, price, district, destination, and date."); return render(); }
    if (!sharedUserId) { try { localStorage.setItem("alusathi-buyer-request-draft-v1", JSON.stringify(values)); } catch { /* Draft is optional. */ } requireMarketplaceSignIn(); return; }
    if (values.requestId) { notice = t("অনলাইন চাহিদা এখন সরাসরি সম্পাদনা করা যায় না।", "Shared requests cannot be edited here yet."); render(); return; }
    const request = { id: existing?.id || uid(), variety: varieties.some(([value]) => value === values.variety) ? values.variety : "", purpose: ["table", "seed", "processing"].includes(values.purpose) ? values.purpose : "table", quantityKg, remainingKg: existing ? Math.min(quantityKg, Number(existing.remainingKg ?? quantityKg)) : quantityKg, priceKg, negotiable: values.negotiable === "yes", district: values.district, destination: String(values.destination).trim().slice(0, 100), neededBy, pickup: values.pickup === "farmer" ? "farmer" : "buyer", terms: String(values.terms || "").trim().slice(0, 300), status: existing?.status || "open", createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      await marketplaceRequest("/requests", { method: "POST", body: JSON.stringify({ requestId: request.id, request: { variety: request.variety, quantityKg, targetPrice: priceKg, district: request.district, destination: request.destination, neededDate: neededBy, notes: request.terms } }) });
      buyerRequestOpen = false; editingBuyerRequestId = ""; notice = t("কেনার চাহিদা কৃষকদের সঙ্গে ভাগ করা হয়েছে।", "Buying request shared with farmers."); await loadSharedMarketplace();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (form.dataset.form === "request-proposal") {
    const request = data.buyingRequests.find(item => item.id === form.dataset.id);
    const lot = data.listings.find(item => item.id === values.lotId && item.sellerId === sharedUserId);
    const quantityKg = validNumber(values.quantityKg, 0.001, Math.min(request?.remainingKg || 0, lot ? lot.quantityKg - lot.reservedKg : 0));
    const price = validNumber(values.price, 0, 100_000_000);
    if (!request || !lot || !quantityKg || price === null) { notice = t("লট, পরিমাণ ও দর মিলিয়ে দিন।", "Check the lot, quantity, and price."); render(); return; }
    try {
      await marketplaceRequest(`/requests/${encodeURIComponent(request.id)}/offers`, { method: "POST", body: JSON.stringify({ lotId: lot.id, idempotencyKey: uid(), terms: { quantity_kg: quantityKg, price, price_unit: "kg", price_unit_kg: 1, destination: request.destination, pickup_responsibility: "farmer", payment_method: "cash" } }) });
      proposalRequestId = ""; notice = t("ক্রেতার চাহিদার জন্য প্রস্তাব পাঠানো হয়েছে।", "Supply proposal sent to the buyer."); await loadSharedMarketplace();
    } catch (error) { notice = error.message; render(); }
    return;
  }
  if (form.id === "lot-form") {
    const goToMarket = event.submitter?.value === "market";
    const unitKg = values.quantityUnit === "mon" ? 40 : values.quantityUnit === "bag" ? validNumber(values.bagKg, 1, 100) : 1;
    const quantityKg = unitKg && validNumber(Number(values.quantityKg) * unitKg, 1, 100000);
    if (!quantityKg || !districts.includes(values.district) || !/^\d{4}-\d{2}-\d{2}$/.test(values.readyDate)) {
      form.elements.quantityKg.setCustomValidity(t("পরিমাণ ও একক মিলিয়ে দিন।", "Check the quantity and unit."));
      form.elements.quantityKg.reportValidity();
      return;
    }
    const askingPriceMin = validNumber(values.askingPriceMin, 0, 100000);
    const askingPriceMax = values.askingPriceMax === "" ? askingPriceMin : validNumber(values.askingPriceMax, 0, 100000);
    if (askingPriceMin === null || askingPriceMax === null || askingPriceMax < askingPriceMin) { notice = t("দর দিন এবং সর্বোচ্চ দরটি সর্বনিম্নের চেয়ে কম রাখবেন না।", "Enter a price and keep the maximum at or above the minimum."); render(); return; }
    for (const value of [values.harvestDate, values.photoTakenOn]) {
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value).getTime()) || new Date(value).toISOString().slice(0, 10) !== value || value > todayPlus(0))) { notice = t("তারিখ ঠিক করে দিন। ভবিষ্যতের তোলার তারিখ নয়।", "Check the dates. Harvest and photo dates cannot be in the future."); render(); return; }
    }
    try {
      form.querySelectorAll('[type="submit"]').forEach(button => { button.disabled = true; });
      const photos = await farmerFormPhotos(form);
      const localOnly = demoPhotoSelection || !!editingLotId || !sharedUserId;
      const oldLot = readLocalLots().find(item => item.id === editingLotId);
      const lot = { id: editingLotId || uid(), sample: localOnly, demoPublished: localOnly, demoPhotoSelection, published: oldLot?.published !== false, farmerName: sharedProfile.contact_name || "Farzana Begum", district: values.district, upazila: String(values.upazila).trim().slice(0, 60), variety: varieties.some(([value]) => value === values.variety) ? values.variety : t("জানা নেই", "Unknown"), purpose: "unknown", quantityKg, readyDate: values.readyDate, harvestDate: values.harvestDate || "", askingPriceMin, askingPriceMax, sizeDescription: String(values.sizeDescription || "").trim().slice(0, 120), conditionDescription: String(values.notes || "").trim().slice(0, 200), storageDescription: String(values.storageDescription || "").trim().slice(0, 200), notes: String(values.notes || "").trim().slice(0, 300), photo: photos[0]?.src || "", photos, createdAt: oldLot?.createdAt || new Date().toISOString() };
      if (localOnly) {
        try { saveLocalLot(lot); }
        catch { throw new Error(t("এই ব্রাউজারে ছবি রাখা যায়নি। ছোট ছবি দিয়ে আবার চেষ্টা করুন।", "Could not save the photos in this browser. Try smaller images.")); }
        selectedLotId = lot.id; editingLotId = ""; demoPhotoSelection = false;
        notice = t("লট এই ব্রাউজারের ক্রেতার তালিকায় দেখা যাবে। অন্য ডিভাইসে যাবে না।", "Lot is visible in the buyer catalogue in this browser, not on other devices.");
        if (goToMarket) window.location.href = "/farmer#market";
        else setView("home");
        return;
      }
      await marketplaceRequest("/lots", { method: "POST", body: JSON.stringify({ id: lot.id, district: lot.district, upazila: lot.upazila, variety: lot.variety, purpose: lot.purpose, quantityKg, readyDate: lot.readyDate, harvestDate: lot.harvestDate, sizeDescription: lot.sizeDescription, conditionDescription: lot.conditionDescription, storageDescription: lot.storageDescription, notes: lot.notes, photos, askingPriceMin, askingPriceMax, published: true }) });
      await loadSharedMarketplace();
      selectedLotId = lot.id;
      try { localStorage.removeItem("alusathi-lot-draft-v1"); } catch { /* Lot is already shared. */ }
      notice = t("আলুর লট প্রকাশিত হয়েছে; ছবিসহ ক্রেতারা দেখতে পারবেন।", "Your lot is published with its photos for buyers to see.");
      if (goToMarket) window.location.href = "/farmer#market";
      else setView("home");
    } catch (error) { notice = error.message; render(); }
  }
  if (form.id === "offer-form") {
    if (!sharedUserId) { try { localStorage.setItem(buyerOfferDraftKey, JSON.stringify(values)); } catch { /* Draft is optional. */ } requireMarketplaceSignIn(); return; }
    const lot = data.listings.find(item => item.id === values.lotId);
    const costValue = key => values[`known_${key}`] === "yes" ? 0 : (values[`cost_${key}`] === "" ? null : validNumber(values[`cost_${key}`], 0, 1000000));
    const buyerCosts = { transport: costValue("transport"), loadingSacks: costValue("loadingSacks"), taxes: costValue("taxes"), marketFees: costValue("marketFees"), other: costValue("other") };
    const fields = { quantityKg: validNumber(values.quantityKg, 1, lot ? availableKg(lot, data.deals) : 0), priceKg: validNumber(values.priceKg, 1, 10000), acceptedPercent: validNumber(values.acceptedPercent, 1, 100), transport: 0, handling: 0, fee: 0, paymentDays: validNumber(values.paymentDays, 0, 30), pickupDate: values.pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(values.pickupDate) ? values.pickupDate : "", paymentMethod: ["cash", "mfs", "bank"].includes(values.paymentMethod) ? values.paymentMethod : "cash" };
    if (!lot || Object.values(fields).some(value => value === null) || !districts.includes(values.district) || values.expires < todayPlus(0)) { notice = t("দরের তথ্য ঠিক করে আবার দিন।", "Check the offer details and try again."); return render(); }
    const offer = { id: uid(), sample: false, lotId: lot.id, buyer: String(values.buyer).trim().slice(0, 80), district: values.district, contact: profile, buyerCosts, ...fields, pickup: values.pickup === "farmer" ? "farmer" : "buyer", terms: String(values.terms).trim().slice(0, 400), expires: values.expires, createdAt: new Date().toISOString() };
    try {
      const saved = await marketplaceRequest("/offers", { method: "POST", body: JSON.stringify({ lotId: lot.id, idempotencyKey: uid(), terms: { quantity_kg: fields.quantityKg, price: fields.priceKg, price_unit: "kg", price_unit_kg: 1, pickup_date: fields.pickupDate, pickup_responsibility: fields.pickup === "farmer" ? "farmer" : "buyer", payment_timing: fields.paymentDays ? `${fields.paymentDays}_days` : "on_collection", payment_method: fields.paymentMethod, notes: offer.terms, buyer_costs: buyerCosts } }) });
      highlightedOfferId = saved.id; notice = t("দরটি কৃষকের কাছে পাঠানো হয়েছে।", "Offer sent to the farmer.");
      try { localStorage.removeItem(buyerOfferDraftKey); } catch { /* Offer is already shared. */ }
      await loadSharedMarketplace(); setView("buyer-offers"); return;
    } catch (error) { notice = error.message; render(); return; }
    data.offers.unshift(offer); if (!save()) { data.offers.shift(); return render(); }
    highlightedOfferId = offer.id;
    recordBuyerActivity("offer_submitted", { offerId: offer.id, lotId: lot.id });
    buyerProfile = profile;
    try { localStorage.setItem(buyerProfileKey, JSON.stringify(profile)); } catch { /* Offer remains saved; profile can be entered again. */ }
    draftLotId = ""; buyerOfferDraft = {}; try { localStorage.removeItem(buyerOfferDraftKey); } catch { /* Submitted offer is already saved. */ } notice = t("দর রাখা হয়েছে—নিচে আপনার দরটি দেখুন।", "Offer saved—your offer is highlighted below."); setView("buyer-offers");
  }
  if (form.id === "deal-form") {
    const offer = data.offers.find(item => item.id === values.offerId);
    if (!offer || offer.sample || !sharedUserId) { notice = t("এই দরটি আর ব্যবহার করা যাচ্ছে না।", "This offer is no longer available."); reviewOfferId = ""; render(); return; }
    try {
      await marketplaceRequest(`/offers/${encodeURIComponent(offer.id)}/respond`, { method: "POST", body: JSON.stringify({ action: "accept", revision: offer.revision }) });
      reviewOfferId = "";
      notice = t("দর মেনে নেওয়া হয়েছে। কেনাকাটার নথি তৈরি হয়েছে।", "Offer accepted. The shared purchase record is ready.");
      await loadSharedMarketplace(); setView(role === "buyer" ? "purchases" : "deals");
    } catch (error) { notice = error.message; reviewOfferId = ""; render(); }
  }
  if (form.dataset.form === "pickup") {
    const deal = getDeal(form.dataset.id);
    const grossKg = validNumber(values.grossKg, 0.001, deal?.quantityKg || 0);
    const tareKg = validNumber(values.tareKg || 0, 0, grossKg || 0);
    const deductionValue = validNumber(values.deductionValue || 0, 0, values.deductionType === "percent" ? 100 : grossKg || 0);
    if (!deal || !grossKg || tareKg === null || deductionValue === null) { notice = t("ওজন ও কাটতি মিলিয়ে দিন।", "Check the weight and deduction."); render(); return; }
    try {
      await marketplaceRequest(`/purchases/${encodeURIComponent(deal.id)}/collection`, { method: "POST", body: JSON.stringify({ idempotencyKey: uid(), pickup: { pickupDate: values.pickupDate || todayPlus(0), grossKg, tareKg, deductionType: values.deductionType === "percent" ? "percent" : "kg", deductionValue, note: String(values.note || "").trim().slice(0, 500), zeroWeightReason: String(values.zeroWeightReason || "").trim().slice(0, 200) } }) });
      notice = t("ওজনের প্রতিবেদন পাঠানো হয়েছে; অন্য পক্ষ নিশ্চিত করলে হিসাব হালনাগাদ হবে।", "Pickup report sent. Totals update after the other participant confirms it."); await loadSharedMarketplace();
    } catch (error) { notice = error.message; render(); }
  }
  if (form.dataset.form === "payment") {
    const deal = getDeal(form.dataset.id);
    const amount = validNumber(values.paymentAmount, 0, 100000000);
    if (!deal || amount === null || amount <= 0 || !String(values.paymentDate || "")) { notice = t("টাকার পরিমাণ ও তারিখ দিন।", "Enter a payment amount and date."); render(); return; }
    try {
      await marketplaceRequest(`/purchases/${encodeURIComponent(deal.id)}/payments`, { method: "POST", body: JSON.stringify({ idempotencyKey: uid(), amount, paymentDate: values.paymentDate, method: values.paymentMethod, reference: String(values.paymentRef || "").trim().slice(0, 80) }) });
      notice = t("পেমেন্টের তথ্য পাঠানো হয়েছে।", "Payment report sent for confirmation."); await loadSharedMarketplace();
    } catch (error) { notice = error.message; render(); }
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
  const exactTotal = deal.agreedTotal != null;
  const content = `<h1>${title}</h1><p>${h(t("শুধু পরীক্ষার জন্য—আসল কেনাবেচা বা আইনি চুক্তি নয়।", "For testing only—no real trade or legal contract."))}</p><dl><dt>${h(t("ক্রেতা", "Buyer"))}</dt><dd>${h(deal.offer.buyer)}</dd><dt>${h(t("আলু", "Potatoes"))}</dt><dd>${h(deal.variety)} · ${kg(deal.quantityKg)}</dd><dt>${h(exactTotal ? t("সম্মত মোট দাম", "Agreed total") : t("দর", "Price"))}</dt><dd>${exactTotal ? money(deal.agreedTotal) : `${rate(deal.offer.priceKg)}/kg`}</dd><dt>${h(t("আনুমানিক হাতে", "Estimated take-home"))}</dt><dd>${exactTotal ? money(potatoPaymentDue(deal)) : money(estimate.net)}</dd><dt>${h(t("ওজন / কাটতির নিয়ম", "Weight and deduction terms"))}</dt><dd>${h(deal.offer.terms)}</dd><dt>${h(t("পেমেন্ট", "Payment"))}</dt><dd>${deal.offer.paymentDays} ${h(t("দিনে", "days"))}</dd><dt>ID</dt><dd>${h(deal.id)}</dd></dl>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed"; frame.style.width = "0"; frame.style.height = "0"; frame.style.border = "0";
  document.body.append(frame);
  frame.contentDocument.write(`<!doctype html><html><head><title>${title}</title><style>body{font:18px sans-serif;padding:32px;color:#173d30}dt{font-weight:bold;margin-top:20px}dd{margin:4px 0;border-bottom:1px solid #ddd;padding-bottom:10px}</style></head><body>${content}</body></html>`);
  frame.contentDocument.close();
  frame.contentWindow.focus(); frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}

render();
if (role !== "choose") loadSharedMarketplace();
if (role !== "choose") {
  window.setInterval(() => { if (!document.hidden) loadSharedMarketplace(); }, 15_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadSharedMarketplace(); });
}
