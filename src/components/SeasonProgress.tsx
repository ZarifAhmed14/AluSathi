import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, CircleCheck, Flower2, Leaf, PackageCheck, Sprout } from "lucide-react";
import { areaSquareMetres } from "@/lib/farmer-tools";
import { cropGuidance } from "@/lib/crop-advice";
import { localToday } from "@/lib/local-date";
import { readFieldActions } from "@/lib/field-actions";
import { readCareArea } from "@/lib/care-area";
import CareLandEditor from "./CareLandEditor";
import { recentPhoto, sprayReference } from "@/lib/today-plan";
import { PROFILE_CHANGED } from "@/lib/farmer-profile";
import { seasonTips, seasonTipsNote } from "@/data/season-tips";

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
  { start: 1, end: 14, icon: Sprout, bn: "রোপণ", en: "Planting", note: ["লাগানো আলু থেকে অঙ্কুর বের হতে শুরু করে।", "Shoots begin to emerge from planted tubers."] },
  { start: 15, end: 30, icon: Leaf, bn: "প্রাথমিক বৃদ্ধি", en: "Early growth", note: ["গাছের কাণ্ড ও পাতা বাড়তে থাকে।", "Stems and leaves continue to grow."] },
  { start: 31, end: 45, icon: Flower2, bn: "কন্দ গঠন", en: "Tuber formation", note: ["মাটির নিচে নতুন আলু গঠন শুরু হতে পারে।", "New tubers may begin forming below ground."] },
  { start: 46, end: 70, icon: Sprout, bn: "কন্দ বৃদ্ধি", en: "Tuber growth", note: ["মাটির নিচে আলুর আকার বাড়তে থাকে।", "Tubers continue to grow below ground."] },
  { start: 71, end: 90, icon: PackageCheck, bn: "ফসল সংগ্রহ", en: "Harvest", note: ["ফসল তোলার সময় জাত ও জমির অবস্থা অনুযায়ী বদলায়।", "Harvest timing varies by variety and field conditions."] },
] as const;

const upcoming = [
  { start: 15, end: 30, bn: "আগাছা আছে কি না ও গাছ কেমন বাড়ছে দেখুন", en: "Check for weeds and watch plant growth" },
  { start: 30, end: 35, bn: "গোড়ায় মাটি দেওয়ার সময় মিলিয়ে নিন", en: "Check when to earth up the plants", note: ["মাটি দিয়ে আলু ঢেকে রাখলে সবুজ হওয়ার ঝুঁকি কমে।", "Covering tubers with soil helps prevent greening."] },
  { start: 48, end: 63, bn: "মাটি দেখে সেচ লাগবে কি না বুঝে নিন", en: "Check soil moisture to see whether irrigation is needed" },
  { start: 71, end: 90, bn: "আলু তোলার সময় হয়েছে কি না দেখুন", en: "Check whether the crop is ready to harvest" },
] as const;

function readSeasonArea() {
  const area = readCareArea();
  return area.example ? { ...area, unit: "acre" as const } : area;
}

