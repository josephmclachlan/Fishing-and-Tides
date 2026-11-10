/**
 * Metric registry for the WATCH tracker (PLAN 7.13). One entry per metric a user can track: how to
 * read it at a spot and hour from the data the app already holds, how to fold a day of hours into
 * one value, which direction is better, and the tone thresholds. Pure: the data arrives through
 * `MetricEnv`, so the whole thing is testable without a DOM. A new metric added here is selectable
 * in the tracker straight away.
 */
import { bite, type BiteTerms } from '../fishing/bite';
import { daySky, type DaySky } from '../physics/astro';
import { clarityLevel } from '../physics/clarity';
import { predict, type Harmonics } from '../physics/tide';
import type { WeatherNow } from '../adapters/weather';
import { biteWeather, blendedGustKt, blendedTempC, feelsLikeC, humidityPct, pressureChange, rainChancePct } from '../weather';
import type { WeatherSkill } from '../adapters/weather-skill';
import type { SeaState } from '../adapters/waves';
import { seaState, withCurrent } from '../physics/sea-state';
import { feedPartitions } from '../sea-partitions';
import { squallLevel } from '../weather';
import { breakFor, surfScoreAt, type SurfHour } from './surf-estimate';

export type Tone = 'green' | 'amber' | 'red' | 'none';
export type MetricGroup = 'waves' | 'weather' | 'water' | 'fishing';

/** The data a metric can read. Each may return null where nothing covers the place or hour. */
export interface MetricEnv {
  windMs(lng: number, lat: number, ms: number): number | null;
  /** Direction the wind blows FROM, degrees true (optional: the WATCH wind-direction metric reads null without it). */
  windDirDeg?(lng: number, lat: number, ms: number): number | null;
  /** Surface current speed, m/s, from the currents feed (optional). */
  currentMs?(lng: number, lat: number, ms: number): number | null;
  /** Surface current [east, north] m/s; with it SEA COMFORT includes wind against current (optional). */
  currentVec?(lng: number, lat: number, ms: number): readonly [number, number] | null;
  sea(lng: number, lat: number, ms: number): SeaState | null;
  /** Every weather model's reading for the hour containing `ms`, at the spot nearest [lng, lat] (PLAN 7.57; the region's middle when not given). */
  weather(ms: number, lng?: number, lat?: number): WeatherNow[];
  /** UV index at the place and hour (CAMS, adapters/uv.ts; PLAN 7.57). Optional: without it the models' own UV (GFS) is read. */
  uv?(lng: number, lat: number, ms: number): number | null;
  /** The models' recent skill at the Limón airport (PLAN 7.4), once scored: gusts and air temperature are blended with it. */
  weatherSkill?(): WeatherSkill | undefined;
  /** Water visibility, m, off the spot at `ms` (the CLARITY forecast), or null before its data loads. */
  clarityM(lng: number, lat: number, ms: number): number | null;
  /** Satellite sea surface temperature, °C, off the spot at `ms`, or null. Optional so older environments keep working. */
  sstC?(lng: number, lat: number, ms: number): number | null;
  /** Sargassum expected to reach the named beach on the day containing `ms`, km² (the SARGASSUM outlook), or null. */
  sargassumKm2(spot: string, ms: number): number | null;
  tide: Harmonics;
  tzOffsetH: number;
}

export interface MetricArgs {
  env: MetricEnv;
  spot: string;
  lng: number;
  lat: number;
  ms: number;
  /** The local day's sun and moon times for this place, memoised by the caller. */
  sky: DaySky;
}

export interface Metric {
  id: string;
  group: MetricGroup;
  unit: string;
  decimals: number;
  /** Which end of the range is better, for ranking spots; null when neither is (period, tide). */
  better: 'high' | 'low' | null;
  /** How the hours of a day fold into one value. `sum` uses all 24 hours, the others 06:00 to 18:00 local. */
  agg: 'mean' | 'max' | 'sum';
  /** Local hours to sample when the default (06 to 18, or all 24 for `sum`) is too costly or meaningless: clarity is a midday value, sargassum a daily one. */
  hours?: readonly number[];
  at(a: MetricArgs): number | null;
  tone(v: number): Tone;
}

