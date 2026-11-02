/** Gandoca to Limón, Costa Rica Caribbean coast. Single source of truth for region geometry. */
export const REGION = {
  name: 'GANDOCA–LIMÓN',
  center: [-82.83, 9.79] as [number, number],
  bounds: [[-83.25, 9.45], [-82.4, 10.1]] as [[number, number], [number, number]],
  // Macro view may pan out to the western Caribbean.
  maxBounds: [[-86, 7.5], [-79, 13]] as [[number, number], [number, number]],
  initialZoom: 9.3,
};

/** Zoom tiers from DESIGN.md §5. */
export type Tier = 'MACRO' | 'COAST' | 'SPOT';
export function tierForZoom(z: number): Tier {
  if (z < 8) return 'MACRO';
  if (z < 12) return 'COAST';
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
