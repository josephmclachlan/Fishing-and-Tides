/**
 * Floating-debris drift (PLAN 7.1): moves sargassum mats with the surface current plus a share of the
 * wind, and records where and when they reach the shore. Pure, SI units, no DOM.
 *
 *   dx/dt = U_current + α · U_wind10
 *
 * The current comes from the currents feed (Météo-France SMOC), which already includes tides and
 * Stokes drift, so waves need no separate term. α is the windage: mats ride high and catch the wind;
 * drift studies of pelagic Sargassum find 1 to 3% of the 10 m wind (e.g. Putman et al. 2020, Johns
 * et al. 2020), so the forecast runs each mat at 1, 2 and 3% and reports how many of those agree.
 * Integration is the midpoint (RK2) method with hourly steps; a mat stops where its next step lands
 * on land (beached) or leaves the current field (lost).
 */

export const M_PER_DEG_LAT = 110574;
export const M_PER_DEG_LNG = 111320;
const RAD = Math.PI / 180;

/** Windage members, share of the 10 m wind. */
export const WINDAGES = [0.01, 0.02, 0.03] as const;

/** Writes u (east) and v (north), m/s, at a point and time into `out`; false where there is no value. */
export type VelocityAt = (lng: number, lat: number, ms: number, out: [number, number]) => boolean;

export interface DriftEnv {
  current: VelocityAt;
  wind: VelocityAt;
  isWater: (lng: number, lat: number) => boolean;
}

export interface DriftEnd {
  lng: number;
  lat: number;
  ms: number;
  /** 'beached' at the coast, 'lost' off the current field, 'adrift' still at sea at the end. */
  fate: 'beached' | 'lost' | 'adrift';
}

const cu: [number, number] = [0, 0], wu: [number, number] = [0, 0];
/** Drift velocity at a point (current + windage · wind), or null without a current. Wind missing counts as calm. */
export function driftVelocity(env: DriftEnv, lng: number, lat: number, ms: number, windage: number): [number, number] | null {
  if (!env.current(lng, lat, ms, cu) || !Number.isFinite(cu[0]) || !Number.isFinite(cu[1])) return null;
  const hasWind = env.wind(lng, lat, ms, wu) && Number.isFinite(wu[0]) && Number.isFinite(wu[1]);
  return [cu[0] + (hasWind ? windage * wu[0] : 0), cu[1] + (hasWind ? windage * wu[1] : 0)];
}

/** Move a point by a velocity for `dt` seconds, on the sphere's local tangent plane. */
export function displace(lng: number, lat: number, u: number, v: number, dt: number): [number, number] {
  return [lng + (u * dt) / (M_PER_DEG_LNG * Math.cos(lat * RAD)), lat + (v * dt) / M_PER_DEG_LAT];
}

/**
 * Drift one mat from (lng, lat) at `fromMs` until `toMs`. Returns the path (every step, [lng, lat, ms])
 * and how it ended. Beached mats end at the last sea point before the coast, at the time they reach it.
 */
export function drift(lng: number, lat: number, fromMs: number, toMs: number, windage: number, env: DriftEnv, dtS = 3600): { path: [number, number, number][]; end: DriftEnd } {
  const path: [number, number, number][] = [[lng, lat, fromMs]];
  let x = lng, y = lat, t = fromMs;
  while (t < toMs) {
    const dt = Math.min(dtS, (toMs - t) / 1000);
    const v1 = driftVelocity(env, x, y, t, windage);
    if (!v1) return { path, end: { lng: x, lat: y, ms: t, fate: 'lost' } };
    const [mx, my] = displace(x, y, v1[0], v1[1], dt / 2);
    const v2 = (env.isWater(mx, my) && driftVelocity(env, mx, my, t + (dt * 1000) / 2, windage)) || v1;
    const [nx, ny] = displace(x, y, v2[0], v2[1], dt);
    if (!env.isWater(nx, ny)) {
      // Halve the step until it stays at sea: the shore is reached within that fraction of the hour.
      let f = 0.5;
      for (let k = 0; k < 6; k++, f /= 2) {
        const [px, py] = displace(x, y, v2[0], v2[1], dt * f);
        if (env.isWater(px, py)) (x = px), (y = py);
      }
      const ms = t + dt * 1000;
      path.push([x, y, ms]);
      return { path, end: { lng: x, lat: y, ms, fate: 'beached' } };
    }
    x = nx;
    y = ny;
    t += dt * 1000;
    path.push([x, y, t]);
  }
  return { path, end: { lng: x, lat: y, ms: t, fate: 'adrift' } };
}

export interface Seed {
  lng: number;
  lat: number;
  /** When it was seen, epoch ms. */
  ms: number;
  /** How much was seen there (e.g. detected area, km²). */
  amount: number;
}

export interface Beach {
  name: string;
  lngLat: readonly [number, number];
}

export interface Landing {
  beach: string;
  ms: number;
  amount: number;
  windage: number;
}

export interface BeachOutlook {
  name: string;
  /** Amount arriving on each day from `fromMs` (index 0 = the first 24 h), summed over members and divided by their number. */
  byDay: number[];
  /** First arrival in any member, epoch ms, or null. */
  firstMs: number | null;
  /** Share of windage members that bring any mats here in the window, 0..1. */
  agreement: number;
}

