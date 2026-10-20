import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Calculator, Camera, Check, ChevronDown, CloudRain, Eye, Sun, Cloud,
  CloudLightning, Flame, Globe2, History, Leaf, Loader2, MapPin,
  Menu, Minus, PhoneCall, RefreshCw, ScanLine, ShieldCheck, Snowflake,
  Sprout, Store, Trash2, WifiOff, Wind, X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DiseaseLabel, DiseaseResult } from "@/lib/disease-api";
import { getWeather, WeatherAlert, WeatherData } from "@/lib/api";
import { deletePendingScan, listPendingScans } from "@/lib/pending-scans";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FarmerTools from "@/components/FarmerTools";
import FarmerNavigation from "@/components/FarmerNavigation";
import FarmerToday from "@/components/FarmerToday";
import { useDemo } from "@/contexts/DemoContext";
import ScanInsights from "@/components/ScanInsights";
import { deleteRecord, readRecords, writeRecord } from "@/lib/farmer-records";
import type { Json } from "@/integrations/supabase/types";
import { cropAge } from "@/lib/crop-advice";
import { localToday } from "@/lib/local-date";
import { spreadOutlook } from "@/lib/farmer-tools";
import { DISTRICT_NAMES } from "@/lib/district-names";
import { readFieldActions, type FieldAction } from "@/lib/field-actions";
import { LEDGER_EVENT, readLedger, syncLedger, type FarmLedgerEntry } from "@/lib/farm-ledger";
import { PHOTO_DEMO_CASES } from "@/lib/photo-demo-cases";

const TuberScan = lazy(() => import("@/components/TuberScan"));

type ScanMode = "quick" | "field";
type Risk = "healthy" | "watch" | "urgent" | "uncertain";
type TimelineEntry = { type: "scan"; createdAt: string; entry: DiaryEntry } | { type: "action"; createdAt: string; entry: FieldAction } | { type: "ledger"; createdAt: string; entry: FarmLedgerEntry };

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
  triage?: boolean;
  thumbnails?: string[];
  symptoms?: string[];
}

const DIARY_KEY = "alusathi-field-diary-v1";
const GUIDED_POINTS = [1, 2, 3];

