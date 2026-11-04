/**
 * Ensemble blend with local bias correction (PLAN 7.4). Pure. Scores each model against what the Limón
 * airport (METAR MRLM) actually measured over the last few days, then blends the models per variable:
 *
 *   bias_m  = mean(model_m − obs)                     (the model's local offset)
 *   σ_m     = √ mean((model_m − bias_m − obs)²)       (its error once that offset is removed)
 *   w_m     ∝ 1 / max(σ_m, σ_floor)²                  (inverse-variance weights, normalised)
 *   blend   = Σ w_m · (model_m − bias_m)
 *   spread  = √ Σ w_m · (model_m − bias_m − blend)²   (how far the corrected models disagree)
 *   σ_blend = √(spread² + 1 / Σ 1/σ_m²)               (disagreement plus the blend's own expected error)
 *
 * Inverse-variance weighting is the minimum-variance combination of independent unbiased estimates;
 * model errors are correlated, so the weights are capped at MAX_WEIGHT to keep every model in the mix.
 * A model with fewer than MIN_PAIRS matched hours keeps equal weight and no correction. The bias is
 * shrunk toward zero by n / (n + SHRINK_N) so a few reports cannot swing it. Gusts take the wind weights,
 * uncorrected (the airport only reports gusts when there are some, so their mean error is skewed). Rain,
 * cloud, UV and CAPE keep equal weights: the airport does not measure them, and skill on wind says little
 * about skill on rain.
 */

export interface Pair {
  t: number;
  obs: number;
}

export interface ModelScore {
  n: number;
  /** Mean model minus observed, shrunk toward 0. */
  bias: number;
  /** RMS error after removing the bias. */
  sigma: number;
}

/** Hours matched before a score counts. */
export const MIN_PAIRS = 8;
/** Bias shrinkage: with n pairs the bias is scaled by n / (n + SHRINK_N). */
export const SHRINK_N = 6;
/** No model is weighted above this share. */
export const MAX_WEIGHT = 0.7;

/**
 * Score one model's hourly series against observations. An observation pairs with the model hour it
 * falls in (hour starts `times`); hours with no model value are skipped.
 */
export function scoreModel(times: readonly number[], values: readonly number[], obs: readonly Pair[]): ModelScore {
  const diffs: number[] = [];
  for (const o of obs) {
    if (!Number.isFinite(o.obs)) continue;
    const i = Math.round((o.t - times[0]) / 3.6e6);
    if (i < 0 || i >= times.length || Math.abs(o.t - times[i]) > 30 * 60e3 || !Number.isFinite(values[i])) continue;
    diffs.push(values[i] - o.obs);
  }
  const n = diffs.length;
  if (!n) return { n: 0, bias: 0, sigma: NaN };
  const raw = diffs.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(diffs.reduce((a, d) => a + (d - raw) ** 2, 0) / n);
  return { n, bias: raw * (n / (n + SHRINK_N)), sigma };
}

/** Normalised weights from scores; equal when fewer than two models are scored. `floor` stops a lucky model taking everything. */
export function weightsFrom(scores: Record<string, ModelScore>, floor: number): Record<string, number> {
  const ids = Object.keys(scores);
  const scored = ids.filter((m) => scores[m].n >= MIN_PAIRS && Number.isFinite(scores[m].sigma));
  if (scored.length < 2) return Object.fromEntries(ids.map((m) => [m, 1 / ids.length]));
  // Unscored models get the mean scored precision, so they stay in at an average weight.
  const prec: Record<string, number> = {};
  for (const m of scored) prec[m] = 1 / Math.max(scores[m].sigma, floor) ** 2;
  const meanPrec = scored.reduce((a, m) => a + prec[m], 0) / scored.length;
  for (const m of ids) prec[m] ??= meanPrec;
  return capWeights(Object.fromEntries(ids.map((m) => [m, prec[m]])), MAX_WEIGHT);
}

/** Normalise and cap: any weight over `cap` is clipped and the excess shared out by the others' size. */
export function capWeights(raw: Record<string, number>, cap: number): Record<string, number> {
  const ids = Object.keys(raw);
  let w = Object.fromEntries(ids.map((m) => [m, raw[m]]));
  for (let k = 0; k < ids.length; k++) {
    const sum = ids.reduce((a, m) => a + w[m], 0);
    w = Object.fromEntries(ids.map((m) => [m, w[m] / sum]));
    const over = ids.filter((m) => w[m] > cap + 1e-12);
    if (!over.length) break;
    const free = ids.filter((m) => w[m] <= cap);
    const excess = over.reduce((a, m) => a + w[m] - cap, 0);
    const freeSum = free.reduce((a, m) => a + w[m], 0);
    for (const m of over) w[m] = cap;
    for (const m of free) w[m] += freeSum ? (excess * w[m]) / freeSum : excess / free.length;
  }
  return w;
}

export type Confidence = 'HIGH' | 'MED' | 'LOW';

export interface Blended {
  value: number;
  /** Weighted standard deviation of the corrected models. */
  spread: number;
  /** Expected error of the blend, same units. */
  sigma: number;
  models: number;
}

/**
 * Blend the models' values at one hour. `values` maps model to value (NaN = model absent); missing
 * models drop out and the rest are renormalised. Biases and sigmas are optional (no correction / no
 * error term).
 */
export function blend(values: Record<string, number>, weights: Record<string, number>, scores?: Record<string, ModelScore>): Blended | null {
  const ids = Object.keys(values).filter((m) => Number.isFinite(values[m]) && (weights[m] ?? 0) > 0);
  if (!ids.length) return null;
  const wsum = ids.reduce((a, m) => a + weights[m], 0);
  const v = (m: string) => values[m] - (scores?.[m]?.bias ?? 0);
  const value = ids.reduce((a, m) => a + (weights[m] / wsum) * v(m), 0);
  const spread = Math.sqrt(ids.reduce((a, m) => a + (weights[m] / wsum) * (v(m) - value) ** 2, 0));
  const sig = ids.map((m) => scores?.[m]?.sigma).filter((s): s is number => !!s && Number.isFinite(s) && s > 0);
  const own = sig.length ? 1 / Math.sqrt(sig.reduce((a, s) => a + 1 / s ** 2, 0)) : 0;
  return { value, spread, sigma: Math.sqrt(spread ** 2 + own ** 2), models: ids.length };
}

/** Confidence from the blend's expected error against what matters for that variable (`good`, `fair`: HIGH up to good, MED up to fair). */
export const confidence = (sigma: number, good: number, fair: number): Confidence => (!Number.isFinite(sigma) ? 'LOW' : sigma <= good ? 'HIGH' : sigma <= fair ? 'MED' : 'LOW');
