/**
 * Metric registry for the WATCH tracker (PLAN 7.13). One entry per metric a user can track: how to
 * read it at a spot and hour from the data the app already holds, how to fold a day of hours into
 * one value, which direction is better, and the tone thresholds. Pure: the data arrives through
 * `MetricEnv`, so the whole thing is testable without a DOM. A new metric added here is selectable
 * in the tracker straight away.
 */
import { bite } from '../fishing/bite';
import { daySky, type DaySky } from '../physics/astro';
import { clarityLevel } from '../physics/clarity';
import { predict, type Harmonics } from '../physics/tide';
import type { WeatherNow } from '../adapters/weather';
import type { SeaState } from '../adapters/waves';

export type Tone = 'green' | 'amber' | 'red' | 'none';
export type MetricGroup = 'waves' | 'weather' | 'water' | 'fishing';

/** The data a metric can read. Each may return null where nothing covers the place or hour. */
export interface MetricEnv {
  windMs(lng: number, lat: number, ms: number): number | null;
  sea(lng: number, lat: number, ms: number): SeaState | null;
  /** Every weather model's reading for the hour containing `ms`. */
  weather(ms: number): WeatherNow[];
  /** Water visibility, m, off the spot at `ms` (the CLARITY forecast), or null before its data loads. */
  clarityM(lng: number, lat: number, ms: number): number | null;
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
const band = (low: number, high: number) => (v: number): Tone => (v < low ? 'green' : v < high ? 'amber' : 'red');

const SARG_LOW_KM2 = 0.01, SARG_HIGH_KM2 = 0.5; // keep in step with sargLevel in physics/drift.ts

export const METRICS: readonly Metric[] = [
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
  { id: 'gust', group: 'weather', unit: 'kn', decimals: 0, better: 'low', agg: 'max', at: (a) => meanOf(a.env.weather(a.ms).map((w) => w.gustKt).filter(finite)), tone: band(18, 28) },
  { id: 'rain', group: 'weather', unit: 'mm', decimals: 0, better: 'low', agg: 'sum', at: (a) => meanOf(a.env.weather(a.ms).map((w) => w.rainMmH).filter(finite)), tone: band(2, 15) },
  { id: 'air', group: 'weather', unit: '°C', decimals: 0, better: null, agg: 'mean', at: (a) => meanOf(a.env.weather(a.ms).map((w) => w.tempC).filter(finite)), tone: () => 'none' },
  { id: 'uv', group: 'weather', unit: '', decimals: 0, better: 'low', agg: 'max', at: (a) => meanOf(a.env.weather(a.ms).map((w) => w.uv).filter(finite)), tone: band(6, 9) },
  { id: 'tide', group: 'water', unit: 'm', decimals: 1, better: null, agg: 'max', at: (a) => predict(a.env.tide, a.ms), tone: () => 'none' },
  { id: 'clarity', group: 'water', unit: 'm', decimals: 0, better: 'high', agg: 'mean', hours: [12], at: (a) => a.env.clarityM(a.lng, a.lat, a.ms), tone: (v) => ({ GOOD: 'green', FAIR: 'amber', POOR: 'red' } as const)[clarityLevel(v)] },
  { id: 'sargassum', group: 'water', unit: 'km²', decimals: 2, better: 'low', agg: 'max', hours: [12], at: (a) => a.env.sargassumKm2(a.spot, a.ms), tone: (v) => (v < SARG_LOW_KM2 ? 'green' : v < SARG_HIGH_KM2 ? 'amber' : 'red') },
  {
    id: 'bite', group: 'fishing', unit: '/100', decimals: 0, better: 'high', agg: 'max',
    at: (a) =>
      bite({
        tMs: a.ms, lat: a.lat, lng: a.lng, tide: a.env.tide, tzOffsetH: a.env.tzOffsetH, sky: a.sky,
        windMs: a.env.windMs(a.lng, a.lat, a.ms), hsM: a.env.sea(a.lng, a.lat, a.ms)?.hs ?? null,
      }).bite,
    tone: (v) => (v >= 60 ? 'green' : v >= 40 ? 'amber' : 'red'),
  },
];

export const METRIC_BY_ID: ReadonlyMap<string, Metric> = new Map(METRICS.map((m) => [m.id, m]));
export const MAX_TRACKED = 8;

/** Starter sets for the picker, matching the activity presets. */
export const METRIC_PRESETS: Readonly<Record<'surf' | 'fish' | 'dive' | 'boat', readonly string[]>> = {
  surf: ['swell', 'period', 'wind', 'tide', 'sargassum'],
  fish: ['bite', 'wind', 'swell', 'rain', 'clarity'],
  dive: ['swell', 'wind', 'rain', 'clarity', 'sargassum'],
  boat: ['swell', 'wind', 'gust', 'rain'],
};

export { daySky };
