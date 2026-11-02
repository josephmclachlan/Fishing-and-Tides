/**
 * Habitat score for shore and kayak fishing (PLAN 4.5, weights fitted in 4.4). Pure: no DOM.
 *
 *   score = depthFit × (w.base + w.mouth × mouthFit + w.reef × reefFit + w.drop × dropFit) × season
 *
 * Every term is 0..1 and the weights sum to 1. `depthFit` is a trapezoid over the species' depth
 * range, `mouthFit` a Gaussian of the distance to the nearest river mouth, `reefFit` the share of
 * nearby bottom that is reef or rock, `dropFit` how steep the bottom is (fish hold on edges), and
 * `base` is open bottom with none of them. The weights are the hand-written rules of 4.5
 * (`priorWeights`) updated by the OBIS/GBIF records (`fitWeights` in fit.ts). A rough guide to
 * where to try first, not a catch forecast.
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

/** The habitat components a cell's score is mixed from. */
export const COMPONENTS = ['base', 'mouth', 'reef', 'drop'] as const;
export type Component = (typeof COMPONENTS)[number];
/** One weight per component, summing to 1. */
export type Weights = Record<Component, number>;

/** Prior weight of open bottom: the 4.5 rules gave it none, but fish are caught over plain sand too. */
export const BASE_PRIOR = 0.05;

/** 0 below `a`, 1 from `b` to `c`, 0 above `d`, linear between. */
export function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  if (!(x > a && x < d)) return 0;
  if (x < b) return (x - a) / (b - a);
  if (x > c) return (d - x) / (d - c);
  return 1;
}

/** Season factor for a 0-based month (0 = January). */
export const seasonFactor = (sp: Species, month: number) => sp.season[((month % 12) + 12) % 12];

export const depthFit = (sp: Species, f: CellFeatures): number => trapezoid(f.depthM, ...sp.depthM);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** The component values 0..1 at a cell for a species (the mouth reach is the species'). */
export function components(sp: Species, f: CellFeatures): Weights {
  return {
    base: 1,
    mouth: Math.exp(-((f.mouthKm / sp.mouthReachKm) ** 2)),
    reef: clamp01(f.reef),
    drop: clamp01(f.slopeMPerKm / FULL_DROP_M_PER_KM),
  };
}

/** The hand-written 4.5 weights with a small share moved to open bottom. */
export function priorWeights(sp: Species): Weights {
  const k = 1 - BASE_PRIOR;
  return { base: BASE_PRIOR, mouth: k * sp.w.mouth, reef: k * sp.w.reef, drop: k * sp.w.drop };
}

/** Structure mix at a cell: Σ w·g, 0..1. */
export function mix(w: Weights, g: Weights): number {
  let s = 0;
  for (const c of COMPONENTS) s += w[c] * g[c];
  return s;
}

/** The score before the season factor, 0..1. Weights default to the prior (no records). */
export function baseScore(sp: Species, f: CellFeatures, w: Weights = priorWeights(sp)): number {
  const depth = depthFit(sp, f);
  if (depth === 0) return 0;
  return Math.min(1, depth * mix(w, components(sp, f)));
}

export const habitatScore = (sp: Species, f: CellFeatures, month: number, w?: Weights): number => baseScore(sp, f, w) * seasonFactor(sp, month);
