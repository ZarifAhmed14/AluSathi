import { useEffect, useState } from "react";
import { Camera, Check, Loader2, ScanLine } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { potatoPresenceScore } from "@/lib/potato-presence-model";
import { scanPotatoTuberOffline, type TuberModelResult } from "@/lib/tuber-offline-model";
import { scanPotatoVarietyOffline } from "@/lib/variety-offline-model";

const VARIETY_NAMES = {
  diamant: "Diamant · BARI Alu-7",
  asterix: "Asterix · BARI Alu-25",
};
const MAX_PHOTOS = 3;
const REJECT_SCORE = 0.001;
const ACCEPT_SCORE = 0.8;
const VARIETY_SCORE = 0.7;
const AGE_SIGNS = ["none", "sprouts", "shriveled", "both"] as const;

type VarietyResult = Awaited<ReturnType<typeof scanPotatoVarietyOffline>>;
type Reading = { presence: number; variety?: VarietyResult; condition?: TuberModelResult };
type Status = "empty" | "invalid" | "ready-more" | "not-potato" | "needs-potato" | "needs-detail" | "unclear" | "error" | "done";

function storageAgeReading(signs: typeof AGE_SIGNS[number], bn: boolean) {
  if (signs === "sprouts" || signs === "both") return bn
    ? "আন্দাজ: তোলার পর কয়েক সপ্তাহ থেকে কয়েক মাস, অনেক ক্ষেত্রে ১–৫ মাস বা বেশি। গরমে তাড়াতাড়ি, ঠান্ডায় দেরিতে অঙ্কুর বের হতে পারে।"
    : "Rough guess: several weeks to months since harvest, often 1–5 months or more. Warm storage can cause earlier sprouting; cold storage can delay it.";
  if (signs === "shriveled") return bn
    ? "আন্দাজ: কিছুদিন রাখা হয়ে থাকতে পারে, কিন্তু কত দিন তা বলা যায় না। পানি কমে গেলে দ্রুতও আলু কুঁচকে যেতে পারে।"
    : "Rough guess: it may have been stored for some time, but the number of days is unknown. Water loss can cause shrivelling quickly.";
  return bn
    ? "আন্দাজ: নতুন তোলা বা ভালোভাবে রাখা পুরোনো আলু—দুটোই হতে পারে। শুধু ছবি দেখে দিনের হিসাব করা যায় না।"
    : "Rough guess: it could be recently harvested or older and well stored. The photo cannot narrow this down to a number of days.";
}

function conditionText(label: TuberModelResult["label"], bn: boolean) {
  if (label === "defective") return bn
    ? "ছবিতে ত্রুটির লক্ষণ থাকতে পারে। আলুটি আলাদা করে সব দিক হাতে দেখুন।"
    : "A visible defect may be present. Separate the tuber and inspect every side by hand.";
  return bn ? "ছবিতে বড় ধরনের দৃশ্যমান ত্রুটি ধরা পড়েনি।" : "No major visible defect was detected in this image.";
}

function statusText(status: Status, bn: boolean, finalCondition: TuberModelResult["label"] | null) {
  const messages = {
    empty: "",
    invalid: bn ? "৮ MB-এর মধ্যে JPG, PNG বা WebP ছবি দিন।" : "Choose a JPG, PNG or WebP up to 8 MB.",
    "ready-more": bn ? "আরেকটি ছবি প্রস্তুত। এবার পরীক্ষা করুন।" : "Another photo is ready. Check it now.",
    "not-potato": bn ? "এটি আলু নয়।" : "Not a potato.",
    "needs-potato": bn ? "ছবিতে আলু আছে কি না বোঝা যাচ্ছে না। একই জিনিসের আরেক দিক থেকে পরিষ্কার ছবি দিন।" : "I can't tell whether this is a potato. Take another clear photo of the same object from a different side.",
    "needs-detail": bn ? "এই ছবিতে ফল পরিষ্কার নয়। একই আলুর আরেক দিক থেকে ছবি দিন।" : "The result is unclear. Take another photo of the same potato from a different side.",
    unclear: bn ? "এই ছবিগুলো থেকে আলু বা তার জাত নিশ্চিত করা যায়নি। নতুন করে দিনের আলোতে একটি পরিষ্কার ছবি তুলুন।" : "I couldn't confirm a potato or its variety from these photos. Start again with one clear photo in daylight.",
    error: bn ? "ছবিটি পরীক্ষা করা যায়নি। আবার চেষ্টা করুন।" : "The photo could not be checked. Please try again.",
    done: finalCondition ? `${conditionText(finalCondition, bn)} ${bn
      ? "এটি ফোনেই চলা পরীক্ষামূলক AI ফল; ছবি কোথাও পাঠানো হয়নি। এটি রোগের নাম, খাওয়ার নিরাপত্তা বা বাজারের গ্রেড নিশ্চিত করে না।"
      : "This experimental AI check ran on this device; the photo was not uploaded. It does not confirm a disease name, food safety or a market grade."}` : "",
  };
  return messages[status];
}

