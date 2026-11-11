/**
 * BEST BITE window of a local day at one spot, read on a 10-minute grid instead of whole 2-hour blocks.
 * The 2-hour search could only say "17:00-19:00" for a dusk peak at 16:45-17:35 (it showed as "6 PM",
 * after sunset); this one follows the peak itself. Pure.
 */
import { daySky } from '../physics/astro';
import { sunHours, type Spot } from './forecast';
import { biteAt, METRIC_BY_ID, type MetricEnv } from './registry';

const STEP = 10 * 60_000;
const HOUR = 3.6e6;

export interface FishWindow {
  startMs: number;
  endMs: number;
  /** Peak and mean BITE (0..100) over the window. */
  peak: number;
  mean: number;
}

/**
 * The run of 10-minute steps around the day's best bite that stays within `share` of it, between
 * an hour before sunrise and an hour after sunset, local, never starting before `notBeforeMs`. Runs shorter than 30 minutes
 * are widened to 30. Null when nothing is left or the forecast has no value.
 */
export function fishWindow(env: MetricEnv, spot: Spot, dayMs: number, notBeforeMs = -Infinity, share = 0.9): FishWindow | null {
  const [lng, lat] = spot.lngLat;
  const sky = daySky(dayMs, lat, lng);
  // An hour either side of the sun: the bite peaks in the half-light before sunrise and after sunset.
  const sun = sunHours(dayMs, lat, lng, 1);
  const from = dayMs + sun.fromH * HOUR, to = dayMs + sun.toH * HOUR;
  const pts: { t: number; v: number }[] = [];
  for (let t = from; t < to; t += STEP) {
    if (t + STEP <= notBeforeMs) continue;
    const v = biteAt({ env, spot: spot.name, lng, lat, ms: t + STEP / 2, sky }).bite;
    if (Number.isFinite(v)) pts.push({ t, v });
  }
  if (!pts.length) return null;
  let top = 0;
  pts.forEach((p, i) => { if (p.v > pts[top].v) top = i; });
  const cut = pts[top].v * share;
  let a = top, b = top;
  while (a > 0 && pts[a - 1].v >= cut && pts[a - 1].t === pts[a].t - STEP) a--;
  while (b < pts.length - 1 && pts[b + 1].v >= cut && pts[b + 1].t === pts[b].t + STEP) b++;
  while (b - a + 1 < 3) {
    if (b < pts.length - 1 && (a === 0 || pts[b + 1].v >= pts[a - 1].v)) b++;
    else if (a > 0) a--;
    else break;
  }
  const run = pts.slice(a, b + 1);
  return {
    startMs: run[0].t,
    endMs: run[run.length - 1].t + STEP,
    peak: pts[top].v,
    mean: run.reduce((s, p) => s + p.v, 0) / run.length,
  };
}

export const biteTone = (v: number) => METRIC_BY_ID.get('bite')!.tone(v);
