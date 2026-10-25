import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Share2, Printer, CloudRain, Undo2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiseaseResult } from "@/lib/disease-api";
import type { WeatherData } from "@/lib/api";
import { downloadFile, spreadOutlook } from "@/lib/farmer-tools";

type Point = [number, number];
function mask(points: Point[][]) {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.fillStyle = "#fff";
  for (const polygon of points) { context.beginPath(); polygon.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y)); context.closePath(); context.fill(); }
  return context.getImageData(0, 0, 512, 512).data;
}

function SeverityMeasure({ image, onMeasure }: { image: string; onMeasure: (percent: number | null) => void }) {
  const { language } = useLanguage(); const bn = language === "bn";
  const [outline, setOutline] = useState<Point[]>([]);
  const [lesions, setLesions] = useState<Point[][]>([]);
  const [stroke, setStroke] = useState<Point[]>([]);
  const active = useRef<Point[]>([]);
  function finish() {
    const points = active.current; active.current = []; setStroke([]);
    if (points.length < 3) return;
    if (!outline.length) { setOutline(points); return; }
    const next = [...lesions, points]; setLesions(next);
    const leaf = mask([outline]); const damage = mask(next);
    let leafPixels = 0, damagedPixels = 0;
    for (let i = 3; i < leaf.length; i += 4) { if (leaf[i] > 128) { leafPixels++; if (damage[i] > 128) damagedPixels++; } }
    onMeasure(leafPixels >= 1000 ? Math.round(damagedPixels / leafPixels * 1000) / 10 : null);
  }
  const point = (e: React.PointerEvent<SVGSVGElement>): Point => { const rect = e.currentTarget.getBoundingClientRect(); return [Math.max(0, Math.min(512, (e.clientX - rect.left) / rect.width * 512)), Math.max(0, Math.min(512, (e.clientY - rect.top) / rect.height * 512))]; };
  return <details className="farmer-tool severity-tool"><summary>{bn ? "পাতার কতটা অংশে দাগ?" : "How much leaf area is marked?"}</summary><div className="tool-body">
    <p>{bn ? "প্রথমে একটি পাতার চারপাশে আঙুল ঘুরিয়ে দাগ দিন। তারপর ক্ষতিগ্রস্ত অংশ ঘিরুন। একাধিক দাগ ঘেরা যাবে।" : "First trace around one leaf. Then trace each damaged area. You can mark several spots."}</p>
    <strong>{outline.length ? (bn ? "২. এবার ক্ষতিগ্রস্ত অংশ ঘিরুন" : "2. Trace damaged areas") : (bn ? "১. পাতার চারপাশ ঘিরুন" : "1. Trace the leaf outline")}</strong>
    <svg className="severity-canvas" viewBox="0 0 512 512" aria-label={bn ? "পাতা ও দাগ চিহ্নিত করার ছবি" : "Mark leaf and damaged areas"} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); active.current = [point(e)]; setStroke(active.current); }} onPointerMove={e => { if (active.current.length) { active.current = [...active.current, point(e)]; setStroke(active.current); } }} onPointerUp={finish} onPointerCancel={() => { active.current = []; setStroke([]); }}>
      <image href={image} width="512" height="512" preserveAspectRatio="none" />
      {outline.length > 0 && <polygon points={outline.map(p => p.join(",")).join(" ")} fill="#31b77722" stroke="#4aff9b" strokeWidth="3" />}
      {lesions.map((polygon, i) => <polygon key={i} points={polygon.map(p => p.join(",")).join(" ")} fill="#ef574466" stroke="#ff755d" strokeWidth="2" />)}
      <polyline points={stroke.map(p => p.join(",")).join(" ")} fill="none" stroke={outline.length ? "#ff755d" : "#4aff9b"} strokeWidth="3" />
    </svg>
    <button className="text-button" onClick={() => { setOutline([]); setLesions([]); onMeasure(null); }}><Undo2 size={16} />{bn ? "মুছে আবার আঁকুন" : "Clear and redraw"}</button>
    <small>{bn ? "এটি আপনার আঁকা দাগের মাপ। AI দিয়ে রোগের তীব্রতা মাপা নয়; পুরো জমির অবস্থাও নয়।" : "This measures your marked area. It is an assisted image measurement, not automated disease severity or whole-field damage."}</small>
  </div></details>;
}

