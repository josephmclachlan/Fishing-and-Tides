/**
 * Rip risk overlay (PLAN 4.2, reworked). What it shows, and what it doesn't:
 *
 * - **Risk along the coast.** Rips can form on any beach with breaking waves, and nobody can
 *   forecast exactly where a sand-bar rip opens. So the overlay shades the whole exposed shore
 *   (stations every ~120 m along the OSM coastline, just seaward of the waterline) with the
 *   modelled risk, blended from the two nearest named spots the physics runs at. Only MOD and
 *   HIGH are drawn: a calm day shows nothing. The shading fades with distance from a modelled
 *   spot, because the blend is less sure there.
 * - **Fixed rip sites.** Places where rips form again and again because something holds the
 *   channel in place: river and creek mouths (water draining seaward cuts a gap in the bar) and
 *   surf breaks whose guides list rips as a hazard (reef gaps, points). Shown as rings at every
 *   risk level; they turn amber or red when the risk around them is up. A mouth of a river GloFAS
 *   forecasts (PLAN 7.58c) also turns up with the river's own flow, whatever the surf: a flooding river
 *   pushes a jet straight out through its channel. Flow twice the river's median raises the ring to MOD,
 *   four times to HIGH (rules of thumb, not calibrated), and the ring says RIVER IN FLOOD.
 * - **The model's reading at each spot**, as a text label offshore of the spot (MOD and HIGH
 *   only): strength, speed and expected reach. No arrows: an arrow from the spot pin pretended
 *   to know where the rip would be.
 *
 * Style layer ids start with `rp-`, which the catalog's 'rip' layer binds to (layers/registry.ts).
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { REGION } from '../region';
import { cellAt, M_PER_DEG_LAT, M_PER_DEG_LNG, type Grid } from '../physics/bathy';
import type { SpotState } from '../spot-physics';
import { ripLevel } from '../physics/rip';

const FONT = ['Noto Sans Regular'];
const RAD = Math.PI / 180;

/** Point `m` metres from `p` on compass bearing `deg` (flat-earth; fine at these distances). */
export function offset(p: [number, number], deg: number, m: number): [number, number] {
  const a = deg * RAD;
  return [p[0] + (Math.sin(a) * m) / (M_PER_DEG_LNG * Math.cos(p[1] * RAD)), p[1] + (Math.cos(a) * m) / M_PER_DEG_LAT];
}

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

/** Surf-zone width from breaking depth and slope (unknown slope: an intermediate beach, 0.03), m. */
export const surfZoneWidth = (hb: number, slope: number | null) => Math.min(800, Math.max(20, hb / (slope && slope > 0 ? slope : 0.03)));

/** A shoreline station: a point in the surf zone, the way the shore faces, and its clear water. */
export interface Station {
  p: [number, number];
  normalDeg: number;
  /** Distance to the nearest land (the coastline mask), m, capped at CLEAR_MAX_M: the glow's radius, so it never reaches the beach. */
  clearM: number;
}

/** Along-shore spacing of the coast stations, m, and how far seaward of the waterline they may sit (furthest first). */
const STATION_STEP_M = 60;
const STATION_SEAWARD_M = [110, 80, 55, 35];
/** Largest glow radius, m: the station's own offset, so the glow spans the surf zone from the waterline out. */
const CLEAR_MAX_M = 110;
const CLEAR_STEP_M = 5;
const CLEAR_BEARINGS = 32;

/** Distance from `p` to the nearest land cell along 32 bearings, m, up to `maxM` (returned when none is closer). */
export function clearanceM(land: Grid, p: [number, number], maxM = CLEAR_MAX_M): number {
  let best = maxM;
  for (let k = 0; k < CLEAR_BEARINGS; k++)
    for (let m = CLEAR_STEP_M; m < best; m += CLEAR_STEP_M)
      if (isLand(land, offset(p, (k * 360) / CLEAR_BEARINGS, m))) {
        best = m - CLEAR_STEP_M / 2;
        break;
      }
  return Math.max(0, best);
}
/** A station must see open water this far out along its normal (rivers, lagoons and harbours don't). */
const EXPOSURE_M = 900;

