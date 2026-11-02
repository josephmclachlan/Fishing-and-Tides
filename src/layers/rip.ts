/**
 * Rip risk overlay (PLAN 4.2): at each named spot, a bar along the surf zone coloured by the
 * rip level (green LOW, amber MOD, red HIGH) and, for MOD and HIGH, an arrow running seaward
 * as far as a rip is expected to reach, labelled with its strength and length. Style layer
 * ids start with `rp-`, which the catalog's 'rip' layer binds to (layers/registry.ts).
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { M_PER_DEG_LAT, M_PER_DEG_LNG } from '../physics/bathy';
import type { SpotState } from '../spot-physics';

const FONT = ['Noto Sans Regular'];
const RAD = Math.PI / 180;
/** Half the length of the surf-zone bar along the shore, m. */
const BAR_HALF_M = 350;
/** Arrow-head barb length, m, and angle off the shaft. */
const BARB_M = 45;
const BARB_DEG = 28;

/** Point `m` metres from `p` on compass bearing `deg` (flat-earth; fine at these distances). */
export function offset(p: [number, number], deg: number, m: number): [number, number] {
  const a = deg * RAD;
  return [p[0] + (Math.sin(a) * m) / (M_PER_DEG_LNG * Math.cos(p[1] * RAD)), p[1] + (Math.cos(a) * m) / M_PER_DEG_LAT];
}

/** Surf-zone width from breaking depth and slope (unknown slope: an intermediate beach, 0.03), m. */
export const surfZoneWidth = (hb: number, slope: number | null) => Math.min(800, Math.max(20, hb / (slope && slope > 0 ? slope : 0.03)));

/** GeoJSON for the overlay. Pure, so it's tested without a map. */
export function ripFeatures(states: readonly SpotState[]): FeatureCollection {
  const features: Feature[] = [];
  for (const s of states) {
    const r = s.result;
    if (!r) continue;
    const { normalDeg } = r.waves;
    const level = r.rip.level;
    const xb = surfZoneWidth(r.waves.breaker.hb, r.waves.slope);
    const mid = offset(s.pin, normalDeg, xb / 2);
    features.push({
      type: 'Feature',
      properties: { kind: 'zone', level, name: s.name },
      geometry: { type: 'LineString', coordinates: [offset(mid, normalDeg - 90, BAR_HALF_M), offset(mid, normalDeg + 90, BAR_HALF_M)] },
    });
    const label = [
      `${t('rip.short')} ${t(`rip.${level}` as Key)}`,
      level === 'LOW' ? null : `${t(`rip.str.${r.rip.strength}` as Key)} ${r.rip.speedMs.toFixed(1)} ${t('unit.ms')} · ${Math.round(r.rip.lengthM / 10) * 10} ${t('unit.m')}`,
      `${t('sz.brk')} ${r.waves.breaker.Hb.toFixed(1)} ${t('unit.m')}${r.waves.breaker.type ? ' ' + t(`sz.type.${r.waves.breaker.type}` as Key) : ''}`,
    ].filter(Boolean).join('\n');
    let labelAt = offset(s.pin, normalDeg, xb + 150);
    if (level !== 'LOW') {
      const from = offset(s.pin, normalDeg, xb * 0.2);
      const tip = offset(s.pin, normalDeg, Math.max(r.rip.lengthM, xb * 0.6));
      features.push({ type: 'Feature', properties: { kind: 'arrow', level }, geometry: { type: 'LineString', coordinates: [from, tip] } });
      features.push({
        type: 'Feature',
        properties: { kind: 'arrow', level },
        geometry: { type: 'LineString', coordinates: [offset(tip, normalDeg + 180 - BARB_DEG, BARB_M), tip, offset(tip, normalDeg + 180 + BARB_DEG, BARB_M)] },
      });
      labelAt = offset(tip, normalDeg, 150);
    }
    features.push({ type: 'Feature', properties: { kind: 'label', level, label }, geometry: { type: 'Point', coordinates: labelAt } });
  }
  return { type: 'FeatureCollection', features };
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function mountRip(map: Map) {
  const colour: ExpressionSpecification = ['match', ['get', 'level'], 'HIGH', cssColour('--red', '#ff3b2f'), 'MOD', cssColour('--amber', '#ffb000'), cssColour('--green', '#39ff7a')];
  let data: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const add = () => {
    if (map.getSource('rp')) return;
    const below = firstSymbolId(map);
    map.addSource('rp', { type: 'geojson', data });
    map.addLayer({
      id: 'rp-zone', type: 'line', source: 'rp', minzoom: 9, filter: ['==', ['get', 'kind'], 'zone'],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': colour, 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 9, 3, 13, 10, 16, 40], 'line-opacity': 0.55, 'line-blur': 1 },
    }, below);
    map.addLayer({
      id: 'rp-arrow', type: 'line', source: 'rp', minzoom: 11, filter: ['==', ['get', 'kind'], 'arrow'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': colour, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 15, 3], 'line-dasharray': [2, 1.5] },
    });
    map.addLayer({
      id: 'rp-label', type: 'symbol', source: 'rp', minzoom: 11.5, filter: ['==', ['get', 'kind'], 'label'],
      layout: { 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.08, 'text-justify': 'center', 'text-allow-overlap': false },
      paint: { 'text-color': colour, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };
  if (map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    update(states: readonly SpotState[]) {
      data = ripFeatures(states);
      (map.getSource('rp') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
