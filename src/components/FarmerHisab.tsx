import { useEffect, useState } from "react";
import { Calculator, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ledgerEvent, ledgerKey, notebookToday, readNotebookLedger, validDay, writeNotebookExpense } from "@/lib/notebook";
import "@/farmer-hisab.css";

const key = "alusathi-farmer-profit-v1";
const empty = { quantity: "", harvest: "", remaining: "", price: "", growing: "", freight: "", other: "", planting: "", source: "notebook" };
type Inputs = typeof empty;
function readDraft(): Inputs {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    const draft = Object.fromEntries(Object.entries(empty).map(([field, fallback]) => [field, typeof saved?.[field] === "string" ? saved[field].slice(0, 20) : fallback])) as Inputs;
    draft.source = draft.source === "manual" || (!saved?.source && saved?.growing) ? "manual" : "notebook";
    draft.planting ||= localStorage.getItem("alusathi-planting-date") || "";
    return draft;
  } catch { return { ...empty }; }
}
function amount(text: string, optional = false) {
  const value = text.trim().replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  if (!value) return optional ? 0 : null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number <= 100000000 ? number : null;
}

export default function FarmerHisab({ userId }: { userId?: string }) {
  const { language } = useLanguage();
  const bn = language === "bn", t = (b: string, e: string) => bn ? b : e;
  const [inputs, setInputs] = useState(readDraft);
  const [message, setMessage] = useState("");
  const [ledger, setLedger] = useState(() => readNotebookLedger(ledgerKey(userId)));
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseMessage, setExpenseMessage] = useState("");
  useEffect(() => {
    const refresh = () => setLedger(readNotebookLedger(ledgerKey(userId)));
    refresh();
    for (const event of [ledgerEvent, "storage", "focus"]) window.addEventListener(event, refresh);
    return () => { for (const event of [ledgerEvent, "storage", "focus"]) window.removeEventListener(event, refresh); };
  }, [userId]);
  const number = (n: number) => n.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  const money = (n: number) => `৳${number(n)}`;
  const today = notebookToday();
  const planted = validDay(inputs.planting) && inputs.planting <= today;
  const days = planted ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${inputs.planting}T00:00:00Z`)) / 86400000) + 1 : null;
  const expenses = ledger.filter(row => row.type === "expense" && row.date <= today);
  const spent = expenses.reduce((sum, row) => sum + (row.type === "expense" ? row.amount : 0), 0);
  const dailySpent = expenses.reduce((sum, row) => sum + (row.type === "expense" && row.date >= inputs.planting ? row.amount : 0), 0);
  const average = days && expenses.length ? dailySpent / days : null;
  const projected = average === null ? null : Math.round(Math.max(spent, average * 90) * 100) / 100;
  const quantity = amount(inputs.quantity), harvest = amount(inputs.harvest), price = amount(inputs.price);
  const remaining = amount(inputs.remaining, true);
  const cropCost = inputs.source === "manual" ? amount(inputs.growing) : remaining === null ? null : spent + remaining;
  const growing = cropCost !== null && quantity !== null && harvest !== null && harvest > 0 ? cropCost * quantity / harvest : null;
  const freight = amount(inputs.freight, true), other = amount(inputs.other, true);
  const ready = quantity !== null && quantity > 0 && harvest !== null && harvest >= quantity && price !== null && growing !== null && freight !== null && other !== null;
  const sales = ready ? quantity * price : 0;
  const costs = ready ? growing + freight + other : 0;
  const profit = Math.round((sales - costs) * 100) / 100;
  const fields: [keyof Inputs, string, string, string][] = [
    ["harvest", t("এই চাষে মোট কত কেজি আলু হবে?", "Total expected harvest from this crop?"), t("কেজি", "kg"), "1000"],
    ["quantity", t("এর মধ্যে কত কেজি বিক্রি করবেন?", "How many of those kg will you sell?"), t("কেজি", "kg"), "200"],
    ["price", t("প্রতি কেজির দাম কত?", "Price per kg?"), t("টাকা / কেজি", "taka / kg"), "30"],
  ];
  function field(id: keyof Inputs, label: string, unit: string, example: string, optional = false) {
    const invalid = Boolean(inputs[id].trim()) && (amount(inputs[id]) === null || (id === "quantity" && amount(inputs[id]) === 0));
    return <label className="hisab-field" key={id} htmlFor={`hisab-${id}`}><span>{label}</span><div><input id={`hisab-${id}`} name={id} inputMode="decimal" value={inputs[id]} maxLength={20} placeholder={`${t("যেমন", "e.g.")} ${example}`} aria-invalid={invalid} aria-describedby={invalid ? `hisab-${id}-error` : id === "growing" ? "hisab-cost-help" : undefined} onChange={event => { setInputs({ ...inputs, [id]: event.target.value }); setMessage(""); }} /><small>{unit}</small></div>{id === "growing" && <small id="hisab-cost-help">{t("বীজ, সার, সেচ ও শ্রমিকসহ পুরো চাষের খরচ।", "Include seed, fertiliser, watering and labour for the whole crop.")}</small>}{optional && <small>{t("আপনি দিলে লিখুন। খালি থাকলে ০।", "Enter only if you pay it. Blank means 0.")}</small>}{invalid && <small className="hisab-error" id={`hisab-${id}-error`}>{t(id === "quantity" ? "০-এর বেশি কেজি লিখুন।" : "সঠিক টাকা লিখুন। ঋণাত্মক সংখ্যা নয়।", "Enter zero or more. Weight in kg must be above zero.")}</small>}</label>;
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(inputs)); setMessage(t("হিসাব সেভ হয়েছে।", "Calculation saved.")); }
    catch { setMessage(t("সেভ হয়নি। আপনার লেখা এখানেই আছে—আবার চেষ্টা করুন।", "Could not save. Your details are still here. Please try again.")); }
  }
  function addExpense(event: React.FormEvent) {
    event.preventDefault();
    const value = amount(expenseAmount);
    if (value === null || value <= 0) { setExpenseMessage(t("০-এর বেশি খরচ লিখুন।", "Enter a cost above 0.")); return; }
    try {
      writeNotebookExpense(ledgerKey(userId), { type: "expense", id: crypto.randomUUID(), date: today, category: "other", amount: value, note: expenseNote.trim() });
      setExpenseAmount(""); setExpenseNote(""); setExpenseMessage(t("খরচ খাতায় যোগ হয়েছে।", "Expense added to Khata."));
    } catch { setExpenseMessage(t("খরচ সেভ হয়নি। আবার চেষ্টা করুন।", "Could not save this expense. Please try again.")); }
  }
  return <section className="app-shell farmer-hisab font-bangla" aria-labelledby="hisab-title">
    <header className="hisab-heading"><span><Calculator size={25} />{t("হিসাব", "Calculator")}</span><h1 id="hisab-title">{t("বিক্রি করলে কত লাভ থাকবে?", "How much profit will you make?")}</h1><p>{t("খাতা থেকে খরচ দেখুন। কত আলু, কত দামে বিক্রি করবেন—সেটি আপনি ঠিক করুন।", "Check your costs in Khata. Choose how much to sell and at what price.")}</p></header>
    <section className="hisab-spending" aria-labelledby="hisab-spending-title">
      <div className="hisab-spending-top"><div><h2 id="hisab-spending-title">{t("এই আলু চাষে মোট খরচ কত?", "How much has this crop cost?")}</h2><p>{t("আজ পর্যন্ত খাতায় লেখা খরচ", "Expenses in Khata up to today")}</p><strong data-result="spent">{expenses.length ? money(spent) : "—"}</strong><p>{expenses.length ? t(`${number(expenses.length)}টি খরচের রেকর্ড থেকে।`, `From ${expenses.length} expense records.`) : t("খাতায় খরচ নেই। খরচ যোগ করুন অথবা নিজে দিন।", "No expenses recorded. Add spending or enter your own total.")}</p></div><button type="button" className="secondary-main" aria-expanded={expenseOpen} onClick={() => setExpenseOpen(!expenseOpen)}>{t("অতিরিক্ত খরচ যোগ করুন", "Add spending")}</button></div>
      {expenseOpen && <form className="hisab-add-expense" onSubmit={addExpense}><label>{t("খরচ (টাকা)", "Cost (taka)")}<input name="expenseAmount" inputMode="decimal" value={expenseAmount} maxLength={20} onChange={event => {setExpenseAmount(event.target.value);setExpenseMessage("");}} required /></label><label>{t("কিসের খরচ? (ঐচ্ছিক)", "What was it for? (optional)")}<input name="expenseNote" value={expenseNote} maxLength={120} onChange={event => setExpenseNote(event.target.value)} /></label><button type="submit" className="primary-main">{t("খাতায় যোগ করুন", "Add to Khata")}</button></form>}
      {expenseMessage && <p role="status">{expenseMessage}</p>}
      <div className="hisab-forecast">
        <div><span>{t("খাতায় লেখা খরচ", "Recorded spending")}</span><strong>{money(spent)}</strong></div>
        {field("remaining", t("সামনে আনুমানিক খরচ", "Estimated remaining growing cost"), t("টাকা", "taka"), "3000", true)}
        <div><span>{t("মোট আনুমানিক খরচ", "Estimated total growing cost")}</span><strong data-result="estimated-total">{remaining === null ? "—" : money(spent + remaining)}</strong></div>
      </div>
      <p>{t("খাতার সব খরচ এই চাষের ধরা হয়েছে। সামনে বীজ, সার, সেচ বা শ্রমিকের বাকি খরচ লিখুন। খালি রাখলে বাকি খরচ ০।", "All Khata expenses are counted for this crop. Enter future costs for seed, fertiliser, watering or labour. A blank future cost counts as zero.")}</p>
      <details className="hisab-extras"><summary>{t("দিনের গড় দিয়ে অনুমান দেখুন", "Optional daily-average estimate")}</summary>
      <div className="hisab-forecast"><label>{t("আলু লাগানোর তারিখ", "Planting date")}<input type="date" max={today} value={inputs.planting} aria-invalid={Boolean(inputs.planting) && !planted} onChange={event => { setInputs({...inputs,planting:event.target.value});setMessage(""); }} /></label><div><span>{t("দিনে গড় খরচ", "Average cost per day")}</span><strong data-result="daily">{average === null ? "—" : money(average)}</strong></div><div><span>{t("৯০ দিনের সম্ভাব্য মোট খরচ", "Estimated total for 90 days")}</span><strong data-result="projected">{projected === null ? "—" : money(projected)}</strong></div></div>
      <p className="hisab-forecast-note">{days ? t(`চাষের ${number(days)} দিন চলছে। লাগানোর তারিখ থেকে খাতার খরচ ধরা হয়েছে। আগে কেনা বীজের খরচ থাকলে ‘নিজে দিন’ ব্যবহার করুন।`, `Day ${days} of growing. Includes Khata costs since planting. Use ‘Enter myself’ for earlier costs, such as seed.`) : t("গড় হিসাব পেতে লাগানোর তারিখ দিন।", "Add the planting date to calculate an average.")} {t("এখনকার দৈনিক গড় ধরে ৯০ দিনের অনুমান—এটি নিশ্চিত খরচ বা আলু তোলার দিন নয়। প্রথম দিকে বেশি খরচ হলে অনুমানও বেশি হবে।", "This uses your average daily spending so far for 90 days. It does not guarantee costs or a harvest date. High early spending can make the estimate too high.")}</p>
      <p>{t("এই গড় লাভের হিসাবে ব্যবহার করা হচ্ছে না।", "This daily average is not used to calculate profit.")}</p></details>
    </section>
    <div className="hisab-layout">
      <div className="hisab-entry"><h2>{t("বিক্রির হিসাব মিলিয়ে দেখুন", "Try your selling figures")}</h2><fieldset className="hisab-source"><legend>{t("চাষের খরচ ধরবেন", "Growing costs to use")}</legend><label><input type="radio" name="costSource" value="notebook" checked={inputs.source === "notebook"} onChange={() => {setInputs({...inputs,source:"notebook"});setMessage("");}} />{t("খাতার খরচ + সামনে খরচ", "Recorded + future costs")}</label><label><input type="radio" name="costSource" value="manual" checked={inputs.source === "manual"} onChange={() => {setInputs({...inputs,source:"manual"});setMessage("");}} />{t("নিজে দিন", "Enter myself")}</label></fieldset>
        {inputs.source === "manual" ? field("growing", t("পুরো চাষের মোট খরচ নিজে দিন", "Enter the whole crop's total growing cost"), t("টাকা", "taka"), "4000") : <p className="hisab-selected-cost">{cropCost === null ? t("সামনের খরচে সঠিক টাকা লিখুন।", "Enter a valid remaining cost.") : t(`পুরো চাষের আনুমানিক খরচ ${money(cropCost)}।`, `Estimated whole-crop cost: ${money(cropCost)}.`)} <Link to="/farmer#diary">{t("খাতা দেখুন", "View Khata")}</Link></p>}
        {fields.map(([id, label, unit, example]) => field(id, label, unit, example))}
        {quantity !== null && harvest !== null && quantity > harvest && <p role="alert" className="hisab-error">{t("বিক্রির পরিমাণ মোট ফলনের বেশি হতে পারে না।", "Sale quantity cannot exceed the total harvest.")}</p>}
        <p className="hisab-note">{t("সব আলুর প্রতি কেজিতে সমান চাষের খরচ ধরে, শুধু বিক্রির অংশের খরচ নেওয়া হচ্ছে।", "Growing costs are shared equally across every kg harvested. Only the costs for potatoes being sold are counted here.")}</p>
        <details className="hisab-extras"><summary>{t("আরও বিক্রির খরচ হবে?", "More selling costs to come?")}</summary><p>{t("খাতায় আগে লেখা খরচ এখানে আবার লিখবেন না।", "Do not enter costs already recorded in Khata.")}</p>{field("freight", t("বাকি গাড়িভাড়া", "Remaining transport cost"), t("টাকা", "taka"), "500", true)}{field("other", t("বাকি অন্য খরচ", "Other remaining cost"), t("টাকা", "taka"), "100", true)}</details>
        <button className="primary-main" type="button" disabled={!ready} onClick={save}>{t("হিসাব সেভ করুন", "Save calculation")}</button><p className="hisab-save-message" role="status">{message}</p>
      </div>
      <div className="hisab-result" aria-live="polite" aria-atomic="true">
        {!ready ? <div className="hisab-empty"><Calculator size={38} /><h2>{t("খরচ, পরিমাণ ও দাম ঠিক করুন", "Set costs, quantity and price")}</h2><p>{t("এখানে বিক্রির টাকা, মোট খরচ ও লাভ–লোকসান দেখাবে।", "Your sale value, total costs and profit or loss appear here.")}</p></div> : <>
          <div className={`hisab-outcome ${profit < 0 ? "is-loss" : ""}`}>{profit < 0 ? <TrendingDown size={30} /> : <TrendingUp size={30} />}<p>{profit > 0 ? t("এই দামে আনুমানিক লাভ", "Estimated profit at this price") : profit < 0 ? t("এই দামে আনুমানিক লোকসান", "Estimated loss at this price") : t("লাভও নয়, লোকসানও নয়", "No profit or loss")}</p><strong data-result="profit">{money(Math.abs(profit))}</strong><span>{profit === 0 ? t("বিক্রির টাকা ও খরচ সমান।", "Sales cover your costs exactly.") : t(`প্রতি কেজিতে ${money(Math.abs(profit / quantity))} ${profit > 0 ? "লাভ" : "লোকসান"}।`, `${money(Math.abs(profit / quantity))} ${profit > 0 ? "profit" : "loss"} per kg.`)}</span></div>
          <p className="hisab-note" data-result="allocation">{t(`মোট ${number(harvest)} কেজির মধ্যে ${number(quantity)} কেজি বিক্রির হিসাব।`, `Selling ${number(quantity)} kg out of a ${number(harvest)} kg harvest.`)}</p>
          <dl className="hisab-breakdown"><div><dt>{t("বিক্রির টাকা", "Sale value")}</dt><dd data-result="sales">{money(sales)}</dd></div><div><dt>{t("বিক্রির অংশের চাষের খরচ", "Growing cost for the sold portion")}</dt><dd>{money(growing)}</dd></div><div><dt>{t("গাড়িভাড়া ও অন্য খরচ", "Transport and other costs")}</dt><dd>{money(freight + other)}</dd></div><div className="hisab-total"><dt>{t("বিক্রির অংশের মোট আনুমানিক খরচ", "Estimated total cost for the sold portion")}</dt><dd data-result="costs">{money(costs)}</dd></div></dl>
          <div className="hisab-price-floor"><strong>{t("খরচ তুলতে প্রতি কেজির দাম", "Price per kg to cover costs")}</strong><b data-result="breakeven">{money(Math.ceil(costs / quantity * 100) / 100)}</b><p>{t("এর কম দামে বিক্রি করলে লোকসান হবে।", "Selling below this price means a loss.")}</p></div>
          <p className="hisab-margin" data-result="margin">{t("বিক্রির টাকার মধ্যে লাভের হার", "Profit as a percentage of sales")}: <strong>{sales > 0 ? `${number(profit / sales * 100)}%` : "—"}</strong></p>
        </>}
        <p className="hisab-note">{t("আপনার দেওয়া খরচ ধরে সম্ভাব্য হিসাব। এটি বিক্রি বা টাকা পাওয়ার রেকর্ড নয়।", "An estimate using your entered costs, not a sale or payment record.")}</p>
      </div>
    </div>
  </section>;
}
