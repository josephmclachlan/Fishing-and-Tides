/**
 * Shore and kayak fishing layer (PLAN 4.5): the habitat score of every eating fish at once (the best of them, PLAN 7.75),
 * drawn as a heat of ~220 m cells within a paddle or long cast of the coast, from the coast tier in: amber for fair
 * water, green for the best.
 * A SHORE / BOAT highlight keeps cells within a cast or wade of the beach, or those beyond it. Style layer ids start with `fh-` (catalog 'fishing').
 * The weights are fitted to the OBIS/GBIF records when the layer mounts (PLAN 4.4, fishing/fit.ts), and
 * refitted with your own logged catches whenever they change (PLAN 7.16, `setCatches`).
 * Over the cells, the circled zones of mockup G (PLAN 7.74, 7.75, fishing/zones.ts): each fish's own zones where it
 * earns them, near shore and, from the boat read main.ts hands over, offshore (`fh-zone-*`).
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
import { ANCHOR_OFFSET, FAR_ZONES, fishZones, NEAR_ZONES, speciesZones, zoneLabel, zoneRing, type Zone, type ZoneCell, type ZoneWhy } from '../fishing/zones';
import type { OffshoreId } from '../fishing/offshore';
import { nearestName, uniqueMarks } from '../fishing/near-name';
import { cellAt } from '../physics/bathy';
import { PLUME_RIVERS, RAIN_TOWNS, SPOTS } from '../region';
import { SURF_BREAKS } from '../data/surf-breaks';
import { PLACES as HARBOURS } from '../data/harbours';
import { t, type Key } from '../i18n';
import { zoneAt, type ZonePoly } from '../zone-lookup';
import { spearStatus } from '../rules';
import { SPEAR_SPECIES, spearScore, spearWindow } from '../fishing/spear';

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
  /** The protected areas (PLAN 4.3): no circled zone inside a national park or closed water, no spear fish in any. */
  setRules(zones: readonly ZonePoly[]): void;
  /** Boat water scored per offshore species on a ~2 km grid for the day on the slider (main.ts), or null: its zones. */
  setBoat(cells: readonly ZoneCell<OffshoreId>[] | null, key: string): void;
}

