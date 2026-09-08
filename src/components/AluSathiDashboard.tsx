import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, BookOpen, Camera, Check, ChevronDown, CloudRain,
  CloudLightning, Ear, Flame, Globe2, HelpCircle, History, Leaf, Loader2, MapPin,
  Menu, Mic2, Minus, PhoneCall, RefreshCw, ScanLine, ShieldCheck, Snowflake,
  Sprout, TrendingDown, TrendingUp, Trash2, WifiOff, Wind, X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DiseaseLabel, DiseaseResult, getModelHealth, ModelHealth, scanPotatoLeaf } from "@/lib/disease-api";
import { getWeather, WeatherAlert, WeatherData } from "@/lib/api";
import { deletePendingScan, listPendingScans, savePendingScan } from "@/lib/pending-scans";
import { scanPotatoLeafOffline } from "@/lib/offline-model";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FarmerTools from "@/components/FarmerTools";
import ColdStorage from "@/components/ColdStorage";
import HarvestMarket from "@/components/HarvestMarket";
import { useDemo } from "@/contexts/DemoContext";
import ScanInsights from "@/components/ScanInsights";
import TuberScan from "@/components/TuberScan";
import { deleteRecord, readRecords, writeRecord } from "@/lib/farmer-records";
import type { Json } from "@/integrations/supabase/types";

type ScanMode = "quick" | "field";
type Risk = "healthy" | "watch" | "urgent" | "uncertain";
type Trend = "first" | "improving" | "stable" | "worsening" | "uncertain";

interface DiaryEntry {
  id: string;
  createdAt: string;
  mode: ScanMode;
  risk: Risk;
  label: DiseaseLabel;
  district: string;
  scanCount: number;
  affectedCount: number;
  humidity?: number;
  followUpOf?: string;
  inferenceMode?: "online" | "offline";
}

const DIARY_KEY = "alusathi-field-diary-v1";
const GUIDED_POINTS = [1, 2, 3];

