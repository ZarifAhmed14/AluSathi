import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  Globe2,
  Leaf,
  Palette,
  Scale,
  Sprout,
  Phone,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "@/contexts/DemoContext";
import { useLanguage } from "@/contexts/LanguageContext";
import PotatoLifeCycle from "@/pages/PotatoLifeCycle";
import "@/public-landing.css";

const buyerPath = "/marketplace/buyer.html";
const homeThemes = [
  { id: "river", name: "River", bn: "নদী", color: "#edf6f8" },
  { id: "monsoon", name: "Monsoon", bn: "বর্ষা", color: "#e1efeb" },
  { id: "sky", name: "Sky", bn: "আকাশ", color: "#e6eefb" },
  { id: "earth", name: "Earth", bn: "মাটি", color: "#eeeae3" },
  { id: "harvest", name: "Harvest", bn: "সোনালি", color: "#faf2d8" },
  { id: "paddy", name: "Paddy", bn: "ধানক্ষেত", color: "#edf2df" },
  { id: "coast", name: "Coast", bn: "সাগর", color: "#e0f3f2" },
  { id: "indigo", name: "Indigo", bn: "নীল", color: "#e9ecfa" },
  { id: "paper", name: "Paper", bn: "সাদা", color: "#fafbf9" },
  { id: "slate", name: "Slate", bn: "ধূসর", color: "#e6ebef" },
] as const;

