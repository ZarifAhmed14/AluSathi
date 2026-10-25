import { districtPlaces } from "./districts.mjs";
import { localToday } from "./transport.mjs";

const key = "alusathi-buyer-transport-v1";
const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validFare = value => /^\d+(?:\.\d{1,2})?$/.test(String(value)) && Number(value) <= 10000000;
const mapCities = [
  { bn: "রংপুর", en: "Rangpur", cueBn: "আলুর মাঠ", cueEn: "Potato fields", x: 535, y: 155, color: "#317d49", left: true },
  { bn: "রাজশাহী", en: "Rajshahi", cueBn: "কৃষি ও ঐতিহ্য", cueEn: "Farms & heritage", x: 420, y: 380, color: "#ac7628" },
  { bn: "ময়মনসিংহ", en: "Mymensingh", cueBn: "নদীর সমভূমি", cueEn: "River plain", x: 795, y: 285, color: "#558e81" },
  { bn: "সিলেট", en: "Sylhet", cueBn: "চা-বাগান", cueEn: "Tea hills", x: 1115, y: 330, color: "#718b39", left: true },
  { bn: "ঢাকা", en: "Dhaka", cueBn: "রাজধানী", cueEn: "Capital city", x: 815, y: 445, color: "#386d91" },
  { bn: "খুলনা", en: "Khulna", cueBn: "ম্যানগ্রোভ", cueEn: "Mangroves", x: 515, y: 650, color: "#327969" },
  { bn: "বরিশাল", en: "Barishal", cueBn: "নদীর ব-দ্বীপ", cueEn: "River delta", x: 800, y: 665, color: "#b16e50" },
  { bn: "চট্টগ্রাম", en: "Chattogram", cueBn: "সমুদ্রবন্দর", cueEn: "Seaport", x: 1175, y: 700, color: "#287f9e", left: true },
];
function records() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && !Array.isArray(value) && typeof value === "object" ? value : {};
  } catch { return {}; }
}

export function readBuyerTransport(purchaseId) {
  const row = records()[purchaseId];
  return row && typeof row.operator === "string" && row.operator.length <= 80 && validFare(row.fare) && validDate(row.date) && districtPlaces[row.from] && districtPlaces[row.to] ? row : null;
}

export function disposeBuyerTransport() {}