/** Nearest beach within `radiusM` of a point, or null. */
export function nearestBeach(beaches: readonly Beach[], lng: number, lat: number, radiusM: number): Beach | null {
  let best: Beach | null = null, bd = radiusM;
  for (const b of beaches) {
    const d = Math.hypot((b.lngLat[0] - lng) * M_PER_DEG_LNG * Math.cos(lat * RAD), (b.lngLat[1] - lat) * M_PER_DEG_LAT);
    if (d <= bd) (bd = d), (best = b);
  }
  return best;
}

/**
 * Drift every seed with each windage from its sighting until `untilMs`, and collect where the beached
 * ones land. Mats that beach before `fromMs` (already ashore by now) still count, on day 0.
 */
export function forecastLandings(seeds: readonly Seed[], beaches: readonly Beach[], env: DriftEnv, untilMs: number, radiusM = 8000, windages: readonly number[] = WINDAGES): { landings: Landing[]; tracks: { windage: number; path: [number, number, number][]; end: DriftEnd }[] } {
  const landings: Landing[] = [];
  const tracks: { windage: number; path: [number, number, number][]; end: DriftEnd }[] = [];
  for (const s of seeds)
    for (const w of windages) {
      const r = drift(s.lng, s.lat, s.ms, untilMs, w, env);
      tracks.push({ windage: w, ...r });
      if (r.end.fate !== 'beached') continue;
      const b = nearestBeach(beaches, r.end.lng, r.end.lat, radiusM);
      if (b) landings.push({ beach: b.name, ms: r.end.ms, amount: s.amount, windage: w });
    }
  return { landings, tracks };
}

/** Per-beach outlook for `days` days from `fromMs`. */
export function beachOutlook(landings: readonly Landing[], beaches: readonly Beach[], fromMs: number, days = 5, windages: readonly number[] = WINDAGES): BeachOutlook[] {
  return beaches.map((b) => {
    const mine = landings.filter((l) => l.beach === b.name && l.ms < fromMs + days * 864e5);
    const byDay = Array.from({ length: days }, () => 0);
    for (const l of mine) byDay[Math.max(0, Math.floor((l.ms - fromMs) / 864e5))] += l.amount / windages.length;
    const members = new Set(mine.map((l) => l.windage));
    const future = mine.map((l) => l.ms);
    return { name: b.name, byDay, firstMs: future.length ? Math.min(...future) : null, agreement: members.size / windages.length };
  });
}

export type SargLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
/**
 * Level from the weed area arriving at one beach in a day, km² (sargassum mats run a few kg per m², so
 * 0.1 km² is a few hundred tonnes). Uncalibrated round numbers; calibration against beach reports is
 * future work.
 */
export const SARG_LEVELS = { low: 0.01, moderate: 0.1, high: 0.5 } as const;
export const sargLevel = (km2: number): SargLevel => (km2 >= SARG_LEVELS.high ? 'HIGH' : km2 >= SARG_LEVELS.moderate ? 'MODERATE' : km2 >= SARG_LEVELS.low ? 'LOW' : 'NONE');

/** A regular grid of vectors, row 0 north (structurally physics/flow.ts VectorField). */
export interface UVGrid {
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
  u: ArrayLike<number>;
  v: ArrayLike<number>;
}

/**
 * Vector at a point for drifting things: bilinear over the corners that have data (renormalised),
 * else the mean of the cells with data within `reach` cells, else zero. A mat between the model's
 * last sea cell and the beach still moves with the wind instead of stopping. False only outside the grid.
 */
export function sampleDrift(f: UVGrid, lng: number, lat: number, out: [number, number], reach = 2): boolean {
  const fx = (lng - f.lon0) / f.dlon, fy = (f.lat0 - lat) / f.dlat;
  if (!(fx >= -0.5 && fx <= f.cols - 0.5 && fy >= -0.5 && fy <= f.rows - 0.5)) return false;
  const c = Math.max(0, Math.min(Math.floor(fx), f.cols - 2)), r = Math.max(0, Math.min(Math.floor(fy), f.rows - 2));
  const tx = Math.max(0, Math.min(1, fx - c)), ty = Math.max(0, Math.min(1, fy - r));
  let su = 0, sv = 0, sw = 0;
  const corner = (i: number, w: number) => {
    if (w > 0 && Number.isFinite(f.u[i]) && Number.isFinite(f.v[i])) (su += f.u[i] * w), (sv += f.v[i] * w), (sw += w);
  };
  const i = r * f.cols + c, j = i + f.cols;
  corner(i, (1 - tx) * (1 - ty));
  corner(i + 1, tx * (1 - ty));
  corner(j, (1 - tx) * ty);
  corner(j + 1, tx * ty);
  if (sw > 1e-6) {
    out[0] = su / sw;
    out[1] = sv / sw;
    return true;
  }
  const rc = Math.round(fy), cc = Math.round(fx);
  let n = 0;
  su = sv = 0;
  for (let rr = Math.max(0, rc - reach); rr <= Math.min(f.rows - 1, rc + reach); rr++)
    for (let c2 = Math.max(0, cc - reach); c2 <= Math.min(f.cols - 1, cc + reach); c2++) {
      const k = rr * f.cols + c2;
      if (Number.isFinite(f.u[k]) && Number.isFinite(f.v[k])) (su += f.u[k]), (sv += f.v[k]), n++;
    }
  out[0] = n ? su / n : 0;
  out[1] = n ? sv / n : 0;
  return true;
}