export default function SeasonProgress({ bn, district }: { bn: boolean; district: string }) {
  const t = (b: string, e: string) => bn ? b : e;
  const now = new Date();
  const today = localToday(now);
  const actual = 8;
  const [selected, setSelected] = useState<number | null>(null);
  const preview = selected ?? actual;
  const calendarRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const calendar = calendarRef.current;
    const selectedDay = calendar?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!calendar || !selectedDay) return;
    calendar.scrollLeft += selectedDay.getBoundingClientRect().left - calendar.getBoundingClientRect().left - (calendar.clientWidth - selectedDay.offsetWidth) / 2;
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
  const areaLabel = `${fmt(Number(area.value))} ${({ acre: t("একর", Number(area.value) === 1 ? "acre" : "acres"), decimal: t("শতক", "shotok"), bigha: t("বিঘা", "bigha"), hectare: t("হেক্টর", "ha") })[area.unit]}`;
  const amount = (range: readonly number[], metres: number) => `${fmt(range[0] * metres / 10000)}–${fmt(range[1] * metres / 10000)}`;
  const actions = readFieldActions();
  const stage = milestones.find(item => preview <= item.end) ?? milestones[0];
  const StageIcon = stage.icon;
  const range = ({ start, end }: { start: number; end: number }) => t(`দিন ${fmt(start)}–${fmt(end)}`, `Days ${fmt(start)}–${fmt(end)}`);
  const weeklySpray = sprayReference(recentPhoto(actions, district, today), bn);
  const planting = new Date(now);
  planting.setDate(now.getDate() - actual + 1);
  const offset = (planting.getDay() + 6) % 7;
  const week = Math.floor((preview + offset - 1) / 7);
  const firstDay = week * 7 - offset + 1;
  const days = Array.from({ length: 7 }, (_, index) => {
    const number = firstDay + index;
    const day = new Date(planting);
    day.setDate(planting.getDate() + number - 1);
    const date = localToday(day);
    const records = date <= today ? actions.filter(item => item.date === date && (item.district === district || !item.district) && (item.kind === "task" || item.category === "fertilizer" && item.status === "applied")) : [];
    const guidance = upcoming.filter(item => item.start === number);
    return { number, day, date, records, guidance, tip: seasonTips[number - 1] };
  });
  const activeDay = days[preview - firstDay];
  const isToday = preview === actual;

  return <div className="app-shell season-progress">
    <div className="season-main">
    <section className="season-card season-journey" aria-labelledby="season-title">
      <div className="season-journey-heading">
        <div><h1 id="season-title">{t("আলুর ৯০ দিনের যাত্রা", "The 90-day potato journey")}</h1><p>{t("আপনার মৌসুমটি ঘুরে দেখুন", "Explore your growing season")}</p></div>
        <span>{areaLabel}</span>
      </div>
      <div className="season-actual">
        <div className="season-progress-label"><strong>{t("মৌসুমের পরিকল্পনা", "Season plan")}</strong><span className="season-current">{t(`দিন ${fmt(actual)} / ৯০`, `Day ${fmt(actual)} / 90`)}</span></div>
        <div className="season-track"><progress value={actual} max={90} aria-label={t("মৌসুমের পরিকল্পনা", "Season plan")} /><i aria-hidden="true" style={{ insetInlineStart: `${actual / 90 * 100}%` }} /></div>
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
      <p className="season-safety">{t("এটি আনুমানিক ধাপ, জমির নিশ্চিত অবস্থা নয়। সার বা স্প্রে প্রয়োগের নির্দেশও নয়।", "Stages are approximate, not verified field conditions or instructions to apply fertilizer or spray.")}</p>
    </section>
    <div className="season-side">
    <section className="season-card season-upcoming" aria-labelledby="season-upcoming-title">
      <div className="season-upcoming-heading">
        <h2 id="season-upcoming-title"><CalendarDays size={21} aria-hidden="true" />{t("সামনে গুরুত্বপূর্ণ কাজ", "Important work ahead")}</h2>
      </div>
      <ol>{upcoming.map(item => <li key={item.start}>
        <button type="button" className="season-upcoming-jump" aria-controls="season-stage" aria-pressed={preview >= item.start && preview <= item.end} onClick={() => setSelected(item.start)}>{range(item)}</button>
        <div>{bn ? item.bn : item.en}{"note" in item && <small>{item.note[bn ? 0 : 1]}</small>}</div>
      </li>)}</ol>
    </section>
    </div>
    </div>
    <section className="season-card season-week season-calendar" aria-labelledby="season-calendar-title">
      <header className="season-calendar-head">
        <div className="season-calendar-title">
          <span className="season-calendar-emblem"><CalendarDays size={24} aria-hidden="true" /></span>
          <div>
            <h2 id="season-calendar-title">{t("মৌসুমের ক্যালেন্ডার", "Season calendar")}</h2>
            <p><strong>{t(`আজ আপনার আলু চাষের ${fmt(actual)}ম দিন`, `Today is day ${fmt(actual)} of your growing season`)}</strong></p>
            <p aria-live="polite">{t(`সপ্তাহ ${fmt(week + 1)}`, `Week ${fmt(week + 1)}`)} · {range({ start: Math.max(1, firstDay), end: Math.min(90, firstDay + 6) })}</p>
          </div>
        </div>
        <div className="season-calendar-controls">
          <button type="button" disabled={firstDay <= 1} onClick={() => setSelected(Math.max(1, firstDay - 7))}>← {t("আগের সপ্তাহ", "Previous week")}</button>
          <button type="button" onClick={() => setSelected(null)}>{t("আজকের দিন", "Today")}</button>
          <button type="button" disabled={firstDay + 6 >= 90} onClick={() => setSelected(firstDay + 7)}>{t("পরের সপ্তাহ", "Next week")} →</button>
          <button type="button" onClick={() => setSelected(90)}>{t("দিন ৯০", "Day 90")} ↗</button>
        </div>
      </header>
      <ul className="season-calendar-grid" key={week} ref={calendarRef}>{days.map(({ number, day, date, records, tip }) => (
        <li key={date}>
          <button type="button" data-day={number} disabled={number < 1 || number > 90} aria-current={number === actual ? "date" : undefined} aria-pressed={number === preview} aria-controls="season-day-details" onClick={() => setSelected(number)}>
            <span className="season-calendar-weekday">{day.toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "short" })}</span>
            <time dateTime={date}><strong>{fmt(day.getDate())}</strong> {day.toLocaleDateString(bn ? "bn-BD" : "en-GB", { month: "short" })}</time>
            {number >= 1 && number <= 90 && <small>{number === actual ? t("আজ · ", "Today · ") : ""}{t(`দিন ${fmt(number)}`, `Day ${fmt(number)}`)}</small>}
            {records.length > 0 && <span className="season-calendar-event recorded"><CircleCheck size={14} role="img" aria-label={t("কাজ শেষ", "Completed")} /> {t("খাতায় আছে", "In Khata")} · {fmt(records.length)}</span>}
            {number === actual && <span className="season-calendar-event">{t("আজকের কাজ", "Today’s work")}</span>}
            {tip && <span className="season-calendar-tip">{bn ? tip.bn : tip.en}</span>}
          </button>
        </li>
      ))}</ul>
      <p className="season-calendar-note">{bn ? seasonTipsNote.bn : seasonTipsNote.en}</p>
      <div id="season-day-details" className="season-day-details" aria-live="polite">
        <span className="season-calendar-phase"><StageIcon size={16} aria-hidden="true" />{bn ? stage.bn : stage.en}</span>
        <h3>{t(`দিন ${fmt(preview)}`, `Day ${fmt(preview)}`)} · {activeDay.day.toLocaleDateString(bn ? "bn-BD" : "en-GB", { weekday: "long", day: "numeric", month: "short" })}</h3>
        {activeDay.tip && <p className="season-day-tip">{bn ? activeDay.tip.bn : activeDay.tip.en}</p>}
        {isToday && <p>{cropGuidance(actual, null, bn).reminders[0]}</p>}
        {isToday && weeklySpray && <p>{t("শুধু মাঠে লেট ব্লাইট নিশ্চিত হলে তথ্যসূত্র:", "Reference only if field late blight is confirmed:")} {weeklySpray}.</p>}
        {activeDay.guidance.map(item => <p key={item.start}>{bn ? item.bn : item.en}</p>)}
        {activeDay.records.map(record => <p className="season-record" key={record.id}>{t("খাতায় রাখা হয়েছে:", "Recorded in Khata:")} {record.text}</p>)}
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
      <div className="farming-table-wrap"><table><thead><tr><th>{t("সার", "Fertiliser")}</th><th>{t("পর্যায়", "Stage")}</th><th>{t("কেজি/একর", "kg/acre")}</th><th>{t("এই জমিতে মোট কেজি", "Total kg for field")}</th><th>{t("জমি তৈরির হিসাব (কেজি)", "Basal estimate (kg)")}</th><th>{t("পরের কিস্তির হিসাব (কেজি)", "Later estimate (kg)")}</th></tr></thead>
        <tbody>{nutrients.map(item => {
          const later = "later" in item ? item.later : null;
          const total = later ? [item.basal[0] + later[0], item.basal[1] + later[1]] : item.basal;
          return <tr key={item.en}><th scope="row">{bn ? item.bn : item.en}</th><td>{later ? t("জমি তৈরি + ৩০–৩৫ দিন", "Basal + days 30–35") : t("জমি তৈরি", "Basal")}</td><td>{amount(total, areaSquareMetres(1, "acre"))}</td><td>{amount(total, areaM2)}</td><td>{amount(item.basal, areaM2)}</td><td>{later ? amount(later, areaM2) : fmt(0)}</td></tr>;
        })}</tbody></table></div>
      <p><a href="https://www.bamis.gov.bd/en/bulletin/view/37638/" target="_blank" rel="noopener noreferrer">BAMIS · {t("জমি তৈরি", "basal rates")} ↗</a> · <a href="https://www.bamis.gov.bd/en/bulletin/view/32495/" target="_blank" rel="noopener noreferrer">BAMIS · {t("ইউরিয়া", "urea top dressing")} ↗</a></p>
    </details>
    </div>
  </div>;
}
