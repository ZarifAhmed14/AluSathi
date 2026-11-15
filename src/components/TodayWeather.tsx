import { Cloud, CloudLightning, CloudRain, Droplets, MapPin, Sun, WifiOff } from "lucide-react";
import type { WeatherData } from "@/lib/api";

export default function TodayWeather({ weather, loading, district, bn, fresh, online }: {
  weather: WeatherData | null; loading: boolean; district: string; bn: boolean; fresh: boolean; online: boolean;
}) {
  const t = (b: string, e: string) => bn ? b : e;
  const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(bn ? "bn-BD" : "en-GB", {maximumFractionDigits:1}) : "—";
  const condition = !weather ? "unknown" : weather.weather === "Storms" ? "storm" : weather.rainfall > 0 || weather.weather === "Rain" ? "rain" : weather.weather === "Cloudy" ? "cloud" : weather.weather === "Clear" ? "sun" : "unknown";
  const Icon = condition === "storm" ? CloudLightning : condition === "rain" ? CloudRain : condition === "cloud" || condition === "unknown" ? Cloud : Sun;
  const label = ({sun:t("পরিষ্কার আকাশ","Clear skies"),cloud:t("মেঘলা আকাশ","Cloudy"),rain:t("বৃষ্টি","Rain"),storm:t("ঝড়ো আবহাওয়া","Stormy"),unknown:t("অবস্থার তথ্য নেই","Weather details not available")})[condition];
  const observed = weather?.observed_at && Number.isFinite(Date.parse(weather.observed_at)) ? new Date(weather.observed_at) : null;
  const forecast = weather?.forecast?.filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isFinite(Date.parse(`${day.date}T12:00:00+06:00`))).slice(0,3) || [];
  return <aside className="today-utility-rail today-weather-card" data-weather={condition} aria-label={t("আবহাওয়া","Weather")} aria-busy={loading}>
    <header><h2>{t("আবহাওয়া","Weather")}</h2><span><MapPin size={15}/>{district}</span></header>
    <div className="weather-current" aria-live="polite"><div><strong>{weather ? `${number(Math.round(weather.temperature))}°` : "—"}</strong><p>{weather ? label : loading ? t("আবহাওয়া আসছে…","Loading weather…") : t("আবহাওয়া পাওয়া যায়নি","Weather not available")}</p></div><div className="weather-art" aria-hidden="true"><Icon size={76} strokeWidth={1.5}/>{(condition === "rain" || condition === "storm") && <div className="weather-rain"><i/><i/><i/></div>}</div></div>
    {weather && <><dl className="weather-readings"><div><dt><Droplets size={15}/>{t("আর্দ্রতা","Humidity")}</dt><dd>{number(Math.round(weather.humidity))}%</dd></div><div><dt><CloudRain size={15}/>{t("এখন বৃষ্টি","Current rain")}</dt><dd>{number(weather.rainfall)} mm</dd></div></dl>
      {forecast.length > 0 && <div className="weather-forecast" aria-label={t("তিন দিনের পূর্বাভাস","Three-day forecast")}>{forecast.map(day=><div key={day.date}><span>{new Intl.DateTimeFormat(bn?"bn-BD":"en-GB",{weekday:"short",timeZone:"Asia/Dhaka"}).format(new Date(`${day.date}T12:00:00+06:00`))}</span>{day.rainMm>0 ? <CloudRain size={20} aria-label={t("বৃষ্টির পূর্বাভাস","Rain forecast")}/> : <Cloud size={20} aria-label={t("পূর্বাভাস","Forecast")}/>}<strong>{number(Math.round(day.maximum))}° <small>{number(Math.round(day.minimum))}°</small></strong><small>{number(day.rainMm)} mm</small></div>)}</div>}
    </>}
    <footer>{loading ? t("হালনাগাদ হচ্ছে…","Updating…") : observed ? `${fresh ? t("হালনাগাদ:","Updated:") : t("আগের তথ্য:","Earlier data:")} ${new Intl.DateTimeFormat(bn?"bn-BD":"en-GB",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit",timeZone:"Asia/Dhaka"}).format(observed)}` : t("হালনাগাদের সময় পাওয়া যায়নি","Update time not available")}</footer>
    {!online && <p className="offline-status" role="status"><WifiOff size={16}/>{t("ইন্টারনেট নেই—আগের তথ্য দেখছেন।","Offline—showing saved information.")}</p>}
  </aside>;
}
