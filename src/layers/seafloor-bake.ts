/**
 * The heavy, pure part of the seafloor layer (PLAN 2.6, moved off the main thread in 5.4): the
 * two depth-shading rasters and the smoothed contours. No DOM and no MapLibre, so it runs in
 * seafloor-worker.ts; `bakeSeafloor` in seafloor.ts falls back to calling it in-thread.
 */
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { SEAFLOOR } from '../region';
import { cellAt, chaikin, clipLines, contour, gridBounds, type Grid } from '../physics/bathy';
import { renderShade, type ShadeImage } from './seafloor-shade';

/** Smoothed depth contours as GeoJSON lines with { d, major }. */
export function contourLines(g: Grid, depths: readonly number[], grid: 'macro' | 'coast', land?: Grid): Feature<LineString>[] {
  const major = new Set<number>(SEAFLOOR.majorContours);
  const out: Feature<LineString>[] = [];
  for (const d of depths)
    for (const raw of contour(g, -d)) {
      if (raw.length < 4) continue; // single-cell blips
      // The depth grid's cells are ~460 m, so its shallow contours can cross a headland: cut them at the OSM coastline.
      const smooth = chaikin(raw, 2);
      const pieces = land ? clipLines([smooth], (p) => cellAt(land, p[0], p[1]) !== 1, land.dlon) : [smooth];
      for (const line of pieces) {
        const coordinates = line.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
        out.push({ type: 'Feature', properties: { d, major: major.has(d), grid }, geometry: { type: 'LineString', coordinates } });
      }
    }
  return out;
}

export interface BakeInput {
  macro: Grid;
  region: Grid;
  land: Grid;
  /** Shade colour, 0..255 (the theme green). */
  rgb: [number, number, number];
}

export interface Baked {
  macro: ShadeImage;
  region: ShadeImage;
  contours: FeatureCollection;
}

export function bake({ macro, region, land, rgb }: BakeInput): Baked {
  const opts = { edges: SEAFLOOR.bands, alphas: SEAFLOOR.bandAlphas, rgb };
  return {
    macro: renderShade(macro, { ...opts, width: 1400, hole: gridBounds(region), relief: 12 }),
    // ~45 m pixels, so the land mask keeps the shading off the beach down to the spot tier.
    region: renderShade(region, { ...opts, width: 2000, land, relief: 6 }),
    contours: { type: 'FeatureCollection', features: [...contourLines(macro, SEAFLOOR.macroContours, 'macro'), ...contourLines(region, SEAFLOOR.coastContours, 'coast', land)] },
  };
}
