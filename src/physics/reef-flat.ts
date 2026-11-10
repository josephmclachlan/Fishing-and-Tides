/**
 * Waves over reef flats (PLAN 7.59). Pure: no DOM, SI units.
 *
 * A fringing reef breaks the swell at its crest; what crosses the flat behind it is held to the
 * height that the shallow water on the flat can carry, whatever arrived outside. So a beach behind a
 * reef flat meets small waves while the open beach next door meets the full breaker. The 15″ depth
 * grid (~460 m) can't see a flat a few hundred metres wide, but the Allen Coral Atlas maps it at 5 m.
 *
 *   Height on the flat     Ht = γf · (dr + η + ηs)                  Nelson (1994), Gourlay (1994)
 *                          γf = 0.55, the largest H/h that stable waves hold over a near-horizontal bed
 *                          dr  flat depth below mean sea level (REEF_FLAT_DEPTH_M, assumed)
 *                          η   tide above mean sea level
 *                          ηs  wave setup on the flat = 0.15 · H0′ (0.1 to 0.2 of the incident height on
 *                              fringing reefs: Vetter et al. 2010, Becker et al. 2014)
 *   Surf beat (PLAN 7.60)  Hig = 0.2 · H0′                           Masselink et al. (2019)
 *                          long (infragravity, 25 s to minutes) surges made where the swell breaks on the reef
 *                          slope; the flat's depth doesn't hold them back and they grow with the swell. Over a
 *                          platform they average 20 to 30% of the incident height when its water depth is −0.25
 *                          to 0.75 of the incident height, which a 0.5 m flat is in any swell over 0.7 m;
 *                          0.2 is the low end. It is why reef flats still get rough on big days.
 *   Through the flat       Hf = √(Ht² + Hig²)                       the short and the long waves' energies add
 *   At the beach           Hs = √((1 − f) Hb² + f · min(Hb, Hf)²)   energies of the open and the reef-covered
 *                          share of the beach's approach f add (H² is energy)
 *
 * The reef acts as a low-pass filter on wave height (Lowe et al. 2005): it only changes anything once
 * the breaker outside is bigger than Ht. The share f is a fan of lines from the pin out to sea, ±45°
 * about the shore normal: a line is covered when it crosses at least MIN_FLAT_M of unbroken reef crest
 * or flat before 1.5 km; lines that run into land again (a headland) carry no waves and are left out.
 *
 * The surf reading stays the breaker outside, where surfers ride it; this is what a swimmer or
 * snorkeller meets at the water's edge. Rips stay on the breaker outside too: at a reef, the water
 * the breaking crest pumps over the flat drains out through the channels.
 *
 * References: Nelson (1994) Coastal Engineering 23, 43–59; Gourlay (1994) Coastal Engineering 23,
 * 17–42; Lowe et al. (2005) JGR 110, C04001; Vetter et al. (2010) JGR 115, C12066; Becker et al.
 * (2014) Coral Reefs 33, 1155–1163; Quataert et al. (2015) GRL 42, 6407–6415; Masselink et al. (2019)
 * JGR Oceans 124, 1410–1433.
 */
import type { FeatureCollection } from 'geojson';
import type { DepthFn } from './refraction';

/** Largest stable height-to-depth ratio over a flat bed (Nelson 1994). */
export const GAMMA_FLAT = 0.55;
/**
 * Reef flat depth below mean sea level, m. ASSUMED: the Atlas maps where the flats are, not how deep, and
 * there are no soundings here. Flats on this coast lie near low water (Limón's lowest tide is 0.29 m below
 * mean sea level), so half a metre is a working figure to check on the reef.
 */
export const REEF_FLAT_DEPTH_M = 0.5;
/** Wave setup on the flat as a share of the incident (refracted) height. */
export const SETUP_RATIO = 0.15;
/** Surf beat (infragravity) height on the flat as a share of the incident (refracted) height (Masselink et al. 2019: 0.2 to 0.3). */
export const IG_RATIO = 0.2;
/**
 * A line counts as covered only where it crosses at least this much unbroken flat, m: about three wavelengths of a
 * 10 s swell on a 2 m flat (L = T√(gh) ≈ 44 m), what breaking waves need to settle to the flat's limit. Narrower
 * flats let more through (Quataert et al. 2015: reef-flat width is the main control on what reaches the shore).
 * Narrow bands hugging a sand beach (Playa Cocles) are also where the Atlas can read a surf zone's foam and rubble
 * as flat; leaving them out errs on the safe side, since telling a swimmer the surf is smaller than it is is the
 * dangerous mistake.
 */
export const MIN_FLAT_M = 150;
/** Water gaps up to this wide inside a flat (a channel, a pool) don't break it, m. */
export const MAX_GAP_M = 20;
/** How far out from the pin the lines look for a flat, m. */
export const REACH_M = 1500;
/** Half-width of the fan about the shore normal, degrees, and its step. */
export const FAN_HALF_DEG = 45;
export const FAN_STEP_DEG = 2.5;
/** Step along each line, m (the Atlas pixel is 5 m; flats are tens to hundreds of metres across). */
export const STEP_M = 10;

