/**
 * Weather summary for the HUD (PLAN 7.5). Pure. Turns the per-model series from adapters/weather.ts into
 * the numbers the panel shows, at the spot nearest the place asked (PLAN 7.57). Air temperature, dew point
 * and gusts are the ensemble blend (PLAN 7.4, src/blend.ts): weighted by how well each model matched the
 * Limón airport over the last few days, temperature and dew point also corrected by each model's local bias.
 * Humidity and real feel come from those blends (physics/heat.ts). Rain, cloud and CAPE are the plain mean,
 * since the airport does not measure them; chance of rain pools the four centres' ensembles; UV is CAMS
 * (uvAt). Before the models are scored, every weight is equal.
 */
import { hourIndex, pointNear, weatherAt, rainAccumMm, ENSEMBLE_MEMBERS, WEATHER_MODELS, type WeatherData, type WeatherModel, type WeatherNow } from './adapters/weather';
import { apparentTempC, relHumidityPct } from './physics/heat';
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
  /** Chance of at least 0.1 mm in the hour, %, the four ensembles pooled (PLAN 7.57). NaN when none covers it. */
  rainChancePct: number;
  /** Dew point, °C, blended and bias-corrected like the air temperature. */
  dewC: number;
  /** Relative humidity, %, from the blended temperature and dew point. */
  humidityPct: number;
  /** Real feel in the shade, °C: Steadman's apparent temperature from the blends and the mean wind. */
  feelsC: number;
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

/** WHO UV index bands: low 0-2, moderate 3-5, high 6-7, very high 8-10, extreme 11+. */
export type UvBand = 'low' | 'moderate' | 'high' | 'vhigh' | 'extreme';
export const uvBand = (uv: number): UvBand => {
  const u = Math.round(uv);
  return u >= 11 ? 'extreme' : u >= 8 ? 'vhigh' : u >= 6 ? 'high' : u >= 3 ? 'moderate' : 'low';
};

/**
 * The day's peak UV index: the highest hourly model mean over the local day holding `ms`, and the hour it
 * falls in. Null where the forecast does not cover that day's middle hours.
 */
export function uvPeakDay(d: WeatherData, ms: number, tzOffsetH: number = REGION.tzOffsetH): { uv: number; atMs: number } | null {
  const H = 3.6e6;
  const day0 = Math.floor((ms + tzOffsetH * H) / 864e5) * 864e5 - tzOffsetH * H;
  let best: { uv: number; atMs: number } | null = null;
  // UV is zero at night: 06:00-18:00 local holds every peak.
  for (let h = 6; h <= 18; h++) {
    const v = uvAt(d, day0 + h * H);
    if (Number.isFinite(v) && (!best || v > best.uv)) best = { uv: v, atMs: day0 + h * H };
  }
  return best;
}

/**
 * UV index for the hour containing `ms` (PLAN 7.57). CAMS where it reaches (about 5 days). Past it, GFS's UV
 * scaled by CAMS over GFS clear-sky UV across the hours both cover (GFS runs about a quarter low here);
 * unscaled GFS with no CAMS at all. NaN when nothing covers the hour.
 */
export function uvAt(d: WeatherData, ms: number): number {
  const u = d.uv;
  const i = u ? hourIndex(u.times, ms) : -1;
  if (u && i >= 0 && Number.isFinite(u.uv[i])) return u.uv[i];
  const gfs = pointNear(d)?.models.gfs_seamless;
  const j = hourIndex(d.times, ms);
  if (!gfs || j < 0 || !Number.isFinite(gfs.uv_index[j])) return NaN;
  return gfs.uv_index[j] * uvScale(d);
}

const scaleCache = new WeakMap<WeatherData, number>();
/** CAMS ÷ GFS clear-sky UV summed over the daylight hours both cover, clamped to 0.8..1.6; 1 without CAMS. */
export function uvScale(d: WeatherData): number {
  const hit = scaleCache.get(d);
  if (hit !== undefined) return hit;
  const u = d.uv, gfs = pointNear(d)?.models.gfs_seamless;
  let a = 0, b = 0;
  if (u && gfs) {
    u.times.forEach((t, i) => {
      const j = hourIndex(d.times, t);
      const g = j >= 0 ? gfs.uv_index_clear_sky[j] : NaN;
      if (Number.isFinite(u.clear[i]) && Number.isFinite(g) && g > 1 && u.clear[i] > 1) (a += u.clear[i]), (b += g);
    });
  }
  const k = b > 0 ? Math.min(1.6, Math.max(0.8, a / b)) : 1;
  scaleCache.set(d, k);
  return k;
}

/** Pooled ensemble chance of rain, %: each model's chance weighted by its ensemble's members. NaN when none has one. */
export function rainChancePct(now: readonly WeatherNow[]): number {
  let num = 0, den = 0;
  for (const w of now) {
    const p = w.rainChancePct;
    if (p === undefined || !Number.isFinite(p)) continue;
    num += p * ENSEMBLE_MEMBERS[w.model];
    den += ENSEMBLE_MEMBERS[w.model];
  }
  return den ? num / den : NaN;
}

/** Blended dew point, °C, bias-corrected against the airport; NaN when no model has one. Equal weights without `skill`. */
export const blendedDewC = (now: readonly WeatherNow[], skill?: WeatherSkill) =>
  blend(Object.fromEntries(now.flatMap((w) => (w.dewC !== undefined && Number.isFinite(w.dewC) ? [[w.model, w.dewC]] : []))), weightsOf(skill, 'dew'), skill?.scores.dew)?.value ?? NaN;

