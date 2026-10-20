import { useEffect, useState } from "react";
import { BookOpen, Calculator, Droplets, Leaf, Plus, Ruler, Sprout, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { areaSquareMetres, dosageAmount, potatoFertilizerEstimate, sampleYield, type AreaUnit } from "@/lib/farmer-tools";
import { localToday } from "@/lib/local-date";
import { breakEven, saveLedger, readLedger, type ExpenseCategory, type FarmExpense } from "@/lib/farm-ledger";
import TreatmentReminders from "@/components/TreatmentReminders";

const CARE = [
  { icon: "🌱", title: ["গাছ নিয়মিত দেখে রাখুন", "Check plants regularly"], body: ["একই জায়গার কয়েকটি গাছ দেখুন। নতুন পরিবর্তন চোখে পড়লে ছবি ও তারিখ লিখে রাখুন।", "Check a few plants in the same area. Record a photo and date when you notice a change."], source: "https://www.bamis.gov.bd/en/diseases/1/all/52/" },
  { icon: "💧", title: ["জমিতে পানি জমেছে কি না দেখুন", "Check for standing water"], body: ["বৃষ্টির পর জমির নালা ও পানি বের হওয়ার পথ দেখুন। সেচের আগে মাটির অবস্থা মিলিয়ে নিন।", "After rain, check field drains and water exits. Check soil conditions before irrigating."], source: "https://www.bamis.gov.bd/en/bulletin/view/32810/" },
  { icon: "🧺", title: ["তোলার পর বাছাই ও সংরক্ষণ", "Sort and store after harvest"], body: ["তোলার সময়, জাত ও আলুর অবস্থার ওপর সংরক্ষণের নিয়ম বদলায়। স্থানীয় কৃষি পরামর্শ মিলিয়ে নিন।", "Storage depends on harvest timing, variety and tuber condition. Confirm local handling advice."], source: "https://www.bamis.gov.bd/en/bulletin/view/32810/" },
  { icon: "📘", title: ["আলু চাষের সরকারি নির্দেশিকা", "Official potato-growing guide"], body: ["কৃষি সম্প্রসারণ অধিদপ্তরের আলু চাষাবাদের আধুনিক পদ্ধতির লিফলেট খুলুন।", "Open the Department of Agricultural Extension leaflet on modern potato cultivation."], source: "https://dae.gov.bd/site/page/098cab3c-9f3e-4f2c-bcfd-f1becf2a672c/site/biography/b2c254da-2402-447c-ac88-5f4efc4c0310" },
];

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Calculator; children: React.ReactNode }) {
  return <section className="ledger-panel"><h2><span><Icon size={20} /></span>{title}</h2>{children}</section>;
}

