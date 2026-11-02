/** Gandoca to Limón, Costa Rica Caribbean coast. Single source of truth for region geometry. */
export const REGION = {
  name: 'GANDOCA–LIMÓN',
  center: [-82.83, 9.79] as [number, number],
  bounds: [[-83.25, 9.45], [-82.4, 10.1]] as [[number, number], [number, number]],
  // Analysed area: the western Caribbean the mock fields and coordinate search cover.
  maxBounds: [[-86, 7.5], [-79, 13]] as [[number, number], [number, number]],
  // How far the map may pan or pinch out: the analysed area plus a wide margin on every side, so
  // zooming out never hits a wall (the camera only stops well beyond the analysed area).
  viewBounds: [[-90, 4.5], [-75, 16]] as [[number, number], [number, number]],
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

/**
 * Geometry behind the mock wind and current fields (PLAN 1.4), until the wind (2.3) and
 * current (2.5) adapters land. [lng, lat]. Rough, for a plausible-looking flow only.
 */
export const MOCK_FLOW = {
  /** Point where the mock wind matches the HUD's mock reading (12 kt from 070°). */
  windRef: REGION.center,
  /** Caribbean coast from the San Juan mouth to Colón, north-west to south-east; the coastal current runs this way. */
  coast: [
    [-83.68, 10.93], [-83.52, 10.54], [-83.35, 10.31], [-83.07, 10.01], [-82.82, 9.74],
    [-82.75, 9.655], [-82.65, 9.635], [-82.56, 9.58], [-82.2, 9.42], [-81.75, 9.05],
    [-81.2, 8.83], [-80.6, 9.07], [-79.9, 9.36],
  ] as [number, number][],
  /** Panama–Colombia Gyre: cyclonic (anticlockwise), it turns the nearshore flow south-east along this coast. */
  gyre: { center: [-80.7, 10.9] as [number, number], radiusDeg: 1.6, speedMs: 0.3 },
  /** Offshore eddies for texture. Positive speed is anticlockwise. */
  eddies: [
    { center: [-82.25, 10.45] as [number, number], radiusDeg: 0.35, speedMs: -0.25 },
    { center: [-81.55, 10.05] as [number, number], radiusDeg: 0.3, speedMs: 0.22 },
    { center: [-83.0, 11.6] as [number, number], radiusDeg: 0.45, speedMs: 0.2 },
  ],
} as const;

/**
 * Tide reference station (PLAN 3.1): the UHSLC Limón gauge, the only tide gauge on this coast.
 * Its harmonics (src/data/tides-limon.ts) are used for the whole Gandoca–Limón stretch; see docs/TIDES.md.
 */
export const TIDE_STATION = { name: 'LIMÓN', uhslc: 268, lngLat: [-83.02038, 9.9887] as [number, number] } as const;

/**
 * The same gauge live on IOC Sea Level Monitoring (PLAN 2.11, docs/OBSERVATIONS.md): code `limon`,
 * radar sensor `rad`, 1-minute samples. Its radar zero sits 5.990 m below UHSLC's (fitted
 * 2026-09-20..30, r = 0.999), and UHSLC's mean sea level was 0.61 m in 2025–26 (fit trend
 * included), so mean sea level reads 6.60 m on the radar. Verify flags drift from that.
 */
export const LIVE_GAUGE = { code: 'limon', sensor: 'rad', mslOnSensorM: 6.6 } as const;

/** Limón International airport, the only weather station on the coast with a public feed (METAR, daytime only). */
export const METAR_STATION = { icao: 'MRLM', name: 'LIMÓN AIRPORT', lngLat: [-83.026, 9.961] as [number, number] } as const;
