/**
 * Rip risk overlay (PLAN 4.2): at each named spot, a band along the surf zone coloured by the
 * rip level (green LOW, amber MOD, red HIGH) and, for MOD and HIGH, an arrow running seaward
 * as far as a rip is expected to reach, labelled with its strength and length. Style layer
 * ids start with `rp-`, which the catalog's 'rip' layer binds to (layers/registry.ts).
 *
 * With the OSM coastline mask (`land`, ~33 m cells) the band traces the real shore, just
 * seaward of the waterline, and the shore normal comes from the mask too. The physics' own
 * normal is read off the ~460 m depth grid, which can be tens of degrees out on a curved
 * shore, and a straight bar from it cut across land at Salsa Brava and Playa Negra.
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { cellAt, M_PER_DEG_LAT, M_PER_DEG_LNG, type Grid } from '../physics/bathy';
import type { SpotState } from '../spot-physics';

const FONT = ['Noto Sans Regular'];
const RAD = Math.PI / 180;
/** Half the length of the surf-zone bar along the shore, m. */
const BAR_HALF_M = 200;
/** Arrow-head barb length, m, and angle off the shaft. */
const BARB_M = 45;
const BARB_DEG = 28;

/** Point `m` metres from `p` on compass bearing `deg` (flat-earth; fine at these distances). */
export function offset(p: [number, number], deg: number, m: number): [number, number] {
  const a = deg * RAD;
  return [p[0] + (Math.sin(a) * m) / (M_PER_DEG_LNG * Math.cos(p[1] * RAD)), p[1] + (Math.cos(a) * m) / M_PER_DEG_LAT];
}

/** Along-shore spacing of the band's points, and the step used to find the waterline, m. */
const ALONG_STEP_M = 25;
const SEARCH_STEP_M = 8;
/** How far inland and seaward of the pin's shore line the waterline is looked for, m. */
const SEARCH_IN_M = 250;
const SEARCH_OUT_M = 400;
/** The coastline mask's cells are ~33 m and sit up to a cell inland of the drawn coast: keep the band clear of the beach. */
const MASK_SLACK_M = 25;

const isLand = (land: Grid, p: [number, number]) => cellAt(land, p[0], p[1]) === 1;

/**
 * Seaward shore normal at a shoreline pin from the coastline mask: the mean direction from the
 * pin to every sea cell within `radiusM`. On a straight shore that is square to the coast; on a
 * headland or in a bay it points to the open side. Null when there is no sea within reach.
 */
export function maskNormal(land: Grid, pin: [number, number], radiusM = 300): number | null {
  const mx = M_PER_DEG_LNG * Math.cos(pin[1] * RAD);
  const step = Math.max(land.dlon * mx, 10);
  const n = Math.ceil(radiusM / step);
  let sx = 0;
  let sy = 0;
  for (let i = -n; i <= n; i++)
    for (let j = -n; j <= n; j++) {
      const dx = i * step;
      const dy = j * step;
      const r = Math.hypot(dx, dy);
      if (r === 0 || r > radiusM) continue;
      const v = cellAt(land, pin[0] + dx / mx, pin[1] + dy / M_PER_DEG_LAT);
      if (Number.isNaN(v) || v === 1) continue;
      sx += dx / r;
      sy += dy / r;
    }
  if (Math.hypot(sx, sy) < 1e-9) return null;
  return (((Math.atan2(sx, sy) / RAD) % 360) + 360) % 360;
}

/**
 * The surf-zone band as lines `seawardM` out from the waterline, following the coast for
 * `halfM` either side of the pin. Each along-shore station looks along the normal for the
 * land-to-sea edge nearest the pin's shore line; stations that find none, or that jump to
 * another stretch of coast (across a bay), break the line, so it never crosses land.
 */
export function shoreBand(land: Grid, pin: [number, number], normalDeg: number, halfM: number, seawardM: number): [number, number][][] {
  const lines: [number, number][][] = [];
  let line: [number, number][] = [];
  let lastT: number | null = null;
  const flush = () => {
    if (line.length >= 2) lines.push(line);
    line = [];
    lastT = null;
  };
  for (let s = -halfM; s <= halfM + 1e-9; s += ALONG_STEP_M) {
    const base = offset(pin, normalDeg + 90, s);
    let best: number | null = null;
    let prevLand = isLand(land, offset(base, normalDeg, -SEARCH_IN_M));
    for (let t = -SEARCH_IN_M + SEARCH_STEP_M; t <= SEARCH_OUT_M; t += SEARCH_STEP_M) {
      const here = isLand(land, offset(base, normalDeg, t));
      if (prevLand && !here && (best === null || Math.abs(t) < Math.abs(best))) best = t;
      prevLand = here;
    }
    if (best === null || (lastT !== null && Math.abs(best - lastT) > 3 * ALONG_STEP_M)) {
      flush();
      if (best === null) continue;
    }
    const p = offset(base, normalDeg, best + seawardM);
    if (isLand(land, p)) {
      flush();
      continue;
    }
    line.push(p);
    lastT = best;
  }
  flush();
  return lines;
}

/** Surf-zone width from breaking depth and slope (unknown slope: an intermediate beach, 0.03), m. */
export const surfZoneWidth = (hb: number, slope: number | null) => Math.min(800, Math.max(20, hb / (slope && slope > 0 ? slope : 0.03)));

/**
 * GeoJSON for the overlay. Pure, so it's tested without a map. Without the coastline mask the
 * band is a straight bar square to the physics' shore normal (the first paint, before it loads).
 */
export function ripFeatures(states: readonly SpotState[], land?: Grid | null): FeatureCollection {
  const features: Feature[] = [];
  for (const s of states) {
    const r = s.result;
    if (!r) continue;
    const normalDeg = (land && maskNormal(land, s.pin)) ?? r.waves.normalDeg;
    const level = r.rip.level;
    const xb = surfZoneWidth(r.waves.breaker.hb, r.waves.slope);
    const zone = (coordinates: [number, number][]): Feature => ({ type: 'Feature', properties: { kind: 'zone', level, name: s.name }, geometry: { type: 'LineString', coordinates } });
    if (land) for (const l of shoreBand(land, s.pin, normalDeg, BAR_HALF_M, xb / 2 + MASK_SLACK_M)) features.push(zone(l));
    else {
      const mid = offset(s.pin, normalDeg, xb / 2);
      features.push(zone([offset(mid, normalDeg - 90, BAR_HALF_M), offset(mid, normalDeg + 90, BAR_HALF_M)]));
    }
    const label = [
      `${t('rip.short')} ${t(`rip.${level}` as Key)}`,
      level === 'LOW' ? null : `${t(`rip.str.${r.rip.strength}` as Key)} ${r.rip.speedMs.toFixed(1)} ${t('unit.ms')} · ${Math.round(r.rip.lengthM / 10) * 10} ${t('unit.m')}`,
      `${t('sz.brk')} ${r.waves.breaker.Hb.toFixed(1)} ${t('unit.m')}${r.waves.breaker.type ? ' ' + t(`sz.type.${r.waves.breaker.type}` as Key) : ''}`,
    ].filter(Boolean).join('\n');
    let labelAt = offset(s.pin, normalDeg, xb + MASK_SLACK_M + 150);
    if (level !== 'LOW') {
      const from = offset(s.pin, normalDeg, xb * 0.2 + (land ? MASK_SLACK_M : 0));
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
      layout: { 'line-cap': 'round', 'line-join': 'round' },
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
    update(states: readonly SpotState[], land?: Grid | null) {
      data = ripFeatures(states, land);
      (map.getSource('rp') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
