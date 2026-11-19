import { useEffect, useState } from "react";
import { ChevronDown, Cloud, CloudLightning, CloudRain, Droplets, MapPin, Sun, WifiOff } from "lucide-react";
import { getWeather, type WeatherData } from "@/lib/api";

const divisions = [
  ["Barishal", "বরিশাল"], ["Chattogram", "চট্টগ্রাম"], ["Dhaka", "ঢাকা"], ["Khulna", "খুলনা"],
  ["Mymensingh", "ময়মনসিংহ"], ["Rajshahi", "রাজশাহী"], ["Rangpur", "রংপুর"], ["Sylhet", "সিলেট"],
];

export default function TodayWeather({ weather: fieldWeather, rainNote, loading: fieldLoading, district, districtLabel, bn, online }: {
  weather: WeatherData | null; rainNote?: string; loading: boolean; district: string; districtLabel: string; bn: boolean; online: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<{ location: string; weather: WeatherData | null } | null>(null);
  const browsing = selected !== "" && selected !== district;
  useEffect(() => {
    if (!browsing) return;
    let active = true;
    getWeather(selected).then(weather => {
      if (active) setResult({ location: selected, weather });
    }).catch(() => {
      if (active) setResult({ location: selected, weather: null });
    });
    return () => { active = false; };
  }, [selected, browsing, online]);
  const loading = browsing ? result?.location !== selected : fieldLoading;
  const weather = browsing ? result?.location === selected ? result.weather : null : fieldWeather;
  const t = (b: string, e: string) => bn ? b : e;
  const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(bn ? "bn-BD" : "en-GB", {maximumFractionDigits:1}) : "—";
  const condition = !weather ? "unknown" : weather.weather === "Storms" ? "storm" : weather.rainfall > 0 || weather.weather === "Rain" ? "rain" : weather.weather === "Cloudy" ? "cloud" : weather.weather === "Clear" ? "sun" : "unknown";
  const Icon = condition === "storm" ? CloudLightning : condition === "rain" ? CloudRain : condition === "cloud" || condition === "unknown" ? Cloud : Sun;
  const label = ({sun:t("এখন আকাশ পরিষ্কার","Clear skies now"),cloud:t("এখন আকাশ মেঘলা","Cloudy now"),rain:t("এখন বৃষ্টি","Raining now"),storm:t("ঝড়ো আবহাওয়া","Stormy"),unknown:t("অবস্থার তথ্য নেই","Weather details not available")})[condition];
  return <aside className="today-utility-rail today-weather-card" data-weather={condition} aria-label={t("আবহাওয়া","Weather")} aria-busy={loading}>
    <header><h2>{t("আবহাওয়া","Weather")}</h2><label className="weather-location-picker">
      <MapPin size={16} aria-hidden="true"/>
      <select aria-label={t("আবহাওয়ার বিভাগ বাছুন", "Choose weather division")} value={browsing ? selected : district} onChange={event => {
        if (event.target.value === (browsing ? selected : district)) return;
        setResult(null); setSelected(event.target.value === district ? "" : event.target.value);
      }}>
        {!divisions.some(([name]) => name === district) && <option value={district}>{districtLabel} · {t("আমার জমি", "My field")}</option>}
        {divisions.map(([name, bangla]) => <option key={name} value={name}>{bn ? bangla : name}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true"/>
    </label></header>
    {browsing && <p className="weather-location-note">{t("বিভাগীয় শহরের আবহাওয়া", "Weather in the divisional city")}</p>}
    <div className="weather-current" aria-live="polite"><div><strong>{weather ? `${number(Math.round(weather.temperature))}°` : "—"}</strong><p>{weather ? label : loading ? t("আবহাওয়া আসছে…","Loading weather…") : t("আবহাওয়া পাওয়া যায়নি","Weather not available")}</p></div><div className="weather-art" aria-hidden="true"><Icon size={76} strokeWidth={1.5}/>{(condition === "rain" || condition === "storm") && <div className="weather-rain"><i/><i/><i/></div>}</div></div>
    {!browsing && rainNote && <p className="today-weather-reason" role="status">{rainNote}</p>}
    {weather && <><dl className="weather-readings"><div><dt><Droplets size={15}/>{t("আর্দ্রতা","Humidity")}</dt><dd>{number(Math.round(weather.humidity))}%</dd></div><div><dt><CloudRain size={15}/>{t("এখন বৃষ্টি","Current rain")}</dt><dd>{number(weather.rainfall)} mm</dd></div></dl>
    </>}
    {(!online || weather?.cached) && <p className="offline-status" role="status"><WifiOff size={16}/>{weather ? t("আগের সেভ করা আবহাওয়া দেখছেন।","Showing saved weather.") : t("ইন্টারনেট নেই। আবহাওয়া পাওয়া যায়নি।","Offline. Weather not available.")}</p>}
  </aside>;
}
