/**
 * Sea state comfort index for sailing (PLAN 6.6). Pure, SI units (m, s, degrees).
 *
 * Input is the two wave partitions a forecast gives: wind sea (short, steep, follows the local wind)
 * and swell (long, from far away). Comfort is judged on what a boat feels:
 *
 *   Combined height   Ht = √(Hw² + Hs²)                      (energies add)
 *   Mean period       Tm = (Hw² Tw + Hs² Ts) / (Hw² + Hs²)   (energy-weighted)
 *   Steepness         S  = Ht / L0(Tm),  L0 = g Tm² / 2π     (deep water; ~0.06 is steep, ~0.02 is long and easy)
 *   Confusion         C  = (2 min(Hw,Hs) / (Hw + Hs)) · sin(Δ/2)   for the angle Δ between the two trains:
 *                          0 if one train dominates or they agree, 1 for equal trains from opposite sides
 *
 *   Score = 100 − 40·min(Ht/2.5, 1) − 35·min(S/0.06, 1) − 25·C        (0 worst, 100 calm)
 *
 * The weights are judgement, not a fitted model: short steep seas hurt more than the same height of long
 * swell, and a cross sea is the thing that makes a boat roll. Advisory only; not for safety decisions.
 */
import { G } from './waves';

export interface SeaPartitions {
  windWaveHm: number;
  windWaveTs: number;
  windWaveDirDeg?: number;
  swellHm: number;
  swellTs: number;
  swellDirDeg?: number;
}

export type Comfort = 'comfortable' | 'lively' | 'rough' | 'uncomfortable';

export interface SeaState {
  /** 0 (worst) to 100 (flat and easy). */
  score: number;
  comfort: Comfort;
  totalHm: number;
  meanPeriodS: number;
  steepness: number;
  /** 0 to 1, how confused the sea is. */
  confusion: number;
  /** Which train carries most energy. */
  dominant: 'wind-sea' | 'swell';
}

/**
 * Wave-current interaction (PLAN 7.23 item 3). A current running against the waves shortens and steepens them,
 * a following current stretches and flattens them. For deep water and a current U along the direction the waves
 * travel (positive = following), wave action is conserved and the absolute frequency is fixed (Longuet-Higgins and
 * Stewart 1961; Phillips 1977, eq. 3.6.17), which gives the exact amplification
 *
 *   c  = (c0 / 2) · (1 + √(1 + 4U / c0)),   c0 = g T / 2π   (phase speed relative to the water)
 *   H / H0 = c0 / √(c · (c + 2U))
 *
 * For small U this is 1 − 2U/c0 = 1 − U/cg0 (cg0 = c0 / 2). Waves are blocked at U = −c0/4, where they break, so
 * the factor is clamped to 0.7 to 1.6 (and 1.6 past blocking). Applied to each train on its own heading. A planning
 * estimate for open water, not a wave model: refraction by current shear and shallow water are left out.
 */
export function currentFactor(periodS: number, dirFromDeg: number | undefined, current: { u: number; v: number }): number {
  if (!(periodS > 0) || dirFromDeg === undefined) return 1;
  const heading = ((dirFromDeg + 180) * Math.PI) / 180; // degrees true the waves travel TOWARD
  const U = current.u * Math.sin(heading) + current.v * Math.cos(heading);
  if (!Number.isFinite(U) || U === 0) return 1;
  const c0 = (G * periodS) / (2 * Math.PI);
  const disc = 1 + (4 * U) / c0;
  if (!(disc > 0)) return 1.6; // blocked: the waves pile up and break
  const c = (c0 / 2) * (1 + Math.sqrt(disc));
  const a = c0 / Math.sqrt(c * (c + 2 * U));
  return Math.min(1.6, Math.max(0.7, a));
}

/** The two trains after the current has acted on them. */
export function withCurrent(p: SeaPartitions, current: { u: number; v: number }): SeaPartitions {
  return {
    ...p,
    windWaveHm: p.windWaveHm * currentFactor(p.windWaveTs, p.windWaveDirDeg, current),
    swellHm: p.swellHm * currentFactor(p.swellTs, p.swellDirDeg, current),
  };
}

/** Current component against the dominant train (positive = against), m/s; null if the train has no direction. */
export function opposingMs(p: SeaPartitions, current: { u: number; v: number }): number | null {
  const dir = p.swellHm >= p.windWaveHm ? p.swellDirDeg : p.windWaveDirDeg;
  if (dir === undefined) return null;
  const heading = ((dir + 180) * Math.PI) / 180;
  return -(current.u * Math.sin(heading) + current.v * Math.cos(heading));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Smallest angle between two bearings, degrees 0..180. */
const angleDiff = (a: number, b: number) => {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
};

export function comfortClass(score: number): Comfort {
  return score >= 75 ? 'comfortable' : score >= 50 ? 'lively' : score >= 25 ? 'rough' : 'uncomfortable';
}

export function seaState(p: SeaPartitions): SeaState {
  const hw = Math.max(0, p.windWaveHm);
  const hs = Math.max(0, p.swellHm);
  const e = hw * hw + hs * hs;
  const totalHm = Math.sqrt(e);
  const meanPeriodS = e > 0 ? (hw * hw * p.windWaveTs + hs * hs * p.swellTs) / e : 0;
  const L0 = (G * meanPeriodS * meanPeriodS) / (2 * Math.PI);
  const steepness = L0 > 0 ? totalHm / L0 : 0;
  const balance = hw + hs > 0 ? (2 * Math.min(hw, hs)) / (hw + hs) : 0;
  const delta = p.windWaveDirDeg !== undefined && p.swellDirDeg !== undefined ? angleDiff(p.windWaveDirDeg, p.swellDirDeg) : 90;
  const confusion = clamp01(balance * Math.sin((delta * Math.PI) / 360));
  const score = Math.round(100 - 40 * clamp01(totalHm / 2.5) - 35 * clamp01(steepness / 0.06) - 25 * confusion);
  return { score, comfort: comfortClass(score), totalHm, meanPeriodS, steepness, confusion, dominant: hw > hs ? 'wind-sea' : 'swell' };
}

/**
 * SIM fallback until the Open-Meteo Marine partitions arrive (PLAN 2.2): wind sea from the local wind
 * with Pierson-Moskowitz scaling Hs = 0.21 U²/g, halved for the short fetch inside the region, and
 * Tp ≈ 0.8 U (U in m/s); the swell is whatever the forecast swell says.
 */
export function simPartitions(c: { windKt: number; windDirDeg: number; swellHeightM: number; swellPeriodS: number; swellDirDeg: number }): SeaPartitions {
  const u = c.windKt * 0.514444;
  return {
    windWaveHm: (0.5 * 0.21 * u * u) / G,
    windWaveTs: Math.max(2, 0.8 * u),
    windWaveDirDeg: c.windDirDeg,
    swellHm: c.swellHeightM,
    swellTs: c.swellPeriodS,
    swellDirDeg: c.swellDirDeg,
  };
}
