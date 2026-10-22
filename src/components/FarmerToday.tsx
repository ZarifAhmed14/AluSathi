import { useEffect, useMemo, useState } from "react";
import { Camera, Check, CloudRain, Droplets, Eye, Image, Leaf, PhoneCall, Volume2, WifiOff, X } from "lucide-react";
import type { WeatherData } from "@/lib/api";
import { cropAge, cropGuidance } from "@/lib/crop-advice";
import { localToday } from "@/lib/local-date";
import { useLanguage } from "@/contexts/LanguageContext";
import { readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";
import { PHOTO_DEMO_CASES } from "@/lib/photo-demo-cases";

type CheckinPreview = { createdAt: string; thumbnails: string[] };
export default function FarmerToday({ weather, loading, district, districts, plantingDate, onPhoto, lastCheckin, demoResult, onClearDemo }: {
  weather: WeatherData | null; loading: boolean; district: string; districts: Record<string, string>;
  plantingDate: string; onPhoto: () => void; lastCheckin?: CheckinPreview;
  demoResult?: typeof PHOTO_DEMO_CASES[number] | null; onClearDemo?: () => void;
}) {
  const { language } = useLanguage(); const bn = language === "bn";
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [actions, setActions] = useState(readFieldActions);
  const [online, setOnline] = useState(() => navigator.onLine);

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
  const advice = cropGuidance(age, weather, bn);
  const hasPlanting = age !== null;
  const stage = age !== null ? `${bn ? `লাগানোর ${age.toLocaleString("bn-BD")} দিন` : `Day ${age}`} · ${advice.stage}` : null;
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
      <div className="field-card-heading"><div className="field-card-identity"><span>{bn ? "আমার জমি" : "My field"}</span><strong>{bn ? (districts[district] || district) : district}</strong></div><div className="field-card-actions">{stage && <span className="farmer-stage"><strong>{stage}</strong></span>}{stage && bn && voice && <button className="farmer-listen" onClick={() => { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance([stage, ...tasks.map(item => item.text)].join("। ")); utterance.voice = voice; utterance.lang = voice.lang; speechSynthesis.speak(utterance); }}><Volume2 size={17} />শুনুন</button>}</div></div>
      {hasPlanting && <details className="today-more-tasks"><summary>{bn ? "সাধারণ মাঠ-চেক" : "Routine field checks"}</summary><div className="today-task-list">{tasks.map(item => { const done = completed.has(actionKey(item.text)); const { tone, Icon } = item; return <div className={`today-task ${tone} ${done ? "done" : ""}`} key={item.text}><label><input type="checkbox" checked={done} onChange={() => toggleTask(item.text)} /><span className="task-check" aria-hidden="true">{done ? <Check size={20} /> : <Icon size={21} />}</span><strong>{item.text}</strong></label><details><summary>{bn ? "কেন?" : "Why?"}</summary><p>{item.why}</p></details></div>; })}</div></details>}
      <div className="today-photo-action">
        <div><span className="today-photo-mark"><Leaf size={21} /></span><span><strong>{bn ? "আলুর ছবি দিন" : "Add a potato photo"}</strong><small>{bn ? "ছবি বা নমুনা বেছে নিয়ে দৃশ্যমান লক্ষণ দেখুন।" : "Choose a photo or sample to review visible signs."}</small></span></div>
        <button className="main-button" onClick={onPhoto}><Camera size={18} />{bn ? "ছবি স্ক্যানার খুলুন" : "Open photo scanner"}</button>
      </div>
      {demoResult && <article className="today-demo-result" aria-live="polite"><img src={demoResult.image} alt={bn ? "নমুনা আলুর ছবি" : "Potato sample"} /><div><div className="today-demo-result-heading"><small>{bn ? `নমুনা ${demoResult.id.slice(-1)} · স্থির ডেমো ফল` : `Sample ${demoResult.id.slice(-1)} · fixed demo result`}</small><button className="text-button" type="button" onClick={onClearDemo} aria-label={bn ? "নমুনা ফল বন্ধ করুন" : "Dismiss sample result"}><X size={18} /></button></div><h3>{demoResult[bn ? "bn" : "en"].title}</h3><dl className="photo-result-facts"><div><dt>{bn ? "আলুর ধরন" : "Potato type"}</dt><dd>{demoResult[bn ? "bn" : "en"].variety}</dd></div><div><dt>{bn ? "আলুর বয়স" : "Potato age"}</dt><dd>{demoResult[bn ? "bn" : "en"].age}</dd></div><div><dt>{bn ? "স্বাস্থ্য" : "Health"}</dt><dd>{demoResult[bn ? "bn" : "en"].health}</dd></div></dl><p>{demoResult[bn ? "bn" : "en"].body}</p><p className="today-demo-action"><strong>{bn ? "করণীয়" : "What to do"}</strong>{demoResult[bn ? "bn" : "en"].action}</p></div></article>}
      {lastCheckin && <button className="last-checkin-strip" onClick={onPhoto}><span className="checkin-thumbnails" aria-hidden="true">{lastCheckin.thumbnails.length ? lastCheckin.thumbnails.slice(0, 3).map((src, index) => <img key={index} src={src} alt="" />) : <i><Image size={21} /></i>}</span><span><strong>{checkinLabel}</strong><small>{bn ? "ছবি ও লক্ষণ দেখতে চাপুন" : "Open photos and symptoms"}</small></span><Camera size={20} /></button>}
    </div>

    </div>

    <aside className="today-utility-rail" aria-label={bn ? "দ্রুত সাহায্য" : "Quick help"}><p>{bn ? "কৃষি পরামর্শ" : "Agricultural advice"}</p><section className="today-advice-card"><strong>{bn ? "কেন হলো" : "Why this happened"}</strong><p>{demoResult ? demoResult[bn ? "bn" : "en"].body : lastCheckin ? (bn ? "শেষ ছবির দৃশ্যমান লক্ষণ মিলিয়ে পাতার নিচে ও কাছের গাছ দেখুন।" : "Compare the visible signs in your last photo with nearby plants.") : (bn ? "ছবি দিলে দৃশ্যমান লক্ষণ ধরে কেন এটি দেখা যাচ্ছে, তার সংক্ষিপ্ত ব্যাখ্যা দেখাব।" : "Add a photo to see a short explanation of the visible signs.")}</p><small>{bn ? "এটি রোগের নাম বা নিশ্চিত নির্ণয় নয়।" : "This is not a disease name or a confirmed diagnosis."}</small></section><a className="secondary-main today-helpline" href="tel:16123"><PhoneCall />{bn ? "কৃষি কল সেন্টার · ১৬১২৩" : "Agriculture helpline · 16123"}</a>
    <div className="weather-chip" aria-live="polite"><CloudRain size={20} /><strong>{bn ? "আবহাওয়া" : "Weather"}</strong><span>{weather ? `${number(Math.round(weather.temperature))}° · ${bn ? "আর্দ্রতা" : "Humidity"} ${number(Math.round(weather.humidity))}%` : loading ? (bn ? "আবহাওয়া আসছে…" : "Loading weather…") : (bn ? "আবহাওয়া পাওয়া যায়নি" : "Weather unavailable")}</span>{weather && <small>{weatherFetchedAt ? (bn ? `তথ্য: ${new Date(weatherFetchedAt).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}` : `Fetched ${new Date(weatherFetchedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}`) : (bn ? "সময় অজানা" : "Fetch time unknown")} · {weatherStatus}</small>}{Boolean(weather?.forecast?.length) && <details className="today-forecast"><summary>{bn ? "আগামী ৩ দিন" : "Next 3 days"}</summary>{weather!.forecast!.slice(0, 3).map(day => <p key={day.date}><strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric" })}</strong><span>{number(day.minimum)}–{number(day.maximum)}° · {bn ? "বৃষ্টি" : "Rain"} {number(day.rainMm)} {bn ? "মিমি" : "mm"}</span></p>)}</details>}</div>
    {!online && <p className="offline-status" role="status"><WifiOff size={18} />{bn ? "অফলাইনে আছেন — ছবি ফোনে সেভ হবে" : "You are offline — photos will be saved on this phone"}</p>}</aside></div>
  </section></>;
}
