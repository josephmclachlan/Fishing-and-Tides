/**
 * Fishing zones (PLAN 7.74, mockup G's circled bite zones): the best fishing water of all the edible species, gathered
 * into a handful of ovals, each named with the fish to try there. Pure: no DOM.
 *
 *   1. A cell counts when its best species score (habitat × season) is at least `minScore`.
 *   2. Greedy gathering, best cell first: a cell not yet taken seeds a zone and takes every free counted cell within
 *      `radiusKm` of it. Zones with fewer than `minCells` cells are dropped.
 *   3. Each zone is an ellipse over its cells, score-weighted: centre the weighted mean, axes along the principal
 *      directions of the weighted covariance, half-axes `SIGMAS` standard deviations plus half a cell, and no less
 *      than `MIN_RX_M` by `MIN_RY_M` (so one row of cells along the coast still gets a visible oval).
 *   4. Its fish are the species with the best mean score there (at most two, each within 85 % of the best one), its
 *      level the mean best score (3 from 0.75, 2 from 0.6, else 1), its reason the structure most of its cells share.
 *   5. Zones are ranked by size × quality, Σ(best − minScore + 0.1), and kept at least `sepKm` apart.
 */

export type ZoneWhy = 'mouth' | 'reef' | 'drop' | 'front' | 'weed';
const WHYS: readonly ZoneWhy[] = ['mouth', 'reef', 'front', 'weed', 'drop'];

export interface ZoneCell<S extends string = string> {
  lng: number;
  lat: number;
  /** Score 0..1 per species (habitat × season), already filtered to the reach. */
  s: Readonly<Record<S, number>>;
  why: readonly ZoneWhy[];
  depthM: number;
}

export interface Zone<S extends string = string> {
  lng: number;
  lat: number;
  /** Half-axes, m: `rxM` along the major axis. */
  rxM: number;
  ryM: number;
  /** Direction of the major axis, degrees counter-clockwise from east. */
  rotDeg: number;
  /** Best first, one or two. */
  species: S[];
  /** Mean best score of the zone's cells, 0..1. */
  score: number;
  level: 1 | 2 | 3;
  why: ZoneWhy | null;
  /** 10th and 90th percentile depth, m, rounded. */
  depthM: [number, number];
  cells: number;
}

export interface ZoneOptions {
  minScore: number;
  radiusKm: number;
  minCells: number;
  max: number;
  sepKm: number;
  /** Cell spacing, m: half of it pads each half-axis. */
  cellM: number;
}

export const ZONE_DEFAULTS: ZoneOptions = { minScore: 0.55, radiusKm: 1.1, minCells: 4, max: 12, sepKm: 1.6, cellM: 220 };
/** Half-axes in standard deviations of the cells' spread, and the least they can be, m (so a thin strip still reads as a zone). */
export const SIGMAS = 1.8;
export const MIN_RX_M = 450, MIN_RY_M = 280;
const M_LAT = 110574;
const M_LNG = 111320;

/** Great from 0.8, good from 0.7, else fair (the beach rating's words). */
export const levelOf = (score: number): 1 | 2 | 3 => (score >= 0.8 ? 3 : score >= 0.7 ? 2 : 1);

const kmBetween = (a: { lng: number; lat: number }, b: { lng: number; lat: number }) =>
  Math.hypot((a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180) * M_LNG, (a.lat - b.lat) * M_LAT) / 1000;

const bestOf = (s: Readonly<Record<string, number>>) => {
  let b = 0;
  for (const k in s) b = Math.max(b, s[k]);
  return b;
};

const pct = (xs: number[], p: number) => {
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))];
};

