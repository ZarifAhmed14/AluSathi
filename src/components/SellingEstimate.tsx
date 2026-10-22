import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { readLedger } from "@/lib/farm-ledger";

type Costs = { transport: string; loading: string; other: string };
const emptyCosts: Costs = { transport: "", loading: "", other: "" };

export default function SellingEstimate() {
  const { language } = useLanguage(); const { user } = useAuth(); const bn = language === "bn";
  const [quantity, setQuantity] = useState(""); const [price, setPrice] = useState("");
  const [costs, setCosts] = useState<Costs>(emptyCosts); const [wholeCrop, setWholeCrop] = useState(true);
  const [secondPrice, setSecondPrice] = useState(""); const [secondCosts, setSecondCosts] = useState<Costs>(emptyCosts);
  const growingExpenses = readLedger(user?.id).filter((row): row is Extract<typeof row, { type: "expense" }> => row.type === "expense");
  const growingCost = growingExpenses.reduce((sum, row) => sum + row.amount, 0);
  const expenseNames = bn ? { seed: "বীজ", manure: "সার / গোবর", labour: "শ্রম", irrigation: "সেচ", transport: "পরিবহন", other: "অন্যান্য" } : { seed: "Seed", manure: "Manure", labour: "Labour", irrigation: "Irrigation", transport: "Transport", other: "Other" };
  const expenseBreakdown = Object.entries(growingExpenses.reduce<Record<string, number>>((rows, row) => ({ ...rows, [row.category]: (rows[row.category] || 0) + row.amount }), {}));
  const q = Number(quantity); const p = Number(price);
  const validNumber = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
  const costsKnown = Object.values(costs).every(validNumber);
  const ready = quantity.trim() !== "" && price.trim() !== "" && Number.isFinite(q) && q > 0 && Number.isFinite(p) && p >= 0 && costsKnown;
  const costTotal = (value: Costs) => Number(value.transport) + Number(value.loading) + Number(value.other);
  const money = (value: number) => `৳${value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 })}`;
  const setCost = (key: keyof Costs, value: string, second = false) => (second ? setSecondCosts : setCosts)(old => ({ ...old, [key]: value }));
  const offer = ready ? { gross: q * p, selling: costTotal(costs), takeHome: q * p - costTotal(costs), breakEven: (growingCost + costTotal(costs)) / q } : null;
  const secondReady = ready && validNumber(secondPrice) && Object.values(secondCosts).every(validNumber);
  const second = secondReady ? { gross: q * Number(secondPrice), selling: costTotal(secondCosts), takeHome: q * Number(secondPrice) - costTotal(secondCosts) } : null;
  const costInput = (key: keyof Costs, bnLabel: string, enLabel: string, secondOffer = false) => <label>{bn ? bnLabel : enLabel}<span className="selling-input-wrap"><input type="number" min="0" max="1000000" step="any" inputMode="decimal" value={(secondOffer ? secondCosts : costs)[key]} onChange={event => setCost(key, event.target.value, secondOffer)} /><span>{bn ? "৳" : "BDT"}</span></span></label>;

  return <section className="selling-estimate hisab-estimate">
    <div className="hisab-picture" aria-live="polite">
      <details open><summary>{bn ? "এ পর্যন্ত খরচ" : "Costs so far"}</summary><strong>{money(growingCost)}</strong><small>{bn ? "খাতায় লেখা চাষাবাদের খরচ" : "Growing expenses recorded in Notebook"}</small>{expenseBreakdown.length > 0 && <ul>{expenseBreakdown.map(([key, amount]) => <li key={key}>{expenseNames[key as keyof typeof expenseNames]} <b>{money(amount)}</b></li>)}</ul>}</details>
      <details open><summary>{bn ? "খরচ তুলতে দরকার" : "Price needed to cover costs"}</summary><strong>{offer ? `${money(offer.breakEven)}/${bn ? "কেজি" : "kg"}` : "—"}</strong><small>{offer ? `${money(growingCost + offer.selling)} ÷ ${q.toLocaleString(bn ? "bn-BD" : "en-GB")} ${bn ? "কেজি" : "kg"}` : (bn ? "বিক্রির পরিমাণ ও বাড়তি খরচ দিলে দেখাবে" : "Enter sale quantity and costs to calculate")}</small></details>
      <details open><summary>{bn ? "আনুমানিক লাভ / লোকসান" : "Estimated profit / loss"}</summary><strong>{offer && wholeCrop ? money(offer.takeHome - growingCost) : "—"}</strong><small>{offer && wholeCrop ? `${money(offer.takeHome)} − ${money(growingCost)}` : offer && !wholeCrop ? (bn ? "আংশিক বিক্রিতে পুরো চাষাবাদের লাভ দেখানো হয় না" : "A partial sale does not show whole-crop profit") : (bn ? "সব বিক্রযোগ্য আলু হলে হিসাব" : "Shown only for the full saleable crop")}</small></details>
    </div>
    <p className="section-kicker">{bn ? "বিক্রির হিসাব" : "SALE CALCULATOR"}</p><h2>{bn ? "এই দরে বিক্রি করলে কত থাকবে?" : "What remains at this price?"}</h2>
    <form className="tool-form" onSubmit={event => event.preventDefault()}>
      <div className="selling-inputs">
        <label>{bn ? "কত কেজি বিক্রি করবেন?" : "How many kg will you sell?"}<span className="selling-input-wrap"><input type="number" required min="0.01" max="100000" step="any" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} /><span>{bn ? "কেজি" : "kg"}</span></span></label>
        <label>{bn ? "প্রতি কেজি কত টাকা পাবেন?" : "Price per kg"}<span className="selling-input-wrap"><input type="number" required min="0" max="10000" step="any" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} /><span>{bn ? "৳" : "BDT"}</span></span></label>
      </div>
      <details className="selling-costs"><summary>{bn ? "বিক্রির বাড়তি খরচ" : "Extra selling costs"}</summary><p>{bn ? "না থাকলে ০ লিখুন। জানা না থাকলে ফাঁকা রাখুন—ফলাফল তখন অসম্পূর্ণ থাকবে।" : "Enter 0 only when there is no cost. Leave it blank when unknown; the result stays incomplete."}</p><div className="selling-inputs">{costInput("transport", "পরিবহন", "Transport")}{costInput("loading", "লোডিং / বস্তা", "Loading / sacks")}{costInput("other", "অন্যান্য", "Other")}</div></details>
      <label className="whole-crop-check"><input type="checkbox" checked={wholeCrop} onChange={event => setWholeCrop(event.target.checked)} />{bn ? "এটি পুরো বিক্রিযোগ্য আলুর হিসাব" : "This is the full saleable crop"}</label>
      {offer && <div className="sale-breakdown"><h3>{bn ? "এই বিক্রির হিসাব" : "This sale"}</h3><dl><div><dt>{bn ? "বিক্রির টাকা" : "Sale income"}</dt><dd>{money(offer.gross)}</dd></div><div><dt>{bn ? "বিক্রির বাড়তি খরচ" : "Extra selling costs"}</dt><dd>−{money(offer.selling)}</dd></div><div><dt>{bn ? "খরচ বাদে থাকবে" : "Remaining after selling costs"}</dt><dd>{money(offer.takeHome)}</dd></div><div><dt>{bn ? "খরচ তুলতে অন্তত দর" : "Break-even price"}</dt><dd>{money(offer.breakEven)}/{bn ? "কেজি" : "kg"}</dd></div></dl><small>{wholeCrop ? (bn ? `চাষাবাদের খরচ বাদে আনুমানিক লাভ / লোকসান: ${money(offer.takeHome - growingCost)}।` : `Estimated profit / loss after recorded growing costs: ${money(offer.takeHome - growingCost)}.`) : (bn ? "এটি আংশিক বিক্রির টাকা। পুরো চাষাবাদের খরচ বাদ দিয়ে একে লাভ বলা হচ্ছে না।" : "This is the partial sale's proceeds. Whole-crop growing costs are not subtracted as profit.")}</small></div>}
      <details className="offer-comparison"><summary>{bn ? "দুই দর তুলনা করুন" : "Compare two prices"}</summary><div className="selling-inputs"><label>{bn ? "দ্বিতীয় দর (টাকা/কেজি)" : "Second price (BDT/kg)"}<input type="number" min="0" max="10000" step="any" inputMode="decimal" value={secondPrice} onChange={event => setSecondPrice(event.target.value)} /></label>{costInput("transport", "পরিবহন", "Transport", true)}{costInput("loading", "লোডিং / বস্তা", "Loading / sacks", true)}{costInput("other", "অন্যান্য", "Other", true)}</div>{second && <div className="offer-compare-result"><p>{bn ? "দ্বিতীয় দর থেকে থাকবে" : "Second offer leaves"}: <strong>{money(second.takeHome)}</strong></p><strong>{second.takeHome > offer!.takeHome ? (bn ? "দ্বিতীয় দর ভালো" : "The second offer is better") : second.takeHome < offer!.takeHome ? (bn ? "প্রথম দর ভালো" : "The first offer is better") : (bn ? "দুই দর সমান" : "The offers are equal")}</strong></div>}</details>
      {!ready && <small className="hisab-hint">{bn ? "দুইটি মূল তথ্য ও সব বিক্রির খরচ লিখলে ফল দেখাবে।" : "Results appear after the two main figures and all selling costs are entered."}</small>}
    </form>
  </section>;
}
