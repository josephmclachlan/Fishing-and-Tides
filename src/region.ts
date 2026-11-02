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

/** Named coastal spots, [lng, lat] (MapLibre order). Keep each on the shoreline. */
export const SPOTS: { name: string; lngLat: [number, number] }[] = [
  { name: 'LIMÓN', lngLat: [-83.022, 9.993] },
  { name: 'PLAYA BONITA', lngLat: [-83.005, 10.003] },
  { name: 'CAHUITA', lngLat: [-82.831, 9.736] },
  { name: 'PLAYA NEGRA', lngLat: [-82.769, 9.662] },
  { name: 'SALSA BRAVA', lngLat: [-82.752, 9.654] },
  { name: 'PUNTA UVA', lngLat: [-82.693, 9.64] },
  { name: 'MANZANILLO', lngLat: [-82.654, 9.632] },
  { name: 'GANDOCA', lngLat: [-82.602, 9.607] },
];
