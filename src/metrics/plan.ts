/**
 * BEST DAY FOR one activity over the WATCH forecast (the 5-day popup). Pure: no DOM, no timers.
 *
 * Each activity is judged on its own score, whatever metric cards are ticked:
 *   SURF     the break score (SURF SCORE, 0..10: swell trains, period, direction, wind, tide, storms,
 *            rain, sargassum), at the spots that are surf breaks
 *   FISH     BITE (0..100) with wind and rain, at every spot
 *   SNORKEL  the outing score (0..100) at 2 m: surge, visibility, chop, current, entry surf, daylight
 *   DIVE     the same at 6 m. Both only at the catalog snorkel spots (data/snorkel-spots.ts)
 *   BOAT     SEA COMFORT (0..100) with wind, gusts, squalls and rain, at every spot
 *   SWIM     the beach-day score SWIM (0..100: rip risk and shore break at the spot, UV, heat, wind, rain,
 *            water), at every spot
 *
 * Each day's window at each spot is found exactly as the app's other "best" readouts find it, so
 * they never disagree on a day: the BEST TIME button's search for surf, fish and boat
 * (best-today.ts votersFor + forecast.ts bestTime: two hours from 05:00, ending by 18:00 for surf and
 * boat; fish uses the 10-minute BITE window of fish-window.ts), and the
 * DIVE & SNORKEL panel's for snorkel and dive (outing.ts bestWindow: 07:00 to 17:00, in daylight).
 * Windows already over are never offered.
 *
 * Days and spots are then compared on an absolute scale, not each day against itself:
 *   surf, fish, boat   rank = mean tone of the voters over the window (green +1, amber 0, red -1)
 *                            + 0.5 × the headline score over the window as a 0..1 share
 *   snorkel, dive      rank = the window's peak outing score / 100
 * A window counts as good when it is not mostly red (surf, fish, boat; same test as the BEST TIME
 * button) or rates CAUTION or better (outing score 40 and up). The best day is the good day with the
 * highest rank; ties go to the earlier day. These are hand-made scores, so other good days within
 * ALIKE of the best (3 outing points; for surf, fish and boat 0.6 of SURF SCORE or 6 BITE or SEA
 * COMFORT points at the same tones) are listed as about as good rather than hidden behind a one-point win.
 */
import { localDayStart } from '../physics/astro';
import { bestWindow, ratingFor } from '../physics/outing';
import { SURF_BREAKS } from '../data/surf-breaks';
import { SNORKEL_SPOTS } from '../data/snorkel-spots';
import { BEST_LEN_H, TONE_SCORE, bestTime, buildForecast, sunHours, type Spot } from './forecast';
import { votersFor } from './best-today';
import { biteTone, fishWindow } from './fish-window';
import { METRIC_BY_ID, type MetricEnv, type Tone } from './registry';

export type PlanActivity = 'surf' | 'fish' | 'snorkel' | 'dive' | 'boat' | 'swim';
export const PLAN_ACTIVITIES: readonly PlanActivity[] = ['surf', 'fish', 'snorkel', 'dive', 'boat', 'swim'];
export const isPlanActivity = (x: unknown): x is PlanActivity => typeof x === 'string' && (PLAN_ACTIVITIES as readonly string[]).includes(x);

/** The headline score each activity is shown and ranked by, and its full scale. */
export const HEADLINE: Readonly<Record<PlanActivity, { id: string; max: number }>> = {
  surf: { id: 'surfq', max: 10 },
  fish: { id: 'bite', max: 100 },
  snorkel: { id: 'outing', max: 100 },
  dive: { id: 'outing', max: 100 },
  boat: { id: 'comfort', max: 100 },
  swim: { id: 'swim', max: 100 },
};

/** Outing score 0..100 at a spot and hour, SNORKEL at 2 m or DIVE at 6 m (the DIVE & SNORKEL panel's), or null without data. */
export type OutingAt = (spot: Spot, mode: 'snorkel' | 'dive', ms: number, localHour: number) => number | null;

