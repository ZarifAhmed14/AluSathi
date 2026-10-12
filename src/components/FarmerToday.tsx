import { useEffect, useState } from "react";
import { Camera, PhoneCall, Volume2 } from "lucide-react";
import type { WeatherData } from "@/lib/api";
import { cropAge, cropGuidance, plantingAges, rangeGuidance, type PlantingAge } from "@/lib/crop-advice";
import { spreadOutlook } from "@/lib/farmer-tools";
import { localToday } from "@/lib/local-date";
import { useLanguage } from "@/contexts/LanguageContext";
import TreatmentReminders from "./TreatmentReminders";

export default function FarmerToday({ weather, loading, district, districts, setDistrict, plantingDate, setPlantingDate, onPhoto }: {
  weather: WeatherData | null; loading: boolean; district: string; districts: Record<string, string>;
  setDistrict: (value: string) => void; plantingDate: string; setPlantingDate: (value: string) => void; onPhoto: () => void;
}) {
  const { language } = useLanguage(); const bn = language === "bn";
  const [range, setRange] = useState<PlantingAge | "">(() => {
    const value = localStorage.getItem("alusathi-planting-age");
    return plantingAges.includes(value as PlantingAge) ? value as PlantingAge : "";
  });
  const [recorded, setRecorded] = useState(() => localStorage.getItem("alusathi-planting-age-recorded") || "");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => setVoice(speechSynthesis.getVoices().find(v => /^bn(?:-|_)/i.test(v.lang) || v.lang === "bn") || null);
    refresh(); speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => { speechSynthesis.removeEventListener("voiceschanged", refresh); speechSynthesis.cancel(); };
  }, []);
  const age = cropAge(plantingDate);
  const elapsed = cropAge(recorded);
  const stale = Boolean(range) && (elapsed === null || elapsed >= 30);
  const approximate = age === null && range && !stale ? rangeGuidance(range, bn) : null;
  const advice = cropGuidance(age, weather, bn);
  const risk = spreadOutlook(weather);
  const hasPlanting = age !== null || Boolean(approximate);
  const showRisk = hasPlanting && Boolean(risk?.high);
  const number = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 1 });
  const weatherText = !risk ? (bn ? "আবহাওয়া দিয়ে রোগের ঝুঁকি যাচাইয়ের পর্যাপ্ত নতুন তথ্য নেই। নিয়মিত গাছ ও জমি দেখুন।" : "Not enough fresh data to assess weather-based disease risk. Keep checking your plants and field.") : risk.high ? (bn ? "নাবি ধসার অনুকূল আবহাওয়া। নিচের পাতা ও কাছের গাছ দেখুন।" : "Weather favours late blight. Check lower leaves and nearby plants.") : advice.weatherAction;
  const stage = age !== null ? `${bn ? `লাগানোর ${age.toLocaleString("bn-BD")} দিন` : `Day ${age}`} · ${advice.stage}` : approximate?.stage;
  const task = approximate?.task || advice.reminders[0];
  const choose = (value: PlantingAge) => {
    setRange(value); setRecorded(localToday());
    localStorage.setItem("alusathi-planting-age", value); localStorage.setItem("alusathi-planting-age-recorded", localToday());
  };
  return <section className="app-shell farmer-today" aria-label={bn ? "আজকের কাজ" : "Today's work"}>
    <div className="farmer-greeting"><div><p className="section-kicker">{bn ? "আমার আলুর জমি" : "MY POTATO FIELD"}</p><h1>{bn ? "আজকের কাজ" : "Today's work"}</h1></div><img src="/alusathi-farmer-harvest-hero.webp" alt="" /></div>
    <div className="farmer-day-card">
      <strong className="field-card-title">{bn ? `আমার আলুর জমি · ${districts[district] || district}` : `My potato field · ${district}`}</strong>
      {stage && <div className="farmer-stage"><strong>{stage}</strong><p>{task}</p></div>}
      {age === null && !approximate && <fieldset className="planting-choices"><legend>{stale ? (bn ? "এখন গাছের বয়স কত? আবার বেছে নিন।" : "How old is the crop now? Update your estimate.") : (bn ? "কবে আলু লাগিয়েছেন?" : "When did you plant?")}</legend>{plantingAges.map(value => <button key={value} onClick={() => choose(value)}>{rangeGuidance(value, bn).stage.replace(bn ? "প্রায় " : "Approximately ", "")}</button>)}<small>{bn ? "না জানলে আপাতত বাদ দিন। আবহাওয়া ও ছবি দেখা যাবে।" : "Not sure? Skip for now. Weather and photo help still work."}</small></fieldset>}
      {bn && voice && stage && <button className="farmer-listen" onClick={() => { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance([stage, task].filter(Boolean).join("। ")); utterance.voice = voice; utterance.lang = voice.lang; speechSynthesis.speak(utterance); }}><Volume2 size={17} />শুনুন</button>}
    </div>
    {showRisk && <div className="field-risk-banner" role="status"><span>{bn ? "আর্দ্র আবহাওয়া: নিচের পাতা ও কাছের গাছ দেখুন।" : "Humid weather: check lower leaves and nearby plants."}</span><button onClick={onPhoto}>{bn ? "ছবি দিন" : "Add a photo"}</button></div>}
    <div className="farmer-main-actions"><button className="main-button" onClick={onPhoto}><Camera />{bn ? "পাতায় সমস্যা? ছবি দিন" : "Leaf problem? Add a photo"}</button><a className="secondary-main" href="tel:16123"><PhoneCall />{bn ? "কৃষি কল সেন্টার · ১৬১২৩" : "Agriculture helpline · 16123"}</a></div>
    <details className="weather-chip"><summary><span>{weather ? `${number(Math.round(weather.temperature))}° · ${bn ? "আর্দ্রতা" : "Humidity"} ${number(Math.round(weather.humidity))}%` : loading ? (bn ? "আবহাওয়া আসছে…" : "Loading weather…") : (bn ? "আবহাওয়া পাওয়া যায়নি" : "Weather unavailable")}</span>{showRisk && <b className="risk-badge">{bn ? "ঝুঁকি বেশি" : "Higher risk"}</b>}</summary><div className="weather-chip-body"><label>{bn ? "জেলা" : "District"}<select aria-label={bn ? "জেলা" : "District"} value={district} onChange={e => setDistrict(e.target.value)}>{Object.entries(districts).map(([id, name]) => <option key={id} value={id}>{bn ? name : id}</option>)}</select></label>{weather && <p>{bn ? "এখন বৃষ্টি" : "Rain now"} {number(weather.rainfall)} {bn ? "মিমি" : "mm"}</p>}{weather?.cached && <p className="tool-notice">{bn ? "পুরোনো আবহাওয়া — নতুন তথ্য এলে পরামর্শ হালনাগাদ হবে।" : "Cached weather — advice needs fresh data."}</p>}<p>{weatherText}</p>{weather && !weather.cached && <details className="farmer-forecast"><summary>{bn ? "পূর্বাভাস ও সতর্কতা" : "Forecast and alerts"}</summary>{!risk && <p>{bn ? "রোগের আবহাওয়া-ঝুঁকি যাচাইয়ের পর্যাপ্ত তথ্য নেই।" : "Insufficient data for the weather-based disease-risk check."}</p>}{weather.alerts?.map((a, i) => <p key={i}>{new Date(`${a.date}T12:00:00`).toLocaleDateString(bn ? "bn-BD" : "en-GB")} · {({ heavy_rain: bn ? "ভারী বৃষ্টি — নালা দেখুন" : "Heavy rain — check drainage", strong_wind: bn ? "দমকা হাওয়া — মাঠে সতর্ক থাকুন" : "Strong wind — take care outdoors", extreme_heat: bn ? "তীব্র গরম — মাটির আর্দ্রতা দেখুন" : "Extreme heat — check soil moisture", cold: bn ? "ঠান্ডা — গাছের অবস্থা দেখুন" : "Cold — check plants", thunderstorm: bn ? "বজ্রঝড় — নিরাপদ জায়গায় থাকুন" : "Thunderstorm — stay sheltered" })[a.type]}</p>)}{weather.forecast?.map(day => <p key={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric" })} · {number(Math.round(day.minimum))}–{number(Math.round(day.maximum))}° · {bn ? "বৃষ্টি" : "Rain"} {number(day.rainMm)} {bn ? "মিমি" : "mm"}</p>)}</details>}</div></details>
    <div className="field-secondary"><details className="planting-edit"><summary>{bn ? "চাষের সময় যোগ / বদলান" : "Add / change planting time"}</summary><label>{bn ? "সঠিক তারিখ জানা থাকলে (ঐচ্ছিক)" : "Exact date, if known (optional)"}<input aria-label={bn ? "লাগানোর সঠিক তারিখ" : "Exact planting date"} type="date" value={plantingDate} max={localToday()} onChange={e => { setPlantingDate(e.target.value); localStorage.setItem("alusathi-planting-date", e.target.value); }} /></label>{age === null && <div className="planting-choices">{plantingAges.map(value => <button key={value} aria-pressed={range === value} onClick={() => choose(value)}>{rangeGuidance(value, bn).stage}</button>)}</div>}{age !== null && <small>{bn ? "এই সঠিক তারিখ থেকেই হিসাব হচ্ছে। আনুমানিক বয়স দিতে তারিখ মুছুন।" : "Using this exact date. Clear it to use an age range."}</small>}</details><TreatmentReminders compact /></div>
    <a className="field-history-link" href="#diary">{bn ? "আগের ছবি ও লক্ষণ" : "Previous photos and symptoms"}</a>
  </section>;
}
