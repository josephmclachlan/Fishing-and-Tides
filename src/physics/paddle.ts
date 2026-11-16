/**
 * Paddling: kayaks, stand-up paddleboards (SUP) and other human-powered boats (Joseph, 2026-11-16). Pure, no DOM.
 * Units: kt for wind and current, m and s for waves, °C, mm/h, the UV index. Research and the gaps in the feeds: docs/PADDLE.md.
 *
 * A paddler has no engine to get out of trouble, so the score is led by what takes you somewhere you did not choose.
 * It starts at 100. Safety caps it, comfort scales it. Two craft differ only in their numbers (CRAFT below):
 *
 *   wind       the mean wind plus half the gust above it ("effective wind"): easy → hard ×1 → ×0.5, over hard ×0.35, cap at the limit
 *   offshore   the part of the wind blowing from the land out to sea (cos of the angle to the shore's seaward normal)
 *              × effective wind. Over the craft's limit the cap is 20: this is what blows people out of sight, the leading
 *              cause of paddleboard rescues (48% of the UK RNLI's 2023 SUP launches¹)
 *   sea        offshore wave height easy → hard ×1 → ×0.4; short steep waves (period under 5 s with 0.5 m or more) ×0.9
 *   chop       wind waves built over the 3 km a paddler might drift (JONSWAP fetch law, chopM), only counted offshore,
 *              where the beach no longer shelters you
 *   launch     breaker height at the beach easy → dump ×1 → ×0.35 (a SUP rider falls, a kayak broaches); over the dump limit cap 15.
 *              Rip HIGH ×0.6, MOD ×0.85 (a paddler can cross a rip but a swimmer is lost in one, and the launch is where people swim)
 *   current    against the paddling speed: 20% → 60% of it ×1 → ×0.5; over 80% of it cap 25 (cannot make way back)
 *   storm      lightning cap 3; likely squall cap 5; squall watch ×0.7
 *   rain       0.5 → 4 mm/h ×1 → ×0.7
 *   heat       real feel 33 → 41 °C ×1 → ×0.6 (paddling is hard exercise on open water with no shade)
 *   sun        UV 8-10 ×0.93, 11+ ×0.85 (the water doubles the dose from below the hat)
 *   daylight   after dark cap 25; the last hour before sunset ×0.85 (you must be back on the beach by dark)
 *   sargassum  moderate ×0.9, high ×0.7 (weed catches the paddle and blade)
 *   no weather forecast: the best it can read is GOOD (84), as SWIM.
 */
import type { RipLevel } from './rip';
import type { SargLevel } from './drift';
import type { SquallLevel } from './safety';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0), 0, 1);
const finite = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

export type PaddleCraft = 'kayak' | 'sup';
export const PADDLE_CRAFT: readonly PaddleCraft[] = ['kayak', 'sup'];
export const isPaddleCraft = (x: unknown): x is PaddleCraft => x === 'kayak' || x === 'sup';

export interface CraftLimits {
  /** Effective wind, kt: no penalty up to `windEasy`, half at `windHard`, capped at 10 from `windCap`. */
  windEasy: number; windHard: number; windCap: number;
  /** Offshore part of the wind, kt: penalty from `offEasy`, cap 20 from `offCap`. */
  offEasy: number; offCap: number;
  /** Offshore wave height, m. */
  hsEasy: number; hsHard: number;
  /** Breaker height at the launch, m: easy, and the dump limit above which launching is out. */
  brkEasy: number; brkDump: number;
  /** Cruising speed, kt: what a current is measured against. */
  cruiseKt: number;
  /** Farthest to go from the launch in good conditions, km. */
  rangeKm: number;
}

/**
 * Starting numbers, not measurements: from the beginner and sea-kayak wind guides² and the rescue statistics¹, set a
 * notch gentler for a rented craft (the usual case here). Joseph to check locally, as the other guessed limits.
 */
export const CRAFT: Readonly<Record<PaddleCraft, CraftLimits>> = {
  kayak: { windEasy: 10, windHard: 18, windCap: 24, offEasy: 6, offCap: 12, hsEasy: 0.6, hsHard: 1.5, brkEasy: 0.4, brkDump: 1.0, cruiseKt: 3, rangeKm: 5 },
  sup: { windEasy: 6, windHard: 13, windCap: 18, offEasy: 4, offCap: 8, hsEasy: 0.4, hsHard: 1.0, brkEasy: 0.3, brkDump: 0.7, cruiseKt: 2.5, rangeKm: 3 },
};

export type PaddleReason =
  | 'noweather' | 'dark' | 'dusk' | 'storm' | 'wind' | 'offshore' | 'sea' | 'chop' | 'dump' | 'surf' | 'rip' | 'current'
  | 'rain' | 'heat' | 'uv' | 'sargassum';

export interface PaddleInputs {
  craft: PaddleCraft;
  windKt?: number | null;
  gustKt?: number | null;
  /** Compass degrees the wind blows FROM, and the seaward normal of the launch beach (region.ts `facing`). */
  windFromDeg?: number | null;
  facingDeg?: number | null;
  hsM?: number | null;
  tpS?: number | null;
  breakerM?: number | null;
  rip?: RipLevel | null;
  currentKt?: number | null;
  rainMmH?: number | null;
  feelsC?: number | null;
  uv?: number | null;
  daylight: boolean;
  /** Hours to sunset while the sun is up (null at night or when unknown). */
  hoursToSunset?: number | null;
  squall?: SquallLevel;
  lightning?: boolean;
  sarg?: SargLevel | null;
}

