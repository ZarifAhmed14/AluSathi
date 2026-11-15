import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PackageCheck, ScanEye, Scale, Tag, Layers, ShoppingBag } from "lucide-react";
import PotatoDetailsDialog from "@/components/PotatoDetailsDialog";

const prepKey = "alusathi-selling-prep-v1";
function readChecks(): string[] {
  try { const checks=JSON.parse(localStorage.getItem(prepKey) || "{}").draft?.checks;return Array.isArray(checks)?checks.filter(c=>typeof c==="string"):[]; } catch{return [];}
}
const packing = [
  ["sort", "খারাপ আলু আলাদা করেছি", "Damaged potatoes separated"],
  ["bag", "শুকনো, বাতাস চলার বস্তা নিয়েছি", "Dry sacks that let air through are ready"],
  ["weight", "বস্তার ওজন মেপেছি", "Sacks weighed"],
  ["label", "জাত ও অবস্থা লিখে চিহ্ন দিয়েছি", "Variety and condition labelled"],
];
const visit = [
  ["example", "বিভিন্ন বস্তা থেকে দেখানোর আলু রেখেছি", "Potatoes from different sacks are ready to show"],
  ["scales", "ওজন মাপার ব্যবস্থা রেখেছি", "Weighing arrangement ready"],
];

export default function SellingPreparationTools() {
  const { language } = useLanguage(); const bn = language === "bn";
  const t = (a: string, b: string) => bn ? a : b;
  const [checks,setChecks]=useState(readChecks);
  const [checkMessage, setCheckMessage] = useState("");
  function remember(id:string) {
    const next=checks.includes(id)?checks.filter(c=>c!==id):[...checks,id];
    try {
      const saved=JSON.parse(localStorage.getItem(prepKey) || "{}");
      if (!saved || typeof saved!=="object" || Array.isArray(saved)) throw new Error("Unreadable saved checks");
      const previous=saved.draft && typeof saved.draft==="object" && !Array.isArray(saved.draft)?saved.draft:{};
      localStorage.setItem(prepKey,JSON.stringify({...saved,draft:{...previous,checks:next}}));
      setChecks(next);setCheckMessage(t("সেভ হয়েছে।", "Saved."));
    } catch {setCheckMessage(t("সেভ হয়নি। আবার চেষ্টা করুন।", "Could not save. Please try again."));}
  }
  function checklist(items: string[][], title: string, icon: React.ReactNode) {
    const symbols = { sort: ScanEye, bag: ShoppingBag, weight: Scale, label: Tag, example: Layers, scales: Scale };
    return <section className="prep-checklist"><h3>{icon}{title}<small>{new Intl.NumberFormat(bn ? "bn" : "en").format(items.filter(([id]) => checks.includes(id)).length)} / {new Intl.NumberFormat(bn ? "bn" : "en").format(items.length)}</small></h3>
      {items.map(([id, bangla, english]) => { const Icon = symbols[id as keyof typeof symbols]; return <label key={id}><input type="checkbox" checked={checks.includes(id)} onChange={() => remember(id)}/><Icon size={22} aria-hidden="true"/><span>{t(bangla, english)}</span></label>; })}
    </section>;
  }
  return <div className="selling-prep-tools">
    <div className="prep-main-column">
      <PotatoDetailsDialog />
      <section className="prep-lot" aria-labelledby="prep-title">
        <h2 id="prep-title">{t("বিক্রির জন্য তৈরি করুন", "Get ready to sell")}</h2>
        <p className="prep-caption">{t("কাজ শেষ হলে টিক দিন। টিক নিজে থেকেই সেভ হবে।", "Tick when done. Your checks save automatically.")}</p>
        <div className="prep-checks">{checklist(packing, t("বস্তায় ভরার আগে", "Before packing"), <PackageCheck size={24}/>)}{checklist(visit, t("ক্রেতা আসার আগে", "Before a buyer visits"), <ScanEye size={24}/>)}</div>
        <p role="status" className="prep-check-status">{checkMessage}</p>
      </section>
    </div>
  </div>;
}
