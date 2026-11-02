/**
 * Fitting the habitat weights to species records (PLAN 4.4). Pure: no DOM, no network.
 *
 * Model. Records are treated as an inhomogeneous Poisson point process over the fishing cells
 * whose intensity is the habitat score itself (habitat.ts):
 *
 *   λ(x) ∝ d(x) · Σ_j w_j g_j(x)          d = depth fit, g_j = component j (base, mouth, reef, drop)
 *
 * so a record's cell is drawn from the mixture p(x) = Σ_j π_j p_j(x), with known component
 * densities p_j(x) = d(x) g_j(x) / Z_j, Z_j = Σ_x d(x) g_j(x), and unknown shares π_j = w_j Z_j / Σ_k w_k Z_k
 * (the share of fish each kind of structure holds). The shares are fitted by EM with a Dirichlet
 * prior centred on the hand-written rules and worth `priorRecords` records:
 *
 *   r_ij = π_j p_j(x_i) / p(x_i)                               (E step)
 *   π_j  = (Σ_i r_ij + n0 π0_j) / (n + n0)                       (M step, posterior mean)
 *
 * and turned back into weights by w_j ∝ π_j / Z_j, Σ w = 1. The log-likelihood is concave in π, so
 * EM converges to the one optimum. With no records the weights are the prior; with many they
 * follow the records. Depth range, mouth reach and season stay hand-written (records carry no
 * month and GEBCO's ~460 m cells blur depth too much to fit a range).
 *
 * Records show where people looked (reef surveys, river-mouth sampling) as much as where fish
 * are, so the prior is kept strong and records are thinned to one per cell.
 */
import { cellIndexAt, STEP, type Cell, type Lattice } from './cells';
import { COMPONENTS, components, depthFit, mix, priorWeights, type Weights } from './habitat';
import type { Species } from './species';

/** How many records the hand-written rules are worth. */
export const PRIOR_RECORDS = 20;
/** Records up to this many lattice steps (~220 m each) from a fishing cell are snapped to it. */
export const SNAP_STEPS = 2;

export interface HabitatFit {
  /** Fitted weights (sum 1). */
  weights: Weights;
  /** The prior they started from. */
  prior: Weights;
  /** Share of records each component explains, fitted and prior. */
  share: Weights;
  priorShare: Weights;
  /** Record cells used (after thinning), and those dropped for falling outside the depth range. */
  n: number;
  outsideDepth: number;
}

/**
 * Cells holding records: each point goes to the nearest fishing cell within SNAP_STEPS, and each
 * cell counts once. Points with no cell in reach (on land, offshore, outside the region) are dropped.
 */
export function recordCells(lattice: Lattice, index: Int32Array, cells: readonly Cell[], points: readonly (readonly [number, number, ...unknown[]])[]): number[] {
  const hit = new Set<number>();
  for (const [lng, lat] of points) {
    let best = -1;
    let bestD = Infinity;
    for (let dy = -SNAP_STEPS; dy <= SNAP_STEPS; dy++)
      for (let dx = -SNAP_STEPS; dx <= SNAP_STEPS; dx++) {
        const i = cellIndexAt(lattice, index, lng + dx * STEP, lat + dy * STEP);
        if (i < 0) continue;
        const d = Math.hypot((cells[i].lng - lng) * Math.cos((lat * Math.PI) / 180), cells[i].lat - lat);
        if (d < bestD) (bestD = d), (best = i);
      }
    if (best >= 0) hit.add(best);
  }
  return [...hit].sort((a, b) => a - b);
}

const zeros = (): Weights => ({ base: 0, mouth: 0, reef: 0, drop: 0 });

function normalise(w: Weights): Weights {
  let s = 0;
  for (const c of COMPONENTS) s += w[c];
  const out = zeros();
  for (const c of COMPONENTS) out[c] = s > 0 ? w[c] / s : 0;
  return out;
}

/** Z_j = Σ_x d(x) g_j(x) over the cells. */
function normalisers(sp: Species, cells: readonly Cell[]): Weights {
  const Z = zeros();
  for (const c of cells) {
    const d = depthFit(sp, c.f);
    if (d === 0) continue;
    const g = components(sp, c.f);
    for (const k of COMPONENTS) Z[k] += d * g[k];
  }
  return Z;
}

