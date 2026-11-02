/**
 * Protected-zone map layer (PLAN 4.3): Cahuita National Park and Gandoca-Manzanillo Wildlife
 * Refuge outlines, marine parts included, from SINAC boundaries via OSM (scripts/fetch-zones.ts).
 * Red hatch-style outline for no-fishing, amber for restricted. Style layer ids start with
 * `pz-`, which the catalog's 'zones' layer binds to (layers/registry.ts).
 */
import type { ExpressionSpecification, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection, MultiPolygon } from 'geojson';
import { TIER_ZOOM } from '../region';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import type { LngLat, ZoneProps } from '../zones';
import type { ZonePoly } from '../zone-lookup';

const FONT = ['Noto Sans Regular'];
const DIR = 'data/zones/zones.geojson';

export type ZoneFeature = Feature<MultiPolygon, ZoneProps>;

/** Load the outlines. Returns when they were built (feeds DATA AGE). */
export async function fetchZones(base: string = import.meta.env.BASE_URL): Promise<{ data: ZonePoly[]; geojson: FeatureCollection; fetchedAt: number }> {
  const res = await fetch(`${base}${DIR}`);
  if (!res.ok) throw new Error(`zones: ${res.status}`);
  const gj = (await res.json()) as FeatureCollection & { fetchedAt: string };
  const data = (gj.features as ZoneFeature[]).map((f) => ({ props: f.properties, rings: f.geometry.coordinates.map((p) => p[0] as LngLat[]) }));
  return { data, geojson: gj, fetchedAt: Date.parse(gj.fetchedAt) };
}

export const zoneName = (p: ZoneProps) => t(`zone.${p.id}.name` as Key);
export const zoneStatus = (p: ZoneProps) => t(`zone.status.${p.status}` as Key);

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function mountZones(map: Map, geojson: FeatureCollection) {
  const red = cssColour('--red', '#ff3b2f');
  const amber = cssColour('--amber', '#ffb000');
  const labelled: FeatureCollection = {
    ...geojson,
    features: geojson.features.map((f) => {
      const p = f.properties as unknown as ZoneProps;
      return { ...f, properties: { ...p, label: `${zoneName(p)}\n${zoneStatus(p)}` } };
    }),
  };
  const add = () => {
    if (map.getSource('pz')) return;
    const below = map.getLayer('grat-macro') ? 'grat-macro' : firstSymbolId(map);
    map.addSource('pz', { type: 'geojson', data: labelled, attribution: 'SINAC via © OpenStreetMap' });
    const colour: ExpressionSpecification = ['match', ['get', 'status'], 'closed', red, amber];
    map.addLayer({ id: 'pz-fill', type: 'fill', source: 'pz', paint: { 'fill-color': colour, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.1, TIER_ZOOM.SPOT, 0.14] } }, below);
    map.addLayer({ id: 'pz-line', type: 'line', source: 'pz', paint: { 'line-color': colour, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 14, 2], 'line-dasharray': [4, 3], 'line-opacity': 0.85 } }, below);
    map.addLayer({
      id: 'pz-label', type: 'symbol', source: 'pz', minzoom: 8.5,
      layout: { 'symbol-placement': 'point', 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.1, 'text-justify': 'center' },
      paint: { 'text-color': colour, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