export interface PlanDay {
  /** Days ahead, 0 = today. */
  day: number;
  dayMs: number;
  /** The spot this day's window is at. */
  spot: string;
  startMs: number;
  endMs: number;
  /** The headline score over the window (surf /10, the rest /100); null when that one metric has no data then. */
  value: number | null;
  tone: Tone;
  good: boolean;
  rank: number;
}

export interface Plan {
  activity: PlanActivity;
  /** Local midnight starting day 0. */
  startMs: number;
  /** Per day, the best window across the spots, or null when none is left or there is no data. */
  days: (PlanDay | null)[];
  bestDay: number | null;
  /** Other good days scoring within ALIKE of the best one, earliest first. */
  alike: number[];
  /** Why there is no best day: no spot for this activity in the region, no data yet, or no good window on any day. */
  none: 'nospot' | 'nodata' | 'poor' | null;
}

const H = 3.6e6, DAY = 864e5;
/** Rank gap under which two days are called about as good. */
export const ALIKE = 0.03;

/** The spots an activity is judged at: surf breaks for SURF, catalog snorkel spots for SNORKEL and DIVE, all of them otherwise. */
export function spotsFor(activity: PlanActivity, spots: readonly Spot[]): Spot[] {
  if (activity === 'surf') return spots.filter((s) => SURF_BREAKS.some((b) => b.name === s.name));
  if (activity === 'snorkel' || activity === 'dive') return spots.filter((s) => SNORKEL_SPOTS.some((x) => x.spot === s.name));
  return [...spots];
}

const outingTone = (score: number): Tone => ({ GO: 'green', CAUTION: 'amber', AVOID: 'red' } as const)[ratingFor(score)];

/** Fish at one spot: each day's 10-minute-grid bite window (fish-window.ts), ranked like the other metric activities. */
function fishDays(env: MetricEnv, spot: Spot, nowMs: number, days: number): (PlanDay | null)[] {
  const start = localDayStart(nowMs, env.tzOffsetH);
  return Array.from({ length: days }, (_, d) => {
    const dayMs = start + d * DAY;
    const w = fishWindow(env, spot, dayMs, nowMs);
    if (!w) return null;
    const tone = biteTone(w.mean);
    return {
      day: d, dayMs, spot: spot.name, startMs: w.startMs, endMs: w.endMs,
      value: w.mean, tone, good: w.mean >= 40,
      rank: TONE_SCORE[tone] + 0.5 * Math.min(1, Math.max(0, w.mean / 100)),
    };
  });
}

/** Surf, fish or boat at one spot: each day's window by the BEST TIME button's search, ranked on the absolute scale above. */
function metricDays(env: MetricEnv, activity: 'surf' | 'fish' | 'boat' | 'swim', spot: Spot, nowMs: number, days: number): (PlanDay | null)[] {
  if (activity === 'fish') return fishDays(env, spot, nowMs, days);
  const ids = votersFor(activity, spot);
  const f = buildForecast(env, ids, [spot], nowMs, days);
  const metrics = ids.map((id) => METRIC_BY_ID.get(id)!);
  if (f.rows.length !== metrics.length) return new Array(days).fill(null);
  const head = HEADLINE[activity];
  const headRow = f.rows.find((r) => r.id === head.id);
  const voters = f.rows.map((r, i) => ({ r, m: metrics[i] })).filter(({ m }) => m.better !== null && !m.hours);
  return Array.from({ length: days }, (_, d) => {
    const sun = sunHours(f.startMs + d * DAY, spot.lngLat[1], spot.lngLat[0]);
    const w = bestTime(f.rows, metrics, d, f.startMs, nowMs, sun.toH, sun.fromH);
    if (!w) return null;
    const h0 = Math.round((w.startMs - f.startMs) / H);
    let tone = 0, n = 0;
    const heads: number[] = [];
    for (let h = h0; h < h0 + BEST_LEN_H; h++) {
      for (const { r, m } of voters) {
        const v = r.hourly[h];
        if (v !== null) (tone += TONE_SCORE[m.tone(v)]), n++;
      }
      const v = headRow?.hourly[h];
      if (v !== null && v !== undefined) heads.push(v);
    }
    const value = heads.length ? heads.reduce((a, b) => a + b, 0) / heads.length : null;
    const share = value === null ? 0 : Math.min(1, Math.max(0, value / head.max));
    const m = headRow ? METRIC_BY_ID.get(head.id)! : null;
    return {
      day: d, dayMs: f.startMs + d * DAY, spot: spot.name, startMs: w.startMs, endMs: w.endMs,
      value, tone: m && value !== null ? m.tone(value) : 'none',
      good: w.score >= 0,
      rank: (n ? tone / n : 0) + 0.5 * share,
    };
  });
}