export default function TuberScan() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [needsMore, setNeedsMore] = useState(false);
  const [variety, setVariety] = useState<keyof typeof VARIETY_NAMES | null>(null);
  const [ageSigns, setAgeSigns] = useState<typeof AGE_SIGNS[number] | null>(null);
  const [finalCondition, setFinalCondition] = useState<TuberModelResult["label"] | null>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>("empty");
  const [busy, setBusy] = useState(false);
  const text = statusText(status, bn, finalCondition);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next?: File) {
    if (!next || busy) return;
    if (!needsMore) {
      setReadings([]); setVariety(null); setAgeSigns(null); setFinalCondition(null); setChecked(false);
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 8 * 1024 * 1024) {
      setFile(null); setPreview("");
      setStatus("invalid");
      return;
    }
    setFile(next); setPreview(URL.createObjectURL(next));
    setStatus(needsMore ? "ready-more" : "empty");
  }

  async function inspect() {
    if (!file || busy) return;
    setBusy(true);
    setAgeSigns(null);
    const previous = needsMore ? readings : [];
    try {
      const presence = await potatoPresenceScore(file);
      if (presence <= REJECT_SCORE) {
        setReadings([]); setNeedsMore(false); setChecked(false); setVariety(null);
        setStatus("not-potato");
        return;
      }

      const reading: Reading = { presence };
      if (presence >= ACCEPT_SCORE) {
        const [condition, varietyResult] = await Promise.allSettled([
          scanPotatoTuberOffline(file), scanPotatoVarietyOffline(file),
        ]);
        if (condition.status === "fulfilled") reading.condition = condition.value;
        if (varietyResult.status === "fulfilled") reading.variety = varietyResult.value;
      }
      const next = [...previous, reading];
      setReadings(next);
      const strong = next.filter(item => item.presence >= ACCEPT_SCORE && item.variety && item.variety.score >= VARIETY_SCORE);
      const named = new Set(strong.map(item => item.variety!.label));
      const surface = next.find(item => item.condition?.label === "defective")?.condition
        || next.find(item => item.condition?.label === "healthy")?.condition;

      if (named.size === 1 && surface) {
        const result = strong[0].variety!;
        setVariety(result.label);
        setFinalCondition(surface.label);
        setChecked(true);
        setNeedsMore(false);
        setStatus("done");
        return;
      }

      setVariety(null); setChecked(false);
      if (next.length < MAX_PHOTOS) {
        setNeedsMore(true);
        setFile(null); setPreview("");
        setStatus(presence < ACCEPT_SCORE ? "needs-potato" : "needs-detail");
      } else {
        setNeedsMore(false);
        setStatus("unclear");
      }
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return <section id="scan" className="app-shell potato-scan scroll-mt-24 py-12">
    <span id="tuber" />
    <div className="section-heading"><div><p className="section-kicker"><ScanLine size={16} />{bn ? "আলুর ছবি পরীক্ষা" : "Potato photo check"}</p><h2>{bn ? "প্রথমে আলুর ১টি ছবি দিন" : "Start with one potato photo"}</h2><p>{bn ? "একটি আলুর পরিষ্কার ছবি তুলুন। দরকার হলে পরে আরেকটি ছবি চাইব।" : "Take a clear photo of one potato. If we need another view, we'll ask."}</p></div></div>
    <div className={`scan-workspace ${!file && !text ? "scan-workspace-empty" : ""}`}>
      <div className="scan-capture">
        <label className={`camera-stage ${preview ? "has-image" : ""}`}>
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={event => { choose(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          {preview ? <img src={preview} alt={bn ? "বেছে নেওয়া ছবি" : "Selected photo"} /> : <div className="camera-empty"><span className="leaf-frame"><Camera size={52} /></span><strong>{needsMore ? (bn ? "আরেকটি ছবি দিন" : "Add another photo") : (bn ? "ছবি তুলুন বা বাছুন" : "Take or choose a photo")}</strong><small>JPG, PNG, WebP · {bn ? "সর্বোচ্চ ৮ MB" : "up to 8 MB"}</small></div>}
          {preview && <span className="replace-photo">{bn ? "অন্য ছবি দিন" : "Choose another photo"}</span>}
        </label>
        <div className="photo-tips"><span><Check />{bn ? "একটি আলু" : "One potato"}</span><span><Check />{bn ? "দিনের আলো" : "Daylight"}</span><span><Check />{bn ? "কাছে থেকে" : "Close view"}</span></div>
        {needsMore && <p className="text-sm">{bn ? `ছবি ${readings.length + 1} / ${MAX_PHOTOS} · একই আলুর অন্য দিক দেখান` : `Photo ${readings.length + 1} of ${MAX_PHOTOS} · show another side of the same potato`}</p>}
        <button className="main-button" disabled={!file || busy} onClick={inspect}>{busy ? <Loader2 className="animate-spin" /> : <ScanLine />}{busy ? (bn ? "ছবি দেখা হচ্ছে…" : "Checking…") : (bn ? "ছবি পরীক্ষা করুন" : "Check photo")}</button>
      </div>
      {(file || text) && <div className="result-stage tuber-result" aria-live="polite"><h3>{bn ? "ছবির ফল" : "Photo result"}</h3>
        {checked && <p><strong>{bn ? "ছবিতে সবচেয়ে মিলছে: " : "Closest photo match: "}</strong>{VARIETY_NAMES[variety!]}<span className="block text-sm">{bn ? "এখন শুধু Diamant ও Asterix-এর সঙ্গে তুলনা হয়। অন্য জাত দিলেও এই দুটির একটি দেখাতে পারে। বিক্রির আগে বীজের রেকর্ড দেখুন।" : "Currently compares only Diamant and Asterix. Another variety may still match one of them. Check the seed record before selling."}</span></p>}
        <p>{busy ? (bn ? "ছবিটি পরীক্ষা হচ্ছে…" : "Checking your photo…") : text || (bn ? "ছবিটি প্রস্তুত। নিচের বোতামে চাপ দিয়ে পরীক্ষা করুন।" : "Your photo is ready. Press Check photo.")}</p>
        {checked && <fieldset className="mt-5 border-t border-stone-200 pt-4"><legend className="font-semibold">{bn ? "তোলার পর কতদিন?" : "How long since harvest?"}</legend><p className="my-2 text-sm">{bn ? "ছবিতে কী দেখছেন? অঙ্কুর বা কুঁচকানো আছে কি না বেছে নিন। এই মডেল এখনো নিজে তা চিনতে পারে না।" : "What do you see in the photo? Choose whether it has sprouts or shrivelling. This model cannot detect those signs by itself yet."}</p><div className="flex flex-wrap gap-2">{AGE_SIGNS.map(signs => <label key={signs} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${ageSigns === signs ? "border-emerald-800 bg-emerald-50" : "border-stone-300"}`}><input type="radio" className="sr-only" name="potato-age-signs" value={signs} checked={ageSigns === signs} onChange={() => setAgeSigns(signs)} />{({ none: bn ? "কোনোটিই না" : "Neither", sprouts: bn ? "অঙ্কুর আছে" : "Sprouts", shriveled: bn ? "কুঁচকে গেছে" : "Shrivelled", both: bn ? "দুটোই আছে" : "Both" })[signs]}</label>)}</div>{ageSigns && <p className="mt-3" role="status">{storageAgeReading(ageSigns, bn)}</p>}</fieldset>}
        {checked && <a className="mt-4 block text-sm underline" href="https://data.mendeley.com/datasets/rgn2d2jb7f/1" target="_blank" rel="noopener noreferrer">{bn ? "জাতের মডেলের ছবির উৎস · CC BY 4.0" : "Variety model photo source · CC BY 4.0"}</a>}
      </div>}
    </div>
  </section>;
}