const KT = 1.94384;
const finite = (x: number | undefined | null): x is number => typeof x === 'number' && Number.isFinite(x);
const meanOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const orNull = (x: number) => (Number.isFinite(x) ? x : null);
const band = (low: number, high: number) => (v: number): Tone => (v < low ? 'green' : v < high ? 'amber' : 'red');

const SARG_LOW_KM2 = 0.01, SARG_HIGH_KM2 = 0.5; // keep in step with sargLevel in physics/drift.ts

const SQUALL_LEVEL = { none: 0, watch: 1, high: 2 } as const;
/** The weather models' readings for this metric's place and hour. */
const wxOf = (a: Omit<MetricArgs, 'sky'>) => a.env.weather(a.ms, a.lng, a.lat);
const weatherSummary = (now: WeatherNow[]) => ({
  capeJkg: meanOf(now.map((w) => w.capeJkg).filter(finite)) ?? NaN,
  gustKt: meanOf(now.map((w) => w.gustKt).filter(finite)) ?? NaN,
  rainMmH: meanOf(now.map((w) => w.rainMmH).filter(finite)) ?? NaN,
});

/** The inputs of the surf score at a spot and hour (its own break, or the nearest within 25 km), or null without a break or sea. */
export function surfHourFor(a: Omit<MetricArgs, 'sky'>): SurfHour | null {
  const brk = breakFor(a.spot, [a.lng, a.lat]);
  const sea = brk ? a.env.sea(a.lng, a.lat, a.ms) : null;
  if (!brk || !sea) return null;
  const wx = wxOf(a);
  const gust = blendedGustKt(wx, a.env.weatherSkill?.());
  const rain = meanOf(wx.map((w) => w.rainMmH).filter(finite));
  return {
    brk, sea, tide: a.env.tide, ms: a.ms,
    windMs: a.env.windMs(a.lng, a.lat, a.ms), windFromDeg: a.env.windDirDeg?.(a.lng, a.lat, a.ms) ?? null,
    gustMs: Number.isFinite(gust) ? gust / KT : null,
    rainMmH: rain,
    squall: wx.length ? squallLevel(weatherSummary(wx)) : undefined,
    sargKm2: a.env.sargassumKm2(a.spot, a.ms),
  };
}

/** BITE at a spot and hour with its terms and reasons (the BITE metric is its `.bite`). */
export const biteAt = (a: MetricArgs): BiteTerms =>
  bite({
    tMs: a.ms, lat: a.lat, lng: a.lng, tide: a.env.tide, tzOffsetH: a.env.tzOffsetH, sky: a.sky,
    windMs: a.env.windMs(a.lng, a.lat, a.ms), hsM: a.env.sea(a.lng, a.lat, a.ms)?.hs ?? null,
    ...biteWeather(wxOf(a), a.env.weatherSkill?.()),
    pressureTrend: pressureChange(wxOf(a), a.env.weather(a.ms - 3 * 3.6e6, a.lng, a.lat)),
  });

