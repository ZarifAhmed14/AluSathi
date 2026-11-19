import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Check, ChevronDown, Droplets, Flower2, Leaf, PackageCheck, Sparkles, Sprout, Volume2 } from "lucide-react";
import "@/farmer-today.css";
import type { WeatherData } from "@/lib/api";
import { seasonDay, cropAge, cropGuidance, plantingAges, rangeGuidance, type PlantingAge } from "@/lib/crop-advice";
import { spreadOutlook } from "@/lib/farmer-tools";
import { localToday } from "@/lib/local-date";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDemo } from "@/contexts/DemoContext";
import { readFieldActions, saveFieldActions, FIELD_ACTIONS_EVENT, type FieldAction } from "@/lib/field-actions";
import { buildPhotoTasks, buildTodayTasks, rainTaskIds, recentPhoto, readTodayPlan, type PlanContext, type PlanTask } from "@/lib/today-plan";
import TodayCare from "./TodayCare";
import { PHOTO_DEMO_CASES } from "@/lib/photo-demo-cases";
import PhotoFollowUp from "./PhotoFollowUp";
import TodayWeather from "./TodayWeather";
import { readCareArea } from "@/lib/care-area";
import { PROFILE_CHANGED } from "@/lib/farmer-profile";

type CheckinPreview = { createdAt: string; thumbnails: string[] };

const ageIcons = { lt30: Sprout, "30to60": Leaf, "60to90": Flower2, gt90: PackageCheck };
function readActions(): FieldAction[] {
  return readFieldActions();
}

function ageBand(age: number | null, range: PlantingAge | ""): PlantingAge | "" {
  if (age === null) return range;
  if (age < 30) return "lt30";
  if (age < 60) return "30to60";
  if (age < 90) return "60to90";
  return "gt90";
}