/** Relative humidity, %, from the blended temperature and dew point. */
export const humidityPct = (now: readonly WeatherNow[], skill?: WeatherSkill) => relHumidityPct(blendedTempC(now, skill), blendedDewC(now, skill));

/**
 * Real feel in the shade, °C (physics/heat.ts apparentTempC) from the blended temperature and dew point.
 * `windMs` is the wind at the place (the wind map); without it the models' mean wind is used.
 */
export function feelsLikeC(now: readonly WeatherNow[], skill?: WeatherSkill, windMs?: number | null): number {
  const kt = mean(finite(now.map((w) => w.windKt)));
  const ws = windMs !== undefined && windMs !== null && Number.isFinite(windMs) ? windMs : kt / KT_PER_MS;
  return apparentTempC(blendedTempC(now, skill), blendedDewC(now, skill), ws);
}
const KT_PER_MS = 1.94384;
/** Real-feel bands, °C: the US NWS heat-index "extreme caution" (32) and "danger" (39) levels. */
export const FEELS_CAUTION_C = 32;
export const FEELS_DANGER_C = 39;

export function summarise(d: WeatherData, ms: number, at?: readonly [number, number]): WeatherSummary | null {
  const now = weatherAt(d, ms, at);
  if (!now.length) return null;
  const sk = d.skill;
  const rains = now.map((w) => w.rainMmH);
  const end = d.times[d.times.length - 1] + 3.6e6;
  const acc = WEATHER_MODELS.filter((m) => now.some((w) => w.model === m) && ms + 24 * 3.6e6 <= end)
    .map((m) => rainAccumMm(d, m, ms, ms + 24 * 3.6e6, at))
    .filter((x): x is number => x !== null);
  const temp = blend(byModel(now, (w) => w.tempC), weightsOf(sk, 'temp'), sk?.scores.temp);
  const wind = blend(byModel(now, (w) => w.windKt), weightsOf(sk, 'wind'), sk?.scores.wind);
  const gust = blend(byModel(now, (w) => w.gustKt), weightsOf(sk, 'wind'));
  const tempSigmaC = temp?.sigma ?? NaN, windSigmaKt = wind?.sigma ?? NaN;
  const dewC = blendedDewC(now, sk);
  // A single model has no spread to judge it by: LOW unless the airport has scored it.
  const conf = (b: typeof temp, band: { good: number; fair: number }) => (!b || (b.models < 2 && !sk) ? 'LOW' : confidence(b.sigma, band.good, band.fair));
  return {
    models: now.length,
    rainMmH: mean(rains),
    cloudPct: mean(finite(now.map((w) => w.cloudPct))),
    uv: uvAt(d, ms),
    tempC: temp?.value ?? NaN,
    gustKt: gust?.value ?? NaN,
    capeJkg: mean(finite(now.map((w) => w.capeJkg))),
    rainSpreadMmH: Math.max(...rains) - Math.min(...rains),
    rain24Mm: mean(acc),
    rainChancePct: rainChancePct(now),
    dewC,
    humidityPct: relHumidityPct(temp?.value ?? NaN, dewC),
    feelsC: apparentTempC(temp?.value ?? NaN, dewC, (wind?.value ?? NaN) / KT_PER_MS),
    tempSigmaC,
    windSigmaKt,
    confidence: wind ? worse(conf(temp, CONF_TEMP_C), conf(wind, CONF_WIND_KT)) : conf(temp, CONF_TEMP_C),
    lead: leadOf(sk, now),
  };
}

/** Heavy rain in the next 3 h: mean rate over the models. mm/h threshold is a flash-flood-ish 10. */
export const HEAVY_RAIN_MM_H = 10;
export function heavyRainSoon(d: WeatherData, ms: number, at?: readonly [number, number]): boolean {
  return [0, 1, 2].some((h) => (summarise(d, ms + h * 3.6e6, at)?.rainMmH ?? 0) >= HEAVY_RAIN_MM_H);
}

/**
 * Rain over the `hours` before `ms` at the spot nearest `at`, mm: the mean of the models that cover that window
 * (PLAN 7.63, for the creek mouths' rip rings). The weather call starts a day back (`past_days=1`), so the window
 * is covered at any hour from now on; null before the data starts or when no model has the place.
 */
export function rainPastMm(d: WeatherData, ms: number, hours: number, at?: readonly [number, number]): number | null {
  const from = ms - hours * 3.6e6;
  if (!d.times.length || from < d.times[0] || ms > d.times[d.times.length - 1] + 3.6e6) return null;
  const xs = WEATHER_MODELS.map((m) => rainAccumMm(d, m, from, ms, at)).filter((x): x is number => x !== null);
  return xs.length ? xs.reduce((p, x) => p + x, 0) / xs.length : null;
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
export function squallSoon(d: WeatherData, ms: number, at?: readonly [number, number]): Squall {
  let worst: Squall = 'none';
  for (let h = 0; h < 6; h++) {
    const s = summarise(d, ms + h * 3.6e6, at);
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
export const pressureTrend = (d: WeatherData, ms: number, at?: readonly [number, number]): number | null => pressureChange(weatherAt(d, ms, at), weatherAt(d, ms - 3 * 3.6e6, at));

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
