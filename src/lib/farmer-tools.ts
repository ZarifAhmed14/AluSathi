import type { WeatherData } from "./api";

export type AreaUnit = "decimal" | "acre" | "hectare" | "bigha";
export function areaSquareMetres(area: number, unit: AreaUnit, decimalsPerBigha = 33): number {
  if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(decimalsPerBigha) || decimalsPerBigha <= 0) throw new Error("Enter a positive area.");
  const factors = { decimal: 40.468564224, acre: 4046.8564224, hectare: 10000, bigha: decimalsPerBigha * 40.468564224 };
  return area * factors[unit];
}

export const potatoFertilizerRates = [
  { key: "manure", rate: 10000, bn: "পচা গোবর", en: "Well-rotted cow dung" },
  { key: "urea", rate: 350, bn: "ইউরিয়া", en: "Urea" },
  { key: "tsp", rate: 100, bn: "টিএসপি", en: "TSP" },
  { key: "mp", rate: 210, bn: "এমপি (পটাশ)", en: "MP (potash)" },
  { key: "gypsum", rate: 84, bn: "জিপসাম", en: "Gypsum" },
] as const;

export function potatoFertilizerEstimate(areaM2: number) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) throw new Error("Enter a positive area.");
  return potatoFertilizerRates.map(item => ({ ...item, amountKg: item.rate * areaM2 / 10000 }));
}

export function dosageAmount(areaM2: number, labelRate: number, basis: "hectare" | "decimal" | "litre", waterLitres: number): number {
  if (![areaM2, labelRate, waterLitres].every(Number.isFinite) || areaM2 < 0 || (basis !== "litre" && areaM2 <= 0) || labelRate <= 0 || waterLitres < 0) throw new Error("Check the label rate and quantity.");
  if (basis === "litre" && waterLitres <= 0) throw new Error("Enter water volume.");
  return labelRate * (basis === "litre" ? waterLitres : areaM2 / (basis === "hectare" ? 10000 : 40.468564224));
}

export function sampleYield(areaM2: number, sampleM2: number, weights: number[]) {
  if (!Number.isFinite(areaM2) || !Number.isFinite(sampleM2) || areaM2 <= 0 || sampleM2 <= 0 || sampleM2 > areaM2 || weights.length < 3 || weights.some(w => !Number.isFinite(w) || w <= 0)) throw new Error("Measure at least three equal sample plots.");
  const scale = areaM2 / sampleM2;
  return { low: Math.min(...weights) * scale, high: Math.max(...weights) * scale, estimate: weights.reduce((a, b) => a + b, 0) / weights.length * scale };
}

export function spreadOutlook(weather: WeatherData | null) {
  if (!weather || weather.cached || !weather.observed_at || !Number.isFinite(Date.parse(weather.observed_at)) || Date.now() - Date.parse(weather.observed_at) > 6 * 3600_000 || !weather.blight_days?.length) return null;
  const days = weather.blight_days;
  const qualifies = (day: typeof days[number]) => day.hours === 24 && day.minimum >= 10 && day.humid_hours >= 6;
  const high = days.some((day, i) => i > 0 && qualifies(day) && qualifies(days[i - 1]) && Date.parse(day.date) - Date.parse(days[i - 1].date) === 86400_000);
  return { high, days };
}

export function downloadFile(name: string, content: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function calendarReminder(title: string, due: string) {
  const start = new Date(due);
  if (!title.trim() || !Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) throw new Error("Choose a future time.");
  const date = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AluSathi//Farmer reminder//EN", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@alusathi`, `DTSTAMP:${date(new Date())}`, `DTSTART:${date(start)}`, `DTEND:${date(new Date(start.getTime() + 15 * 60000))}`, `SUMMARY:${escape(title.trim().slice(0, 120))}`, "DESCRIPTION:Follow the treatment plan confirmed by your agricultural adviser.", "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:AluSathi reminder", "END:VALARM", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