export const METRICS: readonly Metric[] = [
  // Sea comfort for a boat (PLAN 6.6): wind sea + swells, 0 worst to 100 flat. Null where the forecast has no wave split.
  { id: 'comfort', group: 'waves', unit: '/100', decimals: 0, better: 'high', agg: 'mean', at: (a) => { const p = feedPartitions(a.env.sea(a.lng, a.lat, a.ms)); if (!p) return null; const c = a.env.currentVec?.(a.lng, a.lat, a.ms); return seaState(c ? withCurrent(p, { u: c[0], v: c[1] }) : p).score; }, tone: (v) => (v >= 75 ? 'green' : v >= 50 ? 'amber' : 'red') },
  // Squall level of the hour: 0 none, 1 watch, 2 likely (CAPE with gusts or heavy rain, weather.ts squallLevel).
  { id: 'squall', group: 'weather', unit: '0-2', decimals: 0, better: 'low', agg: 'max', at: (a) => { const now = wxOf(a); return now.length ? SQUALL_LEVEL[squallLevel(weatherSummary(now))] : null; }, tone: (v) => (v >= 2 ? 'red' : v >= 1 ? 'amber' : 'green') },
  { id: 'wdir', group: 'weather', unit: '°', decimals: 0, better: null, agg: 'mean', at: (a) => a.env.windDirDeg?.(a.lng, a.lat, a.ms) ?? null, tone: () => 'none' },
  { id: 'current', group: 'water', unit: 'kn', decimals: 1, better: 'low', agg: 'max', at: (a) => { const c = a.env.currentMs?.(a.lng, a.lat, a.ms); return c === null || c === undefined ? null : c * KT; }, tone: band(1, 2) },
  { id: 'swell', group: 'waves', unit: 'm', decimals: 1, better: 'low', agg: 'mean', at: (a) => a.env.sea(a.lng, a.lat, a.ms)?.hs ?? null, tone: band(1.5, 2.5) },
  {
    id: 'period', group: 'waves', unit: 's', decimals: 0, better: null, agg: 'mean',
    at: (a) => {
      const s = a.env.sea(a.lng, a.lat, a.ms);
      return s ? (finite(s.swellT) && s.swellT > 0 ? s.swellT : finite(s.tm) && s.tm > 0 ? s.tm : null) : null;
    },
    tone: () => 'none',
  },
  { id: 'wind', group: 'weather', unit: 'kn', decimals: 0, better: 'low', agg: 'mean', at: (a) => { const w = a.env.windMs(a.lng, a.lat, a.ms); return w === null ? null : w * KT; }, tone: band(12, 20) },
  { id: 'gust', group: 'weather', unit: 'kn', decimals: 0, better: 'low', agg: 'max', at: (a) => orNull(blendedGustKt(wxOf(a), a.env.weatherSkill?.())), tone: band(18, 28) },
  { id: 'rain', group: 'weather', unit: 'mm', decimals: 0, better: 'low', agg: 'sum', at: (a) => meanOf(wxOf(a).map((w) => w.rainMmH).filter(finite)), tone: band(2, 15) },
  // Chance of at least 0.1 mm in the hour, the four centres' ensembles pooled (PLAN 7.57); a day reads its likeliest hour.
  { id: 'rainpct', group: 'weather', unit: '%', decimals: 0, better: 'low', agg: 'max', at: (a) => orNull(rainChancePct(wxOf(a))), tone: band(30, 60) },
  { id: 'air', group: 'weather', unit: '°C', decimals: 0, better: null, agg: 'mean', at: (a) => orNull(blendedTempC(wxOf(a), a.env.weatherSkill?.())), tone: () => 'none' },
  // Real feel in the shade (Steadman apparent temperature) from the blended temperature, dew point and the wind at the spot; the day's hottest hour.
  // Tones: 32 °C is the US NWS "extreme caution" heat index, 39 °C its "danger".
  {
    id: 'feels', group: 'weather', unit: '°C', decimals: 0, better: 'low', agg: 'max',
    at: (a) => { const w = a.env.windMs(a.lng, a.lat, a.ms); return orNull(feelsLikeC(wxOf(a), a.env.weatherSkill?.(), w)); },
    tone: band(32, 39),
  },
  { id: 'humidity', group: 'weather', unit: '%', decimals: 0, better: null, agg: 'mean', at: (a) => orNull(humidityPct(wxOf(a), a.env.weatherSkill?.())), tone: () => 'none' },
  { id: 'cloud', group: 'weather', unit: '%', decimals: 0, better: null, agg: 'mean', at: (a) => meanOf(wxOf(a).map((w) => w.cloudPct).filter(finite)), tone: () => 'none' },
  { id: 'uv', group: 'weather', unit: '', decimals: 0, better: 'low', agg: 'max', at: (a) => (a.env.uv ? a.env.uv(a.lng, a.lat, a.ms) : meanOf(wxOf(a).map((w) => w.uv).filter(finite))), tone: band(6, 9) },
  { id: 'tide', group: 'water', unit: 'm', decimals: 1, better: null, agg: 'max', at: (a) => predict(a.env.tide, a.ms), tone: () => 'none' },
  { id: 'clarity', group: 'water', unit: 'm', decimals: 0, better: 'high', agg: 'mean', hours: [12], at: (a) => a.env.clarityM(a.lng, a.lat, a.ms), tone: (v) => ({ GOOD: 'green', FAIR: 'amber', POOR: 'red' } as const)[clarityLevel(v)] },
  { id: 'sst', group: 'water', unit: '°C', decimals: 1, better: 'high', agg: 'mean', hours: [12], at: (a) => a.env.sstC?.(a.lng, a.lat, a.ms) ?? null, tone: (v) => (v >= 26 ? 'green' : v >= 22 ? 'amber' : 'red') },
  { id: 'sargassum', group: 'water', unit: 'km²', decimals: 2, better: 'low', agg: 'max', hours: [12], at: (a) => a.env.sargassumKm2(a.spot, a.ms), tone: (v) => (v < SARG_LOW_KM2 ? 'green' : v < SARG_HIGH_KM2 ? 'amber' : 'red') },
  // Break score 0..10 (PLAN 7.27): swell trains, period, direction vs the break, wind and gusts, tide, storms, rain and sargassum.
  // Only for spots with a surf break (their own, or one within 25 km); null elsewhere, so those spots fall back to wind and rain.
  {
    id: 'surfq', group: 'waves', unit: '/10', decimals: 1, better: 'high', agg: 'max',
    at: (a) => {
      const h = surfHourFor(a);
      return h ? surfScoreAt(h) : null;
    },
    tone: (v) => (v >= 5.5 ? 'green' : v >= 3 ? 'amber' : 'red'),
  },
  {
    id: 'bite', group: 'fishing', unit: '/100', decimals: 0, better: 'high', agg: 'max',
    at: (a) => biteAt(a).bite,
    tone: (v) => (v >= 60 ? 'green' : v >= 40 ? 'amber' : 'red'),
  },
];

