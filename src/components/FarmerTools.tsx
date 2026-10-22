import { useEffect, useState } from "react";
import { Calculator, Droplets, Leaf, Ruler, Sprout } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { areaSquareMetres, dosageAmount, potatoFertilizerEstimate, sampleYield, type AreaUnit } from "@/lib/farmer-tools";
import { localToday } from "@/lib/local-date";
import { saveLedger } from "@/lib/farm-ledger";
import { readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";
import SellingEstimate from "@/components/SellingEstimate";

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Calculator; children: React.ReactNode }) {
  return <section className="ledger-panel"><h2><span><Icon size={20} /></span>{title}</h2>{children}</section>;
}

export default function FarmerTools({ todayMode = false }: { showReminders?: boolean; todayMode?: boolean }) {
  const { user } = useAuth(); const { language } = useLanguage(); const bn = language === "bn";
  const areaKey = `alusathi-field-area-${user?.id || "guest"}`;
  const scheduleKey = `alusathi-next-fertilizer-${user?.id || "guest"}`;
  const [area, setArea] = useState(() => localStorage.getItem(areaKey) || ""); const [unit, setUnit] = useState<AreaUnit>(() => (localStorage.getItem(`${areaKey}-unit`) as AreaUnit) || "decimal"); const [bigha, setBigha] = useState(() => localStorage.getItem(`${areaKey}-bigha`) || "33");
  const [nextFertilizerDate, setNextFertilizerDate] = useState(() => localStorage.getItem(scheduleKey) || "");
  const [samples, setSamples] = useState(["", "", ""]); const [sampleArea, setSampleArea] = useState("");
  const [sprayRate, setSprayRate] = useState(""); const [sprayBasis, setSprayBasis] = useState<"hectare" | "decimal" | "litre">("litre"); const [rateUnit, setRateUnit] = useState("ml"); const [sprayWater, setSprayWater] = useState(""); const [lastResult, setLastResult] = useState(""); const [message, setMessage] = useState("");
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

  function remember(category: string, title: string, inputs: Record<string, string | number>, result: Record<string, string | number>, summary: string) {
    const entry = { type: "calculation" as const, id: crypto.randomUUID(), date: localToday(), category, title, inputs, result };
    try { saveLedger(entry, user?.id); setLastResult(summary); setMessage(bn ? "হিসাব খাতায় রাখা হয়েছে।" : "Calculation saved to the notebook."); }
    catch { setMessage(bn ? "হিসাব সেভ হয়নি। আবার চেষ্টা করুন।" : "Could not save. Please try again."); }
  }
  function saveFertilizerEstimate() {
    if (!areaM2 || !fertilizerEstimate) return;
    const result = Object.fromEntries(fertilizerEstimate.map(item => [item.key, item.amountKg]));
    remember("fertilizer", bn ? "সারের হিসাব" : "Fertilizer estimate", { area: Number(area), unit, guide: "BARC-2013" }, result, bn ? "সারের হিসাব খাতায় রাখা হয়েছে" : "Fertilizer estimate saved");
  }
  function calculateSpray() {
    try {
      if (sprayAmount === null) throw new Error();
      remember("spray-mix", bn ? "লেবেল অনুযায়ী স্প্রে মিশ্রণ" : "Label-based spray mix", { fieldArea: Number(area), areaUnit: unit, labelRate: Number(sprayRate), rateBasis: sprayBasis, waterLitres: sprayBasis === "litre" ? Number(sprayWater) : 0, productUnit: rateUnit }, { amount: sprayAmount, unit: rateUnit }, `${number(sprayAmount)} ${productUnit}`);
    } catch { setMessage(bn ? "লেবেলের মাত্রা ও প্রয়োজনীয় পানির পরিমাণ মিলিয়ে দেখুন।" : "Check the label rate and required water volume."); }
  }
  function recordCare(category: "fertilizer" | "spray", details: string) {
    const entry: FieldAction = {
      id: `care-${category}-${localToday()}`, date: localToday(), district: localStorage.getItem("alusathi-district") || "Rangpur",
      kind: "task", category, status: bn ? "সম্পন্ন" : "Done", details,
      text: category === "fertilizer" ? (bn ? "আজ সার দেওয়া হয়েছে" : "Fertilizer applied today") : (bn ? "আজ স্প্রে দেওয়া হয়েছে" : "Spray applied today"),
    };
    saveFieldActions([entry, ...readFieldActions().filter(item => item.id !== entry.id)].slice(0, 100));
    window.location.hash = "diary";
  }
  function calculateYield() {
    try {
      const result = sampleYield(areaM2 || 0, areaSquareMetres(Number(sampleArea), unit, Number(bigha)), samples.map(Number));
      const summary = `${number(result.low)}–${number(result.high)} ${bn ? "কেজি" : "kg"}`;
      remember("yield", bn ? "নমুনা থেকে ফলনের হিসাব" : "Sample-based yield estimate", { area: Number(area), sampleArea: Number(sampleArea), unit, weightsKg: samples.join(",") }, { lowKg: result.low, estimateKg: result.estimate, highKg: result.high }, summary);
    } catch { setMessage(bn ? "জমির মাপের মধ্যে সমান মাপের ৩টি নমুনা ওজন লিখুন।" : "Enter three positive weights from equal sample plots inside the field area."); }
  }
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
      <Panel title={bn ? "সার" : "Fertilizer"} icon={Leaf}><p>{bn ? "জমির মাপ ধরে সাধারণ মৌসুমি হিসাব। আজকের প্রয়োগের মাত্রা নয়।" : "A general seasonal estimate from field size, not a dose for today."}</p>{fertilizerEstimate ? <><div className="ledger-rate-list">{fertilizerEstimate.map(item => <div key={item.key}><span>{bn ? item.bn : item.en}</span><strong>{number(item.key === "manure" ? item.amountKg / 1000 : item.amountKg)} {item.key === "manure" ? (bn ? "টন" : "t") : (bn ? "কেজি" : "kg")}</strong></div>)}</div><details className="today-source-details"><summary>{bn ? "হিসাবের ভিত্তি" : "About this estimate"}</summary><p>{bn ? "সাধারণ নির্দেশিকা; মাটি পরীক্ষা ও স্থানীয় কৃষি পরামর্শ অনুযায়ী মাত্রা বদলাতে পারে। প্রয়োগের তারিখ বা দৈনিক মাত্রা এখানে নির্ধারণ করা হয় না।" : "General guidance only. Soil tests and local agricultural advice may change rates. This does not set application dates or daily doses."} <a href="https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-barc/2024/12/053a0722429448d4903412ce683a7d06.pdf#page=53" target="_blank" rel="noreferrer">{bn ? "BARC উৎস · পৃষ্ঠা ৫৩" : "BARC source · p. 53"}</a></p></details><button className="secondary-main" onClick={saveFertilizerEstimate}>{bn ? "খাতায় রাখুন" : "Save to notebook"}</button></> : <p>{bn ? "আগে জমির মাপ লিখুন।" : "Enter the field size first."}</p>}
        <div className="today-fertilizer-calendar"><strong>{bn ? "সারের তারিখ মনে রাখুন" : "Remember a fertilizer date"}</strong><label>{bn ? "আপনার পরামর্শে পরের তারিখ" : "Next date from your adviser"}<input type="date" min={today} value={nextFertilizerDate} onChange={event => { setNextFertilizerDate(event.target.value); localStorage.setItem(scheduleKey, event.target.value); }} /></label><p role="status">{fertilizerDays === null ? (bn ? "তারিখ দিলে কত দিন বাকি তা দেখাবে।" : "Choose a date to see how many days remain.") : fertilizerDays > 0 ? (bn ? `আর ${number(fertilizerDays)} দিন পরে আপনার রাখা তারিখ—আজ নয়।` : `Your saved date is in ${number(fertilizerDays)} days—not today.`) : fertilizerDays === 0 ? (bn ? "আপনার রাখা তারিখ আজ। প্রয়োগের আগে পরামর্শ মিলিয়ে নিন।" : "Your saved date is today. Confirm advice before applying.") : (bn ? "তারিখ পেরিয়েছে—পরামর্শ মিলিয়ে নতুন তারিখ দিন।" : "That date has passed. Confirm advice and choose another date.")}</p></div>
        {fertilizerEstimate && <div className="today-care-check"><strong>{bn ? "আজ কি সার দিয়েছেন?" : "Did you apply fertilizer today?"}</strong><div><button className="secondary-main" onClick={() => recordCare("fertilizer", bn ? `${area} ${unit} জমি · পরামর্শমতো প্রয়োগ` : `${area} ${unit} field · applied as advised`)}>{bn ? "হ্যাঁ, খাতায় রাখুন" : "Yes, save to notebook"}</button><button className="text-button" onClick={() => setMessage(bn ? "আজ সার দেওয়ার কাজ রাখা হয়নি।" : "No fertilizer application was recorded today.")}>{bn ? "না" : "No"}</button></div></div>}
      </Panel>
      <Panel title={bn ? "স্প্রে দরকার কি?" : "Is a spray needed?"} icon={Droplets}><p className="today-spray-caution">{bn ? "নিশ্চিত লক্ষণ ও বিশেষজ্ঞ/লেবেলের পরামর্শ ছাড়া স্প্রে দেবেন না। শুধু ছবি বা আবহাওয়া দেখে সিদ্ধান্ত নেবেন না।" : "Do not spray without confirmed signs and an adviser or label rate. Weather or a photo alone is not enough."}</p><div className="ledger-fields"><label>{bn ? "লেবেলের হার" : "Label rate"}<input aria-label={bn ? "লেবেলের হার" : "Label rate"} type="number" min="0.001" step="any" value={sprayRate} onChange={event => setSprayRate(event.target.value)} /></label><label>{bn ? "একক" : "Unit"}<select value={rateUnit} onChange={event => setRateUnit(event.target.value)}><option value="ml">{bn ? "মিলিলিটার" : "ml"}</option><option value="g">{bn ? "গ্রাম" : "g"}</option></select></label><label>{bn ? "পানি (লিটার)" : "Water (litres)"}<input type="number" min="0.1" step="any" value={sprayWater} onChange={event => { setSprayBasis("litre"); setSprayWater(event.target.value); }} /></label></div>{sprayAmount !== null && <div className="ledger-rate-list spray-combination" aria-live="polite"><div><span>{bn ? "মিশ্রণ" : "Mix"}</span><strong>{number(sprayAmount)} {productUnit}</strong></div><div><span>{bn ? "পানি" : "Water"}</span><strong>{number(Number(sprayWater))} {bn ? "লিটার" : "L"}</strong></div></div>}<button className="secondary-main" disabled={sprayAmount === null} onClick={calculateSpray}>{bn ? "হিসাব খাতায় রাখুন" : "Save mix to notebook"}</button>{sprayAmount !== null && <div className="today-care-check"><strong>{bn ? "আজ কি স্প্রে দিয়েছেন?" : "Did you spray today?"}</strong><div><button className="secondary-main" onClick={() => recordCare("spray", `${number(sprayAmount)} ${productUnit} + ${number(Number(sprayWater))} ${bn ? "লিটার পানি" : "L water"}`)}>{bn ? "হ্যাঁ, খাতায় রাখুন" : "Yes, save to notebook"}</button><button className="text-button" onClick={() => setMessage(bn ? "আজ স্প্রে দেওয়ার কাজ রাখা হয়নি।" : "No spray application was recorded today.")}>{bn ? "না" : "No"}</button></div></div>}</Panel>
    </div>{message && <p className="ledger-feedback" role="status">{message}</p>}
  </section>;

  return <main className="farmer-tools-page app-shell" id="tools">
    <header className="farmer-tools-heading"><div><p className="section-kicker">{bn ? "হিসাব" : "HISAB"}</p><h1>{bn ? "সংখ্যায় বুঝুন, বিক্রির আগে" : "Understand the numbers before selling"}</h1><p>{bn ? "আজ কী করবেন আজকের কাজে, কী ঘটেছে খাতায়; এখানে দেখুন বিক্রি করলে টাকাটা কী দাঁড়ায়।" : "Today is for work, Notebook is for records; here, see what a sale means in money."}</p></div><a className="secondary-main" href="/farmer#diary" onClick={() => localStorage.setItem("alusathi-notebook-tab", "expenses")}>{bn ? "খরচ যোগ করুন" : "Add an expense"}</a></header>
    <SellingEstimate />
    <details className="yield-details"><summary><Sprout size={19} />{bn ? "ফলনের হিসাব" : "Yield estimate"}</summary><div className="ledger-panel"><p>{bn ? "জমির বিভিন্ন জায়গা থেকে সমান মাপের তিনটি নমুনা তুলে ওজন লিখুন। এটি অনুমান, নিশ্চিত ফলন নয়।" : "Weigh three equal-size sample plots from different parts of the field. This is an estimate, not guaranteed yield."}</p><div className="ledger-fields"><label>{bn ? "প্রতি নমুনার মাপ" : "Each sample plot area"}<input type="number" min="0.001" step="any" value={sampleArea} onChange={event => setSampleArea(event.target.value)} /></label>{samples.map((weight, index) => <label key={index}>{bn ? `নমুনা ${index + 1} · কেজি` : `Sample ${index + 1} · kg`}<input type="number" min="0.001" step="any" value={weight} onChange={event => setSamples(old => old.map((value, at) => at === index ? event.target.value : value))} /></label>)}</div><button className="secondary-main" onClick={calculateYield}>{bn ? "ফলনের হিসাব করুন" : "Estimate yield"}</button>{lastResult && <output className="ledger-result ledger-final-result" aria-live="polite">{lastResult}</output>}</div></details>
    {message && <p className="ledger-feedback" role="status">{message}</p>}
  </main>;
}
