import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { readLedger, saveLedger } from "@/lib/farm-ledger";
import { localToday } from "@/lib/local-date";

type Estimate = { id: string; at: string; quantity: number; price: number; freight: number; other: number };
const key = "alusathi-selling-estimates-v1";
function valid(value: Estimate) {
  return value && typeof value.id === "string" && typeof value.at === "string" && Number.isFinite(Date.parse(value.at)) &&
    Number.isFinite(value.quantity) && value.quantity >= 1 && value.quantity <= 100000 &&
    Number.isFinite(value.price) && value.price >= 0 && value.price <= 10000 &&
    [value.freight, value.other].every(n => Number.isFinite(n) && n >= 0 && n <= 1000000);
}
export default function SellingEstimate() {
  const { language } = useLanguage(); const { user } = useAuth(); const bn = language === "bn";
  const [quantity, setQuantity] = useState(""); const [price, setPrice] = useState(""); const [freight, setFreight] = useState(""); const [other, setOther] = useState("0");
  const [secondPrice, setSecondPrice] = useState(""); const [secondFreight, setSecondFreight] = useState(""); const [secondOther, setSecondOther] = useState("0");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<Estimate[]>(() => { try { const rows = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(rows) ? rows.filter(valid).slice(0, 50) : []; } catch { return []; } });
  const estimate: Estimate = { id: "current", at: new Date().toISOString(), quantity: Number(quantity), price: Number(price), freight: Number(freight), other: Number(other) };
  const ready = [quantity, price, freight, other].every(v => v.trim() !== "") && valid(estimate);
  const net = ready ? estimate.price - (estimate.freight + estimate.other) / estimate.quantity : null;
  const money = (n: number) => `৳${n.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 })}`;
  const costs = readLedger(user?.id).filter((row): row is Extract<typeof row, { type: "expense" }> => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const offerBReady = ready && secondPrice !== "" && secondFreight !== "" && secondOther !== "" && [secondPrice, secondFreight, secondOther].every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
  const offerBNet = offerBReady ? Number(secondPrice) - (Number(secondFreight) + Number(secondOther)) / estimate.quantity : null;
  const breakdown = (offerPrice: number, offerFreight: number, offerOther: number) => {
    const gross = estimate.quantity * offerPrice; const salesCosts = offerFreight + offerOther; const takeHome = gross - salesCosts;
    return { gross, salesCosts, takeHome, profit: takeHome - costs, breakEven: (costs + salesCosts) / estimate.quantity };
  };
  function save(event: React.FormEvent) {
    event.preventDefault(); if (!ready) return;
    const id = crypto.randomUUID(); const next = [{ ...estimate, id }, ...saved].slice(0, 50);
    try {
      const offer = breakdown(estimate.price, estimate.freight, estimate.other);
      const offerB = offerBReady ? breakdown(Number(secondPrice), Number(secondFreight), Number(secondOther)) : null;
      saveLedger({ type: "calculation", id, date: localToday(), category: "sale-offer", title: bn ? "বিক্রির হিসাব" : "Selling offer", inputs: { quantity: estimate.quantity, price: estimate.price, freight: estimate.freight, other: estimate.other, ...(offerB ? { offer2Price: Number(secondPrice), offer2Freight: Number(secondFreight), offer2Other: Number(secondOther) } : {}) }, result: { gross: offer.gross, sellingCosts: offer.salesCosts, takeHome: offer.takeHome, estimatedProfit: offer.profit, breakEvenPerKg: offer.breakEven, ...(offerB ? { offer2Gross: offerB.gross, offer2SellingCosts: offerB.salesCosts, offer2TakeHome: offerB.takeHome, offer2EstimatedProfit: offerB.profit } : {}) } }, user?.id);
      try { localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setMessage(bn ? "এই ফোনে ও খাতায় হিসাব রাখা হয়েছে।" : "Estimate saved on this device and in the notebook."); }
      catch { setMessage(bn ? "খাতায় সেভ হয়েছে; পুরোনো হিসাবের তালিকা আপডেট হয়নি।" : "Saved to the notebook; the estimate list could not be updated."); }
    } catch { setMessage(bn ? "খাতায় সেভ হয়নি। এই ফোনে জায়গা আছে কি না দেখুন।" : "Could not save to the notebook. Check device storage."); }
  }
  return <section className="selling-estimate"><p className="section-kicker">{bn ? "ফোনে পাওয়া দর দিয়ে হিসাব" : "USE THE PRICE YOU WERE QUOTED"}</p><h2>{bn ? "শেষে কত থাকবে?" : "What will you take home?"}</h2>
    <form onSubmit={save} className="tool-form"><div className="selling-inputs">
      <label>{bn ? "বিক্রির পরিমাণ" : "Quantity to sell"}<span className="selling-input-wrap"><input name="saleQuantity" type="number" inputMode="decimal" required min="1" max="100000" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /><span>{bn ? "কেজি" : "kg"}</span></span></label>
      <label>{bn ? "ফোনে পাওয়া দর" : "Quoted price"}<span className="selling-input-wrap"><input name="salePrice" type="number" inputMode="decimal" required min="0" max="10000" step="any" value={price} onChange={e => setPrice(e.target.value)} /><span>{bn ? "৳/কেজি" : "BDT/kg"}</span></span></label>
      <label>{bn ? "আপনার মোট গাড়িভাড়া" : "Your total transport cost"}<span className="selling-input-wrap"><input name="saleFreight" type="number" inputMode="decimal" required min="0" max="1000000" step="any" value={freight} onChange={e => setFreight(e.target.value)} /><span>{bn ? "৳" : "BDT"}</span></span><small>{bn ? "না লাগলে ০ লিখুন। না জানলে হিসাব অপেক্ষা করবে।" : "Enter 0 if you pay none. Unknown costs stay blank."}</small></label>
    </div><details><summary>{bn ? "অন্য খরচ আছে?" : "Other costs?"}</summary><label>{bn ? "মোট অন্য খরচ (টাকা); না থাকলে ০" : "Total other costs (BDT); 0 if none"}<input name="saleOther" type="number" min="0" max="1000000" step="any" value={other} onChange={e => setOther(e.target.value)} /></label></details>
    {ready && (() => { const row = breakdown(estimate.price, estimate.freight, estimate.other); return <div className="sale-breakdown" aria-live="polite"><h3>{bn ? "প্রস্তাব ১ · আপনার দেওয়া হিসাব" : "Offer 1 · your entered terms"}</h3><dl><div><dt>{bn ? "মোট বিক্রি" : "Gross sale"}</dt><dd>{money(row.gross)}</dd></div><div><dt>{bn ? "বিক্রির খরচ" : "Selling costs"}</dt><dd>−{money(row.salesCosts)}</dd></div><div><dt>{bn ? "হাতে থাকবে" : "Take-home"}</dt><dd>{money(row.takeHome)}</dd></div><div><dt>{bn ? "লেখা জমি-খরচ বাদে আনুমানিক" : "Estimated after recorded field costs"}</dt><dd>{money(row.profit)}</dd></div><div><dt>{bn ? "লেখা খরচ তুলতে দর/কেজি" : "Break-even price/kg"}</dt><dd>{money(row.breakEven)}</dd></div></dl><small>{bn ? `খাতায় লেখা চাষের খরচ: ${money(costs)}। অসম্পূর্ণ খরচ হলে লাভও অসম্পূর্ণ হিসাব।` : `Recorded growing costs: ${money(costs)}. If costs are incomplete, estimated profit is incomplete too.`}</small></div>; })()}
    <details className="offer-comparison"><summary>{bn ? "দ্বিতীয় প্রস্তাবের সঙ্গে তুলনা" : "Compare a second offer"}</summary><div className="selling-inputs"><label>{bn ? "দ্বিতীয় দর" : "Offer 2 price"}<input name="offer2Price" type="number" min="0" max="10000" step="any" value={secondPrice} onChange={e => setSecondPrice(e.target.value)} /></label><label>{bn ? "মোট গাড়িভাড়া" : "Total transport"}<input name="offer2Freight" type="number" min="0" max="1000000" step="any" value={secondFreight} onChange={e => setSecondFreight(e.target.value)} /></label><label>{bn ? "অন্য বিক্রি খরচ" : "Other selling costs"}<input name="offer2Other" type="number" min="0" max="1000000" step="any" value={secondOther} onChange={e => setSecondOther(e.target.value)} /></label></div>{offerBNet !== null && <div className="offer-compare-result"><p>{bn ? "একই বিক্রির পরিমাণ ধরে হাতে" : "Take-home for the same quantity"}: <strong>{money(offerBNet * estimate.quantity)}</strong></p><p>{bn ? "প্রতি কেজি হাতে" : "Take-home per kg"}: {money(offerBNet)}</p><strong>{offerBNet > net! ? (bn ? "প্রস্তাব ২-এ হাতে বেশি" : "Offer 2 leaves more") : offerBNet < net! ? (bn ? "প্রস্তাব ১-এ হাতে বেশি" : "Offer 1 leaves more") : (bn ? "দুই প্রস্তাব সমান" : "Offers are equal")}</strong></div>}</details>
    <small>{bn ? "সব আলু এই দরে বিক্রি হলে হিসাব। লাভ লেখা জমির খরচের ওপর নির্ভর করে; ওজন, কাটতি বা বাদ পড়া খরচে ফল বদলাবে।" : "Assumes all entered kg sell at this price. Estimated profit depends on recorded field costs; weights, deductions and missing costs change it."}</small>
    <button className="main-button" disabled={!ready}>{bn ? "হিসাব রাখুন" : "Save estimate"}</button>{message && <p role="status">{message}</p>}</form>
    <details className="selling-records"><summary>{bn ? `রাখা হিসাব · ${saved.length.toLocaleString("bn-BD")}` : `Saved estimates · ${saved.length}`}</summary>{saved.length ? saved.map(row => <p key={row.id}>{new Date(row.at).toLocaleDateString(bn ? "bn-BD" : "en-GB")} · {row.quantity.toLocaleString(bn ? "bn-BD" : "en-GB")} {bn ? "কেজি" : "kg"} · {money(row.price - (row.freight + row.other) / row.quantity)}/{bn ? "কেজি" : "kg"}</p>) : <p>{bn ? "এখনো কোনো হিসাব রাখা হয়নি।" : "No saved estimates yet."}</p>}</details>
  </section>;
}