export function fishZones<S extends string>(cells: readonly ZoneCell<S>[], opt: Partial<ZoneOptions> = {}): Zone<S>[] {
  const o = { ...ZONE_DEFAULTS, ...opt };
  const kept = cells.map((c) => ({ c, b: bestOf(c.s) })).filter((x) => x.b >= o.minScore).sort((a, b) => b.b - a.b);
  const taken = new Uint8Array(kept.length);
  const groups: (typeof kept)[] = [];
  for (let i = 0; i < kept.length; i++) {
    if (taken[i]) continue;
    const g: typeof kept = [];
    for (let j = i; j < kept.length; j++) if (!taken[j] && kmBetween(kept[i].c, kept[j].c) <= o.radiusKm) (taken[j] = 1), g.push(kept[j]);
    if (g.length >= o.minCells) groups.push(g);
  }

  const zones = groups.map((g) => {
    // Weighted centre and covariance in local metres.
    let W = 0, x0 = 0, y0 = 0;
    for (const { c, b } of g) (W += b), (x0 += b * c.lng), (y0 += b * c.lat);
    const lng = x0 / W, lat = y0 / W, k = Math.cos((lat * Math.PI) / 180) * M_LNG;
    let sxx = 0, syy = 0, sxy = 0;
    for (const { c, b } of g) {
      const dx = (c.lng - lng) * k, dy = (c.lat - lat) * M_LAT;
      (sxx += b * dx * dx), (syy += b * dy * dy), (sxy += b * dx * dy);
    }
    (sxx /= W), (syy /= W), (sxy /= W);
    // Eigen of [[sxx, sxy], [sxy, syy]].
    const tr = (sxx + syy) / 2, d = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
    const l1 = tr + d, l2 = Math.max(0, tr - d);
    const rot = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const pad = o.cellM / 2;
    // Species: mean score over the zone's cells.
    const ids = Object.keys(g[0].c.s) as S[];
    const mean = ids.map((id) => ({ id, m: g.reduce((a, x) => a + x.c.s[id], 0) / g.length })).sort((a, b) => b.m - a.m);
    const species = mean.filter((x, i) => i < 2 && x.m >= mean[0].m * 0.85 && x.m > 0).map((x) => x.id);
    const score = g.reduce((a, x) => a + x.b, 0) / g.length;
    // The structure most cells share: mouth, reef, front, weed, then drop when tied.
    const n = { mouth: 0, reef: 0, drop: 0, front: 0, weed: 0 } as Record<ZoneWhy, number>;
    for (const { c } of g) for (const w of c.why) n[w]++;
    const top = WHYS.reduce<ZoneWhy | null>((a, w) => (n[w] >= 0.4 * g.length && (!a || n[w] > n[a]) ? w : a), null);
    const depths = g.map((x) => x.c.depthM);
    const zone: Zone<S> = {
      lng,
      lat,
      rxM: Math.max(MIN_RX_M, SIGMAS * Math.sqrt(l1) + pad),
      ryM: Math.max(MIN_RY_M, SIGMAS * Math.sqrt(l2) + pad),
      rotDeg: (rot * 180) / Math.PI,
      species,
      score,
      level: levelOf(score),
      why: top,
      depthM: [Math.round(pct(depths, 0.1)), Math.round(pct(depths, 0.9))],
      cells: g.length,
    };
    return { zone, rank: g.reduce((a, x) => a + x.b - o.minScore + 0.1, 0) };
  });

  const out: Zone<S>[] = [];
  for (const { zone } of zones.sort((a, b) => b.rank - a.rank)) {
    if (out.length >= o.max) break;
    if (out.some((z) => kmBetween(z, zone) < o.sepKm)) continue;
    out.push(zone);
  }
  return out;
}

/**
 * The zone's outline as a closed ring of [lng, lat], `n` points. With `isWater`, each point is pulled back toward the
 * centre until it is in the sea (in 10 % steps, no closer than 30 %), so an oval beside the beach stops at the shore.
 */
export function zoneRing(z: Zone, n = 48, isWater?: (lng: number, lat: number) => boolean): [number, number][] {
  const k = Math.cos((z.lat * Math.PI) / 180) * M_LNG;
  const r = (z.rotDeg * Math.PI) / 180, cr = Math.cos(r), sr = Math.sin(r);
  const at = (t: number, f: number): [number, number] => {
    const ex = z.rxM * Math.cos(t) * f, ey = z.ryM * Math.sin(t) * f;
    return [z.lng + (ex * cr - ey * sr) / k, z.lat + (ex * sr + ey * cr) / M_LAT];
  };
  const ring: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    let f = 1;
    if (isWater) while (f > 0.3 && !isWater(...at(t, f))) f -= 0.1;
    ring.push(at(t, f));
  }
  ring.push(ring[0]);
  return ring;
}

export type LabelAnchor = 'left' | 'bottom-left' | 'bottom' | 'bottom-right' | 'right' | 'top-right' | 'top' | 'top-left';
const ANCHORS: readonly LabelAnchor[] = ['left', 'bottom-left', 'bottom', 'bottom-right', 'right', 'top-right', 'top', 'top-left'];
/** The em offset that moves text a little off its anchor point, outward, per anchor. */
export const ANCHOR_OFFSET: Readonly<Record<LabelAnchor, [number, number]>> = {
  left: [0.5, 0], 'bottom-left': [0.35, -0.35], bottom: [0, -0.5], 'bottom-right': [-0.35, -0.35], right: [-0.5, 0], 'top-right': [-0.35, 0.35], top: [0, 0.5], 'top-left': [0.35, 0.35],
};