export function mountFishing(map: Map, input: FishingInput, initial: { species: SpeciesId; month: number }, occurrences: OccurrenceFile | null = null): FishingLayer {
  const built = buildCells(input);
  let sp = speciesById(initial.species);
  let month = initial.month;
  const amber = cssColour('--amber', '#ffb000'), green = cssColour('--green', '#39ff7a');
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
  // Per cell: 2 where no zone is circled (a national park or closed water), 1 in another protected area, else 0.
  let rule = new Uint8Array(built.cells.length);
  let rules: readonly ZonePoly[] = [];
  const noZone = (p: ReturnType<typeof zoneAt>) => !!p && (p.status === 'closed' || p.iucn === '2');
  const parkAt = (lng: number, lat: number) => noZone(zoneAt(rules, [lng, lat]));
  let boat: readonly ZoneCell<OffshoreId>[] | null = null, boatKey = '';
  const depthText = ([d0, d1]: [number, number]) => (d0 === d1 ? `${d0} M` : `${d0}–${d1} M`);
  const zoneFeatures = (z: Zone<string>, names: string, where: string, far: boolean) => {
    const ring = zoneRing(z, 48, isWater);
    // The name just outside the oval on the open-sea side, clear of the beach and its rating tiles.
    const lab = zoneLabel(z, ring, isWater);
    const props = { lv: z.level, far: far ? 1 : 0, sp: names, where, anchor: lab.anchor, off: ANCHOR_OFFSET[lab.anchor] };
    return [
      { type: 'Feature' as const, properties: props, geometry: { type: 'Polygon' as const, coordinates: [ring] } },
      { type: 'Feature' as const, properties: props, geometry: { type: 'Point' as const, coordinates: lab.at } },
    ];
  };
  const buildZones = () => {
    const key = `${month}|${reach}|${catchKey}|${rules.length}|${boatKey}`;
    if (key === zoneKey) return false;
    zoneKey = key;
    // Shore and kayak water: every eating fish, each in the zones it earns (fishing/zones.ts NEAR_ZONES).
    const cells: ZoneCell<SpeciesId>[] = [];
    for (const [i, c] of built.cells.entries()) {
        if (!inReach(c.coastM) || rule[i] === 2) continue;
        const s = {} as Record<SpeciesId, number>;
        for (const x of SPECIES) s[x.id] = Math.min(1, habitatScore(x, c.f, month, fits[x.id].weights) * (1 + boostAt(x.id, c.lng, c.lat)));
        // Lionfish are taken by spear: none in any protected area.
        if (rule[i]) s.lionfish = 0;
        const why: ZoneWhy[] = [];
        if (c.f.mouthKm < 0.8) why.push('mouth');
        if (c.f.reef >= 0.3) why.push('reef');
        if (c.f.slopeMPerKm >= 20) why.push('drop');
        cells.push({ lng: c.lng, lat: c.lat, s, why, depthM: c.f.depthM });
      }
    const near = speciesZones(cells, SPECIES.map((x) => x.id), NEAR_ZONES).flatMap((z) => {
      const at = nearestName(z.lng, z.lat, marks);
      const where = [z.why ? t(`fish.why.${z.why}` as Key) : '', depthText(z.depthM), at?.name.toUpperCase() ?? ''].filter(Boolean).join(' · ');
      return zoneFeatures(z, z.species.map((id) => t(`fish.${id}` as Key)).join(' · '), where, false);
    });
    // Boat water beyond the cast: the offshore species on the day's satellite water (FAR_ZONES), not inside a national park.
    const far =
      boat && reach !== 'shore'
        ? speciesZones(boat.filter((c) => !parkAt(c.lng, c.lat)), ['mahi', 'tuna', 'wahoo', 'kingfish', 'silksnapper'] as OffshoreId[], FAR_ZONES).flatMap((z) => {
            const at = nearestName(z.lng, z.lat, marks);
            const off = at ? t('fish.zone.off', { km: Math.round(at.km), name: at.name.toUpperCase() }) : '';
            const where = [t('fish.reach.boat'), z.why ? t(`fish.why.${z.why}` as Key) : '', depthText(z.depthM), off].filter(Boolean).join(' · ');
            return zoneFeatures(z, z.species.map((id) => t(`boat.sp.${id}` as Key)).join(' · '), where, true);
          })
        : [];
    zonesGj.features = [...far, ...near];
    return true;
  };
  const refreshZones = () => {
    if (buildZones()) (map.getSource('fh-zones') as GeoJSONSource | undefined)?.setData(zonesGj);
  };

  // SPEAR areas (src/fishing/spear.ts): the best target's habitat in the breath-hold depth window, cell by cell and as circled zones, drawn
  // as the fishing ones are but in green; where the law bans spearing (a national park, closed water) the water that would otherwise be
  // good is shaded red, and a refuge with no marine rule found is dashed amber (CHECK). Style layers start with `sp-` (catalog 'spear').
  // Per cell: 0 open, 1 CHECK, 2 banned (set with the rules).
  let law = new Uint8Array(built.cells.length);
  const spearGj: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const spearZonesGj: FeatureCollection = { type: 'FeatureCollection', features: [] };
  let spearKey = '';
  const buildSpear = () => {
    const key = `${month}|${catchKey}|${rules.length}`;
    if (key === spearKey) return false;
    spearKey = key;
    const feats: FeatureCollection['features'] = [];
    const cells: ZoneCell<SpeciesId>[] = [];
    for (const [i, c] of built.cells.entries()) {
      const win = spearWindow(c.f.depthM);
      if (win <= 0) continue;
      const by: Partial<Record<SpeciesId, number>> = {};
      for (const id of SPEAR_SPECIES) by[id] = Math.min(1, habitatScore(speciesById(id), c.f, month, fits[id].weights) * (1 + boostAt(id, c.lng, c.lat)));
      const sc = spearScore(by, c.f.depthM);
      if (sc < 0.3) continue;
      feats.push({ type: 'Feature', properties: { sp: Math.round(sc * 100) / 100, law: law[i] }, geometry: shapes[i] });
      if (law[i] !== 0) continue;
      const s = {} as Record<SpeciesId, number>;
      for (const id of SPEAR_SPECIES) s[id] = (by[id] ?? 0) * win;
      const why: ZoneWhy[] = [];
      if (c.f.reef >= 0.3) why.push('reef');
      if (c.f.slopeMPerKm >= 20) why.push('drop');
      cells.push({ lng: c.lng, lat: c.lat, s, why, depthM: c.f.depthM });
    }
    spearGj.features = feats;
    spearZonesGj.features = fishZones(cells).flatMap((z) => {
      const nr = nearestName(z.lng, z.lat, marks);
      const [d0, d1] = z.depthM;
      const where = [z.why ? t(`fish.why.${z.why}` as Key) : '', d0 === d1 ? `${d0} M` : `${d0}–${d1} M`, nr?.name.toUpperCase() ?? ''].filter(Boolean).join(' · ');
      const ring = zoneRing(z, 48, isWater);
      const lab = zoneLabel(z, ring, isWater);
      const props = { lv: z.level, sp: z.species.map((id) => t(`fish.${id}` as Key)).join(' · '), where, anchor: lab.anchor, off: ANCHOR_OFFSET[lab.anchor] };
      return [
        { type: 'Feature' as const, properties: props, geometry: { type: 'Polygon' as const, coordinates: [ring] } },
        { type: 'Feature' as const, properties: props, geometry: { type: 'Point' as const, coordinates: lab.at } },
      ];
    });
    return true;
  };
  const refreshSpear = () => {
    if (!buildSpear()) return;
    (map.getSource('sp') as GeoJSONSource | undefined)?.setData(spearGj);
    (map.getSource('sp-zones') as GeoJSONSource | undefined)?.setData(spearZonesGj);
  };

  const paint = () => {
    if (!map.getLayer('fh-cells')) return;
    // Every eating fish at once (Joseph 2026-11-11): the best of the species' scores, each with its season.
    const raw: ExpressionSpecification = ['max', ...SPECIES.map((x): ExpressionSpecification => ['*', ['get', x.id], seasonFactor(x, month)])] as unknown as ExpressionSpecification;
    const score: ExpressionSpecification = reach === 'all' ? raw : ['case', reach === 'shore' ? ['<=', ['get', 'coast'], SHORE_M] : ['>', ['get', 'coast'], SHORE_M], raw, 0];
    // Nothing below fair (0.3); the best water reaches a firm but see-through fill. Past spot zoom the 0.06°
    // cells are bigger than the screen's detail and read as blocks, so they fade out (clarity review CL19).
    // Amber for fair water turning green for the best (the old map's role colours, paint.ts), so the variation reads at a
    // glance; the circled zones mark where each fish earns it. (7.73's amber edge on the best cells is gone: the zones do that now.)
    map.setPaintProperty('fh-cells', 'fill-color', ['interpolate', ['linear'], score, 0.45, amber, 0.62, amber, 0.8, green]);
    map.setPaintProperty('fh-cells', 'fill-opacity', ['interpolate', ['linear'], ['zoom'], COAST, 0, COAST + 1, ['interpolate', ['linear'], score, 0.3, 0, 0.45, o(0.1), 0.8, o(0.32)], SPOT, ['interpolate', ['linear'], score, 0.3, 0, 0.45, o(0.08), 0.8, o(0.24)], SPOT + 2, ['interpolate', ['linear'], score, 0.3, 0, 0.45, o(0.03), 0.8, o(0.1)]]);
  };
  const add = () => {
    if (map.getSource('fh')) return;
    map.addSource('fh', { type: 'geojson', data: geojson, attribution: 'Habitat guide: GEBCO, Allen Coral Atlas, OSM' });
    map.addLayer({ id: 'fh-cells', type: 'fill', source: 'fh', minzoom: COAST, paint: { 'fill-color': amber, 'fill-opacity': 0, 'fill-antialias': false } }, map.getLayer(CONTOURS_FROM) ? CONTOURS_FROM : firstSymbolId(map));
    // The zones: rating colours as in mockup G (fill at 30 %, a dashed edge one shade deeper), names in ink on the halo.
    buildZones();
    map.addSource('fh-zones', { type: 'geojson', data: zonesGj });
    // Zone level 3, 2, 1 in the beach rating's great, good and fair (--lv4, --lv3, --lv2), edges in the deeper --ac shade.
    const byLv = (pre: string): ExpressionSpecification => ['match', ['get', 'lv'], 3, css(`--${pre}4`, '#0C6B66'), 2, css(`--${pre}3`, '#A5DBC2'), css(`--${pre}2`, '#F4C542')];
    const poly: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];
    map.addLayer({ id: 'fh-zone-fill', type: 'fill', source: 'fh-zones', minzoom: ZONE_Z, filter: poly, paint: { 'fill-color': byLv('lv'), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 0.3] } });
    map.addLayer({ id: 'fh-zone-line', type: 'line', source: 'fh-zones', minzoom: ZONE_Z, filter: ['all', poly, ['==', ['get', 'far'], 0]], layout: { 'line-join': 'round' }, paint: { 'line-color': byLv('ac'), 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1.2, 12, 1.8, 14, 2.2], 'line-dasharray': [3, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 1] } });
    // Boat zones: longer dashes, so water a cast can't reach reads differently at a glance.
    map.addLayer({ id: 'fh-zone-far', type: 'line', source: 'fh-zones', minzoom: ZONE_Z, filter: ['all', poly, ['==', ['get', 'far'], 1]], layout: { 'line-join': 'round' }, paint: { 'line-color': byLv('ac'), 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1.2, 12, 1.8, 14, 2.2], 'line-dasharray': [7, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 1] } });
    const name: ExpressionSpecification = ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }];
    map.addLayer({
      id: 'fh-zone-label', type: 'symbol', source: 'fh-zones', minzoom: ZONE_NAME_Z, filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': ['step', ['zoom'], name, ZONE_WHERE_Z, ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }, '\n', {}, ['get', 'where'], { 'font-scale': 0.82, 'text-color': css('--ink2', '#46576C') }]],
        'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], ZONE_NAME_Z, 10, 13, 12], 'text-anchor': ['get', 'anchor'], 'text-offset': ['get', 'off'], 'text-justify': 'auto', 'text-letter-spacing': 0.06, 'text-max-width': 30, 'text-padding': 4,
      },
      paint: { 'text-color': css('--ink', '#0A1626'), 'text-halo-color': css('--m-halo', '#ECEADF'), 'text-halo-width': 1.8 },
    });
    // SPEAR: the cells (green), the banned water that would be good (red), the CHECK water (dashed amber) and the circled zones.
    buildSpear();
    map.addSource('sp', { type: 'geojson', data: spearGj });
    map.addSource('sp-zones', { type: 'geojson', data: spearZonesGj });
    const spBefore = map.getLayer(CONTOURS_FROM) ? CONTOURS_FROM : firstSymbolId(map);
    const green = cssColour('--green', '#39ff7a'), red = cssColour('--red', '#ff3b2f');
    const spFade = (hi: number): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], COAST, 0, COAST + 1, ['interpolate', ['linear'], ['get', 'sp'], 0.3, 0, 0.45, o(hi * 0.4), 0.8, o(hi)], SPOT + 2, ['interpolate', ['linear'], ['get', 'sp'], 0.3, 0, 0.45, o(hi * 0.15), 0.8, o(hi * 0.4)]];
    map.addLayer({ id: 'sp-cells', type: 'fill', source: 'sp', minzoom: COAST, filter: ['!=', ['get', 'law'], 2], paint: { 'fill-color': green, 'fill-opacity': spFade(0.34) } }, spBefore);
    map.addLayer({ id: 'sp-ban', type: 'fill', source: 'sp', minzoom: COAST, filter: ['==', ['get', 'law'], 2], paint: { 'fill-color': red, 'fill-opacity': spFade(0.3) } }, spBefore);
    map.addLayer({ id: 'sp-check', type: 'line', source: 'sp', minzoom: COAST + 0.5, filter: ['==', ['get', 'law'], 1], paint: { 'line-color': amber, 'line-width': 1.2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } }, spBefore);
    const spPoly: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];
    const spLv: ExpressionSpecification = ['match', ['get', 'lv'], 3, css('--lv4', '#0C6B66'), 2, css('--lv3', '#A5DBC2'), css('--lv2', '#F4C542')];
    map.addLayer({ id: 'sp-zone-fill', type: 'fill', source: 'sp-zones', minzoom: ZONE_Z, filter: spPoly, paint: { 'fill-color': spLv, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 0.3] } });
    map.addLayer({ id: 'sp-zone-line', type: 'line', source: 'sp-zones', minzoom: ZONE_Z, filter: spPoly, layout: { 'line-join': 'round' }, paint: { 'line-color': green, 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1.4, 12, 2, 14, 2.4], 'line-dasharray': [3, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 1] } });
    map.addLayer({
      id: 'sp-zone-label', type: 'symbol', source: 'sp-zones', minzoom: ZONE_NAME_Z, filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': ['step', ['zoom'], ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }], ZONE_WHERE_Z, ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }, '\n', {}, ['get', 'where'], { 'font-scale': 0.82, 'text-color': css('--ink2', '#46576C') }]],
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
      refreshSpear();
    },
    scoreFor,
    setRules(z) {
      rules = z;
      // A national park (IUCN II: Cahuita, where spear guns are banned and line fishing is disputed, rule.cahuita.*) or
      // closed water gets no circle. The refuges (Gandoca-Manzanillo, Limoncito) have no fishing rule found, so they keep theirs.
      rule = Uint8Array.from(built.cells, (c) => {
        const p = zoneAt(z, [c.lng, c.lat]);
        return noZone(p) ? 2 : p ? 1 : 0;
      });
      law = Uint8Array.from(built.cells, (c) => ({ ok: 0, check: 1, banned: 2 })[spearStatus(zoneAt(z, [c.lng, c.lat]))]);
      refreshZones();
      refreshSpear();
    },
    setBoat(cells, key) {
      if (key === boatKey) return;
      boat = cells;
      boatKey = key;
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
      refreshSpear();
    },
    scoreAt: (lng, lat) => scoreFor(sp.id, lng, lat),
  };
}
