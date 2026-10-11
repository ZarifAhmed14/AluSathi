// Local pilot only: public OSRM demo routing is not a commercial transport service.
import { districtPlaces } from "./districts.mjs";
export const transportPlaces = districtPlaces;
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const storageKey = "alusathi-transport-quotes-v1";
export const localToday = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const number = (value, min, max) => value !== "" && value != null && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
export const inBangladesh = point => point && number(point.lat, 20.5, 26.7) !== null && number(point.lon, 88, 92.7) !== null;

export function transportCost(input) {
  const quantity = number(input.quantityKg, 1, 100000);
  const price = number(input.priceKg, 0, 10000);
  const accepted = number(input.acceptedPercent, 1, 100);
  const fare = input.payer === "buyer" ? 0 : number(input.fare, 0, 1000000);
  const handling = number(input.handling, 0, 1000000);
  const other = number(input.other, 0, 1000000);
  const partner = number(input.partnerKg, 0, 100000);
  if ([quantity, price, accepted, fare, handling, other, partner].includes(null) || !["farmer", "buyer"].includes(input.payer)) return null;
  const capacity = input.capacityKg === "" ? null : number(input.capacityKg, 1, 100000);
  if (input.capacityKg !== "" && capacity === null) return null;
  const totalLoad = quantity + partner;
  const freight = fare * quantity / totalLoad;
  const acceptedKg = Math.floor(quantity * accepted / 100);
  const gross = acceptedKg * price;
  const costs = freight + handling + other;
  return { quantity, acceptedKg, gross, freight, handling, other, costs, net: gross - costs, perKg: costs / quantity, savings: fare - freight, totalLoad, overloaded: capacity !== null && totalLoad > capacity };
}

