/**
 * Weather summary for the HUD (PLAN 7.5). Pure. Turns the per-model series from adapters/weather.ts into
 * the numbers the panel shows: a simple mean across the models that cover the hour, and the spread between
 * them as a rough confidence cue (the weighted blend with local bias correction is PLAN 7.4).
 */
import { weatherAt, rainAccumMm, WEATHER_MODELS, type WeatherData, type WeatherNow } from './adapters/weather';
import { stormCategory, type Storm } from './adapters/storms';
import { REGION } from './region';
import { haversineM } from './geo';

export interface WeatherSummary {
  models: number;
  rainMmH: number;
  cloudPct: number;
  uv: number;
  tempC: number;
  gustKt: number;
  capeJkg: number;
  /** Largest minus smallest model rain rate, mm/h: how much the models disagree. */
  rainSpreadMmH: number;
  /** Rain over the 24 h from the valid time, mm (mean of the models that cover all of it). */
  rain24Mm: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const finite = (xs: number[]) => xs.filter(Number.isFinite);

export function summarise(d: WeatherData, ms: number): WeatherSummary | null {
  const now = weatherAt(d, ms);
  if (!now.length) return null;
  const rains = now.map((w) => w.rainMmH);
  const end = d.times[d.times.length - 1] + 3.6e6;
  const acc = WEATHER_MODELS.filter((m) => now.some((w) => w.model === m) && ms + 24 * 3.6e6 <= end)
    .map((m) => rainAccumMm(d, m, ms, ms + 24 * 3.6e6))
    .filter((x): x is number => x !== null);
  return {
    models: now.length,
    rainMmH: mean(rains),
    cloudPct: mean(finite(now.map((w) => w.cloudPct))),
    uv: mean(finite(now.map((w) => w.uv))),
    tempC: mean(finite(now.map((w) => w.tempC))),
    gustKt: mean(finite(now.map((w) => w.gustKt))),
    capeJkg: mean(finite(now.map((w) => w.capeJkg))),
    rainSpreadMmH: Math.max(...rains) - Math.min(...rains),
    rain24Mm: mean(acc),
  };
}

/** Heavy rain in the next 3 h: mean rate over the models. mm/h threshold is a flash-flood-ish 10. */
export const HEAVY_RAIN_MM_H = 10;
export function heavyRainSoon(d: WeatherData, ms: number): boolean {
  return [0, 1, 2].some((h) => (summarise(d, ms + h * 3.6e6)?.rainMmH ?? 0) >= HEAVY_RAIN_MM_H);
}

/**
 * Squall flag. A heuristic, not a forecast of a specific storm: convective energy (mean CAPE of the
 * models) high enough for deep thunderstorms, together with either strong gusts or heavy rain in the
 * same hour. CAPE >= 1000 J/kg is moderately unstable and >= 2500 very unstable (common usage);
 * the gust and rain gates (25 kt, 5 mm/h) keep it from firing on dry unstable air.
 */
export type Squall = 'none' | 'watch' | 'high';
export const CAPE_WATCH = 1000;
export const CAPE_HIGH = 2500;
export function squallLevel(s: Pick<WeatherSummary, 'capeJkg' | 'gustKt' | 'rainMmH'>): Squall {
  if (!(s.capeJkg >= CAPE_WATCH)) return 'none';
  const active = s.gustKt >= 25 || s.rainMmH >= 5;
  return s.capeJkg >= CAPE_HIGH && active ? 'high' : active ? 'watch' : 'none';
}

/** The worst squall level in the 6 hours from `ms`. */
export function squallSoon(d: WeatherData, ms: number): Squall {
  let worst: Squall = 'none';
  for (let h = 0; h < 6; h++) {
    const s = summarise(d, ms + h * 3.6e6);
    const l = s ? squallLevel(s) : 'none';
    if (l === 'high') return 'high';
    if (l === 'watch') worst = 'watch';
  }
  return worst;
}

export const STORM_ALERT_KM = 1500;

/** The nearest active storm to the region and its range in km, or null. */
export function nearestStorm(storms: readonly Storm[]): { storm: Storm; km: number; category: number } | null {
  let best: { storm: Storm; km: number; category: number } | null = null;
  for (const storm of storms) {
    const km = haversineM(REGION.center, storm.lngLat) / 1000;
    if (!best || km < best.km) best = { storm, km, category: stormCategory(storm.windKt) };
  }
  return best;
}

/** The weather the BITE score reads for one hour (fishing/bite.ts): mean rain and cloud over the models, and the squall flag. Empty when no model covers the hour. */
export function biteWeather(now: readonly WeatherNow[]): { rainMmH?: number; cloudPct?: number; squall?: Squall } {
  if (!now.length) return {};
  const rainMmH = mean(finite(now.map((w) => w.rainMmH)));
  const cloudPct = mean(finite(now.map((w) => w.cloudPct)));
  const s = { rainMmH, capeJkg: mean(finite(now.map((w) => w.capeJkg))), gustKt: mean(finite(now.map((w) => w.gustKt))) };
  return {
    rainMmH: Number.isFinite(rainMmH) ? rainMmH : undefined,
    cloudPct: Number.isFinite(cloudPct) ? cloudPct : undefined,
    squall: squallLevel(s),
  };
}
