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
    { day: 15, duration: "about 2 weeks", title: "Sprouting eyes", body: "The seed potato wakes up. The first roots spread through the soil." },
    { day: 35, duration: "about 5 weeks", title: "Leaf growth", body: "Green leaves make food from sunlight while roots take in water." },
    { day: 55, duration: "about 8 weeks", title: "Tuber formation", body: "Small new potatoes begin forming on stems below the soil." },
    { day: 80, duration: "about 11 weeks", title: "Maturity", body: "The plant sends its energy below the soil as potatoes grow quickly." },
    { day: 90, duration: "about 12–13 weeks", title: "Harvest ready", body: "As foliage starts to dry, mature potatoes are ready to be lifted." },
  ],
};

const grow = (day: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (day - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export default function PotatoLifeCycle() {
  const { language, setLanguage } = useLanguage();
  const [day, setDay] = useState(15);
  const dayRef = useRef(15);
  const [playing, setPlaying] = useState(false);
  const copy = stages[language];
  const dayLabel = (value: number) => Math.round(value).toLocaleString(language === "bn" ? "bn-BD" : "en-GB");
  const stage = copy.reduce((current, item, index) => day >= item.day ? index : current, 0);
  const active = copy[stage];
  const green = 1 - grow(day, 72, 90);
  const flowering = grow(day, 38, 52);
  const seedAge = grow(day, 22, 78);
  const shootGrowth = grow(day, 3, 15);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (last) {
        const next = Math.min(90, dayRef.current + (now - last) * 90 / 18000);
        dayRef.current = next;
        setDay(next);
        if (next === 90) { setPlaying(false); return; }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const chooseDay = (next: number) => { dayRef.current = next; setDay(next); setPlaying(false); };
  const label = language === "bn" ? "আলুর জীবনচক্র" : "Potato underground life";
  const growthStyle = {
    "--foliage-scale": (0.035 + 0.36 * grow(day, 2, 27) + 0.385 * grow(day, 27, 66)).toFixed(3),
    "--sprout-scale": (0.025 + 0.18 * grow(day, 2, 27)).toFixed(3),
    "--sprout-opacity": (grow(day, 12, 18) * (1 - grow(day, 25, 31))).toFixed(3),
    "--canopy-growth": grow(day, 18, 30).toFixed(3),
    "--preflower-opacity": (green * (1 - flowering)).toFixed(3),
    "--flowering-opacity": (green * flowering).toFixed(3),
    "--root-scale": (0.08 + 0.57 * grow(day, 38, 80)).toFixed(3),
    "--root-opacity": grow(day, 38, 53).toFixed(3),
    "--seed-width": (0.68 * (1 - 0.42 * seedAge)).toFixed(3),
    "--seed-height": (0.68 * (1 - 0.26 * seedAge)).toFixed(3),
    "--seed-light": (1 - 0.48 * seedAge).toFixed(3),
    "--seed-saturation": (1 - 0.65 * seedAge).toFixed(3),
    "--seed-opacity": (1 - 0.85 * grow(day, 48, 88)).toFixed(3),
    "--seed-tilt": `${(-9 * seedAge).toFixed(2)}deg`,
    "--old-opacity": grow(day, 72, 90).toFixed(3),
    "--droop": `${(7 * grow(day, 73, 90)).toFixed(2)}deg`,
  } as CSSProperties;

  return <main className={`potato-life-page ${language === "bn" ? "font-bangla" : ""}`}>
    <header className="life-page-header">
      <Link to="/" className="life-back"><ArrowLeft size={18} /><span>{language === "bn" ? "আলুসাথী" : "AluSathi"}</span></Link>
      <div className="life-brand" aria-label={label}><strong>{language === "bn" ? "আলু" : "Potato"}</strong><span>{language === "bn" ? "মাটির নিচের জীবন" : "UNDERGROUND LIFE"}</span><Sprout aria-hidden="true" size={22} /></div>
      <div className="life-header-actions"><span className="life-crop-chip"><b>{language === "bn" ? "আলু" : "Potato"}</b></span><button className="life-language" type="button" onClick={() => setLanguage(language === "bn" ? "en" : "bn")} aria-label={language === "bn" ? "ভাষা বদলান" : "Change language"}>{language === "bn" ? "EN" : "বাংলা"}</button></div>
    </header>

    <section className="life-stage" aria-labelledby="life-stage-title">
      <div className="life-stage-backdrop" aria-hidden="true" />
      <div className="life-botanical" role="img" aria-label={`${active.title}, ${language === "bn" ? "দিন" : "day"} ${dayLabel(day)}`} style={growthStyle}>
        <img className="life-growth-soil" src="/life-cycle/growth-soil-clean.png" alt="" />
        <div className="life-growth-seed" aria-hidden="true" />
        <svg className="life-underground" viewBox="0 0 1000 1000" aria-hidden="true" style={{ "--shoot-growth": shootGrowth.toFixed(3), opacity: 1 - 0.7 * grow(day, 55, 85) } as CSSProperties}>
          <defs><linearGradient id="underground-stem" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#6b4c2c" /><stop offset=".4" stopColor="#f0d4a0" /><stop offset=".7" stopColor="#c9a773" /><stop offset="1" stopColor="#88643d" /></linearGradient></defs>
          <path className="life-seed-shoot" d="M490 635 C468 597 513 554 496 516 Q487 480 500 427" pathLength="1" stroke="url(#underground-stem)" strokeWidth={4 + 7 * shootGrowth} />
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
        </svg>
        <img className="life-growth-roots" src="/life-cycle/growth-tubers.png" alt="" decoding="async" />
        <img className="life-growth-sprout" src="/life-cycle/growth-sprout.png" alt="" decoding="async" />
        <img className="life-growth-preflower" src="/life-cycle/growth-preflower.png" alt="" decoding="async" />
        <img className="life-growth-flowering" src="/life-cycle/growth-foliage.png" alt="" decoding="async" />
        <img className="life-growth-senescent" src="/life-cycle/growth-senescent.png" alt="" decoding="async" />
      </div>
      <div className="life-stage-copy" aria-live="polite">
        <h1 id="life-stage-title">{active.title}</h1>
        <strong>{language === "bn" ? `দিন ${dayLabel(day)}` : `Day ${dayLabel(day)}`}</strong>
      </div>
    </section>

    <section className="life-controls" aria-label={language === "bn" ? "জীবনচক্র নিয়ন্ত্রণ" : "Life cycle controls"}>
      <div className="life-timeline" aria-label={language === "bn" ? "ধাপ বাছুন" : "Choose a stage"}>
        {copy.map((item, index) => <button key={item.title} className={index === stage ? "active" : ""} onClick={() => chooseDay(item.day)} aria-label={`${language === "bn" ? "দিন" : "Day"} ${dayLabel(item.day)}: ${item.title}`} aria-current={index === stage ? "step" : undefined}><i /><span className="sr-only">{item.title}</span></button>)}
      </div>
      <div className="life-scrubber"><span>{language === "bn" ? "বীজ আলু" : "SEED"}</span><input type="range" min="0" max="90" step="0.1" value={day} onChange={(event) => chooseDay(Number(event.target.value))} aria-label={language === "bn" ? "আলুর বৃদ্ধির সময়" : "Time in the potato life"} /><span>{language === "bn" ? "ফসল তোলা" : "HARVEST"}</span></div>
      <div className="life-action-row"><button type="button" className="life-play" onClick={() => { if (dayRef.current >= 90) { dayRef.current = 0; setDay(0); } setPlaying(value => !value); }} aria-pressed={playing}>{playing ? <Pause fill="currentColor" size={15} /> : <Play fill="currentColor" size={15} />}{playing ? (language === "bn" ? "থামান" : "Pause") : (language === "bn" ? "পুরো সময় দেখুন" : "Play the whole life")}</button><span>{language === "bn" ? `আলুর মৌসুম · ${active.duration}` : `Potato season · ${active.duration}`}</span></div>
      <p className="life-caption">{active.body}</p>
      <small className="life-timing-note">{language === "bn" ? "বোঝানোর জন্য সময় দেখানো হয়েছে। জাত ও আবহাওয়ায় সময় বদলাবে।" : "Illustrative timing. Actual growth varies with variety and weather."}</small>
    </section>
  </main>;
}
