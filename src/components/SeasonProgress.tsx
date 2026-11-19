import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, CircleCheck, CircleMinus, Clock, Flower2, Leaf, PackageCheck, Sprout } from "lucide-react";
import { areaSquareMetres } from "@/lib/farmer-tools";
import { seasonDay, cropGuidance } from "@/lib/crop-advice";
import { localToday } from "@/lib/local-date";
import { readFieldActions } from "@/lib/field-actions";
import { readCareArea } from "@/lib/care-area";
import CareLandEditor from "./CareLandEditor";
import { recentPhoto, sprayReference } from "@/lib/today-plan";
import { PROFILE_CHANGED } from "@/lib/farmer-profile";
import { seasonTips, seasonTipsNote } from "@/data/season-tips";
import type { WeatherData } from "@/lib/api";

// BAMIS potato bulletin: basal rates and one urea top dressing, kg/hectare.
const nutrients = [
  { bn: "ইউরিয়া", en: "Urea", basal: [160, 175], later: [160, 175] },
  { bn: "টিএসপি", en: "TSP", basal: [200, 220] },
  { bn: "এমওপি (পটাশ)", en: "MOP (potash)", basal: [250, 300] },
  { bn: "জিপসাম", en: "Gypsum", basal: [100, 120] },
  { bn: "জিংক সালফেট", en: "Zinc sulphate", basal: [8, 10] },
  { bn: "বোরিক অ্যাসিড", en: "Boric acid", basal: [6, 9] },
] as const;

const milestones = [
  { start: 1, end: 14, icon: Sprout, bn: "রোপণ", en: "Planting", note: ["লাগানো আলু থেকে অঙ্কুর বের হতে শুরু করে।", "Sprouts start to grow from the planted potatoes."] },
  { start: 15, end: 30, icon: Leaf, bn: "প্রাথমিক বৃদ্ধি", en: "Early growth", note: ["গাছের কাণ্ড ও পাতা বাড়তে থাকে।", "Stems and leaves continue to grow."] },
  { start: 31, end: 45, icon: Flower2, bn: "কন্দ গঠন", en: "Potato formation", note: ["মাটির নিচে নতুন আলু গঠন শুরু হতে পারে।", "New potatoes may start forming below ground."] },
  { start: 46, end: 70, icon: Sprout, bn: "কন্দ বৃদ্ধি", en: "Potato growth", note: ["মাটির নিচে আলুর আকার বাড়তে থাকে।", "Potatoes keep growing below ground."] },
  { start: 71, end: 90, icon: PackageCheck, bn: "ফসল সংগ্রহ", en: "Harvest", note: ["ফসল তোলার সময় জাত ও জমির অবস্থা অনুযায়ী বদলায়।", "Harvest timing varies by variety and field conditions."] },
] as const;

const upcoming = [
  { start: 1, end: 15, bn: "কয়েক সারিতে অঙ্কুর উঠেছে কি না দেখুন", en: "Check for emerging shoots in several rows" },
  { start: 15, end: 30, bn: "আগাছা আছে কি না ও গাছ কেমন বাড়ছে দেখুন", en: "Check for weeds and watch plant growth" },
  { start: 30, end: 35, bn: "গোড়ায় মাটি দেওয়ার সময় মিলিয়ে নিন", en: "Check when to earth up the plants", note: ["মাটি দিয়ে আলু ঢেকে রাখলে সবুজ হওয়ার ঝুঁকি কমে।", "Covering potatoes with soil helps prevent them turning green."] },
  { start: 35, end: 48, bn: "পাতায় নতুন দাগ আর গোড়ায় মাটি সরে গেছে কি না দেখুন", en: "Check for new leaf spots and soil washed away from the plant bases" },
  { start: 48, end: 63, bn: "মাটি দেখে সেচ লাগবে কি না বুঝে নিন", en: "Check the soil to see if watering is needed" },
  { start: 64, end: 70, bn: "গাছের অবস্থা দেখে আলু তোলার প্রস্তুতি নিন", en: "Check plant condition and start preparing for harvest" },
  { start: 71, end: 90, bn: "আলু তোলার সময় হয়েছে কি না দেখুন", en: "Check whether the crop is ready to harvest" },
] as const;

