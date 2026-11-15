import { ExternalLink, Loader2, MapPin, Phone, ReceiptText, Search, Snowflake, Wallet } from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DISTRICT_NAMES } from "@/lib/district-names";
import { farmerDistrict } from "@/lib/farmer-profile";

type Provider = { kind: string; name: string; nameBn: string; area: string; areaBn: string; phone: string; source: string };
function validProvider(item: unknown): item is Provider {
  if (!item || typeof item !== "object") return false;
  const p = item as Record<string, unknown>;
  return p.kind === "storage" && ["name", "nameBn", "area", "areaBn"].every(key => typeof p[key] === "string" && String(p[key]).length < 300) && typeof p.phone === "string" && /^\+?[0-9]{7,15}$/.test(p.phone) && typeof p.source === "string" && /^https:\/\//.test(p.source);
}
export default function ColdStorage() {
  const { language } = useLanguage(); const bn = language === "bn";
  const t = (b: string, e: string) => bn ? b : e;
  const [district] = useState(farmerDistrict);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  async function search(area = district) {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(false); setProviders(null); setSearched(area);
    try {
      const response = await fetch("/marketplace/providers.json", { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Unavailable");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid contacts");
      const { districtPlaces } = await import(/* @vite-ignore */ new URL("/marketplace/districts.mjs", window.location.origin).href) as { districtPlaces: Record<string, {lat:number;lon:number}> };
      const origin = districtPlaces[area];
      const distance = (p: Provider) => {
        const end = districtPlaces[p.area.split(",").at(-1)?.trim() || ""];
        if (!origin || !end) return Infinity;
        const rad = Math.PI / 180;
        const a = Math.sin((end.lat-origin.lat)*rad/2)**2 + Math.cos(origin.lat*rad)*Math.cos(end.lat*rad)*Math.sin((end.lon-origin.lon)*rad/2)**2;
        return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1,a)));
      };
      setProviders(data.filter(validProvider).sort((a,b) => distance(a)-distance(b) || a.name.localeCompare(b.name)));
    } catch { setError(true); }
    finally { busy.current = false; setLoading(false); }
  }
  return <section id="cold-storage" className="storage-search" aria-labelledby="storage-title">
    <header><span className="storage-symbol"><Snowflake size={27}/></span><div><h2 id="storage-title">{t("হিমাগারে রাখতে চান?", "Want to use cold storage?")}</h2><p>{t("আপনার এলাকা:", "Your area:")} {bn ? DISTRICT_NAMES[district] || district : district}</p></div></header>
    <p className="storage-directory-note">{t("এটি যোগাযোগের তালিকা। আপনার কাছের সব হিমাগার এখানে নাও থাকতে পারে।", "This is a contact directory. It may not include stores near you.")}</p>
    <form className="storage-search-form" onSubmit={e => { e.preventDefault(); void search(); }}>
      <button type="submit" disabled={loading}>{loading ? <Loader2 className="storage-spinner" size={19}/> : <Search size={19}/>} {loading ? t("তালিকায় খোঁজা হচ্ছে…", "Searching the directory…") : t("হিমাগার খুঁজুন", "Find cold storage")}</button>
    </form>
    <div aria-live="polite" aria-busy={loading}>
      {error && <p className="storage-empty" role="alert">{t("তালিকা খোলা যায়নি। আবার ‘হিমাগার খুঁজুন’ চাপুন।", "Could not load the list. Press Find cold storage to try again.")}</p>}
      {providers && <div className="storage-results-layout">
        <div><p className="storage-result-label">{t("যেখান থেকে খোঁজা হচ্ছে:", "Searching from:")} {bn ? DISTRICT_NAMES[searched] || searched : searched} · {providers.length.toLocaleString(bn ? "bn-BD" : "en-GB")} {t("টি যোগাযোগ", "contacts")}</p>
          <p className="storage-result-label">{t("তালিকার যোগাযোগগুলো জেলার আনুমানিক কাছাকাছি অনুযায়ী সাজানো। জমির সঠিক দূরত্ব নয়; আরও কাছের হিমাগার থাকতে পারে।", "Contacts are listed by how near their districts are. This is not the exact distance from your field. Some nearer stores may be missing.")}</p>
          {providers.length>0 && !providers.some(p=>p.area.split(",").at(-1)?.trim()===searched) && <p className="storage-no-local">{t("আপনার জেলার কোনো যোগাযোগ এই তালিকায় নেই। নিচেরগুলো অন্য জেলার—কাছের হিমাগার বলে দেখানো হচ্ছে না।", "No contacts for your district are in this list. The contacts below are in other districts. They may not be nearby.")}</p>}
          {!providers.length && <div className="storage-empty"><MapPin size={25}/><h3>{t("তালিকায় কোনো যোগাযোগ নেই", "No contacts in the directory")}</h3><p>{t("পরে আবার খুঁজে দেখুন।", "Please try again later.")}</p></div>}
          {providers.map(p => <article key={p.name} className="storage-contact"><span className="storage-provider-label">{p.area.split(",").at(-1)?.trim()===searched?t("আপনার জেলার যোগাযোগ", "In your district"):t("অন্য জেলার যোগাযোগ", "In another district")}</span><h3>{bn ? p.nameBn : p.name}</h3><p className="storage-location"><MapPin size={18}/>{bn ? p.areaBn : p.area}</p><p>{t("জায়গা আছে কি না ও মোট ভাড়া ফোনে জেনে নিন।", "Call to confirm space and the full price.")}</p><a className="storage-call" href={`tel:${p.phone}`}><Phone size={21}/>{t("ফোন করুন", "Call now")}</a><p className="storage-number">{p.phone}</p><small>{t("নম্বরটি আলাদাভাবে যাচাই করা হয়নি।", "This number has not been independently checked.")}</small><details><summary>{t("আরও তথ্য", "More information")}</summary><p>{t("প্রকাশিত তালিকা থেকে নেওয়া। আলুসাথী জায়গা বা ভাড়া নিশ্চিত করেনি।", "From a published directory. AluSathi has not confirmed space or charges.")}</p><a href={p.source} target="_blank" rel="noopener noreferrer">{t("নম্বরের উৎস দেখুন", "View contact source")} <ExternalLink size={15}/></a></details></article>)}
        </div>
        <aside className="storage-call-guide" aria-labelledby="call-guide-title"><h3 id="call-guide-title">{t("ফোনে এই ৩টি কথা জেনে নিন", "Ask these three questions")}</h3><ol><li><Snowflake size={22}/><div><strong>{t("জায়গা আছে?", "Is space available?")}</strong><p>{t("কত আলু, কতদিন রাখতে চান বলুন।", "Say how much potato and for how long.")}</p></div></li><li><Wallet size={22}/><div><strong>{t("সব মিলিয়ে কত টাকা?", "What is the total cost?")}</strong><p>{t("ভাড়া ও ওঠানো-নামানোর খরচ জেনে নিন।", "Ask about storage and handling charges.")}</p></div></li><li><ReceiptText size={22}/><div><strong>{t("রসিদ দেবেন?", "Will I get a receipt?")}</strong><p>{t("ওজন ও জমা দেওয়ার তারিখ লিখিয়ে নিন।", "Ask them to write down the weight and storage date.")}</p></div></li></ol><details><summary>{t("আর কী জেনে নেবেন?", "What else should I ask?")}</summary><p>{t("ওজন কমলে বা আলু নষ্ট হলে কী নিয়ম, আগে জেনে নিন। কথা ও খরচ নিশ্চিত করে তারপর টাকা দিন।", "Ask what happens if weight drops or potatoes spoil. Confirm the terms and charges before paying.")}</p></details></aside>
      </div>}
    </div>
  </section>;
}
