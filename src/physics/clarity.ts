/**
 * Water clarity (PLAN 6.1): an underwater visibility estimate from satellite optics plus the two
 * things that muddy this coast between satellite maps, river plumes after rain and swell stirring
 * up the bottom. Pure, SI units, no DOM.
 *
 * Everything is combined as a diffuse attenuation coefficient Kd (1/m), because attenuation from
 * separate causes adds: Kd = Kd_satellite + Kd_plume + Kd_resuspension. Visibility is then the
 * Secchi depth, Zsd ≈ 1.7 / Kd (Poole and Atkins 1929; the constant is 1.3 to 1.9 in the
 * literature, and Secchi depth is a fair stand-in for horizontal diver visibility in clear water).
 *
 * The plume and resuspension terms are rules of thumb with round-number constants, not fitted to
 * local observations: they say "after heavy rain the water near the Sixaola is brown", with the
 * right shape in space and time. The forecast past the newest data and its confidence band are in
 * clarity-forecast.ts (PLAN 7.2); no local dive or turbidity records exist yet to calibrate against.
 */
import { bottomOrbitalVelocitySea } from './waves';

/** Secchi depth from Kd, m (Poole–Atkins, constant 1.7). */
export const secchiFromKd = (kd: number) => 1.7 / kd;

/**
 * Kd490 from chlorophyll-a for open (case 1) water, Morel and Maritorena (2001):
 * Kd490 = 0.0166 + 0.0773 · Chl^0.6715, Chl in mg/m³. Used only where the Kd490 map has no value;
 * it underestimates muddy coastal water, which the plume term covers.
 */
export const kdFromChl = (chlMgM3: number) => 0.0166 + 0.0773 * Math.pow(Math.max(0, chlMgM3), 0.6715);

/** Kd of the core of a fresh river plume, 1/m: brown water, about 0.6 m visibility. */
export const KD_PLUME = 3;
/** Rain over a catchment (e-folding-weighted mm) that makes a full-strength plume. */
export const PLUME_SATURATION_MM = 60;
/** How fast a plume clears after the rain stops: e-folding time, s (about a day). */
export const PLUME_DECAY_S = 24 * 3600;
/** Plume radius for a 1000 km² catchment after saturating rain, m. Scales with √(area × rain). */
export const PLUME_RADIUS_M = 6000;

export interface River {
  name: string;
  /** [lng, lat] of the mouth. */
  mouth: readonly [number, number];
  catchmentKm2: number;
}

/**
 * Effective recent rain, mm: hourly rain before `ms` weighted by exp(−age / PLUME_DECAY_S), so
 * yesterday's downpour still counts about a third. `times` are hour starts (epoch ms).
 */
export function effectiveRain(times: readonly number[], rainMmH: readonly number[], ms: number): number {
  let s = 0;
  for (let i = 0; i < times.length; i++) {
    const age = (ms - times[i]) / 1000;
    if (age < 0 || age > 5 * PLUME_DECAY_S || !Number.isFinite(rainMmH[i])) continue;
    s += rainMmH[i] * Math.exp(-age / PLUME_DECAY_S);
  }
  return s;
}

/**
 * Plume Kd at distance `dM` from a river mouth: strength min(1, rain / saturation) at the mouth,
 * spreading as a Gaussian of radius L = PLUME_RADIUS_M · √(catchment/1000 km² · strength).
 */
export function plumeKd(catchmentKm2: number, rainMm: number, dM: number): number {
  const strength = Math.min(1, Math.max(0, rainMm) / PLUME_SATURATION_MM);
  if (strength <= 0) return 0;
  const L = PLUME_RADIUS_M * Math.sqrt((catchmentKm2 / 1000) * strength);
  return KD_PLUME * strength * Math.exp(-((dM / L) ** 2));
}

/** Bed velocity where waves start lifting fine sand and silt, m/s, and where it is fully stirred. */
export const RESUSPEND_FROM = 0.15;
export const RESUSPEND_FULL = 0.5;
/** Extra Kd from fully stirred sediment, 1/m (about 1.5 m visibility on its own). */
export const KD_RESUSPENSION = 1.1;

/** Extra Kd from waves stirring the bottom at depth `depthM`, from the bed orbital velocity (Soulsby 1997). */
export function resuspensionKd(hs: number, tp: number, depthM: number): number {
  if (!(hs > 0 && tp > 0 && depthM > 0)) return 0;
  const ub = bottomOrbitalVelocitySea(hs, tp, depthM);
  const f = Math.min(1, Math.max(0, (ub - RESUSPEND_FROM) / (RESUSPEND_FULL - RESUSPEND_FROM)));
  return KD_RESUSPENSION * f;
}

export type ClarityLevel = 'GOOD' | 'FAIR' | 'POOR';
/** Visibility bands for snorkelling and diving, m. */
export const CLARITY_BANDS = { good: 8, fair: 3 } as const;
export const clarityLevel = (visM: number): ClarityLevel => (visM >= CLARITY_BANDS.good ? 'GOOD' : visM >= CLARITY_BANDS.fair ? 'FAIR' : 'POOR');

export interface ClarityInputs {
  /** Satellite Kd490, 1/m, or NaN. */
  kd490: number;
  /** Satellite chlorophyll, mg/m³, or NaN (used when Kd490 is missing). */
  chl: number;
  /** Plume Kd from every river at this point, 1/m. */
  plumeKd: number;
  /** Sea state and depth for resuspension (NaN skips it). */
  hs: number;
  tp: number;
  depthM: number;
}

export interface Clarity {
  kd: number;
  visM: number;
  level: ClarityLevel;
  /** Which term dominates the muddiness, for the HUD's one-word reason. */
  cause: 'clear' | 'plankton' | 'river' | 'swell';
}

/** Background Kd when no satellite value exists: clear-ish Caribbean coastal water (~15 m). */
export const KD_BACKGROUND = 0.11;

export function clarity(i: ClarityInputs): Clarity {
  const sat = Number.isFinite(i.kd490) ? i.kd490 : Number.isFinite(i.chl) ? kdFromChl(i.chl) : KD_BACKGROUND;
  const res = resuspensionKd(i.hs, i.tp, i.depthM);
  const plume = Math.max(0, i.plumeKd || 0);
  const kd = sat + plume + res;
  const visM = secchiFromKd(kd);
  const top = Math.max(plume, res, sat - KD_BACKGROUND);
  const cause = visM >= CLARITY_BANDS.good ? 'clear' : top === plume ? 'river' : top === res ? 'swell' : 'plankton';
  return { kd, visM, level: clarityLevel(visM), cause };
}
