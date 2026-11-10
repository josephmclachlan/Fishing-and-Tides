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
  /** Resting view: centred on Playa Cocles, framing every activity from Punta Mona (south) to Punta Cahuita (north). */
  home: {
    center: [-82.7368, 9.6507] as [number, number],
    /** Half-height in degrees of latitude kept on screen each side of the centre (Cahuita is ~0.09° north; Gandoca ~0.04° south). */
    halfLat: 0.1,
  },
  /** Costa Rica is UTC-6 all year (no daylight saving). Used for local sun, moon and solunar days. */
  tzOffsetH: -6,
};

/** Zoom tiers from DESIGN.md §5: MACRO below COAST, COAST from 8, SPOT from 12. */
/** Box the lightning collector keeps flashes from: the region plus 3° (~330 km) so storms can be seen coming. [[west, south], [east, north]] */
export const LIGHTNING_BOUNDS: [[number, number], [number, number]] = [
  [REGION.bounds[0][0] - 3, REGION.bounds[0][1] - 3],
  [REGION.bounds[1][0] + 3, REGION.bounds[1][1] + 3],
];

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

/** Named coastal spots, [lng, lat] (MapLibre order). Keep each on the shoreline (re-checked 2026-11-02 against OpenFreeMap z14 `ocean` polygons, ignoring tile-edge segments; each pin is on land within ~20 m of the sea). */
export const SPOTS: { name: string; lngLat: [number, number] }[] = [
  { name: 'LIMÓN', lngLat: [-83.0235, 9.9927] },
  { name: 'PLAYA BONITA', lngLat: [-83.0634, 10.0099] },
  { name: 'CAHUITA', lngLat: [-82.84, 9.7397] },
  { name: 'PLAYA NEGRA', lngLat: [-82.7789, 9.6633] },
  { name: 'SALSA BRAVA', lngLat: [-82.7524, 9.6582] },
  { name: 'PLAYA COCLES', lngLat: [-82.7368, 9.6507] },
  { name: 'PLAYA CHIQUITA', lngLat: [-82.711, 9.6413] },
  { name: 'PUNTA UVA', lngLat: [-82.6871, 9.6432] },
  { name: 'PLAYA GRANDE', lngLat: [-82.6698, 9.6326] },
  { name: 'MANZANILLO', lngLat: [-82.6569, 9.634] },
  { name: 'GANDOCA', lngLat: [-82.6128, 9.6075] },
];

/**
 * Town rain points (PLAN 7.24): the four towns Joseph asked to tell apart, [lng, lat] at each town centre.
 * Cahuita and Puerto Viejo are ~13 km apart, so with 9-13 km models they land in neighbouring cells.
 */
export const RAIN_TOWNS: { id: string; name: string; lngLat: [number, number] }[] = [
  { id: 'cahuita', name: 'CAHUITA', lngLat: [-82.8303, 9.7353] },
  { id: 'playanegra', name: 'PLAYA NEGRA', lngLat: [-82.7789, 9.6633] },
  { id: 'puertoviejo', name: 'PUERTO VIEJO', lngLat: [-82.7543, 9.656] },
  { id: 'manzanillo', name: 'MANZANILLO', lngLat: [-82.6569, 9.634] },
];

/**
 * Rain-cell nowcast box (PLAN 7.24 item 3), [[w, s], [e, n]]: the coast plus ~60 km of sea to the east
 * and north, where the trade-wind showers come from, and the Talamanca foothills they run into.
 * 80 x 70 cells at 0.02°.
 */
export const RAIN_BOX: [[number, number], [number, number]] = [[-83.6, 9.1], [-82.0, 10.5]];

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

/**
 * Box the scatterometer wind passes cover (PLAN 2.14): the coast plus about 120 km of open sea, on
 * ASCAT's 0.125° grid. ASCAT sees no closer than ~20 km to land, so this is the wind just offshore.
 * [[west, south], [east, north]]
 */
export const SCAT_BOX: [[number, number], [number, number]] = [[-84, 8.75], [-81.5, 11]];

/**
 * Box the mixed-layer depth forecast covers (PLAN 7.18): the same coast plus open sea as the wind
 * passes, where a boat goes for the offshore fish, on the Copernicus global model's 1/12° grid.
 */
export const MLD_BOX: [[number, number], [number, number]] = SCAT_BOX;


/**
 * Box the sargassum detections cover (PLAN 7.1): far enough offshore that a mat seen there can
 * drift onto the coast within the 5-day forecast (~0.3 m/s for 5 days is ~130 km), on the AFAI
 * grid. [[west, south], [east, north]]
 */
export const SARG_BOX: [[number, number], [number, number]] = [[-84, 8.75], [-80.5, 11.5]];