export default function FarmerToday({ weather, loading, district, districts, plantingDate }: {
  weather: WeatherData | null; loading: boolean; district: string; districts: Record<string, string>;
  plantingDate: string; onPhoto: () => void; lastCheckin?: CheckinPreview;
}) {
  const { language } = useLanguage(); const bn = language === "bn";
  const { demo } = useDemo();
  const [range, setRange] = useState<PlantingAge | "">(() => {
    const value = localStorage.getItem("alusathi-planting-age");
    return plantingAges.includes(value as PlantingAge) ? value as PlantingAge : "";
  });
  const [recorded, setRecorded] = useState(() => localStorage.getItem("alusathi-planting-age-recorded") || "");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [actions, setActions] = useState(readActions);
  const [area, setArea] = useState(readCareArea);
  const [saveError, setSaveError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const refresh = () => { setActions(readActions()); setArea(readCareArea()); };
    window.addEventListener(PROFILE_CHANGED, refresh);
    window.addEventListener(FIELD_ACTIONS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener(PROFILE_CHANGED, refresh); window.removeEventListener(FIELD_ACTIONS_EVENT, refresh); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, []);

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

  const age = seasonDay(plantingDate);
  const elapsed = cropAge(recorded);
  const stale = Boolean(range) && (elapsed === null || elapsed >= 30);
  const approximate = age === null && range && !stale ? rangeGuidance(range, bn) : null;
  const advice = cropGuidance(age, weather, bn);
  const risk = spreadOutlook(weather);
  const hasPlanting = age !== null || Boolean(approximate);
  const currentBand = ageBand(age, approximate ? range : "");
  const stage = age !== null ? `${bn ? `লাগানোর ${age.toLocaleString("bn-BD")} দিন` : `Day ${age}`} · ${advice.stage}` : demo && approximate && range === "lt30" ? (bn ? "৮ দিন" : "8 days") : approximate?.stage;
  const number = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 1 });

  const freshWeather = Boolean(weather?.observed_at && !weather.cached && Number.isFinite(Date.parse(weather.observed_at)) && Date.now() - Date.parse(weather.observed_at) < 6 * 3600_000);
  const forecastToday = weather?.forecast?.find(day => day.date === localToday());
  const rainingNow = (weather?.rainfall ?? 0) > 0 || weather?.weather === "Rain";
  const rainMode = freshWeather ? (rainingNow ? "current" : (forecastToday?.rainMm ?? 0) >= 44 ? "heavy" : (forecastToday?.rainMm ?? 0) > 0 ? "forecast" : undefined) : undefined;
  const treatment = actions.find(item => item.district === district && item.date <= localToday() && (item.category === "fertilizer" || item.category === "spray") && item.status === "applied");
  const candidate: PlanContext = { date: localToday(), district, band: currentBand, cropDay: age ?? undefined, rainMode, rain: freshWeather && Boolean(weather && (weather.rainfall > 0 || (weather.forecastRainMm ?? 0) > 0)), humid: freshWeather && Boolean(risk?.high), photo: recentPhoto(actions, district, localToday()), lastTreatment: treatment ? `${treatment.date} · ${treatment.details || treatment.text}` : "" };
  const [previousPlan] = useState(() => readTodayPlan(candidate));
  const plannedTasks = buildTodayTasks(candidate, bn);
  const rainNote = rainMode ? plannedTasks[0]?.why : undefined;
  const contextKey = JSON.stringify(candidate);
  const actionKey = (task: PlanTask) => `today|${localToday()}|${district}|${task.id}|${task.id.startsWith("photo-") ? candidate.photo?.id || "" : ""}`;
  const completedActions = actions.filter(action => action.date === localToday() && action.kind === "task" && action.id.startsWith(`today|${localToday()}|${district}|`));
  const tasks = (() => {
    const oldTasks = [...buildTodayTasks(previousPlan, bn), ...buildPhotoTasks(previousPlan, bn)];
    const done = completedActions.map(action => {
      const saved = action.planTask;
      const valid = saved && [saved.id, saved.text, saved.why, saved.how].every(value => typeof value === "string");
      return { ...valid ? saved : oldTasks.find(task => action.id.split("|")[3] === task.id) || { id: action.id.split("|")[3], text: action.text, why: bn ? "আগে শেষ করেছেন।" : "You completed this earlier.", how: bn ? "কাজটি খাতায় রাখা আছে।" : "This task is in Khata." }, key: action.id };
    });
    const current = plannedTasks.map(task => ({ ...task, key: actionKey(task) }));
    return [...current.map(task => done.find(item => item.key === task.key) ?? task), ...done.filter(item => !current.some(task => item.key === task.key))];
  })();
  const completed = new Set(completedActions.map(action => action.id));
  const saveActions = (next: FieldAction[]) => {
    try { localStorage.setItem("alusathi-today-plan-v1",contextKey); saveFieldActions(next); setActions(next); setSaveError(""); }
    catch { setSaveError(bn ? "রাখা যায়নি। আবার চেষ্টা করুন।" : "Could not save. Please try again."); }
  };
  const toggleTask = (task: PlanTask & { key: string }) => {
    const current = readActions();
    if (completed.has(task.key)) saveActions(current.filter(action => action.id !== task.key));
    else saveActions([{ id: task.key, date: localToday(), text: task.text, district, kind: "task" as const, planTask: { id: task.id, text: task.text, why: task.why, how: task.how } }, ...current.filter(action => action.id !== task.key)].slice(0, 100));
  };
  const choose = (value: PlantingAge) => {
    setRange(value); setRecorded(localToday());
    localStorage.setItem("alusathi-planting-age", value); localStorage.setItem("alusathi-planting-age-recorded", localToday());
  };

  const completedCount = tasks.filter(item => completed.has(item.key)).length;
  const photo = candidate.photo;
  const sample = photo?.sample ? PHOTO_DEMO_CASES[photo.sample - 1] : undefined;
  const observation = sample?.[language];
  const photoTask = buildPhotoTasks(candidate, bn)[0];
  const dateLabel = new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Dhaka" }).format(new Date());

  return <><div className="farmer-field-scene" aria-hidden="true">
    {["one", "two", "three", "four", "five"].map(name => <img key={name} className={`field-leaves field-leaves-${name}`} src="/field-potato-leaves.webp" alt="" />)}
    {["one", "two"].map(name => <img key={name} className={`field-tree field-tree-${name}`} src="/field-tree-canopy.webp" alt="" />)}
    <span className="field-bird field-bird-one"><svg viewBox="0 0 62 28" fill="none"><path d="M2 20 Q9 11 17 19 Q25 11 32 20 M29 9 Q35 2 41 9 Q48 2 54 10" /></svg></span><span className="field-bird field-bird-two"><svg viewBox="0 0 62 28" fill="none"><path d="M2 21 Q15 2 30 17 Q45 2 60 21" /></svg></span>
  </div><section className="app-shell farmer-today" aria-label={bn ? "আজকের কাজ" : "Today's tasks"}>
    <div className="today-titlebar">
      <div className="farmer-greeting"><div><p className="today-date">{dateLabel}</p><h1>{bn ? "আজকের কাজ" : "Today's tasks"}</h1><p>{bn ? "কাজ করুন, শেষ হলে টিক দিন।" : "Tick off each task as you finish."}</p></div></div>
    <div className="today-field-context">
      <div className="today-location"><span><Sprout size={18} />{bn ? "আমার জমি" : "My field"}</span><strong>{bn ? districts[district] || district : district} · {number(Number(area.value))} {({decimal:bn ? "শতক" : "shatak",acre:bn ? "একর" : Number(area.value) === 1 ? "acre" : "acres",hectare:bn ? "হেক্টর" : "ha",bigha:bn ? "বিঘা" : "bigha"})[area.unit]}</strong></div>
      <div className="today-crop-context"><span>{bn ? "চাষের সময়" : "Crop stage"}</span><strong>{stage || (bn ? "বয়স দেওয়া হয়নি" : "Crop age unknown")}</strong></div>
      {stage && bn && voice && <button className="farmer-listen" onClick={() => { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance([stage, ...tasks.map(item => item.text)].join("। ")); utterance.voice = voice; utterance.lang = voice.lang; speechSynthesis.speak(utterance); }}><Volume2 size={17} />শুনুন</button>}
      {age === null && <details className="today-age-editor"><summary>{hasPlanting ? (bn ? "বয়স বদলান" : "Change age") : (bn ? "গাছের বয়স দিন" : "Add your crop age")}</summary><fieldset className="planting-choices"><legend>{stale ? (bn ? "এখন গাছের বয়স কত?" : "How old is the crop now?") : (bn ? "কবে আলু লাগিয়েছেন?" : "When did you plant?")}</legend>{plantingAges.map(value => { const AgeIcon = ageIcons[value]; return <button type="button" key={value} aria-pressed={currentBand === value} onClick={event => { choose(value); event.currentTarget.closest("details")?.removeAttribute("open"); }}><AgeIcon size={17} />{rangeGuidance(value, bn).stage.replace(bn ? "প্রায় " : "About ", "")}</button>; })}</fieldset></details>}
    </div>
    </div>

    <div className="today-layout"><div className="today-primary-column">
      <div className="farmer-day-card">
        <div className="today-checklist-heading"><div><span className="section-kicker">{bn ? "আজ আপনার জমিতে" : "In your field today"}</span><h2>{bn ? "আজ যে কাজগুলো দেখবেন" : "Field checklist"}</h2></div><span className="today-completion" role="status">{number(completedCount)} / {number(tasks.length)} {bn ? "শেষ" : "done"}</span></div>
        <div className="today-photo-basis"><p>{bn ? "শেষ হলে টিক দিন। বিস্তারিত দেখতে নিচে চাপুন।" : "Open a task for steps and reasons."}</p></div>
        {tasks.length > 0 && <progress className="today-progress" value={completedCount} max={tasks.length} aria-label={bn ? "আজকের কাজের অগ্রগতি" : "Today's task progress"} />}
        <div className="today-task-list">{tasks.map((item, index) => { const done = completed.has(item.key); const rainTask = rainTaskIds.includes(item.id); const Icon = rainTask ? Droplets : Leaf; const open = expanded === item.key; return <article className={`today-task${done ? " done" : ""}`} key={item.key}>
          <div className="today-task-top"><span className="today-task-icon"><Icon size={23} aria-hidden="true" /></span><span className="today-task-source">{rainTask ? (bn ? "আবহাওয়া" : "Weather") : (bn ? "জমির কাজ" : "Field work")}</span></div>
          <div className="today-task-copy"><h3>{item.text}</h3>{item.id === `rain-${rainMode}` && <p className="today-weather-reason">{rainNote}</p>}</div>
          <label className="today-task-check"><input type="checkbox" aria-label={`${item.text} — ${bn ? "কাজ শেষ" : "Task complete"}`} checked={done} onChange={() => toggleTask(item)} /><span className="task-check" aria-hidden="true"><Check size={18} /></span><span>{done ? (bn ? "শেষ হয়েছে" : "Done") : (bn ? "শেষ হলে টিক দিন" : "Mark done")}</span></label>
          <button type="button" className="today-task-toggle" aria-expanded={open} aria-controls={`task-details-${index}`} onClick={() => setExpanded(open ? null : item.key)}>{open ? (bn ? "বন্ধ করুন" : "Close details") : (bn ? "বিস্তারিত দেখুন" : "See details")} <ChevronDown size={17} aria-hidden="true" /></button>
          <div id={`task-details-${index}`} className="today-task-details" hidden={!open}><p><b>{bn ? "কীভাবে করবেন" : "How to do it"}</b><br />{item.how}</p><p><b>{bn ? "কেন দেখাচ্ছে" : "Why this task"}</b><br />{item.why}</p></div>
        </article>; })}</div>
        {tasks.length === 0 && <p className="today-no-tasks">{bn ? "এখন কী কাজ করবেন, তা বোঝা যাচ্ছে না। গাছের বয়স লিখুন বা জমির নতুন খবর যোগ করুন।" : "There is not enough information to suggest a task yet. Add your crop's age or new field notes."}</p>}
        {tasks.length > 0 && completedCount === tasks.length && <p className="today-all-done" role="status"><Check size={18} />{bn ? "আজকের তালিকার সব কাজ শেষ।" : "All tasks on today's list are complete."}</p>}
        {saveError && <p role="alert">{saveError}</p>}
        <div className="today-record-links">
          <span role="status">{completedCount > 0 ? (bn ? "খাতায় রাখা হয়েছে" : "Saved in Khata") : ""}</span>
          {completedCount > 0 && <Link to="/farmer#diary">{bn ? "খাতায় দেখুন" : "View in Khata"}</Link>}
          {!photo && <Link to="/farmer#photos">{bn ? "ছবি দিন" : "Add a photo"}</Link>}
        </div>
      </div>
    </div>

    <TodayWeather weather={weather} rainNote={rainNote} loading={loading} district={district} districtLabel={bn ? districts[district] || district : district} bn={bn} online={online}/></div>
    {photo && <section className="today-ai-insight" aria-labelledby="today-observation-title">
      <h2 id="today-observation-title" className="today-observation-heading"><Sparkles size={22} aria-hidden="true" />{bn ? "AI-এর সহায়তায় ছবির ফল দেখুন" : "View AI-assisted photo results"}</h2>
      <div className="today-observation-content">
        {sample?.image || photo.thumbnail ? <img src={sample?.image || photo.thumbnail} alt={bn ? "নির্বাচিত আলুর ছবি" : "Selected potato photo"} /> : <Camera size={28} aria-label={bn ? "ছবির থাম্বনেইল নেই" : "Small photo not available"} />}
        <div><strong>{photo.modelResult ? (bn ? "ছবির মডেলের ফল" : "Photo check result") : (bn ? "ছবির নোট" : "Photo notes")}</strong><p>{observation ? `${observation.title}। ${observation.body}` : photo.body || photo.title}</p></div>
        <div><strong>{bn ? "যা করবেন" : "What to do"}</strong><p>{photoTask?.text}</p></div>
      </div>
      {photoTask && <PhotoFollowUp key={photo.id} bn={bn} nextCheck={photoTask.text} />}
    </section>}
    <TodayCare bn={bn} district={district} actions={actions} photo={candidate.photo} />
  </section></>;
}
