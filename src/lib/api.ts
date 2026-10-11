export interface WeatherData {
  temperature: number;
  rainfall: number;
  humidity: number;
  weather: string;
  soil_moisture?: number;
  alerts?: WeatherAlert[];
  observed_at?: string;
  cached?: boolean;
  blight_days?: { date: string; minimum: number; humid_hours: number; hours: number }[];
  forecastRainMm?: number;
  forecast?: { date: string; minimum: number; maximum: number; rainMm: number; windKmh: number }[];
}

export type WeatherAlertType = "heavy_rain" | "strong_wind" | "extreme_heat" | "cold" | "thunderstorm";

export interface WeatherAlert {
  type: WeatherAlertType;
  date: string;
  value: number;
}

export interface PredictionResponse {
  id?: number;
  crop_type?: string;
  soil_ph?: number;
  location?: string;
  farmer_name?: string;
  weather_data: WeatherData;
  fertilizer_level: "Low" | "Medium" | "High";
  irrigation_needed: boolean;
  recommendations_text: string;
  confidence?: number;
  npk_values?: {
    nitrogen: string;
    phosphorus: string;
    potassium: string;
  };
  farmer_input_id?: number;
  message?: string;
  timestamp?: string;
}

export async function getWeather(location: string): Promise<WeatherData> {
  const cacheKey = `alusathi-weather-${location.toLowerCase()}`;
  let cached: string | null = null;
  try { cached = localStorage.getItem(cacheKey); } catch { /* Weather works without storage. */ }
  try {
    const signal = AbortSignal.timeout(8_000);
    const { districtPlaces } = await import(/* @vite-ignore */ new URL("/marketplace/districts.mjs", window.location.origin).href) as { districtPlaces: Record<string, { lat: number; lon: number }> };
    let coordinates = districtPlaces[location];
    if (!coordinates) {
      const geocoding = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json&countryCode=BD`, { signal });
      const place = (await geocoding.json()).results?.[0];
      if (!geocoding.ok || !place) throw new Error("Location not found");
      coordinates = { lat: place.latitude, lon: place.longitude };
    }

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&hourly=temperature_2m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,weather_code&forecast_days=3&timezone=Asia%2FDhaka`, { signal });
    if (!response.ok) throw new Error(`Weather API Error: ${response.status}`);

    const { current, daily, hourly } = await response.json();
    if (!current || !daily || !Array.isArray(daily.time) || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.relative_humidity_2m)) {
      throw new Error("Weather data is incomplete");
    }
    const rainfall = current.precipitation ?? 0;
    const alerts: WeatherAlert[] = [];
    daily.time.forEach((date: string, index: number) => {
      const maximum = daily.temperature_2m_max?.[index] ?? NaN;
      const minimum = daily.temperature_2m_min?.[index] ?? NaN;
      const rain = daily.precipitation_sum?.[index] ?? NaN;
      const gust = daily.wind_gusts_10m_max?.[index] ?? NaN;
      const code = daily.weather_code?.[index] ?? NaN;
      if (code >= 95) alerts.push({ type: "thunderstorm", date, value: code });
      if (rain >= 50) alerts.push({ type: "heavy_rain", date, value: rain });
      if (gust >= 50) alerts.push({ type: "strong_wind", date, value: gust });
      if (maximum >= 35) alerts.push({ type: "extreme_heat", date, value: maximum });
      if (minimum <= 8) alerts.push({ type: "cold", date, value: minimum });
    });
    const weather: WeatherData = {
      temperature: current.temperature_2m,
      rainfall,
      forecastRainMm: Array.isArray(daily.precipitation_sum) && daily.precipitation_sum.slice(0, 3).every(Number.isFinite) ? daily.precipitation_sum.slice(0, 3).reduce((sum: number, value: number) => sum + value, 0) : undefined,
      forecast: daily.time.slice(0, 3).flatMap((date: string, index: number) => {
        const values = [daily.temperature_2m_min?.[index], daily.temperature_2m_max?.[index], daily.precipitation_sum?.[index], daily.wind_gusts_10m_max?.[index]];
        return values.every(Number.isFinite) ? [{ date, minimum: values[0], maximum: values[1], rainMm: values[2], windKmh: values[3] }] : [];
      }),
      humidity: current.relative_humidity_2m,
      weather: current.weather_code < 3 ? "Clear" : current.weather_code < 50 ? "Cloudy" : current.weather_code < 70 ? "Rain" : "Storms",
      alerts,
      observed_at: new Date().toISOString(),
      blight_days: daily.time.map((date: string) => {
        const indices: number[] = (hourly?.time || []).flatMap((time: string, index: number) => time.startsWith(date) && Number.isFinite(hourly.temperature_2m?.[index]) && Number.isFinite(hourly.relative_humidity_2m?.[index]) ? [index] : []);
        return { date, minimum: indices.length ? Math.min(...indices.map(i => hourly.temperature_2m[i])) : 0, humid_hours: indices.filter(i => hourly.relative_humidity_2m[i] >= 90).length, hours: indices.length };
      }),
    };
    try { localStorage.setItem(cacheKey, JSON.stringify(weather)); } catch { /* Keep fresh data if storage is full. */ }
    return weather;
  } catch (error) {
    if (cached) {
      try {
        const saved = JSON.parse(cached) as WeatherData;
        if (Number.isFinite(saved.temperature) && Number.isFinite(saved.humidity) && Array.isArray(saved.alerts)) return { ...saved, cached: true };
      } catch { /* Ignore damaged local cache. */ }
    }
    throw error;
  }
}
