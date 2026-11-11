/**
 * Shore and kayak fishing layer (PLAN 4.5): the habitat score of the chosen species, drawn as a
 * heat of ~220 m cells within a paddle or long cast of the coast, from the coast tier in.
 * Amber only, faint for fair water and stronger for the best (green blended into the map).
 * A SHORE / BOAT highlight keeps cells within a cast or wade of the beach, or those beyond it. Style layer ids start with `fh-` (catalog 'fishing').
 * The weights are fitted to the OBIS/GBIF records when the layer mounts (PLAN 4.4, fishing/fit.ts), and
 * refitted with your own logged catches whenever they change (PLAN 7.16, `setCatches`).
 * Over the cells, the circled zones of mockup G (PLAN 7.74, fishing/zones.ts): the best water of every eating fish,
 * named with the fish to try there (`fh-zone-*`).
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { firstSymbolId } from '../map';
import { CONTOURS_FROM } from './seafloor';
import { buildCells, cellGeometry, cellIndexAt, type FishingInput, type Mouth } from '../fishing/cells';
import { baseScore, habitatScore, seasonFactor } from '../fishing/habitat';
import { fitWeights, recordCells, type HabitatFit } from '../fishing/fit';
import { SPECIES, speciesById, type SpeciesId } from '../fishing/species';
import { occurrenceBoost, recordsFor, withEvidence } from '../fishing/occurrences';
import type { OccurrenceFile } from '../fishing/occurrence-taxa';
import { catchRecords, type CatchPin } from '../fishing/catches';
import { lifted, paintColour as cssColour, paintLift } from './paint';
import { ANCHOR_OFFSET, fishZones, zoneLabel, zoneRing, type ZoneCell, type ZoneWhy } from '../fishing/zones';
import { nearestName, uniqueMarks } from '../fishing/near-name';
import { cellAt } from '../physics/bathy';
import { PLUME_RIVERS, RAIN_TOWNS, SPOTS } from '../region';
import { SURF_BREAKS } from '../data/surf-breaks';
import { PLACES as HARBOURS } from '../data/harbours';
import { t, type Key } from '../i18n';
import { zoneAt, type ZonePoly } from '../zone-lookup';

const { COAST, SPOT } = TIER_ZOOM;
/** The circled zones (mockup G): ovals from this zoom, the fish names a little later, the where line from ZONE_WHERE_Z. */
const ZONE_Z = 9, ZONE_NAME_Z = 9.6, ZONE_WHERE_Z = 11.2;
const css = (n: string, d: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;
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
  /** The protected areas (PLAN 4.3): no circled zone inside a national park or closed water. */
  setRules(zones: readonly ZonePoly[]): void;
}

