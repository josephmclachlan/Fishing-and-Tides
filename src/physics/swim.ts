/**
 * A beach day: swimming and lying in the sun (Joseph, 2026-11-10: "a swim spot metric, with UV index, rip risk
 * for that spot, and all the metrics related to a relaxing day sunbathing and swimming"). Pure, no DOM, SI units
 * except where noted (°C, kt, mm/h, the UV index).
 *
 * Shore conditions per hour come from the spot model's last run at the place (physics/spot-model.ts): the shore
 * normal, nearshore slope and breaking angle depend on the seafloor and the swell direction, which change slowly,
 * so an hour's breaker height is scaled from that run by the hour's swell (Komar-Gaughan: Hb ∝ Hs^0.8 at a fixed
 * period, as the dive panel does for entry surf), and the rip risk (physics/rip.ts) is re-run with the hour's
 * breaker, period, tide and onshore wind. A known rip channel (river mouth, a break whose guides list rips) stays on.
 *
 * The score, 0..100, starts at 100. Safety caps it, comfort scales it:
 *
 *   caps     lightning or a likely squall 5; rip HIGH 15; shore break over 1.3 m 15
 *   factors  rip MOD ×0.55; shore break 0.5 → 1.3 m ×1 → ×0.3; squall watch ×0.7;
 *            wind 10 → 20 kt ×1 → ×0.6 (sand blowing, chop), over 20 kt ×0.5;
 *            rain 0.2 → 2 mm/h ×1 → ×0.6, over 2 mm/h ×0.4;
 *            feels like 33 → 40 °C ×1 → ×0.6 (heat), 26 → 22 °C ×1 → ×0.7 (cool);
 *            water 26 → 22 °C ×1 → ×0.75; UV 8-10 ×0.9, 11+ ×0.8 (cover up, shade, not a reason to stay home);
 *            overcast (≥ 85 % cloud) ×0.9; sargassum moderate ×0.8, high ×0.5;
 *            low sun, from sunrise or to sunset 0 → 1.5 h ×0.7 → ×1 (a beach day wants the sun up)
 *   night    after dark the score is the conditions' alone (night swimming is common here, Joseph 2026-11-11): rip, shore break,
 *            wind, rain, heat and water temperature count as by day; sun-only factors (low sun, UV, overcast) are dropped, and
 *            ×0.85 for not seeing the sea (a torch, a flag you cannot read)
 *
 * Tones: 70 and up good (green), 40 to 69 fair (amber), under 40 poor (red), as the outing score.
 */
import { onshoreWind, ripRisk, type Rip, type RipLevel } from './rip';
import type { SargLevel } from './drift';
import type { SquallLevel } from './safety';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0), 0, 1);
const finite = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** What the spot model last found at a place: the seafloor's part of the shore, and the sea it was run for. */
export interface ShoreBase {
  /** Breaker height of every train together, and breaking depth, m. */
  HbAll: number;
  hb: number;
  /** Breaker height of the main train alone (the breaking depth is its), m. */
  Hb: number;
  breakAngleDeg: number;
  slope: number | null;
  /** Seaward shore normal, compass degrees. */
  normalDeg: number;
  /** Offshore Hs the run was made for (all trains when known), m. */
  hs0: number;
  knownChannel: boolean;
}

export interface ShoreHour {
  /** Offshore Hs (all trains) and peak period this hour. */
  hs: number;
  tp: number;
  /** 0 = low water, 1 = high (tide.ts tideState().level), and the tide's size 0..1 (RipInput.tideSize). */
  tideLevel: number;
  tideSize?: number;
  /** Wind this hour: speed m/s and the direction it blows FROM. */
  windMs?: number | null;
  windFromDeg?: number | null;
}

/** The shore at one hour: breaker height at the waterline and the rip risk there. */
export function shoreAt(b: ShoreBase, h: ShoreHour): { breakerM: number; rip: Rip } {
  const ratio = b.hs0 > 0 && h.hs > 0 ? h.hs / b.hs0 : 1;
  const k = ratio ** 0.8;
  const breakerM = b.HbAll * k;
  const grow = b.Hb > 0 ? b.HbAll / b.Hb : 1;
  const rip = ripRisk({
    Hb: breakerM,
    hb: b.hb * grow * k,
    Tp: h.tp,
    angleDeg: b.breakAngleDeg,
    slope: b.slope,
    tideLevel: h.tideLevel,
    tideSize: h.tideSize,
    onshoreWindMs: finite(h.windMs) && finite(h.windFromDeg) ? onshoreWind(h.windMs, h.windFromDeg, b.normalDeg) : 0,
    knownChannel: b.knownChannel,
  });
  return { breakerM, rip };
}