export default function PublicLanding() {
  const { language, setLanguage } = useLanguage();
  const { setDemo } = useDemo();
  const bn = language === "bn";
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("alusathi-home-theme");
      return homeThemes.find(item => item.id === saved)?.id || "river";
    } catch {
      return "river";
    }
  });

  function chooseTheme(value: typeof homeThemes[number]["id"]) {
    setTheme(value);
    try {
      localStorage.setItem("alusathi-home-theme", value);
      window.dispatchEvent(new Event("alusathi-theme-change"));
    } catch {
      // Colour preview still works when browser storage is unavailable.
    }
  }

  function enterBuyerPage() {
    try {
      sessionStorage.setItem("alusathi-role", "buyer");
      sessionStorage.setItem("alusathi-demo", "false");
    } catch {
      // The buyer page remains available when browser storage is blocked.
    }
  }

  const steps = bn
    ? [
        [Camera, "ছবি ও জমির তথ্য দিন"],
        [ClipboardCheck, "আজকের কাজ গুছিয়ে নিন"],
        [Sprout, "অগ্রগতি খাতায় রাখুন"],
      ] as const
    : [
        [Camera, "Add a photo and your field details"],
        [ClipboardCheck, "Organise today’s tasks"],
        [Sprout, "Keep your progress in Khata"],
      ] as const;

  const buyerSteps = bn
    ? [
        [Sprout, "পছন্দের আলু খুঁজুন", "জেলা, জাত, পরিমাণ ও প্রস্তুতির তারিখ মিলিয়ে দেখুন।"],
        [Scale, "পছন্দের লট তুলনা করুন", "আলুর দাম ও আনুমানিক পরিবহন খরচ মিলিয়ে দেখুন।"],
        [Phone, "সরাসরি কৃষকের সঙ্গে কথা বলুন", "দর ও সংগ্রহের বিষয়ে নিজেদের মধ্যে ঠিক করুন।"],
      ] as const
    : [
        [Sprout, "Find the potatoes you need", "Filter by district, variety, quantity, and ready date."],
        [Scale, "Compare your saved lots", "Compare potato prices and estimated transport costs."],
        [Phone, "Speak directly to the farmer", "Agree the price and collection directly with each other."],
      ] as const;

  return (
    <div className={`public-landing ${bn ? "font-bangla" : ""}`} data-home-theme={theme}>
      <a href="#main-content" className="skip-link">{bn ? "মূল অংশে যান" : "Skip to content"}</a>
      <header className="public-header">
        <a href="/" className="public-brand" aria-label={bn ? "আলুসাথীর মূল পাতা" : "AluSathi home"}>
          <span className="brand-mark"><Leaf size={22} /></span>
          <span><strong>আলুসাথী</strong><small>{bn ? "আলু চাষ থেকে বিক্রি—পাশে" : "From field to market"}</small></span>
        </a>
        <nav className="public-nav" aria-label={bn ? "মূল নেভিগেশন" : "Main navigation"}>
          <Link to="/farmer#photos" onClick={() => setDemo(true)}>{bn ? "কৃষকের জন্য" : "For farmers"}</Link>
          <a href={buyerPath} onClick={enterBuyerPage}>{bn ? "ক্রেতাদের জন্য" : "For buyers"}</a>
          <a href={`${buyerPath}?preview=public`}>{bn ? "আলু কিনুন" : "Find potatoes"}</a>
        </nav>
        <div className="public-header-actions">
          <details className="home-palette">
            <summary aria-label={bn ? "রং বেছে নিন" : "Choose homepage colours"}><Palette size={18} /><span>{bn ? "পাতার রং" : "Page colours"}</span></summary>
            <div className="home-palette-panel">
              <p>{bn ? "পাতার রং বদলে দেখুন" : "Try page colours"}</p>
              <div className="home-palette-options">
                {homeThemes.map(item => <button key={item.id} type="button" aria-pressed={theme === item.id} onClick={() => chooseTheme(item.id)}><span style={{ backgroundColor: item.color }} aria-hidden="true" />{bn ? item.bn : item.name}</button>)}
              </div>
              <button type="button" className="home-palette-reset" onClick={() => chooseTheme("river")}>{bn ? "আগের রং ফিরিয়ে আনুন" : "Reset to original"}</button>
            </div>
          </details>
          <button className="public-language" onClick={() => setLanguage(bn ? "en" : "bn")} aria-label={bn ? "ইংরেজি ভাষা দেখুন" : "Show Bangla"}>
            <Globe2 size={18} />{bn ? "EN" : "বাংলা"}
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="public-hero" aria-labelledby="home-title">
          <svg className="home-botanical-detail" viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d="M15 190C40 145 75 110 161 19M62 129C18 132 24 83 62 129ZM85 101C63 65 102 47 85 101ZM110 74C139 82 166 55 110 74ZM137 45C120 20 151 1 137 45Z" stroke="currentColor" strokeWidth="1.3" /></svg>
          <div className="hero-content">
            <p className="home-eyebrow"><span />{bn ? "বাংলার মাটি, বাংলার মানুষ" : "The soil and people of bangladesh"}</p>
            <h1 id="home-title">{bn ? <><span>মাটির মানুষের</span>{" "}<em>পাশে।</em></> : <><span>Supporting the people</span>{" "}<em>who farm.</em></>}</h1>
            <p className="hero-description">{bn ? "ছবিতে সমস্যা বুঝুন, দিনের কাজ গুছিয়ে নিন, খাতায় রাখুন জমির খবর। আলু বিক্রির সময় সরাসরি যুক্ত হোন ক্রেতার সঙ্গে।" : "Understand problems shown in your photo. Plan daily tasks and keep field notes in Khata. When you sell, contact Buyers directly."}</p>
            <div className="hero-actions" id="roles">
              <Link className="button-primary hero-role-card" to="/farmer#photos" onClick={() => setDemo(true)} aria-label={bn ? "আমি কৃষক" : "I’m a farmer"} aria-describedby="farmer-role-help">
                <span className="role-card-icon"><Sprout size={23} /></span>
                <span className="role-card-copy"><strong>{bn ? "আমি কৃষক" : "I’m a farmer"}</strong><small id="farmer-role-help">{bn ? "জমির যত্ন ও আলুর তথ্য" : "Field care and potato listings"}</small></span>
                <ArrowRight size={19} />
              </Link>
              <a className="button-secondary hero-role-card" href={buyerPath} onClick={enterBuyerPage} aria-label={bn ? "আমি ক্রেতা" : "I’m a buyer"} aria-describedby="buyer-role-help">
                <span className="role-card-icon"><UsersRound size={23} /></span>
                <span className="role-card-copy"><strong>{bn ? "আমি ক্রেতা" : "I’m a buyer"}</strong><small id="buyer-role-help">{bn ? "আলু খুঁজুন, কৃষকের সঙ্গে কথা বলুন" : "Find potatoes, contact farmers"}</small></span>
                <ArrowRight size={19} />
              </a>
            </div>
            <section className="farmer-selling-link" aria-label={bn ? "আলু বিক্রি করুন" : "Sell potatoes"}>
              <p>{bn ? "আলু বিক্রি করতে চান?" : "Ready to sell your potatoes?"}</p>
              <Link to="/farmer#market" onClick={() => setDemo(true)}>{bn ? "আলু বাজারে দিন" : "List your potatoes for sale"}<ArrowRight size={17} /></Link>
            </section>
          </div>
          <div className="home-growth-panel">
            <p className="home-growth-caption"><Sprout size={17} aria-hidden="true" />{bn ? "বীজ থেকে নতুন আলু" : "FROM SEED TO NEW POTATOES"}</p>
            <PotatoLifeCycle compact showExploreLink={false} />
          </div>
        </section>

        <section className="journey-band trade-bridge" aria-label={bn ? "কৃষক ও ক্রেতার যাত্রা" : "Farmer and buyer journey"}>
          <span><Camera size={20} aria-hidden="true" />{bn ? "ছবি থেকে সহায়তা" : "Help from your photos"}</span>
          <span><ClipboardCheck size={20} aria-hidden="true" />{bn ? "দিনের কাজ ও জমির খাতা" : "Daily tasks and field records"}</span>
          <span><UsersRound size={20} aria-hidden="true" />{bn ? "কৃষক–ক্রেতার সরাসরি যোগাযোগ" : "Farmers and buyers, connected"}</span>
        </section>

        <section className="home-audience home-audience-farmer" aria-labelledby="farmer-section-title">
          <header className="home-audience-heading">
            <h2 id="farmer-section-title"><Sprout size={24} aria-hidden="true" />{bn ? "কৃষকের জন্য" : "For farmers"}</h2>
            <p>{bn ? "জমির যত্ন, দিনের কাজ, বাজারে নিজের আলু।" : "Care for your field. Plan your day. List your potatoes for sale."}</p>
          </header>
        <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-title">
          <div className="workflow-art-wrap">
            <img src="/alusathi-home-photo-guide.webp" alt={bn ? "আলুর পাতার পরিষ্কার ছবি তুলছেন একজন নারী কৃষক" : "A woman farmer taking a clear photo of a potato leaf"} loading="lazy" />
            <span className="art-stamp"><Camera size={19} />{bn ? "ছবি দিয়ে শুরু" : "Start with a photo"}</span>
          </div>
          <div className="workflow-copy">
            <h3 id="workflow-title">{bn ? <>মাঠের খবর থেকে<br /><em>দিনের কাজ।</em></> : <>From your field<br /><em>to your daily plan.</em></>}</h3>
            <p className="section-intro">{bn ? "একটি ছবি দিয়ে শুরু করুন। জমির তথ্য, করণীয় আর আগের কাজ—একই জায়গায় রাখুন।" : "Begin with a photo. Keep field details, next steps, and past work together."}</p>
            <ol className="workflow-steps">
              {steps.map(([Icon, title], index) => <li key={title}>
                <span className="step-icon"><Icon size={21} /></span>
                <span className="step-index">{bn ? ["১", "২", "৩"][index] : index + 1}</span>
                <span className="step-copy"><strong>{title}</strong></span>
              </li>)}
            </ol>
            <Link className="text-link" to="/farmer#photos" onClick={() => setDemo(true)}>{bn ? "ছবি দিয়ে শুরু করুন" : "Start with a photo"}<ArrowRight size={18} /></Link>
          </div>
        </section>

        <section className="farmer-tools" id="farmer" aria-label={bn ? "কৃষকের সহায়তা" : "Farmer tools"}>
          <Link className="tool-card" to="/farmer#today" onClick={() => setDemo(true)}>
            <img src="/alusathi-home-today-work.webp" alt="" loading="lazy" />
            <span className="tool-copy"><small>{bn ? "প্রতিদিনের মাঠের কাজ" : "Your field, day by day"}</small><strong>{bn ? "আজকের কাজ" : "Today's tasks"}</strong><span>{bn ? "জমির বয়স অনুযায়ী দরকারি কাজ মনে রাখুন।" : "Remember useful tasks based on your field's age."}</span></span>
            <span className="tool-arrow"><ArrowRight /></span>
          </Link>
          <Link className="tool-card" to="/farmer#diary" onClick={() => setDemo(true)}>
            <img src="/alusathi-home-field-record.webp" alt="" loading="lazy" />
            <span className="tool-copy"><small>{bn ? "ছবি ও নোট" : "Photos and notes"}</small><strong>{bn ? "জমির খাতা" : "Field Khata"}</strong><span>{bn ? "ছবি, কাজ আর জমির নোট এক জায়গায় রাখুন।" : "Keep photos, tasks, and observations together."}</span></span>
            <span className="tool-arrow"><ArrowRight /></span>
          </Link>
        </section>

        </section>
        <section className="home-audience home-audience-buyer" aria-labelledby="buyer-section-title">
          <header className="home-audience-heading">
            <h2 id="buyer-section-title"><UsersRound size={24} aria-hidden="true" />{bn ? "ক্রেতার জন্য" : "For buyers"}</h2>
            <p>{bn ? "আলু দেখুন, তুলনা করুন, কৃষকের সঙ্গে কথা বলুন।" : "Discover potatoes. Compare lots. Talk to the farmer."}</p>
          </header>
        <section className="business-section" id="business" aria-labelledby="business-title">
          <div className="business-copy">
            <h3 id="business-title">{bn ? <>আলু কৃষকের।<br /><em>যোগাযোগ সরাসরি।</em></> : <>The Farmer's potatoes.<br /><em>Contact them directly.</em></>}</h3>
            <p className="section-intro">{bn ? "কৃষক তাঁর আলু দেখান। আপনি তথ্য মিলিয়ে পছন্দ করুন, তারপর কথা বলুন।" : "Farmers show their potatoes. Check the details and choose what you need. Then contact the Farmer."}</p>
            <ol className="workflow-steps buyer-steps">
              {buyerSteps.map(([Icon, title, detail], index) => <li key={title}>
                <span className="step-icon"><Icon size={21} /></span>
                <span className="step-index">{bn ? ["১", "২", "৩"][index] : index + 1}</span>
                <span className="step-copy"><strong>{title}</strong><small>{detail}</small></span>
              </li>)}
            </ol>
            <a className="button-primary business-cta" href={buyerPath} onClick={enterBuyerPage}>{bn ? "আলুর লট দেখুন" : "Browse potato lots"}<ArrowRight size={19} /></a>
          </div>
          <div className="business-art-wrap">
            <img src="/alusathi-home-market.webp" alt={bn ? "আলুর বাজারে কৃষক ও ক্রেতা কথা বলছেন" : "A farmer and buyer talking at a potato market"} loading="lazy" />
            <span className="trade-stamp"><UsersRound size={18} />{bn ? "পরিচয় থেকে সম্পর্ক" : "From introductions to relationships"}</span>
          </div>
        </section>
          <p className="home-connection-note"><UsersRound size={19} aria-hidden="true" /><span>{bn ? "আলুসাথীর বাজার পরিচয় ও যোগাযোগের সেতু। কেনাবেচা ও টাকা লেনদেন কৃষক–ক্রেতা নিজেদের মধ্যে করেন, আলুসাথীর মাধ্যমে নয়।" : "AluSathi helps Farmers and Buyers contact each other. They arrange sales and payments directly, outside AluSathi."}</span></p>
        </section>
      </main>

      <footer className="public-footer">
        <a href="/" className="footer-brand"><span className="brand-mark"><Leaf size={19} /></span><strong>আলুসাথী</strong></a>
        <p>{bn ? "সহজ তথ্য, সিদ্ধান্ত আপনার।" : "Clear information. Your decision."}</p>
      </footer>
    </div>
  );
}