const COPY = {
  bn: {
    brandLine: "আলুর রোগ বুঝুন, সহজে",
    navScan: "ছবি তুলুন", navField: "আমার জমি", navHelp: "সাহায্য",
    online: "অনলাইন", offline: "ইন্টারনেট নেই",
    heroKicker: "বাংলাদেশের আলুচাষির ডিজিটাল সাথী",
    heroTitle: "পাতার ছবি দিন।", heroAccent: "ঝুঁকি আগে জানুন।",
    heroBody: "পাতা বা আলুর ছবি দেখুন। আবহাওয়া জানুন, জমির হিসাব রাখুন এবং সহজ পরামর্শ পান।",
    quick: "১টি ছবি দিয়ে শুরু করুন", quickHint: "প্রয়োজন হলে আরও ছবি চাইব",
    full: "৩ ছবির পরীক্ষা", fullHint: "একই পাতার ৩টি ছবি",
    trust: "AI ফল নিশ্চিত রোগ নির্ণয় নয়",
    weatherLoading: "আবহাওয়া দেখা হচ্ছে…", weatherGood: "আজ নজর রাখুন",
    weatherRisk: "রোগ বাড়ার মতো আবহাওয়া", weatherUnavailable: "আবহাওয়া এখন পাওয়া যাচ্ছে না", humidity: "আর্দ্রতা", cachedWeather: "শেষ সেভ করা আবহাওয়া",
    alertTitle: "প্রতিকূল আবহাওয়ার সতর্কতা", alertSource: "৩ দিনের পূর্বাভাস",
    scanKicker: "পাতার পরীক্ষা", scanTitle: "প্রথমে পাতার ১টি ছবি দিন",
    scanBody: "ফল অস্পষ্ট হলে আরও ১–২টি ছবি চাইব। ঝাপসা হলে ছবিটি আবার তুলুন।",
    guidedInstructions: ["পাতার সামনের দিক কাছে থেকে", "একই পাতার আরেকটি পরিষ্কার ছবি দিন", "আক্রান্ত অংশ কাছে থেকে দেখান"],
    fieldTitle: "৩টি ছবি দিয়ে দেখুন", fieldBody: "একটি পাতার তিনটি পরিষ্কার ছবি দিলে আরও তথ্য পাওয়া যায়।",
    point: "ছবি", of: "এর মধ্যে", photoSaved: "ছবিটি দেখা হয়েছে", photoSavedBody: "ফল পরিষ্কার নয়। আরেকটি ছবি দিন।",
    pointInstructions: ["পাতার সামনের দিক কাছে থেকে", "একই পাতার আরেকটি পরিষ্কার ছবি", "আক্রান্ত অংশ কাছে থেকে"],
    choose: "ছবি তুলুন বা বাছুন", formats: "JPG, PNG বা WebP · সর্বোচ্চ ৮ MB", replace: "অন্য ছবি দিন",
    analyze: "ছবি পরীক্ষা করুন", analyzing: "ছবি দেখা হচ্ছে…", nextPoint: "পরের ছবি তুলুন", retake: "আবার ছবি তুলুন",
    noResult: "ফল এখানে দেখা যাবে", noResultBody: "আলুসাথী তিনটি অবস্থা দেখে: সুস্থ পাতা, আগাম ধসা ও নাবি ধসা।",
    error: "ছবিটি দেখা যায়নি। পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।", offlineSaved: "ছবিটি এই ফোনে সেভ হয়েছে। ইন্টারনেট এলে পরীক্ষা হবে।",
    syncDone: "টি জমা থাকা ছবি পরীক্ষা হয়েছে",
    result: "আপনার ফল", healthy: "পাতায় ধসা রোগের লক্ষণ পাওয়া যায়নি",
    early: "আগাম ধসার লক্ষণ থাকতে পারে", late: "নাবি ধসার লক্ষণ থাকতে পারে", unknown: "ফল পরিষ্কার নয়",
    fieldHealthy: "ছবিতে ধসার স্পষ্ট লক্ষণ নেই", fieldWatch: "ছবিতে সমস্যার লক্ষণ থাকতে পারে",
    fieldUrgent: "গাছটি দ্রুত বিশেষজ্ঞকে দেখান", fieldUnknown: "আরও পরিষ্কার ছবি দরকার",
    affected: "সমস্যার সংকেত", clear: "ভালো দেখাচ্ছে", uncertain: "নিশ্চিত নয়",
    now: "এখন", tomorrow: "আগামীকাল", helpAction: "সহায়তা নিন",
    todayHealthy: "আজ আর কিছু করতে হবে না। একই জায়গা মনে রাখুন।",
    todayRisk: "আক্রান্ত মনে হওয়া পাতাগুলো চিহ্নিত করুন। ভেজা পাতা অন্য জমিতে নেবেন না।",
    tomorrowHealthy: "কাল সকালে একই জায়গা আবার দেখুন।",
    tomorrowRisk: "কাল সকালে কাছের গাছগুলোও দেখুন এবং নতুন ছবি তুলুন।",
    expertHealthy: "লক্ষণ ছড়ালে কৃষি বিশেষজ্ঞকে জানান।",
    expertRisk: "রাসায়নিক ব্যবহারের আগে কৃষি বিশেষজ্ঞের পরামর্শ নিন।",
    todayUnknown: "একই গাছের পরিষ্কার ছবি আবার তুলুন।", tomorrowUnknown: "এই ফল দেখে কোনো চিকিৎসার সিদ্ধান্ত নেবেন না।", expertUnknown: "আক্রান্ত গাছ কৃষি বিশেষজ্ঞকে দেখান।",
    why: "আলুসাথী কেন এমন বলল?", confidence: "AI-এর মিল", limitations: "এই ফল সহায়তার জন্য। নিশ্চিত রোগ নির্ণয় নয়।",
    fieldValidationPending: "মাঠের পরীক্ষায় AI এখনো যথেষ্ট নির্ভরযোগ্য নয়। তাই নিরাপত্তার জন্য রোগের নাম দেখানো হয়নি।",
    photoProblem: "ছবিটি আরেকবার তুলুন", tooDark: "ছবিতে আলো কম ছিল।", tooBright: "ছবিতে আলো বেশি ছিল।", lowContrast: "পাতাটি পরিষ্কার বোঝা যায়নি।",
    callExpert: "কৃষি বিশেষজ্ঞকে কল করুন", callCharge: "১৬১২৩ · চার্জ প্রযোজ্য",
    listen: "শুনুন", stop: "বন্ধ করুন", newScan: "নতুন ছবি", offlineResult: "এই ফোনেই AI পরীক্ষা হয়েছে",
    diaryKicker: "রোগের অগ্রগতি", diaryTitle: "আগের ফলের সাথে তুলনা",
    diaryBody: "একই জমি আবার পরীক্ষা করলে উন্নতি হচ্ছে, একই আছে নাকি ঝুঁকি বাড়ছে তা দেখা যাবে।",
    emptyDiary: "এখনও কোনো পরীক্ষা সেভ হয়নি", emptyDiaryBody: "প্রথম ছবি পরীক্ষা করলে ফল এখানে থাকবে।",
    quickLabel: "পাতার পরীক্ষা", fieldLabel: "৩ ছবির পরীক্ষা", scans: "টি ছবি", delete: "মুছুন", clearAll: "সব মুছুন",
    improving: "আগের চেয়ে ভালো", stable: "প্রায় একই আছে", worsening: "আরও নজর দরকার", firstCheck: "প্রথম পরীক্ষা", checkAgain: "একই জমি আবার দেখুন",
    helpKicker: "আলুর যত্ন", helpTitle: "ভালো আলুর জন্য সহজ যত্ন",
    helpCards: [
      ["পানি জমতে দেবেন না", "জমির নালা পরিষ্কার রাখুন। মাটির অবস্থা দেখে সেচ দিন; অতিরিক্ত পানি আলুর ক্ষতি করে।"],
      ["আলু মাটি দিয়ে ঢাকুন", "বের হয়ে আসা আলু মাটি দিয়ে ঢেকে দিন। তোলা আলু আলো থেকে দূরে, শুকনো ও বাতাস চলা জায়গায় রাখুন।"],
      ["সুস্থ বীজ বাছুন", "রোগমুক্ত বীজ আলু ব্যবহার করুন। পচা বা ক্ষতিগ্রস্ত আলু ভালো আলুর সাথে রাখবেন না।"],
    ],
    sourceTitle: "ভরসাযোগ্য তথ্য",
    sourceBody: "আবহাওয়া ও মাঠের করণীয় BAMIS, BARI ও কৃষি তথ্য সার্ভিসের প্রকাশিত তথ্যের ভিত্তিতে সহজ করা হয়েছে।",
    aboutTitle: "এই AI সম্পর্কে",
    aboutBody: "১৩,৮০০টি আলাদা আঞ্চলিক ছবির পরীক্ষায় এই AI প্রতি ১০০টির মধ্যে প্রায় ৫১টি ঠিক চিনেছে। তাই এটি এখন শুধু গবেষণার জন্য; কৃষকের রোগ নির্ণয়ের জন্য নয়।",
    modelReady: "AI প্রস্তুত", modelResearch: "গবেষণা পর্যায়", modelMissing: "AI সংযোগ নেই", modelVersion: "মডেল", regionalTest: "আঞ্চলিক পরীক্ষা",
    privacy: "আপনার ছবি প্রশিক্ষণে ব্যবহার করা হয় না।", footer: "আলুসাথী · কৃষকের সিদ্ধান্ত, AI-এর সহায়তা",
  },
  en: {
    brandLine: "Understand potato disease, simply",
    navScan: "Scan", navField: "My field", navHelp: "Help", online: "Online", offline: "Offline",
    heroKicker: "A digital companion for Bangladesh potato farmers",
    heroTitle: "Photograph a leaf.", heroAccent: "See risk earlier.",
    heroBody: "Check a leaf or potato photo. See the weather, get simple help and keep useful notes.",
    quick: "Start with 1 photo", quickHint: "More photos only if needed", full: "Three-photo check", fullHint: "Three views of the same leaf",
    trust: "An AI result is not a confirmed diagnosis",
    weatherLoading: "Checking weather…", weatherGood: "Keep watch today", weatherRisk: "Weather may support disease",
    weatherUnavailable: "Weather is unavailable now", humidity: "Humidity", cachedWeather: "Last saved weather",
    alertTitle: "Extreme-weather message", alertSource: "3-day forecast",
    scanKicker: "Leaf photo check", scanTitle: "Start with one clear leaf photo",
    scanBody: "We ask for a second or third photo only when the first result is unclear.",
    guidedInstructions: ["Close view of the leaf front", "Another clear view of the same leaf", "Close view of the affected area"],
    fieldTitle: "Check with three photos", fieldBody: "Three clear views of one leaf can give more evidence.",
    point: "Photo", of: "of", photoSaved: "Photo checked", photoSavedBody: "The result is unclear. Add another clear photo.",
    pointInstructions: ["Close view of the leaf front", "Another clear view of the same leaf", "Close view of the affected area"],
    choose: "Take or choose a photo", formats: "JPG, PNG or WebP · up to 8 MB", replace: "Choose another",
    analyze: "Check this photo", analyzing: "Checking photo…", nextPoint: "Take next photo", retake: "Take again",
    noResult: "Your result will appear here", noResultBody: "The AI looks for a healthy leaf, early blight or late blight.",
    error: "The photo could not be checked. Try again with a clear photo.", offlineSaved: "The photo is saved on this phone. It will be checked when internet returns.",
    syncDone: "saved photo(s) checked",
    result: "Your result", healthy: "No supported blight pattern was found", early: "Early-blight signs may be present",
    late: "Late-blight signs may be present", unknown: "The result is unclear",
    fieldHealthy: "No clear blight signs in these photos", fieldWatch: "These photos may show a problem",
    fieldUrgent: "Show this plant to an expert soon", fieldUnknown: "Take another clear photo",
    affected: "Possible problem", clear: "Looks clear", uncertain: "Uncertain",
    now: "Now", tomorrow: "Tomorrow", helpAction: "Get help",
    todayHealthy: "No urgent action is needed. Remember this place.",
    todayRisk: "Mark leaves that look affected. Do not take wet leaves to another field.",
    tomorrowHealthy: "Check this place again tomorrow morning.",
    tomorrowRisk: "Check nearby plants tomorrow morning. Take new photos if needed.",
    expertHealthy: "Contact an agricultural expert if symptoms spread.",
    expertRisk: "Confirm with an agricultural expert before using chemicals.",
    todayUnknown: "Retake clear photographs of the same plant.", tomorrowUnknown: "Do not make a treatment decision from these results.", expertUnknown: "Show affected plants to an agricultural expert.",
    why: "Why did AluSathi say this?", confidence: "AI match", limitations: "This result supports decisions. It is not a confirmed diagnosis.",
    fieldValidationPending: "Field testing shows that this AI is not reliable enough yet. The disease name is hidden for safety.",
    photoProblem: "Take the photograph again", tooDark: "The photograph was too dark.", tooBright: "The photograph was too bright.", lowContrast: "The leaf was not clear enough.",
    callExpert: "Call an agricultural expert", callCharge: "16123 · charges apply",
    listen: "Listen", stop: "Stop", newScan: "New scan", offlineResult: "AI checked this on your phone",
    diaryKicker: "Disease progress", diaryTitle: "Compare past checks", diaryBody: "Check the same field again to see if it looks better, the same, or worse.",
    emptyDiary: "No checks saved yet", emptyDiaryBody: "Your first completed check will appear here.",
    quickLabel: "Leaf photo check", fieldLabel: "3-photo check", scans: "photos", delete: "Delete", clearAll: "Delete all",
    improving: "Looks better than before", stable: "About the same", worsening: "Needs more attention", firstCheck: "First check", checkAgain: "Check the same field again",
    helpKicker: "Crop care", helpTitle: "Simple care for better potatoes",
    helpCards: [
      ["Keep drains clear", "Avoid standing water. Check the soil before irrigating; excess water can damage potatoes."],
      ["Keep tubers covered", "Cover exposed growing tubers with soil. Store harvested potatoes away from light in a dry, ventilated place."],
      ["Start with healthy seed", "Choose disease-free seed potatoes. Keep rotting or damaged potatoes separate from sound ones."],
    ],
    sourceTitle: "Trusted information",
    sourceBody: "Weather and field actions are simplified from published BAMIS, BARI and Agricultural Information Service information.",
    aboutTitle: "About this AI",
    aboutBody: "On 13,800 separate regional images, this AI identified about 51 in every 100 correctly. It is therefore research-only, not ready for farmer diagnosis.",
    modelReady: "AI ready", modelResearch: "Research stage", modelMissing: "AI disconnected", modelVersion: "Model", regionalTest: "Regional test",
    privacy: "Your photograph is not used for training.", footer: "AluSathi · Farmer decisions, assisted by AI",
  },
} as const;

