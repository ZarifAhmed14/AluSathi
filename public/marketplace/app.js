import { initialData, estimateOffer, availableKg, storageBreakEven, todayPlus } from "./market.mjs";
import { offerSummary, offerTerms, passportBody, passportDocument, passportText } from "./lot-tools.mjs";
import { mountTransport, disposeTransport } from "./transport.mjs";
import { districtPlaces } from "./districts.mjs";
import { prepareDemoForms } from "./demo-forms.mjs";

const storeKey = "alusathi-marketplace-pilot-v1";
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
const photoSrc = value => typeof value === "string" && value.length < 1_400_000 && /^data:image\/jpeg;base64,[\w+/=]+$/.test(value) ? value : "";
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
let language = (localStorage.getItem("alusathi-lang") || localStorage.getItem(langKey)) === "en" ? "en" : "bn";
function setNumberFormat() {
  const locale = language === "bn" ? "bn-BD" : "en-BD";
  formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  rateFormatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
setNumberFormat();
const role = ["farmer", "buyer"].includes(document.body.dataset.role) ? document.body.dataset.role : "choose";
let showSamples = role === "farmer" && location.hash === "#samples";
const visibleListings = () => role !== "farmer" || showSamples ? data.listings : data.listings.filter(item => !item.sample);
const visibleOffers = () => role !== "farmer" || showSamples ? data.offers : data.offers.filter(item => !item.sample && !data.listings.find(lot => lot.id === item.lotId)?.sample);
const visibleDeals = () => role !== "farmer" || showSamples ? data.deals : data.deals.filter(item => !item.sample);
const sessionKey = `alusathi-market-demo-${role}`;
let displayName = role === "farmer" ? "কৃষক" : "ব্যবসায়ী";
try { if (role !== "choose") { sessionStorage.setItem("alusathi-role", role); sessionStorage.setItem("alusathi-demo", String(role === "farmer")); displayName = sessionStorage.getItem(sessionKey) || displayName; } } catch { /* Page remains usable without session storage. */ }
const buyerProfileKey = "alusathi-buyer-profile-v1";
let buyerProfile = {};
try { buyerProfile = JSON.parse(localStorage.getItem(buyerProfileKey) || "{}") || {}; } catch { buyerProfile = {}; }
let view = role === "farmer" && ["#transport", "#deals"].includes(location.hash) ? location.hash.slice(1) : "home";
let storageInputs = null;
let quoteOpen = false;
let selectedLotId = data.listings[0]?.id || "";
let draftLotId = "";
let reviewOfferId = "";
let notice = "";
let transportOfferId = "";
let buyerBrief = { variety: "", quantityKg: "", destination: "", district: "", purpose: "", readyDate: "", sort: "ready" };
try { buyerBrief = { ...buyerBrief, ...(JSON.parse(localStorage.getItem("alusathi-buyer-brief-v1") || "{}") || {}) }; } catch { /* Keep the blank brief. */ }

function lotMatchesBrief(lot) {
  const quantity = Number(buyerBrief.quantityKg) || 0;
  const variety = String(buyerBrief.variety || "").trim();
  const destination = String(buyerBrief.district || buyerBrief.destination || "").trim();
  const purpose = String(buyerBrief.purpose || "").trim();
  const readyDate = String(buyerBrief.readyDate || "").trim();
  return (!quantity || availableKg(lot, data.deals) >= quantity)
    && (!variety || lot.variety === variety)
    && (!destination || lot.district === destination)
    && (!purpose || lot.purpose === purpose || lot.purpose === "unknown")
    && (!readyDate || lot.readyDate <= readyDate);
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
  return { lines, known: values.every(value => Number.isFinite(Number(value)) && Number(value) >= 0), total: values.reduce((sum, value) => sum + (Number(value) || 0), 0) };
}

function buyerCostSummary(offer, lot) {
  const available = availableKg(lot, data.deals);
  const offeredKg = Math.min(Number(offer.quantityKg) || 0, available);
  const acceptedKg = Math.floor(offeredKg * Math.min(100, Math.max(0, Number(offer.acceptedPercent) || 0)) / 100);
  const costs = buyerCostState(offer);
  const total = costs.known ? acceptedKg * Math.max(0, Number(offer.priceKg) || 0) + costs.total : null;
  return { offeredKg, acceptedKg, total, costs, deliveredPerKg: total != null && acceptedKg ? total / acceptedKg : null };
}

function summaryBlock(offer, quantity, open = false) {
  return `<details class="spoken-summary" ${open ? "open" : ""}><summary>${t("সহজ কথায় এই দর", "This offer in simple words")}</summary><p class="summary-text">${h(offerSummary(offer, quantity, language))}</p></details>`;
}

function renderPassport() {
  const lot = selectedLot();
  if (!lot) return `<section class="section page-shell">${t("আগে আলুর তথ্য দিন।", "Add a potato lot first.")}</section>`;
  return `<section class="section page-shell passport-page"><div class="passport-actions"><button class="text-arrow" data-view="home">← ${t("তালিকায় ফিরুন", "Back to lots")}</button><button class="button button-outline button-small" data-action="download-passport">${t("ফাইল রাখুন", "Save file")}</button><button class="button button-green button-small" data-action="share-passport">${t("পরিচয়পত্র পাঠান", "Share passport")}</button><button class="text-arrow" data-action="print-passport">${t("ছাপুন / PDF", "Print / PDF")}</button></div>${passportBody(lot, data.offers.filter(offer => offer.lotId === lot.id), language)}</section>`;
}

function enhanceLotTools() {
  const form = document.querySelector("#lot-form");
  if (form) {
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
  if (view === "home") document.querySelectorAll(".lot-card").forEach((card, index) => {
    const lot = visibleListings()[index];
    if (!lot) return;
    card.querySelector(".lot-copy").insertAdjacentHTML("beforeend", `<button class="passport-link" data-action="view-passport" data-id="${h(lot.id)}">${t("আলুর পরিচয়পত্র দেখুন", "View lot passport")} →</button>`);
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
  const allowed = role === "farmer" ? ["home", "list", "offers", "transport", "storage", "deals", "passport"] : ["home", "buyer-offers", "deals", "passport"];
  if (!displayName || !allowed.includes(next)) return;
  view = next; reviewOfferId = ""; window.scrollTo({ top: 0, behavior: "smooth" }); render();
  const url = new URL(location.href); url.hash = next === "home" ? "" : next; history.replaceState(null, "", url);
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
function lotNotes(lot) { return lot.sample && language === "bn" ? "হিমাগারে রাখা আলু; মাঝারি ও বড় আকারের মিশ্রণ।" : lot.notes; }
function photoOrArtwork(lot, className = "lot-photo") {
  const photo = photoSrc(lot.photo);
  return photo ? `<img class="${className}" src="${photo}" alt="${t("আলুর ছবি", "Potato lot photo")}" />` : `<div class="${className} lot-art" aria-hidden="true"><span class="art-leaf leaf-a"></span><span class="art-leaf leaf-b"></span><span class="art-potato potato-a"></span><span class="art-potato potato-b"></span><span class="art-potato potato-c"></span></div>`;
}

function navButton(label, key, symbol) {
  return `<button class="nav-link ${view === key ? "active" : ""}" data-view="${key}" aria-current="${view === key ? "page" : "false"}">${icon(symbol, 18)}<span>${label}</span></button>`;
}

function renderShell(content) {
  const farmerNav = [["/farmer", t("আজকের কাজ", "Today"), "leaf"], ["/farmer#photos", t("ছবি", "Photos"), "bag"], ["/selling-preparation", t("বিক্রির আগে", "Before selling"), "truck"], ["/farmer#diary", t("খাতা", "Notebook"), "clock"]].map(([href, label, symbol]) => `<a class="nav-link ${href === "/selling-preparation" ? "active" : ""}" href="${href}" ${href === "/selling-preparation" ? 'aria-current="page"' : ""}>${icon(symbol, 18)}<span>${label}</span></a>`).join("");
  const buyerNav = [navButton(t("আলুর তালিকা", "Lots"), "home", "bag"), navButton(t("আমার দর", "My offers"), "buyer-offers", "scale"), navButton(t("চুক্তি", "Deals"), "deals", "shield")].join("");
  app.innerHTML = `
    <div class="site-wrap ${role}-portal">
      <header class="topbar">
        <button class="brand" data-view="home" aria-label="AluSathi marketplace home"><span class="brand-mark">${icon("leaf", 23)}</span><span><strong>আলুসাথী<span class="brand-dot">.</span></strong><small>${role === "farmer" ? t("কৃষকের পাতা", "Farmer page") : t("ক্রেতার পাতা", "Buyer page")}</small></span></button>
        <nav class="desktop-nav" aria-label="${t("প্রধান মেনু", "Main navigation")}">${role === "farmer" ? farmerNav : buyerNav}</nav>
        <div class="header-actions"><span class="account-name" aria-label="${t("বর্তমান পাতা", "Current role")}">${role === "farmer" ? t("কৃষক হিসেবে আছেন", "Farmer page") : t("ব্যবসায়ী হিসেবে আছেন", "Businessman page")}</span><button class="language-btn" data-action="language" aria-label="Change language">${language === "bn" ? "EN" : "বাংলা"}</button><button class="mode-button" data-action="logout">${icon("arrow", 15)}${role === "farmer" ? t("মূল পাতায় ফিরুন", "Main page") : t("বের হন", "Sign out")}</button></div>
      </header>
      ${notice ? `<div class="notice" role="status">${h(notice)}<button data-action="dismiss" aria-label="Dismiss">×</button></div>` : ""}
      <main id="main">${role === "farmer" ? `<div class="page-shell farmer-market-tools"><a href="/selling-preparation">← ${t("বিক্রির আগে", "Before selling")}</a><details><summary>${t("বিক্রির আরও সরঞ্জাম", "More selling tools")}</summary><div>${[navButton(t("আমার আলু", "My potatoes"), "home", "bag"), navButton(t("আলু যোগ করুন", "Add potatoes"), "list", "bag"), navButton(t("দর", "Offers"), "offers", "scale"), navButton(t("গাড়ি", "Transport"), "transport", "truck"), navButton(t("রাখা নথি", "Records"), "deals", "shield")].join("")}</div></details><button class="sample-switch" data-action="toggle-samples" aria-pressed="${showSamples}">${showSamples ? t("নমুনা লুকান", "Hide examples") : t("নমুনা দেখুন", "Show examples")}</button>${showSamples ? `<p class="sample-label">${t("নমুনা তথ্য — আসল ক্রেতার দর নয়", "Example data — not real buyer offers")}</p>` : ""}</div>` : ""}${content}</main>
      <footer class="footer"><div><strong>আলুসাথী বাজার</strong><p>${t("কৃষকের সিদ্ধান্ত, পরিষ্কার হিসাব।", "Your crop. Clear choices.")}</p></div><div><span>${t("শুধু এই ব্রাউজারে সেভ হয়", "Saved only in this browser")}</span><a class="main-return" href="${role === "farmer" ? "/farmer" : "/"}">${t("মূল অ্যাপে ফিরুন", "Back to AluSathi")}</a><button data-action="reset">${t("আবার শুরু করুন", "Start over")}</button></div></footer>
      <nav class="mobile-nav" aria-label="${t("মোবাইল মেনু", "Mobile navigation")}">${role === "farmer" ? farmerNav : buyerNav}</nav>
      ${reviewOfferId ? renderReview() : ""}
    </div>`;
  document.documentElement.lang = language;
}

function renderHero() {
  return `<section class="hero page-shell"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-line"></span>${t("বাংলাদেশের আলুর বাজার", "Bangladesh potato market")}</p><h1>${t("সঠিক দরে", "Sell your potatoes")}<br><em>${t("আলু বিক্রি করুন।", "with a clear price.")}</em></h1><p class="hero-lead">${t("আলুর তথ্য দিন। দর মিলিয়ে দেখুন। তারপর ক্রেতা বেছে নিন।", "Add your crop. Compare offers. Then choose a buyer.")}</p><div class="hero-actions"><button class="button button-gold" data-view="list">${icon("plus", 19)}${t("আলুর তথ্য দিন", "Add my potatoes")}</button></div></div><div class="hero-visual" role="img" aria-label="${t("আলুর ক্ষেতে একজন কৃষক", "A farmer in a potato field")}"></div></section>`;
}

function renderLotCard(lot) {
  const remaining = availableKg(lot, data.deals);
  const offerCount = data.offers.filter(offer => offer.lotId === lot.id).length;
  return `<article class="lot-card">${photoOrArtwork(lot)}<div class="lot-copy"><div class="card-topline"><span class="small-label">${lot.sample ? t("উদাহরণ · যাচাই হয়নি", "EXAMPLE · NOT VERIFIED") : t("এই ফোনে সেভ", "SAVED ON THIS DEVICE")}</span><span class="status-pill">${remaining ? t("বিক্রির জন্য আছে", "Available") : t("সবটা চুক্তিতে", "Committed")}</span></div><h3>${h(lotVariety(lot) || t("আলু", "Potatoes"))} <span>· ${kg(lot.quantityKg)}</span></h3><p>${icon("pin", 16)}${h(language === "bn" && lot.sample ? "পীরগঞ্জ" : lot.upazila)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} <span class="meta-dot">•</span> ${prettyDate(lot.readyDate)}</p><div class="lot-card-bottom"><span>${icon("bag", 16)} ${kg(remaining)} ${t("বাকি", "remaining")}</span><button class="text-arrow" data-action="select-lot" data-id="${h(lot.id)}">${formatter.format(offerCount)} ${t("টি দর দেখুন", "offers")}${icon("arrow", 16)}</button></div></div></article>`;
}

function renderFarmerHome() {
  const exampleOnly = visibleListings().length > 0 && visibleListings().every(lot => lot.sample);
  return `${renderHero()}<section class="section page-shell"><div class="section-header"><div><p class="section-kicker">${t("আপনার তালিকা", "YOUR LISTINGS")}</p><h2>${t("আলুর তালিকা", "Potato lots")}</h2><p>${exampleOnly ? t("নিচের আলুর তথ্য উদাহরণ হিসেবে রাখা। নিজের আলুর তথ্যও যোগ করতে পারেন।", "The lot below is an example, not a verified crop. Add your own potatoes too.") : t("আপনার আলুতে চাপ দিয়ে তার দর দেখুন।", "Tap your lot to see its offers.")}</p></div><button class="button button-outline" data-view="list">${icon("plus", 18)}${exampleOnly ? t("আমার আলুর তথ্য দিন", "Add my potatoes") : t("আরও আলু যোগ", "Add another lot")}</button></div><div class="lot-grid">${visibleListings().length ? visibleListings().map(renderLotCard).join("") : `<div class="empty-state">${t("এখনো আলুর তথ্য নেই।", "No lots yet.")}</div>`}</div></section><section class="choice-strip page-shell"><div class="choice-title"><p class="section-kicker">${t("এখন কী করবেন?", "WHAT NEXT?")}</p><h2>${t("দর দেখুন, নাকি কিছুদিন রাখুন?", "Compare offers or wait?")}</h2></div><button class="choice-card" data-view="offers"><span class="choice-icon gold">${icon("scale", 26)}</span><strong>${t("দর তুলনা", "Compare offers")}</strong><small>${t("কত টাকা হাতে পাবেন দেখুন", "See estimated money in hand")}</small>${icon("arrow", 18)}</button><button class="choice-card" data-view="storage"><span class="choice-icon green">${icon("warehouse", 26)}</span><strong>${t("হিমাগারে ফোন করুন", "Call a cold store")}</strong><small>${t("নম্বর ও যোগাযোগের তথ্য দেখুন", "See contacts and call directly")}</small>${icon("arrow", 18)}</button></section>`;
}

function renderListForm() {
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ধাপ ১ / আলুর তথ্য", "STEP 1 / YOUR POTATOES")}</p><h1>${t("কত আলু বিক্রি করবেন?", "What do you have to sell?")}</h1><p>${t("যা জানেন তাই লিখুন। ওজন নিশ্চিত হলে পরে নতুন তালিকা দিতে পারবেন।", "Enter what you know. This pilot keeps the record on this device only.")}</p></div><div class="inner-hero-mark">${icon("bag", 52)}</div></section><section class="form-layout page-shell lot-form-centered"><form id="lot-form" class="panel form-panel"><div class="form-intro"><span class="step-circle">1</span><div><h2>${t("আমার আলু", "My potato lot")}</h2><p>${t("ঠিকানা নয়—শুধু উপজেলা দেখানো হবে।", "Only your upazila is shown, not your exact address.")}</p></div></div><fieldset class="form-section"><legend>${t("কোথায়?", "Where?")}</legend><div class="form-grid"><label>${t("জেলা", "District")}<select name="district" required>${districtOptions()}</select></label><label>${t("উপজেলা", "Upazila")}<input name="upazila" required minlength="2" maxlength="60" placeholder="${t("যেমন: পীরগঞ্জ", "e.g. Pirganj")}" /></label></div></fieldset><fieldset class="form-section"><legend>${t("কী আলু, কতটা?", "What potatoes and how much?")}</legend><div class="form-grid"><label>${t("আলুর জাত", "Potato variety")}<select name="variety"><option value="">${t("জাত বেছে নিন", "Choose a variety")}</option>${varieties.map(([value, bn]) => `<option value="${value}">${h(t(bn, value))}</option>`).join("")}</select></label><label>${t("মোট পরিমাণ (কেজি)", "Quantity (kg)")}<input name="quantityKg" required type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="2000" /></label><label>${t("কবে বিক্রির জন্য প্রস্তুত?", "Ready date")}<input name="readyDate" required type="date" min="${todayPlus(0)}" value="${todayPlus(14)}" /></label></div><div class="lot-notes"><div class="notes-heading"><label for="lot-notes">${t("আলুর অবস্থা / আকার সম্পর্কে কিছু বলুন", "Size or condition")}</label><button type="button" class="button button-outline button-small" data-action="dictate-notes" aria-pressed="false">${t("বলুন", "Speak")}</button></div><textarea id="lot-notes" name="notes" rows="2" maxlength="300" placeholder="${t("যেমন: মাঝারি আকার বেশি, কিছু ছোট আছে", "e.g. Mostly medium potatoes, some small ones")}"></textarea><small class="notes-status" role="status">${t("বলতে চাপলে ফোনের ভয়েস সেবা মাইক্রোফোন ব্যবহার করবে। চাইলে লিখুন।", "Speak uses your phone’s voice service and microphone. You can also type.")}</small></div><label class="upload-box">${icon("plus", 21)}<span><strong>${t("একটি ছবি যোগ করুন", "Add one photo")}</strong><small>${t("ঐচ্ছিক · শুধু এই ফোনে থাকবে · সর্বোচ্চ ২ MB", "Optional · stays on this device · up to 2 MB")}</small></span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label></fieldset><button class="button button-green submit" type="submit">${t("তালিকা রাখুন", "Save lot")}${icon("arrow", 18)}</button></form></section>`;
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
    <div class="offer-top"><div><span class="small-label">${offer.sample ? t("উদাহরণ দর · আসল ক্রেতা নয়", "EXAMPLE OFFER · NOT A REAL BUYER") : t("ক্রেতার দেওয়া তথ্য · যাচাই হয়নি", "BUYER DETAILS · NOT VERIFIED")}</span><h3>${h(offer.sample && names[offer.id] ? names[offer.id] : offer.buyer)}</h3><p>${icon("pin", 15)}${h(language === "bn" ? districtNamesBn[offer.district] || offer.district : offer.district)}</p></div><span class="price-badge">${rate(offer.priceKg)}<small>/${t("কেজি", "kg")}</small></span></div>
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
  const matchedLots = data.listings.filter(lot => lotMatchesBrief(lot)).sort((a, b) => buyerBrief.sort === "quantity" ? availableKg(b, data.deals) - availableKg(a, data.deals) : String(a.readyDate).localeCompare(String(b.readyDate)));
  return `<section class="inner-hero buyer-hero page-shell"><div><p class="section-kicker">${t("ক্রেতার পাতা", "BUYER PAGE")}</p><h1>${t("সঠিক আলু, পরিষ্কার হিসাব।", "Buy with a clear cost.")}</h1><p>${t("কৃষকের আলু দেখুন, আপনার প্রয়োজন মিলিয়ে নিন, তারপর দর দিন।", "Browse farmer lots, match your need, then make an offer.")}</p><div class="hero-mini-points"><span>${icon("check", 15)}${t("পরিমাণ ও ঠিকানা", "Quantity and place")}</span><span>${icon("scale", 15)}${t("গ্রহণ করা প্রতি কেজির খরচ", "Cost per accepted kg")}</span><span>${icon("shield", 15)}${t("শর্ত লিখে রাখুন", "Terms in writing")}</span></div></div><div class="inner-hero-mark">${icon("truck", 52)}</div></section><section class="section page-shell buyer-workspace"><div class="buyer-brief panel"><div class="section-header"><div><p class="section-kicker">${t("আপনার প্রয়োজন", "YOUR BUYING BRIEF")}</p><h2>${t("কী আলু খুঁজছেন?", "What are you buying?")}</h2></div><span class="brief-status">${matchedLots.length} ${t("টি মিল", "matches")}</span></div><form id="buyer-brief-form" class="brief-grid"><label>${t("জেলা", "District")}<select name="district"><option value="">${t("যেকোনো জেলা", "Any district")}</option>${districts.map(d => `<option value="${h(d)}" ${buyerBrief.district === d || (!buyerBrief.district && buyerBrief.destination === d) ? "selected" : ""}>${h(language === "bn" ? districtNamesBn[d] || d : d)}</option>`).join("")}</select></label><label>${t("জাত", "Variety")}<select name="variety"><option value="">${t("যেকোনো জাত", "Any variety")}</option>${varieties.map(([value,bn]) => `<option value="${h(value)}" ${buyerBrief.variety === value ? "selected" : ""}>${h(t(bn,value))}</option>`).join("")}</select></label><label>${t("কমপক্ষে কত কেজি", "Minimum quantity (kg)")}<input name="quantityKg" type="number" min="0" max="100000" step="1" value="${h(buyerBrief.quantityKg)}" placeholder="${t("যেমন ১০০০", "e.g. 1000")}" /></label><label>${t("ব্যবহার", "Purpose")}<select name="purpose"><option value="">${t("যেকোনো ব্যবহার", "Any purpose")}</option><option value="table" ${buyerBrief.purpose === "table" ? "selected" : ""}>${t("খাওয়ার আলু", "Food")}</option><option value="seed" ${buyerBrief.purpose === "seed" ? "selected" : ""}>${t("বীজ আলু", "Seed")}</option><option value="processing" ${buyerBrief.purpose === "processing" ? "selected" : ""}>${t("প্রক্রিয়াজাত", "Processing")}</option></select></label><label>${t("প্রস্তুত হওয়ার মধ্যে", "Ready by")}<input name="readyDate" type="date" value="${h(buyerBrief.readyDate)}" /></label><label>${t("সাজান", "Sort")}<select name="sort"><option value="ready" ${buyerBrief.sort !== "quantity" ? "selected" : ""}>${t("আগে প্রস্তুত", "Ready soonest")}</option><option value="quantity" ${buyerBrief.sort === "quantity" ? "selected" : ""}>${t("বেশি কেজি", "Most kg")}</option></select></label><button class="button button-green brief-submit" type="submit">${t("তালিকা মিলিয়ে দেখুন", "Match lots")}${icon("arrow", 17)}</button></form><p class="brief-note">${t("তালিকায় থাকা তথ্যই দেখানো হয়—দূরত্ব, গ্রেড বা লাইভ মজুত ধরে নেওয়া হয় না।", "Only entered lots are shown; distance, grade, and live stock are not inferred.")}</p></div><div class="section-header buyer-lots-heading"><div><p class="section-kicker">${t("কৃষকের আলু", "FARMER LOTS")}</p><h2>${t("বিক্রির জন্য তালিকা", "Available lots")}</h2></div><span class="small-label">${matchedLots.length ? t("মিল পাওয়া গেছে", "MATCHES FOUND") : t("মিল নেই", "NO MATCH")}</span></div><div class="lot-grid">${matchedLots.length ? matchedLots.map(lot => `<article class="lot-card">${photoOrArtwork(lot)}<div class="lot-copy"><div class="card-topline"><span class="small-label">${lot.sample ? t("উদাহরণ · যাচাই হয়নি", "EXAMPLE · NOT VERIFIED") : t("এই ফোনে লেখা", "ENTERED HERE")}</span><span class="status-pill">${kg(availableKg(lot, data.deals))} ${t("বাকি", "left")}</span></div><h3>${h(lotVariety(lot))} <span>· ${kg(lot.quantityKg)}</span></h3><p>${icon("pin", 16)}${h(language === "bn" && lot.sample ? "পীরগঞ্জ" : lot.upazila)}, ${h(language === "bn" ? districtNamesBn[lot.district] || lot.district : lot.district)} · ${prettyDate(lot.readyDate)}</p><div class="lot-card-bottom"><span>${h(lotNotes(lot) || t("বিস্তারিত নেই", "No notes"))}</span><button class="text-arrow" data-action="offer-lot" data-id="${h(lot.id)}">${t("দর দিন", "Make offer")}${icon("arrow", 16)}</button></div></div></article>`).join("") : `<div class="empty-state"><h3>${t("এই চাহিদায় কোনো তালিকা নেই", "No lot matches this brief")}</h3><p>${t("চাহিদা কমিয়ে আবার মিলিয়ে দেখুন।", "Loosen the brief and try again.")}</p></div>`}</div>${draftLotId ? renderOfferForm() : ""}</section>`;
}

function renderBuyerProfile() {
  return `<fieldset class="form-section buyer-profile"><legend>${t("যোগাযোগ ও ঠিকানা", "Contact and address")}</legend><p>${t("প্রথম দর দেওয়ার সময় লিখুন। পরেরবার আর লিখতে হবে না।", "Add this on your first offer. It will be saved for later offers.")}</p><div class="form-grid"><label>${t("যোগাযোগের ব্যক্তির নাম", "Contact person")}<input name="contactPerson" required minlength="2" maxlength="80" autocomplete="name" value="${h(buyerProfile.contactPerson || "")}" /></label><label>${t("মোবাইল নম্বর", "Mobile number")}<input name="contactPhone" required inputmode="tel" autocomplete="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" title="Bangladesh mobile number" value="${h(buyerProfile.contactPhone || "")}" /></label><label>${t("উপজেলা / থানা", "Upazila / area")}<input name="buyerUpazila" required minlength="2" maxlength="80" value="${h(buyerProfile.buyerUpazila || "")}" /></label><label>${t("বাজার বা সংগ্রহের ঠিকানা", "Market or collection address")}<input name="buyerAddress" required minlength="5" maxlength="180" value="${h(buyerProfile.buyerAddress || "")}" /></label></div><small>${t("এই তথ্য ব্রাউজারে থাকে; পরিচয় যাচাই হয় না।", "These details stay in this browser; identity is not verified.")}</small></fieldset>`;
}

function renderOfferForm() {
  const lot = data.listings.find(item => item.id === draftLotId);
  if (!lot) return "";
  const remaining = availableKg(lot, data.deals);
  const cost = (name, bn, en) => `<label>${t(bn, en)}<input name="cost_${name}" type="number" min="0" max="1000000" step="1" inputmode="numeric" placeholder="${t("অজানা", "Unknown")}" /><span class="cost-confirm"><input name="known_${name}" type="checkbox" value="yes" /> ${t("খরচ নেই", "No charge")}</span></label>`;
  return `<form id="offer-form" class="panel offer-form"><input type="hidden" name="lotId" value="${h(lot.id)}" /><div class="section-header"><div><p class="section-kicker">${t("এই আলুর জন্য দর", "OFFER FOR THIS LOT")}</p><h2>${h(lot.variety)} · ${kg(remaining)}</h2></div><button type="button" class="text-arrow" data-action="close-offer">${t("বন্ধ করুন", "Close")}</button></div><fieldset class="form-section"><legend>${t("১ · দর ও পরিমাণ", "1 · Price and quantity")}</legend><div class="form-grid"><label>${t("আপনার ব্যবসার নাম", "Business name")}<input name="buyer" required minlength="2" maxlength="80" placeholder="${t("ক্রেতা", "Buyer")}" /></label><label>${t("ক্রেতার জেলা", "Buyer district")}<select name="district">${districtOptions("Bogura")}</select></label><label>${t("যত কেজি নিতে চান", "Quantity you can buy (kg)")}<input name="quantityKg" required type="number" min="1" max="${remaining}" step="1" inputmode="numeric" value="${Math.min(remaining, 1000)}" /></label><label>${t("দর (টাকা/কেজি)", "Price (BDT/kg)")}<input name="priceKg" required type="number" min="1" max="10000" step="0.01" inputmode="decimal" placeholder="25" /></label></div></fieldset><fieldset class="form-section"><legend>${t("২ · নেওয়া ও টাকা", "2 · Pickup and payment")}</legend><div class="form-grid"><label>${t("আনুমানিক কত % আলু নেবেন?", "How much of the lot will you take? (%)")}<input name="acceptedPercent" required type="number" min="1" max="100" step="1" inputmode="numeric" value="100" /></label><label>${t("কে আলু নিয়ে যাবেন?", "Who collects?")}<select name="pickup"><option value="buyer">${t("ক্রেতা", "Buyer")}</option><option value="farmer">${t("কৃষক পাঠাবেন", "Farmer delivers")}</option></select></label><label>${t("চাইবার তারিখ", "Requested pickup date")}<input name="pickupDate" type="date" min="${todayPlus(0)}" /></label><label>${t("টাকা দেওয়ার মাধ্যম", "Payment method")}<select name="paymentMethod"><option value="cash">${t("নগদ", "Cash")}</option><option value="mfs">${t("মোবাইল ওয়ালেট", "Mobile wallet")}</option><option value="bank">${t("ব্যাংক", "Bank")}</option></select></label><label>${t("টাকা কত দিনে দেবেন?", "Payment within how many days?")}<input name="paymentDays" required type="number" min="0" max="30" step="1" inputmode="numeric" value="0" /></label></div></fieldset><fieldset class="form-section"><legend>${t("৩ · আপনার আলাদা খরচ", "3 · Your separate costs")}</legend><p class="form-note">${t("দরদাতার কাছ থেকে পাওয়া কোট লিখুন। ফাঁকা মানে জানা নেই; কেবল নিশ্চিত হলে ‘খরচ নেই’ টিক দিন।", "Enter quoted buyer costs. Blank means unknown; tick ‘No charge’ only when confirmed.")}</p><div class="form-grid cost-grid">${cost("transport", "পরিবহন", "Transport")}${cost("loadingSacks", "লোড / বস্তা", "Loading / sacks")}${cost("taxes", "কর", "Taxes")}${cost("marketFees", "বাজার ফি", "Market fees")}${cost("other", "অন্যান্য", "Other")}</div><div id="buyer-purchase-estimate" class="buyer-purchase-estimate" aria-live="polite">${t("সব খরচ জানা হলে মোট দেখাবে।", "Total appears when every cost is known.")}</div><label>${t("দরের শেষ দিন", "Offer expires")}<input name="expires" required type="date" min="${todayPlus(0)}" value="${todayPlus(7)}" /></label><label>${t("গ্রেড, ওজন ও কাটতির নিয়ম", "Grade, weighing and deduction terms")}<textarea name="terms" required maxlength="400" rows="3" placeholder="${t("যেমন: মাঝারি আলু; ওজনের সময় কাটতি হলে ছবি দেবেন", "e.g. Medium potatoes; show photos for any rejection at weighing")}"></textarea></label></fieldset><p class="form-warning">${t("দর, যোগাযোগ ও নথি শুধু এই ব্রাউজারে থাকবে। আলুসাথী টাকা পাঠায় না, স্টক যাচাই করে না।", "Offers, contacts and records stay in this browser. AluSathi does not send money or verify stock.")}</p><button class="button button-green submit" type="submit">${t("দর রাখুন", "Save offer")}${icon("arrow", 18)}</button></form>`;
}

function renderBuyerOffers() {
  const offers = data.offers;
  return `<section class="inner-hero page-shell"><div><p class="section-kicker">${t("ক্রেতার বোর্ড", "BUYER BOARD")}</p><h1>${t("দর, খরচ ও পরিস্থিতি", "Offers and buying scenarios")}</h1><p>${t("তিনটি উদাহরণে মোট খরচ দেখুন, তারপর নিজের দর লিখুন।", "Review three examples, then enter your own offer.")}</p></div><div class="inner-hero-mark">${icon("scale", 52)}</div></section><section class="section page-shell"><div class="offer-grid">${offers.length ? offers.map(offer => { const lot = data.listings.find(item => item.id === offer.lotId); return lot ? renderOfferCard(offer, lot) : ""; }).join("") : `<div class="empty-state"><h2>${t("এখনো দর দেননি", "No offers entered yet")}</h2><button class="button button-green" data-view="home">${t("আলুর তালিকা দেখুন", "Browse lots")}</button></div>`}</div></section>`;
}

function renderReview() {
  const offer = data.offers.find(item => item.id === reviewOfferId);
  const lot = offer && data.listings.find(item => item.id === offer.lotId);
  if (!lot) return "";
  const remaining = availableKg(lot, data.deals);
  const quantity = offerRemainingKg(offer, lot);
  const result = estimateOffer(offer, quantity);
  if (!quantity) return `<div class="modal-backdrop" data-action="close-review"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button class="modal-close" data-action="close-review" aria-label="Close">×</button><h2 id="review-title">${t("এই দর আর নেওয়া যাবে না", "This offer is no longer available")}</h2><p>${t("এই ক্রেতার চাওয়া পরিমাণ বা জমির বাকি আলু অন্য চুক্তিতে চলে গেছে।", "The buyer's requested amount or the farmer's remaining potatoes are already committed.")}</p><div class="modal-actions"><button type="button" class="button button-green" data-action="close-review">${t("ফিরে যান", "Go back")}</button></div></div></div>`;
  return `<div class="modal-backdrop" data-action="close-review"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button class="modal-close" data-action="close-review" aria-label="Close">×</button><p class="section-kicker">${t("চুক্তির আগে মিলিয়ে নিন", "CHECK BEFORE AGREEING")}</p><h2 id="review-title">${t("এই শর্তে বিক্রি করবেন?", "Agree to these terms?")}</h2><p>${t("এটি এখানে রাখা নথি; এর মাধ্যমে টাকা দেওয়া হয় না।", "This is a record saved here; it does not send a payment.")}</p><form id="deal-form"><input type="hidden" name="offerId" value="${h(offer.id)}" /><label>${t("এই দর থেকে কত কেজি বিক্রি করবেন?", "How many kilograms from this offer?")}<input name="quantityKg" required type="number" min="1" max="${quantity}" value="${quantity}" step="1" inputmode="numeric" /></label><div class="form-grid deal-terms-input"><label>${t("চাইবার তারিখ", "Requested pickup date")}<input name="pickupDate" type="date" min="${todayPlus(0)}" value="${h(offer.pickupDate || "")}" /></label><label>${t("টাকা দেওয়ার মাধ্যম", "Payment method")}<select name="paymentMethod"><option value="cash" ${offer.paymentMethod === "cash" ? "selected" : ""}>${t("নগদ", "Cash")}</option><option value="mfs" ${offer.paymentMethod === "mfs" ? "selected" : ""}>${t("মোবাইল ওয়ালেট", "Mobile wallet")}</option><option value="bank" ${offer.paymentMethod === "bank" ? "selected" : ""}>${t("ব্যাংক", "Bank")}</option></select></label></div><div class="deal-summary"><div><span>${t("ক্রেতা", "Buyer")}</span><strong>${h(offer.buyer)} ${offer.sample ? `(${t("আগে থেকে রাখা", "starting offer")})` : ""}</strong></div><div><span>${t("দর", "Price")}</span><strong>${rate(offer.priceKg)}/${t("কেজি", "kg")}</strong></div><div><span>${t("বর্তমান আনুমানিক হাতে", "Current estimated take-home")}</span><strong data-preview-net>${money(result.net)}</strong></div><div><span>${t("ওজন ও কাটতির নিয়ম", "Weight or deduction terms")}</span><strong>${h(offer.terms)}</strong></div><div><span>${t("টাকা পাওয়ার সময়", "Payment timing")}</span><strong>${offer.paymentDays === 0 ? t("সেদিন", "Same day") : `${offer.paymentDays} ${t("দিন", "days")}`}</strong></div></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-review">${t("আরও দেখি", "Keep looking")}</button><button type="submit" class="button button-green">${t("চুক্তির নথি রাখুন", "Save deal record")}</button></div></form></div></div>`;
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
  if (deal.status === "agreed" && role === "buyer") action = `<form class="inline-form" data-form="pickup" data-id="${h(deal.id)}"><label>${t("মাপা ওজন (কেজি)", "Accepted weight (kg)")}<input name="actualAcceptedKg" type="number" min="1" max="${deal.quantityKg}" value="${deal.quantityKg}" required /></label><label>${t("ওজন / কাটতির কথা", "Weight or rejection note")}<input name="pickupNote" maxlength="180" placeholder="${t("যেমন: ১০ কেজি বাদ", "e.g. 10 kg rejected")}" /></label><button class="button button-green button-small">${t("ওজন পাঠান", "Submit weight")}</button></form>`;
  if (deal.status === "pickup_pending" && role === "farmer") action = `<div class="action-box"><p>${t("ক্রেতা বলছেন গ্রহণ করেছেন", "Buyer reports accepted")}: <strong>${kg(deal.actualAcceptedKg)}</strong>. ${h(deal.pickupNote || "")}</p><button class="button button-green button-small" data-action="confirm-pickup" data-id="${h(deal.id)}">${t("ওজন মেনে নিন", "Approve weight")}</button><button class="text-arrow" data-action="dispute" data-id="${h(deal.id)}">${t("মিলছে না—সহায়তা চাই", "Dispute this")}</button></div>`;
  if (deal.status === "collected" && role === "buyer") { const due = Math.max(0, actualNet); const paid = Math.max(0, Number(deal.paidAmount) || 0); const balance = Math.max(0, due - paid); action = `<form class="inline-form" data-form="payment" data-id="${h(deal.id)}"><p>${t("বাকি টাকা", "Remaining balance")}: <strong>${money(balance)}</strong></p><label>${t("পাঠানো টাকার পরিমাণ", "Amount sent (BDT)")}<input name="paymentAmount" type="number" min="1" max="${balance}" value="${balance}" required /></label><label>${t("লেনদেন নম্বর / রসিদ", "Payment reference")}<input name="paymentRef" maxlength="80" required /></label><button class="button button-green button-small">${t("টাকার কথা রাখুন", "Record payment")}</button></form>`; }
  if (deal.status === "payment_pending" && role === "farmer") action = `<div class="action-box"><p>${t("ক্রেতা পাঠানোর কথা লিখেছেন", "Buyer claims to have sent")}: <strong>${money(deal.paymentAmount)}</strong> · ${t("মোট পাওয়া", "Total recorded")}: <strong>${money(deal.paidAmount)}</strong> · ${t("বাকি", "Remaining")}: <strong>${money(deal.remainingBalance)}</strong> · ${t("রেফারেন্স", "Reference")}: ${h(deal.paymentRef)}. ${t("নিজের হিসাবে টাকা দেখে তারপর নিশ্চিত করুন।", "Check your own account before confirming.")}</p><button class="button button-green button-small" data-action="confirm-payment" data-id="${h(deal.id)}">${t("টাকা পেয়েছি", "I received the money")}</button><button class="text-arrow" data-action="dispute" data-id="${h(deal.id)}">${t("পাইনি—সমস্যা লিখুন", "Not received")}</button></div>`;
  const costs = buyerCostState(offer);
  return `<article class="deal-card"><div class="deal-card-header"><div><span class="small-label">${t("চুক্তির নথি", "DEAL RECORD")}</span><h3>${h(offer.buyer)} <span>· ${h(deal.variety)}</span></h3></div><span class="status-pill ${deal.status === "paid" ? "status-paid" : ""}">${dealStatus(deal)}</span></div><div class="deal-facts"><div><span>${t("চুক্তির পরিমাণ", "Agreed quantity")}</span><strong>${kg(deal.quantityKg)}</strong></div><div><span>${t("দর", "Price")}</span><strong>${rate(offer.priceKg)}/${t("কেজি", "kg")}</strong></div><div><span>${t("হাতে আসার হিসাব", "Estimated take-home")}</span><strong>${money(estimate.net)}</strong></div><div><span>${t("আসল গ্রহণ", "Accepted at pickup")}</span><strong>${deal.actualAcceptedKg == null ? t("এখনো নয়", "Not yet") : kg(deal.actualAcceptedKg)}</strong></div></div><p class="deal-terms">${icon("shield", 18)}${h(offer.terms)} · ${t("ক্রেতার আলাদা খরচ", "Buyer costs")}: ${costs.known ? money(costs.total) : t("জানা নেই", "Unknown")} · ${t("তোলা", "Pickup")}: ${h(deal.pickupDate ? prettyDate(deal.pickupDate) : t("তারিখ নেই", "Not set"))} · ${t("টাকা", "Payment")}: ${h(deal.paymentMethod || offer.paymentMethod || "cash")}</p>${action}${deal.status === "paid" ? `<p class="paid-note">${icon("check", 18)}${t("কৃষক টাকা পেয়েছেন বলে লিখেছেন; টাকা যাচাই করা হয়নি।", "Farmer marked payment received; the payment was not verified.")}</p>` : ""}<div class="deal-card-footer"><span>${t("চুক্তির নম্বর", "Deal ID")}: ${h(deal.id.slice(0, 8))}</span><button class="text-arrow" data-action="print-deal" data-id="${h(deal.id)}">${t("চুক্তি ছাপুন", "Print deal card")}${icon("arrow", 15)}</button></div></article>`;
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
  }, t('আগে থেকে বসানো তথ্য দেখে বদলে নিন।', 'Review and change the prefilled values.'));
}

function render() {
  stopNotesVoice();
  disposeTransport();
  document.documentElement.lang = language;
  if (role === "choose") { let selected = ""; try { selected = sessionStorage.getItem("alusathi-role") || ""; } catch { /* Role choice is available at /auth. */ } location.replace(selected === "buyer" ? "./buyer.html" : selected === "farmer" ? "./farmer.html" : "../auth"); return; }
  if (view === "storage") quoteOpen = document.querySelector(".quote-disclosure")?.open ?? quoteOpen;
  const content = view === "transport" ? '<section class="section page-shell" id="transport-root"></section>' : view === "passport" ? renderPassport() : view === "list" ? renderListForm() : view === "offers" ? renderOffers() : view === "deals" ? renderDeals() : view === "storage" ? renderStorage() : view === "buyer-offers" ? renderBuyerOffers() : role === "buyer" ? renderBuyerHome() : renderFarmerHome();
  renderShell(content);
  document.querySelector("#offer-form .section-header")?.insertAdjacentHTML("afterend", renderBuyerProfile());
  if (buyerProfile.businessName && document.querySelector("#offer-form [name=buyer]")) document.querySelector("#offer-form [name=buyer]").value = buyerProfile.businessName;
  enhanceLotTools();
  if (view === "transport") {
    const lot = selectedLot();
    mountTransport(document.querySelector("#transport-root"), { language, lot, lots: visibleListings(), remaining: lot ? availableKg(lot, data.deals) : 0, offers: { selectedId: transportOfferId, items: visibleOffers().filter(offer => offer.lotId === lot?.id) }, prepareDemo });
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
  return canvas.toDataURL("image/jpeg", 0.72);
}

function validNumber(value, min, max) { const n = Number(value); return Number.isFinite(n) && n >= min && n <= max ? n : null; }
function formValues(form) { return Object.fromEntries(new FormData(form)); }
function getDeal(id) { return data.deals.find(deal => deal.id === id); }

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { setView(viewButton.dataset.view); return; }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "toggle-samples") { showSamples = !showSamples; selectedLotId = visibleListings()[0]?.id || ""; transportOfferId = ""; reviewOfferId = ""; render(); return; }
  if (action === "plan-transport") { transportOfferId = button.dataset.id; setView("transport"); return; }
  if (action === "dictate-notes") { dictateNotes(button); return; }
  if (action === "view-passport") { selectedLotId = button.dataset.id; setView("passport"); return; }
  if (["download-passport", "share-passport", "print-passport"].includes(action)) { exportPassport(action); return; }
  if (action === "language") { const formState = captureFormState(); language = language === "bn" ? "en" : "bn"; setNumberFormat(); localStorage.setItem(langKey, language); localStorage.setItem("alusathi-lang", language); render(); restoreFormState(formState); }
  if (action === "logout") { try { sessionStorage.removeItem(sessionKey); sessionStorage.removeItem("alusathi-role"); sessionStorage.setItem("alusathi-demo", "false"); } catch { /* Session can still end by leaving this page. */ } location.assign("/"); }
  if (action === "dismiss") { notice = ""; render(); }
  if (action === "reset" && confirm(t("এই ব্রাউজারের রাখা তথ্য মুছে আবার শুরু করবেন?", "Clear saved data in this browser and start over?"))) { data = initialData(); buyerProfile = {}; buyerBrief = { variety: "", quantityKg: "", destination: "", purpose: "" }; try { localStorage.removeItem(buyerProfileKey); localStorage.removeItem("alusathi-buyer-brief-v1"); } catch { /* Data remains editable in memory. */ } selectedLotId = data.listings[0].id; storageInputs = null; quoteOpen = false; save(); setView("home"); }
  if (action === "select-lot") { selectedLotId = button.dataset.id; setView("offers"); }
  if (action === "offer-lot") { draftLotId = button.dataset.id; if (role === "buyer") setView("home"); else { render(); document.querySelector("#offer-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); } }
  if (action === "close-offer") { draftLotId = ""; render(); }
  if (action === "review-offer") { reviewOfferId = button.dataset.id; render(); document.querySelector(".modal input[name=quantityKg]")?.focus(); }
  if (action === "close-review" && (button === event.target || button.closest(".modal-close") || button.tagName === "BUTTON")) { reviewOfferId = ""; render(); }
  if (action === "confirm-pickup") { const deal = getDeal(button.dataset.id); if (deal?.status === "pickup_pending") { deal.status = "collected"; save(); render(); } }
  if (action === "confirm-payment") { const deal = getDeal(button.dataset.id); if (deal?.status === "payment_pending" && Number(deal.paymentAmount) > 0 && confirm(t("নিজের হিসাবে টাকা পেয়েছেন? পেয়ে থাকলে তবেই নিশ্চিত করুন।", "Have you checked your own account and received the money?"))) { deal.status = Number(deal.remainingBalance) > 0 ? "collected" : "paid"; save(); render(); } }
  if (action === "dispute") { notice = t("এখানে বিরোধ মেটানোর সেবা নেই।", "Dispute support is not available here."); render(); }
  if (action === "print-deal") printDeal(button.dataset.id);
});

document.addEventListener("change", event => {
  if (event.target.id === "lot-switch") { selectedLotId = event.target.value; transportOfferId = ""; render(); }
  if (event.target.form?.id === "offer-form") event.target.dispatchEvent(new Event("input", { bubbles: true }));
});

document.addEventListener("input", event => {
  if (event.target.form?.id === "offer-form") {
    const form = event.target.form, box = form.querySelector("#buyer-purchase-estimate");
    if (box) {
      const quantity = Number(form.elements.quantityKg.value) || 0, accepted = Math.floor(quantity * (Number(form.elements.acceptedPercent.value) || 0) / 100), price = Number(form.elements.priceKg.value) || 0;
      const costs = ["transport", "loadingSacks", "taxes", "marketFees", "other"].map(key => form.elements[`known_${key}`].checked ? 0 : (form.elements[`cost_${key}`].value === "" ? null : Number(form.elements[`cost_${key}`].value)));
      box.textContent = costs.every(value => Number.isFinite(value) && value >= 0) && accepted > 0 && price > 0 ? `${t("গ্রহণ", "Accepted")}: ${kg(accepted)} · ${t("মোট", "Total")}: ${money(accepted * price + costs.reduce((sum, value) => sum + value, 0))} · ${t("প্রতি কেজি", "Per accepted kg")}: ${rate((accepted * price + costs.reduce((sum, value) => sum + value, 0)) / accepted)}` : t("সব খরচ জানা হলে মোট দেখাবে।", "Total appears when every cost is known.");
    }
  }
  if (event.target.name !== "quantityKg" || event.target.form?.id !== "deal-form") return;
  updateReviewPreview(event.target.form);
});

document.addEventListener("change", event => {
  if (event.target.name === "quantityKg" && event.target.form?.id === "deal-form") updateReviewPreview(event.target.form);
});
document.addEventListener("keydown", event => {
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
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const values = formValues(form);
  if (!displayName) return;
  if (form.id === "buyer-brief-form") {
    const quantityKg = validNumber(values.quantityKg || 0, 0, 100000);
    if (quantityKg === null) { notice = t("পরিমাণ ঠিক করে দিন।", "Check the quantity."); render(); return; }
    buyerBrief = { variety: varieties.some(([value]) => value === values.variety) ? values.variety : "", quantityKg: quantityKg || "", district: districts.includes(values.district) ? values.district : "", destination: districts.includes(values.district) ? values.district : "", purpose: ["table", "seed", "processing"].includes(values.purpose) ? values.purpose : "", readyDate: /^\d{4}-\d{2}-\d{2}$/.test(values.readyDate || "") ? values.readyDate : "", sort: values.sort === "quantity" ? "quantity" : "ready" };
    try { localStorage.setItem("alusathi-buyer-brief-v1", JSON.stringify(buyerBrief)); } catch { /* Filtering still works for this session. */ }
    render();
    document.querySelector("#buyer-brief-form")?.elements.variety?.focus();
    return;
  }
  if (form.id === "lot-form") {
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
    const costValue = key => values[`known_${key}`] === "yes" ? 0 : (values[`cost_${key}`] === "" ? null : validNumber(values[`cost_${key}`], 0, 1000000));
    const buyerCosts = { transport: costValue("transport"), loadingSacks: costValue("loadingSacks"), taxes: costValue("taxes"), marketFees: costValue("marketFees"), other: costValue("other") };
    const fields = { quantityKg: validNumber(values.quantityKg, 1, lot ? availableKg(lot, data.deals) : 0), priceKg: validNumber(values.priceKg, 1, 10000), acceptedPercent: validNumber(values.acceptedPercent, 1, 100), transport: 0, handling: 0, fee: 0, paymentDays: validNumber(values.paymentDays, 0, 30), pickupDate: values.pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(values.pickupDate) ? values.pickupDate : "", paymentMethod: ["cash", "mfs", "bank"].includes(values.paymentMethod) ? values.paymentMethod : "cash" };
    if (!lot || Object.values(fields).some(value => value === null) || !districts.includes(values.district) || values.expires < todayPlus(0)) { notice = t("দরের তথ্য ঠিক করে আবার দিন।", "Check the offer details and try again."); return render(); }
    const offer = { id: uid(), sample: false, lotId: lot.id, buyer: String(values.buyer).trim().slice(0, 80), district: values.district, contact: profile, buyerCosts, ...fields, pickup: values.pickup === "farmer" ? "farmer" : "buyer", terms: String(values.terms).trim().slice(0, 400), expires: values.expires, createdAt: new Date().toISOString() };
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
    const pickupDate = values.pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(values.pickupDate) ? values.pickupDate : offer.pickupDate || "";
    const paymentMethod = ["cash", "mfs", "bank"].includes(values.paymentMethod) ? values.paymentMethod : offer.paymentMethod || "cash";
    data.deals.unshift({ id: uid(), sample: offer.sample || lot.sample, lotId: lot.id, variety: lot.variety, quantityKg, offer: { ...offer }, pickupDate, paymentMethod, status: "agreed", actualAcceptedKg: null, createdAt: new Date().toISOString() });
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
  const content = `<h1>${title}</h1><p>${h(t("শুধু পরীক্ষার জন্য—আসল কেনাবেচা বা আইনি চুক্তি নয়।", "For testing only—no real trade or legal contract."))}</p><dl><dt>${h(t("ক্রেতা", "Buyer"))}</dt><dd>${h(deal.offer.buyer)}</dd><dt>${h(t("আলু", "Potatoes"))}</dt><dd>${h(deal.variety)} · ${kg(deal.quantityKg)}</dd><dt>${h(t("দর", "Price"))}</dt><dd>${rate(deal.offer.priceKg)}/kg</dd><dt>${h(t("আনুমানিক হাতে", "Estimated take-home"))}</dt><dd>${money(estimate.net)}</dd><dt>${h(t("ওজন / কাটতির নিয়ম", "Weight and deduction terms"))}</dt><dd>${h(deal.offer.terms)}</dd><dt>${h(t("পেমেন্ট", "Payment"))}</dt><dd>${deal.offer.paymentDays} ${h(t("দিনে", "days"))}</dd><dt>ID</dt><dd>${h(deal.id)}</dd></dl>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed"; frame.style.width = "0"; frame.style.height = "0"; frame.style.border = "0";
  document.body.append(frame);
  frame.contentDocument.write(`<!doctype html><html><head><title>${title}</title><style>body{font:18px sans-serif;padding:32px;color:#173d30}dt{font-weight:bold;margin-top:20px}dd{margin:4px 0;border-bottom:1px solid #ddd;padding-bottom:10px}</style></head><body>${content}</body></html>`);
  frame.contentDocument.close();
  frame.contentWindow.focus(); frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}

render();
