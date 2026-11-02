/** Gandoca to Limón, Costa Rica Caribbean coast. Single source of truth for region geometry. */
export const REGION = {
  name: 'GANDOCA–LIMÓN',
  center: [-82.83, 9.79] as [number, number],
  bounds: [[-83.25, 9.45], [-82.4, 10.1]] as [[number, number], [number, number]],
  // Macro view may pan out to the western Caribbean.
  maxBounds: [[-86, 7.5], [-79, 13]] as [[number, number], [number, number]],
  initialZoom: 9.3,
};

/** Zoom tiers from DESIGN.md §5: MACRO below COAST, COAST from 8, SPOT from 12. */
export type Tier = 'MACRO' | 'COAST' | 'SPOT';
export const TIERS: readonly Tier[] = ['MACRO', 'COAST', 'SPOT'];
export const TIER_ZOOM = { COAST: 8, SPOT: 12 } as const;
/** Zoom distance past a tier edge needed to switch tier, so hovering on an edge doesn't flap. */
export const TIER_HYSTERESIS = 0.15;
/** Graticule spacing per tier, degrees. */
export const GRATICULE_STEP: Record<Tier, number> = { MACRO: 1, COAST: 0.1, SPOT: 0.01 };

export function tierForZoom(z: number): Tier {
  if (z < TIER_ZOOM.COAST) return 'MACRO';
  if (z < TIER_ZOOM.SPOT) return 'COAST';
  return 'SPOT';
}

/** Named coastal spots, [lng, lat] (MapLibre order). Keep each on the shoreline (verified 2026-11-02 against OpenFreeMap z14 water polygons; each pin is on land within ~30 m of the coast). */
export const SPOTS: { name: string; lngLat: [number, number] }[] = [
  { name: 'LIMÓN', lngLat: [-83.0235, 9.9927] },
  { name: 'PLAYA BONITA', lngLat: [-83.0634, 10.0099] },
  { name: 'CAHUITA', lngLat: [-82.84, 9.7397] },
  { name: 'PLAYA NEGRA', lngLat: [-82.7789, 9.6633] },
  { name: 'SALSA BRAVA', lngLat: [-82.7522, 9.6563] },
  { name: 'PUNTA UVA', lngLat: [-82.6862, 9.6427] },
  { name: 'MANZANILLO', lngLat: [-82.6569, 9.634] },
  { name: 'GANDOCA', lngLat: [-82.6139, 9.6065] },
];

/** Seafloor layer (PLAN 2.6). Depths in metres, positive down. */
export const SEAFLOOR = {
  /** Contours from the 1′ grid over the whole Caribbean view. */
  macroContours: [200, 500, 1000, 2000, 3000, 4000],
  /** Contours from the 15″ grid inside REGION.bounds, shown from the coast tier. */
  coastContours: [5, 10, 20, 30, 50, 100, 200],
  /** Contours drawn brighter and labelled first; the rest are dashed minors. */
  majorContours: [10, 50, 100, 200, 1000, 2000, 3000],
  /** Minor coast contours (5, 20, 30 m) appear from this zoom. */
  minorZoom: 10.5,
  /** Shading band edges, shallow to deep. */
  bands: [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 3000],
  /** Opacity of each band (bands.length + 1): shallow water reads brightest. */
  bandAlphas: [0.3, 0.25, 0.21, 0.17, 0.14, 0.11, 0.085, 0.065, 0.05, 0.038, 0.028],
} as const;
