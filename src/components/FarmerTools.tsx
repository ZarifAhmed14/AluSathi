import { useEffect, useState } from "react";
import { Calculator, Droplets, Leaf, Ruler, Sprout } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { areaSquareMetres, potatoFertilizerEstimate, potatoFertilizerRates, sampleYield, type AreaUnit } from "@/lib/farmer-tools";
import { localToday } from "@/lib/local-date";
import { saveLedger } from "@/lib/farm-ledger";
import { FIELD_ACTIONS_EVENT, readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";
import SellingEstimate from "@/components/SellingEstimate";

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Calculator; children: React.ReactNode }) {
  return <section className="ledger-panel"><h2><span><Icon size={20} /></span>{title}</h2>{children}</section>;
}

const SPRAY_TREATMENTS = {
  "late-blight": { bn: "অনুমোদিত ম্যানকোজেব ছত্রাকনাশক", en: "Approved mancozeb fungicide", rate: 2, unitBn: "গ্রাম", unitEn: "g" },
  "fusarium-wilt": { bn: "অনুমোদিত কার্বেন্ডাজিম ছত্রাকনাশক", en: "Approved carbendazim fungicide", rate: 1, unitBn: "গ্রাম", unitEn: "g" },
  "leaf-roll-vector": { bn: "অনুমোদিত ইমিডাক্লোপ্রিড কীটনাশক", en: "Approved imidacloprid insecticide", rate: 0.5, unitBn: "মিলিলিটার", unitEn: "ml" },
} as const;

