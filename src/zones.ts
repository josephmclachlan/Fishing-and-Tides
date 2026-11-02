/**
 * Protected-zone helpers (PLAN 4.3). Pure: no DOM, no network.
 * `stitchRings` joins the unordered boundary ways of an OSM multipolygon into closed rings
 * (also used by scripts/fetch-zones.ts, hence no imports). Point lookup is in zone-lookup.ts.
 */
export type LngLat = [number, number];

/** What the rules mean for fishing, in the HUD's two alert tones. */
export type ZoneStatus = 'closed' | 'restricted';

export interface ZoneProps {
  /** Stable id; text comes from i18n `zone.<id>.name`. */
  id: string;
  status: ZoneStatus;
  /** SINAC's code for the area, e.g. P16. */
  ref: string;
  /** IUCN protected area category as tagged in OSM. */
  iucn: string;
}

/**
 * Join way fragments end to end into closed rings. Ways may be listed in any order and
 * either direction. Fragments that never close are dropped.
 */
export function stitchRings(ways: readonly LngLat[][]): LngLat[][] {
  const same = (a: LngLat, b: LngLat) => a[0] === b[0] && a[1] === b[1];
  const pool = ways.filter((w) => w.length > 1).map((w) => w.slice());
  const rings: LngLat[][] = [];
  while (pool.length) {
    const ring = pool.pop()!;
    for (let grew = true; grew && !same(ring[0], ring[ring.length - 1]); ) {
      grew = false;
      const end = ring[ring.length - 1];
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i];
        if (same(w[0], end)) ring.push(...w.slice(1));
        else if (same(w[w.length - 1], end)) ring.push(...w.slice(0, -1).reverse());
        else continue;
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}
