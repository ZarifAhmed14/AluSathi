import { useState } from "react";
import ColdStorage from "@/components/ColdStorage";
import FarmerNavigation from "@/components/FarmerNavigation";
import SellingEstimate from "@/components/SellingEstimate";
import HarvestMarket from "@/components/HarvestMarket";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export default function ColdStoragePage() {
  const { language } = useLanguage(); const { user } = useAuth(); const bn = language === "bn";
  const [samples, setSamples] = useState(false);
  return <div className={`farmer-v2 ${bn ? "font-bangla" : ""}`}>
    <FarmerNavigation active="selling" />
    <main className="farmer-selling"><div className="app-shell"><header className="farmer-page-heading"><h1>{bn ? "বিক্রির আগে" : "Before selling"}</h1><p>{bn ? "দর, গাড়িভাড়া আর হাতে থাকার হিসাব।" : "Your quoted price, transport costs and take-home amount."}</p></header>
      <SellingEstimate />
      <div className="selling-links"><a className="secondary-main" href="/marketplace/farmer.html#transport">{bn ? "পথ ও গাড়ির বিস্তারিত হিসাব" : "Route and detailed transport plan"}</a><a className="secondary-main" href="/marketplace/farmer.html#deals">{bn ? "বিক্রির রাখা নথি" : "Saved sale records"}</a></div>
    </div><ColdStorage />
    <div className="app-shell selling-legacy"><details><summary>{bn ? "আগের প্রস্তুতি ও ফোনে লেখা চাহিদা" : "Previous preparation and phone requests"}</summary><HarvestMarket storageKey={user?.id || "demo"} readOnly /></details>
      <label className="checkbox-label"><input type="checkbox" checked={samples} onChange={e => setSamples(e.target.checked)} />{bn ? "নমুনা দেখুন" : "Show examples"}</label>
      {samples && <div className="sample-area"><p>{bn ? "এটি অনুশীলনের অংশ। নমুনা দর আসল ক্রেতার প্রস্তাব নয়।" : "Practice area. Example prices are not real buyer offers."}</p><a href="/marketplace/farmer.html#samples">{bn ? "নমুনা আলু ও দর দেখুন" : "Open sample lots and offers"}</a><HarvestMarket storageKey="farmer-practice" /></div>}
    </div></main>
  </div>;
}