const preparationTips = [
  [["কয়েক সারিতে অঙ্কুর উঠেছে কি না দেখুন।", "Check for emerging shoots in several rows."], ["বৃষ্টির পর কোথায় পানি দাঁড়ায়, দেখে রাখুন।", "Note where water pools after rain."]],
  [["আগাছা বেশি কোথায়, দেখে রাখুন।", "Note where weeds are most concentrated."], ["কয়েক সারির গাছের বৃদ্ধি মিলিয়ে দেখুন।", "Compare plant growth across several rows."]],
  [["আলু মাটির ওপর বেরিয়ে আছে কি না দেখুন।", "Look for tubers exposed above the soil."], ["পাতার দুই পাশে নতুন দাগ আছে কি না দেখুন।", "Check both sides of leaves for new spots."]],
  [["সেচের আগে কয়েক জায়গায় মাটির ভেজাভাব দেখুন।", "Check soil moisture in several spots before irrigating."], ["বৃষ্টি হলে পানি বের হওয়ার নালাগুলো দেখে রাখুন।", "After rain, check the drainage channels."]],
  [["আলু তোলার আগে জাত ও গাছের অবস্থা মিলিয়ে নিন।", "Check variety and plant condition before deciding when to harvest."], ["তোলার আগে শুকনো বস্তা ও ছায়ায় বাছাইয়ের জায়গা তৈরি রাখুন।", "Prepare dry sacks and a shaded sorting area before harvest."]],
] as const;

function readSeasonArea() {
  const area = readCareArea();
  return area.example ? { ...area, unit: "acre" as const } : area;
}