/**
 * Shoreline stations from the coastline mask: land cells with a water neighbour, thinned to one
 * per `stepM` square, kept only where the shore faces open sea (no land within `EXPOSURE_M`
 * along the seaward normal). Pure; runs once when the mask loads (a few tens of ms).
 */
export function coastStations(land: Grid, stepM = STATION_STEP_M): Station[] {
  const { cols, rows, z } = land;
  const latMid = land.lat0 - (rows * land.dlat) / 2;
  const cellX = land.dlon * M_PER_DEG_LNG * Math.cos(latMid * RAD);
  const cellY = land.dlat * M_PER_DEG_LAT;
  const binC = Math.max(1, Math.round(stepM / cellX));
  const binR = Math.max(1, Math.round(stepM / cellY));
  const seen = new Set<number>();
  // A bin full of river bank would test every cell in it; a few tries are enough to find its beach.
  const tries = new globalThis.Map<number, number>();
  const out: Station[] = [];
  for (let r = 1; r < rows - 1; r++)
    for (let c = 1; c < cols - 1; c++) {
      const i = r * cols + c;
      if (z[i] !== 1) continue;
      if (z[i - 1] === 1 && z[i + 1] === 1 && z[i - cols] === 1 && z[i + cols] === 1) continue;
      const bin = Math.floor(r / binR) * 100000 + Math.floor(c / binC);
      if (seen.has(bin) || (tries.get(bin) ?? 0) >= 4) continue;
      tries.set(bin, (tries.get(bin) ?? 0) + 1);
      const at: [number, number] = [land.lon0 + c * land.dlon, land.lat0 - r * land.dlat];
      const n = maskNormal(land, at, 250);
      if (n === null) continue;
      let open = true;
      for (let m = 60; m <= EXPOSURE_M && open; m += 30) if (isLand(land, offset(at, n, m))) open = false;
      if (!open) continue;
      // The spot along the normal with the most clear water around it (a rocky shore or a reef can
      // put a step back on land), so its glow can be widest without reaching the beach.
      let p: [number, number] | null = null;
      let clearM = 0;
      for (const m of STATION_SEAWARD_M) {
        const q = offset(at, n, m);
        if (isLand(land, q)) continue;
        const cl = clearanceM(land, q);
        if (cl > clearM) (p = q), (clearM = cl);
        if (cl >= CLEAR_MAX_M) break;
      }
      if (!p || clearM < 15) continue;
      seen.add(bin);
      out.push({ p, normalDeg: n, clearM });
    }
  return out;
}

const flatM = (a: [number, number], b: [number, number]) =>
  Math.hypot((a[0] - b[0]) * M_PER_DEG_LNG * Math.cos(a[1] * RAD), (a[1] - b[1]) * M_PER_DEG_LAT);

/** Blend weight falls to this at and beyond `FAR_M` from the nearest modelled spot. */
const NEAR_M = 3000;
const FAR_M = 15000;
const MIN_CONF = 0.35;

/**
 * Rip score at a point, blended from the two nearest spots with a result (inverse distance
 * squared), and how sure the blend is (1 within 3 km of a spot, down to 0.35 at 15 km).
 */
