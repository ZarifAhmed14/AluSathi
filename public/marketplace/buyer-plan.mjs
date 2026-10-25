const draftKey = "alusathi-buyer-plan-draft-v1";
const checksKey = "alusathi-buyer-collection-checks-v1";
const tasks = [
  ["lot", "লট ও আলুর ছবি মিলিয়ে দেখুন", "Match the lot against its photos"],
  ["condition", "পচা, কাটা ও ভেজা আলু পরীক্ষা করুন", "Check for rot, cuts, and damp potatoes"],
  ["weight", "বস্তাসহ ওজন, বস্তার ওজন ও নিট কেজি লিখুন", "Record gross, sack weight, and net kilograms"],
  ["deduction", "কাটতি ও নেওয়া কেজি দুই পক্ষ মিলে ঠিক করুন", "Agree on deductions and accepted kilograms"],
  ["truck", "গাড়ি, ভাড়া ও তোলার লোক নিশ্চিত করুন", "Confirm the truck, fare, and loading help"],
  ["receipt", "ছবি বা রসিদ রেখে দিন; টাকা আলাদা করে মিলান", "Keep photos or a receipt; confirm payment separately"],
];
const dhakaTruckFare = { Rangpur: 8500, Dinajpur: 9000, Bogura: 6000, Rajshahi: 7500, Khulna: 7500, Barishal: 9000, Mymensingh: 4500, Sylhet: 8500, Chattogram: 9000, Dhaka: 3000 };
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const latinDigits = value => String(value ?? "").replace(/[০-৯]/g, digit => "০১২৩৪৫৬৭৮৯".indexOf(digit));
const read = key => { try { const value = JSON.parse(localStorage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The page still works for this session. */ } };
const amount = value => value === "" || value == null ? null : Number(latinDigits(value));
const valid = value => value !== null && Number.isFinite(value) && value >= 0;
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const fareFor = (district, kilograms) => Math.max(1500, round((dhakaTruckFare[district] ?? 7000) * Math.min(Math.max(kilograms, 0), 1000) / 1000));

export function compareLotCosts(lot, kilograms, resalePerKg, transportFare, otherCost) {
  const min = Number(lot?.askingPriceMin), max = Number(lot?.askingPriceMax);
  if (!Number.isFinite(kilograms) || kilograms <= 0 || !valid(min) || !valid(max) || max < min || !valid(transportFare) || !valid(otherCost)) return null;
  const potatoMin = round(kilograms * min), potatoMax = round(kilograms * max);
  const costMin = round(potatoMin + transportFare + otherCost), costMax = round(potatoMax + transportFare + otherCost);
  const revenue = valid(resalePerKg) ? round(kilograms * resalePerKg) : null;
  return { potatoMin, potatoMax, costMin, costMax, revenue, profitMin: revenue === null ? null : round(revenue - costMax), profitMax: revenue === null ? null : round(revenue - costMin) };
}

export function mountBuyerPlan(root, { language, lots, deals, comparedIds, savedLotIds }) {
  if (!root) return;
  const tr = (bn, en) => language === "bn" ? bn : en;
  const money = value => `৳${new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", { maximumFractionDigits: 0 }).format(value)}`;
  const number = value => new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", { maximumFractionDigits: 0 }).format(value);
  const stored = read(draftKey);
  const available = lots.filter(lot => Number(lot.quantityKg) > 0 && Number.isFinite(Number(lot.askingPriceMin)) && Number.isFinite(Number(lot.askingPriceMax)));
  const preferred = [...new Set([...(savedLotIds || []), ...comparedIds])].filter(id => available.some(lot => lot.id === id)).slice(0, 4);
  const prior = Array.isArray(stored.lotIds) ? stored.lotIds.filter(id => available.some(lot => lot.id === id)).slice(0, 4) : [];
  const storedResale = amount(stored.resale);
  const state = {
    lotIds: preferred.length ? preferred : (prior.length ? prior : available.slice(0, 2).map(lot => lot.id)),
    kilograms: stored.kilograms ?? "200", budget: stored.budget ?? "", resale: String(Math.min(80, Math.max(20, Number.isFinite(storedResale) ? storedResale : 45))), truckCost: stored.truckCost ?? "", other: stored.other ?? "",
    collection: deals.some(deal => deal.id === stored.collection) ? stored.collection : `lot:${available[0]?.id || ""}`,
  };
  const draft = () => write(draftKey, state);
  const collectionOptions = () => `${deals.map(deal => `<option value="${escapeHtml(deal.id)}" ${state.collection === deal.id ? "selected" : ""}>${tr("কেনা", "Purchased")} · ${escapeHtml(deal.variety || deal.id.slice(0, 8))}</option>`).join("")}${available.map(lot => `<option value="lot:${escapeHtml(lot.id)}" ${state.collection === `lot:${lot.id}` ? "selected" : ""}>${tr("আলুর লট", "Potato lot")} · ${escapeHtml(lot.variety)}</option>`).join("")}`;
  root.innerHTML = `<header class="buyer-plan-head"><p class="section-kicker">${tr("লাভ ও সংগ্রহ", "PROFIT & PICKUP")}</p><h1>${tr("নিজের হিসাব মিলিয়ে নিন", "Try your own numbers.")}</h1><p>${tr("পছন্দের লট, ঢাকা পর্যন্ত আনুমানিক গাড়িভাড়া ও বিক্রির দরে কী বদলায় দেখুন।", "See how saved lots, estimated freight to Dhaka, and resale price change the outcome.")}</p></header>
    <section class="buyer-plan-panel buyer-plan-tools" aria-labelledby="buyer-plan-cost-title"><div class="buyer-plan-panel-heading"><span class="buyer-plan-step">01</span><div><p class="section-kicker">${tr("পছন্দের লট", "SAVED LOTS")}</p><h2 id="buyer-plan-cost-title">${tr("তুলনা করে দেখুন", "Compare your options")}</h2></div></div>
      <div class="buyer-plan-controls buyer-plan-controls-five"><label>${tr("কত কেজি", "Kilograms")}<input name="kilograms" type="text" inputmode="decimal" value="${escapeHtml(state.kilograms)}"></label><label>${tr("সর্বোচ্চ মোট বাজেট (৳)", "Maximum total budget (৳)")}<input name="budget" type="text" inputmode="decimal" placeholder="${tr("না থাকলে খালি রাখুন", "Optional")}" value="${escapeHtml(state.budget)}"></label><label>${tr("গাড়ি খরচ (৳)", "Truck cost (৳)")}<input name="truckCost" type="text" inputmode="decimal" placeholder="${tr("না লিখলে আনুমানিক ভাড়া", "Use estimate if blank")}" value="${escapeHtml(state.truckCost)}"></label><label>${tr("অন্য খরচ (৳)", "Other cost (৳)")}<input name="other" type="text" inputmode="decimal" placeholder="${tr("না থাকলে ৳০", "Optional, ৳0")}" value="${escapeHtml(state.other)}"></label><label class="buyer-plan-slider">${tr("বিক্রির দাম, প্রতি কেজি", "Resale price per kg")}<span><input name="resale" type="range" min="20" max="80" step="1" value="${escapeHtml(state.resale)}" aria-describedby="buyer-plan-price"><output id="buyer-plan-price"></output></span></label></div><p id="buyer-plan-error" class="buyer-plan-error" role="status"></p>
      <div class="buyer-plan-table-wrap"><table class="buyer-plan-table"><thead><tr><th>${tr("লট", "Lot")}</th><th>${tr("দাম / কেজি", "Price / kg")}</th><th>${tr("ঢাকা পর্যন্ত ভাড়া", "Dhaka freight")}</th><th>${tr("মোট খরচ", "Total cost")}</th><th>${tr("বিক্রির টাকা", "Resale")}</th><th>${tr("পার্থক্য", "Difference")}</th></tr></thead><tbody></tbody></table></div><p class="buyer-plan-footnote">${tr("গাড়ি খরচ না লিখলে নির্বাচিত কেজির জন্য স্থানীয় আনুমানিক ভাড়া দেখানো হয়। এখানে শুধু তুলনা করুন—সিদ্ধান্ত আপনার।", "If truck cost is blank, the table uses a local freight estimate for the selected kilograms. This is for comparison only—the decision is yours.")}</p></section>
    <section class="buyer-plan-panel buyer-plan-checks" aria-labelledby="buyer-plan-check-title"><div class="buyer-plan-panel-heading"><span class="buyer-plan-step gold">02</span><div><p class="section-kicker">${tr("সংগ্রহের দিন", "COLLECTION DAY")}</p><h2 id="buyer-plan-check-title">${tr("সাথে রাখার তালিকা", "Pickup checklist")}</h2></div></div><p class="buyer-plan-intro">${tr("টিকগুলো শুধু এই ব্রাউজারে আপনার মনে রাখার জন্য থাকে।", "Your checks are saved in this browser only.")}</p><label class="buyer-plan-collection-picker">${tr("কোন কেনাকাটা বা লট", "Purchase or lot")}<select name="collection">${collectionOptions()}</select></label><div class="buyer-plan-check-progress" aria-live="polite"></div><div class="buyer-plan-task-list"></div><button type="button" class="buyer-plan-reset" data-plan-action="reset-checks">${tr("এই তালিকার টিক মুছুন", "Reset these checks")}</button></section>`;

  function update() {
    const quantity = amount(state.kilograms), budget = amount(state.budget), resale = amount(state.resale), truckCost = amount(state.truckCost), otherCost = amount(state.other);
    const bad = quantity === null || quantity <= 0 || !valid(quantity) || !valid(resale) || (budget !== null && !valid(budget)) || (truckCost !== null && !valid(truckCost)) || (otherCost !== null && !valid(otherCost));
    root.querySelector("#buyer-plan-error").textContent = bad ? tr("সঠিক কেজি ও টাকা লিখুন।", "Enter valid kilograms and amounts.") : "";
    root.querySelector("#buyer-plan-price").textContent = `${money(resale ?? 0)} / ${tr("কেজি", "kg")}`;
    const body = root.querySelector(".buyer-plan-table tbody");
    body.innerHTML = state.lotIds.map(id => {
      const lot = available.find(item => item.id === id);
      if (!lot || bad || quantity > Number(lot.quantityKg)) return `<tr><th scope="row">${escapeHtml(lot?.variety || "—")}</th><td colspan="5" class="buyer-plan-table-note">${quantity > Number(lot?.quantityKg) ? tr("এই লটে এত কেজি নেই", "This lot has fewer kilograms") : tr("হিসাবের তথ্য ঠিক করুন", "Correct the figures")}</td></tr>`;
      const fare = truckCost === null ? fareFor(lot.district, quantity) : truckCost, result = compareLotCosts(lot, quantity, resale, fare, otherCost ?? 0), difference = result.profitMin;
      const range = (low, high) => low === high ? money(low) : `${money(low)}–${money(high)}`;
      const sign = difference >= 0 ? "+" : "−";
      return `<tr><th scope="row"><strong>${escapeHtml(lot.variety)}</strong><small>${escapeHtml(lot.upazila || lot.district || "")} → ${tr("ঢাকা", "Dhaka")}</small></th><td>${range(Number(lot.askingPriceMin), Number(lot.askingPriceMax))}</td><td>${money(fare)}</td><td>${range(result.costMin, result.costMax)}${budget !== null ? `<small class="${result.costMax <= budget ? "within" : "over"}">${result.costMax <= budget ? tr("বাজেটের মধ্যে", "Within budget") : tr("বাজেটের বাইরে", "Over budget")}</small>` : ""}</td><td>${money(result.revenue)}</td><td class="${difference < 0 ? "negative" : "positive"}">${sign}${money(Math.abs(difference))}<small>${tr("সতর্ক হিসাব", "Conservative")}</small></td></tr>`;
    }).join("") || `<tr><td colspan="6" class="buyer-plan-table-note">${tr("তুলনা করতে আলুর তালিকা থেকে লট পছন্দে রাখুন।", "Save lots from the catalogue to compare them here.")}</td></tr>`;
    const collection = deals.find(deal => deal.id === state.collection);
    const selectedLot = collection ? available.find(lot => lot.id === collection.lotId) : available.find(lot => `lot:${lot.id}` === state.collection);
    const allChecks = read(checksKey), done = Array.isArray(allChecks[state.collection]) ? allChecks[state.collection] : [];
    root.querySelector(".buyer-plan-check-progress").textContent = `${number(tasks.filter(([id]) => done.includes(id)).length)} / ${number(tasks.length)} ${tr("শেষ", "complete")}${selectedLot || collection ? ` · ${selectedLot?.variety || collection.variety}` : ""}`;
    root.querySelector(".buyer-plan-task-list").innerHTML = tasks.map(([id, bn, en], index) => `<label class="buyer-plan-task ${done.includes(id) ? "done" : ""}"><input type="checkbox" data-plan-check="${id}" ${done.includes(id) ? "checked" : ""}><span class="buyer-plan-task-number">${number(index + 1).padStart(2, "0")}</span><span>${tr(bn, en)}</span></label>`).join("");
  }
  root.addEventListener("input", event => { const field = event.target.name; if (!["kilograms", "budget", "truckCost", "other", "resale"].includes(field)) return; state[field] = event.target.value.slice(0, 16); draft(); update(); });
  root.addEventListener("change", event => {
    if (event.target.name === "collection") { state.collection = event.target.value; draft(); update(); return; }
    if (event.target.dataset.planCheck) { const allChecks = read(checksKey), current = new Set(Array.isArray(allChecks[state.collection]) ? allChecks[state.collection] : []); event.target.checked ? current.add(event.target.dataset.planCheck) : current.delete(event.target.dataset.planCheck); allChecks[state.collection] = [...current]; write(checksKey, allChecks); update(); }
  });
  root.addEventListener("click", event => { if (event.target.closest("[data-plan-action]")?.dataset.planAction !== "reset-checks") return; const allChecks = read(checksKey); delete allChecks[state.collection]; write(checksKey, allChecks); update(); });
  update();
}