/**
 * Coral reef areas for the coral heat-stress feed and the CORAL overlay (PLAN 7.23). Public reef areas
 * only, never restoration nurseries or outplant sites (the app is public). `lngLat` sits on the reef;
 * the build picks the nearest NOAA Coral Reef Watch 5 km sea pixel to it. Reefs from Cortés (1992),
 * Cortés & Risk (1984) and the Allen Coral Atlas. `river`: the plume that reaches it (PLUME_RIVERS), for
 * the sediment and runoff risk rows; the Estrella is the main sediment source for Cahuita (Cortés & Risk 1984).
 * `kdPixel`: centre of the 2 km VIIRS+OLCI Kd490 pixel read for MUD WEEKS (PLAN 7.39), the nearest to `lngLat`
 * with a value on at least 80% of days (pixels on the reef flat itself are often masked as land or shallow).
 */
export const CORAL_REEFS: { id: string; name: string; lngLat: [number, number]; river: string; kdPixel: [number, number] }[] = [
  { id: 'limon', name: 'LIMÓN · ISLA UVITA', lngLat: [-83.005, 9.995], river: 'RÍO BANANO', kdPixel: [-83.010414, 9.989583] },
  { id: 'cahuita', name: 'CAHUITA', lngLat: [-82.815, 9.745], river: 'RÍO ESTRELLA', kdPixel: [-82.822914, 9.739583] },
  { id: 'cocles', name: 'PUERTO VIEJO · COCLES', lngLat: [-82.735, 9.66], river: 'RÍO ESTRELLA', kdPixel: [-82.739586, 9.656247] },
  { id: 'punta-uva', name: 'PUNTA UVA', lngLat: [-82.685, 9.643], river: 'RÍO SIXAOLA', kdPixel: [-82.677086, 9.635411] },
  { id: 'manzanillo', name: 'MANZANILLO', lngLat: [-82.652, 9.636], river: 'RÍO SIXAOLA', kdPixel: [-82.65625, 9.635411] },
  { id: 'punta-mona', name: 'PUNTA MONA', lngLat: [-82.615, 9.628], river: 'RÍO SIXAOLA', kdPixel: [-82.614586, 9.635411] },
];

/** Box the coral heat-stress feed reads from Coral Reef Watch, on its 0.05° grid. [[west, south], [east, north]] */
export const CORAL_BOX: [[number, number], [number, number]] = [[-83.1, 9.55], [-82.55, 10.05]];

/**
 * Rivers whose plumes muddy the coast after rain (PLAN 6.1, DESIGN §6 dive row). Mouths from the
 * OSM waterways (data/fishing/mouths.geojson); `rainAt` is a point inside each catchment where the
 * clarity layer samples rainfall. Catchment areas are approximate published basin figures
 * (Sixaola is binational with Panama), good to about 20%: they only scale the plume size.
 * `flowAt`: where the river-flow feed asks GloFAS (~5 km cells). Asked at the mouth, the flood API
 * snaps to a coastal cell with no river for the Sixaola, Estrella and Banano and returns nothing
 * (found 2026-11-10). These are the main-stem cells a few km inland: today's flows of 276, 81 and 22 m³/s
 * match the catchment sizes at this coast's ~0.09 m³/s per km². The Bananito is too small for the grid;
 * its mouth cell answers (about 1.6 m³/s) and is kept.
 * `rainBox`: the 0.1° cells of NASA's IMERG satellite rain averaged over the catchment (PLAN 7.51),
 * [[west, south], [east, north]] on the grid's cell edges. Drawn by eye over each basin's rough extent
 * (Telire, Urén and Yorkín above the Sixaola; the Estrella valley; the Banano and Bananito hills behind
 * Limón), not traced from a basin outline: 28, 8, 2 and 1 cells, within about 20% of each area.
 */
export const PLUME_RIVERS: { name: string; mouth: [number, number]; catchmentKm2: number; rainAt: [number, number]; flowAt: [number, number]; rainBox: [[number, number], [number, number]] }[] = [
  { name: 'RÍO SIXAOLA', mouth: [-82.5649, 9.5724], catchmentKm2: 2890, rainAt: [-82.95, 9.45], flowAt: [-82.625, 9.525], rainBox: [[-83.3, 9.2], [-82.6, 9.6]] },
  { name: 'RÍO ESTRELLA', mouth: [-82.8922, 9.7927], catchmentKm2: 1000, rainAt: [-83.1, 9.68], flowAt: [-82.975, 9.775], rainBox: [[-83.3, 9.6], [-82.9, 9.8]] },
  { name: 'RÍO BANANO', mouth: [-82.9951, 9.9208], catchmentKm2: 210, rainAt: [-83.12, 9.88], flowAt: [-83.075, 9.925], rainBox: [[-83.2, 9.9], [-83.0, 10.0]] },
  { name: 'RÍO BANANITO', mouth: [-82.9573, 9.874], catchmentKm2: 110, rainAt: [-83.12, 9.88], flowAt: [-82.9573, 9.874], rainBox: [[-83.1, 9.8], [-83.0, 9.9]] },
];
