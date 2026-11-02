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

export const SPOTS: { name: string; lngLat: [number, number] }[] = [
  { name: 'LIMÓN', lngLat: [-83.03, 9.99] },
  { name: 'PLAYA BONITA', lngLat: [-83.05, 10.01] },
  { name: 'WESTFALIA', lngLat: [-82.98, 9.9] },
  { name: 'CAHUITA', lngLat: [-82.83, 9.74] },
  { name: 'PLAYA NEGRA', lngLat: [-82.76, 9.67] },
  { name: 'SALSA BRAVA', lngLat: [-82.75, 9.657] },
  { name: 'PUNTA UVA', lngLat: [-82.68, 9.64] },
  { name: 'MANZANILLO', lngLat: [-82.65, 9.633] },
  { name: 'GANDOCA', lngLat: [-82.6, 9.59] },
];
