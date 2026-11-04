/**
 * Shore and kayak fishing layer (PLAN 4.5): the habitat score of the chosen species, drawn as a
 * heat of ~220 m cells within a paddle or long cast of the coast, from the coast tier in.
 * Amber only, faint for fair water and stronger for the best (green blended into the map).
 * A SHORE / BOAT highlight keeps cells within a cast or wade of the beach, or those beyond it. Style layer ids start with `fh-` (catalog 'fishing').
 * The weights are fitted to the OBIS/GBIF records when the layer mounts (PLAN 4.4, fishing/fit.ts), and
 * refitted with your own logged catches whenever they change (PLAN 7.16, `setCatches`).
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { firstSymbolId } from '../map';
import { CONTOURS_FROM } from './seafloor';
import { buildCells, cellIndexAt, cellRing, type FishingInput, type Mouth } from '../fishing/cells';
import { baseScore, habitatScore, seasonFactor } from '../fishing/habitat';
import { fitWeights, recordCells, type HabitatFit } from '../fishing/fit';
import { SPECIES, speciesById, type SpeciesId } from '../fishing/species';
import { occurrenceBoost, recordsFor, withEvidence } from '../fishing/occurrences';
import type { OccurrenceFile } from '../fishing/occurrence-taxa';
import { catchRecords, type CatchPin } from '../fishing/catches';

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

/** Cells within this distance of the beach count as shore water (cast, wade or a short paddle), m. */
export const SHORE_M = 400;
export type Reach = 'all' | 'shore' | 'boat';
export type SpotWhy = 'mouth' | 'reef' | 'drop';
export interface Spot { lng: number; lat: number; score: number; depthM: number; coastM: number; why: SpotWhy[]; mouthKm: number }

export interface FishingLayer {
  setReach(r: Reach): void;
  /** Best separated spots (>= 600 m apart) for the current species, month and reach, best first. */
  bestSpots(n: number, near?: { lng: number; lat: number }, maxKm?: number): Spot[];
  setSpecies(id: SpeciesId): void;
  /** 0-based month (UTC) the season factor uses. */
  setMonth(month: number): void;
  /** Habitat score 0..1 at a point for the current species and month, or null outside the fishing reach. */
  scoreAt(lng: number, lat: number): number | null;
  /** The fitted habitat weights per species (PLAN 4.4), refitted with your catches. */
  fits(): Readonly<Record<SpeciesId, HabitatFit>>;
  /** Your logged catches (BOAT drawer): they join the records for the fit and the nudge (PLAN 7.16). */
  setCatches(pins: readonly CatchPin[]): void;
  /** Habitat score 0..1 at a point for a given species and the current month, or null outside the reach. */
  scoreFor(id: SpeciesId, lng: number, lat: number): number | null;
}

