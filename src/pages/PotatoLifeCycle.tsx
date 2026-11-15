import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Pause, Play, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

type Stage = { day: number; duration: string; title: string; body: string };

const stages: Record<"bn" | "en", Stage[]> = {
  bn: [
    { day: 15, duration: "প্রায় ২ সপ্তাহ", title: "অঙ্কুর বের হয়", body: "বীজ আলুর চোখ জেগে ওঠে। প্রথম শিকড় মাটির ভেতর ছড়িয়ে পড়ে।" },
    { day: 35, duration: "প্রায় ৫ সপ্তাহ", title: "পাতা বাড়ে", body: "সবুজ গাছ আলো থেকে খাবার বানায়। শিকড় পানি ও খাবার নেয়।" },
    { day: 55, duration: "প্রায় ৮ সপ্তাহ", title: "আলু বাঁধে", body: "মাটির নিচের কান্ডে ছোট নতুন আলু তৈরি হতে শুরু করে।" },
    { day: 80, duration: "প্রায় ১১ সপ্তাহ", title: "আলু বড় হয়", body: "গাছ তার শক্তি মাটির নিচে পাঠায়। আলু দ্রুত বড় হয়।" },
    { day: 90, duration: "প্রায় ১২–১৩ সপ্তাহ", title: "তোলার সময়", body: "পাতা শুকোতে শুরু করলে আলু পরিপক্ব হয়। মাটি শুকনো থাকলে তুলুন।" },
  ],
  en: [
    { day: 15, duration: "about 2 weeks", title: "Sprouts appearing", body: "The seed potato wakes up. The first roots spread through the soil." },
    { day: 35, duration: "about 5 weeks", title: "Leaf growth", body: "Green plants make food from light. Roots take in water and nutrients." },
    { day: 55, duration: "about 8 weeks", title: "Potato formation", body: "Small new potatoes begin forming on stems below the soil." },
    { day: 80, duration: "about 11 weeks", title: "Maturity", body: "The plant sends energy below the soil. Potatoes grow quickly." },
    { day: 90, duration: "about 12–13 weeks", title: "Harvest ready", body: "Potatoes mature as the leaves start to dry. Harvest when the soil is dry." },
  ],
};