type Copy = typeof COPY.bn | typeof COPY.en;

function readDiary(key = DIARY_KEY): DiaryEntry[] {
  try {
    const entries = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry): entry is DiaryEntry => entry && typeof entry.id === "string"
      && typeof entry.createdAt === "string" && Number.isFinite(Date.parse(entry.createdAt)) && typeof entry.district === "string"
      && ["healthy", "watch", "urgent", "uncertain"].includes(entry.risk));
  }
  catch { return []; }
}

function storeDiaryEntry(entry: DiaryEntry, key = DIARY_KEY): DiaryEntry[] {
  const next = [entry, ...readDiary(key)].slice(0, 30);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

function isScanComplete(results: DiseaseResult[], mode: ScanMode): boolean {
  if (results.length >= 3) return true;
  return mode === "quick" && results.length > 0 && results.every(item =>
    item.label !== "unknown" && !item.quality_warning && !item.rejection_reasons?.length
  ) && new Set(results.map(item => item.label)).size === 1;
}

function riskFromResults(results: DiseaseResult[], weather: WeatherData | null): Risk {
  const affected = results.filter((item) => item.label === "early_blight" || item.label === "late_blight").length;
  const uncertain = results.filter((item) => item.label === "unknown").length;
  const weatherPressure = Boolean(weather && weather.humidity >= 80 && weather.temperature >= 14 && weather.temperature <= 24);
  if (!results.length || uncertain > 0 || new Set(results.map(item => item.label)).size > 1 || results.some(item => item.quality_warning || item.rejection_reasons?.length)) return "uncertain";
  if (affected >= 3 || (affected >= 2 && weatherPressure)) return "urgent";
  if (affected >= 1) return "watch";
  return "healthy";
}

function dominantLabel(results: DiseaseResult[], risk: Risk): DiseaseLabel {
  if (risk === "uncertain") return "unknown";
  const totals = ["early_blight", "healthy", "late_blight"].map((label) => ({
    label: label as DiseaseLabel,
    value: results.reduce((sum, result) => sum + (result.probabilities[label] || 0), 0),
  }));
  return totals.sort((a, b) => b.value - a.value)[0].label;
}

const RISK_RANK: Record<Risk, number> = { healthy: 0, uncertain: 1, watch: 2, urgent: 3 };

function trendFromEntries(current: DiaryEntry, previous?: DiaryEntry): Trend {
  if (!previous) return "first";
  if (current.risk === "uncertain" || previous.risk === "uncertain" || current.district !== previous.district || current.scanCount !== previous.scanCount) return "uncertain";
  const difference = RISK_RANK[current.risk] - RISK_RANK[previous.risk];
  return difference < 0 ? "improving" : difference > 0 ? "worsening" : "stable";
}

function weatherAlertText(alert: WeatherAlert, language: "bn" | "en") {
  const messages = {
    heavy_rain: {
      bn: ["ভারী বৃষ্টির আশঙ্কা", "নালা ও পানি বের হওয়ার পথ এখনই পরিষ্কার রাখুন।"],
      en: ["Heavy rain possible", "Clear drains and field-water exits now."],
    },
    strong_wind: {
      bn: ["দমকা বাতাসের আশঙ্কা", "স্প্রে বন্ধ রাখুন এবং ঢিলা জিনিস নিরাপদ করুন।"],
      en: ["Strong wind possible", "Do not spray; secure loose field materials."],
    },
    extreme_heat: {
      bn: ["অতিরিক্ত গরমের আশঙ্কা", "দুপুরে কাজ ও স্প্রে এড়িয়ে সকাল-বিকেলে জমি দেখুন।"],
      en: ["Extreme heat possible", "Avoid midday work and spraying; inspect in the morning or evening."],
    },
    cold: {
      bn: ["অতিরিক্ত ঠান্ডার আশঙ্কা", "ভোরে গাছ দেখুন এবং সেচ দেওয়ার আগে বিশেষজ্ঞের পরামর্শ নিন।"],
      en: ["Very cold weather possible", "Inspect plants early and ask an expert before changing irrigation."],
    },
    thunderstorm: {
      bn: ["বজ্রঝড়ের আশঙ্কা", "মাঠে যাবেন না; নিরাপদ জায়গায় থাকুন।"],
      en: ["Thunderstorm possible", "Stay out of the field and move to a safe place."],
    },
  } as const;
  return messages[alert.type][language];
}

export default function AluSathiDashboard() {
  const { user, signOut } = useAuth();
  const { demo, setDemo } = useDemo();
  const dashboardAccess = Boolean(user) || demo;
  const { language, setLanguage } = useLanguage();
  const copy = COPY[language];
  const [mode, setMode] = useState<ScanMode>("quick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [fieldResults, setFieldResults] = useState<DiseaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [speaking, setSpeaking] = useState(false);
  const [district, setDistrict] = useState(() => localStorage.getItem("alusathi-district") || "Rangpur");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [diary, setDiary] = useState<DiaryEntry[]>(() => readDiary());
  const [cloudMessage, setCloudMessage] = useState("");
  const diaryKey = user ? `${DIARY_KEY}-${user.id}` : DIARY_KEY;
  useEffect(() => {
    setDiary(readDiary(diaryKey)); setCloudMessage("");
    if (!user) return;
    let active = true;
    const sync = async () => {
      try {
        for (const key of Object.keys(localStorage).filter(key => key.startsWith(`${diaryKey}-pending-`))) {
          const pending = JSON.parse(localStorage.getItem(key) || "null") as DiaryEntry | null;
          if (!pending || !active) continue;
          await writeRecord(user.id, "scan", pending.id, pending as unknown as Json, pending.createdAt);
          localStorage.removeItem(key);
        }
        const rows = await readRecords(user.id, "scan");
        if (!active) return;
        localStorage.setItem(diaryKey, JSON.stringify(rows.map(row => row.payload)));
        setDiary(readDiary(diaryKey)); setCloudMessage("");
      } catch { if (active) setCloudMessage(language === "bn" ? "অনলাইনের খাতা পাওয়া যায়নি। এই ফোনের ফল দেখানো হচ্ছে।" : "Cloud history unavailable. Showing this phone's records; unsynced results retry when online."); }
    };
    sync(); window.addEventListener("online", sync);
    return () => { active = false; window.removeEventListener("online", sync); };
  }, [user, diaryKey, language]);
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [followUpOf, setFollowUpOf] = useState<string | undefined>();
  const scanRef = useRef<HTMLElement>(null);
  const syncingRef = useRef(false);
  const scanPoints = mode === "quick" ? GUIDED_POINTS.slice(0, Math.min(3, fieldResults.length + 1)) : GUIDED_POINTS;
  const scanComplete = isScanComplete(fieldResults, mode);
  const fieldRisk = useMemo(() => riskFromResults(fieldResults, weather), [fieldResults, weather]);

  const syncPendingScans = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    let completed = 0;
    try {
      const pending = await listPendingScans();
      for (const item of pending) {
        try {
          const queuedFile = new File([item.blob], item.fileName, { type: item.fileType });
          const queuedResult = await scanPotatoLeaf(queuedFile);
          const guestDiary = storeDiaryEntry({
            id: crypto.randomUUID(), createdAt: item.createdAt, mode: "quick", district: item.district,
            risk: riskFromResults([queuedResult], null), label: queuedResult.label, scanCount: 1,
            affectedCount: ["early_blight", "late_blight"].includes(queuedResult.label) ? 1 : 0,
          });
          if (!user) setDiary(guestDiary);
          await deletePendingScan(item.id);
          completed += 1;
        } catch {
          break;
        }
      }
    } catch {
      // Storage may be unavailable in private browsing.
    } finally {
      setPendingCount((await listPendingScans().catch(() => [])).length);
      if (completed) setSyncedCount(completed);
      syncingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.lang = language;
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) syncPendingScans();
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    getModelHealth().then(setModelHealth);
    listPendingScans().then((items) => {
      setPendingCount(items.length);
      if (navigator.onLine && items.length) syncPendingScans();
    }).catch(() => setPendingCount(0));
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.speechSynthesis?.cancel();
    };
  }, [language, syncPendingScans]);

  useEffect(() => {
    let active = true;
    setWeatherLoading(true); setWeather(null);
    getWeather(district).then(value => { if (active) setWeather(value); }).catch(() => { if (active) setWeather(null); }).finally(() => { if (active) setWeatherLoading(false); });
    localStorage.setItem("alusathi-district", district);
    return () => { active = false; };
  }, [district]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (reportImage) URL.revokeObjectURL(reportImage); }, [reportImage]);

  function startScan(nextMode: ScanMode, nextFollowUp?: string) {
    if (loading) return;
    setReportImage(null);
    setMode(nextMode); setFile(null); setPreview(null); setResult(null); setFieldResults([]); setError("");
    setFollowUpOf(nextFollowUp);
    requestAnimationFrame(() => scanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function chooseFile(next?: File) {
    if (!next || loading || scanComplete || (result && !result.quality_warning)) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 8 * 1024 * 1024) { setError(copy.error); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next)); setResult(null); setError("");
  }

  function saveDiary(entry: DiaryEntry) {
    setDiary(storeDiaryEntry(entry, diaryKey));
    if (user) {
      localStorage.setItem(`${diaryKey}-pending-${entry.id}`, JSON.stringify(entry));
      writeRecord(user.id, "scan", entry.id, entry as unknown as Json, entry.createdAt)
        .then(() => localStorage.removeItem(`${diaryKey}-pending-${entry.id}`))
        .catch(() => setCloudMessage(language === "bn" ? "ফল এই ফোনে আছে। অনলাইনে সেভ হয়নি।" : "Saved on this phone; cloud save failed."));
    }
  }

  async function analyze() {
    if (!file || loading || scanComplete || (result && !result.quality_warning)) return;
    setLoading(true); setError("");
    try {
      let nextResult: DiseaseResult;
      try {
        if (!online) nextResult = await scanPotatoLeafOffline(file);
        else {
          try { nextResult = await scanPotatoLeaf(file); }
          catch { nextResult = await scanPotatoLeafOffline(file); }
        }
      } catch (scanError) {
        if (online) throw scanError;
        await savePendingScan(file, district);
        setSyncedCount(0);
        setPendingCount((count) => count + 1);
        setError(copy.offlineSaved);
        return;
      }
      setResult(nextResult);
      if (nextResult.quality_warning) return;
      if (!fieldResults.length) setReportImage(URL.createObjectURL(file));
      const nextField = [...fieldResults, nextResult];
      setFieldResults(nextField);
      if (isScanComplete(nextField, mode)) {
        const risk = riskFromResults(nextField, weather);
        const affectedCount = nextField.filter((item) => ["early_blight", "late_blight"].includes(item.label)).length;
        saveDiary({
          id: crypto.randomUUID(), createdAt: new Date().toISOString(), mode, district, risk,
          label: dominantLabel(nextField, risk), scanCount: nextField.length, affectedCount,
          humidity: weather?.humidity, followUpOf, inferenceMode: nextField.some((item) => item.inference_mode === "offline") ? "offline" : "online",
        });
      }
    } catch { setError(copy.error); }
    finally { setLoading(false); }
  }

  function nextFieldPoint() {
    retakeCurrent();
  }

  function retakeCurrent() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResult(null); setError("");
    scanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "bn" ? "bn-BD" : "en-US"; utterance.rate = 0.88;
    utterance.onend = () => setSpeaking(false); setSpeaking(true); window.speechSynthesis.speak(utterance);
  }

  async function removeDiary(id?: string) {
    if (user) {
      try { await deleteRecord(user.id, "scan", id); }
      catch { setCloudMessage(language === "bn" ? "মোছা হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।" : "Could not delete. Check your connection and retry."); return; }
    }
    const next = id ? diary.filter((entry) => entry.id !== id) : [];
    for (const key of Object.keys(localStorage).filter(key => key.startsWith(`${diaryKey}-pending-`) && (!id || key.endsWith(id)))) localStorage.removeItem(key);
    localStorage.setItem(diaryKey, JSON.stringify(next)); setDiary(next);
  }

  const weatherRisk = Boolean(weather && weather.humidity >= 80 && weather.temperature >= 14 && weather.temperature <= 24);
  const weatherAlerts = weather?.cached ? [] : weather?.alerts || [];

  return <div className={language === "bn" ? "font-bangla" : ""}>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header">
      <div className="app-shell flex h-16 items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-3" aria-label="AluSathi home"><span className="brand-mark"><Leaf size={22} /></span><span><strong className="block text-lg leading-none">আলুসাথী</strong><small className="mt-1 hidden text-[11px] font-semibold text-ink/50 sm:block">{copy.brandLine}</small></span></a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation"><a className="top-nav" href="#scan"><Camera size={16} />{copy.navScan}</a>{dashboardAccess && <a className="top-nav" href="#diary"><History size={16} />{copy.navField}</a>}<a className="top-nav" href="#help"><HelpCircle size={16} />{copy.navHelp}</a></nav>
        <div className="flex items-center gap-2">{dashboardAccess ? <button className="icon-button" onClick={() => { setDemo(false); if (user) signOut().catch(() => setCloudMessage(language === "bn" ? "বের হওয়া যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।" : "Could not sign out. Check your connection and retry.")); }}>{language === "bn" ? "বের হন" : "Logout"}</button> : <Link className="icon-button" to="/auth">{language === "bn" ? "লগইন" : "Login"}</Link>}<span className={`connection-chip ${online ? "online" : "offline"}`}>{online ? <ShieldCheck size={14} /> : <WifiOff size={14} />}{online ? copy.online : copy.offline}{pendingCount > 0 ? ` · ${pendingCount}` : ""}</span><button className="icon-button" onClick={() => setLanguage(language === "bn" ? "en" : "bn")} aria-label="Change language"><Globe2 size={18} /><span>{language === "bn" ? "EN" : "বাংলা"}</span></button><button className="icon-button md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button></div>
      </div>
      {menuOpen && <nav className="mobile-menu app-shell" aria-label="Mobile navigation"><a href="#scan" onClick={() => setMenuOpen(false)}>{copy.navScan}</a>{dashboardAccess && <a href="#diary" onClick={() => setMenuOpen(false)}>{copy.navField}</a>}<a href="#help" onClick={() => setMenuOpen(false)}>{copy.navHelp}</a></nav>}
    </header>
    {syncedCount > 0 && <div className="sync-notice" role="status"><div className="app-shell"><Check size={18} /><strong>{language === "bn" ? `${syncedCount}${copy.syncDone}` : `${syncedCount} ${copy.syncDone}`}</strong><button onClick={() => setSyncedCount(0)} aria-label={copy.stop}><X size={17} /></button></div></div>}

    <main id="main">
      <section id="top" className="hero-section"><div className="hero-photo" aria-hidden="true" /><div className="hero-wash" aria-hidden="true" /><div className="nakshi-pattern" aria-hidden="true" />
        <div className="app-shell relative grid min-h-[760px] items-end pb-12 pt-28 sm:min-h-[720px] sm:pb-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-8">
          <div className="hero-copy animate-rise"><p className="hero-kicker"><span /><Sprout size={17} />{copy.heroKicker}</p><h1>{copy.heroTitle}<br /><em>{copy.heroAccent}</em></h1><p className="hero-body">{copy.heroBody}</p>
            <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2"><button className="hero-action primary" onClick={() => startScan("quick")}><span className="action-icon"><Camera size={24} /></span><span><strong>{copy.quick}</strong><small>{copy.quickHint}</small></span><ArrowRight className="ml-auto" size={20} /></button><a className="hero-action secondary" href="#tuber"><span className="action-icon"><Sprout size={24} /></span><span><strong>{language === "bn" ? "আলুর ছবি দেখুন" : "Check potatoes"}</strong><small>{language === "bn" ? "তোলা আলুর অবস্থা" : "Harvested tuber check"}</small></span><ArrowRight className="ml-auto" size={20} /></a></div>
            <p className="mt-5 flex items-center gap-2 text-sm font-bold text-ink/60"><ShieldCheck size={17} className="text-leaf" />{copy.trust}</p>
          </div><div className="hidden lg:block" />
        </div>
      </section>

      <section className="weather-ribbon" aria-live="polite"><div className="app-shell flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className={`weather-icon ${weatherRisk ? "risk" : ""}`}><CloudRain size={21} /></span><div><strong className="block">{weatherLoading ? copy.weatherLoading : weather ? (weatherRisk ? copy.weatherRisk : copy.weatherGood) : copy.weatherUnavailable}</strong>{weather && <small className="text-ink/55">{district} · {weather.temperature}°C · {copy.humidity} {weather.humidity}%{weather.cached ? ` · ${copy.cachedWeather}` : ""}</small>}</div></div><label className="district-picker"><MapPin size={15} /><span className="sr-only">District</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option>Rangpur</option><option>Bogura</option><option>Dinajpur</option><option>Panchagarh</option><option>Thakurgaon</option><option>Rajshahi</option><option>Munshiganj</option></select><ChevronDown size={15} /></label></div></section>
      {weatherAlerts.length > 0 && <ExtremeWeatherPanel alerts={weatherAlerts} language={language} copy={copy} />}

      <section id="scan" ref={scanRef} className="app-shell scroll-mt-24 py-16 sm:py-24">
        <div className="section-heading"><div><p className="section-kicker"><ScanLine size={16} />{copy.scanKicker}</p><h2>{copy.scanTitle}</h2><p>{copy.scanBody}</p></div></div>
        {!fieldResults.length && !file && <button className="secondary-main mb-4" onClick={() => startScan(mode === "quick" ? "field" : "quick")}>{language === "bn" ? (mode === "quick" ? "চাইলে ৩টি ছবি দিয়ে দেখুন" : "১টি ছবি দিয়ে শুরু করুন") : (mode === "quick" ? "Use three photos instead" : "Use one photo instead")}</button>}
        {!scanComplete && (mode === "field" || fieldResults.length > 0) && <div className="field-progress-card"><div className="field-path" aria-label={`${fieldResults.length} of ${scanPoints.length} completed`}>{scanPoints.map((point, index) => <span key={point} className={index < fieldResults.length ? "done" : index === fieldResults.length ? "current" : ""}>{index < fieldResults.length ? <Check size={16} /> : point}</span>)}</div><div><p className="text-sm font-bold text-leaf">{copy.point} {fieldResults.length + 1} {copy.of} {scanPoints.length}</p><strong className="mt-1 block text-xl text-ink">{mode === "quick" ? copy.guidedInstructions[fieldResults.length] : copy.pointInstructions[fieldResults.length]}</strong></div></div>}
        <div className="scan-workspace"><div className="scan-capture"><label className={`camera-stage ${preview ? "has-image" : ""}`}><input disabled={loading || scanComplete || Boolean(result && !result.quality_warning)} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />{preview ? <img src={preview} alt={language === "bn" ? "বাছাই করা আলু পাতা" : "Selected potato leaf"} /> : <div className="camera-empty"><span className="leaf-frame"><Leaf size={62} /></span><strong>{copy.choose}</strong><small>{copy.formats}</small></div>}{preview && <span className="replace-photo"><RefreshCw size={16} />{copy.replace}</span>}</label><div className="photo-tips"><span><Check />{language === "bn" ? "একটি পাতা" : "One leaf"}</span><span><Check />{language === "bn" ? "দিনের আলো" : "Daylight"}</span><span><Check />{language === "bn" ? "কাছে থেকে" : "Close view"}</span></div>{error && <p className="error-message" role="alert"><AlertTriangle size={18} />{error}</p>}<button className="main-button" disabled={!file || loading || scanComplete || Boolean(result && !result.quality_warning)} onClick={analyze}>{loading ? <Loader2 className="animate-spin" /> : <ScanLine />}{loading ? copy.analyzing : copy.analyze}</button></div>
          <div className="result-stage" aria-live="polite">{scanComplete ? <FieldResult mode={mode} results={fieldResults} risk={fieldRisk} weather={weather} copy={copy} speak={speak} speaking={speaking} restart={() => startScan(mode)} /> : result ? (result.quality_warning ? <SingleResult result={result} language={language} copy={copy} speak={speak} speaking={speaking} retake={retakeCurrent} /> : <PhotoAccepted copy={copy} offline={result.inference_mode === "offline"} />) : <div className="result-empty"><span><Leaf size={42} /></span><h3>{copy.noResult}</h3><p>{copy.noResultBody}</p></div>}{result && !result.quality_warning && !scanComplete && <button className="next-button" onClick={nextFieldPoint}>{copy.nextPoint}<ArrowRight size={18} /></button>}</div></div>
        {scanComplete && <ScanInsights key={fieldResults.map(r => r.confidence).join("-")} results={fieldResults} weather={weather} district={district} image={reportImage} />}
      </section>

      <TuberScan />
      <FarmerTools />
      {demo && !user && <p className="app-shell tool-notice" role="status">{language === "bn" ? "ডেমো চলছে। কোনো আসল অ্যাকাউন্টে লগইন হয়নি। খাতা এই ফোনেই থাকবে; অনলাইন সেভ ও পুশ খবর বন্ধ।" : "Demo mode. No real account is signed in. History stays on this device; cloud saving and push alerts are unavailable."}</p>}
      {dashboardAccess && <ColdStorage key={user?.id || "demo"} />}
      {dashboardAccess && <HarvestMarket storageKey={user?.id || "demo"} />}
      {dashboardAccess && <section id="diary" className="diary-section scroll-mt-20"><div className="app-shell py-16 sm:py-24"><div className="section-heading light"><div><p className="section-kicker"><History size={16} />{copy.diaryKicker}</p><h2>{copy.diaryTitle}</h2><p>{copy.diaryBody}</p><p>{user ? (language === "bn" ? "আপনার ব্যক্তিগত অনলাইন খাতা" : "Your private account history") : (language === "bn" ? "ডেমো: এই ফোনের খাতা; অনলাইনে সেভ হয় না।" : "Demo: this device only; no cloud sync.")}</p>{cloudMessage && <p role="status">{cloudMessage}</p>}</div>{diary.length > 0 && <button className="text-button" onClick={() => removeDiary()}><Trash2 size={16} />{copy.clearAll}</button>}</div>{diary.length === 0 ? <div className="empty-diary"><span><History size={31} /></span><h3>{copy.emptyDiary}</h3><p>{copy.emptyDiaryBody}</p><button className="secondary-main" onClick={() => startScan("quick")}><Camera size={18} />{copy.quick}</button></div> : <div className="diary-grid timeline-grid">{diary.map((entry) => { const previous = entry.followUpOf ? diary.find((item) => item.id === entry.followUpOf) : undefined; return <DiaryCard key={entry.id} entry={entry} trend={trendFromEntries(entry, previous)} language={language} copy={copy} onDelete={() => removeDiary(entry.id)} onRecheck={() => { setDistrict(entry.district); startScan("quick", entry.id); }} />; })}</div>}</div></section>}

      <section id="help" className="app-shell scroll-mt-20 py-16 sm:py-24"><div className="section-heading"><div><p className="section-kicker"><HelpCircle size={16} />{copy.helpKicker}</p><h2>{copy.helpTitle}</h2></div></div><div className="help-grid">{copy.helpCards.map(([title, body], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{body}</p><button onClick={() => speak(`${title}. ${body}`)}><Ear size={17} />{copy.listen}</button></article>)}</div>
        <div className="trust-grid"><article className="source-card"><BookOpen /><div><h3>{copy.sourceTitle}</h3><p>{copy.sourceBody}</p><div className="source-links"><a href="https://www.bamis.gov.bd/diseases/1/all/52" target="_blank" rel="noreferrer">{language === "bn" ? "আলুর রোগ · বামিস" : "Potato diseases · BAMIS"}</a><a href="https://bari.gov.bd/pages/static-pages/6922dd2b933eb65569e13c4e" target="_blank" rel="noreferrer">{language === "bn" ? "চাষের প্রযুক্তি · বারি" : "Crop technology · BARI"}</a><a href="https://ais.gov.bd/pages/krishi-kotha/আলু-সংগ্রহ-ও-সংরক্ষণ-7cc21d-6922d941dbfbab28ce04a4fa" target="_blank" rel="noreferrer">{language === "bn" ? "আলু সংরক্ষণ · এআইএস" : "Potato storage · AIS"}</a><a href="tel:16123" target="_blank" rel="noreferrer">১৬১২৩</a></div></div></article><article className="model-card"><ShieldCheck /><div><div className="flex flex-wrap items-center gap-2"><h3>{copy.aboutTitle}</h3><span className={`model-status ${modelHealth?.status !== "ready" ? "missing" : modelHealth.field_validated ? "ready" : "research"}`}>{modelHealth?.status !== "ready" ? copy.modelMissing : modelHealth.field_validated ? copy.modelReady : copy.modelResearch}</span></div><p>{copy.aboutBody}</p><dl><div><dt>{copy.modelVersion}</dt><dd>{modelHealth?.model_version || modelHealth?.model || "MobileNetV3-Small"}</dd></div><div><dt>{copy.regionalTest}</dt><dd>{modelHealth?.regional_test_accuracy ? `${Math.round(modelHealth.regional_test_accuracy * 100)}% · ${modelHealth.regional_test_images?.toLocaleString(language === "bn" ? "bn-BD" : "en-GB")} ${language === "bn" ? "ছবি" : "images"}` : language === "bn" ? "তথ্য নেই" : "Unavailable"}</dd></div><div><dt>{language === "bn" ? "শ্রেণি" : "Classes"}</dt><dd>{language === "bn" ? "সুস্থ · আগাম ধসা · নাবি ধসা" : "Healthy · Early blight · Late blight"}</dd></div></dl></div></article></div>
      </section>
    </main>

    <footer><div className="app-shell"><div className="footer-brand"><span className="brand-mark"><Leaf size={22} /></span><div><strong>আলুসাথী</strong><small>{copy.footer}</small></div></div><p><ShieldCheck size={15} />{copy.privacy}</p></div></footer>
    <nav className="bottom-nav" style={{ gridTemplateColumns: `repeat(${dashboardAccess ? 3 : 2}, minmax(0, 1fr))` }} aria-label="Mobile navigation"><a href="#scan"><Camera />{copy.navScan}</a>{dashboardAccess && <a href="#diary"><History />{copy.navField}</a>}<a href="#help"><HelpCircle />{copy.navHelp}</a></nav>
  </div>;
}

