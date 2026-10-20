import { useState } from "react";
import { Camera, Calculator, History, Leaf, Menu, Store, Sun } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";

export default function FarmerNavigation({ active = "today" }: { active?: string }) {
  const { language, setLanguage } = useLanguage();
  const { user, signOut, configured } = useAuth();
  const { setDemo } = useDemo();
  const [error, setError] = useState("");
  const bn = language === "bn";
  const tabs = [
    ["photos", "/farmer#photos", bn ? "ছবি" : "Photos", Camera],
    ["today", "/farmer", bn ? "আজকের কাজ" : "Today", Sun],
    ["tools", "/farmer#tools", bn ? "হিসাব" : "Tools", Calculator],
    ["diary", "/farmer#diary", bn ? "খাতা" : "Notebook", History],
    ["selling", "/selling-preparation", bn ? "বিক্রির আগে" : "Before selling", Store],
  ] as const;
  const links = tabs.map(([id, href, label, Icon]) => <a key={id} href={href} aria-current={active === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></a>);
  async function leave() {
    try { if (user) await signOut(); setDemo(false); window.location.replace("/"); }
    catch { setError(bn ? "বের হওয়া যায়নি। আবার চেষ্টা করুন।" : "Could not sign out. Please retry."); }
  }
  return <>
    <header className="site-header farmer-header"><div className="app-shell farmer-header-inner">
      <a href="/farmer" className="site-brand" onClick={() => window.scrollTo(0, 0)}><span className="brand-mark"><Leaf size={22} /></span><strong>আলুসাথী</strong></a>
      <nav className="farmer-tabs" aria-label={bn ? "মূল মেনু" : "Primary navigation"}>{links}</nav>
      <details className="farmer-more" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary><Menu size={18} />{bn ? "আরও" : "More"}</summary><div onClick={event => { if ((event.target as Element).closest("a,button")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
        <a href="/farmer#settings">{bn ? "জেলা ও চাষের সময়" : "District and planting time"}</a>
        <a href="/farmer#help">{bn ? "আলুর যত্ন" : "Potato care"}</a>
        <a href="/life-cycle">{bn ? "আলুর জীবন" : "Potato life"}</a>
        {!user && configured && <a href="/account">{bn ? "অনলাইন খাতায় লগইন" : "Account login"}</a>}
        <button onClick={() => setLanguage(bn ? "en" : "bn")}>{bn ? "English" : "বাংলা"}</button>
        <button onClick={leave}>{user ? (bn ? "বের হন" : "Sign out") : (bn ? "মূল পাতায় ফিরুন" : "Return to main page")}</button>
      </div></details>
    </div>{error && <p role="alert" className="app-shell">{error}</p>}</header>
    <nav className="farmer-bottom-tabs" aria-label={bn ? "ফোনের মূল মেনু" : "Mobile navigation"}>{links}</nav>
  </>;
}