/** Share of the wind blowing from the land out to sea, 0 (along or onto the shore) to 1 (straight offshore). */
export function offshoreShare(windFromDeg: number, facingDeg: number): number {
  const d = ((windFromDeg - (facingDeg + 180)) * Math.PI) / 180;
  return Math.max(0, Math.cos(d));
}

/** Height of the chop a wind builds over `fetchM` of water (JONSWAP fetch law, Hs = 0.0016 U √(F/g)), m. */
export function chopM(windKt: number, fetchM: number): number {
  const u = windKt / 1.94384;
  return 0.0016 * u * Math.sqrt(fetchM / 9.81);
}
/** Over this much water a drifting paddler is out of reach of the beach's shelter, m. */
export const DRIFT_FETCH_M = 3000;

export interface PaddleScore {
  score: number;
  /** What holds the score back, worst first. */
  reasons: PaddleReason[];
  /** Effective wind (mean plus half the gust excess), kt, and the offshore part of it. */
  effWindKt: number | null;
  offshoreKt: number | null;
  /** Chop built over a 3 km drift offshore, m. */
  chopM: number | null;
  /** How far from the launch to go, km: the craft's range scaled by the score; 0 under 40. */
  rangeKm: number;
}

export const NO_WEATHER_CAP = 84;

export function paddleScore(i: PaddleInputs): PaddleScore {
  const L = CRAFT[i.craft];
  const f: [PaddleReason, number][] = [];
  const caps: [PaddleReason, number][] = [];
  let eff: number | null = null;
  let off: number | null = null;
  let chop: number | null = null;
  if (finite(i.windKt)) {
    eff = finite(i.gustKt) ? i.windKt + 0.5 * Math.max(0, i.gustKt - i.windKt) : i.windKt;
    if (eff >= L.windCap) caps.push(['wind', 10]);
    else f.push(['wind', eff > L.windHard ? lerp(eff, L.windHard, L.windCap, 0.5, 0.35) : lerp(eff, L.windEasy, L.windHard, 1, 0.5)]);
    if (finite(i.windFromDeg) && finite(i.facingDeg)) {
      off = offshoreShare(i.windFromDeg, i.facingDeg) * eff;
      if (off >= L.offCap) caps.push(['offshore', 20]);
      else f.push(['offshore', lerp(off, L.offEasy, L.offCap, 1, 0.5)]);
      chop = chopM(off, DRIFT_FETCH_M);
      f.push(['chop', lerp(chop, L.hsEasy * 0.4, L.hsHard * 0.4, 1, 0.8)]);
    }
  }
  if (finite(i.hsM)) {
    if (i.hsM >= L.hsHard * 2) caps.push(['sea', 15]);
    else f.push(['sea', lerp(i.hsM, L.hsEasy, L.hsHard, 1, 0.4) * (finite(i.tpS) && i.tpS < 5 && i.hsM >= 0.5 ? 0.9 : 1)]);
  }
  if (finite(i.breakerM)) {
    if (i.breakerM > L.brkDump) caps.push(['dump', 15]);
    else f.push(['surf', lerp(i.breakerM, L.brkEasy, L.brkDump, 1, 0.35)]);
  }
  if (i.rip === 'HIGH') f.push(['rip', 0.6]);
  else if (i.rip === 'MOD') f.push(['rip', 0.85]);
  if (finite(i.currentKt)) {
    const r = i.currentKt / L.cruiseKt;
    if (r > 0.8) caps.push(['current', 25]);
    else f.push(['current', lerp(r, 0.2, 0.6, 1, 0.5)]);
  }
  if (i.lightning) caps.push(['storm', 3]);
  else if (i.squall === 'high') caps.push(['storm', 5]);
  else if (i.squall === 'watch') f.push(['storm', 0.7]);
  if (finite(i.rainMmH)) f.push(['rain', lerp(i.rainMmH, 0.5, 4, 1, 0.7)]);
  if (finite(i.feelsC)) f.push(['heat', lerp(i.feelsC, 33, 41, 1, 0.6)]);
  if (i.daylight && finite(i.uv)) f.push(['uv', i.uv >= 10.5 ? 0.85 : i.uv >= 7.5 ? 0.93 : 1]);
  if (!i.daylight) caps.push(['dark', 25]);
  else if (finite(i.hoursToSunset) && i.hoursToSunset < 1) f.push(['dusk', 0.85]);
  if (!finite(i.rainMmH) && !finite(i.feelsC) && !finite(i.uv)) caps.push(['noweather', NO_WEATHER_CAP]);
  if (i.sarg === 'HIGH') f.push(['sargassum', 0.7]);
  else if (i.sarg === 'MODERATE') f.push(['sargassum', 0.9]);
  let score = 100 * f.reduce((p, [, k]) => p * k, 1);
  for (const [, c] of caps) score = Math.min(score, c);
  score = Math.round(clamp(score, 0, 100));
  const reasons = [...caps.map(([r, c]) => [r, c / 100] as const), ...f.filter(([, k]) => k < 0.995)]
    .sort((a, b) => a[1] - b[1])
    .map(([r]) => r)
    .filter((r, idx, a) => a.indexOf(r) === idx);
  return { score, reasons, effWindKt: eff, offshoreKt: off, chopM: chop, rangeKm: score < 40 ? 0 : Math.round(L.rangeKm * lerp(score, 40, 85, 0.3, 1) * 10) / 10 };
}

/** Tones as the other water scores: 70 and up good, 40 to 69 fair, under 40 poor. */
export const paddleTone = (score: number) => (score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red') as 'green' | 'amber' | 'red';
