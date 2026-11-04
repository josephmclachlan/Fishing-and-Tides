/**
 * Snorkel and dive outing score (PLAN 6.9): one 0 to 100 number per hour from bed surge,
 * visibility, surface chop, water over the reef and daylight, and from it the best time of a
 * day and the best day of the week ahead. Pure, no DOM, SI units. Advisory only.
 *
 * Each input becomes a 0..1 term (1 = ideal). A bad term must pull the score down by itself,
 * so   score = 100 · (0.75 · min(terms) + 0.25 · mean(terms)).
 * Bands are our guidance, not a standard (surge bands: physics/surge.ts; visibility: clarity.ts):
 *   surge   1 below 0.10 m/s, 0 at 0.60 m/s and above (linear between)
 *   vis     0 at 1 m, 1 at 10 m (linear)
 *   chop    1 at 4 m/s wind, 0 at 10 m/s (a snorkeller loses the bottom in whitecaps)
 *   depth   0 below 0.5 m of water over the reef (you touch coral), 1 from 1.5 m
 *   light   0 at 07:00, 1 from 09:00 until 15:00, 0 at 17:00 (local clock; no sun model needed here)
 *   rain    1 up to 2 mm/h, 0.3 at 10 mm/h and above (optional input; left out when unknown)
 *
 * Weather safety caps the whole score afterwards: score × safetyTerm (physics/safety.ts, shared with fishing).
 * Lightning within 25 km leaves at most 10, a squall HIGH 25%, a squall WATCH 70%.
 */
import { safetyTerm, type SquallLevel } from './safety';

export type OutingReason = 'storm' | 'surge' | 'vis' | 'chop' | 'shallow' | 'light' | 'rain';

export interface OutingInputs {
  /** Peak bed velocity at the activity's depth, m/s. */
  surgeMs: number;
  /** Visibility, m. */
  visM: number;
  /** 10 m wind speed, m/s. */
  windMs: number;
  /** Water over the reef at the activity's spot: chart depth plus tide, m. */
  waterM: number;
  /** Local hour of day, 0..24. */
  localHour: number;
  /** Rain, mm/h (mean over the models). Left out when no forecast covers the hour. */
  rainMmH?: number;
  /** Squall flag for the hour (weather.ts squallLevel). */
  squall?: SquallLevel;
  /** A lightning strike within the alert distance in the last 15 min. */
  lightning?: boolean;
}

export interface OutingScore {
  /** 0..100. */
  score: number;
  /** Terms below 0.6, worst first. */
  reasons: OutingReason[];
}

const ramp = (x: number, lo: number, hi: number) => Math.min(1, Math.max(0, (x - lo) / (hi - lo)));

export function lightTerm(h: number): number {
  return Math.min(ramp(h, 7, 9), 1 - ramp(h, 15, 17));
}

export function outingScore(i: OutingInputs): OutingScore {
  const terms: [OutingReason, number][] = [
    ['surge', 1 - ramp(i.surgeMs, 0.1, 0.6)],
    ['vis', ramp(i.visM, 1, 10)],
    ['chop', 1 - ramp(i.windMs, 4, 10)],
    ['shallow', ramp(i.waterM, 0.5, 1.5)],
    ['light', lightTerm(i.localHour)],
  ].map(([r, v]) => [r, Number.isFinite(v as number) ? (v as number) : 0.5] as [OutingReason, number]);
  if (i.rainMmH !== undefined && Number.isFinite(i.rainMmH)) terms.push(['rain', 1 - 0.7 * ramp(i.rainMmH, 2, 10)]);
  const min = Math.min(...terms.map((x) => x[1]));
  const mean = terms.reduce((a, x) => a + x[1], 0) / terms.length;
  const safety = safetyTerm(i.lightning, i.squall);
  const reasons = terms.filter((x) => x[1] < 0.6).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  return {
    score: Math.round(100 * (0.75 * min + 0.25 * mean) * safety),
    reasons: safety < 1 ? ['storm', ...reasons] : reasons,
  };
}

export interface OutingWindow { start: number; end: number; peak: number; reasons: OutingReason[] }
export interface OutingDay { dayStart: number; best: OutingWindow | null }

const H = 3.6e6;

/** Best window of one local day: hourly from 07:00 to 17:00, the run of hours within 10% of the day's best. */
export function bestWindow(at: (ms: number, localHour: number) => OutingScore, dayStart: number): OutingWindow | null {
  const hours: { t: number; s: OutingScore }[] = [];
  for (let h = 7; h <= 16; h++) hours.push({ t: dayStart + h * H, s: at(dayStart + h * H, h) });
  const top = hours.reduce((a, b) => (b.s.score > a.s.score ? b : a));
  if (top.s.score <= 0) return null;
  const cut = top.s.score * 0.9;
  let a = hours.indexOf(top), b = a;
  while (a > 0 && hours[a - 1].s.score >= cut) a--;
  while (b < hours.length - 1 && hours[b + 1].s.score >= cut) b++;
  return { start: hours[a].t, end: hours[b].t + H, peak: top.s.score, reasons: top.s.reasons };
}

/** The best time of each of `days` local days from the one starting at `firstDayStart`, and the index of the best day. */
export function outlook(at: (ms: number, localHour: number) => OutingScore, firstDayStart: number, days = 7): { days: OutingDay[]; bestDay: number } {
  const out = Array.from({ length: days }, (_, k) => {
    const dayStart = firstDayStart + k * 24 * H;
    return { dayStart, best: bestWindow(at, dayStart) };
  });
  let bestDay = -1, peak = 0;
  out.forEach((d, k) => d.best && d.best.peak > peak && ((peak = d.best.peak), (bestDay = k)));
  return { days: out, bestDay };
}

export type Rating = 'GO' | 'CAUTION' | 'AVOID';
/** Plain rating for a spot from its outing score: 70 and up GO, 40 to 69 CAUTION, below 40 AVOID. */
export const ratingFor = (score: number): Rating => (score >= 70 ? 'GO' : score >= 40 ? 'CAUTION' : 'AVOID');

/**
 * Stinger (jellyfish, sea lice, man-of-war) guess: on-shore wind pushes them to the beach, so flag
 * wind of at least 5 m/s from within 60° of the way the shore faces. A rule of thumb, not data: no
 * free stinger feed exists.
 */
export function stingerGuess(windMs: number, windFromDeg: number, facingDeg: number): boolean {
  if (!(windMs >= 5)) return false;
  const d = Math.abs(((windFromDeg - facingDeg + 540) % 360) - 180);
  return d <= 60;
}