export function mountBuyerTransport(root, { language, lot, purchase, purchases, quantityKg, provider, onSelectPurchase }) {
  disposeBuyerTransport();
  const blankDemo = !lot;
  const routeKey = `alusathi-buyer-route-${purchase?.id || lot?.id || "demo"}`;
  let routeDraft = {};
  try { routeDraft = JSON.parse(sessionStorage.getItem(routeKey) || "{}") || {}; } catch { /* Use route defaults. */ }
  const t = (bn, en) => language === "bn" ? bn : en;
  const format = new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", { maximumFractionDigits: 2 });
  const money = amount => `৳${format.format(amount)}`;
  const place = district => language === "bn" ? districtPlaces[district]?.bn || district : district;
  const saved = purchase ? readBuyerTransport(purchase.id) : null;
  const from = routeDraft.from === "" || Object.hasOwn(districtPlaces, routeDraft.from) ? routeDraft.from : saved?.from || (blankDemo ? "" : districtPlaces[lot.district] ? lot.district : "Rangpur");
  const to = routeDraft.to === "" || Object.hasOwn(districtPlaces, routeDraft.to) ? routeDraft.to : saved?.to || (blankDemo ? "" : "Dhaka");
  const date = routeDraft.date === "" || validDate(routeDraft.date) ? routeDraft.date : saved?.date || (blankDemo ? "" : validDate(lot.readyDate) && lot.readyDate > localToday() ? lot.readyDate : localToday());
  const kg = blankDemo ? null : purchase ? Number(purchase.quantityKg) : Number(quantityKg);
  const amount = purchase?.agreedTotal;
  const options = selected => `<option value="">${t("জেলা বাছুন", "Choose district")}</option>` + Object.keys(districtPlaces).map(name => `<option value="${name}" ${selected === name ? "selected" : ""}>${esc(place(name))}</option>`).join("");
  const cityMarkers = mapCities.map(city => `<g class="buyer-map-city" transform="translate(${city.x} ${city.y})"><circle class="halo" r="65" fill="${city.color}"/><circle class="point" r="10" fill="${city.color}"/><text x="${city.left ? -19 : 19}" y="-14" text-anchor="${city.left ? "end" : "start"}">${esc(t(city.bn, city.en))}</text></g>`).join("");
  const divisionGuide = mapCities.map(city => `<div class="buyer-map-division"><i style="background:${city.color}"></i><span><strong>${esc(t(city.bn, city.en))}</strong><small>${esc(t(city.cueBn, city.cueEn))}</small></span></div>`).join("");

  const chooser = blankDemo ? `<div class="buyer-transport-picker panel"><div><label for="transport-purchase-select">${t("কেনাকাটা থাকলে বাছুন", "Select a purchase if you have one")}</label><select id="transport-purchase-select"><option value="">${t("কেনাকাটা বাছুন", "Select a purchase")}</option>${purchases.map(row => `<option value="${esc(row.id)}">${esc(row.variety)} · ${format.format(row.quantityKg)} ${t("কেজি", "kg")} · ${esc(row.id.slice(0, 8))}</option>`).join("")}</select></div><button type="button" class="button button-outline" id="buyer-sample-route">${t("রংপুর–ঢাকা পথ দেখুন", "Show Rangpur–Dhaka route")}</button></div>` : "";

  const total = Number.isFinite(Number(amount)) && amount != null ? Number(amount) : null;
  const providerCard = `<section class="buyer-transport-provider panel"><div><span class="section-kicker">${t("গাড়ি খুঁজুন", "FIND A TRUCK")}</span><h2>Truck Lagbe</h2><p>${t("আপনার পথ ও আলুর পরিমাণ নিয়ে সরাসরি সেবাদাতার সঙ্গে কথা বলুন। আলুসাথী গাড়ি বুক করে না।", "Share the route and load with the provider yourself. AluSathi does not book trucks.")}</p><strong>${t("Booking is completed outside AluSathi.", "Booking is completed outside AluSathi.")}</strong></div><div class="buyer-transport-trip"><label for="buyer-trip-text">${t("পাঠানোর তথ্য", "Trip details")}</label><textarea id="buyer-trip-text" rows="5" readonly></textarea><div class="buyer-provider-actions"><button type="button" class="button button-outline" id="buyer-copy-trip">${t("তথ্য কপি করুন", "Copy trip details")}</button><a class="button button-green" href="https://trucklagbe.com/" target="_blank" rel="noopener noreferrer">${t("Truck Lagbe খুলুন ↗", "Open Truck Lagbe ↗")}</a></div><p id="buyer-copy-status" role="status"></p></div></section>`;
  root.innerHTML = `<div class="buyer-transport-head"><span class="section-kicker">${t("আলুর পথ", "POTATO JOURNEY")}</span><h1>${blankDemo ? t("পরিবহন দেখে নিন", "Explore transport") : t("পরিবহন ঠিক করুন", "Plan the pickup")}</h1><p>${purchase ? t("কেনাকাটার তথ্য বসানো আছে। গাড়ি ঠিক করবেন বাইরের সেবায়।", "Purchase details are filled in. Arrange a truck with the provider directly.") : blankDemo ? t("কিছু না লিখেও সব সুবিধা দেখতে পারবেন। তথ্য খালি থাকবে; কিছু রাখা বা বুক করা হবে না।", "Explore every feature without entering details. Nothing is saved or booked.") : t("লট থেকে আগেই পথ দেখে নিন। এটি কেনাকাটা বা বুকিং নয়।", "Preview the route from this lot. This is not a purchase or booking.")}</p></div>${chooser}${providerCard}
    <form id="buyer-transport-form">
    <section class="buyer-transport-route-fields panel"><div class="buyer-transport-field"><label for="buyer-transport-from">${t("কোথা থেকে তুলবেন", "Pickup district")}</label><select id="buyer-transport-from" name="from">${options(from)}</select></div><div class="buyer-transport-field"><label for="buyer-transport-to">${t("কোথায় নামাবেন", "Destination district")}</label><select id="buyer-transport-to" name="to">${options(to)}</select></div><div class="buyer-transport-field"><label for="buyer-transport-date">${t("সংগ্রহের তারিখ", "Collection date")}</label><input id="buyer-transport-date" name="date" type="date" value="${esc(date)}" required /></div></section>
    <section class="buyer-transport-map panel" aria-labelledby="buyer-map-title"><div class="buyer-map-heading"><div><span class="section-kicker">${t("যাত্রাপথ", "THE JOURNEY")}</span><h2 id="buyer-map-title">${t("যাত্রাপথের মানচিত্র", "Illustrated route map")}</h2></div></div><div class="buyer-map-layout"><div class="buyer-map-art"><img src="./buyer-map-regions.png" alt="" /><svg class="buyer-map-overlay" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(t("চিত্রিত বাংলাদেশ মানচিত্র", "Illustrated Bangladesh map"))}"><g class="buyer-map-city-layer">${cityMarkers}</g><g id="buyer-route-layer"></g></svg><span id="buyer-map-empty" class="buyer-map-empty" hidden>${t("রংপুর–ঢাকা পথ দেখুন, বা দুটি জেলা বাছুন", "Show the Rangpur–Dhaka route, or choose two districts")}</span></div><aside class="buyer-map-sidebar" aria-label="${esc(t("পথের জায়গাগুলো", "Route locations"))}"><div class="buyer-map-stop from"><span aria-hidden="true">A</span><div><small>${t("তোলার জায়গা", "PICKUP")}</small><strong id="buyer-map-from"></strong></div></div><div class="buyer-map-stop to"><span aria-hidden="true">B</span><div><small>${t("নামানোর জায়গা", "DESTINATION")}</small><strong id="buyer-map-to"></strong></div></div><button id="buyer-map-motion" type="button" class="button button-outline button-small" aria-pressed="false">${t("থামান", "Pause")}</button><div class="buyer-map-divisions"><strong>${t("৮ বিভাগ ও শহর", "8 DIVISIONS & CITIES")}</strong><div>${divisionGuide}</div></div><p>${t("শহরের চিহ্নগুলো চিত্রিত, প্রশাসনিক সীমানা নয়। গাড়ির সরাসরি অবস্থানও নয়।", "City markers are illustrative, not administrative borders or live truck positions.")}</p></aside></div><p class="buyer-map-note">${t("চিত্রিত রুট · সরাসরি ট্র্যাকিং নয় · দূরত্ব বা পৌঁছানোর সময় দেখায় না", "Illustrated route · not live tracking · no road distance or arrival time implied")}</p></section>
    ${purchase || blankDemo ? `<section class="buyer-transport-arrangement panel"><div><span class="section-kicker">${purchase ? t("এই কেনাকাটায় রাখুন", "SAVE TO THIS PURCHASE") : t("পরিবহনের তথ্য", "TRANSPORT DETAILS")}</span><h2>${t("পরিবহনের ব্যবস্থা", "Transport arrangement")}</h2><p>${purchase ? t("নিজে ঠিক করা গাড়ির তথ্য রাখুন। এটি সেবাদাতার নিশ্চিত বুকিং নয়।", "Record the truck you arranged. This is buyer-reported, not a provider-confirmed booking.") : t("ফর্ম দেখতে পারেন। কেনাকাটা না বাছলে কিছু রাখা হবে না।", "Explore the form. Nothing can be saved without selecting a purchase.")}</p></div><div class="buyer-transport-save-fields"><label>${t("গাড়ির প্রতিষ্ঠান / মালিক (ঐচ্ছিক)", "Operator / business (optional)")}<input name="operator" maxlength="80" value="${esc(saved?.operator || "")}" /></label><label>${t("সম্মত গাড়িভাড়া (টাকা)", "Agreed transport fare (BDT)")}<input name="fare" type="number" min="0" max="10000000" step="0.01" inputmode="decimal" value="${saved ? esc(saved.fare) : ""}" ${purchase ? "required" : ""} /></label></div><div class="buyer-provider-actions"><button class="button button-green" type="submit" ${purchase ? "" : "disabled"}>${saved ? t("ব্যবস্থা বদলে রাখুন", "Update arrangement") : t("পরিবহন ঠিক হয়েছে", "Transport arranged")}</button>${purchase ? `<button type="button" class="button button-outline" id="buyer-clear-transport" ${saved ? "" : "hidden"}>${t("ব্যবস্থা মুছুন", "Clear arrangement")}</button>` : ""}</div><p id="buyer-arrangement-status" role="status"></p><div id="buyer-arrangement-summary"></div></section>` : `<p class="buyer-transport-preview-note">${t("এটি শুধু আগাম দেখা। কেনাকাটা হলে সেখানে পরিবহন রাখার সুযোগ পাবেন।", "Preview only. Once you have a purchase, you can save its transport arrangement.")}</p>`}</form>`;

  const form = root.querySelector("#buyer-transport-form");
  const fromInput = form.elements.from, toInput = form.elements.to, dateInput = form.elements.date;
  const motion = root.querySelector("#buyer-map-motion");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = reduceMotion;
  const rememberRoute = () => { try { sessionStorage.setItem(routeKey, JSON.stringify({ from: fromInput.value, to: toInput.value, date: dateInput.value })); } catch { /* The current page still works. */ } };
  if (reduceMotion) { motion.disabled = true; motion.textContent = t("গতি কমানো আছে", "Reduced motion on"); }
  const status = message => { root.querySelector("#buyer-arrangement-status")?.replaceChildren(document.createTextNode(message)); };
  const xy = p => ({ x: 330 + (p.lon - 88) * 190, y: 80 + (26.1 - p.lat) * 175 });
  function updateMap() {
    const ready = districtPlaces[fromInput.value] && districtPlaces[toInput.value];
    if (!ready) {
      root.querySelector("#buyer-route-layer").replaceChildren();
      root.querySelector("#buyer-map-from").textContent = fromInput.value ? place(fromInput.value) : "—";
      root.querySelector("#buyer-map-to").textContent = toInput.value ? place(toInput.value) : "—";
      root.querySelector("#buyer-map-empty").hidden = false;
      motion.disabled = true;
      root.querySelector("#buyer-trip-text").value = [`${t("পণ্য", "Product")}: ${t("আলু", "Potatoes")}`, `${t("কোথা থেকে", "Pickup")}: ${fromInput.value ? place(fromInput.value) : ""}`, `${t("কোথায়", "Destination")}: ${toInput.value ? place(toInput.value) : ""}`, `${t("পরিমাণ", "Quantity")}: ${kg === null ? "" : `${format.format(kg)} ${t("কেজি", "kg")}`}`, `${t("সংগ্রহের তারিখ", "Collection date")}: ${dateInput.value}`].join("\n");
      return;
    }
    root.querySelector("#buyer-map-empty").hidden = true;
    motion.disabled = reduceMotion;
    const start = xy(districtPlaces[fromInput.value]), end = xy(districtPlaces[toInput.value]);
    const same = fromInput.value === toInput.value;
    const curve = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${((start.x + end.x) / 2 + 50).toFixed(1)} ${((start.y + end.y) / 2 + 10).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    const pin = (p, label, kind) => `<g class="buyer-map-pin ${kind}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="33"/><text text-anchor="middle" y="11">${label}</text></g>`;
    root.querySelector("#buyer-route-layer").innerHTML = same ? pin(start, "A/B", "combined") : `<path class="buyer-map-route-shadow" d="${curve}"/><path class="buyer-map-route" d="${curve}"/><g class="buyer-map-truck" ${reduceMotion ? `transform="translate(${start.x} ${start.y})"` : ""}><g transform="rotate(90)"><image href="./buyer-truck-top.png" x="-34" y="-62" width="68" height="124"/></g>${reduceMotion ? "" : `<animateMotion begin="-3s" dur="8s" repeatCount="indefinite" rotate="auto" path="${curve}"/>`}</g>${pin(start, "A", "from")}${pin(end, "B", "to")}`;
    const svg = root.querySelector(".buyer-map-overlay");
    if (paused && !reduceMotion) svg.pauseAnimations();
    root.querySelector("#buyer-map-from").textContent = place(fromInput.value);
    root.querySelector("#buyer-map-to").textContent = place(toInput.value);
    const trip = [`${t("পণ্য", "Product")}: ${t("আলু", "Potatoes")}`, `${t("কোথা থেকে", "Pickup")}: ${place(fromInput.value)}`, `${t("কোথায়", "Destination")}: ${place(toInput.value)}`, `${t("পরিমাণ", "Quantity")}: ${kg === null ? "" : `${format.format(kg)} ${t("কেজি", "kg")}`}`, `${t("সংগ্রহের তারিখ", "Collection date")}: ${dateInput.value}`].join("\n");
    root.querySelector("#buyer-trip-text").value = trip;
  }
  function showSummary() {
    const box = root.querySelector("#buyer-arrangement-summary");
    if (!box) return;
    const record = purchase ? readBuyerTransport(purchase.id) : null;
    box.innerHTML = record ? `<div class="buyer-arrangement-facts"><div><span>${t("আপনার লেখা ব্যবস্থা", "Buyer-reported arrangement")}</span><strong>${esc(record.operator || t("নাম দেওয়া হয়নি", "Not named"))}</strong></div><div><span>${t("সংগ্রহ", "Collection")}</span><strong>${esc(record.date)}</strong></div><div><span>${t("সম্মত গাড়িভাড়া", "Agreed fare")}</span><strong>${money(record.fare)}</strong></div><div><span>${t("আলু + গাড়িভাড়া", "Potatoes + transport")}</span><strong>${total === null ? "—" : money(total + record.fare)}</strong></div></div><small>${t("অন্যান্য খরচ এতে ধরা নেই। কোনো বুকিং বা পেমেন্ট আলুসাথী যাচাই করেনি।", "Other expenses are excluded. AluSathi has not verified booking or payment.")}</small>` : "";
  }
  updateMap(); showSummary();
  if (blankDemo) {
    root.querySelector("#transport-purchase-select").addEventListener("change", event => { if (purchases.some(row => row.id === event.target.value)) onSelectPurchase(event.target.value); });
    root.querySelector("#buyer-sample-route").addEventListener("click", () => { fromInput.value = "Rangpur"; toInput.value = "Dhaka"; rememberRoute(); updateMap(); });
    form.addEventListener("submit", event => event.preventDefault());
  }
  for (const input of [fromInput, toInput, dateInput]) input.addEventListener("change", () => { rememberRoute(); updateMap(); });
  motion.addEventListener("click", () => { paused = !paused; const svg = root.querySelector(".buyer-map-overlay"); paused ? svg.pauseAnimations() : svg.unpauseAnimations(); motion.textContent = paused ? t("চালান", "Play") : t("থামান", "Pause"); motion.setAttribute("aria-pressed", String(paused)); });
  root.querySelector("#buyer-copy-trip").addEventListener("click", async () => {
    const textarea = root.querySelector("#buyer-trip-text");
    try { await navigator.clipboard.writeText(textarea.value); root.querySelector("#buyer-copy-status").textContent = t("তথ্য কপি হয়েছে।", "Trip details copied."); }
    catch { textarea.focus(); textarea.select(); root.querySelector("#buyer-copy-status").textContent = t("কপি করা যায়নি। লেখা বেছে দেওয়া হয়েছে—নিজে কপি করুন।", "Clipboard unavailable. Text selected; copy it manually."); }
  });
  if (purchase) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const fare = form.elements.fare.value;
      const operator = form.elements.operator.value.trim();
      if (!validFare(fare) || !validDate(dateInput.value) || operator.length > 80 || !districtPlaces[fromInput.value] || !districtPlaces[toInput.value]) { status(t("সঠিক তারিখ ও গাড়িভাড়া দিন।", "Enter a valid date and fare.")); return; }
      const next = records();
      next[purchase.id] = { operator, fare: Number(fare), date: dateInput.value, from: fromInput.value, to: toInput.value };
      try { localStorage.setItem(key, JSON.stringify(next)); status(t("এই কেনাকাটায় পরিবহনের ব্যবস্থা রাখা হয়েছে।", "Arrangement saved to this purchase.")); showSummary(); root.querySelector("#buyer-clear-transport").hidden = false; }
      catch { status(t("এই ব্রাউজারে রাখা যায়নি। আবার চেষ্টা করুন।", "Could not save on this device. Try again.")); }
    });
    root.querySelector("#buyer-clear-transport")?.addEventListener("click", () => {
      const next = records(); delete next[purchase.id];
      try { localStorage.setItem(key, JSON.stringify(next)); form.elements.operator.value = ""; form.elements.fare.value = ""; showSummary(); status(t("ব্যবস্থা মুছে দেওয়া হয়েছে।", "Arrangement cleared.")); root.querySelector("#buyer-clear-transport").hidden = true; }
      catch { status(t("মুছতে পারা যায়নি। আবার চেষ্টা করুন।", "Could not clear the arrangement.")); }
    });
  }
}
