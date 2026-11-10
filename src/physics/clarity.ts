/**
 * Water clarity (PLAN 6.1): an underwater visibility estimate from satellite optics plus the two
 * things that muddy this coast between satellite maps, river plumes after rain and swell stirring
 * up the bottom. Pure, SI units, no DOM.
 *
 * Everything is combined as a diffuse attenuation coefficient Kd (1/m), because attenuation from
 * separate causes adds: Kd = Kd_satellite + Kd_plume + Kd_resuspension. Visibility is then the
 * Secchi depth from Lee et al. (2015, Remote Sensing of Environment 169: 139-149), see `secchiFromKd`;
 * Secchi depth is a fair stand-in for horizontal diver visibility in clear water.
 *
 * The plume and resuspension terms are rules of thumb with round-number constants: they say "after
 * heavy rain the water near the Sixaola is brown", with the right shape in space and time. The
 * forecast past the newest data and its confidence band are in clarity-forecast.ts (PLAN 7.2); the
 * clear-water baseline and the shoreline-pixel fix are in clarity-baseline.ts (PLAN 7.45).
 *
 * PLAN 7.45 rebuilt it as a clear-water baseline plus the causes of murk, each from its physics:
 * runoff after the soil is wet, the river plume carried by the current, and the bed stirred by waves
 * and currents (sediment.ts). Satellite maps count only while fresh, and only for murk those causes
 * don't already explain (clarity-forecast.ts). Nothing is fitted to a sighting.
 */
import { bedStirring } from './sediment';

/**
 * Secchi depth, m, from Lee et al. (2015): Zsd = ln(|0.14 − Rrs_tr| / 0.013) / (2.5 · Kd_tr), where Kd_tr is the
 * attenuation in the most transparent band and Rrs_tr the reflectance there. Kd490 stands in for Kd_tr (the
 * transparent window of clear water sits near 490 nm; in green, muddy water Kd490 is larger than Kd_tr, so the
 * estimate errs short, the safe side for divers) and Rrs_tr is a typical 0.005 per sr, so Zsd ≈ 0.94 / Kd490.
 * The older Poole–Atkins 1.7 / Kd was fitted for the light-weighted Kd and read clear blue water nearly twice as
 * far (34 m against 19 m at Kd 0.05; audit N).
 */
export const SECCHI_RRS_TR = 0.005;
export const SECCHI_K = Math.log(Math.abs(0.14 - SECCHI_RRS_TR) / 0.013) / 2.5;
export const secchiFromKd = (kd: number) => SECCHI_K / kd;

/**
 * Kd490 from chlorophyll-a for open (case 1) water, Morel et al. (2007, Remote Sensing of Environment 111: 69-88):
 * Kd490 = 0.0166 + 0.0773 · Chl^0.6715, Chl in mg/m³. Used only where the Kd490 map has no value;
 * it underestimates muddy coastal water, which the plume term covers.
 */
export const kdFromChl = (chlMgM3: number) => 0.0166 + 0.0773 * Math.pow(Math.max(0, chlMgM3), 0.6715);

/** Kd of the core of a fresh river plume, 1/m: brown water, about 0.3 m visibility. */
export const KD_PLUME = 3;
/**
 * Plume strength scale, as rain-equivalent mm: this much makes a full-strength plume. Since PLAN 7.50 the
 * rain side is physics/runoff.ts (wet ground, intensity, river lag, clearing at sea), whose strength 1 is
 * REF_STORM_MM (60 mm in a day on normal ground); the flow side is flowPlumeMm.
 */
export const PLUME_SATURATION_MM = 60;
/**
 * Plume rain-equivalent from the measured river (GloFAS discharge as a share of its own median), mm:
 * median flow or below gives none, 10 times the median is a saturated plume. The plume uses the larger of this and the
 * rain proxy, so a river in spate still muddies the water when the catchment-rain model missed the storm.
 */
export const flowPlumeMm = (ratio: number): number => PLUME_SATURATION_MM * Math.min(1, Math.max(0, (ratio - 1) / 9));
/** Weighting of recent rain for the coral and runoff rows' effective rain: e-folding time, s (about a day). */
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

/** Extra Kd from fully stirred sediment, 1/m (under 1 m visibility on its own; a rule of thumb). */
export const KD_RESUSPENSION = 1.1;

/**
 * Extra Kd from waves and the current stirring the bottom at depth `depthM` (PLAN 7.45): KD_RESUSPENSION
 * times the stirring of sediment.ts, which is zero until the bed sand moves (Soulsby 1997 threshold) and
 * full once it is suspended. `currentMs`: depth-mean current speed, 0 when unknown.
 */
export function resuspensionKd(hs: number, tp: number, depthM: number, currentMs = 0): number {
  return KD_RESUSPENSION * bedStirring(hs, tp, depthM, currentMs);
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
  /** Depth-mean current speed, m/s, for bed stirring; omitted or NaN when unknown. */
  currentMs?: number;
}

export interface Clarity {
  kd: number;
  visM: number;
  level: ClarityLevel;
  /** Which term dominates the muddiness, for the HUD's one-word reason. */
  cause: 'clear' | 'plankton' | 'river' | 'swell';
}

/** Background satellite Kd490 when no satellite value or baseline exists, 1/m: clear-ish coastal water here (about 8.5 m). */
export const KD_BACKGROUND = 0.11;

export function clarity(i: ClarityInputs): Clarity {
  const sat = Number.isFinite(i.kd490) ? i.kd490 : Number.isFinite(i.chl) ? kdFromChl(i.chl) : KD_BACKGROUND;
  const res = resuspensionKd(i.hs, i.tp, i.depthM, i.currentMs);
  const plume = Math.max(0, i.plumeKd || 0);
  const kd = sat + plume + res;
  const visM = secchiFromKd(kd);
  const top = Math.max(plume, res, sat - KD_BACKGROUND);
  const cause = visM >= CLARITY_BANDS.good ? 'clear' : top === plume ? 'river' : top === res ? 'swell' : 'plankton';
  return { kd, visM, level: clarityLevel(visM), cause };
}
