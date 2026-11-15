import { useState } from "react";
import { Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { amountFromText, notebookToday, writeNotebookCalculation } from "@/lib/notebook";

export default function NotebookCalculator({ bn, ledgerKey, spent, hasExpenses }: { bn: boolean; ledgerKey: string; spent: number; hasExpenses: boolean }) {
  const t = (b: string, e: string) => bn ? b : e;
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [result, setResult] = useState<{ id: string; kg: number; price: number; cost: number; sales: number; profit: number } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const number = (n: number) => n.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  const money = (n: number) => `৳${number(n)}`;
  function calculate(event: React.FormEvent) {
    event.preventDefault();
    const kg = amountFromText(quantity), rate = amountFromText(price);
    if (kg === null || rate === null || !hasExpenses) { setError(t("সঠিক কেজি ও দাম দিন। খাতায় খরচও থাকতে হবে।", "Enter valid kg and price. Record expenses in Khata first.")); return; }
    const sales = Math.round(kg * rate * 100) / 100;
    setResult({ id: crypto.randomUUID(), kg, price: rate, cost: spent, sales, profit: Math.round((sales - spent) * 100) / 100 });
    setSaved(false); setError("");
  }
  function save() {
    if (!result || saved) return;
    try {
      writeNotebookCalculation(ledgerKey, { type: "calculation", id: result.id, date: notebookToday(), category: "profit", title: t("বিক্রির লাভ–লোকসানের হিসাব", "Sale profit/loss estimate"), result: { quantityKg: result.kg, pricePerKg: result.price, recordedCost: result.cost, gross: result.sales, estimatedProfit: result.profit, assumption: t("খাতার সব খরচ এই পরিমাণ আলুর ধরা হয়েছে। ভবিষ্যতের খরচ ধরা হয়নি। এটি বিক্রি হওয়ার রেকর্ড নয়।", "All Khata expenses are counted for this quantity. Future costs are not included. This is not a completed sale.") } });
      setSaved(true); setError("");
    } catch { setError(t("সেভ হয়নি। হিসাবটি আছে—আবার চেষ্টা করুন।", "Could not save. Your calculation is still here. Please try again.")); }
  }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setResult(null); setSaved(false); setError(""); } }}>
    <DialogTrigger asChild><button type="button"><Calculator size={19}/>{t("হিসাব করুন", "Calculate profit")}</button></DialogTrigger>
    <DialogContent className={`notebook-calculator ${bn ? "font-bangla" : ""}`}>
      <DialogTitle><Calculator size={24}/>{t("বিক্রি করলে কত থাকবে?", "What would be left after selling?")}</DialogTitle>
      <DialogDescription>{t("কেজি ও দাম দিন। খাতার খরচ বাদ দিয়ে হিসাব দেখুন।", "Enter kg and price. See the result after recorded expenses.")}</DialogDescription>
      {!result ? <form onSubmit={calculate}>
        <div className="notebook-calc-fields"><label>{t("কত কেজি আলু?", "How many kg?")}<input autoFocus inputMode="decimal" maxLength={20} value={quantity} onChange={event => setQuantity(event.target.value)} required/></label><label>{t("প্রতি কেজির দাম (৳)", "Price per kg (৳)")}<input inputMode="decimal" maxLength={20} value={price} onChange={event => setPrice(event.target.value)} required/></label></div>
        <p className="notebook-calc-cost">{t("খাতায় লেখা খরচ:", "Recorded expenses:")} <strong>{money(spent)}</strong></p>
        <p>{t("খাতার সব খরচ এই আলুর ধরা হবে। সামনে আরও খরচ হলে লাভ কমবে।", "All Khata costs are counted for these potatoes. More costs will reduce profit.")}</p>
        {!hasExpenses && <p role="status">{t("আগে খাতায় চাষের খরচ লিখুন।", "Record growing expenses in Khata first.")}</p>}
        <button className="notebook-calc-primary" disabled={!hasExpenses} type="submit">{t("হিসাব দেখুন", "Calculate")}</button>
      </form> : <>
        <div className={`notebook-calc-result ${result.profit < 0 ? "is-loss" : ""}`} role="status"><p>{result.profit > 0 ? t("এই দামে আনুমানিক লাভ", "Estimated profit at this price") : result.profit < 0 ? t("এই দামে আনুমানিক লোকসান", "Estimated loss at this price") : t("খরচ উঠে আসবে", "No profit or loss")}</p><strong>{money(Math.abs(result.profit))}</strong></div>
        <dl className="notebook-calc-breakdown"><div><dt>{number(result.kg)} {t("কেজি ×", "kg ×")} {money(result.price)}</dt><dd>{money(result.sales)}</dd></div><div><dt>{t("খাতার খরচ বাদ", "Less recorded costs")}</dt><dd>{money(result.cost)}</dd></div></dl>
        <p>{t("শুধু খাতায় লেখা খরচ ধরে হিসাব—বিক্রি বা টাকা পাওয়ার রেকর্ড নয়।", "Uses only costs recorded in Khata. This is not a sale or payment record.")}</p>
        {saved ? <p className="notebook-calc-saved" role="status">{t("হিসাব খাতায় রাখা হয়েছে।", "Calculation saved to Khata.")}</p> : <div className="notebook-calc-save"><strong>{t("খাতায় রাখবেন?", "Save to Khata?")}</strong><button className="notebook-calc-primary" type="button" onClick={save}>{t("হ্যাঁ, রাখুন", "Yes, save")}</button><button type="button" onClick={() => setOpen(false)}>{t("না", "No")}</button></div>}
        <button type="button" onClick={() => { setResult(null); setError(""); }}>{t("আবার হিসাব করুন", "Calculate again")}</button>
      </>}
      {error && <p role="alert">{error}</p>}
    </DialogContent>
  </Dialog>;
}
