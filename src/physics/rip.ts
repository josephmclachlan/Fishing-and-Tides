/**
 * Rip current risk (PLAN 3.5). Pure, no DOM, SI units.
 *
 * A transparent multiplicative score in the spirit of the NWS rip current guidance: the
 * Lushine Rip Current Scale (Lushine 1991; Engle et al. 2002) and the logistic model of
 * Dusek & Seim (2013) both find the same drivers, in this order of weight:
 *
 *   1. breaker height        rips are fed by breaking-wave set-up; negligible below ~0.3 m
 *   2. wave period           longer swell → stronger set-up and pulsing
 *   3. shore-normal approach oblique waves drive longshore currents instead of rips
 *   4. low tide              water over the bars is shallowest, flow concentrates in the channels
 *   5. onshore wind          adds set-up (Lushine: +1 point above ~12 kt onshore)
 *   6. known rip channels    reef gaps, river mouths and structures fix rips in place
 *
 *   S = fH · fT · fA · fTide · fW · fC     (≈ 0 calm … ≥ 1 severe)
 *   LOW < 0.25 ≤ MOD < 0.55 ≤ HIGH
 *
 * Calibrated so a 1 m, 10 s shore-normal breaker at mid tide is MODERATE and 1.5 m at 12 s
 * is HIGH, matching NWS practice (surf of 3 to 5 ft with long-period swell → high risk).
 *
 * Strength and length bands:
 *   speed   u ≈ 0.15 √(g Hb) · (fA · fTide)^½ ; mean rip flows of 0.3–0.8 m/s with pulses
 *           to twice that (MacMahan et al. 2006, "Rip current review", Coastal Eng. 53)
 *   length  offshore reach ≈ 1.5 × surf-zone width Xb = hb / tan β (rips usually end just
 *           past the breakers, MacMahan et al. 2010), clamped to 30–600 m
 */
import { G } from './waves';

const RAD = Math.PI / 180;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type RipLevel = 'LOW' | 'MOD' | 'HIGH';
export type RipStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
export type RipLength = 'SHORT' | 'MEDIUM' | 'LONG';

export interface RipInput {
  /** Breaker height, m (3.4). */
  Hb: number;
  /** Breaking depth, m (3.4). */
  hb: number;
  /** Peak period, s. */
  Tp: number;
  /** Wave angle to the shore normal at the break, degrees (3.4). */
  angleDeg: number;
  /** Nearshore slope tan β, or null if unknown (3.4). */
  slope: number | null;
  /** Position in the tide cycle, 0 = low water, 1 = high water (3.1 `tideState().level`). */
  tideLevel: number;
  /** Onshore wind component, m/s (negative = offshore). Default 0. */
  onshoreWindMs?: number;
  /** A known rip channel (reef gap, river mouth, jetty) at this spot. Default false. */
  knownChannel?: boolean;
}

export interface RipFactors { height: number; period: number; angle: number; tide: number; wind: number; channel: number }

export interface Rip {
  /** Combined score, ≈ 0 to ≥ 1. */
  score: number;
  level: RipLevel;
  /** Typical rip speed, m/s (pulses can reach about twice this). */
  speedMs: number;
  strength: RipStrength;
  /** Expected offshore reach of a rip, m. */
  lengthM: number;
  length: RipLength;
  /** Each factor, so the HUD can say why (largest effect first is the caller's job). */
  factors: RipFactors;
}

export const RIP_THRESHOLDS = { MOD: 0.25, HIGH: 0.55 } as const;

export function ripFactors(inp: RipInput): RipFactors {
  const a = Math.min(Math.abs(inp.angleDeg), 90) * RAD;
  const level = Math.min(1, Math.max(0, inp.tideLevel));
  return {
    height: smoothstep(0.3, 1.8, inp.Hb),
    period: 0.6 + 0.4 * smoothstep(6, 13, inp.Tp),
    angle: 0.4 + 0.6 * Math.cos(a) ** 2,
    // Low water 1.2, high water 0.8.
    tide: 1.2 - 0.4 * level,
    wind: 1 + 0.15 * smoothstep(3, 8, inp.onshoreWindMs ?? 0),
    channel: inp.knownChannel ? 1.3 : 1,
  };
}

export function ripLevel(score: number): RipLevel {
  if (score >= RIP_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= RIP_THRESHOLDS.MOD) return 'MOD';
  return 'LOW';
}

export function ripStrength(speedMs: number): RipStrength {
  if (speedMs < 0.3) return 'WEAK';
  if (speedMs < 0.6) return 'MODERATE';
  if (speedMs < 1) return 'STRONG';
  return 'VERY_STRONG';
}

export function ripLengthBand(m: number): RipLength {
  if (m < 75) return 'SHORT';
  if (m < 200) return 'MEDIUM';
  return 'LONG';
}

/** Rip risk, strength and reach for a spot's surf zone. */
export function ripRisk(inp: RipInput): Rip {
  const f = ripFactors(inp);
  const score = f.height * f.period * f.angle * f.tide * f.wind * f.channel;
  const speedMs = inp.Hb > 0 ? 0.15 * Math.sqrt(G * inp.Hb) * Math.sqrt(f.angle * f.tide) * (inp.knownChannel ? 1.15 : 1) : 0;
  // Unknown slope: assume an intermediate beach, tan β = 0.03.
  const slope = inp.slope != null && inp.slope > 0 ? inp.slope : 0.03;
  const lengthM = inp.Hb > 0 ? Math.min(600, Math.max(30, (1.5 * inp.hb) / slope)) : 0;
  return { score, level: ripLevel(score), speedMs, strength: ripStrength(speedMs), lengthM, length: ripLengthBand(lengthM), factors: f };
}

/** Onshore component of a wind (m/s) blowing FROM `windFromDeg`, for a shore whose seaward normal is `normalDeg`. */
export function onshoreWind(speedMs: number, windFromDeg: number, normalDeg: number): number {
  return speedMs * Math.cos((windFromDeg - normalDeg) * RAD);
}
