/**
 * Weather summary for the HUD (PLAN 7.5). Pure. Turns the per-model series from adapters/weather.ts into
 * the numbers the panel shows. Air temperature and gusts are the ensemble blend (PLAN 7.4, src/blend.ts):
 * weighted by how well each model matched the Limón airport over the last few days, temperature also
 * corrected by each model's local bias. Rain, cloud, UV and CAPE are the plain mean, since the airport
 * does not measure them. Before the models are scored, every weight is equal.
 */
import { weatherAt, rainAccumMm, WEATHER_MODELS, type WeatherData, type WeatherModel, type WeatherNow } from './adapters/weather';
import { leadModel, type SkillVar, type WeatherSkill } from './adapters/weather-skill';
import { blend, confidence, type Confidence } from './blend';
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
  /** Expected error of the blended air temperature (°C) and mean wind (kt): model disagreement plus their recent error at the airport. NaN when unknown. */
  tempSigmaC: number;
  windSigmaKt: number;
  /** The worse of the temperature and wind confidences. */
  confidence: Confidence;
  /** The model the blend leans on most (by wind weight) and its share, or null while the weights are equal. */
  lead: { model: WeatherModel; share: number } | null;
}

/** Confidence bands: HIGH while the blend's expected error is within `good`, MED within `fair` (°C, kt). */
export const CONF_TEMP_C = { good: 1, fair: 2 } as const;
export const CONF_WIND_KT = { good: 3, fair: 6 } as const;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const finite = (xs: number[]) => xs.filter(Number.isFinite);
const EQUAL: Record<WeatherModel, number> = Object.fromEntries(WEATHER_MODELS.map((m) => [m, 1])) as Record<WeatherModel, number>;
const weightsOf = (sk: WeatherSkill | undefined, v: SkillVar) => sk?.weights[v] ?? EQUAL;
const byModel = (now: readonly WeatherNow[], f: (w: WeatherNow) => number) => Object.fromEntries(now.map((w) => [w.model, f(w)]));
const worse = (a: Confidence, b: Confidence): Confidence => (a === 'LOW' || b === 'LOW' ? 'LOW' : a === 'MED' || b === 'MED' ? 'MED' : 'HIGH');

/** The present model with the largest wind weight and its share among the present models; null while the weights are equal. */
function leadOf(sk: WeatherSkill | undefined, now: readonly WeatherNow[]): WeatherSummary['lead'] {
  if (!leadModel(sk, 'wind') || now.length < 2) return null;
  const w = sk!.weights.wind;
  const top = now.reduce((a, x) => (w[x.model] > w[a.model] ? x : a), now[0]).model;
  return { model: top, share: w[top] / now.reduce((a, x) => a + w[x.model], 0) };
}

export function summarise(d: WeatherData, ms: number): WeatherSummary | null {
  const now = weatherAt(d, ms);
  if (!now.length) return null;
  const sk = d.skill;
  const rains = now.map((w) => w.rainMmH);
  const end = d.times[d.times.length - 1] + 3.6e6;
  const acc = WEATHER_MODELS.filter((m) => now.some((w) => w.model === m) && ms + 24 * 3.6e6 <= end)
    .map((m) => rainAccumMm(d, m, ms, ms + 24 * 3.6e6))
    .filter((x): x is number => x !== null);
  const temp = blend(byModel(now, (w) => w.tempC), weightsOf(sk, 'temp'), sk?.scores.temp);
  const wind = blend(byModel(now, (w) => w.windKt), weightsOf(sk, 'wind'), sk?.scores.wind);
  const gust = blend(byModel(now, (w) => w.gustKt), weightsOf(sk, 'wind'));
  const tempSigmaC = temp?.sigma ?? NaN, windSigmaKt = wind?.sigma ?? NaN;
  // A single model has no spread to judge it by: LOW unless the airport has scored it.
  const conf = (b: typeof temp, band: { good: number; fair: number }) => (!b || (b.models < 2 && !sk) ? 'LOW' : confidence(b.sigma, band.good, band.fair));
  return {
    models: now.length,
    rainMmH: mean(rains),
    cloudPct: mean(finite(now.map((w) => w.cloudPct))),
    uv: mean(finite(now.map((w) => w.uv))),
    tempC: temp?.value ?? NaN,
    gustKt: gust?.value ?? NaN,
    capeJkg: mean(finite(now.map((w) => w.capeJkg))),
    rainSpreadMmH: Math.max(...rains) - Math.min(...rains),
    rain24Mm: mean(acc),
    tempSigmaC,
    windSigmaKt,
    confidence: wind ? worse(conf(temp, CONF_TEMP_C), conf(wind, CONF_WIND_KT)) : conf(temp, CONF_TEMP_C),
    lead: leadOf(sk, now),
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

/**
 * Pressure tendency, hPa per 3 h ending at `ms`: mean over the models that have both ends. Null when none do.
 * Falling pressure ahead of a front is the classic angler's feeding cue (folklore-grade evidence).
 */
export const pressureTrend = (d: WeatherData, ms: number): number | null => pressureChange(weatherAt(d, ms), weatherAt(d, ms - 3 * 3.6e6));

/** Mean pressure change between two hours' model readings, hPa, over the models in both; null if none. */
export function pressureChange(now: readonly WeatherNow[], before: readonly WeatherNow[]): number | null {
  const diffs = now.flatMap((w) => {
    const b = before.find((x) => x.model === w.model);
    return b && Number.isFinite(w.pressureHpa) && Number.isFinite(b.pressureHpa) ? [w.pressureHpa - b.pressureHpa] : [];
  });
  return diffs.length ? mean(diffs) : null;
}

/** Blended air temperature (°C, bias-corrected) and gusts (kt) for one hour's model readings; NaN when no model has them. Equal weights without `skill`. */
export const blendedTempC = (now: readonly WeatherNow[], skill?: WeatherSkill) => blend(byModel(now, (w) => w.tempC), weightsOf(skill, 'temp'), skill?.scores.temp)?.value ?? NaN;
export const blendedGustKt = (now: readonly WeatherNow[], skill?: WeatherSkill) => blend(byModel(now, (w) => w.gustKt), weightsOf(skill, 'wind'))?.value ?? NaN;

/**
 * The weather the BITE score reads for one hour (fishing/bite.ts): mean rain and cloud over the models, and
 * the squall flag. Gusts are blended with the airport-scored wind weights when given (WeatherData.skill), as
 * in the HUD. Empty when no model covers the hour.
 */
export function biteWeather(now: readonly WeatherNow[], skill?: WeatherSkill): { rainMmH?: number; cloudPct?: number; squall?: Squall } {
  if (!now.length) return {};
  const rainMmH = mean(finite(now.map((w) => w.rainMmH)));
  const cloudPct = mean(finite(now.map((w) => w.cloudPct)));
  const s = { rainMmH, capeJkg: mean(finite(now.map((w) => w.capeJkg))), gustKt: blendedGustKt(now, skill) };
  return {
    rainMmH: Number.isFinite(rainMmH) ? rainMmH : undefined,
    cloudPct: Number.isFinite(cloudPct) ? cloudPct : undefined,
    squall: squallLevel(s),
  };
}