export const METRIC_BY_ID: ReadonlyMap<string, Metric> = new Map(METRICS.map((m) => [m.id, m]));
export const MAX_TRACKED = 8;

/**
 * Starter cards for each WATCH activity. They only choose what is shown: the BEST DAY line is
 * scored by the activity itself (plan.ts), whatever is ticked. SNORKEL leads with visibility and the
 * things that move a swimmer (current, chop, sargassum, sun); DIVE adds period, which drives surge at depth.
 * Every activity tracks the UV index, the day's peak in the daily view (Joseph, 2026-11-10).
 */
export const METRIC_PRESETS: Readonly<Record<'surf' | 'fish' | 'snorkel' | 'dive' | 'boat', readonly string[]>> = {
  surf: ['surfq', 'swell', 'period', 'wind', 'tide', 'sargassum', 'sst', 'uv'],
  fish: ['bite', 'wind', 'swell', 'rain', 'clarity', 'uv'],
  snorkel: ['clarity', 'swell', 'wind', 'current', 'rain', 'sargassum', 'uv'],
  dive: ['clarity', 'swell', 'period', 'current', 'wind', 'rain', 'sst', 'uv'],
  boat: ['comfort', 'wind', 'wdir', 'gust', 'squall', 'current', 'rain', 'uv'],
};

export { daySky };
