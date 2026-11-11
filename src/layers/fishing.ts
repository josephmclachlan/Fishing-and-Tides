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
import type { ExpressionSpecification, GeoJSONSource, ImageSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { firstSymbolId } from '../map';
import { CONTOURS_FROM } from './seafloor';
import { buildCells, cellGeometry, cellIndexAt, STEP, type FishingInput, type Mouth } from '../fishing/cells';
import { coastTest, rgbaWord, seaImage, type SeaImage } from './sea-image';
import { bandColours, bandOf, smoothField } from './bands';
import { baseScore, habitatScore, seasonFactor } from '../fishing/habitat';
import { fitWeights, recordCells, type HabitatFit } from '../fishing/fit';
import { SPECIES, speciesById, type SpeciesId } from '../fishing/species';
import { occurrenceBoost, recordsFor, withEvidence } from '../fishing/occurrences';
import type { OccurrenceFile } from '../fishing/occurrence-taxa';
import { catchRecords, type CatchPin } from '../fishing/catches';
import { lifted, paintColour as cssColour, paintLift } from './paint';
import { ANCHOR_OFFSET, ZONE_LABEL, FAR_ZONES, fishZones, NEAR_ZONES, nearlyZones, speciesZones, zoneLabel, zoneRing, type Zone, type ZoneCell, type ZoneWhy } from '../fishing/zones';
import type { OffshoreId } from '../fishing/offshore';
import { nearestName, uniqueMarks } from '../fishing/near-name';
import { cellAt } from '../physics/bathy';
import { PLUME_RIVERS, RAIN_TOWNS, SPOTS } from '../region';
import { SURF_BREAKS } from '../data/surf-breaks';
import { PLACES as HARBOURS } from '../data/harbours';
import { t, type Key } from '../i18n';
import { zoneAt, type ZonePoly } from '../zone-lookup';
import { spearStatus } from '../rules';
import { spotWater } from '../fishing/spot-water';
import { SPEAR_SPECIES, spearScore, spearWindow } from '../fishing/spear';

const { COAST, SPOT } = TIER_ZOOM;
/**
 * The circled zones (mockup G): ovals and fish names from the coast view (PLAN 7.85, Joseph: "requires too much zoom"),
 * the where line from ZONE_WHERE_Z.
 */
const { z: ZONE_Z, nameZ: ZONE_NAME_Z, whereZ: ZONE_WHERE_Z } = ZONE_LABEL;
/** The heat's band edges (habitat score): nothing under fair (0.4), then a band every 0.05 up to the best water (0.8). */
export const HEAT_STEPS = [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8] as const;
/** Heat image pixel, degrees (~55 m, a quarter of a cell): fine enough that the coastline cut and the band edges read smooth. */
const HEAT_PIXEL_DEG = 0.0005;
const hexRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [244, 197, 66];
};
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
  /** The fishing water at a spot for a month (fishing/spot-water.ts), 0..1, or null with no sea cell near. */
  spotWater(lng: number, lat: number, month: number): number | null;
  /** The protected areas (PLAN 4.3): no circled zone inside a national park or closed water, no spear fish in any. */
  setRules(zones: readonly ZonePoly[]): void;
  /** Boat water scored per offshore species on a ~2 km grid for the day on the slider (main.ts), or null: its zones. */
  setBoat(cells: readonly ZoneCell<OffshoreId>[] | null, key: string): void;
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
  // Per cell: 2 where no zone is circled (a national park or closed water), 1 in another protected area, else 0.
  let rule = new Uint8Array(built.cells.length);
  let rules: readonly ZonePoly[] = [];
  const noZone = (p: ReturnType<typeof zoneAt>) => !!p && (p.status === 'closed' || p.iucn === '2');
  const parkAt = (lng: number, lat: number) => noZone(zoneAt(rules, [lng, lat]));
  let boat: readonly ZoneCell<OffshoreId>[] | null = null, boatKey = '';
  const depthText = ([d0, d1]: [number, number]) => (d0 === d1 ? `${d0} M` : `${d0}–${d1} M`);
  const zoneFeatures = (z: Zone<string>, names: string, where: string, far: boolean, nearly = false) => {
    const ring = zoneRing(z, 48, isWater);
    // The name just outside the oval on the open-sea side, clear of the beach and its rating tiles.
    const lab = zoneLabel(z, ring, isWater);
    const props = { lv: z.level, far: far ? 1 : 0, nearly: nearly ? 1 : 0, sp: names, where, anchor: lab.anchor, off: ANCHOR_OFFSET[lab.anchor] };
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
    const ids = SPECIES.map((x) => x.id);
    const kept = speciesZones(cells, ids, NEAR_ZONES);
    const nearWhere = (z: Zone<SpeciesId>) => {
      const at = nearestName(z.lng, z.lat, marks);
      return [z.why ? t(`fish.why.${z.why}` as Key) : '', depthText(z.depthM), at?.name.toUpperCase() ?? ''].filter(Boolean).join(' · ');
    };
    const spNames = (z: Zone<SpeciesId>) => z.species.map((id) => t(`fish.${id}` as Key)).join(' · ');
    const near = kept.flatMap((z) => zoneFeatures(z, spNames(z), nearWhere(z), false));
    // Water that nearly earned a circle (PLAN 7.85): dotted, no fill, said so on the label.
    const nearly = nearlyZones(cells, ids, kept).flatMap((z) => zoneFeatures(z, spNames(z), [t('fish.zone.nearly'), nearWhere(z)].join(' · '), false, true));
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
    zonesGj.features = [...nearly, ...far, ...near];
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

  // The fishing water as one smooth image (PLAN 7.80): the best of every eating fish's score with its season, per
  // ~220 m cell, blended between cells and cut at the coastline, in flat bands along the beach rating's own ramp
  // (fair yellow to great teal), so it reads like the other sea fields and the zones and pins share its colours.
  // The 220 m squares this replaces looked pixelated next to the sea fields from the coast zoom in.
  const coast = coastTest(input.land);
  const heatGrid = { cols: built.lattice.cols, rows: built.lattice.rows, lon0: built.lattice.lon0 + STEP / 2, lat0: built.lattice.lat0 - STEP / 2, dlon: STEP, dlat: STEP };
  const heatZ = new Float32Array(heatGrid.cols * heatGrid.rows);
  // Lattice points with no cell: on land, empty (the coastline cut and the shore fill take over there); at sea (too
  // deep, or past a long paddle), zero, so the heat fades out over its last cell instead of ending in 220 m steps.
  const heatBase = new Float32Array(heatGrid.cols * heatGrid.rows);
  for (let r = 0; r < heatGrid.rows; r++)
    for (let c = 0; c < heatGrid.cols; c++) heatBase[r * heatGrid.cols + c] = cellAt(input.land, heatGrid.lon0 + c * STEP, heatGrid.lat0 - r * STEP) === 1 ? NaN : 0;
  const heatStops = (['--lv2', '--lv3', '--ac4'] as const).map((n, i) => hexRgb(css(n, ['#F4C542', '#A5DBC2', '#0C6B66'][i])));
  const heatWords = [0, ...bandColours(heatStops, HEAT_STEPS.length).map((c, k) => rgbaWord(c[0], c[1], c[2], Math.round(255 * o(0.14 + (0.36 * k) / (HEAT_STEPS.length - 1)))))];
  const heatWord = (v: number) => (v === v ? heatWords[bandOf(HEAT_STEPS, v)] : 0);
  const heatImage = () => {
    heatZ.set(heatBase);
    const season = SPECIES.map((x) => seasonFactor(x, month));
    for (const [i, c] of built.cells.entries()) {
      const p = geojson.features[i].properties as Record<string, number>;
      let best = 0;
      if (inReach(c.coastM)) SPECIES.forEach((x, k) => (best = Math.max(best, p[x.id] * season[k])));
      const col = Math.floor((c.lng - built.lattice.lon0) / STEP), row = Math.floor((built.lattice.lat0 - c.lat) / STEP);
      heatZ[row * heatGrid.cols + col] = best;
    }
    // A light blur first (bands.ts smoothField): band edges drawn straight off a 220 m lattice come out as steps.
    return seaImage(heatGrid, smoothField(heatZ, heatGrid.cols, heatGrid.rows, 2), heatWord, { pixelDeg: HEAT_PIXEL_DEG, coast, extend: 1 });
  };
  const heatUrl = (img: SeaImage) => {
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    cv.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
    return cv.toDataURL('image/png');
  };
  let heatKey = '';
  const paint = () => {
    const key = `${month}|${reach}|${catchKey}`;
    if (key === heatKey || !map.getSource('fh-heat')) return;
    heatKey = key;
    const img = heatImage();
    (map.getSource('fh-heat') as ImageSource).updateImage({ url: heatUrl(img), coordinates: img.coordinates });
  };
  const add = () => {
    if (map.getSource('fh-heat')) return;
    const img = heatImage();
    heatKey = `${month}|${reach}|${catchKey}`;
    map.addSource('fh-heat', { type: 'image', url: heatUrl(img), coordinates: img.coordinates });
    // Fades in past the coast tier and steps back to a tint by the spot tier, where the zones and the reefs carry the detail.
    // Zoomed in it stays strong enough to read which water is better (PLAN 7.85).
    map.addLayer({ id: 'fh-heat', type: 'raster', source: 'fh-heat', minzoom: COAST, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], COAST, 0, COAST + 1, 1, SPOT, 0.9, SPOT + 2, 0.6], 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, map.getLayer(CONTOURS_FROM) ? CONTOURS_FROM : firstSymbolId(map));
    // The zones: rating colours as in mockup G (fill at 30 %, a dashed edge one shade deeper), names in ink on the halo.
    buildZones();
    map.addSource('fh-zones', { type: 'geojson', data: zonesGj });
    // Zone level 3, 2, 1 in the beach rating's great, good and fair (--lv4, --lv3, --lv2), edges in the deeper --ac shade.
    const byLv = (pre: string): ExpressionSpecification => ['match', ['get', 'lv'], 3, css(`--${pre}4`, '#0C6B66'), 2, css(`--${pre}3`, '#A5DBC2'), css(`--${pre}2`, '#F4C542')];
    const poly: ExpressionSpecification = ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'nearly'], 0]];
    map.addLayer({ id: 'fh-zone-fill', type: 'fill', source: 'fh-zones', minzoom: ZONE_Z, filter: poly, paint: { 'fill-color': byLv('lv'), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 0.3] } });
    map.addLayer({ id: 'fh-zone-line', type: 'line', source: 'fh-zones', minzoom: ZONE_Z, filter: ['all', poly, ['==', ['get', 'far'], 0]], layout: { 'line-join': 'round' }, paint: { 'line-color': byLv('ac'), 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1.2, 12, 1.8, 14, 2.2], 'line-dasharray': [3, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 1] } });
    // Boat zones: longer dashes, so water a cast can't reach reads differently at a glance.
    map.addLayer({ id: 'fh-zone-far', type: 'line', source: 'fh-zones', minzoom: ZONE_Z, filter: ['all', poly, ['==', ['get', 'far'], 1]], layout: { 'line-join': 'round' }, paint: { 'line-color': byLv('ac'), 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1.2, 12, 1.8, 14, 2.2], 'line-dasharray': [7, 3], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 1] } });
    // Nearly zones: a fine dotted edge in the fair colour, no fill.
    map.addLayer({ id: 'fh-zone-nearly', type: 'line', source: 'fh-zones', minzoom: ZONE_Z, filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'nearly'], 1]], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': css('--ac2', '#A67800'), 'line-width': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 1, 12, 1.5, 14, 1.9], 'line-dasharray': [0.1, 2.2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], ZONE_Z, 0, ZONE_Z + 0.5, 0.9] } });
    const name: ExpressionSpecification = ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }];
    const nearlyName: ExpressionSpecification = ['format', ['get', 'sp'], {}, '\n', {}, t('fish.zone.nearly'), { 'font-scale': ZONE_LABEL.whereScale }];
    map.addLayer({
      id: 'fh-zone-label', type: 'symbol', source: 'fh-zones', minzoom: ZONE_NAME_Z, filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': ['step', ['zoom'],
          ['case', ['==', ['get', 'nearly'], 1], nearlyName, name],
          ZONE_WHERE_Z, ['case', ['==', ['get', 'nearly'], 1], ['format', ['get', 'sp'], {}, '\n', {}, ['get', 'where'], { 'font-scale': ZONE_LABEL.whereScale }], ['format', ['get', 'sp'], { 'text-font': ['literal', ['Noto Sans Bold']] }, '\n', {}, ['get', 'where'], { 'font-scale': 0.82, 'text-color': css('--ink2', '#46576C') }]]],
        'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], ...ZONE_LABEL.sizes.flat()], 'text-anchor': ['get', 'anchor'], 'text-offset': ['get', 'off'], 'text-justify': 'auto', 'text-letter-spacing': 0.06, 'text-max-width': 30, 'text-padding': 4,
        // Drawn over the place names (the map shell keeps this layer on top), so a town or a reef label never knocks a fish
        // name out (Joseph: "very inconsistently displaying"). Zone names don't pile on each other: the best zones are placed
        // first and the rest show as you zoom in.
        'symbol-sort-key': ['-', ['*', 10, ['get', 'nearly']], ['get', 'lv']],
      },
      paint: { 'text-color': ['case', ['==', ['get', 'nearly'], 1], css('--ink2', '#46576C'), css('--ink', '#0A1626')], 'text-halo-color': css('--m-halo', '#ECEADF'), 'text-halo-width': 1.8 },
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
  // Each cell's best eating fish for a month, for the spot water (the FISH pins); rebuilt when the month or catches change.
  let bestKey = '';
  let bestCell = new Float32Array(0);
  const bestFor = (m: number) => {
    const key = `${m}|${catchKey}`;
    if (key !== bestKey) {
      bestKey = key;
      bestCell = Float32Array.from(built.cells, (c) => {
        let b = 0;
        for (const s of SPECIES) b = Math.max(b, Math.min(1, habitatScore(s, c.f, m, fits[s.id].weights) * (1 + boostAt(s.id, c.lng, c.lat))));
        return b;
      });
    }
    return bestCell;
  };
  return {
    fits: () => fits,
    spotWater: (lng, lat, m) => spotWater(built.cells, bestFor(m), lng, lat),
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
