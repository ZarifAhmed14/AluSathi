import { useState } from "react";
import { buildTodayTasks, type PlanContext } from "@/lib/today-plan";
import type { CareArea } from "@/lib/care-area";

export default function TodayAiDemo({bn,context,area,changed,onApply}:{bn:boolean;context:PlanContext;area:CareArea;changed:boolean;onApply:()=>boolean}) {
  const [open,setOpen] = useState(false);
  const [message,setMessage] = useState("");
  const t=(b:string,e:string)=>bn?b:e;
  return <section className="today-ai-demo">
    <div className="today-ai-heading"><p>{t("ছবির ফল ও জমির তথ্য মিলিয়ে কাজ দেখুন।","See tasks based on your photo and field details.")}</p><button type="button" onClick={()=>setOpen(!open)} aria-expanded={open}>{t("তালিকা বদলান","Update checklist")}</button></div>
    {changed && <p className="ai-context-changed" role="status">{t("নতুন তথ্য এসেছে। তালিকা বদলাতে ওপরের বোতামে চাপুন।","New information is available. Use the button above to update your checklist.")}</p>}
    {open && <p className="ai-context-changed">{t("আগের প্রয়োগ: ","Previously added: ")}{context.lastTreatment || t("কোনো প্রয়োগ লেখা নেই","No fertiliser or spray use recorded")}</p>}
    {open && <div className="today-ai-preview"><p>{t("নতুন তালিকাটি আগে দেখে নিন। AI এখনো চালু নয়—এটি AI-এর উত্তর নয়।","Check the new list first. AI is not connected. This is not an AI answer.")}</p><dl><div><dt>{t("ছবির ফল","Photo finding")}</dt><dd>{context.photo?.title || t("ছবি দেওয়া হয়নি","No photo supplied")}</dd></div><div><dt>{t("জমির মাপ","Land size")}</dt><dd>{bn ? Number(area.value).toLocaleString("bn-BD") : area.value} {area.unit === "decimal" ? t("শতক","shatak") : area.unit}</dd></div><div><dt>{t("গাছের বয়স","Crop age")}</dt><dd>{({"lt30":t("১ মাসের কম","Under 1 month"),"30to60":t("১–২ মাস","1–2 months"),"60to90":t("২–৩ মাস","2–3 months"),"gt90":t("৩ মাসের বেশি","Over 3 months")})[context.band] || t("দেওয়া হয়নি","Not supplied")}</dd></div></dl><ul>{buildTodayTasks(context,bn).map(task=><li key={task.id}>{task.text}</li>)}</ul><div className="ai-preview-actions"><button type="button" onClick={()=>{if(onApply()){setOpen(false);setMessage(t("তালিকা বদলানো হয়েছে। শেষ করা কাজ খাতায় আছে।","Checklist updated. Your completed work stays in Khata."));}else setMessage(t("রাখা যায়নি। আবার চেষ্টা করুন।","Could not save. Please try again."));}}>{t("এই তালিকা রাখুন","Use this checklist")}</button><button type="button" disabled>{t("AI · এখনো চালু নয়","AI · not connected")}</button></div><small>{t("AI কোনো ওষুধ বা মাত্রা ঠিক করছে না।","AI does not choose medicines or doses.")}</small></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