export type SwimReason = 'dark' | 'storm' | 'rip' | 'surf' | 'wind' | 'rain' | 'heat' | 'cool' | 'cold' | 'uv' | 'overcast' | 'sargassum' | 'lowsun';

export interface SwimInputs {
  rip: RipLevel;
  breakerM: number;
  daylight: boolean;
  /** Hours to the nearer of sunrise and sunset: the first and last hour and a half of the day have little sun to lie in. */
  sunHours?: number | null;
  windKt?: number | null;
  rainMmH?: number | null;
  /** Real feel °C (weather.ts feelsLikeC, Steadman apparent temperature); the air temperature when the dew point is unknown. */
  feelsC?: number | null;
  sstC?: number | null;
  uv?: number | null;
  cloudPct?: number | null;
  squall?: SquallLevel;
  lightning?: boolean;
  sarg?: SargLevel | null;
}

export interface SwimScore {
  score: number;
  /** What holds the score back, worst first. */
  reasons: SwimReason[];
}

export function swimScore(i: SwimInputs): SwimScore {
  const f: [SwimReason, number][] = [];
  const caps: [SwimReason, number][] = [];
  if (!i.daylight) f.push(['dark', 0.85]);
  else if (finite(i.sunHours)) f.push(['lowsun', lerp(i.sunHours, 0, 1.5, 0.7, 1)]);
  if (i.lightning || i.squall === 'high') caps.push(['storm', 5]);
  else if (i.squall === 'watch') f.push(['storm', 0.7]);
  if (i.rip === 'HIGH') caps.push(['rip', 15]);
  else if (i.rip === 'MOD') f.push(['rip', 0.55]);
  if (i.breakerM > 1.3) caps.push(['surf', 15]);
  else f.push(['surf', lerp(i.breakerM, 0.5, 1.3, 1, 0.3)]);
  if (finite(i.windKt)) f.push(['wind', i.windKt > 20 ? 0.5 : lerp(i.windKt, 10, 20, 1, 0.6)]);
  if (finite(i.rainMmH)) f.push(['rain', i.rainMmH > 2 ? 0.4 : lerp(i.rainMmH, 0.2, 2, 1, 0.6)]);
  if (finite(i.feelsC)) {
    if (i.feelsC > 33) f.push(['heat', lerp(i.feelsC, 33, 40, 1, 0.6)]);
    else if (i.feelsC < 26) f.push(['cool', lerp(i.feelsC, 26, 22, 1, 0.7)]);
  }
  if (finite(i.sstC)) f.push(['cold', lerp(i.sstC, 26, 22, 1, 0.75)]);
  if (i.daylight && finite(i.uv)) f.push(['uv', i.uv >= 10.5 ? 0.8 : i.uv >= 7.5 ? 0.9 : 1]);
  if (i.daylight && finite(i.cloudPct) && i.cloudPct >= 85 && !(finite(i.rainMmH) && i.rainMmH >= 0.2)) f.push(['overcast', 0.9]);
  if (i.sarg === 'HIGH') f.push(['sargassum', 0.5]);
  else if (i.sarg === 'MODERATE') f.push(['sargassum', 0.8]);
  let score = 100 * f.reduce((p, [, k]) => p * k, 1);
  for (const [, c] of caps) score = Math.min(score, c);
  const reasons = [...caps.map(([r, c]) => [r, c / 100] as const), ...f.filter(([, k]) => k < 0.995)]
    .sort((a, b) => a[1] - b[1])
    .map(([r]) => r)
    .filter((r, idx, a) => a.indexOf(r) === idx);
  return { score: Math.round(clamp(score, 0, 100)), reasons };
}

export const swimTone = (score: number) => (score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red') as 'green' | 'amber' | 'red';
