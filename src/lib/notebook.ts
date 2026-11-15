export type Expense = { type: "expense"; id: string; date: string; category: string; amount: number; note: string };
export type Calculation = { type: "calculation"; id: string; date: string; category: string; title: string; result: Record<string, string | number> };
export type LedgerRow = Expense | Calculation;
export const ledgerKey = (userId?: string) => `alusathi-farm-ledger-v1${userId ? `-${userId}` : ""}`;
export const ledgerEvent = "alusathi-farm-ledger-updated";
export function validDay(value: string): boolean {
  const ms = Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
export function notebookToday() { return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Dhaka", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date()); }
export function amountFromText(value: string): number | null {
  const clean = value.trim().replace(/[০-৯]/g, d => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) return null;
  const amount=Number(clean); return Number.isFinite(amount) && amount > 0 && amount <= 1e9 ? amount : null;
}
function rawLedger(key: string): unknown[] {
  const value = JSON.parse(localStorage.getItem(key) || "[]");
  if (!Array.isArray(value)) throw new Error("Unreadable notebook");
  return value;
}
export function readNotebookLedger(key: string): LedgerRow[] {
  try { return rawLedger(key).filter((value): value is LedgerRow => {
    if (!value || typeof value !== "object") return false;
    const row = value as LedgerRow;
    if (typeof row.id !== "string" || typeof row.date !== "string" || !validDay(row.date)) return false;
    if (row.type === "expense") return typeof row.category === "string" && typeof row.note === "string" && Number.isFinite(row.amount) && row.amount > 0 && row.amount <= 1e9;
    return row.type === "calculation" && typeof row.title === "string" && row.result && typeof row.result === "object" && !Array.isArray(row.result) && Object.values(row.result).every(v => typeof v === "string" || (typeof v === "number" && Number.isFinite(v)));
  }); } catch { return []; }
}
export function writeNotebookExpense(key: string, entry: Expense) {
  if (!validDay(entry.date) || entry.date > notebookToday() || !["seed","manure","labour","irrigation","transport","other"].includes(entry.category) || !Number.isFinite(entry.amount) || entry.amount <= 0 || entry.amount > 1e9 || entry.note.length > 120) throw new Error("Invalid expense");
  const rows=rawLedger(key).filter(item => !(item && typeof item === "object" && "id" in item && item.id === entry.id));
  localStorage.setItem(key, JSON.stringify([entry,...rows])); window.dispatchEvent(new Event(ledgerEvent));
}
export function deleteNotebookExpense(key: string, id: string) {
  localStorage.setItem(key, JSON.stringify(rawLedger(key).filter(item => !(item && typeof item === "object" && "id" in item && item.id === id))));
  window.dispatchEvent(new Event(ledgerEvent));
}
export function writeNotebookCalculation(key: string, entry: Calculation) {
  if (!validDay(entry.date) || entry.date > notebookToday() || !entry.id || entry.category !== "profit" || Object.values(entry.result).some(value => typeof value === "number" ? !Number.isFinite(value) : typeof value !== "string")) throw new Error("Invalid calculation");
  const rows = rawLedger(key).filter(item => !(item && typeof item === "object" && "id" in item && item.id === entry.id));
  localStorage.setItem(key, JSON.stringify([entry, ...rows]));
  window.dispatchEvent(new Event(ledgerEvent));
}
export function readableCalculation(result: Record<string,string|number>, bn: boolean): string[] {
  const names: Record<string,[string,string,string]> = {
    areaM2:["জমি","Field","m²"], area:["জমি","Field",""], manure:["পচা গোবর","Rotted cow dung","kg"], manureKg:["পচা গোবর","Rotted cow dung","kg"], urea:["ইউরিয়া","Urea","kg"], ureaKg:["ইউরিয়া","Urea","kg"], tsp:["টিএসপি","TSP","kg"], tspKg:["টিএসপি","TSP","kg"], mop:["পটাশ","Potash","kg"], mopKg:["পটাশ","Potash","kg"], potash:["পটাশ","Potash","kg"], gypsum:["জিপসাম","Gypsum","kg"], gypsumKg:["জিপসাম","Gypsum","kg"], lowKg:["কম ফলনের হিসাব","Low yield estimate","kg"], estimateKg:["মাঝারি হিসাব","Estimated yield","kg"], highKg:["বেশি ফলনের হিসাব","High yield estimate","kg"], amount:["পরিমাণ","Amount",""], unit:["একক","Unit",""], gross:["মোট বিক্রির হিসাব","Estimated sale value","৳"], sellingCosts:["বিক্রির খরচ","Selling costs","৳"], takeHome:["হাতে থাকার হিসাব","Estimated money after costs","৳"], estimatedProfit:["সম্ভাব্য লাভ","Estimated profit","৳"], amountPerTank:["প্রতি ট্যাংকে","Per tank",""], amountPerLitre:["প্রতি লিটারে","Per litre",""], totalProduct:["মোট পণ্য","Total product",""], tanks:["ট্যাংক","Tanks",""]
  };
  Object.assign(names, { quantityKg:["আলুর পরিমাণ","Potato quantity","kg"], pricePerKg:["প্রতি কেজির দাম","Price per kg","৳"], recordedCost:["খাতায় লেখা খরচ","Recorded expenses","৳"], assumption:["হিসাবে যা ধরা হয়েছে","Calculation basis",""] });
  return Object.entries(result).map(([key,value])=>{
    const label=names[key]; const display=typeof value === "number" ? value.toLocaleString(bn?"bn-BD":"en-GB",{maximumFractionDigits:2}) : String(value).slice(0,300);
    return `${label ? label[bn?0:1] : key}: ${display}${label?.[2] ? ` ${label[2]==="kg" && bn ? "কেজি" : label[2]}` : ""}`;
  });
}
