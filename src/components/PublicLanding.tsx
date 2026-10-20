import {
  ArrowRight,
  Camera,
  Check,
  ClipboardCheck,
  Globe2,
  Leaf,
  Scale,
  Sprout,
  Truck,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDemo } from "@/contexts/DemoContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/public-landing.css";

const buyerPath = "/marketplace/buyer.html";

export default function PublicLanding() {
  const { language, setLanguage } = useLanguage();
  const { setDemo } = useDemo();
  const navigate = useNavigate();
  const bn = language === "bn";

  function enterFarmerPage() {
    setDemo(true);
    navigate("/farmer");
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
        [Camera, "পাতার ছবি দিন", "পরিষ্কার ছবি তুলুন"],
        [ClipboardCheck, "সহজ প্রশ্নের উত্তর", "ক্ষেতের অবস্থা জানান"],
        [Sprout, "করণীয় দেখুন", "আজকের কাজ বুঝে নিন"],
      ] as const
    : [
        [Camera, "Take a leaf photo", "Capture it clearly"],
        [ClipboardCheck, "Answer a few questions", "Share field conditions"],
        [Sprout, "See what to do", "Plan today’s work"],
      ] as const;

  return (
    <div className={`public-landing ${bn ? "font-bangla" : ""}`}>
      <a href="#main-content" className="skip-link">{bn ? "মূল অংশে যান" : "Skip to content"}</a>
      <header className="public-header">
        <a href="/" className="public-brand" aria-label={bn ? "আলুসাথীর মূল পাতা" : "AluSathi home"}>
          <span className="brand-mark"><Leaf size={22} /></span>
          <span><strong>আলুসাথী</strong><small>{bn ? "আলু চাষ থেকে বিক্রি—পাশে" : "From field to market"}</small></span>
        </a>
        <nav className="public-nav" aria-label={bn ? "মূল নেভিগেশন" : "Main navigation"}>
          <a href="#farmer">{bn ? "কৃষকের জন্য" : "For farmers"}</a>
          <a href="#business">{bn ? "ব্যবসায়ীর জন্য" : "For businesses"}</a>
          <a href="#how-it-works">{bn ? "যেভাবে কাজ করে" : "How it works"}</a>
          <Link to="/life-cycle">{bn ? "আলুর জীবনচক্র" : "Potato life cycle"}</Link>
        </nav>
        <div className="public-header-actions">
          <button className="public-language" onClick={() => setLanguage(bn ? "en" : "bn")} aria-label={bn ? "ইংরেজি ভাষা দেখুন" : "Show Bangla"}>
            <Globe2 size={18} />{bn ? "EN" : "বাংলা"}
          </button>
          <a className="header-start" href="#roles">{bn ? "শুরু করুন" : "Get started"}<ArrowRight size={17} /></a>
        </div>
      </header>

      <main id="main-content">
        <section className="public-hero" aria-labelledby="home-title">
          <img className="hero-art" src="/alusathi-home-market.webp" alt={bn ? "আলুর ক্ষেতের পাশে কৃষক ও ব্যবসায়ীর কথা হচ্ছে" : "A farmer and produce buyer talk beside a potato field"} />
          <div className="hero-wash" aria-hidden="true" />
          <svg className="hero-birds" viewBox="0 0 170 55" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4">
              <path d="M5 27q14-18 28 0 14-18 28 0" />
              <path d="M67 11q11-14 22 0 11-14 22 0" />
              <path d="M119 32q10-13 20 0 10-13 20 0" />
            </g>
          </svg>
          <svg className="hero-sprig" viewBox="0 0 150 130" aria-hidden="true">
            <path d="M12 123C40 87 74 55 126 12" fill="none" stroke="#315e37" strokeWidth="5" strokeLinecap="round" />
            <g fill="#4c8b45" stroke="#174b35" strokeWidth="2.5">
              <path d="M35 92C10 90 4 71 8 57c22 0 38 11 37 30Z" />
              <path d="M53 72c-1-25 16-38 32-39 5 23-6 39-28 44Z" />
              <path d="M75 52C54 39 55 21 64 9c21 9 29 25 17 43Z" />
              <path d="M91 41c5-22 23-30 38-26-1 21-14 34-35 34Z" />
              <path d="M26 107c-17-3-25-17-23-30 17 1 28 10 29 27Z" />
            </g>
          </svg>
          <div className="hero-content">
            <p className="home-eyebrow"><span />{bn ? "জমি থেকে বাজার" : "FIELD TO MARKET"}</p>
            <h1 id="home-title">{bn ? <>আলু চাষ থেকে বিক্রি—<em>পাশে আলুসাথী</em></> : <>From potato field to market, <em>AluSathi is by your side.</em></>}</h1>
            <p className="hero-description">{bn ? "জমির যত্ন নিন, ফসলের তথ্য রাখুন, আর বিক্রির প্রস্তুতি বুঝে নিন—সহজ তিন ধাপে।" : "Care for your field, keep useful crop records, and prepare to sell—in three simple steps."}</p>
            <div className="hero-actions" id="roles">
              <button className="button-primary hero-role-card" onClick={enterFarmerPage} aria-label={bn ? "আমি কৃষক" : "I’m a farmer"} aria-describedby="farmer-role-help">
                <span className="role-card-icon"><Sprout size={23} /></span>
                <span className="role-card-copy"><strong>{bn ? "আমি কৃষক" : "I’m a farmer"}</strong><small id="farmer-role-help">{bn ? "ছবি, আজকের কাজ ও জমির খাতা" : "Photos, today’s work and field diary"}</small></span>
                <ArrowRight size={19} />
              </button>
              <a className="button-secondary hero-role-card" href={buyerPath} onClick={enterBuyerPage} aria-label={bn ? "আমি ব্যবসায়ী" : "I’m a buyer"} aria-describedby="buyer-role-help">
                <span className="role-card-icon"><UsersRound size={23} /></span>
                <span className="role-card-copy"><strong>{bn ? "আমি ব্যবসায়ী" : "I’m a buyer"}</strong><small id="buyer-role-help">{bn ? "আলুর লট, ক্রেতা ও পরিবহন" : "Potato lots, buyers and transport"}</small></span>
                <ArrowRight size={19} />
              </a>
            </div>
          </div>
        </section>

        <section className="journey-band" aria-label={bn ? "আলুর যাত্রা" : "The potato journey"}>
          <div className="journey-step"><span className="journey-illustration"><Sprout /></span><span>{bn ? "জমির যত্ন" : "Care for the field"}</span></div>
          <span className="journey-line" aria-hidden="true"><ArrowRight /></span>
          <div className="journey-step"><span className="journey-illustration amber"><Scale /></span><span>{bn ? "বিক্রির প্রস্তুতি" : "Prepare to sell"}</span></div>
          <span className="journey-line" aria-hidden="true"><ArrowRight /></span>
          <div className="journey-step"><span className="journey-illustration forest"><UsersRound /></span><span>{bn ? "ক্রেতার সাথে যোগাযোগ" : "Meet buyers"}</span></div>
        </section>

        <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-title">
          <div className="workflow-art-wrap">
            <img src="/alusathi-home-photo-guide.webp" alt={bn ? "আলুর পাতার পরিষ্কার ছবি তুলছেন একজন নারী কৃষক" : "A woman farmer taking a clear photo of a potato leaf"} loading="lazy" />
            <span className="art-stamp"><Camera size={19} />{bn ? "ছবি দিয়ে শুরু" : "Start with a photo"}</span>
          </div>
          <div className="workflow-copy">
            <p className="section-kicker">{bn ? "সহজভাবে ব্যবহার করুন" : "A SIMPLE WAY TO BEGIN"}</p>
            <h2 id="workflow-title">{bn ? <>জমির যত্ন, <em>সহজ তিন ধাপে</em></> : <>Field care, <em>in three simple steps.</em></>}</h2>
            <p className="section-intro">{bn ? "যা দেখছেন জানান—তারপর আপনার জমির জন্য পরের করণীয় দেখুন।" : "Show what you see, then find the next useful step for your field."}</p>
            <ol className="workflow-steps">
              {steps.map(([Icon, title, detail], index) => <li key={title}>
                <span className="step-icon"><Icon size={21} /></span>
                <span className="step-index">{bn ? ["১", "২", "৩"][index] : index + 1}</span>
                <span className="step-copy"><strong>{title}</strong><small>{detail}</small></span>
              </li>)}
            </ol>
            <button className="text-link" onClick={enterFarmerPage}>{bn ? "ছবি দিয়ে শুরু করুন" : "Start with a photo"}<ArrowRight size={18} /></button>
          </div>
        </section>

        <section className="farmer-tools" id="farmer" aria-label={bn ? "কৃষকের সহায়তা" : "Farmer tools"}>
          <Link className="tool-card" to="/farmer" onClick={() => setDemo(true)}>
            <img src="/alusathi-home-today-work.webp" alt="" loading="lazy" />
            <span className="tool-copy"><small>{bn ? "প্রতিদিনের মাঠের কাজ" : "YOUR FIELD, DAY BY DAY"}</small><strong>{bn ? "আজকের কাজ" : "Today’s work"}</strong><span>{bn ? "জমির বয়স অনুযায়ী দরকারি কাজ মনে রাখুন।" : "Keep track of useful work for your field."}</span></span>
            <span className="tool-arrow"><ArrowRight /></span>
          </Link>
          <Link className="tool-card" to="/farmer" onClick={() => setDemo(true)}>
            <img src="/alusathi-home-field-record.webp" alt="" loading="lazy" />
            <span className="tool-copy"><small>{bn ? "ছবি ও পর্যবেক্ষণ" : "PHOTOS AND NOTES"}</small><strong>{bn ? "জমির খাতা" : "Field diary"}</strong><span>{bn ? "ছবি, কাজ ও পর্যবেক্ষণ এক জায়গায় রাখুন।" : "Keep photos, tasks, and observations together."}</span></span>
            <span className="tool-arrow"><ArrowRight /></span>
          </Link>
        </section>

        <section className="business-section" id="business" aria-labelledby="business-title">
          <div className="business-copy">
            <p className="section-kicker">{bn ? "ফসল তোলার পর" : "AFTER THE HARVEST"}</p>
            <h2 id="business-title">{bn ? <>বিক্রির আগে, <em>হিসাবটা বুঝে নিন</em></> : <>Before the sale, <em>see the full picture.</em></>}</h2>
            <p className="section-intro">{bn ? "ওজন, পরিবহন আর সম্ভাব্য খরচ একসাথে দেখে ব্যবসায়ীর বাজারে আপনার লটের তথ্য দিন।" : "Review weight, transport, and likely costs together, then share your lot with buyers in the marketplace."}</p>
            <div className="trade-points">
              <span><Check size={16} />{bn ? "ওজন ও লটের তথ্য" : "Weight and lot details"}</span>
              <span><Check size={16} />{bn ? "পরিবহন খরচের হিসাব" : "Transport cost estimate"}</span>
              <span><Check size={16} />{bn ? "ব্যবসায়ীর বাজার" : "Business marketplace"}</span>
            </div>
            <a className="button-primary business-cta" href={buyerPath} onClick={enterBuyerPage}>{bn ? "ব্যবসায়ীর বাজার দেখুন" : "Explore the marketplace"}<ArrowRight size={19} /></a>
            <small className="sample-note">{bn ? "নমুনা লট দিয়ে বাজারের অভিজ্ঞতা দেখুন" : "Explore the marketplace with sample lots"}</small>
          </div>
          <div className="business-art-wrap">
            <img src="/alusathi-home-selling.webp" alt={bn ? "ওজন করা বস্তা সবুজ ট্রাকে তোলার প্রস্তুতি চলছে" : "A farmer weighs tied potato sacks beside a truck on a village road"} loading="lazy" />
            <span className="trade-stamp"><Truck size={18} />{bn ? "মাঠ থেকে বাজারে" : "From field to market"}</span>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <a href="/" className="footer-brand"><span className="brand-mark"><Leaf size={19} /></span><strong>আলুসাথী</strong></a>
        <p>{bn ? "সহজ তথ্য, সিদ্ধান্ত আপনার।" : "Clear information. Your decision."}</p>
      </footer>
    </div>
  );
}