function labelText(label: DiseaseLabel, copy: Copy) {
  return label === "healthy" ? copy.healthy : label === "early_blight" ? copy.early : label === "late_blight" ? copy.late : copy.unknown;
}

function riskText(risk: Risk, copy: Copy) {
  return risk === "healthy" ? copy.fieldHealthy : risk === "watch" ? copy.fieldWatch : risk === "urgent" ? copy.fieldUrgent : copy.fieldUnknown;
}

function SingleResult({ result, language, copy, speak, speaking, retake }: { result: DiseaseResult; language: "bn" | "en"; copy: Copy; speak: (text: string) => void; speaking: boolean; retake: () => void }) {
  const status: Risk = result.label === "healthy" ? "healthy" : result.label === "unknown" ? "uncertain" : "watch";
  const title = labelText(result.label, copy);
  const actions = result.next_steps[language];
  const qualityMessages = result.quality.issues.map((issue) => issue === "too_dark" ? copy.tooDark : issue === "too_bright" ? copy.tooBright : copy.lowContrast);
  return <div className="result-content animate-rise"><div className={`result-symbol ${status}`}>{status === "healthy" ? <Check /> : <AlertTriangle />}</div><p className="result-kicker">{copy.result}</p><h3>{title}</h3>{qualityMessages.length > 0 && <div className="photo-warning" role="status"><Camera size={20} /><div><strong>{copy.photoProblem}</strong>{qualityMessages.map((message) => <p key={message}>{message}</p>)}</div></div>}<button className="listen-button" aria-pressed={speaking} onClick={() => speak(`${title}. ${actions.join(" ")}`)}><Mic2 size={18} />{speaking ? copy.stop : copy.listen}</button><div className="action-list">{[copy.now, copy.tomorrow, copy.helpAction].map((heading, index) => <article key={heading}><span>{index + 1}</span><div><strong>{heading}</strong><p>{actions[index]}</p></div></article>)}</div><div className="result-actions">{result.label === "unknown" && <button className="secondary-main" onClick={retake}><RefreshCw size={18} />{copy.retake}</button>}<a className="expert-call" href="tel:16123"><PhoneCall size={18} /><span><strong>{copy.callExpert}</strong><small>{copy.callCharge}</small></span></a></div><details className="why-card"><summary>{copy.why}<ChevronDown size={17} /></summary><div>{result.field_validated ? <><p>{copy.confidence}: <strong>{Math.round(result.confidence * 100)}%</strong></p><div className="confidence-track"><span style={{ width: `${Math.round(result.confidence * 100)}%` }} /></div><p className="mt-3">{copy.limitations}</p></> : <p>{copy.fieldValidationPending}</p>}</div></details></div>;
}