export default function FarmerTools({ todayMode = false }: { showReminders?: boolean; todayMode?: boolean }) {
  const { user } = useAuth(); const { language } = useLanguage(); const bn = language === "bn";
  const areaKey = `alusathi-field-area-${user?.id || "guest"}`;
  const scheduleKey = `alusathi-next-fertilizer-${user?.id || "guest"}`;
  const [area, setArea] = useState(() => localStorage.getItem(areaKey) || ""); const [unit, setUnit] = useState<AreaUnit>(() => (localStorage.getItem(`${areaKey}-unit`) as AreaUnit) || "decimal"); const [bigha, setBigha] = useState(() => localStorage.getItem(`${areaKey}-bigha`) || "33");
  const [nextFertilizerDate, setNextFertilizerDate] = useState(() => localStorage.getItem(scheduleKey) || "");
  const [samples, setSamples] = useState(["", "", ""]); const [sampleArea, setSampleArea] = useState("");
  const [actions, setActions] = useState(readFieldActions); const [lastResult, setLastResult] = useState(""); const [message, setMessage] = useState("");
  const [activePhotoId, setActivePhotoId] = useState<string>();
  const number = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  let areaM2: number | null = null;
  try { areaM2 = areaSquareMetres(Number(area), unit, Number(bigha)); } catch { /* Empty until a valid field area is entered. */ }
  let fertilizerEstimate: ReturnType<typeof potatoFertilizerEstimate> | null = null;
  try { if (areaM2) fertilizerEstimate = potatoFertilizerEstimate(areaM2); } catch { /* Wait for a valid area. */ }
  const latestPhoto = actions.find(action => action.category === "photo" && action.id === activePhotoId);
  const fieldDecimals = areaM2 ? areaM2 / 40.468564224 : null;
  const generalSprayWater = fieldDecimals || null;
  const treatment = latestPhoto?.advice && latestPhoto.advice in SPRAY_TREATMENTS
    ? SPRAY_TREATMENTS[latestPhoto.advice as keyof typeof SPRAY_TREATMENTS]
    : null;
  const sprayWater = treatment && fieldDecimals ? fieldDecimals : null;
  const sprayAmount = sprayWater && treatment ? sprayWater * treatment.rate : null;
  const money = (amount: number) => `৳${number(amount)}`;

  function remember(category: string, title: string, inputs: Record<string, string | number>, result: Record<string, string | number>, summary: string) {
    const entry = { type: "calculation" as const, id: crypto.randomUUID(), date: localToday(), category, title, inputs, result };
    try { saveLedger(entry, user?.id); setLastResult(summary); setMessage(bn ? "হিসাব খাতায় রাখা হয়েছে।" : "Calculation saved to the notebook."); }
    catch { setMessage(bn ? "হিসাব সেভ হয়নি। আবার চেষ্টা করুন।" : "Could not save. Please try again."); }
  }
  function recordCare(category: "fertilizer" | "spray", details: string, nextDueDate?: string) {
    const entry: FieldAction = {
      id: `care-${category}-${localToday()}`, date: localToday(), district: localStorage.getItem("alusathi-district") || "Rangpur",
      kind: "task", category, status: bn ? "সম্পন্ন" : "Done", details, nextDueDate,
      text: category === "fertilizer" ? (bn ? "আজ সার দেওয়া হয়েছে" : "Fertilizer applied today") : (bn ? "আজ স্প্রে দেওয়া হয়েছে" : "Spray applied today"),
    };
    saveFieldActions([entry, ...readFieldActions().filter(item => item.id !== entry.id)].slice(0, 100));
    setMessage(category === "fertilizer"
      ? (bn ? "ঠিক আছে—আমি ২ সপ্তাহ পর আজকের কাজে মনে করিয়ে দেব।" : "Okay—I’ll remind you in Today in two weeks.")
      : (bn ? "আজকের স্প্রে দেওয়ার তথ্য রাখা হয়েছে।" : "Today's spray application was recorded."));
  }
  function confirmFertilizer() {
    const reminder = new Date(`${localToday()}T12:00:00`); reminder.setDate(reminder.getDate() + 14);
    const due = `${reminder.getFullYear()}-${String(reminder.getMonth() + 1).padStart(2, "0")}-${String(reminder.getDate()).padStart(2, "0")}`;
    setNextFertilizerDate(due); localStorage.setItem(scheduleKey, due);
    recordCare("fertilizer", areaM2 ? `${area} ${unit} field` : (bn ? "জমির মাপ দেওয়া হয়নি" : "Field size not entered"), due);
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
  useEffect(() => {
    const update = () => {
      const next = readFieldActions();
      setActions(next);
      if (next[0]?.category === "photo") setActivePhotoId(next[0].id);
    };
    window.addEventListener(FIELD_ACTIONS_EVENT, update);
    return () => window.removeEventListener(FIELD_ACTIONS_EVENT, update);
  }, []);
  useEffect(() => { if (!todayMode) setActivePhotoId(undefined); }, [todayMode]);

  const reminderDue = Boolean(nextFertilizerDate && nextFertilizerDate <= localToday());

  if (todayMode) return <section className="today-field-tools app-shell">
    <header>
      <p className="section-kicker">{bn ? "জমির মাপ ও যত্ন" : "Field size and care"}</p>
      <h2>{bn ? "জমির মাপ, সার ও স্প্রে" : "Field size, fertilizer and spray"}</h2>
      <p>{bn ? "জমির মাপ একবার লিখলেই সার ও ছবিভিত্তিক স্প্রের পরিমাণ দেখা যাবে।" : "Enter the field size once to see fertilizer and photo-based spray quantities."}</p>
    </header>
    <div className="today-tools-grid">
      <Panel title={bn ? "জমির মাপ" : "Field size"} icon={Ruler}>
        <div className="ledger-fields">
          <label>{bn ? "জমির পরিমাণ" : "Field area"}<input type="number" min="0.001" step="any" value={area} onChange={event => { const value = event.target.value; setArea(value); localStorage.setItem(areaKey, value); }} /></label>
          <label>{bn ? "একক" : "Unit"}<select value={unit} onChange={event => { const value = event.target.value as AreaUnit; setUnit(value); localStorage.setItem(`${areaKey}-unit`, value); }}><option value="decimal">{bn ? "শতক" : "Decimal"}</option><option value="acre">{bn ? "একর" : "Acre"}</option><option value="hectare">{bn ? "হেক্টর" : "Hectare"}</option><option value="bigha">{bn ? "বিঘা" : "Bigha"}</option></select></label>
          {unit === "bigha" && <label>{bn ? "১ বিঘা কত শতক?" : "Decimals per bigha"}<input type="number" min="1" step="any" value={bigha} onChange={event => { const value = event.target.value; setBigha(value); localStorage.setItem(`${areaKey}-bigha`, value); }} /></label>}
        </div>
        {areaM2 && <output className="ledger-result">{number(areaM2)} {bn ? "বর্গমিটার" : "m²"} · {number(areaM2 / 40.468564224)} {bn ? "শতক" : "decimals"}</output>}
      </Panel>

      <Panel title={bn ? "সার" : "Fertilizer"} icon={Leaf}>
        <p>{areaM2 ? (bn ? "আপনার জমির জন্য সাধারণ মৌসুমি পরিমাণ।" : "General seasonal quantities for your field.") : (bn ? "জমির মাপ না দিলেও প্রতি হেক্টরের সাধারণ পরিমাণ দেখুন।" : "See general per-hectare quantities before entering field size.")}</p>
        <div className="ledger-rate-list">
          {(fertilizerEstimate || potatoFertilizerRates.map(item => ({ ...item, amountKg: item.rate }))).map(item => <div key={item.key}>
            <span>{bn ? item.bn : item.en}</span>
            <strong>{number(item.key === "manure" ? item.amountKg / 1000 : item.amountKg)} {item.key === "manure" ? (bn ? "টন" : "t") : (bn ? "কেজি" : "kg")}{!fertilizerEstimate && (bn ? " / হেক্টর" : " / hectare")}</strong>
          </div>)}
        </div>
        {reminderDue && <p className="today-spray-caution" role="status">{bn ? "২ সপ্তাহ আগে সার দিয়েছিলেন। আজ আবার দেওয়ার আগে পরামর্শ মিলিয়ে নিন।" : "You applied fertilizer two weeks ago. Confirm advice before applying again today."}</p>}
        <div className="today-care-check">
          <strong>{bn ? "আজ কি সার দিয়েছেন?" : "Did you apply fertilizer today?"}</strong>
          <div><button className="secondary-main" onClick={confirmFertilizer}>{bn ? "হ্যাঁ, আজকে দিয়েছি" : "Yes, I applied it today"}</button><button className="text-button" onClick={() => setMessage(bn ? "ঠিক আছে—আজ সার দেওয়া হয়নি।" : "Okay—no fertilizer was applied today.")}>{bn ? "না, আজকে দিই নাই" : "No, not today"}</button></div>
        </div>
      </Panel>

      <Panel title={bn ? "স্প্রে দিন" : "Spray advice"} icon={Droplets}>
        {!latestPhoto && <p>{bn ? "ছবি না দিলে সাধারণ নিরাপদ তথ্য দেখুন। সমস্যা না দেখে কোনো ওষুধ দেবেন না।" : "See general safety information before adding a photo. Do not apply a product without identifying a problem."}</p>}
        {latestPhoto?.advice === "healthy" && <p className="today-spray-caution">{bn ? "এই ছবিতে স্প্রে দরকার নেই। গাছ বা আলুতে নতুন দাগ দেখা দিলে আবার ছবি দিন।" : "No spray is needed for this photo. Add another photo if new marks appear."}</p>}
        {latestPhoto?.advice === "observe" && <p className="today-spray-caution">{bn ? "এই ছবির দাগ দেখে এখনই স্প্রে নয়। আক্রান্ত অংশ আলাদা করে আবার দেখুন।" : "Do not spray from this mark alone. Separate it and inspect again."}</p>}
        {!latestPhoto && <>
          <div className="ledger-rate-list spray-combination">
            <div><span>{bn ? "কখন স্প্রে করবেন" : "When to spray"}</span><strong>{bn ? "সমস্যা নিশ্চিত হলে" : "After confirming the problem"}</strong></div>
            <div><span>{bn ? "পানির সাধারণ হিসাব" : "General water estimate"}</span><strong>{generalSprayWater ? `${number(generalSprayWater)} ${bn ? "লিটার" : "L"}` : (bn ? "১ লিটার / শতক" : "1 L / decimal")}</strong></div>
            <div><span>{bn ? "ওষুধের নাম" : "Medicine name"}</span><strong>{bn ? "ছবির ফলের পরে" : "After the photo result"}</strong></div>
            <div><span>{bn ? "ওষুধের পরিমাণ" : "Product amount"}</span><strong>{bn ? "পণ্যের লেবেল অনুযায়ী" : "Follow the product label"}</strong></div>
          </div>
          <small>{bn ? "জমির মাপ দিলে পানির মোট হিসাব বদলাবে। স্প্রেয়ার ক্যালিব্রেশন ও অনুমোদিত পণ্যের লেবেল মিলিয়ে নিন।" : "Enter field size to update the total water estimate. Check sprayer calibration and the approved product label."}</small>
        </>}
        {(latestPhoto?.advice === "healthy" || latestPhoto?.advice === "observe") && <>
          <div className="ledger-rate-list spray-combination" aria-live="polite">
            <div><span>{bn ? "এখন করণীয়" : "What to do now"}</span><strong>{bn ? "স্প্রে নয়" : "Do not spray"}</strong></div>
            <div><span>{bn ? "পানির পরিমাণ" : "Water amount"}</span><strong>{number(0)} {bn ? "লিটার" : "L"}</strong></div>
            <div><span>{bn ? "ওষুধের নাম" : "Medicine name"}</span><strong>{bn ? "প্রয়োজন নেই" : "Not needed"}</strong></div>
            <div><span>{bn ? "ওষুধের পরিমাণ" : "Product amount"}</span><strong>{number(0)} {bn ? "গ্রাম" : "g"}</strong></div>
          </div>
          <small>{bn ? "ছবির বর্তমান ফল অনুযায়ী স্প্রের হিসাব শূন্য। নতুন লক্ষণ দেখা দিলে আবার ছবি দিন।" : "The spray amount is zero for the current photo result. Add another photo if new signs appear."}</small>
        </>}
        {treatment && <>
          <p><strong>{bn ? "ছবিভিত্তিক পরামর্শ:" : "Photo-based guidance:"}</strong> {bn ? `${treatment.bn}—প্রতি ১ লিটার পানিতে ${number(treatment.rate)} ${treatment.unitBn}। পণ্যের লেবেলই চূড়ান্ত।` : `${treatment.en}—${number(treatment.rate)} ${treatment.unitEn} per litre of water. The product label is final.`}</p>
          <div className="ledger-rate-list spray-combination" aria-live="polite">
            <div><span>{bn ? "অনুপাত" : "Ratio"}</span><strong>{number(treatment.rate)} {bn ? treatment.unitBn : treatment.unitEn} / {bn ? "১ লিটার পানি" : "1 L water"}</strong></div>
            <div><span>{bn ? "ওষুধের নাম" : "Medicine name"}</span><strong>{bn ? treatment.bn : treatment.en}</strong></div>
            {sprayWater && sprayAmount && <><div><span>{bn ? "পানির হিসাব" : "Water estimate"}</span><strong>{number(sprayWater)} {bn ? "লিটার" : "L"}</strong></div><div><span>{bn ? "ওষুধের পরিমাণ" : "Medicine amount"}</span><strong>{number(sprayAmount)} {bn ? treatment.unitBn : treatment.unitEn}</strong></div></>}
          </div>
          <small>{fieldDecimals ? (bn ? "হিসাবে প্রতি শতকে ১ লিটার পানি ধরা হয়েছে। স্প্রেয়ার ক্যালিব্রেশন ও পণ্যের লেবেল মিলিয়ে নিন।" : "This estimate assumes 1 litre of water per decimal. Check sprayer calibration and the product label.") : (bn ? "মোট পরিমাণ দেখতে জমির মাপ দিন।" : "Enter the field size to see the total quantity.")}</small>
          {sprayAmount && <div className="today-care-check"><strong>{bn ? "আজ কি স্প্রে দিয়েছেন?" : "Did you spray today?"}</strong><div><button className="secondary-main" onClick={() => recordCare("spray", `${number(sprayAmount)} ${bn ? treatment.unitBn : treatment.unitEn} ${bn ? treatment.bn : treatment.en} + ${number(sprayWater!)} ${bn ? "লিটার পানি" : "L water"}`)}>{bn ? "হ্যাঁ, আজকে দিয়েছি" : "Yes, I sprayed today"}</button><button className="text-button" onClick={() => setMessage(bn ? "ঠিক আছে—আজ স্প্রে দেওয়া হয়নি।" : "Okay—no spray was applied today.")}>{bn ? "না, আজকে দিই নাই" : "No, not today"}</button></div></div>}
          <a className="text-button" href="https://www.bamis.gov.bd/en/diseases/1/all/52/" target="_blank" rel="noreferrer">{bn ? "BAMIS তথ্য দেখুন" : "View BAMIS guidance"}</a>
        </>}
      </Panel>
    </div>
    {message && <p className="ledger-feedback" role="status">{message}</p>}
  </section>;

  return <main className="farmer-tools-page app-shell" id="tools">
    <header className="farmer-tools-heading"><div><p className="section-kicker">{bn ? "হিসাব" : "HISAB"}</p><h1>{bn ? "সংখ্যায় বুঝুন, বিক্রির আগে" : "Understand the numbers before selling"}</h1><p>{bn ? "আজ কী করবেন আজকের কাজে, কী ঘটেছে খাতায়; এখানে দেখুন বিক্রি করলে টাকাটা কী দাঁড়ায়।" : "Today is for work, Notebook is for records; here, see what a sale means in money."}</p></div><a className="secondary-main" href="/farmer#diary" onClick={() => localStorage.setItem("alusathi-notebook-tab", "expenses")}>{bn ? "খরচ যোগ করুন" : "Add an expense"}</a></header>
    <SellingEstimate />
    <details className="yield-details"><summary><Sprout size={19} />{bn ? "ফলনের হিসাব" : "Yield estimate"}</summary><div className="ledger-panel"><p>{bn ? "জমির বিভিন্ন জায়গা থেকে সমান মাপের তিনটি নমুনা তুলে ওজন লিখুন। এটি অনুমান, নিশ্চিত ফলন নয়।" : "Weigh three equal-size sample plots from different parts of the field. This is an estimate, not guaranteed yield."}</p><div className="ledger-fields"><label>{bn ? "প্রতি নমুনার মাপ" : "Each sample plot area"}<input type="number" min="0.001" step="any" value={sampleArea} onChange={event => setSampleArea(event.target.value)} /></label>{samples.map((weight, index) => <label key={index}>{bn ? `নমুনা ${index + 1} · কেজি` : `Sample ${index + 1} · kg`}<input type="number" min="0.001" step="any" value={weight} onChange={event => setSamples(old => old.map((value, at) => at === index ? event.target.value : value))} /></label>)}</div><button className="secondary-main" onClick={calculateYield}>{bn ? "ফলনের হিসাব করুন" : "Estimate yield"}</button>{lastResult && <output className="ledger-result ledger-final-result" aria-live="polite">{lastResult}</output>}</div></details>
    {message && <p className="ledger-feedback" role="status">{message}</p>}
  </main>;
}
