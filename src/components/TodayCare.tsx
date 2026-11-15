import { useState } from "react";
import { ChevronDown, Droplets, Sprout } from "lucide-react";
import { sprayReference, type PlanPhoto } from "@/lib/today-plan";
import { readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";
import { localToday } from "@/lib/local-date";
import { areaSquareMetres } from "@/lib/farmer-tools";
import { exampleTopDressing } from "@/lib/potato-nutrients";

const acreUrea = exampleTopDressing(areaSquareMetres(1, "acre"));

export default function TodayCare({ bn, district, actions, photo }: {
  bn: boolean; district: string; actions: FieldAction[]; photo: PlanPhoto | null;
}) {
  const t = (b: string, e: string) => bn ? b : e;
  const kg = (grams: number) => (grams / 1000).toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  const [logError, setLogError] = useState("");
  const [showReminderConfirmation, setShowReminderConfirmation] = useState(false);
  const sprayExample = sprayReference(photo, bn);
  const today = localToday();
  const entry = actions.find(item => item.id === `fertilizer-check-${today}` && (item.district === district || !item.district));
  const lastApplied = actions.filter(item => (item.district === district || !item.district) && item.category === "fertilizer" && (item.status === "applied" || item.kind === "task") && item.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  const reminder = lastApplied ? new Date(`${lastApplied.date}T12:00:00`) : null;
  if (reminder) reminder.setDate(reminder.getDate() + 21);
  const reminderLabel = reminder?.toLocaleDateString(bn ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  function record(applied: boolean) {
    const next: FieldAction = { id: `fertilizer-check-${today}`, date: today, district, kind: "observation", category: "fertilizer", status: applied ? "applied" : "not-applied", text: applied ? t("সার দেওয়ার কথা জানিয়েছেন", "Reported adding fertiliser") : t("আজ সার দেওয়া হয়নি", "No fertiliser added today"), details: t("শুধু প্রয়োগের দিন রাখা হয়েছে; সারের ধরন ও পরিমাণ নিশ্চিত করা হয়নি।", "Only the date was saved. Fertiliser type and amount were not confirmed.") };
    try { saveFieldActions([next, ...readFieldActions().filter(item => item.id !== next.id)].slice(0,100)); setLogError(""); setShowReminderConfirmation(applied); }
    catch { setShowReminderConfirmation(false); setLogError(t("রাখা যায়নি। আবার চেষ্টা করুন।", "Could not save. Please try again.")); }
  }
  return <section className="today-care" aria-labelledby="care-heading">
    <h2 id="care-heading" className="sr-only">{t("সার ও স্প্রের পরিকল্পনা", "Fertiliser and spray plan")}</h2>
    <div className="care-plan-columns">
    <details className="care-auto-spray care-panel" data-photo-condition={photo?.condition || "none"} data-example={sprayExample ? "true" : "false"}><summary><span className="care-panel-icon"><Droplets size={25} /></span><span className="care-panel-title"><strong>{t("স্প্রে", "Spray")}</strong><small>{sprayExample ? t("নাম ও মেশানোর হার", "Name and mixing rate") : t("স্প্রে বাছাই করা হয়নি", "No spray selected")}</small></span><span className="care-panel-toggle">{t("বিস্তারিত দেখুন", "See details")} <ChevronDown size={18} /></span></summary>
      {sprayExample ? <div className="care-reference">
        <p><strong>{sprayExample} {photo?.sample === 4 ? "72 WP" : "80 WP"} · {t("প্রতি লিটার পানিতে ২ গ্রাম", "2 g per litre of water")}</strong></p>
        <p>{t("মাঠে লেট ব্লাইট নিশ্চিত হলে পণ্যের লেবেল মিলিয়ে নিন। তোলা আলুতে নয়।", "Only for late blight confirmed in the field. Check the product label. Do not spray harvested potatoes.")} <a href="https://dae.gov.bd/sites/default/files/files/dae.portal.gov.bd/page/8a812db0_3544_4105_b066_df78074d3efb/2021-09-23-04-04-b1c554f8cfac4f27fab709ca813a61af.pdf" target="_blank" rel="noopener noreferrer">{t("উৎস", "Source")} ↗</a></p>
      </div> : <p>{t("শুধু ছবি দেখে স্প্রে বাছাই করা যায় না।", "A photo alone cannot tell you which spray to use.")}</p>}
    </details>
    <details className="care-auto-fertilizer care-panel">
      <summary><span className="care-panel-icon"><Sprout size={25} /></span><span className="care-panel-title"><strong>{t("সার", "Fertiliser")}</strong><small>{entry?.status === "applied" ? t("আজ সার দেওয়ার কথা রেখেছেন", "Today's application recorded") : t("১ একরে ইউরিয়ার পরিমাণ", "Urea amount for 1 acre")}</small></span><span className="care-panel-toggle">{t("বিস্তারিত দেখুন", "See details")} <ChevronDown size={18} /></span></summary>
      <div className="care-fertilizer-info">
        <p><strong>{t("ইউরিয়া · ১ একরে", "Urea · 1 acre")} {kg(acreUrea.minGrams)}–{kg(acreUrea.maxGrams)} {t("কেজি", "kg")}</strong></p>
        <p>{t("লাগানোর ৩০–৩৫ দিনের জন্য। আগে দিয়ে থাকলে আবার দেওয়ার আগে মিলিয়ে নিন।", "For days 30–35 after planting. Check past use before adding more.")} <a href="https://www.bamis.gov.bd/en/bulletin/view/32495/" target="_blank" rel="noopener noreferrer">{t("উৎস", "Source")} ↗</a></p>
      </div>
      <div className="care-fertilizer-log"><h3>{t("আজ কি সার দিয়েছেন?", "Did you add fertiliser today?")}</h3><div><button type="button" aria-pressed={entry?.status === "applied"} onClick={() => record(true)}>{t("হ্যাঁ, আজ দিয়েছি", "Yes, added today")}</button><button type="button" aria-pressed={entry?.status === "not-applied"} onClick={() => record(false)}>{t("না, আজ দিইনি", "No, not today")}</button></div><p role="status">{logError || (entry ? t("খাতায় রাখা হয়েছে।", "Saved in Khata.") : "")}</p></div>
      {showReminderConfirmation && entry?.status === "applied" && reminderLabel && <p className="care-message" role="status">{t("৩ সপ্তাহ পর এই পাতায় মনে করিয়ে দেব:", "Reminder on this page in 3 weeks:")} {reminderLabel}</p>}
      {reminder && reminder <= new Date(`${today}T12:00:00`) && <p className="care-message">{t("আজ সারের হিসাব মিলিয়ে দেখুন।", "Review your fertiliser record today.")}</p>}
    </details>
    </div>
  </section>;
}
