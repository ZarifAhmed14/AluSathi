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
    fetch("/marketplace/providers.json").then(response => {
      if (!response.ok) throw new Error("Contacts unavailable");
      return response.json();
    }).then((items: Provider[]) => setProviders(items.filter(item => item.kind === "storage"))).catch(() => setProviders([]));
  }, []);
  return <section id="cold-storage" className="app-shell scroll-mt-24 py-12">
    <div className="section-heading"><div><p className="section-kicker"><Snowflake size={16} />{text("হিমাগার", "Cold storage")}</p><h2>{text("হিমাগারে সরাসরি ফোন করুন", "Call a cold store directly")}</h2><p>{text("কাছের জায়গা বেছে ফোন করুন। আলু কত আছে আর কতদিন রাখতে চান—এই দুটো কথা বললেই শুরু হবে।", "Pick a nearby provider and call. Say how much potato you have and how long you need to store it.")}</p></div></div>
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
    <div className="mt-6 rounded-2xl bg-muted p-5 text-sm leading-7 text-muted-foreground"><strong className="text-foreground">{text("ফোনে আগে জেনে নিন", "Ask before you pay")}</strong><ul className="mt-2 list-disc space-y-1 pl-5"><li>{text("জায়গা আছে কি না এবং কতদিন রাখতে পারবেন", "Whether space is available and for how long")}</li><li>{text("ভাড়া, ওঠানো-নামানো ও অন্য সব খরচ মিলিয়ে মোট কত", "The full price including handling and other charges")}</li><li>{text("রসিদ, ওজন কমা বা আলু নষ্ট হলে নিয়ম কী", "Receipt terms and what happens if weight drops or potatoes spoil")}</li></ul><p className="mt-3">{text("এই নম্বরগুলো প্রকাশিত ব্যবসায়িক বা সরকারি তালিকা থেকে নেওয়া। আলুসাথী জায়গা বা ভাড়া পরীক্ষা করেনি—ফোনে নিশ্চিত হয়ে তারপর টাকা দিন।", "These contacts come from published business or government listings. AluSathi has not verified live space or pricing; confirm by phone before paying.")}</p></div>
  </section>;
}
