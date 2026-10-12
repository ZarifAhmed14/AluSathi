import type { WeatherData } from "./api";
import { spreadOutlook } from "./farmer-tools";

export type PlantingAge = "lt30" | "30to60" | "60to90" | "gt90";
export const plantingAges: PlantingAge[] = ["lt30", "30to60", "60to90", "gt90"];
// TODO(expert): Have local agronomists approve age-range task wording before field use.
export function rangeGuidance(range: PlantingAge, bn: boolean) {
  const stages = { lt30: ["প্রায় ১ মাসের কম", "Approximately under 1 month"], "30to60": ["প্রায় ১–২ মাস", "Approximately 1–2 months"], "60to90": ["প্রায় ২–৩ মাস", "Approximately 2–3 months"], gt90: ["প্রায় ৩ মাসের বেশি", "Approximately over 3 months"] };
  const tasks = {
    lt30: ["অঙ্কুর ও গাছের বৃদ্ধি দেখুন। জমিতে পানি জমতে দেবেন না।", "Check emergence and plant growth. Keep drainage clear."],
    "30to60": ["মাটির ওপরে আলু বের হলে ঢাকুন; পাতায় দাগ দেখুন। সার দেওয়ার সময় স্থানীয় পরামর্শ মিলিয়ে নিন।", "Cover exposed tubers and check leaf spots. Confirm fertilizer timing with local advice."],
    "60to90": ["মাটির আর্দ্রতা ও গাছের অবস্থা দেখুন। জাত ও জমি দেখে তোলার প্রস্তুতি নিন।", "Check soil moisture and foliage. Plan harvest according to variety and field condition."],
    gt90: ["পাতা শুকাচ্ছে কি না দেখুন। বয়সের অনুমান দিয়ে তোলার দিন ঠিক করবেন না।", "Check foliage dieback. Do not choose a harvest date from estimated age alone."],
  };
  return { stage: stages[range][bn ? 0 : 1], task: tasks[range][bn ? 0 : 1] };
}

export function cropAge(plantingDate: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plantingDate)) return null;
  const planted = new Date(`${plantingDate}T12:00:00`);
  if (Number.isNaN(planted.getTime()) || planted.toISOString().slice(0, 10) !== plantingDate) return null;
  const days = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(planted.getFullYear(), planted.getMonth(), planted.getDate())) / 86_400_000);
  return days >= 0 && days <= 180 ? days : null;
}

export function cropGuidance(days: number | null, weather: WeatherData | null, bn: boolean) {
  const stage = days === null ? (bn ? "চাষের তারিখ দিন" : "Add planting date")
    : days < 15 ? (bn ? "অঙ্কুর বের হওয়ার সময়" : "Emergence")
    : days < 35 ? (bn ? "গাছ বাড়ার সময়" : "Growing foliage")
    : days < 65 ? (bn ? "আলু ধরার সময়" : "Tuber formation")
    : (bn ? "আলু বড় হওয়ার সময়" : "Bulking / maturity");
  const reminders = days === null ? [] : [
    days < 15 ? (bn ? "অঙ্কুর উঠছে কি না দেখুন; পানি জমলে নালা খুলুন।" : "Check for shoots; clear standing water.") : null,
    days >= 15 && days < 35 ? (bn ? "গাছ উঠলে সার ও মাটি তোলার সময় স্থানীয় পরামর্শ মিলিয়ে নিন—জমি না দেখে পরিমাণ বলা যায় না।" : "After emergence, check your local fertilizer and earthing-up plan; dosage depends on your field.") : null,
    days >= 35 && days < 65 ? (bn ? "মাটির ওপরে আলু বের হলে ঢেকে দিন; পাতায় দাগ আছে কি না দেখুন।" : "Cover exposed tubers and check leaves for spots.") : null,
    days >= 65 ? (bn ? "পাতা শুকাচ্ছে কি না দেখুন; তোলার দিন জাত ও জমির অবস্থা দেখে ঠিক করুন।" : "Watch for foliage dieback; decide harvest timing from variety and field condition.") : null,
  ].filter((value): value is string => Boolean(value));
  if (!weather || weather.cached) return { stage, reminders, weatherAction: bn ? "তাজা আবহাওয়া পেলে জমি অনুযায়ী পরামর্শ দেখা যাবে।" : "Fresh weather is needed for field advice." };
  const wet = weather.rainfall > 0 || (weather.forecastRainMm ?? 0) >= 10;
  const blightConditions = Boolean(spreadOutlook(weather)?.high);
  const weatherAction = wet
    ? days !== null && days >= 15 && days < 35
      ? (bn ? "বৃষ্টির সম্ভাবনা আছে। সার বা মাটি তোলার কাজের আগে জমি শুকিয়েছে কি না দেখুন।" : "Rain is possible. Check that the field has dried before top dressing or earthing up.")
      : days !== null && days >= 65
        ? (bn ? "বৃষ্টি হতে পারে। আলু তোলার আগে মাটি ও আবহাওয়া দেখে দিন ঠিক করুন।" : "Rain is possible. Check soil and forecast before setting a harvest day.")
        : (bn ? "বৃষ্টির পর জমিতে পানি জমেছে কি না দেখুন; সেচ দেওয়ার আগে মাটি দেখুন।" : "After rain, check drainage and soil before irrigating.")
    : blightConditions
      ? (bn ? "আর্দ্র আবহাওয়া। পাতায় দাগ আছে কি না দেখুন, বিশেষ করে নিচের পাতায়।" : "Humid conditions: check lower leaves for blight-like spots.")
      : days !== null && days >= 35 && weather.temperature >= 30
        ? (bn ? "গরম পড়ছে। মাটি শুকালে সেচের প্রয়োজন আছে কি না দেখুন।" : "Warm weather: check soil moisture before irrigation.")
        : (bn ? "আজ বড় আবহাওয়া-সতর্কতা নেই। তবু নিয়মিত জমি ও গাছ দেখুন।" : "No major weather signal today. Still check the field and plants regularly.");
  return { stage, reminders, weatherAction };
}