/**
 * Where a zone's name goes: just outside its oval on the seaward side, so the name sits on open sea and not over the
 * beach and its rating tiles. Seaward is the mean direction of the sea around the zone (16 bearings at 1.5 × the long
 * half-axis, at least 1.2 km); with no land around it, above the oval. The anchor puts the text beyond that point.
 */
export function zoneLabel(z: Zone, ring: readonly [number, number][], isWater?: (lng: number, lat: number) => boolean): { at: [number, number]; anchor: LabelAnchor } {
  const k = Math.cos((z.lat * Math.PI) / 180) * M_LNG;
  let ux = 0, uy = 1;
  if (isWater) {
    const r = Math.max(1200, 1.5 * z.rxM);
    let sx = 0, sy = 0, wet = 0;
    for (let i = 0; i < 16; i++) {
      const a = (2 * Math.PI * i) / 16, cx = Math.cos(a), cy = Math.sin(a);
      if (isWater(z.lng + (cx * r) / k, z.lat + (cy * r) / M_LAT)) (sx += cx), (sy += cy), wet++;
    }
    const n = Math.hypot(sx, sy);
    if (wet < 16 && n > 1e-6) (ux = sx / n), (uy = sy / n);
  }
  // How far the outline reaches along the seaward direction, m.
  let far = 0;
  for (const p of ring) far = Math.max(far, (p[0] - z.lng) * k * ux + (p[1] - z.lat) * M_LAT * uy);
  const deg = (Math.atan2(uy, ux) * 180) / Math.PI;
  const anchor = ANCHORS[((Math.round(deg / 45) % 8) + 8) % 8];
  return { at: [z.lng + (ux * far) / k, z.lat + (uy * far) / M_LAT], anchor };
}

export interface SpeciesZoneOptions extends ZoneOptions {
  /** A zone earns its circle only when its mean score reaches this. */
  minMean: number;
  /** At most this many zones per species, best first. */
  perSpecies: number;
  /** Zones of different species closer than this, km (or with one centre inside the other oval), share one oval. */
  mergeKm: number;
  /** At most this many names on one oval. */
  maxNames: number;
}

/** Shore and kayak water (PLAN 7.74b, Joseph 2026-11-11): 220 m cells. */
export const NEAR_ZONES: SpeciesZoneOptions = { ...ZONE_DEFAULTS, minScore: 0.6, minMean: 0.65, perSpecies: 3, mergeKm: 0.7, maxNames: 3, max: 12 };
/** Boat water: ~2 km cells, gathered over 6 km. */
export const FAR_ZONES: SpeciesZoneOptions = { minScore: 0.65, radiusKm: 6, minCells: 3, max: 6, sepKm: 6, cellM: 2000, minMean: 0.7, perSpecies: 2, mergeKm: 5, maxNames: 3 };

const inside = (z: Zone, p: { lng: number; lat: number }) => {
  const k = Math.cos((z.lat * Math.PI) / 180) * M_LNG, r = (z.rotDeg * Math.PI) / 180;
  const dx = (p.lng - z.lng) * k, dy = (p.lat - z.lat) * M_LAT;
  const u = dx * Math.cos(r) + dy * Math.sin(r), v = -dx * Math.sin(r) + dy * Math.cos(r);
  return (u / z.rxM) ** 2 + (v / z.ryM) ** 2 <= 1;
};

/**
 * Every species gets its own zones (Joseph 2026-11-11: "all the species selected at once, with each species getting
 * zones ... only when they warrant/earn that spot"): `fishZones` per species at `minScore`, kept when the zone's mean
 * reaches `minMean`, at most `perSpecies` each. Where two species' zones are the same water (centres within `mergeKm`,
 * or one centre inside the other oval) they share the better zone's oval, names best first. Pure.
 */
export function speciesZones<S extends string>(cells: readonly ZoneCell<S>[], ids: readonly S[], opt: SpeciesZoneOptions): Zone<S>[] {
  const all: Zone<S>[] = [];
  for (const id of ids) {
    const one = cells.map((c) => ({ ...c, s: { [id]: c.s[id] ?? 0 } as Record<S, number> }));
    all.push(...fishZones(one, { ...opt, max: opt.perSpecies * 4 }).filter((z) => z.score >= opt.minMean).slice(0, opt.perSpecies));
  }
  const out: Zone<S>[] = [];
  for (const z of all.sort((a, b) => b.score - a.score)) {
    const host = out.find((o) => kmBetween(o, z) < opt.mergeKm || inside(o, z) || inside(z, o));
    if (!host) out.push({ ...z, species: [...z.species] });
    else for (const id of z.species) if (!host.species.includes(id) && host.species.length < opt.maxNames) host.species.push(id);
  }
  return out;
}
