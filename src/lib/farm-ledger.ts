import { readRecords, writeRecord } from "@/lib/farmer-records";
import type { Json } from "@/integrations/supabase/types";

export type ExpenseCategory = "seed" | "manure" | "labour" | "irrigation" | "transport" | "other";
export type FarmExpense = { type: "expense"; id: string; date: string; category: ExpenseCategory; amount: number; note: string };
export type FarmCalculation = { type: "calculation"; id: string; date: string; category: string; title: string; inputs: Record<string, string | number>; result: Record<string, string | number> };
export type FarmLedgerEntry = FarmExpense | FarmCalculation;
export const LEDGER_EVENT = "alusathi-farm-ledger-updated";

export function ledgerKey(userId?: string) { return `alusathi-farm-ledger-v1${userId ? `-${userId}` : ""}`; }
function validEntry(value: unknown): value is FarmLedgerEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as FarmLedgerEntry;
  if (typeof entry.id !== "string" || entry.id.length > 128 || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
  if (entry.type === "expense") return ["seed", "manure", "labour", "irrigation", "transport", "other"].includes(entry.category) && Number.isFinite(entry.amount) && entry.amount > 0 && entry.amount <= 1e9 && typeof entry.note === "string" && entry.note.length <= 120;
  const safeValues = (record: unknown) => record !== null && typeof record === "object" && !Array.isArray(record) && Object.keys(record).length <= 20 && Object.values(record).every(value => typeof value === "string" ? value.length <= 160 : typeof value === "number" && Number.isFinite(value));
  return entry.type === "calculation" && typeof entry.category === "string" && entry.category.length <= 80 && typeof entry.title === "string" && entry.title.length <= 120 && safeValues(entry.inputs) && safeValues(entry.result);
}
export function readLedger(userId?: string): FarmLedgerEntry[] {
  try { const rows = JSON.parse(localStorage.getItem(ledgerKey(userId)) || "[]"); return Array.isArray(rows) ? rows.filter(validEntry).slice(0, 200) : []; }
  catch { return []; }
}
export function saveLedger(entry: FarmLedgerEntry, userId?: string): FarmLedgerEntry[] {
  if (!validEntry(entry)) throw new Error("Invalid field record.");
  const key = ledgerKey(userId); const rows = [entry, ...readLedger(userId).filter(item => item.id !== entry.id)].slice(0, 200);
  localStorage.setItem(key, JSON.stringify(rows));
  window.dispatchEvent(new Event(LEDGER_EVENT));
  if (userId) {
    const pendingKey = `${key}-pending-${entry.id}`;
    localStorage.setItem(pendingKey, JSON.stringify(entry));
    void syncLedger(userId).catch(() => {});
  }
  return rows;
}
export async function syncLedger(userId: string): Promise<FarmLedgerEntry[]> {
  const key = ledgerKey(userId);
  for (const pendingKey of Object.keys(localStorage).filter(item => item.startsWith(`${key}-pending-`))) {
    const entry = JSON.parse(localStorage.getItem(pendingKey) || "null");
    if (!validEntry(entry)) { localStorage.removeItem(pendingKey); continue; }
    await writeRecord(userId, entry.type, entry.id, entry as unknown as Json, `${entry.date}T12:00:00.000Z`);
    localStorage.removeItem(pendingKey);
  }
  const [expenses, calculations] = await Promise.all([readRecords(userId, "expense"), readRecords(userId, "calculation")]);
  const cloud = [...expenses, ...calculations].map(row => row.payload).filter(validEntry);
  const merged = [...cloud, ...readLedger(userId)].filter((entry, index, rows) => rows.findIndex(row => row.id === entry.id) === index).slice(0, 200);
  localStorage.setItem(key, JSON.stringify(merged));
  window.dispatchEvent(new Event(LEDGER_EVENT));
  return merged;
}

export function breakEven(totalCosts: number, saleableKg: number): number {
  if (!Number.isFinite(totalCosts) || totalCosts < 0 || !Number.isFinite(saleableKg) || saleableKg <= 0) throw new Error("Check costs and saleable quantity.");
  return totalCosts / saleableKg;
}

