import SellingPondBanner from "@/components/SellingPondBanner";
import ColdStorage from "@/components/ColdStorage";
import FarmerNavigation from "@/components/FarmerNavigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { Calculator, PackageCheck, Phone, X } from "lucide-react";

export default function ColdStoragePage() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [storageOpen, setStorageOpen] = useState(false);
  const [buyersOpen, setBuyersOpen] = useState(false);
  const [buyersSearching, setBuyersSearching] = useState(false);
  const [buyersReady, setBuyersReady] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [cost, setCost] = useState("");
  const quantity = 200;
  const lowOffer = 4000;
  const highOffer = 4400;
  const totalCost = Number(cost);
  const validCost = cost !== "" && Number.isFinite(totalCost) && totalCost >= 0;
  const money = (amount: number) => `৳${new Intl.NumberFormat(bn ? "bn-BD" : "en-BD", { maximumFractionDigits: 0 }).format(amount)}`;
  useEffect(() => {
    if (!buyersOpen) { setBuyersSearching(false); setBuyersReady(false); return; }
    setBuyersSearching(true);
    const timer = window.setTimeout(() => { setBuyersSearching(false); setBuyersReady(true); }, 900);
    return () => window.clearTimeout(timer);
  }, [buyersOpen]);
  return <div className={`farmer-v2 ${bn ? "font-bangla" : ""}`}>
    <FarmerNavigation active="selling" />
    <main className="farmer-selling"><SellingPondBanner /><div className="app-shell">
      <header className="farmer-page-heading"><p className="section-kicker">{bn ? "বিক্রির প্রস্তুতি" : "PREPARE TO SELL"}</p><h1>{bn ? "বিক্রির আগে" : "Before selling"}</h1><p>{bn ? "আগে আলুর পরিচয়পত্র তৈরি করুন, তারপর দরকার হলে হিমাগার দেখুন।" : "Create the potato passport first, then browse cold storage if needed."}</p></header>
      <div className="selling-compact-grid">
        <section className="selling-focus-card"><span className="selling-icon">🪪</span><div><h2>{bn ? "আলুর পরিচয়পত্র" : "Potato passport"}</h2><p>{bn ? "জাত, পরিমাণ ও জমির নোট একসাথে রাখুন। পুরোনো খাতার জানা তথ্য নিজে থেকে বসবে।" : "Keep variety, quantity and field notes together. Known notebook details are prefilled."}</p><a className="secondary-main" href="/marketplace/farmer.html#list">{bn ? "পরিচয়পত্র তৈরি করুন" : "Create passport"}</a></div></section>
        <section className="selling-focus-card"><span className="selling-icon">🤝</span><div><h2>{bn ? "ক্রেতার দর ও উত্তর" : "Buyer offers and responses"}</h2><p>{bn ? "আপনার এলাকার আলুর জন্য ক্রেতার প্রস্তাব দেখুন।" : "Buyer requests for potatoes in your area."}</p><button className="secondary-main" type="button" aria-expanded={buyersOpen} aria-controls="buyer-requests" onClick={() => setBuyersOpen(open => !open)}>{bn ? (buyersOpen ? "ক্রেতার তালিকা বন্ধ করুন" : "ক্রেতার দর ও উত্তর দেখুন") : (buyersOpen ? "Hide buyer requests" : "Find buyer requests")}</button></div></section>
        <section className="selling-focus-card"><span className="selling-icon">❄️</span><div><h2>{bn ? "হিমাগার খুঁজুন" : "Find cold storage"}</h2><p>{bn ? "কাছের সংরক্ষণ কেন্দ্রের তথ্য দেখুন।" : "Browse storage options for your harvest."}</p><button className="secondary-main" type="button" onClick={() => setStorageOpen(open => !open)}>{bn ? (storageOpen ? "হিমাগার বন্ধ করুন" : "হিমাগার খুঁজুন") : (storageOpen ? "Hide cold stores" : "Find cold storage")}</button></div></section>
      </div>
      <div className="selling-market-action"><a className="secondary-main selling-market-cta" href="/farmer#market"><PackageCheck size={19} />{bn ? "বাজারে দিন" : "Go to market"}</a></div>
      {storageOpen && <ColdStorage />}
      {buyersOpen && <section id="buyer-requests" className="selling-requests" aria-labelledby="buyer-requests-title">
        {buyersSearching && <div className="storage-searching" role="status" aria-live="polite"><span className="storage-search-spinner" aria-hidden="true" /><div><strong>{bn ? "ক্রেতার চাহিদা খুঁজছি…" : "Searching buyer requests…"}</strong><span>{bn ? "আপনার এলাকার আলুর প্রস্তাব মিলিয়ে নিচ্ছি" : "Checking requests for potatoes in your area"}</span></div><div className="storage-search-track" aria-hidden="true"><i /></div></div>}
        {buyersReady && <><header><p className="section-kicker">{bn ? "ক্রেতার চাহিদা" : "BUYER REQUESTS"}</p><h2 id="buyer-requests-title">{bn ? "আপনার এলাকার ক্রেতারা" : "Buyers looking in your area"}</h2></header>
        <article className="selling-request-card">
          <div className="selling-request-avatar" aria-hidden="true">R</div>
          <div className="selling-request-copy"><h3>{bn ? "রহিম ট্রেডার্স" : "Rahim Traders"}</h3><p>{bn ? "আপনার এলাকা থেকে ২০০ কেজি আলু নিতে চান" : "Wants 200 kg of potatoes from your area"}</p><strong>{bn ? "প্রস্তাব: ৳৪,০০০–৳৪,৪০০ মোট" : "Offer: ৳4,000–৳4,400 total"}</strong></div>
          <div className="selling-request-actions"><a className="secondary-main" href="/marketplace/farmer.html#responses"><Phone size={17} />{bn ? "যোগাযোগ করুন" : "Contact"}</a><button className="secondary-main" type="button" onClick={() => setEstimateOpen(true)}><Calculator size={17} />{bn ? "হিসাব খুলুন" : "Open estimate"}</button></div>
        </article>
        </>}
      </section>}
    </div>
    {estimateOpen && <div className="selling-estimate-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEstimateOpen(false); }}>
      <section className="selling-estimate-dialog" role="dialog" aria-modal="true" aria-labelledby="selling-estimate-title">
        <button className="selling-estimate-close" type="button" aria-label={bn ? "বন্ধ করুন" : "Close"} onClick={() => setEstimateOpen(false)}><X size={20} /></button>
        <p className="section-kicker">{bn ? "রহিম ট্রেডার্স · ২০০ কেজি" : "RAHIM TRADERS · 200 KG"}</p><h2 id="selling-estimate-title">{bn ? "সম্ভাব্য লাভ–লোকসান" : "Possible profit or loss"}</h2>
        <div className="selling-estimate-offers"><span>{bn ? "প্রস্তাবের সীমা" : "Offer range"}</span><strong>{money(lowOffer)} – {money(highOffer)}</strong></div>
        <label className="selling-estimate-input">{bn ? "এই ২০০ কেজির মোট খরচ" : "Your total cost for these 200 kg"}<input type="number" min="0" step="1" inputMode="decimal" value={cost} onChange={event => setCost(event.target.value)} placeholder={bn ? "খরচ লিখুন" : "Enter your cost"} /></label>
        {validCost ? <div className="selling-estimate-results"><p><span>{bn ? "প্রস্তাব ৳৪,০০০ হলে" : "At ৳4,000 offer"}</span><strong className={lowOffer - totalCost < 0 ? "loss" : "profit"}>{money(lowOffer - totalCost)} {lowOffer - totalCost < 0 ? (bn ? "লোকসান" : "loss") : (bn ? "বাকি" : "remaining")}</strong></p><p><span>{bn ? "প্রস্তাব ৳৪,৪০০ হলে" : "At ৳4,400 offer"}</span><strong className={highOffer - totalCost < 0 ? "loss" : "profit"}>{money(highOffer - totalCost)} {highOffer - totalCost < 0 ? (bn ? "লোকসান" : "loss") : (bn ? "বাকি" : "remaining")}</strong></p></div> : <p className="selling-estimate-hint">{bn ? "খরচ লিখলে দুই প্রস্তাবে হাতে কত থাকতে পারে দেখাবে।" : "Enter your cost to see what may remain from either offer."}</p>}
        <small>{bn ? "এটি আনুমানিক হিসাব; অন্য খরচ এতে নেই।" : "Estimate only; other costs are not included."}</small>
      </section>
    </div>}
    </main>
  </div>;
}