/** Allen Coral Atlas geomorphic classes where the swell has broken and the bed is near the surface. */
export const FLAT_CLASSES: ReadonlySet<string> = new Set(['REEF CREST', 'OUTER REEF FLAT', 'INNER REEF FLAT', 'TERRESTRIAL REEF FLAT']);

/** A polygon as [lng, lat] rings, the first the outline and the rest holes. */
export type Rings = [number, number][][];

export interface FlatIndex {
  polys: { rings: Rings; w: number; s: number; e: number; n: number }[];
}

const RAD = Math.PI / 180;
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320;

/** Index reef-flat polygons by their bounding boxes. */
export function flatIndex(polys: readonly Rings[]): FlatIndex {
  return {
    polys: polys
      .filter((r) => r.length && r[0].length >= 3)
      .map((rings) => {
        let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
        for (const [x, y] of rings[0]) (w = Math.min(w, x)), (e = Math.max(e, x)), (s = Math.min(s, y)), (n = Math.max(n, y));
        return { rings, w, s, e, n };
      }),
  };
}

/**
 * The reef-flat polygons out of the seafloor's Allen Coral Atlas layer (properties { layer: 'zone', cls }),
 * as plain rings so they can go to the physics worker.
 */
export function flatPolygons(fc: FeatureCollection): Rings[] {
  const out: Rings[] = [];
  for (const f of fc.features) {
    const p = f.properties ?? {};
    if (p.layer !== 'zone' || !FLAT_CLASSES.has(String(p.cls)) || !f.geometry) continue;
    if (f.geometry.type === 'Polygon') out.push(f.geometry.coordinates as Rings);
    else if (f.geometry.type === 'MultiPolygon') out.push(...(f.geometry.coordinates as Rings[]));
  }
  return out;
}

function inRing(x: number, y: number, ring: readonly [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is the point on a mapped reef flat (inside an outline and outside its holes)? */
export function onFlat(idx: FlatIndex, lng: number, lat: number): boolean {
  for (const p of idx.polys) {
    if (lng < p.w || lng > p.e || lat < p.s || lat > p.n) continue;
    if (!inRing(lng, lat, p.rings[0])) continue;
    if (!p.rings.slice(1).some((h) => inRing(lng, lat, h))) return true;
  }
  return false;
}

export interface ReefShelter {
  /** Share of the beach's open approach (0..1) that crosses a reef flat. */
  share: number;
  /** Lines in the fan that reach the sea, and how many of them cross a flat. */
  open: number;
  covered: number;
}

/**
 * How much of the water in front of a shoreline pin lies behind a mapped reef flat. `depth` is the
 * seafloor (> 0 = water, from the land mask near the coast); `normalDeg` the seaward shore normal.
 */
export function reefShelter(idx: FlatIndex, depth: DepthFn, pin: [number, number], normalDeg: number): ReefShelter {
  let open = 0;
  let covered = 0;
  if (!idx.polys.length) return { share: 0, open: 0, covered: 0 };
  const mx = M_PER_DEG_LNG * Math.cos(pin[1] * RAD);
  for (let a = -FAN_HALF_DEG; a <= FAN_HALF_DEG; a += FAN_STEP_DEG) {
    const b = (normalDeg + a) * RAD;
    const dx = Math.sin(b) / mx;
    const dy = Math.cos(b) / M_PER_DEG_LAT;
    let wet = false;
    let blocked = false;
    let run = 0; // the flat being crossed, m, with gaps up to MAX_GAP_M bridged
    let gap = 0;
    let longest = 0;
    for (let d = STEP_M; d <= REACH_M; d += STEP_M) {
      const x = pin[0] + dx * d;
      const y = pin[1] + dy * d;
      const water = depth(x, y) > 0;
      // A terrestrial flat touches the beach: the land mask can mark its inner edge as land.
      if (onFlat(idx, x, y)) {
        if (water) wet = true;
        run += gap + STEP_M;
        gap = 0;
        longest = Math.max(longest, run);
        continue;
      }
      if (water) {
        wet = true;
        if (run > 0 && (gap += STEP_M) > MAX_GAP_M) (run = 0), (gap = 0);
      } else if (wet) {
        blocked = true;
        break;
      }
    }
    if (blocked || !wet) continue;
    open++;
    if (longest >= MIN_FLAT_M) covered++;
  }
  return { share: open ? covered / open : 0, open, covered };
}

/**
 * Height that gets through the flat, m: the short waves the water on it can carry, γf (dr + η + ηs), and the surf
 * beat the breaking makes, IG_RATIO · H0′, their energies added. `incidentM` is the refracted height arriving at the reef.
 */
export function flatHeight(tideM: number, incidentM: number, flatDepthM = REEF_FLAT_DEPTH_M): number {
  const h0 = Math.max(0, incidentM);
  const short = GAMMA_FLAT * Math.max(0, flatDepthM + tideM + SETUP_RATIO * h0);
  return Math.hypot(short, IG_RATIO * h0);
}

/** Wave height at the beach from the breaker outside, the covered share and the flat's limit: energies add. */
export function shoreHeight(Hb: number, share: number, Ht: number): number {
  if (!(Hb > 0)) return 0;
  const f = Math.min(1, Math.max(0, share));
  const inside = Math.min(Hb, Math.max(0, Ht));
  return Math.sqrt((1 - f) * Hb * Hb + f * inside * inside);
}
