import { ArrowRight } from "lucide-react";
import SellingPreparationTools from "@/components/SellingPreparationTools";
import ColdStorage from "@/components/ColdStorage";
import FarmerNavigation from "@/components/FarmerNavigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import "@/farmer-selling.css";

export default function ColdStoragePage() {
  const { language } = useLanguage(); const bn = language === "bn";
  const theme = useSiteTheme();
  return <div className={`farmer-v2 selling-page ${bn ? "font-bangla" : ""}`} data-home-theme={theme}>
    <FarmerNavigation active="selling" />
    <main className="app-shell selling-shell">
      <header className="selling-heading"><p>{bn ? "আলু তোলার পরের ধাপ" : "After the harvest"}</p><h1>{bn ? "বিক্রির আগে" : "Before selling"}</h1><p>{bn ? "আলু বাছুন, তথ্য লিখুন, তারপর ক্রেতাদের দেখান।" : "Sort your potatoes, add their details, then show them to buyers."}</p></header>
      <SellingPreparationTools />
      <ColdStorage />
      <div className="selling-next"><a href="/farmer#market">{bn ? "আলু বাজারে দিন" : "List your potatoes for sale"}<ArrowRight size={18}/></a></div>
    </main>
  </div>;
}