export default function ScanInsights({ results, weather, district, image, cropAgeDays, onSymptomsChange }: { results: DiseaseResult[]; weather: WeatherData | null; district: string; image: string | null; cropAgeDays: number | null; onSymptomsChange?: (symptoms: string[]) => void }) {
  const { language } = useLanguage(); const bn = language === "bn";
  const [severity, setSeverity] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shareError, setShareError] = useState("");
  const [variety, setVariety] = useState("");
  const [upazila, setUpazila] = useState("");
  const [phone, setPhone] = useState("");
  const createdAt = useRef(new Date());
  const outlook = useMemo(() => spreadOutlook(weather), [weather]);
  const outlookText = !outlook ? (bn ? "নতুন আবহাওয়ার তথ্য পেলে ছড়ানোর অনুকূল অবস্থা দেখা যাবে।" : "Fresh weather data is needed to check conditions for spread.")
    : outlook.high ? (bn ? "সামনের দুই দিনে ঠান্ডা ও দীর্ঘ সময় আর্দ্র আবহাওয়া নাবি ধসা বাড়াতে পারে। কাছের গাছও দেখুন এবং কৃষি বিশেষজ্ঞকে জানান।" : "Two consecutive forecast days meet weather conditions that can favour late blight. Inspect nearby plants and consult an agricultural expert.")
    : (bn ? "পরবর্তী ৩ দিনে এই নিয়মে একটানা অনুকূল আবহাওয়া ধরা পড়েনি। তবু রোগ ছড়াতে পারে—গাছ দেখা চালিয়ে যান।" : "The next three days do not meet this consecutive-day weather rule. Spread is still possible; keep inspecting plants.");
  const questions = [
    { id: "shape", bn: "দাগ কেমন দেখায়?", en: "What shape are the marks?", options: [["round", "গোল বা ছোপ ছোপ", "Round or patchy"], ["irregular", "এলোমেলো কিনারা", "Irregular edges"], ["none", "দাগ নেই", "No marks"], ["unsure", "বুঝতে পারছি না", "Not sure"]] },
    { id: "wet", bn: "দাগের কিনারা কি ভেজা মনে হয়?", en: "Do the mark edges look water-soaked?", options: [["yes", "হ্যাঁ", "Yes"], ["no", "না", "No"], ["unsure", "বুঝতে পারছি না", "Not sure"]] },
    { id: "white", bn: "পাতার নিচে সাদা আস্তরণ আছে?", en: "Is there white growth under the leaf?", options: [["yes", "হ্যাঁ", "Yes"], ["no", "না", "No"], ["unsure", "বুঝতে পারছি না", "Not sure"]] },
    { id: "spread", bn: "গত ১–২ দিনে দাগ কি ছড়িয়েছে?", en: "Have the marks spread in the last 1–2 days?", options: [["fast", "দ্রুত ছড়িয়েছে", "Spread quickly"], ["slow", "একটু ছড়িয়েছে", "Spread a little"], ["no", "ছড়ায়নি", "No spread"], ["unsure", "জানি না", "Don't know"]] },
  ];
  const symptomLines = questions.map(q => {
    const option = q.options.find(([value]) => value === answers[q.id]);
    return `${bn ? q.bn : q.en} ${option ? option[bn ? 1 : 2] : (bn ? "উত্তর দেওয়া হয়নি" : "Not answered")}`;
  });
  const chooseAnswer = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onSymptomsChange?.(questions.map(q => {
      const option = q.options.find(([optionValue]) => optionValue === next[q.id]);
      return option ? `${bn ? q.bn : q.en} ${option[bn ? 1 : 2]}` : "";
    }).filter(Boolean));
  };
  const report = [bn ? "আলুসাথী — কৃষকের রিপোর্ট" : "AluSathi — Farmer report", createdAt.current.toLocaleString(bn ? "bn-BD" : "en-GB"), district,
    upazila.trim() && `${bn ? "উপজেলা" : "Upazila"}: ${upazila.trim()}`, variety.trim() && `${bn ? "আলুর জাত (কৃষকের দেওয়া)" : "Variety (farmer-provided)"}: ${variety.trim()}`,
    cropAgeDays !== null && `${bn ? "লাগানোর পর" : "Days since planting"}: ${cropAgeDays} ${bn ? "দিন" : "days"}`,
    phone.trim() && `${bn ? "যোগাযোগ" : "Contact"}: ${phone.trim()}`, `${bn ? "ছবি" : "Photos"}: ${results.length}`, ...symptomLines,
    severity === null ? (bn ? "পাতার ক্ষতির পরিমাণ মাপা হয়নি।" : "Damaged area has not been measured.") : `${bn ? "চিহ্নিত পাতার ক্ষতি" : "Manually marked leaf damage"}: ${severity}%`,
    outlookText, bn ? "একই রকম দাগ পুষ্টির ঘাটতি, পোকার ক্ষতি বা অন্য রোগেও হয়।" : "Similar marks can come from nutrient stress, pests or other diseases.",
    bn ? "এই রিপোর্ট নিশ্চিত রোগ নির্ণয় নয়। ওষুধ ব্যবহারের আগে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।" : "This report is not a confirmed diagnosis. Confirm treatment with a local agricultural officer."].filter(Boolean).join("\n\n");
  async function share() {
    try {
      if (navigator.share) {
        const blob = image ? await (await fetch(image)).blob() : null;
        const photo = blob ? new File([blob], `potato-leaf.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }) : null;
        const files = photo && navigator.canShare?.({ files: [photo] }) ? [photo] : undefined;
        await navigator.share({ title: "AluSathi", text: report, files });
      } else downloadFile("AluSathi-report.txt", report);
    }
    catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setShareError(bn ? "শেয়ার হয়নি। রিপোর্ট ডাউনলোড করুন।" : "Sharing failed. Download the report instead."); }
  }
  return <div className="scan-insights">
    <section className="report-context" aria-label={bn ? "রিপোর্টে যোগ করুন" : "Add to report"}>
      <p>{bn ? "চাইলে বিশেষজ্ঞের জন্য আরও তথ্য দিন। নম্বর লিখলে শুধু পাঠানো রিপোর্টে যাবে।" : "Add details for the expert if you wish. A phone number appears only in the report you share."}</p>
      <label>{bn ? "উপজেলা" : "Upazila"}<input value={upazila} onChange={event => setUpazila(event.target.value)} maxLength={80} /></label>
      <label>{bn ? "আলুর জাত" : "Potato variety"}<input value={variety} onChange={event => setVariety(event.target.value)} maxLength={80} /></label>
      <label>{bn ? "যোগাযোগের নম্বর (ঐচ্ছিক)" : "Contact number (optional)"}<input type="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={20} autoComplete="tel" /></label>
    </section>
    <section className="symptom-check" aria-labelledby="symptom-title"><p className="section-kicker">{bn ? "বিশেষজ্ঞকে জানানোর আগে" : "Before talking to an expert"}</p><h3 id="symptom-title">{bn ? "পাতায় কী দেখছেন?" : "What do you see on the leaf?"}</h3><p>{bn ? "যা দেখেছেন শুধু সেটাই বাছুন। নিশ্চিত না হলে ‘বুঝতে পারছি না’ দিন।" : "Choose only what you can see. Select ‘Not sure’ when unclear."}</p>
      {questions.map(q => <fieldset key={q.id}><legend>{bn ? q.bn : q.en}</legend><div className="symptom-options">{q.options.map(([value, bangla, english]) => <label key={value} className={answers[q.id] === value ? "selected" : ""}><input type="radio" name={`symptom-${q.id}`} value={value} checked={answers[q.id] === value} onChange={() => chooseAnswer(q.id, value)} />{bn ? bangla : english}</label>)}</div></fieldset>)}
      <small>{bn ? "এই উত্তর দেখে আলুসাথী রোগের নাম বা ওষুধ বলে না।" : "These answers do not produce a disease name or treatment."}</small>
    </section>
    <article className="lookalike-warning"><AlertTriangle /><div><h3>{bn ? "একই রকম দাগ মানেই একই রোগ নয়" : "Similar marks can have different causes"}</h3><p>{bn ? "পুষ্টির ঘাটতি, পোকার ক্ষতি, রোদে পোড়া বা অন্য রোগেও এমন দাগ হয়। পাতার নিচে ও গোড়ায় দেখুন। নিশ্চিত না হয়ে ওষুধ দেবেন না।" : "Nutrient stress, pests, sun damage and other diseases can look alike. Check the leaf underside and plant base. Confirm the cause before treatment."}</p></div></article>
    {image && <SeverityMeasure image={image} onMeasure={setSeverity} />}
    {severity !== null && <p className="tool-result" role="status">{bn ? "আপনার চিহ্নিত পাতার" : "Of your outlined leaf,"} {severity}% {bn ? "অংশে দাগ চিহ্নিত হয়েছে।" : "is marked as damaged."}</p>}
    <article className="spread-outlook"><CloudRain /><div><h3>{bn ? "আবহাওয়ায় রোগের ঝুঁকি" : "Disease-favouring weather"}</h3><p>{outlookText}</p><small>{bn ? "নাবি ধসার Hutton আবহাওয়া-নিয়ম; বাংলাদেশের মাঠে যাচাই হয়নি। এটি রোগ নির্ণয় বা ছড়ানোর শতাংশ নয়।" : "Hutton late-blight weather rule; not validated for Bangladesh fields. It is neither a diagnosis nor a probability."} <a href="https://potatoes.ahdb.org.uk/development-and-implementation-of-a-new-national-warning-system-for-potato-late-blight-in-great-britain-hutton-criteria" target="_blank" rel="noreferrer">AHDB</a></small></div></article>
    <p>{bn ? "ছবি ও উত্তর স্থানীয় কৃষি কর্মকর্তাকে পাঠান।" : "Share the photo and answers with a local agricultural officer."}</p>
    <div className="report-actions"><button className="secondary-main" onClick={share}><Share2 size={18} />{bn ? "রিপোর্ট পাঠান" : "Share report"}</button><button className="secondary-main" onClick={() => window.print()}><Printer size={18} />{bn ? "PDF / প্রিন্ট" : "PDF / print"}</button><button className="text-button" onClick={() => downloadFile("AluSathi-report.txt", report)}>{bn ? "ডাউনলোড" : "Download"}</button></div>
    {shareError && <p role="alert">{shareError}</p>}
    <section id="farmer-report" aria-label="Printable farmer report"><h1>আলুসাথী · AluSathi</h1><pre>{report}</pre></section>
  </div>;
}
