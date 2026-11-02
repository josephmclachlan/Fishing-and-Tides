import { describe, expect, it } from 'vitest';
import type { Cell, Lattice } from './cells';
import { auc, fitWeights, heldOutGain, recordCells } from './fit';
import { COMPONENTS, components, depthFit, mix, priorWeights, type Weights } from './habitat';
import { speciesById } from './species';

const snapper = speciesById('snapper');

/** A 40 × 40 lattice of cells at 15 m depth: reef in one corner, a mouth on one edge, a drop-off band. */
const STEP = 0.002;
const N = 40;
const lattice: Lattice = { lon0: 0, lat0: N * STEP, cols: N, rows: N };
const index = new Int32Array(N * N);
const cells: Cell[] = [];
for (let r = 0; r < N; r++)
  for (let c = 0; c < N; c++) {
    index[r * N + c] = cells.length;
    cells.push({
      lng: (c + 0.5) * STEP,
      lat: N * STEP - (r + 0.5) * STEP,
      f: { depthM: r === 0 ? 60 : 15, mouthKm: (c * STEP * 111) / 1, reef: r > 30 && c > 30 ? 1 : 0, slopeMPerKm: c >= 18 && c <= 21 ? 40 : 0 },
      coastM: 500,
    });
  }

/** Deterministic draws of `n` record cells from the intensity d·Σ w g. */
function sample(w: Weights, n: number): number[] {
  const lam = cells.map((c) => depthFit(snapper, c.f) * mix(w, components(snapper, c.f)));
  const cum: number[] = [];
  lam.reduce((s, v, i) => (cum[i] = s + v), 0);
  let seed = 12345;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    const u = (seed / 2 ** 31) * cum[cum.length - 1];
    out.push(cum.findIndex((v) => v >= u));
  }
  return out;
}

const sum = (w: Weights) => COMPONENTS.reduce((s, k) => s + w[k], 0);

describe('fitWeights', () => {
  it('returns the prior with no records', () => {
    const fit = fitWeights(snapper, cells, []);
    for (const k of COMPONENTS) expect(fit.weights[k]).toBeCloseTo(priorWeights(snapper)[k], 9);
    expect(fit.n).toBe(0);
  });

  it('recovers the weights that made the records when the prior is weak', () => {
    const truth: Weights = { base: 0.1, mouth: 0.5, reef: 0.1, drop: 0.3 };
    const fit = fitWeights(snapper, cells, sample(truth, 4000), { priorRecords: 0 });
    for (const k of COMPONENTS) expect(fit.weights[k]).toBeCloseTo(truth[k], 1);
    expect(sum(fit.weights)).toBeCloseTo(1, 9);
    expect(sum(fit.share)).toBeCloseTo(1, 9);
  });

  it('moves further from the prior the less it counts', () => {
    const recs = sample({ base: 0.1, mouth: 0.8, reef: 0.05, drop: 0.05 }, 30);
    const mouth = (n0: number) => fitWeights(snapper, cells, recs, { priorRecords: n0 }).weights.mouth;
    expect(mouth(5)).toBeGreaterThan(mouth(20));
    expect(mouth(20)).toBeGreaterThan(mouth(200));
    expect(mouth(200)).toBeGreaterThan(priorWeights(snapper).mouth);
  });

  it('drops records outside the depth range', () => {
    const fit = fitWeights(snapper, cells, [0, 1, N + 1]);
    expect(fit.outsideDepth).toBe(2);
    expect(fit.n).toBe(1);
  });
});

describe('recordCells', () => {
  it('snaps points to the nearest cell, once per cell, and drops points out of reach', () => {
    const c = cells[5 * N + 5];
    const got = recordCells(lattice, index, cells, [[c.lng + 0.0003, c.lat], [c.lng - 0.0002, c.lat + 0.0001, 2020], [5, 5]]);
    expect(got).toEqual([5 * N + 5]);
  });
});

describe('checks', () => {
  it('AUC is high when records sit on the best habitat, and held-out gain rewards a true signal', () => {
    const reefCells = cells.map((_, i) => i).filter((i) => cells[i].f.reef === 1).slice(0, 20);
    expect(auc(snapper, cells, reefCells, priorWeights(snapper))).toBeGreaterThan(0.9);
    const recs = [...new Set(sample({ base: 0.05, mouth: 0.85, reef: 0.05, drop: 0.05 }, 60))];
    expect(heldOutGain(snapper, cells, recs)).toBeGreaterThan(0);
  });
});