/** Snorkel or dive at one spot: each day's window by the DIVE & SNORKEL panel's search, hours already over scoring nothing. */
function outingDays(outingAt: OutingAt, mode: 'snorkel' | 'dive', spot: Spot, start: number, nowMs: number, days: number): (PlanDay | null)[] {
  return Array.from({ length: days }, (_, d) => {
    const dayMs = start + d * DAY;
    let seen = false;
    const w = bestWindow((ms, h) => {
      if (ms + H <= nowMs) return { score: 0, reasons: [] };
      const s = outingAt(spot, mode, ms, h);
      if (s !== null && Number.isFinite(s)) seen = true;
      return { score: s !== null && Number.isFinite(s) ? s : 0, reasons: [] };
    }, dayMs, sunHours(dayMs, spot.lngLat[1], spot.lngLat[0]));
    if (!w || !seen) return null;
    return { day: d, dayMs, spot: spot.name, startMs: w.start, endMs: w.end, value: w.peak, tone: outingTone(w.peak), good: w.peak >= 40, rank: w.peak / 100 };
  });
}

/**
 * The best day and time for `activity` over `days` local days from the one containing `nowMs`, at the
 * spots of the region (`spots`, nearest the centre first, which wins ties). `outingAt` is required for
 * SNORKEL and DIVE; without it they have no data.
 */
export function planDays(env: MetricEnv, activity: PlanActivity, spots: readonly Spot[], nowMs: number, days = 5, outingAt?: OutingAt): Plan {
  const start = localDayStart(nowMs, env.tzOffsetH);
  const at = spotsFor(activity, spots);
  const empty = (none: Plan['none']): Plan => ({ activity, startMs: start, days: new Array(days).fill(null), bestDay: null, alike: [], none });
  if (!at.length) return empty('nospot');
  const perSpot = at.map((s) =>
    activity === 'snorkel' || activity === 'dive'
      ? outingAt
        ? outingDays(outingAt, activity, s, start, nowMs, days)
        : new Array<PlanDay | null>(days).fill(null)
      : metricDays(env, activity, s, nowMs, days),
  );
  const out: (PlanDay | null)[] = Array.from({ length: days }, (_, d) => {
    let best: PlanDay | null = null;
    for (const row of perSpot) {
      const c = row[d];
      // A good window beats a poor one anywhere; among equals the higher rank, then the spot nearer the centre.
      if (c && (!best || (c.good && !best.good) || (c.good === best.good && c.rank > best.rank + 1e-9))) best = c;
    }
    return best;
  });
  let bestDay: number | null = null;
  out.forEach((c, d) => c?.good && (bestDay === null || c.rank > out[bestDay]!.rank + 1e-9) && (bestDay = d));
  const top = bestDay === null ? null : out[bestDay]!;
  const alike = top ? out.flatMap((c, d) => (c?.good && d !== bestDay && top.rank - c.rank < ALIKE ? [d] : [])) : [];
  return { activity, startMs: start, days: out, bestDay, alike, none: bestDay !== null ? null : out.some(Boolean) ? 'poor' : 'nodata' };
}