export function riskAt(p: [number, number], states: readonly SpotState[]): { score: number; conf: number } | null {
  const near = states
    .filter((s) => s.result && s.liveSea !== false)
    .map((s) => ({ s, d: flatM(p, s.pin) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  if (!near.length) return null;
  let w = 0;
  let sum = 0;
  for (const { s, d } of near) {
    const wi = 1 / Math.max(d, 100) ** 2;
    w += wi;
    sum += wi * s.result!.rip.score;
  }
  const d0 = near[0].d;
  const conf = d0 <= NEAR_M ? 1 : Math.max(MIN_CONF, 1 - ((1 - MIN_CONF) * (d0 - NEAR_M)) / (FAR_M - NEAR_M));
  return { score: sum / w, conf };
}

/** River flow over its median at which a mouth's ring rises to MOD and to HIGH (PLAN 7.58c). */
export const FLOOD_RATIO = { MOD: 2, HIGH: 4 } as const;
const RANK = { LOW: 0, MOD: 1, HIGH: 2 } as const;

/** The level a river's flow alone gives its mouth, or null when the flow is unknown. */
export function floodLevel(ratio: number | null | undefined): 'LOW' | 'MOD' | 'HIGH' | null {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return null;
  return ratio >= FLOOD_RATIO.HIGH ? 'HIGH' : ratio >= FLOOD_RATIO.MOD ? 'MOD' : 'LOW';
}

/** A place where rips keep forming: a river mouth or a break whose guides list rips. */
export interface RipSite {
  name: string;
  at: [number, number];
  kind: 'mouth' | 'break';
}

/** Fixed rip sites from river mouths (main rivers and creeks, not culverts) and the surf break catalogue. */
export function ripSites(mouths: readonly { name: string; rank: number; at: [number, number] }[], breaks: readonly { name: string; lngLat: [number, number]; hazards: readonly string[] }[]): RipSite[] {
  const sites: RipSite[] = breaks.filter((b) => b.hazards.includes('rip')).map((b) => ({ name: b.name, at: b.lngLat, kind: 'break' }));
  for (const m of mouths) {
    if (m.rank < 1) continue;
    // The mouths file has a few rivers twice (two channels); one ring each.
    if (sites.some((s) => flatM(s.at, m.at) < 400)) continue;
    sites.push({ name: m.name, at: m.at, kind: 'mouth' });
  }
  return sites;
}

/**
 * GeoJSON for the overlay. Pure, so it's tested without a map. `stations` are the coast
 * stations (none until the coastline mask loads: then only the sites and labels show).
 */
export function ripFeatures(states: readonly SpotState[], stations: readonly Station[] = [], sites: readonly RipSite[] = [], land?: Grid | null, flowAt?: (at: [number, number]) => number | null): FeatureCollection {
  const features: Feature[] = [];
  for (const st of stations) {
    const r = riskAt(st.p, states);
    if (!r) continue;
    const level = ripLevel(r.score);
    if (level === 'LOW') continue;
    features.push({ type: 'Feature', properties: { kind: 'coast', level, conf: Math.round(r.conf * 100) / 100, r: Math.round(st.clearM) }, geometry: { type: 'Point', coordinates: st.p } });
  }
  for (const site of sites) {
    const r = riskAt(site.at, states);
    const surf = r ? ripLevel(r.score) : 'LOW';
    const flood = site.kind === 'mouth' ? floodLevel(flowAt?.(site.at)) : null;
    const flooding = !!flood && flood !== 'LOW' && RANK[flood] >= RANK[surf];
    const level = flooding ? flood : surf;
    features.push({ type: 'Feature', properties: { kind: 'site', level, site: flooding ? 'flood' : site.kind, name: site.name }, geometry: { type: 'Point', coordinates: site.at } });
  }
  for (const s of states) {
    const r = s.result;
    // Mock swell (waves feed not in yet) draws no rip zones: it raised false HIGH zones on first open.
    if (!r || s.liveSea === false || r.rip.level === 'LOW') continue;
    const normalDeg = (land && maskNormal(land, s.pin)) ?? r.waves.normalDeg;
    const xb = surfZoneWidth(r.waves.breaker.hb, r.waves.slope);
    const label = [
      `${s.name} · ${t('rip.short')} ${t(`rip.${r.rip.level}` as Key)}`,
      `${t(`rip.str.${r.rip.strength}` as Key)} ${r.rip.speedMs.toFixed(1)} ${t('unit.ms')} · ${t('rip.reachShort')} ${Math.round(r.rip.lengthM / 10) * 10} ${t('unit.m')}`,
    ].join('\n');
    features.push({ type: 'Feature', properties: { kind: 'label', level: r.rip.level, label }, geometry: { type: 'Point', coordinates: offset(s.pin, normalDeg, Math.max(xb, r.rip.lengthM) + 250) } });
  }
  return { type: 'FeatureCollection', features };
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Map metres per pixel at zoom 0 at the region's latitude (512 px tiles). */
const M_PER_PX_Z0 = (40075016.686 * Math.cos(REGION.center[1] * RAD)) / 512;
/** Below this zoom the glow keeps a minimum size, px, so the shore still reads as a band when zoomed out. */
const GLOW_FLOOR_PX = 1.5;

/**
 * Each shore dot's radius: its clear water `r` (m) at true map scale, so the glow fills the surf zone
 * and stops short of the beach. Zoomed out it would shrink below a pixel, so it keeps a floor there.
 */
export function glowRadius(): ExpressionSpecification {
  const at = (z: number): ExpressionSpecification => ['max', z >= 12 ? 0 : GLOW_FLOOR_PX, ['*', ['get', 'r'], 2 ** z / M_PER_PX_Z0]];
  return ['interpolate', ['exponential', 2], ['zoom'], 9, at(9), 12, at(12), 16, at(16), 20, at(20)];
}

export interface RipLayer {
  update(states: readonly SpotState[], land?: Grid | null): void;
  setSites(sites: readonly RipSite[]): void;
  /** River flow over its median at a mouth for the slider's hour (PLAN 7.58c); null where no river is forecast. */
  setFlow(flowAt: (at: [number, number]) => number | null): void;
}

export function mountRip(map: Map): RipLayer {
  const colour: ExpressionSpecification = ['match', ['get', 'level'], 'HIGH', cssColour('--red', '#ff3b2f'), cssColour('--amber', '#ffb000')];
  let data: FeatureCollection = { type: 'FeatureCollection', features: [] };
  let states: readonly SpotState[] = [];
  let stations: Station[] = [];
  let stationsFor: Grid | null = null;
  let sites: readonly RipSite[] = [];
  let landGrid: Grid | null = null;
  let flowAt: ((at: [number, number]) => number | null) | undefined;
  const add = () => {
    if (map.getSource('rp')) return;
    const below = firstSymbolId(map);
    map.addSource('rp', { type: 'geojson', data });
    // Risk along the shore: overlapping soft dots read as one glowing band at the waterline.
    map.addLayer({
      id: 'rp-coast', type: 'circle', source: 'rp', minzoom: 9, filter: ['==', ['get', 'kind'], 'coast'],
      paint: {
        'circle-color': colour,
        'circle-radius': glowRadius(),
        'circle-blur': 0.6,
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 9, ['*', 0.75, ['get', 'conf']], 14, ['*', 0.45, ['get', 'conf']]],
      },
    }, below);
    // Fixed sites: a ring (hollow, so it never hides the reef or the beach under it).
    map.addLayer({
      id: 'rp-site', type: 'circle', source: 'rp', minzoom: 10.5, filter: ['==', ['get', 'kind'], 'site'],
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10.5, 4, 15, 11],
        'circle-stroke-color': colour,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10.5, 1.2, 15, 2.5],
        'circle-stroke-opacity': ['match', ['get', 'level'], 'LOW', 0.45, 1],
      },
    });
    map.addLayer({
      id: 'rp-site-label', type: 'symbol', source: 'rp', minzoom: 12.5, filter: ['==', ['get', 'kind'], 'site'],
      layout: {
        'text-field': ['match', ['get', 'site'], 'mouth', t('rip.siteMouth'), 'flood', t('rip.siteFlood'), t('rip.siteBreak')],
        'text-font': FONT, 'text-size': 10, 'text-letter-spacing': 0.1, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-optional': true,
      },
      paint: { 'text-color': colour, 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': ['match', ['get', 'level'], 'LOW', 0.6, 1] },
    });
    map.addLayer({
      id: 'rp-label', type: 'symbol', source: 'rp', minzoom: 11.5, filter: ['==', ['get', 'kind'], 'label'],
      layout: {
        'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.08, 'text-justify': 'auto',
        // Breaks, reefs and wrecks crowd the same water: let the label slide to whichever side is free.
        'text-variable-anchor': ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], 'text-radial-offset': 0.6,
      },
      paint: { 'text-color': colour, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };
  if (map.isStyleLoaded()) add();
  else map.once('style.load', add);
  const render = () => {
    if (landGrid && stationsFor !== landGrid) {
      stations = coastStations(landGrid);
      stationsFor = landGrid;
    }
    data = ripFeatures(states, stations, sites, landGrid, flowAt);
    (map.getSource('rp') as GeoJSONSource | undefined)?.setData(data);
  };
  return {
    update(next, land) {
      states = next;
      landGrid = land ?? null;
      render();
    },
    setSites(next) {
      sites = next;
      render();
    },
    setFlow(f) {
      flowAt = f;
      render();
    },
  };
}