/**
 * Fit a species' weights to the cells holding its records (`recordCells`).
 * `priorRecords` sets how much the rules count; `iterations` caps EM.
 */
export function fitWeights(sp: Species, cells: readonly Cell[], presence: readonly number[], opts: { priorRecords?: number; iterations?: number; prior?: Weights } = {}): HabitatFit {
  const n0 = opts.priorRecords ?? PRIOR_RECORDS;
  const prior = opts.prior ?? priorWeights(sp);
  const Z = normalisers(sp, cells);
  const priorShare = zeros();
  for (const k of COMPONENTS) priorShare[k] = prior[k] * Z[k];
  const pi0 = normalise(priorShare);

  // Component densities p_j at each usable record cell.
  const rows: Weights[] = [];
  let outsideDepth = 0;
  for (const i of presence) {
    const d = depthFit(sp, cells[i].f);
    if (d === 0) {
      outsideDepth++;
      continue;
    }
    const g = components(sp, cells[i].f);
    const p = zeros();
    for (const k of COMPONENTS) p[k] = Z[k] > 0 ? (d * g[k]) / Z[k] : 0;
    rows.push(p);
  }

  let pi = { ...pi0 };
  const n = rows.length;
  for (let it = 0; it < (opts.iterations ?? 500) && n > 0; it++) {
    const acc = zeros();
    for (const p of rows) {
      const tot = mix(pi, p);
      if (!(tot > 0)) continue;
      for (const k of COMPONENTS) acc[k] += (pi[k] * p[k]) / tot;
    }
    const next = zeros();
    let change = 0;
    for (const k of COMPONENTS) {
      next[k] = (acc[k] + n0 * pi0[k]) / (n + n0);
      change = Math.max(change, Math.abs(next[k] - pi[k]));
    }
    pi = next;
    if (change < 1e-10) break;
  }

  const w = zeros();
  for (const k of COMPONENTS) w[k] = Z[k] > 0 ? pi[k] / Z[k] : 0;
  return { weights: normalise(w), prior, share: pi, priorShare: pi0, n, outsideDepth };
}

/** Mean log-probability of the record cells under weights w (the fit's objective without the prior), nats per record. */
export function meanLogLik(sp: Species, cells: readonly Cell[], presence: readonly number[], w: Weights): number {
  let tot = 0;
  for (const c of cells) tot += depthFit(sp, c.f) * mix(w, components(sp, c.f));
  let s = 0;
  let n = 0;
  for (const i of presence) {
    const v = depthFit(sp, cells[i].f) * mix(w, components(sp, cells[i].f));
    if (v > 0) (s += Math.log(v / tot)), n++;
  }
  return n ? s / n : NaN;
}

/**
 * Leave-one-out check: refit without each record cell in turn and score the held-out one.
 * Returns the mean log-likelihood gain over the prior, nats per record (> 0: the records help).
 */
export function heldOutGain(sp: Species, cells: readonly Cell[], presence: readonly number[], opts: { priorRecords?: number } = {}): number {
  const prior = priorWeights(sp);
  let gain = 0;
  let n = 0;
  for (let k = 0; k < presence.length; k++) {
    const rest = presence.filter((_, j) => j !== k);
    const held = [presence[k]];
    const a = meanLogLik(sp, cells, held, fitWeights(sp, cells, rest, opts).weights);
    const b = meanLogLik(sp, cells, held, prior);
    if (Number.isFinite(a) && Number.isFinite(b)) (gain += a - b), n++;
  }
  return n ? gain / n : 0;
}

/** Area under the ROC curve: how often a record cell outscores a random fishing cell (0.5 = no skill). */
export function auc(sp: Species, cells: readonly Cell[], presence: readonly number[], w: Weights): number {
  const all = cells.map((c) => depthFit(sp, c.f) * mix(w, components(sp, c.f))).sort((a, b) => a - b);
  const below = (v: number) => {
    let lo = 0, hi = all.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (all[m] < v) lo = m + 1;
      else hi = m;
    }
    let eq = lo;
    while (eq < all.length && all[eq] === v) eq++;
    return lo + (eq - lo) / 2;
  };
  if (!presence.length || !all.length) return NaN;
  let s = 0;
  for (const i of presence) s += below(depthFit(sp, cells[i].f) * mix(w, components(sp, cells[i].f))) / all.length;
  return s / presence.length;
}
