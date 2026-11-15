import { Fragment, useEffect, useRef, useState } from "react";
import { BookOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FIELD_ACTIONS_EVENT, readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";
import { amountFromText, deleteNotebookExpense, ledgerEvent, ledgerKey, notebookToday, readNotebookLedger, readableCalculation, validDay, writeNotebookExpense, type Expense } from "@/lib/notebook";
import "@/farmer-notebook.css";
import NotebookCalculator from "./NotebookCalculator";

type Photo = { id: string; createdAt: string; thumbnails?: string[]; risk: string; district: string; scanCount: number };
type Row = { id: string; sourceId:string; date:string; kind:"expense"|"work"|"advice"|"photo"|"note"; title:string; details:string[]; amount?:number; action?:FieldAction; expense?:Expense; legacyPhoto?:Photo };
const categories = {seed:["বীজ","Seed"],manure:["সার / গোবর","Fertiliser / manure"],labour:["শ্রমিক","Labour"],irrigation:["সেচ","Irrigation"],transport:["পরিবহন","Transport"],other:["অন্য খরচ","Other"]};
function tidy(value: string, bn: boolean) { return value.replace(/\d+\.\d{3,}/g,n=>Number(n).toLocaleString(bn?"bn-BD":"en-GB",{maximumFractionDigits:2})); }
const shortDate = (day:string) => `${day.slice(8,10)}/${day.slice(5,7)}/${day.slice(2,4)}`;

export default function FarmerNotebook({ userId, photos, onDeletePhoto }: { userId?:string; photos:Photo[]; onDeletePhoto:(id:string)=>Promise<void> }) {
 const {language}=useLanguage(); const bn=language==="bn"; const t=(b:string,e:string)=>bn?b:e;
 const key=ledgerKey(userId); const today=notebookToday();
 const [actions,setActions]=useState(readFieldActions); const [ledger,setLedger]=useState(()=>readNotebookLedger(key));
 const [filter,setFilter]=useState("work"); const [workFilter,setWorkFilter]=useState("all"); const [selected,setSelected]=useState<string[]>([]);
 const [filterDate,setFilterDate]=useState("");
 const [workCategory,setWorkCategory]=useState<"field"|"fertilizer"|"spray">("field");
 const [expanded,setExpanded]=useState<string|null>(null);
 const [form,setForm]=useState<"expense"|"work"|null>(null); const [editing,setEditing]=useState<Row|null>(null);
 const [dateText,setDate]=useState(shortDate(today)); const [amount,setAmount]=useState(""); const [category,setCategory]=useState("seed"); const [note,setNote]=useState("");
 const date=dateText.replace(/[০-৯]/g,digit=>String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/^(\d{2})\/(\d{2})\/(\d{2})$/,"20$3-$2-$1");
 const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [removing,setRemoving]=useState<Row|null>(null);
 const formRef=useRef<HTMLFormElement>(null); const busy=useRef(false);
 const number=(n:number)=>n.toLocaleString(bn?"bn-BD":"en-GB",{maximumFractionDigits:2}); const money=(n:number)=>`৳${number(n)}`;
 const dayLabel=(day:string)=>new Intl.DateTimeFormat(bn?"bn-BD":"en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${day}T00:00:00Z`));
 useEffect(()=>{
  const refresh=()=>{setActions(readFieldActions());setLedger(readNotebookLedger(key));};refresh();
  for(const event of [FIELD_ACTIONS_EVENT,ledgerEvent,"storage","focus"]) window.addEventListener(event,refresh);
  return ()=>{for(const event of [FIELD_ACTIONS_EVENT,ledgerEvent,"storage","focus"])window.removeEventListener(event,refresh);};
 },[key]);
 const rows:Row[]=[
  ...actions.filter(a=>validDay(a.date)).map(a=>{
   const kind:Row["kind"]=a.category==="photo"?"photo":a.status==="estimate"?"advice":a.kind==="task"?"work":"note";
   return {id:`action:${a.id}`,sourceId:a.id,date:a.date,kind,title:kind==="photo"?(typeof a.title === "string" && a.title ? a.title : t("ছবির নোট","Photo note")):a.text,details:[a.details,a.body,a.variety,a.cropAge].filter((s):s is string=>typeof s==="string"&&Boolean(s)).map(s=>tidy(s,bn)),action:a};
  }),
  ...ledger.map(l=>l.type==="expense"?{id:`ledger:${l.id}`,sourceId:l.id,date:l.date,kind:"expense" as const,title:categories[l.category as keyof typeof categories]?.[bn?0:1]||t("খরচ","Expense"),details:l.note?[l.note]:[],amount:l.amount,expense:l}:{id:`ledger:${l.id}`,sourceId:l.id,date:l.date,kind:"advice" as const,title:l.title,details:readableCalculation(l.result,bn)}),
  ...photos.map(p=>({id:`scan:${p.id}`,sourceId:p.id,date:new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(p.createdAt)),kind:"photo" as const,title:t("আগের ছবির রেকর্ড","Earlier photo record"),details:[`${number(p.scanCount||1)} ${t("টি ছবি","photos")} · ${p.district}`],legacyPhoto:p}))
 ].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const expenses=rows.filter(r=>r.kind==="expense"); const sum=(list:Row[])=>list.reduce((s,r)=>s+Math.round((r.amount||0)*100),0)/100;
 function workType(row:Row) {
  if(row.kind==="photo")return "photo";
  if(row.action?.category==="fertilizer"||row.action?.category==="spray")return row.action.category;
  // Older manually written work has no category; keep it searchable too.
  if(row.action?.kind==="task" && /সার|গোবর|fertili[sz]er|manure/i.test(row.title))return "fertilizer";
  if(row.action?.kind==="task" && /স্প্রে|spray/i.test(row.title))return "spray";
  return "other";
 }
 const estimates=rows.filter(r=>r.kind==="advice"&&(!filterDate||r.date===filterDate));
 const visible=rows.filter(r=>(!filterDate||r.date===filterDate)&&(filter==="expenses"?r.kind==="expense":r.kind!=="expense"&&r.kind!=="advice"&&(workFilter==="all"||workType(r)===workFilter)));
 const days=[...new Set(visible.map(r=>r.date))];
 function openForm(kind:"expense"|"work", row?:Row) {
  setForm(kind);setEditing(row||null);setDate(shortDate(row?.date||today));setAmount(row?.amount?String(row.amount):"");setCategory(row?.expense?.category||"seed");setNote(row?.expense?.note||row?.action?.text||"");setError("");
  setWorkCategory(row?.action?.category==="fertilizer"?"fertilizer":row?.action?.category==="spray"?"spray":"field");
  requestAnimationFrame(()=>{formRef.current?.scrollIntoView({block:"center"});formRef.current?.querySelector<HTMLInputElement>("input")?.focus();});
 }
 function submit(event:React.FormEvent) {
  event.preventDefault(); if(busy.current)return;setError("");
  const parsed=amountFromText(amount);
  if(!validDay(date)||date>today||(form==="expense"&&parsed===null)||(form==="work"&&!note.trim())){setError(t("সঠিক তারিখ ও তথ্য দিন। টাকা শূন্যের বেশি হবে।","Check the date and details. The amount must be above zero."));return;}
  busy.current=true;
  try {
   if(form==="expense")writeNotebookExpense(key,{type:"expense",id:editing?.sourceId||crypto.randomUUID(),date,category,amount:parsed!,note:note.trim().slice(0,120)});
   else { const next:FieldAction={...editing?.action,id:editing?.sourceId||crypto.randomUUID(),date,text:note.trim().slice(0,300),district:editing?.action?.district||localStorage.getItem("alusathi-district")||"",kind:"task",category:workCategory};saveFieldActions([next,...readFieldActions().filter(a=>a.id!==next.id)]); }
   setForm(null);setEditing(null);setMessage(t("খাতায় রাখা হয়েছে।","Saved to your Khata."));
  }catch{setError(t("রাখা যায়নি। আপনার লেখা আছে—আবার চেষ্টা করুন।","Could not save. Your changes are still here. Please try again."));}finally{busy.current=false;}
 }
 async function remove() {
  if(!removing||busy.current)return;busy.current=true;
  try {
   if(removing.expense)deleteNotebookExpense(key,removing.sourceId);
   else if(removing.action)saveFieldActions(readFieldActions().filter(a=>a.id!==removing.sourceId));
   else if(removing.legacyPhoto)await onDeletePhoto(removing.sourceId);
   if(editing?.id===removing.id){setForm(null);setEditing(null);}setRemoving(null);setMessage(t("লেখাটি মোছা হয়েছে।","Record deleted."));
  }catch{setMessage(t("মোছা যায়নি। আবার চেষ্টা করুন।","Could not delete this record. Please try again."));}finally{busy.current=false;}
 }
 return <section id="diary" className="farm-notebook app-shell">
  <header className="notebook-heading"><div><p><BookOpen size={19}/>{t("আমার খাতা","My Khata")}</p><h1>{t("দিনভিত্তিক জমির খাতা","Daily field Khata")}</h1><p>{t("কোন দিন কী করেছেন, কত খরচ হয়েছে—একসঙ্গে দেখুন।","Your farm record book. See daily work and costs.")}</p></div><div className="notebook-add"><NotebookCalculator bn={bn} ledgerKey={key} spent={sum(expenses.filter(row=>row.date<=today))} hasExpenses={expenses.some(row=>row.date<=today)}/><button onClick={()=>openForm("work")}><Plus size={19}/>{t("কাজ লিখুন","Add work")}</button><button onClick={()=>openForm("expense")}><Plus size={19}/>{t("খরচ লিখুন","Add expense")}</button></div></header>
  <div className="notebook-totals"><div><span>{t("আজকের খরচ","Today's expenses")}</span><strong>{money(sum(expenses.filter(r=>r.date===today)))}</strong></div><div><span>{t("এই মাসের খরচ","This month's expenses")}</span><strong>{money(sum(expenses.filter(r=>r.date.slice(0,7)===today.slice(0,7))))}</strong></div></div>
  <div className="notebook-toolbar"><div className="notebook-filters" aria-label={t("খাতা বাছাই","Filter Khata")}>{[["work",t("কাজ ও ছবি","Work and photos")],["expenses",t("খরচ","Expenses")]].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
  {filter==="work"&&<label className="notebook-work-filter"><span className="sr-only">{t("কাজের ধরন","Work type")}</span><select aria-label={t("কাজের ধরন","Work type")} value={workFilter} onChange={event=>{setWorkFilter(event.target.value);setExpanded(null);}}>{[["all",t("সব কাজ ও ছবি","All work and photos")],["fertilizer",t("সার দেওয়া","Adding fertiliser")],["spray",t("স্প্রে দেওয়া","Spraying")],["photo",t("ছবি","Photos")],["other",t("অন্যান্য কাজ","Other work")]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
  <div className="notebook-date-filter"><label>{t("তারিখ বাছুন","Choose a date")} <span className="notebook-calendar"><span aria-hidden="true">{filterDate ? shortDate(filterDate) : "dd/mm/yy"}</span><input type="date" value={filterDate} max={today} onChange={event=>{setFilterDate(event.target.value);setExpanded(null);setSelected([]);}}/></span></label>{filterDate&&<button type="button" onClick={()=>setFilterDate("")}>{t("সব তারিখ","All dates")}</button>}</div>
  </div><p className="notebook-message" role="status">{message}</p>
  {form&&<form ref={formRef} className="notebook-entry-form" onSubmit={submit}><div><h2>{editing?t("লেখা বদলান","Edit record"):form==="expense"?t("খরচ লিখুন","Add expense"):t("কাজ লিখুন","Add work")}</h2><button type="button" aria-label={t("বন্ধ করুন","Close")} onClick={()=>{setForm(null);setEditing(null);}}><X size={21}/></button></div><div className="notebook-fields">{form==="work"&&<label>{t("কাজের ধরন","Work type")}<select value={workCategory} onChange={event=>setWorkCategory(event.target.value as typeof workCategory)}><option value="field">{t("অন্যান্য কাজ","Other work")}</option><option value="fertilizer">{t("সার দেওয়া","Adding fertiliser")}</option><option value="spray">{t("স্প্রে দেওয়া","Spraying")}</option></select></label>}{form==="expense"&&<><label>{t("ধরন","Type")}<select value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(categories).map(([id,labels])=><option key={id} value={id}>{labels[bn?0:1]}</option>)}</select></label><label>{t("টাকা","Amount")}<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required maxLength={15}/></label></>}<label>{t("তারিখ","Date")}<input inputMode="text" placeholder="dd/mm/yy" maxLength={8} value={dateText} onChange={e=>setDate(e.target.value)} required/></label><label>{form==="expense"?t("নোট","Note"):t("কী কাজ করেছেন?","What did you do?")}<input value={note} maxLength={form==="expense"?120:300} onChange={e=>setNote(e.target.value)} required={form==="work"}/></label></div><p role="alert">{error}</p><button type="submit">{editing?t("পরিবর্তন রাখুন","Save changes"):form==="expense"?t("খরচ রাখুন","Save expense"):t("কাজ রাখুন","Save work")}</button></form>}
  {filter==="expenses"&&expenses.length>0&&<div className="notebook-selected"><span>{t("যোগ করতে খরচে টিক দিন","Tick expenses to add them")}</span><output aria-live="polite">{t("বেছে নেওয়া মোট:","Selected total:")} {money(sum(expenses.filter(r=>selected.includes(r.id))))}</output></div>}
  {!days.length&&<div className="notebook-empty"><BookOpen size={32}/><h2>{(filterDate||(filter==="work"&&workFilter!=="all"))?t("এই বাছাইয়ে কোনো লেখা নেই", "No records match these filters"):filter==="expenses"?t("এখনো খরচ লেখা হয়নি","No expenses recorded"):t("এখনো কোনো কাজ বা ছবি নেই","No work or photos recorded")}</h2><p>{filterDate?t("অন্য তারিখ বাছুন বা সব তারিখ দেখুন।","Choose another date or show all dates."):filter==="expenses"?t("খরচ লিখুন বোতামে টাকা, তারিখ ও খরচের কারণ দিন।", "Use Add expense to enter the amount, date and reason."):t("আজকের কাজে টিক দেওয়া কাজ ও ছবির ফল এখানে পাবেন। কাজ লিখুন বোতামেও নিজের কাজ রাখতে পারেন।", "Tasks you tick on Today's tasks and photo results appear here. Use Add work to add your own work.")}</p></div>}
  {days.length>0&&<p className="notebook-scroll-hint">{t("সব কলাম দেখতে তালিকা পাশে টানুন।","Swipe the table sideways to see all columns.")}</p>}
  {days.map(day=><section className="notebook-day" key={day} aria-label={dayLabel(day)}><header><h2><time dateTime={day}>{dayLabel(day)}</time></h2>{filter==="expenses"&&expenses.some(r=>r.date===day)&&<strong className="notebook-day-total">{t("দিনের খরচ:","Day's expenses:")} {money(sum(expenses.filter(r=>r.date===day)))}</strong>}</header><div className="notebook-table-scroll" tabIndex={0} role="region" aria-label={t("দিনের লেখার তালিকা","Daily records table")}><table className={`notebook-table ${filter==="work"?"notebook-work-table":""}`}><caption className="sr-only">{dayLabel(day)}</caption><thead><tr>{filter==="expenses"&&<th className="notebook-select-cell" scope="col">{t("যোগ","Add")}</th>}<th scope="col">{filter==="expenses"?t("খরচ","Expense"):t("কাজ","Work")}</th><th scope="col">{t("অবস্থা","Status")}</th>{filter==="expenses"&&<th scope="col" className="notebook-money-cell">{t("টাকা","Amount")}</th>}<th scope="col">{t("আরও","More")}</th></tr></thead><tbody>{visible.filter(r=>r.date===day).map(row=>{
   const badge=row.kind==="expense"?t("খরচ","Expense"):row.kind==="work"?t("করা হয়েছে","Done"):row.kind==="advice"?t("শুধু হিসাব","Calculation only"):row.kind==="photo"?t("ছবির নোট","Photo note"):t("জমির নোট","Observation");
   const detailId=`notebook-detail-${encodeURIComponent(row.id)}`;
   return <Fragment key={row.id}><tr className="notebook-record" data-kind={row.kind}>{filter==="expenses"&&<td className="notebook-select-cell"><input type="checkbox" aria-label={`${t("যোগ করুন:","Add to total:")} ${row.title} ${row.details[0]||""}`} checked={selected.includes(row.id)} onChange={()=>setSelected(old=>old.includes(row.id)?old.filter(id=>id!==row.id):[...old,row.id])}/></td>}<th scope="row"><strong>{row.title}</strong>{row.kind==="expense"&&row.details[0]&&<small>{row.details[0]}</small>}</th><td><span className={`notebook-badge notebook-${row.kind}`}>{badge}</span></td>{filter==="expenses"&&<td className="notebook-money-cell"><strong>{money(row.amount||0)}</strong></td>}<td><button className="notebook-row-toggle" aria-expanded={expanded===row.id} aria-controls={detailId} onClick={()=>{setExpanded(expanded===row.id?null:row.id);setRemoving(null);}}>{expanded===row.id?t("বন্ধ","Close"):t("বিস্তারিত","Details")}</button></td></tr>
    <tr id={detailId} className="notebook-expanded" hidden={expanded!==row.id}><td colSpan={filter==="expenses"?5:3}>{row.kind==="advice"&&<p className="notebook-advice-note">{t("এটি শুধু হিসাব—কাজ করা বা টাকা খরচের রেকর্ড নয়।","This is only a calculation. It does not record completed work or money spent.")}</p>}{row.details.map((s,i)=><p key={i}>{s}</p>)}{!row.details.length&&<p>{t("আলাদা নোট রাখা হয়নি।","No additional note recorded.")}</p>}{row.action?.nextDueDate&&validDay(row.action.nextDueDate)&&<p>{t("আবার মিলিয়ে দেখার দিন:","Review date:")} {dayLabel(row.action.nextDueDate)}</p>}<div className="notebook-record-actions">{(row.expense||row.kind==="work")&&<button onClick={()=>openForm(row.expense?"expense":"work",row)}><Pencil size={16}/>{t("বদলান","Edit")}</button>}{(row.expense||row.action||row.legacyPhoto)&&<button onClick={()=>setRemoving(row)}><Trash2 size={16}/>{t("মুছুন","Delete")}</button>}</div>{removing?.id===row.id&&<div className="notebook-delete-confirm" role="alert"><p>{t("এই লেখাটি মুছবেন?","Delete this record?")}</p><button onClick={()=>void remove()}>{t("হ্যাঁ, মুছুন","Yes, delete")}</button><button onClick={()=>setRemoving(null)}>{t("না, থাক","Keep it")}</button></div>}</td></tr></Fragment>;
  })}</tbody></table></div></section>)}
  {estimates.length>0&&<section className="notebook-estimates" aria-labelledby="notebook-estimate-heading"><h2 id="notebook-estimate-heading">{t("সেভ করা হিসাব", "Saved estimates")}</h2><p>{t("এগুলো আনুমানিক হিসাব—খরচের মোটে যোগ হয় না, বিক্রি হওয়ার রেকর্ডও নয়।", "These are estimates only. They are not included in total expenses or recorded as sales.")}</p>{estimates.map(row=><details key={row.id}><summary><span>{row.title}</span><time dateTime={row.date}>{dayLabel(row.date)}</time></summary><div>{row.details.map((text,index)=><p key={index}>{text}</p>)}{row.action&&<div className="notebook-record-actions"><button onClick={()=>setRemoving(row)}><Trash2 size={16}/>{t("মুছুন","Delete")}</button>{removing?.id===row.id&&<div className="notebook-delete-confirm" role="alert"><p>{t("এই লেখাটি মুছবেন?","Delete this record?")}</p><button onClick={()=>void remove()}>{t("হ্যাঁ, মুছুন","Yes, delete")}</button><button onClick={()=>setRemoving(null)}>{t("না, থাক","Keep it")}</button></div>}</div>}</div></details>)}</section>}
 </section>;
}
