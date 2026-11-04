/**
 * BEST TIME TODAY per activity. Reuses the WATCH forecast engine (forecast.ts): the activity's own
 * metrics are read hour by hour at one spot, and the best two-hour window left today is the one
 * whose hours score best (green +1, red -1, plus where the value sits in the day's range). Pure.
 */
import { nearest } from '../geo';
import { BEST_LEN_H, BEST_TO_H, buildForecast, bestTime, hourScores, type Spot } from './forecast';
import { localDayStart } from '../physics/astro';
import { breakFor } from './surf-estimate';
import { METRIC_BY_ID, type MetricEnv } from './registry';

export type Activity = 'surf' | 'fish' | 'dive' | 'boat';

/**
 * What counts toward "best" for each activity. Only metrics with a better end vote. SURF is judged
 * on the break score (`surfq`: swell trains, period, direction, wind, tide, storms, rain, sargassum) at a spot that has
 * a surf break; elsewhere on wind (glassy, offshore) and rain, since swell size alone has no better end.
 */
export const BEST_METRICS: Readonly<Record<Activity, readonly string[]>> = {
  surf: ['surfq', 'wind', 'rain'],
  fish: ['bite', 'wind', 'rain'],
  dive: ['swell', 'wind', 'rain'],
  boat: ['comfort', 'wind', 'gust', 'squall', 'rain'],
};

/** The metrics that vote for `activity` at `spot`: at a surf break the break score already contains wind and rain. */
export function votersFor(activity: Activity, spot: Spot): readonly string[] {
  const ids = BEST_METRICS[activity];
  return activity === 'surf' && breakFor(spot.name, spot.lngLat) ? ids.filter((id) => id === 'surfq') : ids.filter((id) => id !== 'surfq');
}

export interface BestToday {
  spot: string;
  /** Window start and end, epoch ms; startMs may be before `nowMs` while the window is under way. */
  startMs: number;
  endMs: number;
  /** False when even the best window scores more bad than good (mostly red hours): nothing worth offering. */
  good: boolean;
}

/**
 * Last hour a window may run to, local. Diving and snorkelling need daylight in the water, and
 * sunset on this coast is 17:10 to 17:50 all year, so their windows end by 17:00; the rest run to 19:00.
 */
export const DIVE_TO_H = 17;
const toHFor = (activity: Activity) => (activity === 'dive' ? DIVE_TO_H : BEST_TO_H);
/** Days ahead the button can look: the model forecast band (FORECAST, 7 days). */
export const BEST_MAX_DAY = 6;

/** The spot nearest `at` (lng, lat). */
export const spotNear = (at: [number, number], spots: readonly Spot[]): Spot | null => nearest(at, spots)?.point ?? null;

/** True once the last window of the local day (BEST_TO_H) has started: an empty BEST TODAY then means none left, not missing data. */
export function todayOver(tzOffsetH: number, nowMs: number, activity?: Activity): boolean {
  const toH = activity ? toHFor(activity) : BEST_TO_H;
  return nowMs >= localDayStart(nowMs, tzOffsetH) + (toH - BEST_LEN_H + 1) * 3.6e6;
}

/**
 * Best window on local day `day` (0 = today, 1 = tomorrow …) for `activity` at `spot`, never one
 * already over; null when that day has none left, it is past the forecast band, or there is no data.
 */
export function bestOnDay(env: MetricEnv, activity: Activity, spot: Spot, nowMs: number, day: number): BestToday | null {
  if (day < 0 || day > BEST_MAX_DAY) return null;
  const ids = votersFor(activity, spot);
  const f = buildForecast(env, ids, [spot], nowMs, day + 1);
  const metrics = ids.map((id) => METRIC_BY_ID.get(id)!);
  if (f.rows.length !== metrics.length) return null;
  const w = bestTime(f.rows, metrics, day, f.startMs, nowMs, toHFor(activity));
  return w ? { spot: spot.name, startMs: w.startMs, endMs: w.endMs, good: w.score >= 0 } : null;
}

/** Best window left today for `activity` at `spot`, or null when the day is over or there is no data. */
export const bestToday = (env: MetricEnv, activity: Activity, spot: Spot, nowMs: number): BestToday | null => bestOnDay(env, activity, spot, nowMs, 0);

/**
 * The same hour score as `bestToday`, for a whole local day: 24 rows of `{ t, score }` with score
 * scaled to 0..1 (null where nothing votes). For ribbons and strips; one scorer, so they agree with the button.
 */
export function hourlyScores(env: MetricEnv, activity: Activity, spot: Spot, dayStartMs: number): { t: number; score: number | null }[] | null {
  const ids = votersFor(activity, spot);
  const f = buildForecast(env, ids, [spot], dayStartMs, 1);
  const metrics = ids.map((id) => METRIC_BY_ID.get(id)!);
  if (f.rows.length !== metrics.length) return null;
  const s = hourScores(f.rows, metrics, 0);
  return s ? s.map((v, h) => ({ t: f.startMs + h * 3.6e6, score: v === null ? null : Math.min(1, Math.max(0, (v + 1) / 2.5)) })) : null;
}