function PhotoAccepted({ copy, offline }: { copy: Copy; offline: boolean }) {
  return <div className="result-empty photo-accepted animate-rise"><span><Check size={38} /></span><h3>{copy.photoSaved}</h3><p>{copy.photoSavedBody}</p>{offline && <small className="offline-result"><WifiOff size={15} />{copy.offlineResult}</small>}</div>;
}

function FieldResult({ mode, results, risk, weather, copy, speak, speaking, restart }: { mode: ScanMode; results: DiseaseResult[]; risk: Risk; weather: WeatherData | null; copy: Copy; speak: (text: string) => void; speaking: boolean; restart: () => void }) {
  const affected = results.filter((item) => ["early_blight", "late_blight"].includes(item.label)).length;
  const clear = results.filter((item) => item.label === "healthy").length;
  const uncertain = Math.max(0, results.length - affected - clear);
  const title = riskText(risk, copy); const risky = risk === "watch" || risk === "urgent";
  const offline = results.some((item) => item.inference_mode === "offline");
  const actions = risk === "uncertain"
    ? [copy.todayUnknown, copy.tomorrowUnknown, copy.expertUnknown]
    : [risky ? copy.todayRisk : copy.todayHealthy, risky ? copy.tomorrowRisk : copy.tomorrowHealthy, risky ? copy.expertRisk : copy.expertHealthy];
  return <div className="result-content field-summary animate-rise"><div className={`result-symbol ${risk}`}>{risk === "healthy" ? <Check /> : <AlertTriangle />}</div><p className="result-kicker">{mode === "quick" ? copy.quick : copy.full}</p><h3>{title}</h3>{offline && <small className="offline-result"><WifiOff size={15} />{copy.offlineResult}</small>}<button className="listen-button" aria-pressed={speaking} onClick={() => speak(`${title}. ${actions.join(" ")}`)}><Mic2 size={18} />{speaking ? copy.stop : copy.listen}</button><div className="field-counts"><div className="risk"><strong>{affected}</strong><span>{copy.affected}</span></div><div className="clear"><strong>{clear}</strong><span>{copy.clear}</span></div><div className="unknown"><strong>{uncertain}</strong><span>{copy.uncertain}</span></div></div>{weather && <p className="weather-context"><CloudRain size={18} />{weather.humidity}% {copy.humidity} · {weather.temperature}°C</p>}<div className="action-list compact">{[copy.now, copy.tomorrow, copy.helpAction].map((heading, index) => <article key={heading}><span>{index + 1}</span><div><strong>{heading}</strong><p>{actions[index]}</p></div></article>)}</div><a className="expert-call mt-4" href="tel:16123"><PhoneCall size={18} /><span><strong>{copy.callExpert}</strong><small>{copy.callCharge}</small></span></a><button className="secondary-main mt-3 w-full justify-center" onClick={restart}><RefreshCw size={18} />{copy.newScan}</button></div>;
}

