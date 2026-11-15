import { useState } from "react";
import { Calculator, Sprout } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { areaSquareMetres, dosageAmount, sampleYield, type AreaUnit } from "@/lib/farmer-tools";
import { writeRecord } from "@/lib/farmer-records";

import TreatmentReminders from "./TreatmentReminders";
export default function FarmerTools({ showReminders = true }: { showReminders?: boolean }) {
  const { user } = useAuth(); const { language } = useLanguage(); const bn = language === "bn";
  const [area, setArea] = useState(""); const [unit, setUnit] = useState<AreaUnit>("decimal"); const [bigha, setBigha] = useState("33");
  const [dose, setDose] = useState(""); const [basis, setBasis] = useState<"hectare" | "decimal" | "litre">("decimal"); const [quantityUnit, setQuantityUnit] = useState("g"); const [water, setWater] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const [sampleArea, setSampleArea] = useState(""); const [weights, setWeights] = useState(["", "", ""]); const [yieldResult, setYieldResult] = useState<ReturnType<typeof sampleYield> | null>(null);
  const [message, setMessage] = useState("");
  const number = (n: number) => n.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  let metres: number | null = null; let amount: number | null = null;
  try { metres = areaSquareMetres(Number(area), unit, Number(bigha)); if (confirmed) amount = dosageAmount(metres, Number(dose), basis, Number(water)); } catch { /* Incomplete forms show no result. */ }
  async function projectYield(e: React.FormEvent) {
    e.preventDefault(); setMessage(""); setYieldResult(null);
    try {
      const result = sampleYield(metres || 0, Number(sampleArea), weights.map(Number)); setYieldResult(result);
      if (user) await writeRecord(user.id, "yield", crypto.randomUUID(), { ...result, area_m2: metres, sample_m2: Number(sampleArea), sample_kg: weights.map(Number), method: "sample_harvest_projection" });
    } catch { setMessage(bn ? "তথ্য বা সংযোগে সমস্যা। ক্ষেতের মাপ ও তিনটি নমুনা দেখুন।" : "There is a problem with the details or connection. Check the land size and 3 sample weights."); }
  }
  return <section id="tools" className="app-shell scroll-mt-24 py-12"><div className="section-heading"><div><p className="section-kicker"><Calculator size={16} />{bn ? "জমির কাজ সহজ করুন" : "Useful field tools"}</p><h2>{bn ? "হিসাব ও মনে করানো" : "Calculate and remember"}</h2><p>{bn ? "যেটি দরকার শুধু সেটি খুলুন।" : "Open only the tool you need."}</p></div></div>
    <div className="farmer-tools-grid"><details className="farmer-tool" open><summary><Calculator />{bn ? "জমির মাপ ও ওষুধের হিসাব" : "Land size and label amount"}</summary><div className="tool-body">
      <div className="tool-form tool-columns"><label>{bn ? "জমির পরিমাণ" : "Land size"}<input type="number" min="0.001" step="any" inputMode="decimal" value={area} onChange={e => { setArea(e.target.value); setYieldResult(null); }} /></label><label>{bn ? "একক" : "Unit"}<select value={unit} onChange={e => { setUnit(e.target.value as AreaUnit); setYieldResult(null); }}><option value="decimal">{bn ? "শতক" : "shatak (1/100 acre)"}</option><option value="acre">{bn ? "একর" : "acre"}</option><option value="hectare">{bn ? "হেক্টর" : "hectare"}</option><option value="bigha">{bn ? "বিঘা" : "bigha"}</option></select></label></div>
      {unit === "bigha" && <label className="tool-form">{bn ? "আপনার এলাকায় ১ বিঘা কত শতক?" : "shatak per bigha in your area"}<input type="number" min="1" step="any" value={bigha} onChange={e => { setBigha(e.target.value); setYieldResult(null); }} /><small>{bn ? "এলাকাভেদে মাপ বদলায়। স্থানীয় মাপ মিলিয়ে নিন।" : "A bigha can vary by area. Check your local measurement."}</small></label>}
      {metres !== null && <output className="tool-result">{number(metres)} {bn ? "বর্গমিটার" : "m²"} · {number(metres / 10000)} {bn ? "হেক্টর" : "ha"}</output>}
      <details><summary>{bn ? "লেবেলের মাত্রা দিয়ে ওষুধের পরিমাণ বের করুন" : "Calculate amount from the label"}</summary><div className="tool-form">
        <p>{bn ? "লেবেল বা কৃষি বিশেষজ্ঞের বলা মাত্রা লিখুন। এই হিসাব কোন ওষুধ বা মাত্রা বাছাই করে না।" : "Enter the rate from the product label or agriculture expert. This tool does not choose a product or rate."}</p>
        <div className="tool-columns"><label>{bn ? "লেবেলে লেখা পরিমাণ" : "Label amount"}<input type="number" min="0.001" step="any" value={dose} onChange={e => { setDose(e.target.value); setConfirmed(false); }} /></label><label>{bn ? "ওষুধের একক" : "Product unit"}<select value={quantityUnit} onChange={e => { setQuantityUnit(e.target.value); setConfirmed(false); }}><option value="g">{bn ? "গ্রাম" : "grams"}</option><option value="ml">{bn ? "মিলিলিটার" : "millilitres"}</option></select></label></div>
        <label>{bn ? "কতটুকুর জন্য এই মাত্রা?" : "This rate is for"}<select value={basis} onChange={e => { setBasis(e.target.value as typeof basis); setConfirmed(false); }}><option value="decimal">{bn ? "১ শতক জমি" : "1 shatak of field"}</option><option value="hectare">{bn ? "১ হেক্টর জমি" : "1 hectare of land"}</option><option value="litre">{bn ? "১ লিটার পানি" : "1 litre of water"}</option></select></label>
        {basis === "litre" && <label>{bn ? "মোট পানি (লিটার)" : "Total water (litres)"}<input type="number" min="0.1" step="any" value={water} onChange={e => setWater(e.target.value)} /></label>}
        <label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{bn ? "লেবেলের মাত্রা ও একক মিলিয়েছি" : "I checked the label rate and units"}</label>
        {amount !== null && <output className="tool-result">{number(amount)} {bn ? (quantityUnit === "g" ? "গ্রাম" : "মিলিলিটার") : quantityUnit} {bn ? "ওষুধ লাগবে। লেবেলের সর্বোচ্চ মাত্রা ও ফসল তোলার বিরতি মানুন।" : "of product needed. Follow the label's maximum amount and waiting time before harvest."}</output>}
      </div></details>
    </div></details>
    <details className="farmer-tool"><summary><Sprout />{bn ? "কত আলু হতে পারে?" : "Yield estimate"}</summary><div className="tool-body"><p>{bn ? "জমির মাপ উপরের হিসাবে দিন। সমান মাপের ৩টি আলাদা জায়গার আলু তুলে ওজন করুন। সেই নমুনা থেকে হিসাব হবে; ভবিষ্যতের AI পূর্বাভাস নয়।" : "Enter your land size in the calculator above. Harvest and weigh potatoes from 3 separate, equal-sized field areas. This estimates yield from those samples. It is not an AI forecast of future yield."}</p>
      <form className="tool-form" onSubmit={projectYield}><label>{bn ? "প্রতিটি নমুনা জায়গার মাপ (বর্গমিটার)" : "Area of each sample plot (m²)"}<input type="number" min="0.01" step="any" required value={sampleArea} onChange={e => { setSampleArea(e.target.value); setYieldResult(null); }} /></label><div className="tool-columns">{weights.map((value, i) => <label key={i}>{bn ? `নমুনা ${(i+1).toLocaleString('bn-BD')} (কেজি)` : `Sample ${i+1} (kg)`}<input type="number" min="0.01" step="any" required value={value} onChange={e => { setWeights(previous => previous.map((w, index) => index === i ? e.target.value : w)); setYieldResult(null); }} /></label>)}</div><button className="secondary-main">{bn ? "হিসাব দেখুন" : "Calculate estimate"}</button></form>
      {yieldResult && <output className="tool-result">{number(yieldResult.low)}–{number(yieldResult.high)} {bn ? "কেজি। নমুনার সবচেয়ে কম ও বেশি ফলনের ভিত্তিতে; নিশ্চিত সীমা নয়।" : "kg, using the lowest and highest sample yields. This is not a guaranteed range."}</output>}
      {!user && <p>{bn ? "এখন এই হিসাব এখানে দেখায়; পরে দেখতে চাইলে লিখে রাখুন।" : "This estimate is shown here for now. Write it down if you need it later."}</p>}
    </div></details>
    {showReminders && <TreatmentReminders key={user?.id || "guest"} />}</div>{message && <p className="tool-notice" role="status">{message}</p>}
  </section>;
}
