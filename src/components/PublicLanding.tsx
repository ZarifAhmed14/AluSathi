import { ArrowRight, Globe2, Leaf, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDemo } from "@/contexts/DemoContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/public-landing.css";

export default function PublicLanding() {
  const { language, setLanguage } = useLanguage();
  const { setDemo } = useDemo();
  const navigate = useNavigate();
  const bn = language === "bn";

  function enterFarmerPage() {
    setDemo(true);
    navigate("/farmer");
  }

  function rememberBuyerRole() {
    try {
      sessionStorage.setItem("alusathi-role", "buyer");
      sessionStorage.setItem("alusathi-demo", "false");
    } catch {
      // The buyer page remains available when browser storage is blocked.
    }
  }

  return <div className={`public-landing ${bn ? "font-bangla" : ""}`}>
    <a href="#roles" className="skip-link">{bn ? "কাজ বেছে নিন" : "Choose your page"}</a>
    <header className="public-header">
      <a href="/" className="public-brand" aria-label={bn ? "আলুসাথীর মূল পাতা" : "AluSathi home"}>
        <span className="brand-mark"><Leaf size={22} /></span>
        <span><strong>আলুসাথী</strong><small>{bn ? "আলু চাষে পাশে, সবসময়" : "Beside potato growers"}</small></span>
      </a>
      <button className="public-language" onClick={() => setLanguage(bn ? "en" : "bn")} aria-label={bn ? "ইংরেজি ভাষা দেখুন" : "বাংলা ভাষা দেখুন"}>
        <Globe2 size={18} />{bn ? "EN" : "বাংলা"}
      </button>
    </header>

    <main>
      <section className="public-hero">
        <img src="/alusathi-potato-sorting.webp" alt={bn ? "আলু বাছাই করে ঝুড়িতে রাখছেন একজন কৃষক" : "A farmer sorting potatoes into a basket"} />
        <div className="public-hero-copy">
          <p>{bn ? "বাংলাদেশের আলু চাষ ও ব্যবসার সহজ সাথী" : "A simple companion for Bangladesh's potato community"}</p>
          <h1>{bn ? "জমি থেকে বাজার—এক জায়গায় সহজ সহায়তা" : "Simple support from field to market"}</h1>
          <span>{bn ? "কৃষকের মাঠের কাজ ও ব্যবসায়ীর কেনাবেচার প্রস্তুতির জন্য আলাদা, সহজ পাতা।" : "Separate, focused pages for farmers in the field and businesses preparing to trade."}</span>
        </div>
      </section>

      <section id="roles" className="public-roles" aria-labelledby="role-title">
        <div className="public-role-heading">
          <p>{bn ? "আপনার কাজ বেছে নিন" : "Choose your work"}</p>
          <h2 id="role-title">{bn ? "আপনি কীভাবে আলুসাথী ব্যবহার করবেন?" : "How will you use AluSathi?"}</h2>
        </div>
        <div className="public-role-grid">
          <article>
            <span className="public-role-icon"><Leaf /></span>
            <div><h3>{bn ? "আমি কৃষক" : "I am a farmer"}</h3><p>{bn ? "আজকের কাজ, পাতার ছবি, খাতা ও বিক্রির প্রস্তুতি দেখুন।" : "See today's work, leaf photos, records and selling preparation."}</p></div>
            <button onClick={enterFarmerPage}>{bn ? "কৃষকের পাতায় যান" : "Open farmer page"}<ArrowRight /></button>
          </article>
          <article>
            <span className="public-role-icon"><Store /></span>
            <div><h3>{bn ? "আমি ব্যবসায়ী" : "I am a businessman"}</h3><p>{bn ? "আলুর লট, পরিবহন ও কেনাবেচার প্রয়োজনীয় তথ্য দেখুন।" : "Review potato lots, transport and the information needed to trade."}</p></div>
            <a href="/marketplace/buyer.html" onClick={rememberBuyerRole}>{bn ? "ব্যবসায়ীর পাতায় যান" : "Open business page"}<ArrowRight /></a>
          </article>
        </div>
      </section>
    </main>

    <footer className="public-footer"><span>আলুসাথী</span><p>{bn ? "সহজ তথ্য, সিদ্ধান্ত আপনার।" : "Clear information. Your decision."}</p></footer>
  </div>;
}