function DiaryCard({ entry, trend, language, copy, onDelete, onRecheck }: { entry: DiaryEntry; trend: Trend; language: "bn" | "en"; copy: Copy; onDelete: () => void; onRecheck: () => void }) {
  const date = new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.createdAt));
  const trendText = trend === "uncertain" ? copy.uncertain : trend === "improving" ? copy.improving : trend === "worsening" ? copy.worsening : trend === "stable" ? copy.stable : copy.firstCheck;
  const TrendIcon = trend === "improving" ? TrendingDown : trend === "worsening" ? TrendingUp : Minus;
  return <article className="diary-card"><div className="timeline-dot" aria-hidden="true" /><div className="flex items-start justify-between gap-3"><span className={`diary-status ${entry.risk}`}>{entry.risk === "healthy" ? <Check /> : <AlertTriangle />}</span><button onClick={onDelete} aria-label={copy.delete}><Trash2 size={16} /></button></div><div className={`trend-chip ${trend}`}><TrendIcon size={15} />{trendText}</div><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-white/45">{entry.mode === "field" ? copy.fieldLabel : copy.quickLabel}</p><h3>{riskText(entry.risk, copy)}</h3><div className="mt-5 flex flex-wrap gap-2"><span><MapPin />{entry.district}</span><span><Camera />{entry.scanCount} {copy.scans}</span>{entry.humidity && <span><CloudRain />{entry.humidity}%</span>}{entry.inferenceMode === "offline" && <span><WifiOff />Offline AI</span>}</div><time>{date}</time><button className="recheck-button" onClick={onRecheck}><RefreshCw size={16} />{copy.checkAgain}</button></article>;
}

function ExtremeWeatherPanel({ alerts, language, copy }: { alerts: WeatherAlert[]; language: "bn" | "en"; copy: Copy }) {
  return <section className="extreme-weather" aria-labelledby="weather-alert-title"><div className="app-shell py-5"><div className="alert-heading"><div><p>{copy.alertSource}</p><h2 id="weather-alert-title">{copy.alertTitle}</h2></div><CloudLightning /></div><div className="weather-alert-grid">{alerts.slice(0, 3).map((alert, index) => { const [title, action] = weatherAlertText(alert, language); const Icon = alert.type === "strong_wind" ? Wind : alert.type === "extreme_heat" ? Flame : alert.type === "cold" ? Snowflake : alert.type === "thunderstorm" ? CloudLightning : CloudRain; const date = new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${alert.date}T12:00:00`)); return <article key={`${alert.type}-${alert.date}-${index}`}><span><Icon /></span><div><small>{date}</small><h3>{title}</h3><p>{action}</p></div></article>; })}</div></div></section>;
}
