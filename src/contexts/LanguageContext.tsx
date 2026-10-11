import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  showLanguageModal: boolean;
  setShowLanguageModal: (show: boolean) => void;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Hero
    "hero.badge": "AI-Powered Agricultural Intelligence",
    "hero.title": "Smart Farming for",
    "hero.country": "Bangladesh",
    "hero.subtitle": "Get precise fertilizer and irrigation recommendations powered by machine learning. Optimize your crop yield while protecting soil health.",
    "hero.fertilizer": "Fertilizer Advice",
    "hero.irrigation": "Irrigation Guidance",
    "hero.weather": "Weather-Aware",
    
    // Form
    "form.title": "Enter Your Farm Information",
    "form.step1": "Which Crop?",
    "form.selectCrop": "Select Crop",
    "form.step2": "Soil pH",
    "form.phAcidic": "Acidic",
    "form.phGood": "Good",
    "form.phAlkaline": "Alkaline",
    "form.phTip": "Tip: Select a crop to see its optimal pH range",
    "form.phMatch": "pH is suitable for this crop!",
    "form.phMismatch": "pH may not be ideal for this crop",
    "form.selectVariety": "Select Variety",
    "form.chooseVariety": "Choose variety",
    "form.optimal": "Optimal",
    "form.step3": "Your Location",
    "form.selectDistrict": "Select District",
    "form.searchDistrict": "Search district...",
    "form.noDistrictFound": "No district found",
    "form.locationHint": "Select your district for weather data",
    "form.submit": "Get Advice",
    "form.analyzing": "Analyzing...",
    "form.selectFirst": "Please select a crop first",
    
    // Crop Categories
    "crop.rice": "Rice",
    "crop.wheat": "Wheat",
    "crop.jute": "Jute",
    "crop.potato": "Potato",
    "crop.banana": "Banana",
    
    // Rice Varieties
    "variety.rice_miniket": "Miniket",
    "variety.rice_nazirshail": "Nazirshail",
    "variety.rice_paijam": "Paijam",
    
    // Wheat Varieties
    "variety.wheat_sonalika": "Sonalika",
    "variety.wheat_kanchan": "Kanchan",
    "variety.wheat_balaka": "Balaka",
    "variety.wheat_ananda": "Ananda",
    "variety.wheat_akbar": "Akbar",
    "variety.wheat_barkat": "Barkat",
    "variety.wheat_aghrani": "Aghrani",
    
    // Jute Varieties
    "variety.jute_white": "White Jute",
    "variety.jute_tossa": "Tossa Jute",
    "variety.jute_mesta": "Mesta Jute",
    
    // Potato Varieties
    "variety.potato_diamant": "BARI Alu-7 (Diamant)",
    "variety.potato_cardinal": "BARI Alu-8 (Cardinal)",
    "variety.potato_granola": "BARI Alu-13 (Granola)",
    
    // Banana Varieties
    "variety.banana_sagor": "Sagor",
    "variety.banana_shabri": "Shabri",
    "variety.banana_champa": "Champa",
    
    // Results
    "result.weather": "Weather",
    "result.temperature": "Temperature",
    "result.rainfall": "Rainfall",
    "result.humidity": "Humidity",
    "result.fertilizer": "Fertilizer",
    "result.low": "Low",
    "result.medium": "Medium",
    "result.high": "High",
    "result.irrigation": "Irrigation",
    "result.waterNeeded": "WATER NEEDED",
    "result.waterYour": "Water your crops",
    "result.noWater": "NO WATER NEEDED",
    "result.enoughMoisture": "Soil has enough moisture",
    "result.npk": "NPK Amount:",
    "result.fertilizerMinimal": "Minimal fertilizer needed - soil is healthy!",
    "result.fertilizerModerate": "Moderate fertilizer needed for good yield",
    "result.fertilizerNeeded": "High fertilizer needed - soil nutrients are low",
    "result.advice": "AI Advice for",
    "result.defaultAdvice": "See fertilizer and irrigation advice above.",
    "result.goodHarvest": "Good harvest!",
    "result.ready": "Your recommendations are ready!",
    "result.generatingAdvice": "Generating personalized advice...",
    "result.soilMoisture": "Soil Moisture",
    
    // Auth
    "auth.loginTitle": "Login to your account",
    "auth.signupTitle": "Create your account",
    "auth.farmerName": "Farmer Name",
    "auth.farmerNamePlaceholder": "Enter your name",
    "auth.email": "Email",
    "auth.emailPlaceholder": "Enter email",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "Enter password",
    "auth.login": "Login",
    "auth.signup": "Sign Up",
    "auth.noAccount": "Don't have an account? Sign up",
    "auth.hasAccount": "Already have an account? Login",
    "auth.loginSuccess": "Welcome back!",
    "auth.signupSuccess": "Account created!",
    "auth.invalidCredentials": "Invalid email or password",
    "auth.alreadyRegistered": "Email already registered",
    "auth.nameRequired": "Please enter your name",
    "auth.logout": "Logout",
    
    // History
    "history.title": "Recommendation History",
    "history.empty": "No recommendations yet",
    "history.getFirst": "Get Your First Recommendation",
    "history.deleted": "Recommendation deleted",
    "history.viewHistory": "View History",
    "history.saved": "Recommendation saved!",
    
    // Language modal
    "lang.choose": "Choose Your Language",
    "lang.english": "English",
    "lang.bangla": "বাংলা (Bangla)",
    "lang.continue": "Continue",
    
    // Footer
    "footer.powered": "Powered by AI for Bangladesh farmers",
    
    // Toast
    "toast.success": "Recommendations generated!",
    "toast.error": "Something went wrong!",
    "toast.errorDesc": "Could not connect to server. Please try again.",
  },
  bn: {
    // Hero
    "hero.badge": "AI চালিত কৃষি বুদ্ধিমত্তা",
    "hero.title": "স্মার্ট কৃষি",
    "hero.country": "বাংলাদেশ",
    "hero.subtitle": "মেশিন লার্নিং দ্বারা সঠিক সার ও সেচের পরামর্শ পান। মাটির স্বাস্থ্য রক্ষা করে ফসলের ফলন বাড়ান।",
    "hero.fertilizer": "সারের পরামর্শ",
    "hero.irrigation": "সেচের দিকনির্দেশনা",
    "hero.weather": "আবহাওয়া সচেতন",
    
    // Form
    "form.title": "আপনার তথ্য দিন",
    "form.step1": "কোন ফসল?",
    "form.selectCrop": "ফসল বাছাই করুন",
    "form.step2": "মাটির pH",
    "form.phAcidic": "অম্লীয়",
    "form.phGood": "ভালো",
    "form.phAlkaline": "ক্ষারীয়",
    "form.phTip": "টিপস: সঠিক pH পরিসীমা দেখতে ফসল বাছাই করুন",
    "form.phMatch": "এই ফসলের জন্য pH উপযুক্ত!",
    "form.phMismatch": "এই ফসলের জন্য pH আদর্শ নাও হতে পারে",
    "form.selectVariety": "জাত বাছাই করুন",
    "form.chooseVariety": "জাত বেছে নিন",
    "form.optimal": "আদর্শ",
    "form.step3": "আপনার এলাকা",
    "form.selectDistrict": "জেলা নির্বাচন করুন",
    "form.searchDistrict": "জেলা খুঁজুন...",
    "form.noDistrictFound": "জেলা পাওয়া যায়নি",
    "form.locationHint": "আবহাওয়া জানতে জেলা বাছাই করুন",
    "form.submit": "পরামর্শ নিন",
    "form.analyzing": "বিশ্লেষণ করা হচ্ছে...",
    "form.selectFirst": "প্রথমে ফসল বাছাই করুন",
    
    // Crop Categories
    "crop.rice": "ধান",
    "crop.wheat": "গম",
    "crop.jute": "পাট",
    "crop.potato": "আলু",
    "crop.banana": "কলা",
    
    // Rice Varieties
    "variety.rice_miniket": "মিনিকেট",
    "variety.rice_nazirshail": "নাজিরশাইল",
    "variety.rice_paijam": "পাইজাম",
    
    // Wheat Varieties
    "variety.wheat_sonalika": "সোনালিকা",
    "variety.wheat_kanchan": "কাঞ্চন",
    "variety.wheat_balaka": "বলাকা",
    "variety.wheat_ananda": "আনন্দ",
    "variety.wheat_akbar": "আকবর",
    "variety.wheat_barkat": "বরকত",
    "variety.wheat_aghrani": "অগ্রাণী",
    
    // Jute Varieties
    "variety.jute_white": "সাদা পাট",
    "variety.jute_tossa": "তোষা পাট",
    "variety.jute_mesta": "মেস্তা পাট",
    
    // Potato Varieties
    "variety.potato_diamant": "বারি আলু-৭ (ডায়মন্ড)",
    "variety.potato_cardinal": "বারি আলু-৮ (কার্ডিনাল)",
    "variety.potato_granola": "বারি আলু-১৩ (গ্রানোলা)",
    
    // Banana Varieties
    "variety.banana_sagor": "সাগর",
    "variety.banana_shabri": "সবরি",
    "variety.banana_champa": "চম্পা",
    
    // Results
    "result.weather": "আবহাওয়া",
    "result.temperature": "তাপমাত্রা",
    "result.rainfall": "বৃষ্টিপাত",
    "result.humidity": "আর্দ্রতা",
    "result.fertilizer": "সার",
    "result.low": "কম",
    "result.medium": "মাঝারি",
    "result.high": "বেশি",
    "result.irrigation": "সেচ",
    "result.waterNeeded": "সেচ দিন!",
    "result.waterYour": "আপনার ফসলে পানি দিন",
    "result.noWater": "সেচ লাগবে না",
    "result.enoughMoisture": "মাটিতে যথেষ্ট আর্দ্রতা আছে",
    "result.npk": "NPK পরিমাণ:",
    "result.fertilizerMinimal": "সামান্য সার লাগবে - মাটি স্বাস্থ্যকর!",
    "result.fertilizerModerate": "ভালো ফলনের জন্য মাঝারি সার দরকার",
    "result.fertilizerNeeded": "বেশি সার দরকার - মাটিতে পুষ্টি কম",
    "result.advice": "AI পরামর্শ",
    "result.defaultAdvice": "আপনার ফসলের জন্য সার ও সেচের পরামর্শ উপরে দেখুন।",
    "result.goodHarvest": "ভালো ফসল হোক!",
    "result.ready": "আপনার পরামর্শ তৈরি!",
    "result.generatingAdvice": "ব্যক্তিগত পরামর্শ তৈরি হচ্ছে...",
    "result.soilMoisture": "মাটির আর্দ্রতা",
    
    // Auth
    "auth.loginTitle": "আপনার অ্যাকাউন্টে লগইন করুন",
    "auth.signupTitle": "নতুন অ্যাকাউন্ট তৈরি করুন",
    "auth.farmerName": "কৃষকের নাম",
    "auth.farmerNamePlaceholder": "আপনার নাম লিখুন",
    "auth.email": "ইমেইল",
    "auth.emailPlaceholder": "ইমেইল লিখুন",
    "auth.password": "পাসওয়ার্ড",
    "auth.passwordPlaceholder": "পাসওয়ার্ড লিখুন",
    "auth.login": "লগইন",
    "auth.signup": "সাইন আপ",
    "auth.noAccount": "অ্যাকাউন্ট নেই? সাইন আপ করুন",
    "auth.hasAccount": "অ্যাকাউন্ট আছে? লগইন করুন",
    "auth.loginSuccess": "স্বাগতম!",
    "auth.signupSuccess": "অ্যাকাউন্ট তৈরি হয়েছে!",
    "auth.invalidCredentials": "ভুল ইমেইল বা পাসওয়ার্ড",
    "auth.alreadyRegistered": "ইমেইল আগে থেকেই নিবন্ধিত",
    "auth.nameRequired": "আপনার নাম লিখুন",
    "auth.logout": "লগআউট",
    
    // History
    "history.title": "পরামর্শের ইতিহাস",
    "history.empty": "এখনো কোনো পরামর্শ নেই",
    "history.getFirst": "প্রথম পরামর্শ নিন",
    "history.deleted": "পরামর্শ মুছে ফেলা হয়েছে",
    "history.viewHistory": "ইতিহাস দেখুন",
    "history.saved": "পরামর্শ সংরক্ষিত!",
    
    // Language modal
    "lang.choose": "ভাষা বাছাই করুন",
    "lang.english": "English",
    "lang.bangla": "বাংলা",
    "lang.continue": "এগিয়ে যান",
    
    // Footer
    "footer.powered": "বাংলাদেশের কৃষকদের জন্য AI চালিত",
    
    // Toast
    "toast.success": "পরামর্শ তৈরি হয়েছে!",
    "toast.error": "সমস্যা হয়েছে!",
    "toast.errorDesc": "সার্ভারে সংযোগ করা যায়নি। আবার চেষ্টা করুন।",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("bn");
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("alusathi-lang") || localStorage.getItem("krishimitra-lang");
    if (savedLang === "en" || savedLang === "bn") {
      setLanguageState(savedLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("alusathi-lang", lang);
    localStorage.removeItem("krishimitra-lang");
    setShowLanguageModal(false);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, showLanguageModal, setShowLanguageModal }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
