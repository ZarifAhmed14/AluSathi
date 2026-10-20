import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, Check, CloudRain, Droplets, Eye, Flower2, Image, Leaf, PackageCheck, PhoneCall, Sprout, Volume2, WifiOff, X } from "lucide-react";
import type { WeatherData } from "@/lib/api";
import { cropAge, cropGuidance, plantingAges, rangeGuidance, type PlantingAge } from "@/lib/crop-advice";
import { spreadOutlook } from "@/lib/farmer-tools";
import { localToday } from "@/lib/local-date";
import { useLanguage } from "@/contexts/LanguageContext";
import { readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";
import type { ReactNode } from "react";
import { PHOTO_DEMO_CASES } from "@/lib/photo-demo-cases";

type CheckinPreview = { createdAt: string; thumbnails: string[] };
const ALERT_SEEN_KEY = "alusathi-weather-alert-seen-v1";
const ageIcons = { lt30: Sprout, "30to60": Leaf, "60to90": Flower2, gt90: PackageCheck };

function ageBand(age: number | null, range: PlantingAge | ""): PlantingAge | "" {
  if (age === null) return range;
  if (age < 30) return "lt30";
  if (age < 60) return "30to60";
  if (age < 90) return "60to90";
  return "gt90";
}

export default function FarmerToday({ weather, loading, district, districts, plantingDate, onPhoto, lastCheckin, photoFlow, photoOpen, onClosePhoto, demoResult, onClearDemo }: {
  weather: WeatherData | null; loading: boolean; district: string; districts: Record<string, string>;
  plantingDate: string; onPhoto: () => void; lastCheckin?: CheckinPreview;
  photoFlow?: ReactNode; photoOpen?: boolean; onClosePhoto?: () => void;
  demoResult?: typeof PHOTO_DEMO_CASES[number] | null; onClearDemo?: () => void;
}) {
  const { language } = useLanguage(); const bn = language === "bn";
  const [range, setRange] = useState<PlantingAge | "">(() => {
    const value = localStorage.getItem("alusathi-planting-age");
    return plantingAges.includes(value as PlantingAge) ? value as PlantingAge : "";
  });
  const [recorded, setRecorded] = useState(() => localStorage.getItem("alusathi-planting-age-recorded") || "");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [actions, setActions] = useState(readFieldActions);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [seenAlert, setSeenAlert] = useState(() => localStorage.getItem(ALERT_SEEN_KEY) || "");

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
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
  const riskId = risk?.high ? risk.days.map(day => `${day.date}:${day.humid_hours}`).join("|") : "";
  const showRisk = hasPlanting && Boolean(riskId) && seenAlert !== riskId;
  const currentBand = ageBand(age, approximate ? range : "");
  const stage = age !== null ? `${bn ? `লাগানোর ${age.toLocaleString("bn-BD")} দিন` : `Day ${age}`} · ${advice.stage}` : approximate?.stage;
  const number = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 1 });

  const tasks = useMemo(() => {
    const rows = [
      weather && (weather.rainfall > 0 || (weather.forecastRainMm ?? 0) > 0) && {
        tone: "info" as const, Icon: Droplets,
        text: bn ? "জমিতে পানি জমেছে কি না দেখুন।" : "Check whether water is standing in the field.",
        why: bn ? "আজকের আবহাওয়ায় বৃষ্টির তথ্য আছে।" : "Today's weather includes rain.",
      },
      {
        tone: "calm" as const, Icon: Eye,
        text: bn ? "জমির একই জায়গার কয়েকটি গাছ দেখে রাখুন।" : "Check a few plants in the same part of the field.",
        why: bn ? "একই জায়গা নিয়মিত দেখলে নতুন পরিবর্তন বোঝা সহজ।" : "Checking the same place makes changes easier to notice.",
      },
    ].filter((row): row is { tone: "info" | "calm"; Icon: typeof Droplets | typeof Eye; text: string; why: string } => Boolean(row));
    return rows.slice(0, 2);
  }, [weather, bn]);

  const saveActions = (next: FieldAction[]) => { saveFieldActions(next); setActions(next); };
  const actionKey = (text: string) => `${localToday()}|${text}`;
  const completed = new Set(actions.filter(action => action.date === localToday()).map(action => actionKey(action.text)));
  const toggleTask = (text: string) => {
    const key = actionKey(text);
    if (completed.has(key)) saveActions(actions.filter(action => actionKey(action.text) !== key));
    else saveActions([{ id: crypto.randomUUID(), date: localToday(), text, district, kind: "task" as const }, ...actions].slice(0, 100));
  };
  const choose = (value: PlantingAge) => {
    setRange(value); setRecorded(localToday());
    localStorage.setItem("alusathi-planting-age", value); localStorage.setItem("alusathi-planting-age-recorded", localToday());
  };
  const acknowledgeAlert = () => {
    if (!riskId) return;
    const text = bn ? "সতর্কতা দেখে জমি পরীক্ষা করেছি; এখন সমস্যা দেখিনি।" : "Checked the field after the alert; no problem seen now.";
    saveActions([{ id: crypto.randomUUID(), date: localToday(), text, district, kind: "observation" as const }, ...actions].slice(0, 100));
    localStorage.setItem(ALERT_SEEN_KEY, riskId); setSeenAlert(riskId);
  };
  const checkinDays = lastCheckin ? Math.max(0, Math.floor((Date.now() - Date.parse(lastCheckin.createdAt)) / 86_400_000)) : null;
  const checkinLabel = checkinDays === null ? (bn ? "এখনও কোনো ছবি রাখা হয়নি" : "No photos recorded yet")
    : checkinDays === 0 ? (bn ? "শেষ ছবি আজ" : "Last photo today")
      : bn ? `শেষ ছবি ${checkinDays.toLocaleString("bn-BD")} দিন আগে` : `Last photo ${checkinDays} day${checkinDays === 1 ? "" : "s"} ago`;
  const weatherFetchedAt = weather?.observed_at && Number.isFinite(Date.parse(weather.observed_at)) ? Date.parse(weather.observed_at) : null;
  const weatherStale = weatherFetchedAt === null || Date.now() - weatherFetchedAt > 6 * 3600_000;
  const weatherStatus = weather?.cached
    ? (weatherStale ? (bn ? "ক্যাশে · পুরোনো" : "cached · stale") : (bn ? "ক্যাশে" : "cached"))
    : weatherStale ? (bn ? "পুরোনো তথ্য" : "stale") : (bn ? "হালনাগাদ" : "current");

  return <><div className="farmer-field-scene" aria-hidden="true">
    {["one", "two", "three", "four", "five"].map(name => <img key={name} className={`field-leaves field-leaves-${name}`} src="/field-potato-leaves.webp" alt="" />)}
    {["one", "two"].map(name => <img key={name} className={`field-tree field-tree-${name}`} src="/field-tree-canopy.webp" alt="" />)}
    <span className="field-bird field-bird-one"><svg viewBox="0 0 62 28" fill="none"><path d="M2 20 Q9 11 17 19 Q25 11 32 20 M29 9 Q35 2 41 9 Q48 2 54 10" /></svg></span><span className="field-bird field-bird-two"><svg viewBox="0 0 62 28" fill="none"><path d="M2 21 Q15 2 30 17 Q45 2 60 21" /></svg></span>
  </div><section className="app-shell farmer-today" aria-label={bn ? "আজকের কাজ" : "Today's work"}>
    <div className="today-titlebar">
      <div className="farmer-greeting"><div><h1>{bn ? "আজকের কাজ" : "Today's work"}</h1><p>{bn ? "আজ জমিতে কী করবেন—শুধু দরকারি কাজগুলো।" : "Only what your field needs today."}</p></div></div>
    </div>

    <div className="today-layout"><div className="today-primary-column"><div className="farmer-day-card">
      <div className="field-card-heading"><div className="field-card-identity"><span>{bn ? "আমার জমি" : "My field"}</span><strong>{districts[district] || district}</strong></div><div className="field-card-actions">{stage && <span className="farmer-stage"><strong>{stage}</strong></span>}{stage && bn && voice && <button className="farmer-listen" onClick={() => { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance([stage, ...tasks.map(item => item.text)].join("। ")); utterance.voice = voice; utterance.lang = voice.lang; speechSynthesis.speak(utterance); }}><Volume2 size={17} />শুনুন</button>}</div></div>
      {currentBand && <div className="growth-stage-strip" aria-label={bn ? "গাছের আনুমানিক বয়স" : "Approximate crop age"}>{plantingAges.map(value => { const AgeIcon = ageIcons[value]; return <span key={value} aria-current={currentBand === value ? "step" : undefined}><AgeIcon size={17} />{rangeGuidance(value, bn).stage.replace(bn ? "প্রায় " : "Approximately ", "")}</span>; })}</div>}
      {age === null && !approximate && <fieldset className="planting-choices"><legend>{stale ? (bn ? "এখন গাছের বয়স কত? আবার বেছে নিন।" : "How old is the crop now? Update your estimate.") : (bn ? "কবে আলু লাগিয়েছেন?" : "When did you plant?")}</legend>{plantingAges.map(value => { const AgeIcon = ageIcons[value]; return <button key={value} aria-pressed={range === value} onClick={() => choose(value)}><AgeIcon size={17} />{rangeGuidance(value, bn).stage.replace(bn ? "প্রায় " : "Approximately ", "")}</button>; })}<small>{bn ? "না জানলে আপাতত বাদ দিন।" : "Not sure? Skip for now."}</small></fieldset>}
      {hasPlanting && <details className="today-more-tasks"><summary>{bn ? "সাধারণ মাঠ-চেক" : "Routine field checks"}</summary><div className="today-task-list">{tasks.map(item => { const done = completed.has(actionKey(item.text)); const { tone, Icon } = item; return <div className={`today-task ${tone} ${done ? "done" : ""}`} key={item.text}><label><input type="checkbox" checked={done} onChange={() => toggleTask(item.text)} /><span className="task-check" aria-hidden="true">{done ? <Check size={20} /> : <Icon size={21} />}</span><strong>{item.text}</strong></label><details><summary>{bn ? "কেন?" : "Why?"}</summary><p>{item.why}</p></details></div>; })}</div></details>}
      <div className="today-photo-action">
        <div><span className="today-photo-mark"><Leaf size={21} /></span><span><strong>{bn ? "আলুর ছবি দিন" : "Add a potato photo"}</strong><small>{bn ? "ছবি বা নমুনা বেছে নিয়ে দৃশ্যমান লক্ষণ দেখুন।" : "Choose a photo or sample to review visible signs."}</small></span></div>
        <button className="main-button" onClick={onPhoto}><Camera size={18} />{bn ? "ছবি স্ক্যানার খুলুন" : "Open photo scanner"}</button>
      </div>
      {demoResult && <article className="today-demo-result" aria-live="polite"><img src={demoResult.image} alt={bn ? "নমুনা আলুর ছবি" : "Potato sample"} /><div><div className="today-demo-result-heading"><small>{bn ? `নমুনা ${demoResult.id.slice(-1)} · উদাহরণ ফল` : `Sample ${demoResult.id.slice(-1)} · example result`}</small><button className="text-button" type="button" onClick={onClearDemo} aria-label={bn ? "নমুনা ফল বন্ধ করুন" : "Dismiss sample result"}><X size={18} /></button></div><h3>{demoResult[bn ? "bn" : "en"].title}</h3><p>{demoResult[bn ? "bn" : "en"].body}</p><p className="today-demo-action"><strong>{bn ? "করণীয়" : "What to do"}</strong>{demoResult[bn ? "bn" : "en"].action}</p></div></article>}
      {lastCheckin && <button className="last-checkin-strip" onClick={onPhoto}><span className="checkin-thumbnails" aria-hidden="true">{lastCheckin.thumbnails.length ? lastCheckin.thumbnails.slice(0, 3).map((src, index) => <img key={index} src={src} alt="" />) : <i><Image size={21} /></i>}</span><span><strong>{checkinLabel}</strong><small>{bn ? "ছবি ও লক্ষণ দেখতে চাপুন" : "Open photos and symptoms"}</small></span><Camera size={20} /></button>}
      {photoOpen && <div className="today-inline-photo"><div className="today-inline-photo-heading"><div><strong>{bn ? "পাতার ছবি ও লক্ষণ" : "Leaf photo and visible signs"}</strong><small>{bn ? "শুধু ছবি থেকে রোগ নির্ণয় করা হয় না।" : "A photo alone is not used to diagnose disease."}</small></div><button className="text-button" onClick={onClosePhoto}>{bn ? "বন্ধ করুন" : "Close"}</button></div>{photoFlow}</div>}
    </div>

    {showRisk && <div className="field-risk-banner" role="status"><div className="risk-copy"><AlertTriangle size={23} /><div><strong>{bn ? "আর্দ্র আবহাওয়ার সতর্কতা" : "Humid-weather alert"}</strong><p>{bn ? "পাতা ও কাছের গাছ দেখে নিন। এটি রোগ নির্ণয় নয়।" : "Check leaves and nearby plants. This is not a diagnosis."}</p></div></div><figure className="humidity-chart"><div>{risk?.days.slice(0, 3).map(day => <span key={day.date}><i style={{ height: `${Math.max(6, day.humid_hours / 24 * 100)}%` }} /><small>{number(day.humid_hours)}{bn ? "ঘ" : "h"}</small></span>)}<b style={{ bottom: "25%" }} /></div><figcaption>{bn ? "৯০%+ আর্দ্রতার ঘণ্টা · সীমা ৬ ঘণ্টা" : "Hours at 90%+ humidity · threshold 6h"}</figcaption></figure><div className="risk-actions"><button onClick={onPhoto}>{bn ? "ছবি দিন" : "Add photo"}</button><button className="risk-dismiss" onClick={acknowledgeAlert}>{bn ? "দেখেছি, সমস্যা নেই" : "Checked, no problem"}</button></div></div>}
    </div>

    <aside className="today-utility-rail" aria-label={bn ? "দ্রুত সাহায্য" : "Quick help"}><p>{bn ? "কৃষি পরামর্শ" : "Agricultural advice"}</p><a className="secondary-main today-helpline" href="tel:16123"><PhoneCall />{bn ? "কৃষি কল সেন্টার · ১৬১২৩" : "Agriculture helpline · 16123"}</a>
    <div className="weather-chip" aria-live="polite"><CloudRain size={20} /><strong>{bn ? "আবহাওয়া" : "Weather"}</strong><span>{weather ? `${number(Math.round(weather.temperature))}° · ${bn ? "আর্দ্রতা" : "Humidity"} ${number(Math.round(weather.humidity))}%` : loading ? (bn ? "আবহাওয়া আসছে…" : "Loading weather…") : (bn ? "আবহাওয়া পাওয়া যায়নি" : "Weather unavailable")}</span>{weather && <small>{weatherFetchedAt ? (bn ? `তথ্য: ${new Date(weatherFetchedAt).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}` : `Fetched ${new Date(weatherFetchedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}`) : (bn ? "সময় অজানা" : "Fetch time unknown")} · {weatherStatus}</small>}</div>
    {!online && <p className="offline-status" role="status"><WifiOff size={18} />{bn ? "অফলাইনে আছেন — ছবি ফোনে সেভ হবে" : "You are offline — photos will be saved on this phone"}</p>}</aside></div>
  </section></>;
}
