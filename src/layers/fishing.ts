/**
 * Shore and kayak fishing layer (PLAN 4.5): the habitat score of the chosen species, drawn as a
 * heat of ~220 m cells within a paddle or long cast of the coast, from the coast tier in.
 * Green is fair, amber is the best water. Style layer ids start with `fh-` (catalog 'fishing').
 */
import type { ExpressionSpecification, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { firstSymbolId } from '../map';
import { buildCells, cellIndexAt, cellRing, type FishingInput, type Mouth } from '../fishing/cells';
import { baseScore, habitatScore, seasonFactor } from '../fishing/habitat';
import { SPECIES, speciesById, type SpeciesId } from '../fishing/species';
import { occurrenceBoost, recordsFor, withEvidence } from '../fishing/occurrences';
import type { OccurrenceFile } from '../fishing/occurrence-taxa';

const { COAST, SPOT } = TIER_ZOOM;
const DIR = 'data/fishing/mouths.geojson';
const OCC = 'data/fishing/occurrences.json';

/** OBIS/GBIF records (PLAN 4.7). They only nudge scores, so a failed load just means no nudge. */
export async function fetchOccurrences(base: string = import.meta.env.BASE_URL): Promise<OccurrenceFile | null> {
  try {
    const res = await fetch(`${base}${OCC}`);
    return res.ok ? ((await res.json()) as OccurrenceFile) : null;
  } catch {
    return null;
  }
}

export async function fetchMouths(base: string = import.meta.env.BASE_URL): Promise<{ data: Mouth[]; fetchedAt: number }> {
  const res = await fetch(`${base}${DIR}`);
  if (!res.ok) throw new Error(`fishing: ${res.status}`);
  const gj = (await res.json()) as FeatureCollection & { fetchedAt: string };
  const data = gj.features.map((f) => ({
    name: String(f.properties?.name ?? ''),
    rank: Number(f.properties?.rank ?? 1),
    at: (f.geometry as GeoJSON.Point).coordinates as [number, number],
  }));
  return { data, fetchedAt: Date.parse(gj.fetchedAt) };
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export interface FishingLayer {
  setSpecies(id: SpeciesId): void;
  /** 0-based month (UTC) the season factor uses. */
  setMonth(month: number): void;
  /** Habitat score 0..1 at a point for the current species and month, or null outside the fishing reach. */
  scoreAt(lng: number, lat: number): number | null;
}

export function mountFishing(map: Map, input: FishingInput, initial: { species: SpeciesId; month: number }, occurrences: OccurrenceFile | null = null): FishingLayer {
  const built = buildCells(input);
  let sp = speciesById(initial.species);
  let month = initial.month;
  const amber = cssColour('--amber', '#ffb000');
  const green = cssColour('--green', '#39ff7a');

  // Records nudge a species' score where it has been seen (src/fishing/occurrences.ts).
  const boostAt = (id: SpeciesId, lng: number, lat: number) => occurrenceBoost(recordsFor(occurrences, id), lng, lat);
  const geojson: FeatureCollection = {
    type: 'FeatureCollection',
    features: built.cells.map((c) => {
      const properties: Record<string, number> = {};
      for (const s of SPECIES) properties[s.id] = Math.round(withEvidence(baseScore(s, c.f), boostAt(s.id, c.lng, c.lat)) * 100) / 100; // season applied in the paint
      return { type: 'Feature' as const, properties, geometry: { type: 'Polygon' as const, coordinates: [cellRing(c.lng, c.lat)] } };
    }),
  };
  const paint = () => {
    if (!map.getLayer('fh-cells')) return;
    const score: ExpressionSpecification = ['*', ['get', sp.id], seasonFactor(sp, month)];
    map.setPaintProperty('fh-cells', 'fill-color', ['interpolate', ['linear'], score, 0.1, green, 0.6, amber]);
    map.setPaintProperty('fh-cells', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], COAST, 0, COAST + 1, ['interpolate', ['linear'], score, 0, 0, 0.15, 0.1, 0.8, 0.55], SPOT + 2, ['interpolate', ['linear'], score, 0, 0, 0.15, 0.06, 0.8, 0.4]]);
  };
  const add = () => {
    if (map.getSource('fh')) return;
    map.addSource('fh', { type: 'geojson', data: geojson, attribution: 'Habitat guide: GEBCO, Allen Coral Atlas, OSM' });
    map.addLayer({ id: 'fh-cells', type: 'fill', source: 'fh', minzoom: COAST, paint: { 'fill-color': green, 'fill-opacity': 0 } }, map.getLayer('sf-contour-label') ? 'sf-contour-label' : firstSymbolId(map));
    paint();
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);

  return {
    setSpecies(id) {
      sp = speciesById(id);
      paint();
    },
    setMonth(m) {
      month = m;
      paint();
    },
    scoreAt(lng, lat) {
      const i = cellIndexAt(built.lattice, built.index, lng, lat);
      if (i < 0) return null;
      const c = built.cells[i];
      return Math.min(1, habitatScore(sp, c.f, month) * (1 + (boostAt(sp.id, c.lng, c.lat))));
    },
  };
}
