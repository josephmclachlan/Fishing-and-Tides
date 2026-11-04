/**
 * Custom forecast builder for the WATCH tracker (PLAN 7.13). Pure: no DOM, no timers. For the
 * chosen metrics and every named spot inside the chosen region it folds each local day into one
 * value, then keeps the best spot per metric and day, so the popup can say "SWELL 1.2 m at
 * CAHUITA".
 */
import { haversineM } from '../geo';
import { localDayStart } from '../physics/astro';
import { METRIC_BY_ID, daySky, type Metric, type MetricEnv, type Tone } from './registry';

const HOUR = 3.6e6, DAY = 864e5;

export interface Spot { name: string; lngLat: [number, number] }
export interface Region { center: [number, number]; radiusKm: number }

/** Spots inside the region, nearest the centre first. */
export function spotsIn(spots: readonly Spot[], r: Region): Spot[] {
  return spots
    .map((s) => ({ s, d: haversineM(r.center, s.lngLat) }))
    .filter((x) => x.d <= r.radiusKm * 1000)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s);
}

export interface DayCell {
  /** Day start, local midnight as epoch ms. */
  dayMs: number;
  value: number | null;
  tone: Tone;
  /** The spot the value is for: the best one where the metric has a better end, else the nearest the centre. */
  spot: string | null;
}

export interface MetricRow {
  id: string;
  unit: string;
  decimals: number;
  days: DayCell[];
  /** Hourly values over the window (null for gaps), each day at that day's best spot, for the sparkline and the best-time search. */
  hourly: (number | null)[];
}

export interface WatchForecast {
  startMs: number;
  days: number;
  spots: string[];
  rows: MetricRow[];
  /** Index of the best day by tone score across the rows, or null if there is no data. */
  bestDay: number | null;
  /** The best two local hours of that day, or null when no metric has hourly values. */
  bestTime: { startMs: number; endMs: number } | null;
}

/** Local hours searched for the best time (a window starts at 5 and ends by 19), and its length. */
export const BEST_FROM_H = 5, BEST_TO_H = 19, BEST_LEN_H = 2;

const hoursFor = (m: Metric): readonly number[] => m.hours ?? (m.agg === 'sum' ? Array.from({ length: 24 }, (_, h) => h) : Array.from({ length: 12 }, (_, h) => h + 6));

function fold(m: Metric, xs: number[]): number | null {
  if (!xs.length) return null;
  if (m.agg === 'max') return Math.max(...xs);
  if (m.agg === 'sum') return xs.reduce((a, b) => a + b, 0);
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const TONE_SCORE: Record<Tone, number> = { green: 1, amber: 0, red: -1, none: 0 };

/**
 * `ids` are metric ids (unknown ones are skipped), `spots` the spots in the region, `fromMs` any
 * moment of the first day (the local day containing it is day 0).
 */
export function buildForecast(env: MetricEnv, ids: readonly string[], spots: readonly Spot[], fromMs: number, days = 5): WatchForecast {
  const start = localDayStart(fromMs, env.tzOffsetH);
  const metrics = ids.map((id) => METRIC_BY_ID.get(id)).filter((m): m is Metric => !!m);
  const skyMemo = new Map<string, ReturnType<typeof daySky>>();
  const sky = (day: number, s: Spot) => {
    const k = `${day}|${s.name}`;
    let v = skyMemo.get(k);
    if (!v) skyMemo.set(k, (v = daySky(day, s.lngLat[1], s.lngLat[0])));
    return v;
  };
  const rows: MetricRow[] = metrics.map((m) => {
    const hrs = hoursFor(m);
    const cells: DayCell[] = [];
    const hourly: (number | null)[] = new Array(days * 24).fill(null);
    for (let d = 0; d < days; d++) {
      const dayMs = start + d * DAY;
      let best: { v: number; spot: Spot } | null = null;
      const perSpot = spots.map((s) => {
        const xs: number[] = [];
        for (const h of hrs) {
          const v = m.at({ env, spot: s.name, lng: s.lngLat[0], lat: s.lngLat[1], ms: dayMs + h * HOUR, sky: sky(dayMs, s) });
          if (v !== null && Number.isFinite(v)) xs.push(v);
        }
        return { s, v: fold(m, xs) };
      });
      for (const p of perSpot) {
        if (p.v === null) continue;
        if (!best || (m.better === 'high' && p.v > best.v) || (m.better === 'low' && p.v < best.v)) best = { v: p.v, spot: p.s };
      }
      cells.push({ dayMs, value: best?.v ?? null, tone: best ? m.tone(best.v) : 'none', spot: best?.spot.name ?? null });
      if (best) {
        const s = best.spot;
        for (let h = 0; h < 24; h++) {
          if (m.hours && !m.hours.includes(h)) continue;
          const v = m.at({ env, spot: s.name, lng: s.lngLat[0], lat: s.lngLat[1], ms: dayMs + h * HOUR, sky: sky(dayMs, s) });
          hourly[d * 24 + h] = v !== null && Number.isFinite(v) ? v : null;
        }
      }
    }
    return { id: m.id, unit: m.unit, decimals: m.decimals, days: cells, hourly };
  });
  let bestDay: number | null = null;
  let top = -Infinity;
  for (let d = 0; d < days; d++) {
    const scored = rows.filter((r) => r.days[d].value !== null);
    if (!scored.length) continue;
    const score = scored.reduce((a, r) => a + TONE_SCORE[r.days[d].tone], 0) / scored.length;
    if (score > top) (top = score), (bestDay = d);
  }
  return { startMs: start, days, spots: spots.map((s) => s.name), rows, bestDay, bestTime: bestDay === null ? null : bestTime(rows, metrics, bestDay, start) };
}

/**
 * The best BEST_LEN_H consecutive local hours of day `d`: each hour is scored by the tone of every
 * metric that has a value then (green +1, red -1), plus up to half a point for how far the value
 * sits toward the better end of that day's range, which breaks ties. Metrics with no better end
 * (period, tide) and daily-only metrics (visibility, sargassum) do not vote.
 */
export function bestTime(rows: readonly MetricRow[], metrics: readonly Metric[], d: number, startMs: number): { startMs: number; endMs: number } | null {
  const voters = rows.map((r, i) => ({ r, m: metrics[i] })).filter(({ m }) => m.better !== null && !m.hours);
  if (!voters.length) return null;
  const score = (h: number) => {
    let sum = 0, n = 0;
    for (const { r, m } of voters) {
      const v = r.hourly[d * 24 + h];
      if (v === null) continue;
      const day = r.hourly.slice(d * 24 + BEST_FROM_H, d * 24 + BEST_TO_H).filter((x): x is number => x !== null);
      const lo = Math.min(...day), hi = Math.max(...day);
      const pos = hi > lo ? (v - lo) / (hi - lo) : 0.5;
      sum += TONE_SCORE[m.tone(v)] + 0.5 * (m.better === 'high' ? pos : 1 - pos);
      n++;
    }
    return n ? sum / n : null;
  };
  let best: { h: number; v: number } | null = null;
  for (let h = BEST_FROM_H; h + BEST_LEN_H <= BEST_TO_H; h++) {
    const parts = Array.from({ length: BEST_LEN_H }, (_, k) => score(h + k));
    if (parts.some((p) => p === null)) continue;
    const v = (parts as number[]).reduce((a, b) => a + b, 0) / BEST_LEN_H;
    if (!best || v > best.v + 1e-9) best = { h, v };
  }
  if (!best) return null;
  const from = startMs + d * DAY + best.h * HOUR;
  return { startMs: from, endMs: from + BEST_LEN_H * HOUR };
}