export function mountFishing(map: Map, input: FishingInput, initial: { species: SpeciesId; month: number }, occurrences: OccurrenceFile | null = null): FishingLayer {
  const built = buildCells(input);
  let sp = speciesById(initial.species);
  let month = initial.month;
  const amber = cssColour('--amber', '#ffb000');
  let reach: Reach = 'all';
  const inReach = (coastM: number) => reach === 'all' || (reach === 'shore' ? coastM <= SHORE_M : coastM > SHORE_M);

  // Records nudge a species' score where it has been seen (src/fishing/occurrences.ts), and fit the weights (fit.ts).
  // Only records near the cells can nudge them (occurrenceBoost looks 0.03° out), so drop the rest once (PLAN 5.4).
  // Your own catches (PLAN 7.16) join both: the same weight as a survey record, but from where you fish.
  const [bw, bs, be, bn] = input.bounds;
  const inBox = ([x, y]: readonly [number, number, ...unknown[]]) => x > bw - 0.03 && x < be + 0.03 && y > bs - 0.03 && y < bn + 0.03;
  type Recs = ReturnType<typeof recordsFor>;
  let near = {} as Record<SpeciesId, Recs>;
  let fits = {} as Record<SpeciesId, HabitatFit>;
  let catchKey = '';
  const geojson: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const boostAt = (id: SpeciesId, lng: number, lat: number) => occurrenceBoost(near[id], lng, lat);
  const rebuild = (catches: readonly CatchPin[]) => {
    const recs = Object.fromEntries(SPECIES.map((s) => [s.id, [...recordsFor(occurrences, s.id), ...catchRecords(catches, s.id)]])) as unknown as Record<SpeciesId, Recs>;
    near = Object.fromEntries(SPECIES.map((s) => [s.id, recs[s.id].filter(inBox)])) as unknown as Record<SpeciesId, Recs>;
    // Habitat weights: the hand-written rules updated by the records (a few ms for all species).
    fits = Object.fromEntries(SPECIES.map((s) => [s.id, fitWeights(s, built.cells, recordCells(built.lattice, built.index, built.cells, recs[s.id]))])) as Record<SpeciesId, HabitatFit>;
    geojson.features = built.cells.map((c) => {
      const properties: Record<string, number> = {};
      for (const s of SPECIES) properties[s.id] = Math.round(withEvidence(baseScore(s, c.f, fits[s.id].weights), boostAt(s.id, c.lng, c.lat)) * 100) / 100; // season applied in the paint
      properties.coast = Math.round(c.coastM);
      return { type: 'Feature' as const, properties, geometry: { type: 'Polygon' as const, coordinates: [cellRing(c.lng, c.lat)] } };
    });
  };
  rebuild([]);
  const paint = () => {
    if (!map.getLayer('fh-cells')) return;
    const raw: ExpressionSpecification = ['*', ['get', sp.id], seasonFactor(sp, month)];
    const score: ExpressionSpecification = reach === 'all' ? raw : ['case', reach === 'shore' ? ['<=', ['get', 'coast'], SHORE_M] : ['>', ['get', 'coast'], SHORE_M], raw, 0];
    // Amber only. Nothing below fair (0.3); the best water reaches a firm but see-through fill.
    map.setPaintProperty('fh-cells', 'fill-color', amber);
    map.setPaintProperty('fh-cells', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], COAST, 0, COAST + 1, ['interpolate', ['linear'], score, 0.3, 0, 0.45, 0.1, 0.8, 0.32], SPOT + 2, ['interpolate', ['linear'], score, 0.3, 0, 0.45, 0.07, 0.8, 0.24]]);
  };
  const add = () => {
    if (map.getSource('fh')) return;
    map.addSource('fh', { type: 'geojson', data: geojson, attribution: 'Habitat guide: GEBCO, Allen Coral Atlas, OSM' });
    map.addLayer({ id: 'fh-cells', type: 'fill', source: 'fh', minzoom: COAST, paint: { 'fill-color': amber, 'fill-opacity': 0 } }, map.getLayer(CONTOURS_FROM) ? CONTOURS_FROM : firstSymbolId(map));
    paint();
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);

  const spotsFor = (n: number, near?: { lng: number; lat: number }, maxKm = Infinity): Spot[] => {
    const kmTo = (lng: number, lat: number) => (near ? Math.hypot((lng - near.lng) * Math.cos((near.lat * Math.PI) / 180), lat - near.lat) * 111.32 : 0);
    const scored = built.cells
      .filter((c) => inReach(c.coastM) && kmTo(c.lng, c.lat) <= maxKm)
      .map((c) => ({ c, score: Math.min(1, habitatScore(sp, c.f, month, fits[sp.id].weights) * (1 + boostAt(sp.id, c.lng, c.lat))) }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score);
    const out: Spot[] = [];
    for (const { c, score } of scored) {
      if (out.length >= n) break;
      if (out.some((o) => Math.hypot((o.lng - c.lng) * Math.cos((c.lat * Math.PI) / 180), o.lat - c.lat) * 111.32 < 0.6)) continue;
      const why: SpotWhy[] = [];
      if (c.f.mouthKm < sp.mouthReachKm * 0.6) why.push('mouth');
      if (c.f.reef >= 0.3) why.push('reef');
      if (c.f.slopeMPerKm >= 20) why.push('drop');
      out.push({ lng: c.lng, lat: c.lat, score, depthM: c.f.depthM, coastM: c.coastM, why, mouthKm: c.f.mouthKm });
    }
    return out;
  };

  const scoreFor = (id: SpeciesId, lng: number, lat: number) => {
    const i = cellIndexAt(built.lattice, built.index, lng, lat);
    if (i < 0) return null;
    const c = built.cells[i];
    const s = speciesById(id);
    return Math.min(1, habitatScore(s, c.f, month, fits[id].weights) * (1 + boostAt(id, c.lng, c.lat)));
  };
  return {
    fits: () => fits,
    setCatches(pins) {
      const key = pins.filter((p) => p.kind === 'catch').map((p) => `${p.species}${p.lng.toFixed(4)}${p.lat.toFixed(4)}`).join('|');
      if (key === catchKey) return;
      catchKey = key;
      rebuild(pins);
      (map.getSource('fh') as GeoJSONSource | undefined)?.setData(geojson);
    },
    scoreFor,
    setReach(r) {
      reach = r;
      paint();
    },
    bestSpots: spotsFor,
    setSpecies(id) {
      sp = speciesById(id);
      paint();
    },
    setMonth(m) {
      month = m;
      paint();
    },
    scoreAt: (lng, lat) => scoreFor(sp.id, lng, lat),
  };
}
