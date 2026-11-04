/**
 * Offshore eating fish (PLAN 7.17): how good the water looks for the boat species at a place, from
 * depth, satellite sea temperature, chlorophyll, fronts (physics/fronts.ts) and floating sargassum.
 * Pure: no DOM. Rules of thumb from angling and fisheries guides, NOT fitted (0 to 3 OBIS records
 * per species here).
 *
 *   score = depthFit × Σ wᵢ·fitᵢ / Σ wᵢ    over the terms that are known (depth is required)
 *   depth  trapezoid of the water depth over the species' range
 *   temp   1 inside the ideal range, 0.3 beyond the limits (softFit)
 *   chl    1 in the species' band, 0.4 beyond its limits: blue-water hunters want the clear side of
 *          a colour edge (about 0.1 to 0.6 mg/m³), kingfish greener shelf water
 *   front  exp(−(km / 5)²) to the nearest SST or chlorophyll front
 *   weed   exp(−(km / 3)²) to the nearest sargassum mat seen in the last 5 days (mahi live under weed lines)
 *   drop   bottom slope / 40 m per km, capped at 1 (wahoo and silk snapper hold on ledges)
 *
 * Silk snapper (pargo seda) is a bottom fish caught by hand line at 100 to 250 m: only depth and
 * the drop term count for it.
 */
import { trapezoid } from './habitat';
import { softFit } from './water';

export type OffshoreId = 'mahi' | 'tuna' | 'wahoo' | 'kingfish' | 'silksnapper';
type Range = readonly [number, number, number, number];
type Term = 'temp' | 'chl' | 'front' | 'weed' | 'drop';

export interface OffshoreSpecies {
  id: OffshoreId;
  depthM: Range;
  sstC: Range;
  chl: Range;
  /** Term weights (missing = 0). */
  w: Partial<Record<Term, number>>;
}

export const OFFSHORE: readonly OffshoreSpecies[] = [
  { id: 'mahi', depthM: [30, 150, 5000, 8000], sstC: [21, 24, 29, 31], chl: [0.03, 0.1, 0.6, 2], w: { front: 0.35, weed: 0.3, temp: 0.2, chl: 0.15 } },
  { id: 'tuna', depthM: [80, 300, 5000, 8000], sstC: [22, 24, 29, 31], chl: [0.03, 0.1, 0.6, 2], w: { front: 0.45, temp: 0.3, chl: 0.25 } },
  { id: 'wahoo', depthM: [40, 100, 1000, 3000], sstC: [22, 24, 28, 30], chl: [0.03, 0.1, 0.6, 2], w: { front: 0.35, drop: 0.3, temp: 0.2, chl: 0.15 } },
  { id: 'kingfish', depthM: [8, 20, 60, 120], sstC: [21, 23, 28, 30], chl: [0.1, 0.3, 3, 8], w: { front: 0.35, temp: 0.3, chl: 0.2, drop: 0.15 } },
  { id: 'silksnapper', depthM: [60, 100, 250, 350], sstC: [0, 0, 99, 99], chl: [0, 0, 99, 99], w: { drop: 1 } },
];

export interface OffshoreInputs {
  depthM?: number | null;
  sstC?: number | null;
  chl?: number | null;
  frontKm?: number | null;
  weedKm?: number | null;
  slopeMPerKm?: number | null;
}

const ok = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

export function termFits(sp: OffshoreSpecies, i: OffshoreInputs): Partial<Record<Term, number>> {
  const f: Partial<Record<Term, number>> = {};
  if (ok(i.sstC)) f.temp = softFit(i.sstC, sp.sstC, 0.3);
  if (ok(i.chl)) f.chl = softFit(i.chl, sp.chl, 0.4);
  if (ok(i.frontKm)) f.front = Math.exp(-((i.frontKm / 5) ** 2));
  if (ok(i.weedKm)) f.weed = Math.exp(-((i.weedKm / 3) ** 2));
  if (ok(i.slopeMPerKm)) f.drop = Math.min(1, i.slopeMPerKm / 40);
  return f;
}

/** 0..1, or null with no depth (on land or outside the grids). */
export function offshoreScore(sp: OffshoreSpecies, i: OffshoreInputs): number | null {
  if (!ok(i.depthM)) return null;
  const depth = trapezoid(i.depthM, ...sp.depthM);
  if (depth === 0) return 0;
  const f = termFits(sp, i);
  let s = 0, w = 0;
  for (const [k, wk] of Object.entries(sp.w) as [Term, number][]) if (f[k] !== undefined) (s += wk * f[k]!), (w += wk);
  return depth * (w > 0 ? s / w : 0.5);
}
