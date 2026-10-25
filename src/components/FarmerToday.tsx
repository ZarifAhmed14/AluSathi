import { useEffect, useMemo, useState } from "react";
import { Camera, Check, CloudRain, Droplets, Eye, Leaf, Volume2, WifiOff, X } from "lucide-react";
import type { WeatherData } from "@/lib/api";
import { cropAge, cropGuidance } from "@/lib/crop-advice";
import { localToday } from "@/lib/local-date";
import { useLanguage } from "@/contexts/LanguageContext";
import { FIELD_ACTIONS_EVENT, readFieldActions, saveFieldActions, type FieldAction } from "@/lib/field-actions";

export default function FarmerToday({ weather, loading, district, districts, plantingDate, onPhoto, active }: {
  weather: WeatherData | null; loading: boolean; district: string; districts: Record<string, string>;
  plantingDate: string; onPhoto: () => void; active: boolean;
}) {
  const { language } = useLanguage(); const bn = language === "bn";
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [actions, setActions] = useState(readFieldActions);
  const [activePhotoId, setActivePhotoId] = useState<string>();
  const [dismissedPhotoId, setDismissedPhotoId] = useState<string>();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => { if (!active) setActivePhotoId(undefined); }, [active]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    const update = () => {
      const next = readFieldActions();
      setActions(next);
      if (next[0]?.category === "photo") setActivePhotoId(next[0].id);
    };
    window.addEventListener(FIELD_ACTIONS_EVENT, update);
    return () => window.removeEventListener(FIELD_ACTIONS_EVENT, update);
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
  const weatherFetchedAt = weather?.observed_at && Number.isFinite(Date.parse(weather.observed_at)) ? Date.parse(weather.observed_at) : null;
  const weatherStale = weatherFetchedAt === null || Date.now() - weatherFetchedAt > 6 * 3600_000;
  const weatherStatus = weather?.cached
    ? (weatherStale ? (bn ? "ক্যাশে · পুরোনো" : "cached · stale") : (bn ? "ক্যাশে" : "cached"))
    : weatherStale ? (bn ? "পুরোনো তথ্য" : "stale") : (bn ? "হালনাগাদ" : "current");
  const latestPhoto = actions.find(action => action.category === "photo" && action.id === activePhotoId);
  useEffect(() => setDismissedPhotoId(undefined), [latestPhoto?.id]);
  const photoCause = latestPhoto?.cause || (latestPhoto
    ? (bn ? "শেষ ছবিতে দৃশ্যমান দাগ বা ক্ষতির লক্ষণ পাওয়া গেছে।" : "The last photo showed a visible mark or damaged area.")
    : (bn ? "ছবি দিলে কোন দৃশ্যমান লক্ষণ পাওয়া গেছে এবং কী সমস্যা হতে পারে তা এখানে দেখাবে।" : "Add a photo to see which visible sign was found and what may have gone wrong."));

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
        <div><span className="today-photo-mark"><Leaf size={21} /></span><span><strong>{bn ? "আলুর ছবি দিন" : "Add a potato photo"}</strong><small>{bn ? "নিজের ছবি দিয়ে দৃশ্যমান লক্ষণ দেখুন।" : "Use your own photo to review visible signs."}</small></span></div>
        <button className="main-button" onClick={onPhoto}><Camera size={18} />{bn ? "ছবি স্ক্যানার খুলুন" : "Open photo scanner"}</button>
      </div>
      {latestPhoto && dismissedPhotoId !== latestPhoto.id && <article className="today-demo-result" aria-live="polite">
        {latestPhoto.image && <img src={latestPhoto.image} alt={bn ? "Potato photo result" : "Potato photo result"} />}
        <div><div className="today-demo-result-heading"><small>{bn ? "ছবির ফল" : "Photo result"}</small><button className="text-button" type="button" onClick={() => setDismissedPhotoId(latestPhoto.id)} aria-label={bn ? "Close photo result" : "Close photo result"}><X size={18} /></button></div>
          <h3>{latestPhoto.title || (bn ? "ছবির ফল" : "Photo result")}</h3>
          <dl className="photo-result-facts"><div><dt>{bn ? "আলুর ধরন" : "Potato type"}</dt><dd>{latestPhoto.variety || "—"}</dd></div><div><dt>{bn ? "আলুর বয়স" : "Potato age"}</dt><dd>{latestPhoto.cropAge || "—"}</dd></div><div><dt>{bn ? "স্বাস্থ্য" : "Health"}</dt><dd>{latestPhoto.status || "—"}</dd></div></dl>
          {(latestPhoto.body || latestPhoto.cause) && <p>{latestPhoto.body || latestPhoto.cause}</p>}<p className="today-demo-action"><strong>{bn ? "করণীয়" : "What to do"}</strong>{latestPhoto.details}</p>
        </div>
      </article>}
    </div>

    </div>

    <aside className="today-utility-rail" aria-label={bn ? "দ্রুত সাহায্য" : "Quick help"}><p>{bn ? "কৃষি পরামর্শ" : "Agricultural advice"}</p><section className="today-advice-card"><strong>{bn ? "কেন হলো" : "Why this happened"}</strong><p>{photoCause}</p><small>{latestPhoto?.details || (bn ? "ছবি দেওয়ার পর পরের কাজ এখানে থাকবে।" : "The next step will appear here after a photo check.")}</small></section>
    <div className="weather-chip" aria-live="polite"><CloudRain size={20} /><strong>{bn ? "আবহাওয়া" : "Weather"}</strong><span>{weather ? `${number(Math.round(weather.temperature))}° · ${bn ? "আর্দ্রতা" : "Humidity"} ${number(Math.round(weather.humidity))}%` : loading ? (bn ? "আবহাওয়া আসছে…" : "Loading weather…") : (bn ? "আবহাওয়া পাওয়া যায়নি" : "Weather unavailable")}</span>{weather && <small>{weatherFetchedAt ? (bn ? `তথ্য: ${new Date(weatherFetchedAt).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}` : `Fetched ${new Date(weatherFetchedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}`) : (bn ? "সময় অজানা" : "Fetch time unknown")} · {weatherStatus}</small>}{Boolean(weather?.forecast?.length) && <details className="today-forecast"><summary>{bn ? "আগামী ৩ দিন" : "Next 3 days"}</summary>{weather!.forecast!.slice(0, 3).map(day => <p key={day.date}><strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric" })}</strong><span>{number(day.minimum)}–{number(day.maximum)}° · {bn ? "বৃষ্টি" : "Rain"} {number(day.rainMm)} {bn ? "মিমি" : "mm"}</span></p>)}</details>}</div>
    {!online && <p className="offline-status" role="status"><WifiOff size={18} />{bn ? "অফলাইনে আছেন — ছবি ফোনে সেভ হবে" : "You are offline — photos will be saved on this phone"}</p>}</aside></div>
  </section></>;
}
