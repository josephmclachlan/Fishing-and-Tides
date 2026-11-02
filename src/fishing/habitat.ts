/**
 * Rule-based habitat score for shore and kayak fishing (PLAN 4.5). Pure: no DOM.
 *
 *   score = depthFit × (w.mouth × mouthFit + w.reef × reefFit + w.drop × dropFit) × season
 *
 * Every term is 0..1. `depthFit` is a trapezoid over the species' depth range, `mouthFit` a Gaussian
 * of the distance to the nearest river mouth, `reefFit` the share of nearby bottom that is reef or
 * rock, `dropFit` how steep the bottom is (fish hold on edges). A rough guide to where to try
 * first, not a catch forecast.
 */
import type { Species } from './species';

export interface CellFeatures {
  /** Water depth, m (positive down). */
  depthM: number;
  /** Distance to the nearest river or creek mouth (weighted by its size), km. */
  mouthKm: number;
  /** 0..1 share of the surrounding bottom that is reef zone, coral or rock. */
  reef: number;
  /** Steepest bottom slope around the cell, m of depth per km. */
  slopeMPerKm: number;
}

/** Slope at which a drop-off is as good as it gets, m per km. */
export const FULL_DROP_M_PER_KM = 40;

/** 0 below `a`, 1 from `b` to `c`, 0 above `d`, linear between. */
export function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  if (!(x > a && x < d)) return 0;
  if (x < b) return (x - a) / (b - a);
  if (x > c) return (d - x) / (d - c);
  return 1;
}

/** Season factor for a 0-based month (0 = January). */
export const seasonFactor = (sp: Species, month: number) => sp.season[((month % 12) + 12) % 12];

/** The score before the season factor, 0..1. */
export function baseScore(sp: Species, f: CellFeatures): number {
  const depth = trapezoid(f.depthM, ...sp.depthM);
  if (depth === 0) return 0;
  const mouth = Math.exp(-((f.mouthKm / sp.mouthReachKm) ** 2));
  const drop = Math.min(1, Math.max(0, f.slopeMPerKm / FULL_DROP_M_PER_KM));
  const structure = sp.w.mouth * mouth + sp.w.reef * Math.min(1, Math.max(0, f.reef)) + sp.w.drop * drop;
  return Math.min(1, depth * structure);
}

export const habitatScore = (sp: Species, f: CellFeatures, month: number): number => baseScore(sp, f) * seasonFactor(sp, month);
