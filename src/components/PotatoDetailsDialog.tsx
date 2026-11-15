import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { notebookToday, validDay } from "@/lib/notebook";
import { draftKey, formDraftKey, readObject, text } from "@/lib/farmer-market";

function initialDetails() {
  const draft = readObject(draftKey), form = readObject(formDraftKey);
  const details = !form.editingId && form.details && typeof form.details === "object" && !Array.isArray(form.details) ? { ...draft, ...form.details } : draft;
  return { variety: text(details.variety,60), country: text(details.country,60), purpose: text(details.purpose,20), batchCode: text(details.batchCode,40), packedMonth: text(details.packedMonth,7), harvestDate: text(details.harvestDate,10), notes: text(details.notes,300), storageDescription: text(details.storageDescription,200) };
}
export default function PotatoDetailsDialog() {
  const {language}=useLanguage(), bn=language==="bn", theme=useSiteTheme();
  const navigate=useNavigate();
  const t=(b:string,e:string)=>bn?b:e;
  const [details,setDetails]=useState(initialDetails), [open,setOpen]=useState(false), [error,setError]=useState(""), [saved,setSaved]=useState(false);
  function change(field:keyof typeof details,value:string) { setDetails({...details,[field]:value});setError("");setSaved(false); }
  function save(event:React.FormEvent) {
    event.preventDefault();
    if (details.harvestDate && (!validDay(details.harvestDate) || details.harvestDate>notebookToday())) {setError(t("আলু তোলার সঠিক তারিখ দিন। ভবিষ্যতের তারিখ নয়।", "Please check the harvest date. It cannot be in the future."));return;}
    try {
      const raw=localStorage.getItem(draftKey), formRaw=localStorage.getItem(formDraftKey);
      const draft=JSON.parse(raw || "{}"), form=JSON.parse(formRaw || "{}");
      if (!draft || typeof draft!=="object" || Array.isArray(draft) || !form || typeof form!=="object" || Array.isArray(form)) throw new Error("Unreadable saved details");
      const facts={variety:details.variety.trim(),harvestDate:details.harvestDate,notes:details.notes.trim(),storageDescription:details.storageDescription.trim(),country:details.country.trim(),purpose:details.purpose,batchCode:details.batchCode.trim(),packedMonth:details.packedMonth};
      localStorage.setItem(draftKey,JSON.stringify({...draft,...facts}));
      try {
        if (!form.editingId) localStorage.setItem(formDraftKey,JSON.stringify({...form,details:{...form.details,...facts}}));
      } catch (failure) { if(raw===null)localStorage.removeItem(draftKey);else localStorage.setItem(draftKey,raw);throw failure; }
      setSaved(true);setOpen(false);
      if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="market") navigate("/farmer#market");
    } catch {setError(t("সেভ হয়নি। আপনার লেখা এখানেই আছে—আবার চেষ্টা করুন।", "Could not save. Your details are still here. Please try again."));}
  }
  return <section id="potato-details" className="prep-certificate-card" aria-labelledby="prep-certificate-title">
    <div><FileText size={25}/><h2 id="prep-certificate-title">{t("আলুর পরিচিতি", "Potato details")}</h2></div>
    <p>{t("আলুর জাত, কোথায় ফলিয়েছেন আর কী কাজে লাগবে, লিখে রাখুন।", "Record the variety, where it was grown and what it is used for.")}</p>
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button type="button" className="prep-certificate-trigger">{t("আলুর তথ্য দিন", "Enter potato details")}</button></DialogTrigger>
      <DialogContent hideCloseButton className={`potato-certificate ${bn?"font-bangla":""}`} data-home-theme={theme}>
        <DialogClose className="potato-certificate-close" aria-label={t("বন্ধ করুন", "Close")}><X size={21}/></DialogClose>
        <div className="potato-certificate-heading"><FileText size={25}/><DialogTitle>{t("আলুর পরিচিতি", "Potato details")}</DialogTitle></div>
        <DialogDescription>{t("যা জানেন, শুধু সেটাই লিখুন। বাকি ঘর খালি রাখতে পারেন।", "Fill in what you know. You can leave the other fields blank.")}</DialogDescription>
        <form className="potato-details-form" onSubmit={save}>
          <label>{t("কী কাজে লাগবে?", "Use")}<select name="potatoPurpose" value={details.purpose} onChange={e=>change("purpose",e.target.value)}><option value="">{t("বাছুন", "Choose")}</option><option value="table">{t("খাওয়ার আলু", "Potatoes for eating")}</option><option value="seed">{t("বীজ আলু", "Seed potatoes")}</option><option value="processing">{t("চিপস বা অন্য খাবার তৈরি", "For processing")}</option></select></label>
          <label>{t("জাত (জানা থাকলে)", "Variety (if known)")}<input name="potatoVariety" value={details.variety} maxLength={60} onChange={e=>change("variety",e.target.value)} /></label>
          <label>{t("কোন দেশে ফলিয়েছেন?", "Country of origin")}<input name="potatoCountry" value={details.country} maxLength={60} onChange={e=>change("country",e.target.value)} /></label>
          <label>{t("প্যাক করার মাস", "Packing month")}<input name="potatoPackedMonth" type="month" max={notebookToday().slice(0,7)} value={details.packedMonth} onChange={e=>change("packedMonth",e.target.value)} /></label>
          <label>{t("বস্তার চিহ্ন বা নম্বর", "Bag mark or batch number")}<input name="potatoBatch" value={details.batchCode} maxLength={40} onChange={e=>change("batchCode",e.target.value)} /></label>
          <label>{t("আলু তোলার তারিখ (জানা থাকলে)", "Harvest date (if known)")}<input name="potatoHarvest" type="date" max={notebookToday()} value={details.harvestDate} onChange={e=>change("harvestDate",e.target.value)} /></label>
          <label className="certificate-wide">{t("আকার ও অবস্থা", "Size and condition")}<input name="potatoCondition" placeholder={t("যেমন: মাঝারি আকার, শুকনো আলু", "e.g. medium size, dry potatoes")} value={details.notes} maxLength={300} onChange={e=>change("notes",e.target.value)} /></label>
          <label className="certificate-wide">{t("কোথায় আছে? (ঐচ্ছিক)", "Where is it kept? (optional)")}<input name="potatoStorage" value={details.storageDescription} maxLength={200} onChange={e=>change("storageDescription",e.target.value)} /></label>
          {error && <p role="alert" className="certificate-wide">{error}</p>}
          <p className="potato-certificate-note certificate-wide">{t("এই তথ্য বাজারে দিন পাতায় কাজে লাগবে। এটি মান যাচাইয়ের সনদ নয়।", "These details appear on List for sale. This is not a quality certificate.")}</p>
          <div className="potato-details-actions certificate-wide"><button type="submit" className="potato-certificate-done">{t("সেভ করুন", "Save")}</button><button type="submit" value="market" className="potato-certificate-done">{t("সেভ করে বাজারে যান", "Save and prepare listing")}</button></div>
        </form>
      </DialogContent>
    </Dialog>
    {saved && <p role="status">{t("আলুর তথ্য সেভ হয়েছে।", "Potato details saved.")}</p>}
  </section>;
}
