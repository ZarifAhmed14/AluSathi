import { ExternalLink, MapPin, Phone, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Provider = { kind: string; name: string; nameBn: string; area: string; areaBn: string; phone: string; source: string; verification: string; verificationBn: string };

export default function ColdStorage() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const text = (bangla: string, english: string) => bn ? bangla : english;
  const [providers, setProviders] = useState<Provider[] | null>(null);
  useEffect(() => {
    let active = true;
    const searchPause = new Promise(resolve => window.setTimeout(resolve, 900));
    fetch("/marketplace/providers.json").then(response => {
      if (!response.ok) throw new Error("Contacts unavailable");
      return response.json();
    }).then(async (items: Provider[]) => {
      await searchPause;
      if (active) setProviders(items.filter(item => item.kind === "storage"));
    }).catch(async () => {
      await searchPause;
      if (active) setProviders([]);
    });
    return () => { active = false; };
  }, []);
  return <section id="cold-storage" className="app-shell scroll-mt-24 py-12">
    <div className="section-heading"><div><p className="section-kicker"><Snowflake size={16} />{text("হিমাগার", "Cold storage")}</p><h2>{text("হিমাগারে সরাসরি ফোন করুন", "Call a cold store directly")}</h2><p>{text("কাছের জায়গা বেছে ফোন করুন। আলু কত আছে আর কতদিন রাখতে চান—এই দুটো কথা বললেই শুরু হবে।", "Pick a nearby provider and call. Say how much potato you have and how long you need to store it.")}</p></div></div>
    {providers === null && <div className="storage-searching" role="status" aria-live="polite"><span className="storage-search-spinner" aria-hidden="true" /><div><strong>{text("হিমাগারের যোগাযোগ খুঁজছি…", "Searching storage contacts…")}</strong><span>{text("তালিকার তথ্য মিলিয়ে নিচ্ছি", "Checking the available contact list")}</span></div><div className="storage-search-track" aria-hidden="true"><i /></div></div>}
    <div className="grid gap-4 md:grid-cols-3">
      {providers?.map(provider => <article key={provider.name} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">{bn ? provider.nameBn : provider.name}</h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={16} />{bn ? provider.areaBn : provider.area}</p>
        <p className="mt-3 text-sm text-muted-foreground">{bn ? provider.verificationBn : provider.verification}</p>
        <a className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground" href={`tel:${provider.phone}`}><Phone size={17} />{text("ফোন করুন", "Call now")}</a>
        <p className="mt-3 text-center font-semibold text-primary">{provider.phone}</p>
        <a className="mt-3 inline-flex w-full items-center justify-center gap-1 text-sm text-muted-foreground" href={provider.source} target="_blank" rel="noopener noreferrer">{text("তথ্যসূত্র দেখুন", "View source")}<ExternalLink size={14} /></a>
      </article>)}
    </div>
    {providers?.length === 0 && <p role="status">{text("যোগাযোগের তালিকা খোলা যায়নি। ইন্টারনেট এলে আবার চেষ্টা করুন।", "Contacts could not load. Try again when connected.")}</p>}
  </section>;
}