export default function SeasonProgress({ bn, district, weather }: { bn: boolean; district: string; weather: WeatherData | null }) {
  const t = (b: string, e: string) => bn ? b : e;
  const now = new Date();
  const today = localToday(now);
  const plantingDate = localStorage.getItem("alusathi-planting-date") || "";
  const currentDay = seasonDay(plantingDate, now);
  const actual = currentDay ?? 8;
  const planDay = Math.min(90, actual);
  const [selected, setSelected] = useState<number | null>(null);
  const preview = selected ?? planDay;
  const calendarRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const calendar = calendarRef.current;
    const active = calendar?.querySelector('[aria-pressed="true"]');
    if (calendar && active) {
      const tile = active.getBoundingClientRect();
      const grid = calendar.getBoundingClientRect();
      calendar.scrollLeft += tile.left + (tile.width - calendar.clientWidth) / 2 - grid.left;
    }
  }, [preview]);
  const [area, setArea] = useState(readSeasonArea);
  useEffect(() => {
    const refresh = () => setArea(readSeasonArea());
    window.addEventListener(PROFILE_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(PROFILE_CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const areaM2 = areaSquareMetres(Number(area.value), area.unit, Number(area.bigha));
  const fmt = (value: number) => value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 });
  const areaLabel = `${fmt(Number(area.value))} ${({ acre: t("একর", Number(area.value) === 1 ? "acre" : "acres"), decimal: t("শতক", "shatak"), bigha: t("বিঘা", "bigha"), hectare: t("হেক্টর", "ha") })[area.unit]}`;
  const amount = (range: readonly number[], metres: number) => `${fmt(range[0] * metres / 10000)}–${fmt(range[1] * metres / 10000)}`;
  const actions = readFieldActions();
  const stage = milestones.find(item => preview <= item.end) ?? milestones[0];
  const StageIcon = stage.icon;
  const range = ({ start, end }: { start: number; end: number }) => t(`দিন ${fmt(start)}–${fmt(end)}`, `Days ${fmt(start)}–${fmt(end)}`);
  const weeklySpray = sprayReference(recentPhoto(actions, district, today), bn);
  const planting = currentDay === null ? new Date(now) : new Date(plantingDate + "T12:00:00");
  if (currentDay === null) planting.setDate(now.getDate() - actual + 1);
  const offset = (planting.getDay() + 6) % 7;
  const week = Math.floor((preview + offset - 1) / 7);
  const firstDay = week * 7 - offset + 1;
  const dayCount = 7;
  const forecast = weather?.cached ? [] : weather?.forecast ?? [];
  const days = Array.from({ length: dayCount }, (_, index) => {
    const number = firstDay + index;
    const day = new Date(planting);
    day.setDate(planting.getDate() + number - 1);
    const date = localToday(day);
    const records = date <= today ? actions.filter(item => item.date === date && (item.district === district || !item.district) && (item.kind === "task" || item.category === "fertilizer" && item.status === "applied")) : [];
    return { number, day, date, records, tip: seasonTips[number - 1], weatherDay: date >= today ? forecast.find(item => item.date === date) : undefined };
  });
  const activeDay = days[preview - firstDay];
  const activeAlerts = activeDay.weatherDay ? weather?.alerts?.filter(alert => alert.date === activeDay.date) ?? [] : [];
  const isToday = preview === actual;
  const plannedWork = upcoming.filter(item => preview >= item.start && preview <= item.end).pop();
  const currentWork = upcoming.filter(item => actual >= item.start && actual <= item.end).pop();

  return <div className="app-shell season-progress">
    <div className="season-main">
    <section className="season-card season-journey" aria-labelledby="season-title">
      <div className="season-journey-heading">
        <div><h1 id="season-title">{t("আলু চাষের ৯০ দিন", "90 days of growing potatoes")}</h1><p>{t("আপনার মৌসুমটি ঘুরে দেখুন", "Explore your growing season")}</p></div>
        <span>{areaLabel}</span>
      </div>
      <div className="season-actual">
        <div className="season-progress-label"><strong>{t("মৌসুমের পরিকল্পনা", "Season plan")}</strong><span className="season-current">{actual > 90 ? t(`দিন ${fmt(actual)} · ৯০ দিনের পরিকল্পনা শেষ`, `Day ${fmt(actual)} · 90-day plan ended`) : t(`দিন ${fmt(actual)} / ৯০`, `Day ${fmt(actual)} / 90`)}</span></div>
        <div className="season-track"><progress value={planDay} max={90} aria-label={t("মৌসুমের পরিকল্পনা", "Season plan")} /><i aria-hidden="true" style={{ insetInlineStart: `${planDay / 90 * 100}%` }} /></div>
      </div>
      <div className="season-milestones">{milestones.map(item => <button type="button" key={item.start} aria-pressed={stage === item} aria-current={actual >= item.start && actual <= item.end ? "step" : undefined} aria-controls="season-stage" onClick={() => setSelected(item.start)}>
        <item.icon size={22} aria-hidden="true" />
        <strong>{bn ? item.bn : item.en}</strong><span>{range(item)}</span>
      </button>)}</div>
      <section id="season-stage" className="season-stage" aria-live="polite" aria-labelledby="season-stage-title">
        <div className="season-stage-heading">
          <span><StageIcon size={24} aria-hidden="true" /></span>
          <div><p>{t("আপনি যে ধাপটি দেখছেন", "Stage you’re viewing")}</p><h2 id="season-stage-title">{bn ? stage.bn : stage.en}</h2><p>{range(stage)}</p></div>
        </div>
        <p>{stage.note[bn ? 0 : 1]}</p>
        <p className="season-activity"><CircleCheck size={16} aria-hidden="true" /><span>{t("এই ধাপের কাজ:", "Stage activity:")} {cropGuidance(preview, null, bn).reminders[0]}</span></p>
      </section>
    </section>
    <div className="season-side">
    <section className="season-card season-upcoming" aria-labelledby="season-upcoming-title">
      <div className="season-upcoming-heading">
        <h2 id="season-upcoming-title"><CalendarDays size={21} aria-hidden="true" />{t("আলু চাষের টাইমলাইন", "Potato growing timeline")}</h2>
        <span className="season-today-badge"><small>{t("আজ", "Today")}</small><strong>{t(`${fmt(actual)}ম দিন`, `Day ${fmt(actual)}`)}</strong></span>
      </div>
      <ol>{upcoming.map(item => <li key={item.start}>
        <button type="button" className="season-upcoming-jump" aria-current={currentWork === item ? "step" : undefined} aria-controls="season-stage" aria-pressed={plannedWork === item} onClick={() => setSelected(item.start)}>{range(item)}</button>
        <div>{bn ? item.bn : item.en}{"note" in item && <small>{item.note[bn ? 0 : 1]}</small>}</div>
      </li>)}</ol>
    </section>
    </div>
    </div>
    <section className="season-card season-week season-calendar" aria-labelledby="season-calendar-title">
      <header className="season-calendar-head">
        <div className="season-calendar-title">
          <span className="season-calendar-emblem" aria-hidden="true"><span><CalendarDays size={13}/>{t("দিন", "Day")}</span><strong>{fmt(actual)}</strong></span>
          <div>
            <h2 id="season-calendar-title">{t("মৌসুমের ক্যালেন্ডার", "Season calendar")}</h2>
            <p><strong>{t(`আজ আপনার আলু চাষের ${fmt(actual)}ম দিন`, `Day ${fmt(actual)}`)}</strong></p>
            <p aria-live="polite">{range({ start: Math.max(1, firstDay), end: Math.min(90, firstDay + dayCount - 1) })}</p>
          </div>
        </div>
        <div className="season-calendar-controls">
          <button type="button" disabled={firstDay <= 1} onClick={() => setSelected(Math.max(1, firstDay - 7))}>← {t("আগের সপ্তাহ", "Previous week")}</button>
          <button type="button" className="season-return-today" onClick={() => setSelected(null)}>{actual > 90 ? t("দিন ৯০-এ ফিরুন", "Return to Day 90") : t("আজকের দিনে ফিরে যান", "Return to today")}</button>
          <button type="button" disabled={firstDay + 6 >= 90} onClick={() => setSelected(firstDay + 7)}>{t("পরের সপ্তাহ", "Next week")} →</button>
          <button type="button" onClick={() => setSelected(90)}>{t("দিন ৯০", "Day 90")} ↗</button>
        </div>
      </header>
      {actual > 90 && <p className="season-calendar-note" role="status">{t(`আপনার আলু চাষের ${fmt(actual)}ম দিন চলছে। এই ক্যালেন্ডারে প্রথম ৯০ দিনের পরিকল্পনা দেখানো হয়।`, `Your crop is on day ${fmt(actual)}. This calendar covers only days 1–90.`)}</p>}
      <ul id="season-calendar-days" className="season-calendar-grid" key={firstDay} ref={calendarRef}>{days.map(({ number, day, date, records, tip, weatherDay }) => (
        <li key={date}>
          <button type="button" data-day={number} disabled={number < 1 || number > 90} aria-current={number >= 1 && number <= 90 && number === actual ? "date" : undefined} aria-pressed={number === preview} aria-controls="season-day-details" onClick={() => setSelected(number)}>
            <span className="season-calendar-weekday">{day.toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "short" })}</span>
            <time dateTime={date}><strong>{fmt(day.getDate())}</strong> <span className="season-calendar-month">{day.toLocaleDateString(bn ? "bn-BD" : "en-GB", { month: "short" })}</span></time>
            {number >= 1 && number <= 90 && <small>{number === actual ? t("আজ · ", "Today · ") : ""}{t(`দিন ${fmt(number)}`, `Day ${fmt(number)}`)}</small>}
            {records.length > 0 && <span className="season-calendar-event recorded"><CircleCheck size={14} role="img" aria-label={t("কাজ শেষ", "Completed")} /> {t("খাতায় আছে", "In Khata")} · {fmt(records.length)}</span>}
            {number === actual && <span className="season-calendar-event">{t("আজকের কাজ", "Tasks for this day")}</span>}
            {tip && <span className="season-calendar-event">{t(tip.bn, tip.en)}</span>}
            {weatherDay && number >= 1 && number <= 90 && <span className="season-calendar-event">
              {t("আবহাওয়ার পূর্বাভাস", "Forecast")} · {fmt(Math.round(weatherDay.minimum))}–{fmt(Math.round(weatherDay.maximum))}°C · {t("বৃষ্টি", "Rain")} {fmt(Math.round(weatherDay.rainMm))} {t("মিমি", "mm")}
            </span>}
            {number >= 1 && number <= 90 && (records.length || number < actual ? <CircleCheck size={16} className="season-completed" aria-label={records.length ? t("কাজ শেষ", "Completed") : t("দিন পার হয়েছে", "Past day")} /> : date >= today ? <Clock size={16} aria-label={t("বাকি", "Pending")} /> : <CircleMinus size={16} aria-label={t("কাজ লেখা নেই", "No activity recorded")} />)}
          </button>
        </li>
      ))}</ul>
      <label className="season-preview"><span>{t("যে দিনটি দেখছেন", "Preview day")} · {fmt(preview)}</span><input aria-label={t("যে দিনটি দেখছেন", "Preview day")} type="range" min={1} max={90} value={preview} onChange={event => setSelected(Number(event.target.value))} /></label>
      <p className="season-calendar-note">{t(seasonTipsNote.bn, seasonTipsNote.en)}</p>
      <div id="season-day-details" className="season-day-details" aria-live="polite">
        <span className="season-calendar-phase"><StageIcon size={16} aria-hidden="true" />{bn ? stage.bn : stage.en}</span>
        <h3>{t(`দিন ${fmt(preview)}`, `Day ${fmt(preview)}`)} · {activeDay.day.toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "long", day: "numeric", month: "short" })}</h3>
        <h4 className="season-tips-title">{t("ফলন বৃদ্ধির কিছু টিপস", "Tips for a better harvest")}</h4>
        <p className="season-day-tip">{t(activeDay.tip.bn, activeDay.tip.en)}</p>
        {activeAlerts.some(alert => alert.type === "heavy_rain") && <p>
          <strong>{t("ভারী বৃষ্টির সম্ভাবনা।", "Heavy rain expected.")}</strong> {t("জমির পানি বের হওয়ার পথ খোলা আছে কি না দেখুন।", "Check that water can drain from the field.")}
        </p>}
        {activeAlerts.some(alert => alert.type === "cold") && <p>
          <strong>{t("বেশি ঠান্ডার সম্ভাবনা।", "Very cold weather expected.")}</strong> {t("গাছের অবস্থা দেখুন। সেচের সিদ্ধান্তের আগে কৃষি কর্মকর্তার পরামর্শ নিন।", "Check the plants and ask an agricultural adviser before deciding whether to irrigate.")}
        </p>}
        {isToday && <p>{cropGuidance(actual, null, bn).reminders[0]}</p>}
        {isToday && <a href="/farmer">{t("আজকের কাজ দেখুন", "See today’s tasks")} →</a>}
        {isToday && weeklySpray && <p>{t("শুধু মাঠে লেট ব্লাইট নিশ্চিত হলে তথ্যসূত্র:", "Reference only if field late blight is confirmed:")} {weeklySpray}.</p>}
        {preview > actual && <div><strong>{t("ভালো ফলনের জন্য করণীয়", "Prepare for a better harvest")}</strong><ul>
          {plannedWork && <li>{bn ? plannedWork.bn : plannedWork.en}</li>}
          {preparationTips[milestones.indexOf(stage)].slice(plannedWork ? 1 : 0).map(([b, e]) => <li key={e}>{t(b, e)}</li>)}
        </ul></div>}
        {activeDay.records.map(record => <p className="season-record" key={record.id}>{record.text}</p>)}
        {preview < actual && !activeDay.records.length && <p>{t("এই দিনে খাতায় কোনো কাজ রাখা হয়নি।", "No work was recorded in Khata for this day.")}</p>}
      </div>
    </section>
    <div className="season-reference-strip">
      <section className="season-card season-reference-card" aria-labelledby="season-seed-size">
        <div><h2 id="season-seed-size">{t("বীজ আলুর আকার", "Seed potato size")}</h2>
          <p>{t("এ গ্রেড: ২৮–৪০ মিমি", "A grade: 28–40 mm")}<br />{t("বি গ্রেড: ৪১–৫৫ মিমি", "B grade: 41–55 mm")}</p>
          <a href="https://www.banglajol.info/index.php/BJAR/article/view/20145/13925" target="_blank" rel="noopener noreferrer">{t("তথ্যসূত্র: বারি", "Source: BARI")} ↗</a>
        </div>
        <img src="/season-guide/seed-size.png" alt="" decoding="async" />
      </section>
      <section className="season-card season-reference-card" aria-labelledby="season-plant-spacing">
        <div><h2 id="season-plant-spacing">{t("রোপণের দূরত্ব", "Planting spacing")}</h2>
          <p>{t("পুরো আলু: ৬০ × ২৫ সেমি", "Whole seed: 60 × 25 cm")}<br />{t("কাটা আলু: ৪৫ × ১৫ সেমি", "Cut seed: 45 × 15 cm")}</p>
          <small>{t("সারি থেকে সারি × গাছ থেকে গাছ", "Between rows × between plants")}</small>
        </div>
        <img src="/season-guide/planting-spacing.png" alt="" decoding="async" />
      </section>
    <details className="season-card farming-fertilizer">
      <summary>
        <img src="/season-guide/fertiliser.png" alt="" decoding="async" />
        <span><strong>{t("পুরো সারের পরিমাণ", "Full-season fertiliser amounts")}</strong><small>{areaLabel} · {t("মৌসুমের আনুমানিক হিসাব", "Season estimate")}</small></span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <p>{t("পুরো মৌসুমের আনুমানিক হিসাব। মাটি ও জাতভেদে বদলাতে পারে।", "Full-season estimates vary by soil and variety.")}</p>
      <CareLandEditor bn={bn} area={area} />
      <div className="farming-table-wrap"><table><thead><tr><th>{t("সার", "Fertiliser")}</th><th>{t("পর্যায়", "Stage")}</th><th>{t("কেজি/একর", "kg/acre")}</th><th>{t("এই জমিতে মোট কেজি", "Total kg for field")}</th><th>{t("জমি তৈরির হিসাব (কেজি)", "Field preparation amount (kg)")}</th><th>{t("পরের কিস্তির হিসাব (কেজি)", "Later amount (kg)")}</th></tr></thead>
        <tbody>{nutrients.map(item => {
          const later = "later" in item ? item.later : null;
          const total = later ? [item.basal[0] + later[0], item.basal[1] + later[1]] : item.basal;
          return <tr key={item.en}><th scope="row">{bn ? item.bn : item.en}</th><td>{later ? t("জমি তৈরি + ৩০–৩৫ দিন", "Field preparation + days 30–35") : t("জমি তৈরি", "Field preparation")}</td><td>{amount(total, areaSquareMetres(1, "acre"))}</td><td>{amount(total, areaM2)}</td><td>{amount(item.basal, areaM2)}</td><td>{later ? amount(later, areaM2) : fmt(0)}</td></tr>;
        })}</tbody></table></div>
      <p><a href="https://www.bamis.gov.bd/en/bulletin/view/37638/" target="_blank" rel="noopener noreferrer">BAMIS · {t("জমি তৈরি", "Field preparation")} ↗</a> · <a href="https://www.bamis.gov.bd/en/bulletin/view/32495/" target="_blank" rel="noopener noreferrer">BAMIS · {t("ইউরিয়া", "Urea")} ↗</a></p>
    </details>
    </div>
  </div>;
}