const COPY = {
  bn: {
    brandLine: "আলুর রোগ বুঝুন, সহজে",
    navScan: "ছবি তুলুন", navField: "আমার জমি", navHelp: "সাহায্য",
    online: "অনলাইন", offline: "ইন্টারনেট নেই",
    heroKicker: "বাংলাদেশের আলুচাষির ডিজিটাল সাথী",
    heroTitle: "বাংলাদেশের আলুচাষির", heroAccent: "ডিজিটাল সাথী",
    heroBody: "পাতা বা আলুর ছবি দেখুন। আবহাওয়া জানুন, জমির হিসাব রাখুন এবং সহজ পরামর্শ পান।",
    quick: "১টি ছবি দিয়ে শুরু করুন", quickHint: "একটি আলুর পরিষ্কার ছবি দিন",
    full: "৩ ছবির পরীক্ষা", fullHint: "একই পাতার ৩টি ছবি",
    trust: "AI ফল নিশ্চিত রোগ নির্ণয় নয়",
    weatherLoading: "আবহাওয়া দেখা হচ্ছে…", weatherGood: "আজ নজর রাখুন",
    weatherRisk: "রোগ বাড়ার মতো আবহাওয়া", weatherUnavailable: "আবহাওয়া এখন পাওয়া যাচ্ছে না", humidity: "আর্দ্রতা", cachedWeather: "শেষ সেভ করা আবহাওয়া",
    alertTitle: "প্রতিকূল আবহাওয়ার সতর্কতা", alertSource: "৩ দিনের পূর্বাভাস",
    scanKicker: "পাতার লক্ষণ", scanTitle: "পাতার ছবি ও লক্ষণ লিখে রাখুন",
    scanBody: "একটি পরিষ্কার ছবি দিন। তারপর কয়েকটি প্রশ্নের উত্তর দিয়ে বিশেষজ্ঞের জন্য রিপোর্ট তৈরি করুন।",
    guidedInstructions: ["পাতার সামনের দিক কাছে থেকে", "একই পাতার আরেকটি পরিষ্কার ছবি দিন", "আক্রান্ত অংশ কাছে থেকে দেখান"],
    fieldTitle: "৩টি ছবি দিয়ে দেখুন", fieldBody: "একটি পাতার তিনটি পরিষ্কার ছবি দিলে আরও তথ্য পাওয়া যায়।",
    point: "ছবি", of: "এর মধ্যে", photoSaved: "ছবি রাখা হয়েছে", photoSavedBody: "চাইলে পরের ছবিটি দিন।",
    pointInstructions: ["পাতার সামনের দিক কাছে থেকে", "একই পাতার আরেকটি পরিষ্কার ছবি", "আক্রান্ত অংশ কাছে থেকে"],
    choose: "ছবি তুলুন বা বাছুন", formats: "JPG, PNG বা WebP · সর্বোচ্চ ৮ MB", replace: "অন্য ছবি দিন",
    analyze: "ছবি যোগ করুন", analyzing: "ছবি খোলা হচ্ছে…", nextPoint: "পরের ছবি তুলুন", retake: "আবার ছবি তুলুন",
    noResult: "ছবি প্রস্তুত", noResultBody: "ছবি যোগ করে নিচে পাতার লক্ষণ লিখুন।",
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
    fieldValidationPending: "মাঠের পরীক্ষায় AI এখনো যথেষ্ট নির্ভরযোগ্য নয়। আরও ছবি তথ্য দিতে পারে, কিন্তু এই নিরাপত্তার সীমা বা রোগ নিশ্চিত করতে পারে না।",
    photoProblem: "ছবিটি আরেকবার তুলুন", tooDark: "ছবিতে আলো কম ছিল।", tooBright: "ছবিতে আলো বেশি ছিল।", lowContrast: "পাতাটি পরিষ্কার বোঝা যায়নি।",
    callExpert: "কৃষি বিশেষজ্ঞকে কল করুন", callCharge: "১৬১২৩ · চার্জ প্রযোজ্য",
    listen: "শুনুন", stop: "বন্ধ করুন", newScan: "নতুন ছবি", offlineResult: "এই ফোনেই AI পরীক্ষা হয়েছে",
    diaryKicker: "রোগের অগ্রগতি", diaryTitle: "আগের ফলের সাথে তুলনা",
    diaryBody: "একই জমি আবার পরীক্ষা করলে উন্নতি হচ্ছে, একই আছে নাকি ঝুঁকি বাড়ছে তা দেখা যাবে।",
    emptyDiary: "এখনও কোনো ছবি রাখা হয়নি", emptyDiaryBody: "প্রথম ছবি ও লক্ষণ লিখে রাখলে এখানে দেখাবে।",
    quickLabel: "পাতার পরীক্ষা", fieldLabel: "৩ ছবির পরীক্ষা", scans: "টি ছবি", delete: "মুছুন", clearAll: "সব মুছুন",
    improving: "আগের চেয়ে ভালো", stable: "প্রায় একই আছে", worsening: "আরও নজর দরকার", firstCheck: "প্রথম পরীক্ষা", checkAgain: "একই জমি আবার দেখুন",
    helpKicker: "আলুর যত্ন", helpTitle: "সহজ পদ্ধতিতে আলুর যত্ন",
    helpCards: [
      ["পানি জমতে দেবেন না", "জমির নালা পরিষ্কার রাখুন, যাতে পানি জমে না থাকে। মাটি বুঝে সেচ দিন — বেশি পানি দিলে আলু পচে যেতে পারে।"],
      ["আলু মাটি দিয়ে ঢাকুন", "মাটির ওপরে বের হয়ে আসা আলু ঢেকে দিন, নইলে রোদে সবুজ হয়ে যাবে। তোলার পর আলু রাখুন ছায়ায়, শুকনো ও হাওয়া চলাচল করে এমন জায়গায়।"],
      ["সুস্থ বীজ বাছুন", "সবসময় রোগমুক্ত, ভালো বীজ আলু বেছে নিন। পচা বা দাগ পড়া আলু কখনো ভালো আলুর সাথে রাখবেন না — একটা খারাপ হলে বাকিগুলোও নষ্ট হতে পারে।"],
    ],
    sourceTitle: "ভরসাযোগ্য তথ্য",
    sourceBody: "আবহাওয়া ও মাঠের করণীয় BAMIS, BARI ও কৃষি তথ্য সার্ভিসের প্রকাশিত তথ্যের ভিত্তিতে সহজ করা হয়েছে।",
    aboutTitle: "এই AI সম্পর্কে",
    aboutBody: "১৩,৮০০টি আলাদা আঞ্চলিক ছবির পরীক্ষায় এই AI প্রতি ১০০টির মধ্যে প্রায় ৫১টি ঠিক চিনেছে। তাই এটি এখন শুধু গবেষণার জন্য; কৃষকের রোগ নির্ণয়ের জন্য নয়।",
    modelReady: "AI প্রস্তুত", modelResearch: "গবেষণা পর্যায়", modelMissing: "AI সংযোগ নেই", modelVersion: "মডেল", regionalTest: "আঞ্চলিক পরীক্ষা",
    privacy: "এখন আপনার ছবি AI প্রশিক্ষণে ব্যবহার করা হয় না।", footer: "আলুসাথী · কৃষকের সিদ্ধান্ত, AI-এর সহায়তা",
  },
  en: {
    brandLine: "Understand potato disease, simply",
    navScan: "Scan", navField: "My field", navHelp: "Help", online: "Online", offline: "Offline",
    heroKicker: "A digital companion for Bangladesh potato farmers",
    heroTitle: "Bangladesh’s potato farmers.", heroAccent: "Your digital companion.",
    heroBody: "Check a leaf or potato photo. See the weather, get simple help and keep useful notes.",
    quick: "Start with 1 photo", quickHint: "One clear potato photo", full: "Three-photo check", fullHint: "Three views of the same leaf",
    trust: "An AI result is not a confirmed diagnosis",
    weatherLoading: "Checking weather…", weatherGood: "Keep watch today", weatherRisk: "Weather may support disease",
    weatherUnavailable: "Weather is unavailable now", humidity: "Humidity", cachedWeather: "Last saved weather",
    alertTitle: "Extreme-weather message", alertSource: "3-day forecast",
    scanKicker: "Leaf symptoms", scanTitle: "Record a leaf photo and symptoms",
    scanBody: "Add one clear photo, then answer a few questions for a report to share with an expert.",
    guidedInstructions: ["Close view of the leaf front", "Another clear view of the same leaf", "Close view of the affected area"],
    fieldTitle: "Check with three photos", fieldBody: "Three clear views of one leaf can give more evidence.",
    point: "Photo", of: "of", photoSaved: "Photo recorded", photoSavedBody: "Add the next view if you want.",
    pointInstructions: ["Close view of the leaf front", "Another clear view of the same leaf", "Close view of the affected area"],
    choose: "Take or choose a photo", formats: "JPG, PNG or WebP · up to 8 MB", replace: "Choose another",
    analyze: "Add photo", analyzing: "Opening photo…", nextPoint: "Take next photo", retake: "Take again",
    noResult: "Photo ready", noResultBody: "Add it, then record the leaf symptoms below.",
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
    fieldValidationPending: "Field testing shows that this AI is not reliable enough yet. More photos can add evidence, but they cannot remove this safety limit or confirm a disease.",
    photoProblem: "Take the photograph again", tooDark: "The photograph was too dark.", tooBright: "The photograph was too bright.", lowContrast: "The leaf was not clear enough.",
    callExpert: "Call an agricultural expert", callCharge: "16123 · charges apply",
    listen: "Listen", stop: "Stop", newScan: "New scan", offlineResult: "AI checked this on your phone",
    diaryKicker: "Disease progress", diaryTitle: "Compare past checks", diaryBody: "Check the same field again to see if it looks better, the same, or worse.",
    emptyDiary: "No checks saved yet", emptyDiaryBody: "Your first completed check will appear here.",
    quickLabel: "Leaf photo check", fieldLabel: "3-photo check", scans: "photos", delete: "Delete", clearAll: "Delete all",
    improving: "Looks better than before", stable: "About the same", worsening: "Needs more attention", firstCheck: "First check", checkAgain: "Check the same field again",
    helpKicker: "Crop care", helpTitle: "Simple care for better potatoes",
    helpCards: [
      ["Keep drains clear", "Keep drains clear so water can run off. Check the soil before watering. Too much water can rot potatoes."],
      ["Keep tubers covered", "Cover exposed potatoes with soil so sunlight does not turn them green. After harvest, keep them in a dry, shaded place with good airflow."],
      ["Start with healthy seed", "Choose healthy, disease-free seed potatoes. Keep rotten or marked potatoes away from good ones: rot can spread."],
    ],
    sourceTitle: "Trusted information",
    sourceBody: "Weather and field actions are simplified from published BAMIS, BARI and Agricultural Information Service information.",
    aboutTitle: "About this AI",
    aboutBody: "On 13,800 separate regional images, this AI identified about 51 in every 100 correctly. It is therefore research-only, not ready for farmer diagnosis.",
    modelReady: "AI ready", modelResearch: "Research stage", modelMissing: "AI disconnected", modelVersion: "Model", regionalTest: "Regional test",
    privacy: "Your photos are not used for AI training in this version.", footer: "AluSathi · Farmer decisions, assisted by AI",
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
  return mode === "quick" ? results.length >= 1 : results.length >= 3;
}

async function recordLeafPhoto(file: File, allowBlurry = false): Promise<DiseaseResult> {
  const bitmap = await createImageBitmap(file);
  let blurry = false;
  try {
    if (bitmap.width < 200 || bitmap.height < 200) throw new Error("photo-small");
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("photo-unreadable");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
    const pixels = context.getImageData(0, 0, 512, 512).data;
    const gray = new Float32Array(512 * 512);
    let brightness = 0;
    for (let i = 0; i < gray.length; i++) {
      const at = i * 4;
      gray[i] = .299 * pixels[at] + .587 * pixels[at + 1] + .114 * pixels[at + 2];
      brightness += gray[i];
    }
    if (brightness / gray.length < 35) throw new Error("photo-dark");
    let sum = 0, squares = 0, count = 0;
    for (let y = 1; y < 511; y++) for (let x = 1; x < 511; x++) {
      const i = y * 512 + x;
      const edge = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - 512] - gray[i + 512];
      sum += edge; squares += edge * edge; count++;
    }
    blurry = squares / count - (sum / count) ** 2 < 50;
    if (blurry && !allowBlurry) throw new Error("photo-blurry");
  } finally { bitmap.close(); }
  return {
    label: "unknown", labels: { bn: "পাতার লক্ষণ লিখে নিন", en: "Record leaf symptoms" }, confidence: 0,
    quality_warning: blurry, quality: { brightness: 0, contrast: 0, issues: blurry ? ["possible_blur"] : [] }, rejection_reasons: ["field_validation_pending"],
    field_validated: false, needs_expert_review: true, probabilities: {}, next_steps: { bn: [], en: [] },
    model_scope: "Photo record and symptom triage; no disease classification", treatment_status: "Expert review before treatment",
  };
}