export default function FarmerTools({ showReminders = true, todayMode = false }: { showReminders?: boolean; todayMode?: boolean }) {
  const { user } = useAuth(); const { language } = useLanguage(); const bn = language === "bn";
  const areaKey = `alusathi-field-area-${user?.id || "guest"}`;
  const scheduleKey = `alusathi-next-fertilizer-${user?.id || "guest"}`;
  const [area, setArea] = useState(() => localStorage.getItem(areaKey) || ""); const [unit, setUnit] = useState<AreaUnit>(() => (localStorage.getItem(`${areaKey}-unit`) as AreaUnit) || "decimal"); const [bigha, setBigha] = useState(() => localStorage.getItem(`${areaKey}-bigha`) || "33");
  const [nextFertilizerDate, setNextFertilizerDate] = useState(() => localStorage.getItem(scheduleKey) || "");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("seed"); const [expenseAmount, setExpenseAmount] = useState(""); const [expenseDate, setExpenseDate] = useState(localToday()); const [expenseNote, setExpenseNote] = useState(""); const [message, setMessage] = useState("");
  const [saleable, setSaleable] = useState(""); const [samples, setSamples] = useState(["", "", ""]); const [sampleArea, setSampleArea] = useState("");
  const [sprayRate, setSprayRate] = useState(""); const [sprayBasis, setSprayBasis] = useState<"hectare" | "decimal" | "litre">("litre"); const [rateUnit, setRateUnit] = useState("ml"); const [sprayWater, setSprayWater] = useState(""); const [query, setQuery] = useState(""); const [lastResult, setLastResult] = useState("");
  const ledger = readLedger(user?.id);
  const expenses = ledger.filter((entry): entry is FarmExpense => entry.type === "expense");
  const totalCosts = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const number = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  const productUnit = bn ? (rateUnit === "g" ? "গ্রাম" : "মিলিলিটার") : rateUnit;
  const labels = { seed: bn ? "বীজ" : "Seed", manure: bn ? "সার / গোবর" : "Manure", labour: bn ? "শ্রম" : "Labour", irrigation: bn ? "সেচ" : "Irrigation", transport: bn ? "পরিবহন" : "Transport", other: bn ? "অন্যান্য" : "Other" };
  let areaM2: number | null = null;
  try { areaM2 = areaSquareMetres(Number(area), unit, Number(bigha)); } catch { /* Empty until a valid field area is entered. */ }
  let fertilizerEstimate: ReturnType<typeof potatoFertilizerEstimate> | null = null;
  try { if (areaM2) fertilizerEstimate = potatoFertilizerEstimate(areaM2); } catch { /* Wait for a valid area. */ }
  let sprayAmount: number | null = null;
  try { if (sprayRate && (sprayBasis !== "litre" || sprayWater)) sprayAmount = dosageAmount(areaM2 || 0, Number(sprayRate), sprayBasis, Number(sprayWater)); } catch { /* Wait for a valid label rate and required volume. */ }
  const money = (amount: number) => `৳${number(amount)}`;
  let breakEvenPrice: number | null = null;
  try { if (saleable) breakEvenPrice = breakEven(totalCosts, Number(saleable)); } catch { /* Wait for valid positive quantity and a recorded cost. */ }

  function remember(category: string, title: string, inputs: Record<string, string | number>, result: Record<string, string | number>, summary: string) {
    const entry = { type: "calculation" as const, id: crypto.randomUUID(), date: localToday(), category, title, inputs, result };
    try { saveLedger(entry, user?.id); setLastResult(summary); setMessage(bn ? "হিসাব খাতায় রাখা হয়েছে।" : "Calculation saved to the notebook."); }
    catch { setMessage(bn ? "হিসাব সেভ হয়নি। আবার চেষ্টা করুন।" : "Could not save. Please try again."); }
  }
  function addExpense(event: React.FormEvent) {
    event.preventDefault(); const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9 || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) { setMessage(bn ? "তারিখ ও খরচ ঠিক করে লিখুন।" : "Check the date and expense amount."); return; }
    const entry: FarmExpense = { type: "expense", id: crypto.randomUUID(), date: expenseDate, category: expenseCategory, amount, note: expenseNote.trim().slice(0, 120) };
    try { saveLedger(entry, user?.id); setExpenseAmount(""); setExpenseNote(""); setMessage(bn ? "খরচ খাতায় রাখা হয়েছে।" : "Expense added to the notebook."); }
    catch { setMessage(bn ? "খরচ সেভ হয়নি। আবার চেষ্টা করুন।" : "Could not save the expense. Try again."); }
  }
  function saveFertilizerEstimate() {
    if (!areaM2 || !fertilizerEstimate) return;
    const result = Object.fromEntries(fertilizerEstimate.map(item => [item.key, item.amountKg]));
    remember("fertilizer", bn ? "আলুর সারের হিসাব" : "Potato fertilizer estimate", { area: Number(area), unit, guide: "BARC-2013" }, result, bn ? "সারের হিসাব খাতায় রাখা হয়েছে" : "Fertilizer estimate saved");
  }
  function calculateSpray() {
    try {
      if (sprayAmount === null) throw new Error();
      remember("spray-mix", bn ? "লেবেল অনুযায়ী স্প্রে মিশ্রণ" : "Label-based spray mix", { fieldArea: Number(area), areaUnit: unit, labelRate: Number(sprayRate), rateBasis: sprayBasis, waterLitres: sprayBasis === "litre" ? Number(sprayWater) : 0, productUnit: rateUnit }, { amount: sprayAmount, unit: rateUnit }, `${number(sprayAmount)} ${productUnit}`);
    } catch { setMessage(bn ? "লেবেলের মাত্রা ও প্রয়োজনীয় পানির পরিমাণ মিলিয়ে দেখুন।" : "Check the label rate and required water volume."); }
  }
  function calculateYield() {
    try {
      const result = sampleYield(areaM2 || 0, areaSquareMetres(Number(sampleArea), unit, Number(bigha)), samples.map(Number));
      const summary = `${number(result.low)}–${number(result.high)} ${bn ? "কেজি" : "kg"}`;
      remember("yield", bn ? "নমুনা থেকে ফলনের হিসাব" : "Sample-based yield estimate", { area: Number(area), sampleArea: Number(sampleArea), unit, weightsKg: samples.join(",") }, { lowKg: result.low, estimateKg: result.estimate, highKg: result.high }, summary);
    } catch { setMessage(bn ? "জমির মাপের মধ্যে সমান মাপের ৩টি নমুনা ওজন লিখুন।" : "Enter three positive weights from equal sample plots inside the field area."); }
  }
  const visibleCare = CARE.filter(item => `${item.title.join(" ")} ${item.body.join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setArea(localStorage.getItem(areaKey) || "");
    setUnit((localStorage.getItem(`${areaKey}-unit`) as AreaUnit) || "decimal");
    setBigha(localStorage.getItem(`${areaKey}-bigha`) || "33");
    setNextFertilizerDate(localStorage.getItem(scheduleKey) || "");
  }, [areaKey, scheduleKey]);

  const today = localToday();
  const dayStamp = (value: string) => { const [year, month, day] = value.split("-").map(Number); return Date.UTC(year, month - 1, day); };
  const fertilizerDays = nextFertilizerDate ? Math.round((dayStamp(nextFertilizerDate) - dayStamp(today)) / 86_400_000) : null;

  if (todayMode) return <section className="today-field-tools app-shell">
    <header><p className="section-kicker">{bn ? "জমির মাপ ও যত্ন" : "Field size and care"}</p><h2>{bn ? "জমির মাপ, সার ও স্প্রে" : "Field size, fertilizer and spray"}</h2><p>{bn ? "পরিমাণ লিখুন; হিসাবগুলো সাধারণ তথ্য, আজ কী দেবেন তার নির্দেশ নয়।" : "Enter your field size. These are estimates, not instructions for what to apply today."}</p></header>
    <div className="today-tools-grid">
      <Panel title={bn ? "জমির মাপ" : "Field size"} icon={Ruler}><div className="ledger-fields"><label>{bn ? "জমির পরিমাণ" : "Field area"}<input type="number" min="0.001" step="any" value={area} onChange={event => { const value = event.target.value; setArea(value); localStorage.setItem(areaKey, value); }} /></label><label>{bn ? "একক" : "Unit"}<select value={unit} onChange={event => { const value = event.target.value as AreaUnit; setUnit(value); localStorage.setItem(`${areaKey}-unit`, value); }}><option value="decimal">{bn ? "শতক" : "Decimal"}</option><option value="acre">{bn ? "একর" : "Acre"}</option><option value="hectare">{bn ? "হেক্টর" : "Hectare"}</option><option value="bigha">{bn ? "বিঘা" : "Bigha"}</option></select></label>{unit === "bigha" && <label>{bn ? "১ বিঘা কত শতক?" : "Decimals per bigha"}<input type="number" min="1" step="any" value={bigha} onChange={event => { const value = event.target.value; setBigha(value); localStorage.setItem(`${areaKey}-bigha`, value); }} /></label>}</div>{areaM2 && <><output className="ledger-result">{number(areaM2)} {bn ? "বর্গমিটার" : "m²"} · {number(areaM2 / 40.468564224)} {bn ? "শতক" : "decimals"}</output><button className="secondary-main" onClick={() => remember("area", bn ? "জমির মাপ রূপান্তর" : "Area conversion", { area: Number(area), unit, decimalsPerBigha: Number(bigha) }, { squareMetres: areaM2, decimals: areaM2 / 40.468564224 }, `${number(areaM2)} ${bn ? "বর্গমিটার" : "m²"} · ${number(areaM2 / 40.468564224)} ${bn ? "শতক" : "decimals"}`)}>{bn ? "খাতায় রাখুন" : "Save to notebook"}</button></>}</Panel>
      <Panel title={bn ? "আলুর সারের হিসাব" : "Potato fertilizer estimate"} icon={Leaf}><p>{bn ? "জমির মাপ ধরে সাধারণ মৌসুমি হিসাব। আজকের প্রয়োগের মাত্রা নয়।" : "A general seasonal estimate from field size, not a dose for today."}</p>{fertilizerEstimate ? <><div className="ledger-rate-list">{fertilizerEstimate.map(item => <div key={item.key}><span>{bn ? item.bn : item.en}</span><strong>{number(item.key === "manure" ? item.amountKg / 1000 : item.amountKg)} {item.key === "manure" ? (bn ? "টন" : "t") : (bn ? "কেজি" : "kg")}</strong></div>)}</div><details className="today-source-details"><summary>{bn ? "হিসাবের ভিত্তি" : "About this estimate"}</summary><p>{bn ? "সাধারণ নির্দেশিকা; মাটি পরীক্ষা ও স্থানীয় কৃষি পরামর্শ অনুযায়ী মাত্রা বদলাতে পারে। প্রয়োগের তারিখ বা দৈনিক মাত্রা এখানে নির্ধারণ করা হয় না।" : "General guidance only. Soil tests and local agricultural advice may change rates. This does not set application dates or daily doses."} <a href="https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-barc/2024/12/053a0722429448d4903412ce683a7d06.pdf#page=53" target="_blank" rel="noreferrer">{bn ? "BARC উৎস · পৃষ্ঠা ৫৩" : "BARC source · p. 53"}</a></p></details><button className="secondary-main" onClick={saveFertilizerEstimate}>{bn ? "খাতায় রাখুন" : "Save to notebook"}</button></> : <p>{bn ? "আগে জমির মাপ লিখুন।" : "Enter the field size first."}</p>}
        <div className="today-fertilizer-calendar"><strong>{bn ? "সারের তারিখ মনে রাখুন" : "Remember a fertilizer date"}</strong><label>{bn ? "আপনার পরামর্শে পরের তারিখ" : "Next date from your adviser"}<input type="date" min={today} value={nextFertilizerDate} onChange={event => { setNextFertilizerDate(event.target.value); localStorage.setItem(scheduleKey, event.target.value); }} /></label><p role="status">{fertilizerDays === null ? (bn ? "তারিখ দিলে কত দিন বাকি তা দেখাবে।" : "Choose a date to see how many days remain.") : fertilizerDays > 0 ? (bn ? `আর ${number(fertilizerDays)} দিন পরে আপনার রাখা তারিখ—আজ নয়।` : `Your saved date is in ${number(fertilizerDays)} days—not today.`) : fertilizerDays === 0 ? (bn ? "আপনার রাখা তারিখ আজ। প্রয়োগের আগে পরামর্শ মিলিয়ে নিন।" : "Your saved date is today. Confirm advice before applying.") : (bn ? "তারিখ পেরিয়েছে—পরামর্শ মিলিয়ে নতুন তারিখ দিন।" : "That date has passed. Confirm advice and choose another date.")}</p></div>
      </Panel>
      <Panel title={bn ? "স্প্রে দরকার কি?" : "Is a spray needed?"} icon={Droplets}><p className="today-spray-caution">{bn ? "আজকের নির্ভরযোগ্য স্থানীয় কৃষি সতর্কতা ও নিশ্চিত লক্ষণ ছাড়া স্প্রে দরকার কি না বলা যাচ্ছে না। শুধু আবহাওয়া বা ছবি দেখে স্প্রে দেবেন না।" : "Without a current local advisory and confirmed signs, we can’t tell whether a spray is needed today. Don’t spray based on weather or a photo alone."}</p><p>{bn ? "বিশেষজ্ঞ বা পণ্যের লেবেলে দেওয়া হার থাকলে নিচে মিশ্রণের হিসাব করুন।" : "If an adviser or product label gives a rate, calculate the mix below."}</p><div className="ledger-fields"><label>{bn ? "লেবেলের হার" : "Label rate"}<input aria-label={bn ? "লেবেলের হার" : "Label rate"} type="number" min="0.001" step="any" value={sprayRate} onChange={event => setSprayRate(event.target.value)} /></label><label>{bn ? "একক" : "Unit"}<select value={rateUnit} onChange={event => setRateUnit(event.target.value)}><option value="ml">{bn ? "মিলিলিটার" : "ml"}</option><option value="g">{bn ? "গ্রাম" : "g"}</option></select></label><label>{bn ? "প্রতি লিটার পানি" : "Per litre of water"}<input type="number" min="0.1" step="any" value={sprayWater} onChange={event => { setSprayBasis("litre"); setSprayWater(event.target.value); }} /></label></div>{sprayAmount !== null && <output className="ledger-result" aria-live="polite">{number(sprayAmount)} {productUnit} {bn ? "লাগবে · লেবেলের নির্দেশ মানুন" : "needed · follow the label"}</output>}<button className="secondary-main" disabled={sprayAmount === null} onClick={calculateSpray}>{bn ? "হিসাব খাতায় রাখুন" : "Save mix to notebook"}</button></Panel>
    </div>{message && <p className="ledger-feedback" role="status">{message}</p>}
  </section>;

  return <main className="farmer-tools-page app-shell" id="tools">
    <header className="farmer-tools-heading"><div className="tools-banner"><img src="/alusathi-farmer-field-children.webp" alt="" /><span>{bn ? "জমির হিসাব ও শেখা" : "Field accounts and learning"}</span></div><div><p className="section-kicker">{bn ? "এক জায়গায়, দরকারি হিসাব" : "Useful field tools, together"}</p><h1>{bn ? "হিসাব ও শেখা" : "Tools and learning"}</h1><p>{bn ? "জমির খরচ লিখুন, হিসাব করুন, পরে খাতায় ফিরে দেখুন।" : "Record field costs, run a calculation, then find it in your notebook."}</p></div></header>
    <div className="ledger-layout"><div className="ledger-main">
      <Panel title={bn ? "জমির খরচ লিখুন" : "Record field expenses"} icon={Wallet}><form className="ledger-fields" onSubmit={addExpense}><label>{bn ? "খরচের ধরন" : "Expense type"}<select value={expenseCategory} onChange={event => setExpenseCategory(event.target.value as ExpenseCategory)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>{bn ? "টাকার পরিমাণ" : "Amount in BDT"}<input type="number" min="0.01" max="1000000000" step="any" required value={expenseAmount} onChange={event => setExpenseAmount(event.target.value)} /></label><label>{bn ? "তারিখ" : "Date"}<input type="date" max={localToday()} required value={expenseDate} onChange={event => setExpenseDate(event.target.value)} /></label><label>{bn ? "ছোট নোট (ঐচ্ছিক)" : "Short note (optional)"}<input maxLength={120} value={expenseNote} onChange={event => setExpenseNote(event.target.value)} /></label><button className="main-button"><Plus size={18} />{bn ? "খরচ রাখুন" : "Save expense"}</button></form><p className="ledger-result">{bn ? "এ পর্যন্ত লেখা খরচ" : "Recorded costs so far"}: <strong>{money(totalCosts)}</strong></p></Panel>
      <Panel title={bn ? "ব্রেক-ইভেন দাম" : "Break-even price"} icon={Calculator}><p>{bn ? "এ পর্যন্ত খাতায় রাখা খরচ ÷ বিক্রির উপযোগী আলু (কেজি)। বিক্রির গাড়িভাড়া খরচে যোগ করতে খরচের তালিকায় লিখুন।" : "Recorded field costs ÷ saleable potatoes (kg). Add selling transport to expenses if you want it included."}</p><div className="ledger-fields"><label>{bn ? "বিক্রির উপযোগী আলু (কেজি)" : "Saleable quantity (kg)"}<input type="number" min="0.01" step="any" value={saleable} onChange={event => setSaleable(event.target.value)} /></label></div>{breakEvenPrice !== null && totalCosts > 0 && <output className="ledger-result">{bn ? "খরচ তুলতে অন্তত" : "Cost recovery price"}: <strong>{money(breakEvenPrice)} / {bn ? "কেজি" : "kg"}</strong></output>}</Panel>

      <Panel title={bn ? "নমুনা থেকে ফলন বুঝুন" : "Estimate from harvested samples"} icon={Sprout}><p>{bn ? "জমির বিভিন্ন জায়গা থেকে সমান মাপের তিনটি নমুনা তুলে ওজন লিখুন। এটি নমুনার ওপর হিসাব, নিশ্চিত ফলন নয়।" : "Weigh three equal-size sample plots from different parts of the field. This is a sample-based estimate, not a guaranteed yield."}</p><div className="ledger-fields"><label>{bn ? "প্রতি নমুনার মাপ" : "Each sample plot area"}<input type="number" min="0.001" step="any" value={sampleArea} onChange={event => setSampleArea(event.target.value)} /></label>{samples.map((weight, index) => <label key={index}>{bn ? `নমুনা ${index + 1} · কেজি` : `Sample ${index + 1} · kg`}<input type="number" min="0.001" step="any" value={weight} onChange={event => setSamples(old => old.map((value, at) => at === index ? event.target.value : value))} /></label>)}</div><button className="secondary-main" onClick={calculateYield}>{bn ? "নমুনার হিসাব রাখুন" : "Calculate and save"}</button></Panel>

      {lastResult && <output className="ledger-result ledger-final-result" aria-live="polite">{lastResult}</output>}
    </div>
    <aside className="ledger-rail"><div className="ledger-note"><BookOpen size={21} /><strong>{bn ? "একই জমির খাতা" : "One field notebook"}</strong><p>{bn ? "খরচ ও হিসাব তারিখ ধরে খাতায় যোগ হবে।" : "Expenses and calculations appear in the dated notebook."}</p></div><h2>{bn ? "আলুর যত্ন" : "Potato care"}</h2><label className="ledger-search">{bn ? "বিষয় খুঁজুন" : "Search topics"}<input value={query} onChange={event => setQuery(event.target.value)} /></label>{visibleCare.map(item => <details className="care-library-card" key={item.title[0]}><summary><span aria-hidden="true">{item.icon}</span><strong>{item.title[bn ? 0 : 1]}</strong></summary><p>{item.body[bn ? 0 : 1]}</p><a href={item.source} target="_blank" rel="noreferrer">{bn ? "সরকারি সূত্র দেখুন" : "Open official source"} ↗</a><small>{bn ? "উৎস যাচাই: ১৯ অক্টোবর ২০২৬ · বিশেষজ্ঞ পর্যালোচনা বাকি" : "Source checked: 19 Oct 2026 · expert review pending"}</small></details>)}</aside></div>{showReminders && <TreatmentReminders key={user?.id || "guest"} />}{message && <p className="ledger-feedback" role="status">{message}</p>}
  </main>;
}
