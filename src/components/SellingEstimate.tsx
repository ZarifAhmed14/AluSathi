import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Estimate = { id: string; at: string; quantity: number; price: number; freight: number; other: number };
const key = "alusathi-selling-estimates-v1";
function valid(value: Estimate) {
  return value && typeof value.id === "string" && typeof value.at === "string" && Number.isFinite(Date.parse(value.at)) &&
    Number.isFinite(value.quantity) && value.quantity >= 1 && value.quantity <= 100000 &&
    Number.isFinite(value.price) && value.price >= 0 && value.price <= 10000 &&
    [value.freight, value.other].every(n => Number.isFinite(n) && n >= 0 && n <= 1000000);
}
export default function SellingEstimate() {
  const { language } = useLanguage(); const bn = language === "bn";
  const [quantity, setQuantity] = useState(""); const [price, setPrice] = useState(""); const [freight, setFreight] = useState(""); const [other, setOther] = useState("0");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<Estimate[]>(() => { try { const rows = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(rows) ? rows.filter(valid).slice(0, 50) : []; } catch { return []; } });
  const estimate: Estimate = { id: "current", at: new Date().toISOString(), quantity: Number(quantity), price: Number(price), freight: Number(freight), other: Number(other) };
  const ready = [quantity, price, freight, other].every(v => v.trim() !== "") && valid(estimate);
  const net = ready ? estimate.price - (estimate.freight + estimate.other) / estimate.quantity : null;
  const money = (n: number) => `৳${n.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 })}`;
  function save(event: React.FormEvent) {
    event.preventDefault(); if (!ready) return;
    const next = [{ ...estimate, id: crypto.randomUUID() }, ...saved].slice(0, 50);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setMessage(bn ? "এই ফোনে হিসাব রাখা হয়েছে।" : "Estimate saved on this device."); }
    catch { setMessage(bn ? "সেভ হয়নি। ফোনে জায়গা আছে কি না দেখুন।" : "Could not save. Check device storage."); }
  }
  return <section className="selling-estimate"><p className="section-kicker">{bn ? "ফোনে পাওয়া দর দিয়ে হিসাব" : "USE THE PRICE YOU WERE QUOTED"}</p><h2>{bn ? "শেষে কত থাকবে?" : "What will you take home?"}</h2>
    <form onSubmit={save} className="tool-form"><div className="selling-inputs">
      <label>{bn ? "বিক্রির পরিমাণ (কেজি)" : "Quantity to sell (kg)"}<input name="saleQuantity" type="number" inputMode="decimal" required min="1" max="100000" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <label>{bn ? "ফোনে পাওয়া দর (টাকা/কেজি)" : "Quoted price (BDT/kg)"}<input name="salePrice" type="number" inputMode="decimal" required min="0" max="10000" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
      <label>{bn ? "আপনার মোট গাড়িভাড়া (টাকা)" : "Your total transport cost (BDT)"}<input name="saleFreight" type="number" inputMode="decimal" required min="0" max="1000000" step="any" value={freight} onChange={e => setFreight(e.target.value)} /><small>{bn ? "না লাগলে ০ লিখুন। না জানলে হিসাব অপেক্ষা করবে।" : "Enter 0 if you pay none. Unknown costs stay blank."}</small></label>
    </div><details><summary>{bn ? "অন্য খরচ আছে?" : "Other costs?"}</summary><label>{bn ? "মোট অন্য খরচ (টাকা); না থাকলে ০" : "Total other costs (BDT); 0 if none"}<input name="saleOther" type="number" min="0" max="1000000" step="any" value={other} onChange={e => setOther(e.target.value)} /></label></details>
    <output className={`selling-net${net !== null && net < 0 ? " loss" : ""}`} aria-live="polite">{net === null ? (bn ? "পরিমাণ, দর ও গাড়িভাড়া লিখুন।" : "Enter quantity, price and transport cost.") : <><strong>{money(net)} / {bn ? "কেজি" : "kg"}</strong><span>{bn ? "মোট হাতে" : "Total take-home"}: {money(net * estimate.quantity)}</span></>}</output>
    <small>{bn ? "সব আলু এই দরে বিক্রি হলে, দেওয়া খরচ বাদে হিসাব। এটি লাভ নয়—চাষের খরচ বাদ দেওয়া হয়নি। ওজন বা কাটতি বদলালে হিসাবও বদলাবে।" : "Assumes all entered kg sell at this price, less entered costs. This is not profit: growing costs are not deducted. Weight or deductions can change it."}</small>
    <button className="main-button" disabled={!ready}>{bn ? "হিসাব রাখুন" : "Save estimate"}</button>{message && <p role="status">{message}</p>}</form>
    <details className="selling-records"><summary>{bn ? `রাখা হিসাব · ${saved.length.toLocaleString("bn-BD")}` : `Saved estimates · ${saved.length}`}</summary>{saved.length ? saved.map(row => <p key={row.id}>{new Date(row.at).toLocaleDateString(bn ? "bn-BD" : "en-GB")} · {row.quantity.toLocaleString(bn ? "bn-BD" : "en-GB")} {bn ? "কেজি" : "kg"} · {money(row.price - (row.freight + row.other) / row.quantity)}/{bn ? "কেজি" : "kg"}</p>) : <p>{bn ? "এখনো কোনো হিসাব রাখা হয়নি।" : "No saved estimates yet."}</p>}</details>
  </section>;
}