export function osmDirections(from, to) {
  if (!inBangladesh(from) || !inBangladesh(to)) return "";
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${Number(from.lat)},${Number(from.lon)};${Number(to.lat)},${Number(to.lon)}`;
}

let draft, contextKey = "", map, pinTarget = "", route = null, routeError = "", routeBusy = false, controller;
let lastRequest = 0, leafletPromise;
const routeCache = new Map();
let quotes = [];
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved)) quotes = saved.filter(q => q && typeof q.id === "string" && typeof q.lotId === "string" && q.input && transportCost(q.input) && transportPlaces[q.input.from] && transportPlaces[q.input.to] && ["operator", "phone", "notes", "pickupDate"].every(key => typeof q.input[key] === "string") && ["fromPoint", "toPoint"].every(key => q.input[key] == null || inBangladesh(q.input[key]))).slice(0, 50);
} catch { /* A broken local record cannot block transport planning. */ }

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="; css.crossOrigin = "anonymous";
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="; script.crossOrigin = "anonymous";
    const timeout = setTimeout(() => reject(new Error("map")), 12000);
    script.onload = () => { clearTimeout(timeout); window.L ? resolve(window.L) : reject(new Error("map")); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error("map")); };
    document.head.append(css, script);
  }).catch(error => { leafletPromise = null; throw error; });
  return leafletPromise;
}

export function disposeTransport() {
  controller?.abort(); controller = null; routeBusy = false;
  map?.remove(); map = null; pinTarget = "";
}

export function mountTransport(root, { language, lot, lots, offers, remaining, prepareDemo }) {
  disposeTransport();
  const t = (bn, en) => language === "bn" ? bn : en;
  const fmt = value => new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", { maximumFractionDigits: 2 }).format(value);
  const money = value => `৳${fmt(value)}`;
  const placeName = key => language === "bn" ? transportPlaces[key]?.bn || key : key;
  const currentKey = `${lot?.id || "none"}:${offers.selectedId || ""}`;
  const offer = offers.items.find(item => item.id === offers.selectedId);
  const maxQuantity = lot ? Math.min(remaining, offer?.quantityKg || remaining) : 100000;
  if (!draft || contextKey !== currentKey) {
    contextKey = currentKey;
    draft = { from: transportPlaces[lot?.district] ? lot.district : "Rangpur", to: transportPlaces[offer?.district] ? offer.district : "Dhaka", quantityKg: lot ? Math.min(remaining, offer?.quantityKg || remaining) : "", priceKg: offer?.priceKg ?? "", acceptedPercent: offer?.acceptedPercent ?? 100, fare: "", handling: "0", other: "0", partnerKg: "0", capacityKg: "", payer: offer?.pickup === "buyer" ? "buyer" : "farmer", pickupDate: lot?.readyDate || localToday(), fromPoint: null, toPoint: null, operator: "", phone: "", checked: false, notes: "" };
    route = null; routeError = "";
  }
  if (lot && Number(draft.quantityKg) > maxQuantity) draft.quantityKg = maxQuantity;
  const point = side => draft[`${side}Point`] || transportPlaces[draft[side]];
  const options = selected => Object.keys(transportPlaces).map(key => `<option value="${key}" ${selected === key ? "selected" : ""}>${escape(placeName(key))}</option>`).join("");
  const field = (key, label, min, max, value, step = "1") => `<label>${label}<input name="${key}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${escape(value)}" ${["quantityKg", "priceKg", "acceptedPercent", "handling", "other", "partnerKg"].includes(key) ? "required" : ""} /></label>`;
  const text = (key, label, max, value, type = "text") => `<label>${label}<input name="${key}" type="${type}" maxlength="${max}" value="${escape(value)}" /></label>`;
  const today = localToday;
  const pointKey = value => `${Number(value.lon).toFixed(5)},${Number(value.lat).toFixed(5)}`;
  function routePreview() {
    const from = point("from") || transportPlaces.Rangpur, to = point("to") || transportPlaces.Dhaka;
    const x = value => 18 + ((Number(value.lon) - 88) / 4.7) * 64;
    const y = value => 82 - ((Number(value.lat) - 20.5) / 6.2) * 64;
    const sx = x(from), sy = y(from), ex = x(to), ey = y(to);
    const curve = `M ${sx} ${sy} Q ${(sx + ex) / 2} ${Math.min(sy, ey) - 14} ${ex} ${ey}`;
    return `<div class="route-preview" aria-label="${escape(t(`${placeName(draft.from)} থেকে ${placeName(draft.to)} যাওয়ার দিক`, `Direction from ${placeName(draft.from)} to ${placeName(draft.to)}`))}"><div class="route-preview-head"><strong>${t("যাওয়ার দিক", "Route direction")}</strong><span>${escape(placeName(draft.from))} → ${escape(placeName(draft.to))}</span></div><svg viewBox="0 0 100 100" role="img" aria-hidden="true"><defs><linearGradient id="route-gradient" x1="0" x2="1"><stop stop-color="#1f5c42"/><stop offset="1" stop-color="#c48a32"/></linearGradient></defs><path class="route-preview-track" d="${curve}"/><path class="route-preview-line" d="${curve}"/><circle class="route-preview-dot from" cx="${sx}" cy="${sy}" r="3"/><circle class="route-preview-dot to" cx="${ex}" cy="${ey}" r="3"/><g class="route-preview-truck"><rect x="-4" y="-3" width="8" height="5" rx="1"/><circle cx="-2.5" cy="3" r="1.2"/><circle cx="2.5" cy="3" r="1.2"/>${matchMedia("(prefers-reduced-motion: reduce)").matches ? "" : `<animateMotion dur="4.8s" repeatCount="indefinite" path="${curve}"/>`}</g></svg></div>`;
  }
  const say = message => { const status = root.querySelector("#transport-status"); if (status) status.textContent = message; };
  function capture() {
    const form = root.querySelector("#transport-plan");
    if (!form) return;
    Object.assign(draft, Object.fromEntries(new FormData(form)));
    draft.checked = form.elements.checked.checked;
  }
  function requestText() {
    const result = transportCost(draft);
    return [t("আলুসাথী · গাড়ির কথা বলার খসড়া, বুকিং নয়", "AluSathi · transport request draft, NOT a booking"), `${t("কোথা থেকে", "From")}: ${placeName(draft.from)}${draft.fromPoint ? t(" (আলাদা জায়গা বেছে নেওয়া)", " (custom pickup point)") : t(" জেলা শহর", " district town")}`, `${t("কোথায়", "To")}: ${placeName(draft.to)}${draft.toPoint ? t(" (আলাদা জায়গা বেছে নেওয়া)", " (custom drop-off point)") : t(" জেলা শহর", " district town")}`, `${t("আলু", "Potatoes")}: ${fmt(Number(draft.quantityKg))} ${t("কেজি", "kg")} · ${t("তারিখ", "Date")}: ${draft.pickupDate}`, `${t("পুরো গাড়ির দর", "Whole-trip quote")}: ${draft.fare === "" ? t("এখনো জানা নেই", "Not known yet") : money(Number(draft.fare))}`, `${t("গাড়িভাড়া দেবেন", "Freight paid by")}: ${draft.payer === "buyer" ? t("ক্রেতা", "Buyer") : t("কৃষক", "Farmer")}`, ...(result ? [`${t("কৃষকের মোট খরচ", "Farmer's total costs")}: ${money(result.costs)}`, `${t("ওঠানো / বস্তা", "Handling / sacks")}: ${money(result.handling)} · ${t("অন্য খরচ", "Other costs")}: ${money(result.other)}`] : []), `${t("অন্যের আলু", "Other farmers' load")}: ${fmt(Number(draft.partnerKg) || 0)} ${t("কেজি", "kg")}`, ...(draft.operator ? [`${t("গাড়ির মালিক", "Operator")}: ${draft.operator}`] : []), ...(draft.notes ? [draft.notes] : []), `${t("রাস্তা", "Route")}: ${osmDirections(point("from"), point("to"))}`, t("দর, গাড়ির জায়গা, রাস্তা, সব খরচ ও টাকা দেওয়ার নিয়ম ফোনে নিশ্চিত করুন। কোনো গাড়ি বুক হয়নি।", "Confirm the quote, vehicle availability, access, all fees and payment terms with the operator. No vehicle is booked.")].join("\n");
  }
  function updateResult() {
    const result = transportCost(draft);
    const target = root.querySelector("#transport-cost");
    if (!target) return;
    const submit = root.querySelector('[data-transport="save"]');
    const form = submit.form;
    submit.disabled = !result || result.overloaded || [...form.elements].some(field => field.value && typeof field.checkValidity === 'function' && !field.checkValidity());
    if (!result) { target.innerHTML = `<p class="transport-empty">${t("কত আলু, বিক্রির দর ও গাড়ির পুরো ভাড়া লিখুন। তারপর হাতে থাকার হিসাব দেখাবে।", "Enter your load, sale price and whole-trip quote to see what remains after costs.")}</p>`; return; }
    target.innerHTML = `<span class="small-label">${t("খরচ বাদে হাতে আসতে পারে", "ESTIMATED MONEY AFTER COSTS")}</span><strong class="transport-net ${result.net < 0 ? "transport-loss" : ""}">${money(result.net)}</strong><p>${t("এটি লাভ নয়—চাষের খরচ বাদ দেওয়া হয়নি।", "This is not profit: growing costs are not included.")}</p><dl class="transport-breakdown"><div><dt>${t("আলু বিক্রির টাকা", "Sale value")}</dt><dd>${money(result.gross)}</dd></div><div><dt>${t("আপনার গাড়িভাড়া", "Your freight share")}</dt><dd>− ${money(result.freight)}</dd></div><div><dt>${t("ওঠানো / বস্তা", "Handling / sacks")}</dt><dd>− ${money(result.handling)}</dd></div><div><dt>${t("অন্য খরচ", "Other costs")}</dt><dd>− ${money(result.other)}</dd></div><div><dt>${t("আপনার মোট খরচ", "Your total costs")}</dt><dd>${money(result.costs)}</dd></div></dl><p>${t("প্রতি কেজিতে খরচ", "Cost per shipped kg")}: <b>${money(result.perKg)}</b> · ${fmt(result.acceptedKg)} ${t("কেজি নেওয়ার অনুমান", "kg estimated accepted")}</p>${draft.payer === "buyer" ? `<p class="transport-caution">${t("ক্রেতা গাড়িভাড়া দেবেন ধরা হয়েছে। পরে আপনার টাকা থেকে কাটবেন কি না, আগে নিশ্চিত করুন।", "Assumes the buyer pays freight without deducting it from your payment. Confirm this first.")}</p>` : ""}${result.savings > 0 ? `<p class="transport-saving">${t("একই গাড়ি ভাগ করলে আপনার ভাড়া কমতে পারে", "Possible freight saving from sharing")}: <b>${money(result.savings)}</b></p>` : ""}${result.overloaded ? `<p class="transport-caution" role="alert">${t("মোট আলু গাড়ির বলা ধারণক্ষমতার বেশি। আলু কমান বা বড় গাড়ি নিন।", "Combined load exceeds the stated capacity. Reduce the load or choose a larger vehicle.")}</p>` : ""}${result.net < 0 ? `<p class="transport-caution">${t("এই হিসাবে বিক্রির টাকার চেয়ে খরচ বেশি। শর্ত আবার দেখুন।", "These costs exceed the sale value. Review the terms.")}</p>` : ""}`;
  }
  function renderQuotes() {
    const filtered = quotes.filter(q => q.lotId === lot?.id && q.input.from === draft.from && q.input.to === draft.to && Number(q.input.quantityKg) === Number(draft.quantityKg) && pointKey(q.input.fromPoint || transportPlaces[q.input.from]) === pointKey(point("from")) && pointKey(q.input.toPoint || transportPlaces[q.input.to]) === pointKey(point("to"))).sort((a, b) => transportCost(a.input).costs - transportCost(b.input).costs);
    root.querySelector("#transport-quotes").innerHTML = filtered.length ? filtered.map(q => {
      const result = transportCost(q.input);
      const phone = /^\+?\d[\d ()-]{7,23}$/.test(q.input.phone || "") ? q.input.phone.replace(/[^\d+]/g, "") : "";
      return `<article class="transport-quote"><div><span class="small-label">${t("আপনার লেখা · বুকিং নয়", "ENTERED BY YOU · NOT BOOKED")}</span><h3>${escape(q.input.operator)}</h3><p>${escape(placeName(q.input.from))} → ${escape(placeName(q.input.to))} · ${fmt(Number(q.input.quantityKg))} ${t("কেজি", "kg")}</p><p>${t("আপনার মোট খরচ", "Your total costs")}: <b>${money(result.costs)}</b> · ${t("পুরো গাড়ির দর", "Whole-trip quote")}: ${q.input.fare === "" ? "—" : money(Number(q.input.fare))}</p><small>${escape(q.input.pickupDate)} · ${q.checked ? t("আপনি ফোনে কথা বলেছেন", "You report checking by phone") : t("দর এখনো নিশ্চিত করেননি", "Quote not checked by you")} · ${t("আলুসাথী যাচাই করেনি", "Not verified by AluSathi")}</small></div><div class="transport-quote-actions">${phone ? `<a class="button button-outline button-small" href="tel:${escape(phone)}">${t("ফোন করুন", "Call")}</a>` : ""}<button type="button" class="text-arrow" data-load-quote="${escape(q.id)}">${t("এই হিসাব দেখুন", "Use these figures")}</button><button type="button" class="text-arrow" data-delete-quote="${escape(q.id)}">${t("মুছুন", "Remove")}</button></div></article>`;
    }).join("") : `<p class="transport-empty">${t("এই পথ ও পরিমাণের গাড়ির দর এখনো রাখেননি। নিজের পরিচিত গাড়ির মালিকের সঙ্গে কথা বলে দর লিখুন।", "No quotes saved for this route and quantity. Ask a known operator and enter their quote.")}</p>`;
    root.querySelectorAll('.transport-quote').forEach((card, index) => {
      const input = filtered[index].input;
      const terms = document.createElement('p');
      terms.textContent = `${t("গাড়িভাড়া দেবেন", "Freight paid by")}: ${input.payer === 'buyer' ? t("ক্রেতা", "Buyer") : t("কৃষক", "Farmer")} · ${t("অন্যের আলু", "Other farmers' load")}: ${fmt(Number(input.partnerKg))} ${t("কেজি", "kg")} · ${t("ক্রেতা নেবেন ধরা হয়েছে", "Assumed accepted")}: ${fmt(Number(input.acceptedPercent))}%`;
      card.firstElementChild.append(terms);
      if (filtered[index].sample) card.querySelector('.small-label').textContent = t('বুকিং হয়নি', 'NOT BOOKED');
    });
  }
  function draw() {
    map?.remove(); map = null;
    root.innerHTML = `<div class="transport-heading"><p class="section-kicker">${t("আলু পাঠানোর প্রস্তুতি", "PLAN YOUR POTATO DELIVERY")}</p><h1>${t("গাড়ির খরচ জেনে পাঠান।", "Know the cost before you send.")}</h1><p>${t("পথ দেখুন। গাড়ির দর লিখুন। খরচ বাদে কত টাকা থাকবে, মিলিয়ে নিন।", "Check the route. Enter a transport quote. See what money remains.")}</p></div>${offer ? `<div class="transport-offer-note">${t("এই দরের হিসাব", "Planning for this offer")}: <b>${escape(offer.buyer)}</b> · ${money(offer.priceKg)}/${t("কেজি", "kg")} ${offer.sample ? t("", "") : ""}<p>${t("এই হিসাব মূল দর বা চুক্তি বদলায় না। নতুন খরচ ক্রেতার সঙ্গে মিলিয়ে নিন।", "This planner does not change the offer or deal. Agree any new costs with the buyer.")}</p></div>` : ""}<form id="transport-plan" class="transport-layout"><div class="transport-main"><section class="panel transport-panel"><div class="form-intro"><span class="step-circle">1</span><div><h2>${t("কোথা থেকে কোথায়?", "From where to where?")}</h2><p>${t("প্রথমে জেলা শহর ধরা আছে, জমি বা গুদাম নয়। ঠিক জায়গা মানচিত্রে দিতে পারবেন।", "Starts at district towns, not your farm or warehouse. You can set exact points on the map.")}</p></div></div><div class="form-grid"><label>${t("কোথা থেকে", "Pickup district")}<select name="from">${options(draft.from)}</select></label><label>${t("কোথায়", "Destination district")}<select name="to">${options(draft.to)}</select></label></div><div class="transport-points"><span>${draft.fromPoint ? t("তোলার জায়গা আলাদা দেওয়া আছে", "Custom pickup point set") : t("তোলা: জেলা শহর", "Pickup: district town")}</span><span>${draft.toPoint ? t("নামানোর জায়গা আলাদা দেওয়া আছে", "Custom drop-off point set") : t("নামানো: জেলা শহর", "Drop-off: district town")}</span></div><div class="transport-actions"><button type="button" class="button button-outline" data-transport="map">${t("মানচিত্রে জায়গা দিন", "Set places on map")}</button><button type="button" class="button button-outline" data-transport="gps">${t("আমি যেখানে আছি", "Use my location")}</button><button type="button" class="button button-green" data-transport="route" ${routeBusy ? "disabled" : ""}>${t("পথ ও দূরত্ব দেখুন", "Check route and distance")}</button></div><p class="transport-privacy">${t("মানচিত্র বা পথ দেখতে চাপলে জায়গার তথ্য বাইরের মানচিত্র সেবায় যাবে। নাম, ফোন বা আলুর তথ্য যাবে না।", "Map and route buttons send location data to external map services. Your name, phone and crop details are not sent.")}</p><div id="transport-map-wrap" hidden><div class="transport-actions"><button type="button" class="button button-outline button-small" data-pin="from">${t("তোলার জায়গা দিন", "Set pickup")}</button><button type="button" class="button button-outline button-small" data-pin="to">${t("নামানোর জায়গা দিন", "Set drop-off")}</button><button type="button" class="text-arrow" data-transport="reset-points">${t("জেলা শহরে ফিরুন", "Reset to towns")}</button></div><p id="pin-status" role="status"></p><div id="transport-map" aria-label="${t("তোলা ও নামানোর জায়গার মানচিত্র", "Pickup and delivery map")}"></div></div><div id="route-result" aria-live="polite">${route ? `<div class="transport-distance"><strong>${fmt(route.distance / 1000)} ${t("কিমি", "km")}</strong><span>${t("সড়কপথের আনুমানিক দূরত্ব", "Approximate road distance")}</span><p>${t("এটি সাধারণ গাড়ির পথ—ট্রাক যেতে পারবে কি না চালক নিশ্চিত করবেন।", "This is a car route. Ask the driver to confirm truck access.")}</p></div>` : `<p class="transport-empty">${escape(routeError || t("দূরত্ব এখনো দেখা হয়নি। গাড়ির খরচ আলাদা করে নিচে লিখতে পারবেন।", "Route not checked yet. You can still enter transport costs below."))}</p>`}</div><a class="text-arrow" href="${escape(osmDirections(point("from"), point("to")))}" target="_blank" rel="noopener noreferrer">${t("বড় মানচিত্রে দেখুন ↗", "Open full map ↗")}</a><small class="transport-source"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · OSRM · ${t("এখান থেকে গাড়ি বুক হয় না", "Vehicle booking is not available here")}</small></section><section class="panel transport-panel"><div class="form-intro"><span class="step-circle">2</span><div><h2>${t("আলু ও গাড়ির খরচ", "Load and transport costs")}</h2><p>${t("গাড়ির মালিক যা বলেছেন, সেটাই লিখুন। দূরত্ব থেকে ভাড়া বানানো হয় না।", "Enter what the operator quoted. Distance does not create a fare.")}</p></div></div><div class="form-grid">${field("quantityKg", t("আপনার আলু (কেজি)", "Your load (kg)"), 1, remaining || 100000, draft.quantityKg)}${field("priceKg", t("আলু বিক্রির দর (টাকা/কেজি)", "Sale price (BDT/kg)"), 0, 10000, draft.priceKg, "0.01")}<label>${t("গাড়িভাড়া কে দেবেন?", "Who pays freight?")}<select name="payer"><option value="farmer" ${draft.payer === "farmer" ? "selected" : ""}>${t("আমি দেব", "I pay")}</option><option value="buyer" ${draft.payer === "buyer" ? "selected" : ""}>${t("ক্রেতা দেবেন", "Buyer pays")}</option></select></label>${field("fare", t("পুরো গাড়ির ভাড়া (টাকা)", "Whole-trip quote (BDT)"), 0, 1000000, draft.fare)}${field("handling", t("আপনার ওঠানো / বস্তার খরচ (টাকা)", "Your handling / sacks (BDT)"), 0, 1000000, draft.handling)}${field("other", t("আপনার অন্য খরচ / টোল (টাকা)", "Your other costs / tolls (BDT)"), 0, 1000000, draft.other)}</div><details class="transport-details"><summary>${t("একই গাড়িতে অন্যের আলু পাঠাবেন?", "Sharing the same vehicle?")}</summary><p>${t("একই পথ ও দিনে একসঙ্গে পাঠালে ওজন অনুযায়ী গাড়িভাড়া ভাগের হিসাব। অন্যের সম্মতি ও সব খরচ আগে মিলিয়ে নিন। এখানে কাউকে খুঁজে দেওয়া বা গাড়ি ঠিক করা হয়নি।", "Splits freight by weight for a shared trip on the same route and date. Agree this with everyone first. No partner or vehicle is matched here.")}</p><div class="form-grid">${field("partnerKg", t("অন্যদের আলু (কেজি)", "Other farmers' load (kg)"), 0, 100000, draft.partnerKg)}${field("capacityKg", t("চালকের বলা সর্বোচ্চ আলু (কেজি, ঐচ্ছিক)", "Driver-stated load capacity (kg, optional)"), 1, 100000, draft.capacityKg)}</div></details><details class="transport-details"><summary>${t("বাছাইয়ে কিছু আলু বাদ যাবে?", "Will some potatoes be rejected?")}</summary><p>${t("ক্রেতার বলা নেওয়ার পরিমাণ বসান। না জানলে ১০০ রাখা আছে—এটি নিশ্চয়তা নয়।", "Enter the percentage the buyer expects to accept. Default 100% is an assumption, not a guarantee.")}</p>${field("acceptedPercent", t("আনুমানিক যত শতাংশ নেবেন", "Estimated accepted (%)"), 1, 100, draft.acceptedPercent)}</details></section><section class="panel transport-panel"><div class="form-intro"><span class="step-circle">3</span><div><h2>${t("দর রাখুন বা কথা পাঠান", "Save a quote or send a request")}</h2><p>${t("পরিচিত গাড়ির মালিককে ফোন করে দর ও খালি গাড়ি নিশ্চিত করুন।", "Call a known operator to confirm the quote and vehicle availability.")}</p></div></div><div class="form-grid">${text("operator", t("গাড়ির মালিক / প্রতিষ্ঠানের নাম", "Operator / business name"), 80, draft.operator)}${text("phone", t("ফোন (ঐচ্ছিক, শুধু এই ফোনে থাকবে)", "Phone (optional, saved here only)"), 25, draft.phone, "tel")}<label>${t("কবে পাঠাবেন?", "Pickup date")}<input name="pickupDate" type="date" min="${today()}" value="${escape(draft.pickupDate)}" required /></label></div><label>${t("অন্য কথা / ঠিকানা (ঐচ্ছিক)", "Notes / address (optional)")}<textarea name="notes" maxlength="300" rows="2">${escape(draft.notes)}</textarea></label><label class="transport-check"><input name="checked" type="checkbox" ${draft.checked ? "checked" : ""} />${t("আমি ফোনে দর ও শর্ত জেনেছি", "I checked the quote and terms by phone")}</label><div class="transport-actions"><button type="button" class="button button-green" data-transport="save">${t("গাড়ির দর রাখুন", "Save transport quote")}</button><button type="button" class="button button-outline" data-transport="share">${t("গাড়ির কথা পাঠান", "Share transport request")}</button></div><p class="transport-privacy">${t("পাঠালে নাম, তারিখ, ঠিকানা ও লেখা অন্যজন দেখতে পারবেন। পাঠানোর আগে মিলিয়ে নিন। কোনো গাড়ি বুক বা টাকা দেওয়া হবে না।", "Sharing includes the operator name, date, route and your notes. Check them first. It does not book a vehicle or pay anyone.")}</p><p id="transport-status" role="status"></p><textarea id="transport-share-text" rows="8" readonly hidden aria-label="${t("পাঠানোর কথা", "Transport request text")}"></textarea></section></div><aside class="transport-summary panel"><h2>${t("শেষে কত থাকবে?", "What remains?")}</h2><div id="transport-cost" aria-live="polite"></div><p class="transport-caution">${t("রাস্তা, গাড়ির জায়গা ও ভাড়া চালকের সঙ্গে মিলিয়ে নিন। দরের হিসাব মানেই গাড়ি বুক নয়।", "Confirm access, availability and fees with the driver. A calculation is not a booking.")}</p></aside></form><section class="transport-saved"><div class="section-header"><div><p class="section-kicker">${t("এই ফোনে রাখা", "SAVED ON THIS DEVICE")}</p><h2>${t("গাড়ির দর মিলিয়ে দেখুন", "Compare your transport quotes")}</h2><p>${t("একই আলু, পথ ও পরিমাণের দর কম খরচ আগে দেখায়। কম দর মানেই ভালো গাড়ি নয়।", "Same lot, route and quantity; lower total cost first. Cheapest does not mean safest or best.")}</p></div></div><div id="transport-quotes"></div></section>`;
    updateResult(); renderQuotes();
    root.querySelector('.transport-panel').insertAdjacentHTML('beforeend', routePreview());
    const heading = root.querySelector('.transport-heading');
    if (lot) heading.insertAdjacentHTML('beforeend', `<label class="transport-lot-choice">${t("কোন আলু পাঠাবেন?", "Which lot are you sending?")}<select id="lot-switch">${lots.map(item => `<option value="${escape(item.id)}" ${item.id === lot.id ? "selected" : ""}>${escape(item.variety)} · ${escape(item.upazila)} · ${escape(item.district)}${item.sample ? t("", "") : ""}</option>`).join('')}</select></label>`);
    root.querySelector('.transport-points').insertAdjacentHTML('afterend', `<p class="transport-privacy">${t("তালিকার জেলা শহরগুলো থেকে শুরু করতে পারেন। অন্য জায়গা হলে মানচিত্রে তোলা ও নামানোর জায়গা দিন।", "You can start from a listed district town. For another place, set pickup and drop-off points on the map.")}${lot && !transportPlaces[lot.district] ? t(" আপনার জেলা তালিকায় নেই; আগে সঠিক জায়গা দিন।", " Your lot's district is not listed; set the correct pickup first.") : ""}</p>`);
    root.querySelector('[name="quantityKg"]').max = maxQuantity;
    prepareDemo?.();
  }
  async function showMap() {
    const element = root.querySelector("#transport-map");
    root.querySelector("#transport-map-wrap").hidden = false;
    try {
      const L = await loadLeaflet();
      if (!element.isConnected || map) return;
      map = L.map(element, { scrollWheelZoom: false }).setView([24.5, 90], 7);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(map);
      for (const side of ["from", "to"]) L.circleMarker([point(side).lat, point(side).lon], { radius: 9, color: side === "from" ? "#173d30" : "#ad6a13", fillOpacity: 1 }).bindTooltip(t(side === "from" ? "তোলা" : "নামানো", side === "from" ? "Pickup" : "Drop-off")).addTo(map);
      if (route) L.geoJSON(route.geometry, { style: { color: "#2d7855", weight: 5 } }).addTo(map);
      map.fitBounds([[point("from").lat, point("from").lon], [point("to").lat, point("to").lon]], { padding: [30, 30], maxZoom: 13 });
      map.on("click", event => {
        if (!pinTarget) return;
        const chosen = { lat: event.latlng.lat, lon: event.latlng.lng };
        if (!inBangladesh(chosen)) { root.querySelector("#pin-status").textContent = t("বাংলাদেশের মধ্যে জায়গা দিন।", "Choose a place in Bangladesh."); return; }
        capture(); draft[`${pinTarget}Point`] = chosen; pinTarget = ""; invalidateRoute(); draw(); showMap();
      });
    } catch { say(t("মানচিত্র আসেনি। ইন্টারনেট দেখুন বা বড় মানচিত্রের লিংক ব্যবহার করুন। খরচের হিসাব চলবে।", "Map unavailable. Check your connection or use the full-map link. Cost tools still work.")); }
  }
  function invalidateRoute() { controller?.abort(); controller = null; route = null; routeBusy = false; routeError = ""; }
  async function fetchRoute() {
    if (routeBusy) return;
    capture();
    if (lot && !transportPlaces[lot.district] && !draft.fromPoint) { say(t("আপনার জেলা তালিকায় নেই। আগে মানচিত্রে সঠিক তোলার জায়গা দিন।", "Your lot's district is not listed. Set the correct pickup on the map first.")); return; }
    if (!inBangladesh(point("from")) || !inBangladesh(point("to"))) return;
    if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(location.hostname)) { routeError = t("অনলাইন পথের সেবা এখানে নেই। এখানে বড় মানচিত্র ব্যবহার করুন; খরচের হিসাব চলবে।", "Online route lookup is unavailable here. Use the full-map link here; cost tools still work."); draw(); return; }
    const key = `${pointKey(point("from"))};${pointKey(point("to"))}`;
    if (routeCache.has(key)) { route = routeCache.get(key); routeError = ""; draw(); showMap(); return; }
    if (Date.now() - lastRequest < 1100) { say(t("একটু পরে আবার চাপুন।", "Wait a moment before trying again.")); return; }
    lastRequest = Date.now(); routeBusy = true;
    const request = new AbortController(); controller = request;
    const button = root.querySelector('[data-transport="route"]'); button.disabled = true; button.textContent = t("পথ দেখা হচ্ছে…", "Checking route…");
    const timeout = setTimeout(() => request.abort(), 12000);
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=simplified&geometries=geojson&steps=false&generate_hints=false`, { signal: request.signal, credentials: "omit" });
      if (!response.ok) throw new Error("route");
      const payload = await response.json(), result = payload.routes?.[0];
      if (payload.code !== "Ok" || !Number.isFinite(result?.distance) || result.distance < 0 || !Array.isArray(result?.geometry?.coordinates) || result.geometry.type !== "LineString" || result.geometry.coordinates.length > 10000 || !result.geometry.coordinates.every(c => Array.isArray(c) && inBangladesh({ lon: c[0], lat: c[1] }))) throw new Error("route");
      if (controller !== request || !root.isConnected) return;
      route = { distance: result.distance, geometry: result.geometry }; routeCache.set(key, route); if (routeCache.size > 20) routeCache.delete(routeCache.keys().next().value); routeError = "";
    } catch { if (controller !== request || !root.isConnected) return; routeError = t("এখন পথ পাওয়া যায়নি। পরে চেষ্টা করুন। দূরত্ব বা ভাড়া বানিয়ে দেখানো হয়নি; নিচের খরচের হিসাব চলবে।", "Route unavailable. Try later. No distance or fare was invented; cost tools still work."); }
    finally { clearTimeout(timeout); if (controller === request) { controller = null; routeBusy = false; if (root.isConnected) { draw(); if (route) showMap(); } } }
  }
  root.oninput = () => { capture(); updateResult(); };
  root.onchange = event => {
    capture();
    if (["from", "to"].includes(event.target.name)) { draft[`${event.target.name}Point`] = null; invalidateRoute(); draw(); }
    else renderQuotes();
  };
  root.onclick = async event => {
    const button = event.target.closest("button"); if (!button) return;
    capture();
    if (button.dataset.pin) { await showMap(); pinTarget = button.dataset.pin; root.querySelector("#pin-status").textContent = t(pinTarget === "from" ? "মানচিত্রে তোলার জায়গায় চাপ দিন।" : "মানচিত্রে নামানোর জায়গায় চাপ দিন।", pinTarget === "from" ? "Tap the pickup point on the map." : "Tap the drop-off point on the map."); return; }
    if (button.dataset.deleteQuote) { const next = quotes.filter(q => q.id !== button.dataset.deleteQuote); try { localStorage.setItem(storageKey, JSON.stringify(next)); quotes = next; renderQuotes(); } catch { say(t("মুছে রাখা যায়নি। আবার চেষ্টা করুন।", "Could not save the removal. Try again.")); } return; }
    if (button.dataset.loadQuote) { const q = quotes.find(q => q.id === button.dataset.loadQuote); if (q) { draft = { ...draft, ...q.input, checked: q.checked }; invalidateRoute(); draw(); } return; }
    const action = button.dataset.transport;
    if (action === "map") showMap();
    if (action === "route") fetchRoute();
    if (action === "reset-points") { draft.fromPoint = draft.toPoint = null; invalidateRoute(); draw(); showMap(); }
    if (action === "gps") {
      if (!navigator.geolocation) { say(t("এই ফোনে জায়গা পাওয়া যাচ্ছে না। মানচিত্রে জায়গা দিন।", "Location is unavailable. Set the pickup on the map.")); return; }
      say(t("ফোনের জায়গার অনুমতি দিন। আপনি যেখানে আছেন সেটিই ধরা হবে, জমি নয়।", "Allow location access. This uses where you are now, not necessarily your farm."));
      navigator.geolocation.getCurrentPosition(position => {
        if (!root.isConnected) return;
        const chosen = { lat: position.coords.latitude, lon: position.coords.longitude };
        if (!inBangladesh(chosen)) { say(t("বাংলাদেশের জায়গা পাওয়া যায়নি। মানচিত্রে জায়গা দিন।", "Location is outside the supported Bangladesh area. Set it on the map.")); return; }
        capture(); draft.fromPoint = chosen; invalidateRoute(); draw(); say(t("আপনি এখন যেখানে আছেন, তোলার জায়গা সেখানে দেওয়া হয়েছে। ঠিক কি না মিলিয়ে নিন।", "Pickup set to your current location. Check it is the right place."));
      }, () => say(t("জায়গার অনুমতি বা তথ্য পাওয়া যায়নি। জেলা শহর আছে; মানচিত্রে ঠিক জায়গা দিতে পারেন।", "Location unavailable or permission denied. District town remains selected; you can set a point on the map.")), { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
    }
    if (action === "save" || action === "share") {
      const form = root.querySelector("#transport-plan"), result = transportCost(draft);
      if (draft.capacityKg !== "" && Number(draft.quantityKg) + Number(draft.partnerKg) > Number(draft.capacityKg)) { say(t("মোট আলু গাড়ির ধারণক্ষমতার বেশি। আলু কমান বা বড় গাড়ি নিন।", "Combined load exceeds vehicle capacity. Reduce the load or choose a larger vehicle.")); return; }
      if (action === "save" && (!form.reportValidity() || !result || result.overloaded)) { say(t("আলু, দর ও খরচের ঘরগুলো ঠিক করে দিন।", "Check the load, price and cost fields.")); return; }
      if (number(draft.quantityKg, 1, maxQuantity) === null || result?.overloaded || [...form.elements].some(element => element.value && typeof element.checkValidity === "function" && !element.checkValidity())) { say(t("আলুর পরিমাণ, দর ও গাড়ির জায়গা মিলিয়ে দিন।", "Check the load quantity, costs and capacity.")); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.pickupDate) || !Number.isFinite(new Date(draft.pickupDate).getTime()) || new Date(draft.pickupDate).toISOString().slice(0, 10) !== draft.pickupDate || draft.pickupDate < today()) { say(t("আজ বা পরের দিনের সঠিক তারিখ দিন।", "Choose today or a later valid date.")); return; }
      if (action === "save") {
        if (draft.operator.trim().length < 2) { say(t("আগে গাড়ির মালিক বা প্রতিষ্ঠানের নাম লিখুন।", "Enter the operator or business name first.")); form.elements.operator.focus(); return; }
        const record = { id: crypto.randomUUID(), lotId: lot?.id || "none", sample: form.dataset.demoFilled === 'true', input: { ...draft }, checked: draft.checked, recordedAt: new Date().toISOString() };
        const next = [record, ...quotes].slice(0, 50);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); quotes = next; renderQuotes(); say(t("দর এই ফোনে রাখা হয়েছে। কোনো গাড়ি বুক হয়নি। যাওয়ার আগে আবার ফোন করুন।", "Quote saved on this device. No vehicle booked. Call again before dispatch.")); } catch { say(t("এই ফোনে রাখা যায়নি। জায়গা খালি করে আবার চেষ্টা করুন।", "Could not save on this device. Free some storage and try again.")); }
      } else {
        const message = requestText();
        if (navigator.share) { try { await navigator.share({ title: t("আলু পাঠানোর কথা", "Potato transport request"), text: message }); return; } catch (error) { if (error.name === "AbortError") return; } }
        try { await navigator.clipboard.writeText(message); say(t("কথা কপি হয়েছে। পরিচিত গাড়ির মালিককে পাঠান—এটি বুকিং নয়।", "Request copied. Send it to a known operator—this is not a booking.")); }
        catch { const box = root.querySelector("#transport-share-text"); box.hidden = false; box.value = message; box.focus(); box.select(); say(t("নিচের কথা কপি করে পাঠান।", "Copy the request below and send it.")); }
      }
    }
  };
  draw();
}