async function photoThumbnail(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(160 / bitmap.width, 120 / bitmap.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .65);
  } finally { bitmap.close(); }
}

function riskFromResults(results: DiseaseResult[], weather: WeatherData | null): Risk {
  const affected = results.filter((item) => item.label === "early_blight" || item.label === "late_blight").length;
  const uncertain = results.filter((item) => item.label === "unknown").length;
  const weatherPressure = Boolean(spreadOutlook(weather)?.high);
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

export default function AluSathiDashboard({ farmerHome = false }: { farmerHome?: boolean }) {
  const { user, signOut } = useAuth();
  const { demo, setDemo } = useDemo();
  const dashboardAccess = Boolean(user) || demo;
  const buyerSession = !dashboardAccess && (() => { try { return sessionStorage.getItem("alusathi-role") === "buyer" || localStorage.getItem("alusathi-role") === "buyer"; } catch { return false; } })();
  const activeRole = dashboardAccess ? "farmer" : buyerSession ? "buyer" : null;
  const { language, setLanguage } = useLanguage();
  const copy = COPY[language];
  const [mode, setMode] = useState<ScanMode>("quick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [fieldResults, setFieldResults] = useState<DiseaseResult[]>([]);
  const [fieldThumbnails, setFieldThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blurWarning, setBlurWarning] = useState(false);
  const [leafOpen, setLeafOpen] = useState(false);
  const [todayPhotoOpen, setTodayPhotoOpen] = useState(false);
  const [todayDemoResult, setTodayDemoResult] = useState<typeof PHOTO_DEMO_CASES[number] | null>(null);
  const [farmerView, setFarmerView] = useState(() => window.location.hash.slice(1) || "today");
  const [tuberConsent, setTuberConsent] = useState(false);
  const location = useLocation();
  useEffect(() => {
    if (!farmerHome) return;
    const update = () => { const view = window.location.hash.slice(1) || "today"; if (view === "tuber") { window.location.hash = "photos"; return; } setFarmerView(view); setTodayPhotoOpen(false); if (view === "photos") setLeafOpen(false); window.scrollTo({ top: 0, behavior: "instant" }); };
    update(); window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [farmerHome, location.hash]);
  const [tipIndex, setTipIndex] = useState(0);
  const [district, setDistrict] = useState(() => localStorage.getItem("alusathi-district") || "Rangpur");
  const [districtOptions, setDistrictOptions] = useState<Record<string, string>>({ Rangpur: "রংপুর" });
  const [plantingDate, setPlantingDate] = useState(() => localStorage.getItem("alusathi-planting-date") || "");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [diary, setDiary] = useState<DiaryEntry[]>(() => readDiary());
  const [ledger, setLedger] = useState<FarmLedgerEntry[]>(() => readLedger(user?.id));
  const [activeDiaryId, setActiveDiaryId] = useState<string>();
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

  useEffect(() => {
    const refresh = () => setLedger(readLedger(user?.id));
    refresh(); window.addEventListener(LEDGER_EVENT, refresh); window.addEventListener("storage", refresh);
    if (user) {
      const sync = () => { if (navigator.onLine) void syncLedger(user.id).then(setLedger).catch(() => setCloudMessage(language === "bn" ? "হিসাবের অনলাইন খাতা পাওয়া যায়নি। এই ফোনে সেভ আছে; ইন্টারনেট এলে আবার চেষ্টা হবে।" : "Cloud notebook unavailable. Records remain on this device and will retry online.")); };
      sync(); window.addEventListener("online", sync);
      return () => { window.removeEventListener(LEDGER_EVENT, refresh); window.removeEventListener("storage", refresh); window.removeEventListener("online", sync); };
    }
    return () => { window.removeEventListener(LEDGER_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, [user?.id, language]);

  const [, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notebookTab, setNotebookTab] = useState<"work" | "expenses">("work");
  const [followUpOf, setFollowUpOf] = useState<string | undefined>();
  const scanRef = useRef<HTMLElement>(null);
  const landingRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  useLayoutEffect(() => {
    if (farmerHome || !landingRef.current || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = landingRef.current.querySelectorAll<HTMLElement>(".landing-reveal");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("landing-reveal-pending");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach(target => { target.classList.add("landing-reveal-pending"); observer.observe(target); });
    return () => { observer.disconnect(); targets.forEach(target => target.classList.remove("landing-reveal-pending")); };
  }, [farmerHome]);
  const scanPoints = mode === "quick" ? GUIDED_POINTS.slice(0, Math.min(3, fieldResults.length + 1)) : GUIDED_POINTS;
  const scanComplete = isScanComplete(fieldResults, mode);

  const syncPendingScans = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    let completed = 0;
    try {
      const pending = await listPendingScans();
      for (const item of pending) {
        try {
          const queuedFile = new File([item.blob], item.fileName, { type: item.fileType });
           const queuedResult = await recordLeafPhoto(queuedFile);
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
      if (navigator.onLine) syncPendingScans();
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

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
    import(/* @vite-ignore */ new URL("/marketplace/districts.mjs", window.location.origin).href).then(({ districtPlaces }) => {
      setDistrictOptions(Object.fromEntries(Object.entries(districtPlaces as Record<string, { bn: string }>).map(([name, place]) => [name, place.bn])));
    }).catch(() => {});
  }, []);

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
    if (farmerHome && !todayPhotoOpen) { window.location.hash = "photos"; setFarmerView("photos"); }
    setReportImage(null);
    setMode(nextMode); setFile(null); setPreview(null); setResult(null); setFieldResults([]); setFieldThumbnails([]); setError(""); setBlurWarning(false);
    setFollowUpOf(nextFollowUp);
    if (!farmerHome) requestAnimationFrame(() => scanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function showDemoInToday(demo: typeof PHOTO_DEMO_CASES[number]) {
    setTodayDemoResult(demo);
    setTodayPhotoOpen(false);
    setFarmerView("today");
    if (window.location.hash) window.location.hash = "";
    else window.scrollTo({ top: 0, behavior: "instant" });
  }

  function chooseFile(next?: File) {
    if (!next || loading || scanComplete || (result && !result.quality_warning)) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 8 * 1024 * 1024) { setError(copy.error); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next)); setResult(null); setError(""); setBlurWarning(false);
  }

  function continueWithLeafPhoto(next: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 8 * 1024 * 1024) return;
    if (preview) URL.revokeObjectURL(preview);
    setMode("quick"); setFieldResults([]); setFieldThumbnails([]); setResult(null); setReportImage(null); setFile(next); setPreview(URL.createObjectURL(next)); setError(""); setBlurWarning(false); setFollowUpOf(undefined); setLeafOpen(true);
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

  function saveSymptoms(id: string, symptoms: string[]) {
    const entry = diary.find((item) => item.id === id);
    if (!entry) return;
    const updated = { ...entry, symptoms };
    const next = diary.map((item) => item.id === id ? updated : item);
    localStorage.setItem(diaryKey, JSON.stringify(next)); setDiary(next);
    if (user) {
      localStorage.setItem(`${diaryKey}-pending-${id}`, JSON.stringify(updated));
      writeRecord(user.id, "scan", id, updated as unknown as Json, updated.createdAt)
        .then(() => localStorage.removeItem(`${diaryKey}-pending-${id}`))
        .catch(() => setCloudMessage(language === "bn" ? "লক্ষণ এই ফোনে আছে। অনলাইনে সেভ হয়নি।" : "Symptoms are saved on this phone; cloud save failed."));
    }
  }

  async function analyze(allowBlurry = false) {
    if (!file || loading || scanComplete || (result && !result.quality_warning)) return;
    setLoading(true); setError("");
    try {
       const nextResult = await recordLeafPhoto(file, allowBlurry);
      const nextThumbnails = [...fieldThumbnails, await photoThumbnail(file)].slice(0, 3);
      setFieldThumbnails(nextThumbnails);
      setBlurWarning(false);
      setResult(nextResult);
      if (!fieldResults.length) setReportImage(URL.createObjectURL(file));
      const nextField = [...fieldResults, nextResult];
      setFieldResults(nextField);
      if (isScanComplete(nextField, mode)) {
        const risk = riskFromResults(nextField, weather);
        const affectedCount = nextField.filter((item) => ["early_blight", "late_blight"].includes(item.label)).length;
        const entry = {
          id: crypto.randomUUID(), createdAt: new Date().toISOString(), mode, district, risk,
          label: dominantLabel(nextField, risk), scanCount: nextField.length, affectedCount,
           humidity: weather?.humidity, followUpOf, triage: true, thumbnails: nextThumbnails,
        };
        saveDiary(entry); setActiveDiaryId(entry.id);
      }
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "";
      setBlurWarning(reason === "photo-blurry");
      setError(reason === "photo-dark" ? (language === "bn" ? "ছবিতে আলো কম। দিনের আলোতে আবার তুলুন।" : "The photo is too dark. Retake it in daylight.")
        : reason === "photo-blurry" ? (language === "bn" ? "ছবিটি ঝাপসা হতে পারে। চাইলে আবার তুলুন, অথবা এই ছবিই ব্যবহার করুন।" : "This photo may be blurry. Retake it, or use it anyway.")
        : reason === "photo-small" ? (language === "bn" ? "ছবিটি খুব ছোট। বড় ছবি দিন।" : "The photo is too small. Choose a larger one.") : copy.error);
    }
    finally { setLoading(false); }
  }

  function nextFieldPoint() {
    retakeCurrent();
  }

  function retakeCurrent() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResult(null); setError(""); setBlurWarning(false);
    scanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const weatherRisk = Boolean(spreadOutlook(weather)?.high);
  const weatherAlerts = weather?.cached ? [] : weather?.alerts || [];
  const age = cropAge(plantingDate);
  const marketHref = dashboardAccess ? "/marketplace/farmer.html" : "/marketplace/";
  const timeline = [
    ...diary.map((entry): TimelineEntry => ({ type: "scan", createdAt: entry.createdAt, entry })),
    ...readFieldActions().map((entry): TimelineEntry => ({ type: "action", createdAt: `${entry.date}T12:00:00`, entry })),
    ...ledger.map((entry): TimelineEntry => ({ type: "ledger", createdAt: `${entry.date}T12:00:00`, entry })),
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 100);

  const leafPhotoFlow = <details className="leaf-check-details" open={leafOpen} onToggle={event => setLeafOpen(event.currentTarget.open)}><summary>{language === "bn" ? "গাছের পাতায় সমস্যা?" : "Problem with the plant’s leaves?"}</summary>
    <section id="leaf-scan" ref={scanRef} className="scroll-mt-24 py-8">
      <div className="section-heading"><div><p className="section-kicker"><ScanLine size={16} />{copy.scanKicker}</p><h2>{copy.scanTitle}</h2><p>{copy.scanBody}</p></div></div>
      {!fieldResults.length && !file && <button className="secondary-main mb-4" onClick={() => startScan(mode === "quick" ? "field" : "quick")}>{language === "bn" ? (mode === "quick" ? "চাইলে ৩টি ছবি দিন" : "১টি ছবি দিয়ে শুরু করুন") : (mode === "quick" ? "Use three photos instead" : "Use one photo instead")}</button>}
      {!scanComplete && (mode === "field" || fieldResults.length > 0) && <div className="field-progress-card"><div className="field-path" aria-label={`${fieldResults.length} of ${scanPoints.length} completed`}>{scanPoints.map((point, index) => <span key={point} className={index < fieldResults.length ? "done" : index === fieldResults.length ? "current" : ""}>{index < fieldResults.length ? <Check size={16} /> : point}</span>)}</div><div><p className="text-sm font-bold text-leaf">{copy.point} {fieldResults.length + 1} {copy.of} {scanPoints.length}</p><strong className="mt-1 block text-xl text-ink">{mode === "quick" ? copy.guidedInstructions[fieldResults.length] : copy.pointInstructions[fieldResults.length]}</strong></div></div>}
      <div className={`scan-workspace ${!file && !result ? "scan-workspace-empty" : ""}`}><div className="scan-capture"><label className={`camera-stage ${preview ? "has-image" : ""}`}><input disabled={loading || scanComplete || Boolean(result && !result.quality_warning)} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />{preview ? <img src={preview} alt={language === "bn" ? "বাছাই করা আলু পাতা" : "Selected potato leaf"} /> : <div className="camera-empty"><span className="leaf-frame"><Leaf size={62} /></span><strong>{copy.choose}</strong><small>{copy.formats}</small></div>}{preview && <span className="replace-photo"><RefreshCw size={16} />{copy.replace}</span>}</label><div className="photo-tips"><span><Check />{language === "bn" ? "একটি পাতা" : "One leaf"}</span><span><Check />{language === "bn" ? "দিনের আলো" : "Daylight"}</span><span><Check />{language === "bn" ? "কাছে থেকে" : "Close view"}</span></div>{error && <p className="error-message" role="alert"><AlertTriangle size={18} />{error}</p>}{blurWarning && <button type="button" className="secondary-main" onClick={() => analyze(true)}>{language === "bn" ? "এই ছবিই ব্যবহার করুন" : "Use anyway"}</button>}<button className="main-button" disabled={!file || loading || scanComplete || Boolean(result && !result.quality_warning)} onClick={() => analyze()}>{loading ? <Loader2 className="animate-spin" /> : <ScanLine />}{loading ? copy.analyzing : copy.analyze}</button></div>
        {(file || result) && <div className="result-stage" aria-live="polite">{scanComplete ? <div className="result-content field-summary animate-rise"><div className="result-symbol uncertain"><Check /></div><h3>{language === "bn" ? "ছবি রাখা হয়েছে" : "Photo recorded"}</h3><p>{language === "bn" ? "নিচের প্রশ্নগুলোর উত্তর দিন। এটি রোগ নির্ণয় নয়।" : "Answer the questions below. This is not a disease diagnosis."}</p><button className="secondary-main mt-4" onClick={() => startScan(mode)}><RefreshCw size={18} />{copy.newScan}</button></div> : result ? <PhotoAccepted copy={copy} offline={false} /> : <div className="result-empty"><span><Leaf size={42} /></span><h3>{copy.noResult}</h3><p>{copy.noResultBody}</p></div>}{result && !scanComplete && <button className="next-button" onClick={nextFieldPoint}>{copy.nextPoint}<ArrowRight size={18} /></button>}</div>}</div>
      {scanComplete && <ScanInsights key={reportImage} results={fieldResults} weather={weather} district={district} image={reportImage} cropAgeDays={age} onSymptomsChange={symptoms => { if (activeDiaryId) saveSymptoms(activeDiaryId, symptoms); }} />}
    </section>
  </details>;

  async function logout() {
    if (user) {
      try { await signOut(); }
      catch { setCloudMessage(language === "bn" ? "বের হওয়া যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।" : "Could not sign out. Check your connection and retry."); return; }
    }
    setDemo(false);
    window.location.replace("/");
  }

  return <div ref={landingRef} className={`${language === "bn" ? "font-bangla" : ""} ${farmerHome ? "farmer-v2" : "landing-motion"}`} data-view={farmerView}>
    <a href="#main" className="skip-link">{language === "bn" ? "মূল অংশে যান" : "Skip to content"}</a>
    {farmerHome ? <FarmerNavigation active={farmerView} /> : <header className={`site-header ${activeRole ? "signed-in" : ""}`}>
      <div className="app-shell flex h-16 items-center justify-between gap-3">
        <a href="#top" className="site-brand flex items-center gap-3" aria-label={language === "bn" ? "আলুসাথীর প্রথম পাতা" : "AluSathi home"}><span className="brand-mark"><Leaf size={22} /></span><span><strong className="block text-lg leading-none">আলুসাথী</strong><small className="mt-1 hidden text-xs font-semibold text-ink/75 sm:block">{copy.brandLine}</small></span></a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation"><a className="top-nav" href="#scan"><Camera size={16} />{copy.navScan}</a><a className="top-nav" href={marketHref}><Store size={16} />{language === "bn" ? "বাজার" : "Market"}</a>{dashboardAccess && <a className="top-nav" href="#diary"><History size={16} />{copy.navField}</a>}{dashboardAccess && <Link className="top-nav" to="/selling-preparation"><Snowflake size={16} />{language === "bn" ? "বিক্রির প্রস্তুতি" : "Prepare to sell"}</Link>}<Link className="top-nav" to="/life-cycle"><Sprout size={16} />{language === "bn" ? "আলুর জীবন" : "Potato life"}</Link></nav>
        <div className="flex items-center gap-2">{activeRole && <a className="role-badge" href={activeRole === "farmer" ? "/farmer" : "/marketplace/buyer.html"}>{activeRole === "farmer" ? <Leaf size={15} /> : <Store size={15} />}<span className="role-badge-full">{language === "bn" ? (activeRole === "farmer" ? "কৃষক · আমার পাতা" : "ব্যবসায়ী · আমার পাতা") : (activeRole === "farmer" ? "Farmer · My page" : "Businessman · My page")}</span><span className="role-badge-mobile">{language === "bn" ? (activeRole === "farmer" ? "কৃষক" : "ব্যবসায়ী") : (activeRole === "farmer" ? "Farmer" : "Buyer")}</span></a>}{activeRole ? <button className="icon-button" onClick={logout}>{language === "bn" ? "বের হন" : "Logout"}</button> : <Link className="icon-button" to="/auth">{language === "bn" ? "কৃষক / ব্যবসায়ী" : "Farmer / buyer"}</Link>}<button className="icon-button" onClick={() => setLanguage(language === "bn" ? "en" : "bn")} aria-label={language === "bn" ? "ভাষা বদলান" : "Change language"}><Globe2 size={18} /><span>{language === "bn" ? "EN" : "বাংলা"}</span></button><button className="icon-button lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={language === "bn" ? (menuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন") : (menuOpen ? "Close menu" : "Open menu")} aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button></div>
      </div>
      {menuOpen && <nav className="mobile-menu app-shell" aria-label="Mobile navigation"><a href="#scan" onClick={() => setMenuOpen(false)}>{copy.navScan}</a><a href={marketHref} onClick={() => setMenuOpen(false)}>{language === "bn" ? "আলুর বাজার" : "Potato market"}</a>{dashboardAccess && <a href="#diary" onClick={() => setMenuOpen(false)}>{copy.navField}</a>}{dashboardAccess && <Link to="/selling-preparation" onClick={() => setMenuOpen(false)}>{language === "bn" ? "বিক্রির প্রস্তুতি" : "Prepare to sell"}</Link>}<Link to="/life-cycle" onClick={() => setMenuOpen(false)}>{language === "bn" ? "আলুর জীবন" : "Potato life"}</Link></nav>}
    </header>}
    {syncedCount > 0 && <div className="sync-notice" role="status"><div className="app-shell"><Check size={18} /><strong>{language === "bn" ? `${syncedCount}${copy.syncDone}` : `${syncedCount} ${copy.syncDone}`}</strong><button onClick={() => setSyncedCount(0)} aria-label={copy.stop}><X size={17} /></button></div></div>}

    <main id="main">
      {!farmerHome && <section id="top" className="hero-section"><div className="hero-photo" aria-hidden="true" /><div className="hero-wash" aria-hidden="true" /><div className="nakshi-pattern" aria-hidden="true" />
        <div className="app-shell relative grid min-h-[760px] items-end pb-12 pt-28 sm:min-h-[720px] sm:pb-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-8">
          <div className="hero-copy animate-rise"><h1>{farmerHome ? (language === "bn" ? "আমার আলুর জমি" : "My potato field") : copy.heroTitle}<br /><em>{farmerHome ? (language === "bn" ? "আজকের কাজ" : "Today's work") : copy.heroAccent}</em></h1><p className="hero-body">{farmerHome ? (language === "bn" ? "জমির সময়, আবহাওয়া আর আগের কাজ—সব এক জায়গায়।" : "Crop timing, weather and your past activity in one place.") : copy.heroBody}</p>
            <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2"><button className="hero-action primary" onClick={() => startScan("quick")}><span className="action-icon"><Sprout size={24} /></span><span><strong>{language === "bn" ? "গাছের পাতা দেখুন" : "Check plant leaves"}</strong><small>{language === "bn" ? "পাতার রোগের পরীক্ষা" : "Leaf disease check"}</small></span><ArrowRight className="ml-auto" size={20} /></button><a className="hero-action secondary" href="#scan"><span className="action-icon"><Camera size={24} /></span><span><strong>{copy.quick}</strong><small>{copy.quickHint}</small></span><ArrowRight className="ml-auto" size={20} /></a></div>
          </div><div className="hidden lg:block" />
        </div>
      </section>}

      {!farmerHome && <div className="app-shell weather-compact-wrap landing-reveal">
        <section className="weather-compact" aria-label={language === "bn" ? "আবহাওয়া" : "Weather"} aria-live="polite">
          <div className="weather-top"><strong>{weather ? `${Math.round(weather.temperature)}°` : "—°"}</strong>{weather?.weather === "Clear" ? <Sun size={42} /> : weather?.weather === "Cloudy" ? <Cloud size={42} /> : <CloudRain size={42} />}</div>
          <p>{weatherLoading ? copy.weatherLoading : !weather ? copy.weatherUnavailable : language === "bn" ? ({Clear:"পরিষ্কার আকাশ", Cloudy:"মেঘলা আকাশ", Rain:"বৃষ্টি হচ্ছে", Storms:"ঝড়ের আবহাওয়া"}[weather.weather] || "আজকের আবহাওয়া") : weather.weather}</p>
          {weather && <small>{copy.humidity} {weather.humidity}% · {language === "bn" ? "এখন বৃষ্টি" : "Rain now"} {weather.rainfall} {language === "bn" ? "মিমি" : "mm"}{farmerHome && Number.isFinite(weather.forecastRainMm) ? ` · ${language === "bn" ? "৩ দিনে" : "3 days"} ${Math.round(weather.forecastRainMm!)} ${language === "bn" ? "মিমি" : "mm"}` : ""}</small>}
          <label className="district-picker"><MapPin size={15} /><span className="sr-only">{language === "bn" ? "জেলা" : "District"}</span><select value={district} onChange={event => setDistrict(event.target.value)}>{Object.entries(districtOptions).map(([value, bn]) => <option key={value} value={value}>{language === "bn" ? bn : value}</option>)}</select><ChevronDown size={15} /></label>
          {weather?.cached && <small>{copy.cachedWeather}</small>}
          {farmerHome && Boolean(weather?.forecast?.length) && !weather?.cached && <details className="weather-alert-details"><summary>{language === "bn" ? "আগামী ৩ দিনের আবহাওয়া" : "Next 3 days"}</summary>{weather?.forecast?.map(day => <p key={day.date}><strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", { weekday: "short", day: "numeric" })}</strong> · {Math.round(day.minimum)}–{Math.round(day.maximum)}° · {language === "bn" ? "বৃষ্টি" : "Rain"} {Math.round(day.rainMm)} {language === "bn" ? "মিমি" : "mm"} · {language === "bn" ? "দমকা হাওয়া" : "Gust"} {Math.round(day.windKmh)} km/h</p>)}</details>}
          {!farmerHome && weatherRisk && <small>{copy.weatherRisk}</small>}
          {weatherAlerts.length > 0 && <details className="weather-alert-details"><summary>{language === "bn" ? `${weatherAlerts.length}টি সতর্কতা দেখুন` : `View ${weatherAlerts.length} alerts`}</summary>{weatherAlerts.map((alert, i) => { const [title, action] = weatherAlertText(alert, language); return <p key={i}><strong>{title}</strong><br />{alert.date} · {action}</p>; })}</details>}
        </section>
      </div>}

      {farmerHome && <div hidden={farmerView !== "today"}><FarmerToday weather={weather} loading={weatherLoading} district={district} districts={districtOptions} plantingDate={plantingDate} onPhoto={() => { window.location.hash = "photos"; setFarmerView("photos"); setTodayPhotoOpen(false); }} photoOpen={todayPhotoOpen} onClosePhoto={() => setTodayPhotoOpen(false)} photoFlow={leafPhotoFlow} demoResult={todayDemoResult} onClearDemo={() => setTodayDemoResult(null)} lastCheckin={diary[0] ? { createdAt: diary[0].createdAt, thumbnails: (diary[0].thumbnails || []).filter(src => /^data:image\/jpeg;base64,/.test(src)) } : undefined} /></div>}

      {farmerHome && <section hidden={farmerView !== "settings"} className="app-shell farmer-settings"><p className="section-kicker">{language === "bn" ? "সেটিংস" : "SETTINGS"}</p><h1>{language === "bn" ? "জেলা ও চাষের সময়" : "District and planting time"}</h1><p>{language === "bn" ? "এগুলো একবার ঠিক করলে আজকের কাজ ও আবহাওয়া সেই অনুযায়ী দেখাবে।" : "Set these once to tailor today's work and weather."}</p><div><label>{language === "bn" ? "জেলা" : "District"}<select value={district} onChange={event => setDistrict(event.target.value)}>{Object.entries(districtOptions).map(([id, name]) => <option key={id} value={id}>{language === "bn" ? name : id}</option>)}</select></label><label>{language === "bn" ? "লাগানোর সঠিক তারিখ (ঐচ্ছিক)" : "Exact planting date (optional)"}<input type="date" value={plantingDate} max={localToday()} onChange={event => { setPlantingDate(event.target.value); localStorage.setItem("alusathi-planting-date", event.target.value); }} /></label></div></section>}

      {(!farmerHome || farmerView === "photos") && <div className={farmerHome ? "" : "landing-reveal"}><Suspense fallback={<div id="scan" className="app-shell py-12" role="status">{language === "bn" ? "ছবি স্ক্যানার খুলছে…" : "Loading photo scanner…"}</div>}><TuberScan modelsAllowed={!farmerHome || tuberConsent} onEnableModels={() => setTuberConsent(true)} onLeafPhoto={farmerHome ? continueWithLeafPhoto : undefined} onDemo={farmerHome ? showDemoInToday : undefined} /></Suspense></div>}
      {(!farmerHome || farmerView === "photos") && leafPhotoFlow}
      <div hidden={farmerHome && farmerView !== "tools" && farmerView !== "today"} className={farmerHome ? "" : "landing-reveal"}><FarmerTools showReminders={!farmerHome} todayMode={farmerHome && farmerView === "today"} /></div>
      {dashboardAccess && (farmerHome || timeline.length > 0) && <section hidden={farmerHome && farmerView !== "diary"} id="diary" className={`diary-section scroll-mt-20 ${timeline.length ? "" : "diary-empty-section"}`}><div className="app-shell py-16 sm:py-24"><div className="section-heading light"><div><p className="section-kicker"><History size={16} />{language === "bn" ? "আমার খাতা" : "MY NOTEBOOK"}</p><h2>{language === "bn" ? "ছবি, কাজ ও জমির নোট" : "Photos, work and field notes"}</h2><p>{language === "bn" ? "ছবি, শেষ করা কাজ, খরচ ও হিসাব—তারিখ ধরে এক জায়গায়।" : "Photos, completed tasks, expenses and calculations in date order."}</p><p>{user ? (language === "bn" ? "আপনার ব্যক্তিগত অনলাইন খাতা" : "Your private account history") : (language === "bn" ? "এই ফোনের খাতা; অনলাইনে সেভ হয় না।" : "Saved on this device; no cloud sync.")}</p>{cloudMessage && <p role="status">{cloudMessage}</p>}<div className="notebook-tabs" role="tablist"><button role="tab" aria-selected={notebookTab === "work"} className={notebookTab === "work" ? "active" : ""} onClick={() => setNotebookTab("work")}>{language === "bn" ? "কাজ" : "Work"}</button><button role="tab" aria-selected={notebookTab === "expenses"} className={notebookTab === "expenses" ? "active" : ""} onClick={() => setNotebookTab("expenses")}>{language === "bn" ? "খরচ" : "Expenses"}</button></div></div>{diary.length > 0 && <button className="text-button" onClick={() => removeDiary()}><Trash2 size={16} />{language === "bn" ? "সব ছবি মুছুন" : "Delete photos"}</button>}</div>{timeline.length === 0 ? <div className="empty-diary"><span><History size={31} /></span><h3>{copy.emptyDiary}</h3><p>{copy.emptyDiaryBody}</p><button className="secondary-main" onClick={() => startScan("quick")}><Camera size={18} />{copy.quick}</button></div> : <div className="diary-grid timeline-grid">{timeline.filter(item => notebookTab === "work" ? item.type !== "ledger" : item.type === "ledger").map((item) => item.type === "scan" ? <DiaryCard key={`scan-${item.entry.id}`} entry={item.entry} language={language} copy={copy} onDelete={() => removeDiary(item.entry.id)} onRecheck={() => { setDistrict(item.entry.district); startScan("quick", item.entry.id); }} /> : item.type === "action" ? <FieldActionCard key={`action-${item.entry.id}`} entry={item.entry} language={language} /> : <LedgerCard key={`ledger-${item.entry.id}`} entry={item.entry} language={language} />)}</div>}</div></section>}

      <section id="help" hidden={farmerHome && farmerView !== "help"} className={`app-shell scroll-mt-20 py-16 sm:py-24 ${farmerHome ? "" : "landing-reveal"}`}>
        <div className="section-heading"><div><p className="section-kicker">{copy.helpKicker}</p><h2>{copy.helpTitle}</h2></div></div>
        <div className="care-slider" aria-roledescription="carousel" aria-label={copy.helpTitle}>
          <div className="care-slide" role="group" aria-label={`${tipIndex + 1} / ${copy.helpCards.length}`} aria-live="polite">
            <span className="care-number">0{tipIndex + 1}</span>
            <div><h3>{copy.helpCards[tipIndex][0]}</h3><p>{copy.helpCards[tipIndex][1]}</p></div>
          </div>
          <div className="care-controls">
            <button type="button" onClick={() => setTipIndex((tipIndex + 2) % 3)} aria-label={language === "bn" ? "আগের পরামর্শ" : "Previous tip"}><ArrowLeft size={20} /></button>
            <div>{[0, 1, 2].map(index => <button key={index} className={tipIndex === index ? "active" : ""} aria-label={copy.helpCards[index][0]} aria-current={tipIndex === index ? "step" : undefined} onClick={() => setTipIndex(index)} />)}</div>
            <button type="button" onClick={() => setTipIndex((tipIndex + 1) % 3)} aria-label={language === "bn" ? "পরের পরামর্শ" : "Next tip"}><ArrowRight size={20} /></button>
          </div>
        </div>
      </section>
    </main>

    <footer><div className="app-shell"><div className="footer-brand"><span className="brand-mark"><Leaf size={22} /></span><div><strong>আলুসাথী</strong><small>{copy.footer}</small></div></div><p><ShieldCheck size={15} />{copy.privacy}</p></div></footer>
    {!farmerHome && <nav className="bottom-nav" style={{ gridTemplateColumns: `repeat(${dashboardAccess ? 4 : 3}, minmax(0, 1fr))` }} aria-label="Mobile navigation"><a href="#scan"><Camera />{copy.navScan}</a><a href={marketHref}><Store />{language === "bn" ? "বাজার" : "Market"}</a>{dashboardAccess && <a href="#diary"><History />{copy.navField}</a>}<Link to="/life-cycle"><Sprout />{language === "bn" ? "আলুর জীবন" : "Potato life"}</Link></nav>}
  </div>;
}

function riskText(risk: Risk, copy: Copy) {
  return risk === "healthy" ? copy.fieldHealthy : risk === "watch" ? copy.fieldWatch : risk === "urgent" ? copy.fieldUrgent : copy.fieldUnknown;
}

function PhotoAccepted({ copy, offline }: { copy: Copy; offline: boolean }) {
  return <div className="result-empty photo-accepted animate-rise"><span><Check size={38} /></span><h3>{copy.photoSaved}</h3><p>{copy.photoSavedBody}</p>{offline && <small className="offline-result"><WifiOff size={15} />{copy.offlineResult}</small>}</div>;
}

function DiaryCard({ entry, language, copy, onDelete, onRecheck }: { entry: DiaryEntry; language: "bn" | "en"; copy: Copy; onDelete: () => void; onRecheck: () => void }) {
  const date = new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.createdAt));
  const photos = (entry.thumbnails || []).filter((src) => /^data:image\/jpeg;base64,/.test(src));
  return <article className="diary-card"><div className="timeline-dot" aria-hidden="true" /><div className="flex items-start justify-between gap-3"><span className={`diary-status ${entry.risk}`}>{entry.risk === "healthy" ? <Check /> : <AlertTriangle />}</span><button onClick={onDelete} aria-label={copy.delete}><Trash2 size={16} /></button></div><div className="trend-chip first"><History size={15} />{entry.followUpOf ? (language === "bn" ? "আগের ছবির ফলো-আপ" : "Follow-up photo") : (language === "bn" ? "পাতার নোট" : "Leaf note")}</div><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-white/45">{entry.mode === "field" ? copy.fieldLabel : copy.quickLabel}</p><h3>{entry.triage ? (language === "bn" ? "পাতার ছবি রাখা হয়েছে" : "Leaf photo recorded") : riskText(entry.risk, copy)}</h3><div className="mt-5 flex flex-wrap gap-2"><span><MapPin />{language === "bn" ? DISTRICT_NAMES[entry.district] || entry.district : entry.district}</span><span><Camera />{entry.scanCount} {copy.scans}</span>{entry.humidity && <span><CloudRain />{entry.humidity}%</span>}{entry.inferenceMode === "offline" && <span><WifiOff />Offline</span>}</div><details className="diary-details"><summary>{language === "bn" ? "ছবি ও নোট দেখুন" : "View photo and notes"}</summary>{photos.length > 0 && <div className="diary-thumbnails">{photos.map((src, index) => <img key={index} src={src} alt={language === "bn" ? "সংরক্ষিত পাতার ছবি" : "Saved leaf photo"} />)}</div>}{entry.symptoms?.length ? <ul>{entry.symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}</ul> : <p>{language === "bn" ? "এই পুরোনো নোটে লক্ষণের উত্তর রাখা হয়নি।" : "This older note has no saved symptom answers."}</p>}<small>{language === "bn" ? "এটি রোগ নির্ণয় নয়।" : "This is not a disease diagnosis."}</small></details><time>{date}</time><button className="recheck-button" onClick={onRecheck}><RefreshCw size={16} />{copy.checkAgain}</button></article>;
}

function FieldActionCard({ entry, language }: { entry: FieldAction; language: "bn" | "en" }) {
  const date = new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${entry.date}T12:00:00`));
  const isTask = entry.kind === "task";
  return <article className="diary-card diary-action-card"><div className="timeline-dot" aria-hidden="true" /><span className="diary-status healthy">{isTask ? <Check /> : <Eye />}</span><div className="trend-chip first">{isTask ? <Check size={15} /> : <Eye size={15} />}{isTask ? (language === "bn" ? "কাজ শেষ" : "Task completed") : (language === "bn" ? "জমির নোট" : "Field observation")}</div><h3>{entry.text}</h3><div className="mt-5 flex flex-wrap gap-2"><span><MapPin />{language === "bn" ? DISTRICT_NAMES[entry.district] || entry.district : entry.district}</span></div><time>{date}</time></article>;
}

function LedgerCard({ entry, language }: { entry: FarmLedgerEntry; language: "bn" | "en" }) {
  const bn = language === "bn";
  const date = new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${entry.date}T12:00:00`));
  const title = entry.type === "expense" ? ({ seed: bn ? "বীজের খরচ" : "Seed expense", manure: bn ? "সার / গোবরের খরচ" : "Manure expense", labour: bn ? "শ্রমের খরচ" : "Labour expense", irrigation: bn ? "সেচের খরচ" : "Irrigation expense", transport: bn ? "পরিবহনের খরচ" : "Transport expense", other: bn ? "অন্যান্য খরচ" : "Other expense" })[entry.category] : entry.title;
  const money = (value: number) => `৳${value.toLocaleString(bn ? "bn-BD" : "en-GB", { maximumFractionDigits: 2 })}`;
  const summary = entry.type === "expense" ? money(entry.amount) : entry.category === "sale-offer"
    ? `${bn ? "মোট বিক্রি" : "Gross"}: ${money(Number(entry.result.gross))} · ${bn ? "বিক্রির খরচ" : "Selling costs"}: ${money(Number(entry.result.sellingCosts))} · ${bn ? "হাতে" : "Take-home"}: ${money(Number(entry.result.takeHome))} · ${bn ? "আনুমানিক লাভ" : "Est. profit"}: ${money(Number(entry.result.estimatedProfit))}${entry.result.offer2TakeHome !== undefined ? ` · ${bn ? "প্রস্তাব ২ হাতে" : "Offer 2 take-home"}: ${money(Number(entry.result.offer2TakeHome))}` : ""}`
    : Object.entries(entry.result).map(([key, value]) => {
      const labels: Record<string, string> = bn
        ? { amount: "পরিমাণ", unit: "একক", amountPerTank: "প্রতি ট্যাংকে", amountPerLitre: "প্রতি লিটারে", totalProduct: "মোট", tanks: "ট্যাংক", lowKg: "কম", estimateKg: "মাঝামাঝি", highKg: "বেশি" }
        : { amount: "Amount", unit: "Unit", amountPerTank: "Per tank", amountPerLitre: "Per litre", totalProduct: "Total", tanks: "Tanks", lowKg: "Low", estimateKg: "Estimate", highKg: "High" };
      return `${labels[key] || key}: ${value}`;
    }).join(" · ");
  return <article className="diary-card ledger-diary-card"><div className="timeline-dot" aria-hidden="true" /><span className="diary-status healthy"><Calculator size={18} /></span><div className="trend-chip first">{entry.type === "expense" ? (bn ? "জমির খরচ" : "Field expense") : (bn ? "হিসাব" : "Calculation")}</div><h3>{title}</h3><p>{summary}</p>{entry.type === "expense" && entry.note && <small>{entry.note}</small>}<time>{date}</time></article>;
}