const grow = (day: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (day - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

const tubers = [
  { x: 340, y: 570, width: 110, start: 38, angle: 32 },
  { x: 650, y: 560, width: 135, start: 41, angle: -48 },
  { x: 250, y: 675, width: 130, start: 44, angle: 28 },
  { x: 425, y: 740, width: 145, start: 47, angle: -20 },
  { x: 610, y: 690, width: 150, start: 43, angle: -12 },
  { x: 755, y: 755, width: 115, start: 50, angle: -30 },
];

export default function PotatoLifeCycle({ compact = false, showExploreLink = true }: { compact?: boolean; showExploreLink?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const initialDay = compact && reducedMotion ? 66 : 15;
  const [day, setDay] = useState(initialDay);
  const dayRef = useRef(initialDay);
  const [playing, setPlaying] = useState(false);
  const [artState, setArtState] = useState("loading");
  const copy = stages[language];
  const dayLabel = (value: number) => Math.round(value).toLocaleString(language === "bn" ? "bn-BD" : "en-GB");
  const stage = copy.reduce((current, item, index) => day >= item.day ? index : current, 0);
  const active = copy[stage];
  const flowering = grow(day, 38, 52);
  const ageing = grow(day, 72, 90);
  const seedAge = grow(day, 22, 78);
  const shootGrowth = grow(day, 3, 15);
  const endDay = compact ? 72 : 90;
  const playLabel = playing ? (language === "bn" ? "থামান" : "Pause")
    : compact ? day >= endDay ? (language === "bn" ? "আবার দেখুন" : "Replay") : (language === "bn" ? "চালান" : "Play")
    : (language === "bn" ? "পুরো সময় দেখুন" : "Play full life cycle");
  const Container = compact ? "section" : "main";
  const StageHeading = compact ? "h2" : "h1";

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { setReducedMotion(preference.matches); if (preference.matches) setPlaying(false); };
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);

  useEffect(() => {
    if (compact && artState === "ready" && !reducedMotion) setPlaying(true);
  }, [compact, artState, reducedMotion]);

  useEffect(() => {
    let active = true;
    Promise.all(["soil-clean", "seed", "preflower", "foliage"].map(async name => {
      const image = new Image();
      image.src = `/life-cycle/growth-${name}.png`;
      await image.decode();
    })).then(() => { if (active) setArtState("ready"); }).catch(() => { if (active) setArtState("error"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (last) {
        const next = Math.min(endDay, dayRef.current + Math.min(now - last, 100) * 90 / 18000);
        dayRef.current = next;
        setDay(next);
        if (next === endDay) { setPlaying(false); return; }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, endDay]);

  const chooseDay = (next: number) => { dayRef.current = next; setDay(next); setPlaying(false); };
  const label = language === "bn" ? "আলুর জীবনচক্র" : "Potato life cycle";
  const growthStyle = {
    "--foliage-scale": (0.025 + 0.635 * grow(day, 8, 66)).toFixed(3),
    "--canopy-width": (0.2 + 0.8 * grow(day, 10, 48)).toFixed(3),
    "--canopy-height": (1 - 0.12 * ageing).toFixed(3),
    "--flower-radius": `${(13 * flowering).toFixed(3)}%`,
    "--flower-opacity": (1 - ageing).toFixed(4),
    "--leaf-age": ageing.toFixed(4),
    "--seed-width": (0.68 * (1 - 0.42 * seedAge)).toFixed(3),
    "--seed-height": (0.68 * (1 - 0.26 * seedAge)).toFixed(3),
    "--seed-light": (1 - 0.48 * seedAge).toFixed(3),
    "--seed-saturation": (1 - 0.65 * seedAge).toFixed(3),
    "--seed-opacity": (1 - 0.85 * grow(day, 48, 88)).toFixed(3),
    "--seed-tilt": `${(-9 * seedAge).toFixed(2)}deg`,
    "--droop": `${(4 * ageing).toFixed(2)}deg`,
  } as CSSProperties;

  return <Container className={`${compact ? "life-hero-illustration" : "potato-life-page"} ${language === "bn" ? "font-bangla" : ""}`} aria-label={compact ? label : undefined}>
    {!compact && <header className="life-page-header">
      <Link to="/" className="life-back"><ArrowLeft size={18} /><span>{language === "bn" ? "আলুসাথী" : "AluSathi"}</span></Link>
      <div className="life-brand" aria-label={label}><strong>{language === "bn" ? "আলু" : "Potato"}</strong><span>{language === "bn" ? "মাটির নিচের জীবন" : "Life below the soil"}</span><Sprout aria-hidden="true" size={22} /></div>
      <div className="life-header-actions"><span className="life-crop-chip"><b>{language === "bn" ? "আলু" : "Potato"}</b></span><button className="life-language" type="button" onClick={() => setLanguage(language === "bn" ? "en" : "bn")} aria-label={language === "bn" ? "ভাষা বদলান" : "Change language"}>{language === "bn" ? "EN" : "বাংলা"}</button></div>
    </header>}

    <section className="life-stage" aria-labelledby="life-stage-title">
      <div className="life-stage-backdrop" aria-hidden="true" />
      <div className="life-botanical" role="img" aria-label={`${active.title}, ${language === "bn" ? "দিন" : "day"} ${dayLabel(day)}`} style={growthStyle}>
        <img className="life-growth-soil" src="/life-cycle/growth-soil-clean.png" alt="" />
        <div className="life-growth-seed" aria-hidden="true" />
        <svg className="life-underground" viewBox="0 0 1000 1000" aria-hidden="true" style={{ "--shoot-growth": shootGrowth.toFixed(3) } as CSSProperties}>
          <defs><linearGradient id="underground-stem" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#6b4c2c" /><stop offset=".4" stopColor="#f0d4a0" /><stop offset=".7" stopColor="#c9a773" /><stop offset="1" stopColor="#88643d" /></linearGradient></defs>
          <path className="life-seed-shoot" d="M490 635 C468 597 513 554 496 516 Q487 480 500 465" pathLength="1" stroke="url(#underground-stem)" strokeWidth={4 + 7 * shootGrowth} />
          <path className="life-seed-shoot" d="M481 648 C454 621 451 609 457 590 M511 653 Q539 624 530 602" pathLength="1" stroke="#ddbd84" strokeWidth="4" />
          {[-1, 1].flatMap(side => [0, 1, 2, 3].map(i => {
            const y = 490 + i * 37;
            const x = 496 + side * (95 + i * 24);
            const endY = y + 120 + i * 13;
            const amount = grow(day, 10 + i * 3, 27 + i * 4);
            return <g key={`${side}-${i}`} fill="none" stroke="#d1b27d" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - amount} opacity={amount}>
              <path d={`M496 ${y} Q${496 + side * 30} ${y + 47} ${x} ${endY}`} pathLength="1" strokeWidth={2.2 - i * .25} />
              <path d={`M${496 + side * 36} ${y + 65} Q${496 + side * 72} ${y + 87} ${x + side * 20} ${endY - 20} M${x - side * 18} ${endY - 28} q${side * 12} 34 ${side * 7} 60`} pathLength="1" strokeWidth=".9" />
            </g>;
          }))}
          {tubers.map((tuber, index) => {
            const root = grow(day, tuber.start - 16, tuber.start);
            const size = grow(day, tuber.start, 82 + index);
            return <g key={tuber.x}>
              <path d={`M500 470 Q${500 + (tuber.x - 500) * .25} ${tuber.y - 30} ${tuber.x} ${tuber.y}`} fill="none" stroke="#ddbd84" strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - root} />
              <g className="life-tuber" data-growth={size.toFixed(4)} transform={`translate(${tuber.x} ${tuber.y}) rotate(${tuber.angle}) scale(${size.toFixed(5)})`}>
                <svg x={-tuber.width / 2} y="-4" width={tuber.width} height={tuber.width * 1.12} viewBox="380 590 240 270">
                  <image href="/life-cycle/growth-seed.png" width="1000" height="1000" />
                </svg>
              </g>
            </g>;
          })}
        </svg>
        <div className="life-canopy">
          <img className="life-growth-preflower" src="/life-cycle/growth-preflower.png" alt="" />
          <img className="life-growth-flowers" src="/life-cycle/growth-foliage.png" alt="" />
          <img className="life-growth-aged" src="/life-cycle/growth-preflower.png" alt="" />
        </div>
      </div>
      <div className="life-stage-copy" aria-live={compact ? "off" : "polite"}>
        <StageHeading id="life-stage-title">{active.title}</StageHeading>
        {!compact && <strong>{language === "bn" ? `দিন ${dayLabel(day)}` : `Day ${dayLabel(day)}`}</strong>}
      </div>
    </section>

    <section className="life-controls" aria-label={language === "bn" ? "জীবনচক্র নিয়ন্ত্রণ" : "Life cycle controls"}>
      {!compact && <div className="life-timeline" aria-label={language === "bn" ? "ধাপ বাছুন" : "Choose a stage"}>
        {copy.map((item, index) => <button disabled={artState !== "ready"} key={item.title} className={index === stage ? "active" : ""} onClick={() => chooseDay(item.day)} aria-label={`${language === "bn" ? "দিন" : "Day"} ${dayLabel(item.day)}: ${item.title}`} aria-current={index === stage ? "step" : undefined}><i /><span className="sr-only">{item.title}</span></button>)}
      </div>}
      <div className="life-scrubber"><span>{language === "bn" ? "বীজ আলু" : "Seed potato"}</span><input disabled={artState !== "ready"} type="range" min="0" max={endDay} step="0.1" value={day} onChange={(event) => chooseDay(Number(event.target.value))} aria-label={language === "bn" ? "আলুর বৃদ্ধির সময়" : "Potato growing time"} /><span>{compact ? (language === "bn" ? "আলু বড় হয়" : "Growth") : (language === "bn" ? "ফসল তোলা" : "Harvest")}</span></div>
      <div className="life-action-row"><button disabled={artState !== "ready"} type="button" className="life-play" onClick={() => { if (dayRef.current >= endDay) { dayRef.current = 0; setDay(0); } setPlaying(value => !value); }} aria-pressed={playing}>{playing ? <Pause fill="currentColor" size={15} /> : <Play fill="currentColor" size={15} />}{playLabel}</button>{compact ? showExploreLink && <Link to="/life-cycle">{language === "bn" ? "পুরো জীবনচক্র দেখুন" : "Explore the full life cycle"} <span aria-hidden="true">↗</span></Link> : <span>{language === "bn" ? `আলুর মৌসুম · ${active.duration}` : `Potato season · ${active.duration}`}</span>}</div>
      {artState !== "ready" && <p role="status" className="life-timing-note">{artState === "error" ? (language === "bn" ? "ছবি আসেনি। পাতাটি আবার খুলুন।" : "Illustration could not load. Refresh the page.") : (language === "bn" ? "ছবি আসছে…" : "Loading illustration…")}</p>}
      {!compact && <><p className="life-caption">{active.body}</p>
      <small className="life-timing-note">{language === "bn" ? "বোঝানোর জন্য সময় দেখানো হয়েছে। জাত ও আবহাওয়ায় সময় বদলাবে।" : "These times are examples. Actual growth depends on the variety and weather."}</small></>}
    </section>
  </Container>;
}