export function mountFishing(map: Map, input: FishingInput, initial: { species: SpeciesId; month: number }, occurrences: OccurrenceFile | null = null): FishingLayer {
  const built = buildCells(input);
  let sp = speciesById(initial.species);
  let month = initial.month;
  const amber = cssColour('--amber', '#ffb000');
  // The theme's lift (paint.ts): these washes are 3 to 32 %, made for a black sea, and vanish on the light one.
  const L = paintLift('strong'), o = (a: number) => lifted(a, L);
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
  // Cell shapes cut at the coastline, so shore cells don't paint the beach. Fixed, so built once.
  const shapes = built.cells.map((c) => cellGeometry(input.land, c.lng, c.lat));
  const rebuild = (catches: readonly CatchPin[]) => {
    const recs = Object.fromEntries(SPECIES.map((s) => [s.id, [...recordsFor(occurrences, s.id), ...catchRecords(catches, s.id)]])) as unknown as Record<SpeciesId, Recs>;
    near = Object.fromEntries(SPECIES.map((s) => [s.id, recs[s.id].filter(inBox)])) as unknown as Record<SpeciesId, Recs>;
    // Habitat weights: the hand-written rules updated by the records (a few ms for all species).
    fits = Object.fromEntries(SPECIES.map((s) => [s.id, fitWeights(s, built.cells, recordCells(built.lattice, built.index, built.cells, recs[s.id]))])) as Record<SpeciesId, HabitatFit>;
    geojson.features = built.cells.map((c, i) => {
      const properties: Record<string, number> = {};
      for (const s of SPECIES) properties[s.id] = Math.round(withEvidence(baseScore(s, c.f, fits[s.id].weights), boostAt(s.id, c.lng, c.lat)) * 100) / 100; // season applied in the paint
      properties.coast = Math.round(c.coastM);
      return { type: 'Feature' as const, properties, geometry: shapes[i] };
    });
  };
  rebuild([]);

  // The circled zones (PLAN 7.74, mockup G): the best water of every edible species, gathered into ovals named with
  // the fish to try there (fishing/zones.ts). Rebuilt when the month, the reach or your catches change.
  const marks = uniqueMarks(SPOTS, RAIN_TOWNS, SURF_BREAKS, PLUME_RIVERS.map((r) => ({ name: r.name, lngLat: r.mouth })), HARBOURS.filter((h) => !/APPROX/.test(h.name)));
  const isWater = (lng: number, lat: number) => cellAt(input.land, lng, lat) !== 1;
  const zonesGj: FeatureCollection = { type: 'FeatureCollection', features: [] };
  let zoneKey = '';
  // Per cell: 1 where no zone is circled (set with the rules), else 0.
  let rule = new Uint8Array(built.cells.length);
  let rules: readonly ZonePoly[] = [];
  const buildZones = () => {
    const key = `${month}|${reach}|${catchKey}|${rules.length}`;
    if (key === zoneKey) return false;
    zoneKey = key;
    const cells: ZoneCell<SpeciesId>[] = [];
    for (const [i, c] of built.cells.entries()) {
      if (!inReach(c.coastM) || rule[i]) continue;
      const s = {} as Record<SpeciesId, number>;
      for (const x of SPECIES) s[x.id] = Math.min(1, habitatScore(x, c.f, month, fits[x.id].weights) * (1 + boostAt(x.id, c.lng, c.lat)));
      const why: ZoneWhy[] = [];
      if (c.f.mouthKm < 0.8) why.push('mouth');
      if (c.f.reef >= 0.3) why.push('reef');
      if (c.f.slopeMPerKm >= 20) why.push('drop');
      cells.push({ lng: c.lng, lat: c.lat, s, why, depthM: c.f.depthM });
    }
    const zones = fishZones(cells);
    zonesGj.features = zones.flatMap((z) => {
      const near = nearestName(z.lng, z.lat, marks);
      const [d0, d1] = z.depthM;
      const depth = d0 === d1 ? `${d0} M` : `${d0}–${d1} M`;
      const where = [z.why ? t(`fish.why.${z.why}` as Key) : '', depth, near?.name.toUpperCase() ?? ''].filter(Boolean).join(' · ');
      const ring = zoneRing(z, 48, isWater);
      // The name just outside the oval on the open-sea side, clear of the beach and its rating tiles.
      const lab = zoneLabel(z, ring, isWater);
      const props = { lv: z.level, sp: z.species.map((id) => t(`fish.${id}` as Key)).join(' · '), where, anchor: lab.anchor, off: ANCHOR_OFFSET[lab.anchor] };
      return [
        { type: 'Feature' as const, properties: props, geometry: { type: 'Polygon' as const, coordinates: [ring] } },
        { type: 'Feature' as const, properties: props, geometry: { type: 'Point' as const, coordinates: lab.at } },
      ];
    });
    return true;
  };
  const refreshZones = () => {
    if (buildZones()) (map.getSource('fh-zones') as GeoJSONSource | undefined)?.setData(zonesGj);
  };

  const paint = () => {
    if (!map.getLayer('fh-cells')) return;
    const raw: ExpressionSpecification = ['*', ['get', sp.id], seasonFactor(sp, month)];
    const score: ExpressionSpecification = reach === 'all' ? raw : ['case', reach === 'shore' ? ['<=', ['get', 'coast'], SHORE_M] : ['>', ['get', 'coast'], SHORE_M], raw, 0];
    // Amber only. Nothing below fair (0.3); the best water reaches a firm but see-through fill. Past spot zoom the 0.06°
    // cells are bigger than the screen's detail and read as blocks, so they fade out (clarity review CL19).
    map.setPaintProperty('fh-cells', 'fill-color', amber);
    // The best water also gets an edge, so it reads as marked sea and not as sand beside the beach (PLAN 7.73).
    if (map.getLayer('fh-edge')) map.setPaintProperty('fh-edge', 'line-opacity', ['interpolate', ['linear'], score, 0.55, 0, 0.7, 0.75, 0.8, 0.95]);
    map.setPaintProperty('fh-cells', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], COAST, 0, COAST + 1, ['interpolate', ['linear'], score, 0.3, 0, 0.45, o(0.1), 0.8, o(0.32)], SPOT, ['interpolate', ['linear'], score, 0.3, 0, 0.45, o(0.08), 0.8, o(0.24)], SPOT + 2, ['interpolate', ['linear'], score, 0.3, 0, 0.45, o(0.03), 0.8, o(0.1)]]);
  };
  const add = () => {
    if (map.getSource('fh')) return;
    map.addSource('fh', { type: 'geojson', data: geojson, attribution: 'Habitat guide: GEBCO, Allen Coral Atlas, OSM' });
    map.addLayer({ id: 'fh-cells', type: 'fill', source: 'fh', minzoom: COAST, paint: { 'fill-color': amber, 'fill-opacity': 0 } }, map.getLayer(CONTOURS_FROM) ? CONTOURS_FROM : firstSymbolId(map));
    map.addLayer({ id: 'fh-edge', type: 'line', source: 'fh', minzoom: COAST + 0.5, paint: { 'line-color': amber, 'line-width': ['interpolate', ['linear'], ['zoom'], COAST + 0.5, 0.8, SPOT, 1.6], 'line-opacity': 0 } }, map.getLayer(CONTOURS_FROM) ? CONTOURS_FROM : firstSymbolId(map));
    // The zones: rating colours as in mockup G (fill at 30 %, a dashed edge one shade deeper), names in ink on the halo.
    buildZones();
    map.addSource('fh-zones', { type: 'geojson', data: zonesGj });
    // Zone level 3, 2, 1 in the beach rating's great, good and fair (--lv4, --lv3, --lv2), edges in the deeper --ac shade.
    const byLv = (pre: string): ExpressionSpecification => ['match', ['get', 'lv'], 3, css(`--${pre}4`, '#0C6B66'), 2, css(`--${pre}3`, '#A5DBC2'), css(`--${pre}2`, '#F4C542')];
    const poly: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];
    map.addLayer({ id: 'fh-zone-fill', type: 'fill', source: 'fh-zones', minzoom: ZONE_Z, filter: poly, paint: { 'fill-color': byLv('lv'), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 0.3] } });
    map.addLayer({ id: 'fh-zone-line', type: 'line', source: 'fh-zones', minzoom: ZONE_Z, filter: poly, layout: { 'line-join': 'round' }, paint: { 'line-color': byLv('ac'), 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1.2, 12, 1.8, 14, 2.2], 'line-dasharray': [3, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 1] } });
    const name: ExpressionSpecification = ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }];
    map.addLayer({
      id: 'fh-zone-label', type: 'symbol', source: 'fh-zones', minzoom: ZONE_NAME_Z, filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': ['step', ['zoom'], name, ZONE_WHERE_Z, ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }, '\n', {}, ['get', 'where'], { 'font-scale': 0.82, 'text-color': css('--ink2', '#46576C') }]],
        'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], ZONE_NAME_Z, 10, 13, 12], 'text-anchor': ['get', 'anchor'], 'text-offset': ['get', 'off'], 'text-justify': 'auto', 'text-letter-spacing': 0.06, 'text-max-width': 30, 'text-padding': 4,
      },
      paint: { 'text-color': css('--ink', '#0A1626'), 'text-halo-color': css('--m-halo', '#ECEADF'), 'text-halo-width': 1.8 },
    });
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
      refreshZones();
    },
    scoreFor,
    setRules(z) {
      rules = z;
      // A national park (IUCN II: Cahuita, where spear guns are banned and line fishing is disputed, rule.cahuita.*) or
      // closed water gets no circle. The refuges (Gandoca-Manzanillo, Limoncito) have no fishing rule found, so they keep theirs.
      rule = Uint8Array.from(built.cells, (c) => {
        const p = zoneAt(z, [c.lng, c.lat]);
        return p && (p.status === 'closed' || p.iucn === '2') ? 1 : 0;
      });
      refreshZones();
    },
    setReach(r) {
      reach = r;
      paint();
      refreshZones();
    },
    bestSpots: spotsFor,
    setSpecies(id) {
      sp = speciesById(id);
      paint();
    },
    setMonth(m) {
      month = m;
      paint();
      refreshZones();
    },
    scoreAt: (lng, lat) => scoreFor(sp.id, lng, lat),
  };
}
