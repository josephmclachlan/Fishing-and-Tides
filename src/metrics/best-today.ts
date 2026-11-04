/**
 * BEST TIME TODAY per activity. Reuses the WATCH forecast engine (forecast.ts): the activity's own
 * metrics are read hour by hour at one spot, and the best two-hour window left today is the one
 * whose hours score best (green +1, red -1, plus where the value sits in the day's range). Pure.
 */
import { nearest } from '../geo';
import { buildForecast, bestTime, hourScores, type Spot } from './forecast';
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
}

/** The spot nearest `at` (lng, lat). */
export const spotNear = (at: [number, number], spots: readonly Spot[]): Spot | null => nearest(at, spots)?.point ?? null;

/** Best window left today for `activity` at `spot`, or null when the day is over or there is no data. */
export function bestToday(env: MetricEnv, activity: Activity, spot: Spot, nowMs: number): BestToday | null {
  const ids = votersFor(activity, spot);
  const f = buildForecast(env, ids, [spot], nowMs, 1);
  const metrics = ids.map((id) => METRIC_BY_ID.get(id)!);
  if (f.rows.length !== metrics.length) return null;
  const w = bestTime(f.rows, metrics, 0, f.startMs, nowMs);
  return w ? { spot: spot.name, ...w } : null;
}

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
