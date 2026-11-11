/**
 * CORAL overlay map layer (PLAN 7.31). Style layer ids start with `cr-`; shown only while the CORAL
 * switch (coral-mode.ts) is on, not by the layer store. Two parts:
 *  - Each reef in CORAL_REEFS as a ring with its name, DHW and alert level (from the coral heat feed,
 *    adapters/coral.ts), at every zoom, since the reefs are too small to see from the macro view.
 *  - From the coast tier in, the reef polygons (OSM reef areas, Allen Coral Atlas crest and flats)
 *    filled in the colour of the nearest reef's alert level.
 * Colours: green no stress, amber watch or warning, red alert 1 or 2. Grey-dim when there is no reading.
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import { TIER_ZOOM } from '../region';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { ALERT_KEYS, coralNow, nearestReef, type CoralData } from '../adapters/coral';
import { paintColour as cssColour } from './paint';

const { COAST, SPOT } = TIER_ZOOM;
/** Tone per alert level, as the legend and the panel show it. */
export type CoralTone = 'green' | 'amber' | 'red' | 'dim';
export const toneOf = (level: number | null): CoralTone => (level === null ? 'dim' : level >= 3 ? 'red' : level >= 1 ? 'amber' : 'green');

/** One mark per reef: ring colour, short label (name) and the label with the reading from the coast tier. */
export function reefPoints(d: CoralData | null, reefs: readonly { id: string; name: string; lngLat: [number, number] }[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: reefs.map((r) => {
      const feed = d?.reefs.find((x) => x.id === r.id);
      const now = d && feed ? coralNow(d, feed) : null;
      const level = now?.alert ?? null;
      const dhw = now && Number.isFinite(now.dhw) ? `DHW ${now.dhw.toFixed(1)}` : t('coral.nodata');
      const alert = level === null ? '' : ` · ${t(`coral.alert.${ALERT_KEYS[level]}` as Key)}`;
      return { type: 'Feature', properties: { id: r.id, tone: toneOf(level), name: r.name, detail: `${r.name}\n${dhw}${alert}` }, geometry: { type: 'Point', coordinates: r.lngLat } };
    }),
  };
}

/** A position inside a polygon's first ring, good enough to find the nearest reef (bbox centre). */
function centre(g: Geometry): Position | null {
  const ring = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : null;
  if (!ring?.length) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) (w = Math.min(w, x), e = Math.max(e, x), s = Math.min(s, y), n = Math.max(n, y));
  return [(w + e) / 2, (s + n) / 2];
}

const REEF_ZONES = new Set(['REEF CREST', 'OUTER REEF FLAT', 'INNER REEF FLAT', 'TERRESTRIAL REEF FLAT', 'PLATEAU', 'REEF SLOPE', 'BACK REEF SLOPE', 'SHELTERED REEF SLOPE']);

/**
 * Reef polygons to shade: OSM `reef-area` outlines and Allen Coral Atlas reef zones (not lagoons or
 * bottom cover), each tagged with the alert tone of the nearest coral reef point.
 */
export function reefPolygons(d: CoralData | null, sources: FeatureCollection[]): FeatureCollection {
  const out: Feature[] = [];
  for (const fc of sources) {
    for (const f of fc.features) {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      const keep = p.kind === 'reef-area' || (p.layer === 'zone' && REEF_ZONES.has(String(p.cls)));
      if (!keep || !f.geometry) continue;
      const c = centre(f.geometry);
      if (!c) continue;
      const reef = d ? nearestReef(d, [c[0], c[1]]) : null;
      const level = d && reef ? coralNow(d, reef).alert : null;
      out.push({ type: 'Feature', properties: { tone: toneOf(level) }, geometry: f.geometry });
    }
  }
  return { type: 'FeatureCollection', features: out };
}


export function mountCoral(map: Map, reefs: readonly { id: string; name: string; lngLat: [number, number] }[]) {
  const amber = cssColour('--amber', '#ffb000');
  const green = cssColour('--green', '#39ff7a');
  const red = cssColour('--red', '#ff3b2f');
  let heat: CoralData | null = null;
  let polys: FeatureCollection[] = [];
  let visible = false;
  const tone: ExpressionSpecification = ['match', ['get', 'tone'], 'green', green, 'red', red, amber];
  const dimOr = (on: number, dim: number): ExpressionSpecification => ['case', ['==', ['get', 'tone'], 'dim'], dim, on];
  const vis = () => (visible ? 'visible' : 'none');

  const add = () => {
    if (map.getSource('cr-pts')) return;
    map.addSource('cr-pts', { type: 'geojson', data: reefPoints(heat, reefs), attribution: 'NOAA Coral Reef Watch' });
    map.addSource('cr-polys', { type: 'geojson', data: reefPolygons(heat, polys) });
    const below = firstSymbolId(map);
    map.addLayer({ id: 'cr-fill', type: 'fill', source: 'cr-polys', minzoom: COAST, layout: { visibility: vis() }, paint: { 'fill-color': tone, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], COAST, 0.25, SPOT, 0.35] } }, below);
    map.addLayer({ id: 'cr-line', type: 'line', source: 'cr-polys', minzoom: COAST, layout: { visibility: vis() }, paint: { 'line-color': tone, 'line-width': 1, 'line-opacity': dimOr(0.9, 0.4) } }, below);
    map.addLayer({
      id: 'cr-ring', type: 'circle', source: 'cr-pts', layout: { visibility: vis() },
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, COAST, 7, SPOT, 12], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': tone, 'circle-stroke-width': ['match', ['get', 'tone'], 'red', 3, 2], 'circle-stroke-opacity': dimOr(1, 0.5) },
    });
    map.addLayer({
      id: 'cr-label', type: 'symbol', source: 'cr-pts', minzoom: COAST - 1,
      layout: {
        visibility: vis(), 'text-field': ['step', ['zoom'], ['get', 'name'], COAST, ['get', 'detail']],
        'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [1.2, 0], 'text-justify': 'left', 'text-letter-spacing': 0.08,
      },
      paint: { 'text-color': tone, 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': dimOr(1, 0.6) },
    });
  };
  const refresh = () => {
    (map.getSource('cr-pts') as GeoJSONSource | undefined)?.setData(reefPoints(heat, reefs));
    (map.getSource('cr-polys') as GeoJSONSource | undefined)?.setData(reefPolygons(heat, polys));
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);

  return {
    setVisible(on: boolean) {
      visible = on;
      for (const id of ['cr-fill', 'cr-line', 'cr-ring', 'cr-label']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis());
    },
    /** The coral heat feed, once loaded. */
    setHeat(d: CoralData | null) {
      heat = d;
      refresh();
    },
    /** Reef outlines from the seafloor data (OSM marks, Allen Coral Atlas), once loaded. */
    setReefPolygons(fcs: FeatureCollection[]) {
      polys = fcs;
      refresh();
    },
  };
}
