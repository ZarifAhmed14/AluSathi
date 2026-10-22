import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import PotatoLifeCycle from "@/pages/PotatoLifeCycle";
import ColdStoragePage from "@/pages/ColdStoragePage";
import SellingPreparationDetails from "@/pages/SellingPreparationDetails";
import { DemoProvider, DemoEntry } from "@/contexts/DemoContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";

function PageTitle() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  useEffect(() => {
    const titles: Record<string, [string, string]> = {
      "/": ["আলুসাথী — আলু চাষ, বিক্রি ও কেনার সহায়তা", "AluSathi — Grow, sell, and buy potatoes"],
      "/farmer": ["আমার পাতা — আলুসাথী", "My farmer page — AluSathi"],
      "/auth": ["কৃষক নাকি ব্যবসায়ী — আলুসাথী", "Farmer or businessman — AluSathi"],
      "/account": ["আমার অ্যাকাউন্ট — আলুসাথী", "My account — AluSathi"],
      "/life-cycle": ["আলুর জীবন — আলুসাথী", "Potato life cycle — AluSathi"],
      "/selling-preparation": ["বিক্রির প্রস্তুতি — আলুসাথী", "Prepare to sell — AluSathi"],
    };
    document.title = titles[pathname]?.[language === "bn" ? 0 : 1] || "AluSathi";
  }, [pathname, language]);
  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider><DemoProvider><BrowserRouter>
        <PageTitle />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/farmer" element={<Index farmerHome />} />
          <Route path="/auth" element={<DemoEntry />} />
          <Route path="/account" element={<Auth />} />
          <Route path="/life-cycle" element={<PotatoLifeCycle />} />
          <Route path="/selling-preparation" element={<ColdStoragePage />} />
          <Route path="/selling-preparation/details" element={<SellingPreparationDetails />} />
          <Route path="/cold-storage" element={<Navigate to="/selling-preparation" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter></DemoProvider></AuthProvider>
    </LanguageProvider>
  );
}
