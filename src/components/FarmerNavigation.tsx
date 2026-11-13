import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Camera, History, Leaf, Menu, Store, Sun, UserRound, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { photoSource, readObject, text } from "@/lib/farmer-market";
import { PROFILE_CHANGED } from "@/lib/farmer-profile";

function farmerIdentity() {
  const profile = readObject("alusathi-farmer-profile-v1");
  return { name: text(profile.name, 100), photo: photoSource(profile.photo) };
}

export default function FarmerNavigation({ active = "today" }: { active?: string }) {
  const { language } = useLanguage();
  const { user, signOut, configured } = useAuth();
  const { setDemo } = useDemo();
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [identity, setIdentity] = useState(farmerIdentity);
  const [failedPhoto, setFailedPhoto] = useState("");
  useEffect(() => {
    const refresh = () => setIdentity(farmerIdentity());
    window.addEventListener(PROFILE_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(PROFILE_CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  useEffect(() => {
    if (!profileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const drawer = document.querySelector<HTMLElement>(".farmer-profile-drawer");
    const controls = () => Array.from(drawer?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') || []);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    controls()[0]?.focus();
    const keepFocus = (event: FocusEvent) => { if (!drawer?.contains(event.target as Node)) controls()[0]?.focus(); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setProfileOpen(false); }
      if (event.key !== "Tab") return;
      const items = controls(), first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard); document.addEventListener("focusin", keepFocus);
    return () => { document.removeEventListener("keydown", keyboard); document.removeEventListener("focusin", keepFocus); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [profileOpen]);
  const bn = language === "bn";
  const tabs = [
    ["photos", "/farmer#photos", bn ? "ছবি" : "Photos", Camera],
    ["today", "/farmer", bn ? "আজকের কাজ" : "Today", Sun],
    ["season", "/farmer#season", bn ? "মৌসুমের অগ্রগতি" : "Season progress", CalendarDays],
    ["diary", "/farmer#diary", bn ? "খাতা" : "Notebook", History],
    ["selling", "/selling-preparation", bn ? "বিক্রির আগে" : "Before selling", Store],
    ["market", "/farmer#market", bn ? "বাজারে দিন" : "Showcase", Package],
  ] as const;
  const links = tabs.map(([id, href, label, Icon]) => <Link key={id} to={href} aria-current={active === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></Link>);
  const mobileLinks = tabs.filter(([id])=>id!=="market").map(([id,href,label,Icon])=><Link key={id} to={href} aria-current={active===id?"page":undefined}><Icon size={19}/><span>{label}</span></Link>);
  async function leave() {
    try { if (user) await signOut(); setDemo(false); window.location.replace("/"); }
    catch { setError(bn ? "বের হওয়া যায়নি। আবার চেষ্টা করুন।" : "Could not sign out. Please retry."); }
  }
  return <>
    <header className="site-header farmer-header"><div className="app-shell farmer-header-inner">
      <Link to="/farmer" className="site-brand" onClick={() => window.scrollTo(0, 0)}><span className="brand-mark"><Leaf size={22} /></span><strong>আলুসাথী</strong></Link>
      <nav className="farmer-tabs" aria-label={bn ? "মূল মেনু" : "Primary navigation"}>{links}</nav>
      <div className="farmer-header-actions">
      <button type="button" className="farmer-profile-trigger" aria-label={bn ? "প্রোফাইল খুলুন" : "Open profile"} onClick={() => { setIdentity(farmerIdentity()); setProfileOpen(true); }}><UserRound size={18} /><span>{bn ? "প্রোফাইল" : "Profile"}</span></button>
      <details className="farmer-more" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary><Menu size={18} />{bn ? "আরও" : "More"}</summary><div onClick={event => { if ((event.target as Element).closest("a,button")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
        <Link to="/farmer#profile">{bn ? "প্রোফাইল" : "Profile"}</Link>
        {!user && configured && <Link to="/account">{bn ? "অনলাইন খাতায় লগইন" : "Account login"}</Link>}
        <button onClick={leave}>{user ? (bn ? "বের হন" : "Sign out") : (bn ? "মূল পাতায় ফিরুন" : "Return to main page")}</button>
      </div></details>
      </div>
    </div>{error && <p role="alert" className="app-shell">{error}</p>}</header>
    <nav className="farmer-bottom-tabs" aria-label={bn ? "ফোনের মূল মেনু" : "Mobile navigation"}>{mobileLinks}<details className="farmer-mobile-more" onKeyDown={event=>{if(event.key==="Escape"){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary className={active==="market" ? "is-current" : ""}><Menu size={19}/><span>{bn ? "আরও" : "More"}</span></summary><div onClick={event=>{if((event.target as Element).closest('a'))event.currentTarget.closest('details')?.removeAttribute('open')}}><Link to="/farmer#market" aria-current={active==="market"?"page":undefined}><Package size={19}/>{bn ? "বাজারে দিন" : "Showcase potatoes"}</Link><Link to="/farmer#profile"><UserRound size={19}/>{bn ? "প্রোফাইল" : "Profile"}</Link></div></details></nav>
    {profileOpen && <div className="farmer-profile-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setProfileOpen(false); }}><aside className="farmer-profile-drawer" role="dialog" aria-modal="true" aria-label={bn ? "আমার প্রোফাইল" : "My profile"}><button className="farmer-profile-close" type="button" aria-label={bn ? "বন্ধ করুন" : "Close"} onClick={() => setProfileOpen(false)}>×</button><p className="section-kicker">{bn ? "আমার প্রোফাইল" : "MY PROFILE"}</p><div className="farmer-drawer-avatar">{identity.photo && identity.photo !== failedPhoto ? <img src={identity.photo} alt={bn ? "সেভ করা প্রোফাইল ছবি" : "Saved profile picture"} onError={() => setFailedPhoto(identity.photo)} /> : <UserRound size={38} aria-hidden="true" />}</div><h2>{identity.name || (bn ? "কৃষক" : "Farmer")}</h2><p>{bn ? "কৃষক" : "Farmer"}</p><Link className="secondary-main" to="/farmer#profile" onClick={() => setProfileOpen(false)}>{bn ? "প্রোফাইল দেখুন" : "View profile"}</Link><Link className="secondary-main" to="/farmer#my-listings" onClick={() => setProfileOpen(false)}>{bn ? "আমার তালিকা" : "My listings"}</Link></aside></div>}
  </>;
}
