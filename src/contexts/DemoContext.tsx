import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Leaf, Truck } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const DemoContext = createContext({ demo: false, setDemo: (_value: boolean) => {} });
export function DemoProvider({ children }: { children: ReactNode }) {
  const [demo, update] = useState(() => {
    try { return sessionStorage.getItem('alusathi-demo') === 'true' || localStorage.getItem('alusathi-demo') === 'true'; } catch { return false; }
  });
  function setDemo(value: boolean) {
    try { for (const store of [sessionStorage, localStorage]) { store.setItem('alusathi-demo', String(value)); store.setItem('alusathi-role', value ? 'farmer' : ''); } } catch { /* In-memory session still works. */ }
    update(value);
  }
  return <DemoContext.Provider value={{ demo, setDemo }}>{children}</DemoContext.Provider>;
}
export const useDemo = () => useContext(DemoContext);

export function DemoEntry() {
  const { setDemo } = useDemo();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const bn = language === 'bn';
  return <main className={`account-page ${bn ? 'font-bangla' : ''}`}><section className="account-card">
    <Link to="/" className="text-button"><ArrowLeft size={18} />{bn ? 'মূল পাতায় ফিরুন' : 'Back to home'}</Link>
    <span className="brand-mark"><Leaf /></span>
    <p className="section-kicker">{bn ? 'আলুসাথী · প্রবেশ' : 'ALUSATHI · SIGN IN'}</p>
    <h1>{bn ? 'কোন পরিচয়ে ঢুকবেন?' : 'Choose who to sign in as'}</h1>
    <p>{bn ? 'কৃষক বা ব্যবসায়ী পরিচয় বেছে নিন। পাসওয়ার্ড লাগবে না।' : 'Choose farmer or businessman. No password needed.'}</p>
    <button className="main-button" onClick={() => { setDemo(true); navigate('/farmer', { replace: true }); }}><Leaf size={22} />{bn ? 'কৃষক হিসেবে সাইন ইন করুন' : 'Sign in as farmer'}</button>
    <a className="main-button" href="/marketplace/buyer.html" onClick={() => { try { for (const store of [sessionStorage, localStorage]) { store.setItem('alusathi-role', 'buyer'); store.setItem('alusathi-demo', 'false'); } } catch { /* Session remains usable in this tab. */ } }}><Truck size={22} />{bn ? 'ব্যবসায়ী হিসেবে সাইন ইন করুন' : 'Sign in as businessman'}</a>
  </section></main>;
}
