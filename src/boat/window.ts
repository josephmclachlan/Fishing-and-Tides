/**
 * Daylight and weather window for the BOAT activity (PLAN 7.23 item 4). Pure, no DOM.
 *
 *   hourly verdicts   the BOAT verdict (verdict.ts) for each of the next hours at one place, from the same
 *                     MetricEnv the WATCH tracker uses (wind, wave split with current, gusts, squall, rain).
 *                     Lightning and storm range are live-only, so forecast hours leave them out.
 *   next window       the first run of GO hours at least `minHours` long, from `fromMs`.
 *   daylight          time to sunset (or sunrise when dark), so a trip is not planned to end in the dark.
 *   pressure          3 h tendency, hPa: falling fast (≤ -3) often comes ahead of a norte or a storm.
 */
import { seaState, withCurrent } from '../physics/sea-state';
import { feedPartitions } from '../sea-partitions';
import { pressureChange } from '../weather';
import type { MetricEnv } from '../metrics/registry';
import type { DaySky } from '../physics/astro';
import type { Vessel } from '../settings';
import { boatVerdict, type BoatVerdict, type Verdict } from './verdict';

const H = 3.6e6;
const KT = 1.94384;
const finite = (x: number): boolean => Number.isFinite(x);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export interface HourVerdict {
  tMs: number;
  verdict: Verdict | null;
}

/** The forecast verdict for one place and hour, with the numbers behind it; null where there is no wind or wave data. */
export function verdictAt(env: MetricEnv, vessel: Vessel, lng: number, lat: number, tMs: number): { verdict: Verdict; windKt: number | null; hsM: number | null; reasons: BoatVerdict['reasons'] } | null {
  const w = env.windMs(lng, lat, tMs);
  const sea = env.sea(lng, lat, tMs);
  if (w === null && !sea) return null;
  const wx = env.weather(tMs, lng, lat);
  const p = feedPartitions(sea);
  const c = env.currentVec?.(lng, lat, tMs);
  const s = p ? seaState(c ? withCurrent(p, { u: c[0], v: c[1] }) : p) : null;
  const cape = mean(wx.map((x) => x.capeJkg).filter(finite));
  const gust = mean(wx.map((x) => x.gustKt).filter(finite));
  const rain = mean(wx.map((x) => x.rainMmH).filter(finite));
  const v = boatVerdict({
    vessel,
    windKt: w === null ? undefined : w * KT,
    gustKt: finite(gust) ? gust : undefined,
    hsM: s?.totalHm ?? sea?.hs,
    comfort: s?.score,
    squall: finite(cape) ? squallFromMeans(cape, gust, rain) : undefined,
    rainMmH: finite(rain) ? rain : undefined,
  });
  return { verdict: v.verdict, windKt: w === null ? null : w * KT, hsM: s?.totalHm ?? sea?.hs ?? null, reasons: v.reasons };
}

/** The forecast verdict hour by hour from `fromMs` (rounded down to the hour); null where there is no wind or wave data. */
export function hourlyVerdicts(env: MetricEnv, vessel: Vessel, lng: number, lat: number, fromMs: number, hours = 48): HourVerdict[] {
  const start = Math.floor(fromMs / H) * H;
  return Array.from({ length: hours }, (_, h) => ({ tMs: start + h * H, verdict: verdictAt(env, vessel, lng, lat, start + h * H)?.verdict ?? null }));
}

// Same gates as weather.ts squallLevel (CAPE 1000 / 2500 with gusts >= 25 kt or rain >= 5 mm/h).
function squallFromMeans(cape: number, gust: number, rain: number): 'none' | 'watch' | 'high' {
  if (!(cape >= 1000)) return 'none';
  const active = gust >= 25 || rain >= 5;
  return cape >= 2500 && active ? 'high' : active ? 'watch' : 'none';
}

export interface Window {
  startMs: number;
  /** End of the last GO hour. */
  endMs: number;
  /** The window is under way at `fromMs`. */
  now: boolean;
}

/** First run of at least `minHours` GO hours that ends after `fromMs`; null if none in the list. */
export function nextWindow(hours: readonly HourVerdict[], fromMs: number, minHours = 2): Window | null {
  let i = 0;
  while (i < hours.length) {
    if (hours[i]!.verdict !== 'go') {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < hours.length && hours[j + 1]!.verdict === 'go') j++;
    const endMs = hours[j]!.tMs + H;
    if (j - i + 1 >= minHours && endMs > fromMs) {
      return { startMs: hours[i]!.tMs, endMs, now: hours[i]!.tMs <= fromMs };
    }
    i = j + 1;
  }
  return null;
}

export type Daylight = { kind: 'day'; untilMs: number; minutes: number } | { kind: 'night'; untilMs: number | null; minutes: number | null } | null;

/** Day: time left to sunset. Night: time to the next sunrise (given for the next day, if any). */
export function daylight(sky: DaySky, nextSunrise: number | null, nowMs: number): Daylight {
  const { sunrise, sunset } = sky.sun;
  if (sunrise === null || sunset === null) return null;
  if (nowMs >= sunrise && nowMs < sunset) return { kind: 'day', untilMs: sunset, minutes: Math.round((sunset - nowMs) / 60000) };
  const next = nowMs < sunrise ? sunrise : nextSunrise;
  return { kind: 'night', untilMs: next, minutes: next === null ? null : Math.round((next - nowMs) / 60000) };
}

export type PressureTrend = 'fallingFast' | 'falling' | 'steady' | 'rising';
export const PRESSURE_FALLING_HPA = -1.5;
export const PRESSURE_FALLING_FAST_HPA = -3;

/** hPa per 3 h to a word; null when no model has both ends. */
export function pressureWord(d3h: number | null): PressureTrend | null {
  if (d3h === null) return null;
  return d3h <= PRESSURE_FALLING_FAST_HPA ? 'fallingFast' : d3h <= PRESSURE_FALLING_HPA ? 'falling' : d3h >= 1.5 ? 'rising' : 'steady';
}

export const pressureTrend3h = (env: MetricEnv, ms: number): number | null => pressureChange(env.weather(ms), env.weather(ms - 3 * H));
