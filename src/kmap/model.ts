/**
 * Kinetic Plus map (PLAN 7.70): the pure parts. No DOM, no MapLibre.
 *
 * - Modes: the six forecast activities plus CORAL. Each mode has its own ordered list of layers (top draws over),
 *   started from a preset and changed by hand in the layer composer; the lists are saved per mode.
 * - The layer catalogue: every one of the old map's 18 layers, plus the map's own BEACH RATINGS (the coast ribbon
 *   and pins), CORAL HEAT and PRIVATE SITES.
 * - The 30-day time scrubber's geometry: FORECAST, LOW CONF and OUTLOOK as fixed shares of the track.
 * - Coast ribbons: the coastline traced from the land mask near each spot (marching squares), for the rating colour.
 * - Pin placement: greedy, best rating first, so tiles never overlap.
 */
import type { LayerId } from '../layers/registry';
import type { FcActivity } from '../forecast/model';
import type { SourceId } from '../sources';

export type Mode = FcActivity | 'coral';
export const MODES: readonly Mode[] = ['surf', 'fish', 'swim', 'snorkel', 'dive', 'spear', 'sail', 'paddle', 'coral'];
export const isMode = (x: unknown): x is Mode => typeof x === 'string' && (MODES as readonly string[]).includes(x);

/** The map's own layers, drawn by src/kmap, beside the old registry's. */
export type OwnLayer = 'rating' | 'heat' | 'private';
export type KmLayer = LayerId | OwnLayer;
export type KmGroup = 'core' | 'ocean' | 'water' | 'weather' | 'beach' | 'seafloor' | 'rules' | 'coral';
export const GROUPS: readonly KmGroup[] = ['core', 'ocean', 'water', 'weather', 'beach', 'seafloor', 'rules', 'coral'];

export interface KmLayerDef {
  id: KmLayer;
  group: KmGroup;
  /** Where the data comes from, as shown under the layer's name. */
  src: { en: string; es: string };
  /** Sources of the layer, shown as superscript numbers (src/sources.ts). */
  cite: readonly SourceId[];
  /** Data-age feeds (adapters/data-age.ts) whose newest fetch dates this layer; none = a static file. */
  feeds: readonly string[];
  /** Only offered in CORAL mode. */
  coralOnly?: boolean;
}

export const KM_LAYERS: readonly KmLayerDef[] = [
  { id: 'rating', group: 'core', src: { en: 'Our spot models', es: 'Modelos propios por sitio' }, cite: [], feeds: ['waves', 'weather', 'spotwind'] },
  { id: 'waves', group: 'ocean', src: { en: 'Wave model, adjusted for the seabed', es: 'Modelo de olas, ajustado al fondo' }, cite: ['ww3', 'wam', 'gebco'], feeds: ['waves'] },
  { id: 'wind', group: 'ocean', src: { en: 'Weather models, fitted to satellite wind', es: 'Modelos del tiempo, ajustados al viento por satélite' }, cite: ['ecmwf', 'gfs', 'ascat'], feeds: ['wind'] },
  { id: 'currents', group: 'ocean', src: { en: 'Ocean current forecast', es: 'Pronóstico de corrientes' }, cite: ['smoc'], feeds: ['currents'] },
  { id: 'sst', group: 'water', src: { en: 'Satellite sea temperature', es: 'Temperatura del mar por satélite' }, cite: ['sst'], feeds: ['sst', 'sst-coast'] },
  { id: 'chl', group: 'water', src: { en: 'Satellite ocean colour', es: 'Color del océano por satélite' }, cite: ['chl'], feeds: ['chl'] },
  { id: 'fronts', group: 'water', src: { en: 'Edges in temperature and colour', es: 'Bordes de temperatura y color' }, cite: ['sst', 'chl'], feeds: ['sst', 'chl'] },
  { id: 'clarity', group: 'water', src: { en: 'Satellite water clarity and river plumes', es: 'Claridad del agua por satélite y plumas de ríos' }, cite: ['kd490', 'glofas'], feeds: ['chl', 'river', 'rain'] },
  { id: 'sargassum', group: 'water', src: { en: 'Satellite sargassum and where it drifts', es: 'Sargazo por satélite y hacia dónde va' }, cite: ['usf'], feeds: ['sargassum'] },
  { id: 'weather', group: 'weather', src: { en: 'Rain clouds and storms', es: 'Nubes de lluvia y tormentas' }, cite: ['goesrain', 'nhc'], feeds: ['raincells', 'storms'] },
  { id: 'lightning', group: 'weather', src: { en: 'Lightning seen from space', es: 'Rayos vistos desde el espacio' }, cite: ['glm'], feeds: ['lightning'] },
  { id: 'obs', group: 'weather', src: { en: 'Tide gauge and airport reports', es: 'Mareógrafo y reportes del aeropuerto' }, cite: ['ioc', 'metar'], feeds: ['gauge', 'metar'] },
  { id: 'rip', group: 'beach', src: { en: 'Our rip current model, with river flow', es: 'Nuestro modelo de resaca, con caudal de ríos' }, cite: ['glofas'], feeds: ['waves', 'river'] },
  { id: 'surf', group: 'beach', src: { en: 'Our list of surf breaks', es: 'Nuestra lista de rompientes' }, cite: [], feeds: ['waves'] },
  { id: 'fishing', group: 'beach', src: { en: 'Fish habitat, bite model and fish records', es: 'Hábitat, modelo de picada y registros de peces' }, cite: ['obis'], feeds: ['weather'] },
  { id: 'spear', group: 'beach', src: { en: 'Habitat and spearfishing rules', es: 'Hábitat y reglas de pesca submarina' }, cite: ['incopesca', 'sinac'], feeds: [] },
  { id: 'depth', group: 'seafloor', src: { en: 'Seafloor depth map', es: 'Mapa de profundidad del fondo' }, cite: ['gebco'], feeds: [] },
  { id: 'reefs', group: 'seafloor', src: { en: 'Reef and seabed map', es: 'Mapa de arrecifes y fondo' }, cite: ['acoral'], feeds: [] },
  { id: 'seamarks', group: 'seafloor', src: { en: 'Sea marks such as buoys and wrecks', es: 'Marcas marinas como boyas y naufragios' }, cite: ['seamarks'], feeds: [] },
  { id: 'zones', group: 'rules', src: { en: 'Protected areas', es: 'Áreas protegidas' }, cite: ['sinac'], feeds: [] },
  { id: 'anchorages', group: 'rules', src: { en: 'Harbours and anchorages', es: 'Puertos y fondeaderos' }, cite: [], feeds: [] },
  { id: 'ais', group: 'rules', src: { en: 'Ship positions, last 24 h', es: 'Posiciones de barcos, últimas 24 h' }, cite: ['aisstream'], feeds: ['ais'] },
  { id: 'heat', group: 'coral', src: { en: 'Coral heat stress', es: 'Estrés por calor del coral' }, cite: ['crw'], feeds: ['coral'], coralOnly: true },
  { id: 'private', group: 'coral', src: { en: 'This device only', es: 'Solo este dispositivo' }, cite: [], feeds: [], coralOnly: true },
];
export const layerDef = (id: KmLayer) => KM_LAYERS.find((l) => l.id === id)!;
export const isKmLayer = (x: unknown): x is KmLayer => typeof x === 'string' && KM_LAYERS.some((l) => l.id === x);
export const isOwnLayer = (x: KmLayer): x is OwnLayer => x === 'rating' || x === 'heat' || x === 'private';

/**
 * Starting layers per mode, top first (mockup G, approved 2026-11-11), with lightning wherever people are in or on
 * the water. Every other layer is one tap away under ADD A LAYER.
 */
export const PRESETS: Readonly<Record<Mode, readonly KmLayer[]>> = {
  surf: ['rating', 'lightning', 'rip', 'surf', 'wind', 'weather', 'waves', 'reefs', 'depth'],
  fish: ['rating', 'lightning', 'fishing', 'currents', 'fronts', 'zones', 'seamarks', 'chl', 'depth'],
  swim: ['rating', 'lightning', 'weather', 'rip', 'sargassum', 'clarity', 'sst'],
  snorkel: ['rating', 'lightning', 'currents', 'waves', 'zones', 'reefs', 'clarity'],
  dive: ['rating', 'lightning', 'seamarks', 'currents', 'zones', 'reefs', 'clarity', 'depth'],
  spear: ['rating', 'lightning', 'spear', 'currents', 'zones', 'reefs', 'clarity', 'depth'],
  sail: ['rating', 'lightning', 'weather', 'obs', 'wind', 'currents', 'waves', 'anchorages', 'ais', 'seamarks'],
  paddle: ['rating', 'lightning', 'wind', 'waves', 'currents', 'rip', 'weather', 'reefs', 'zones', 'anchorages'],
  coral: ['private', 'heat', 'zones', 'reefs', 'sst'],
};

/** Layers offered in a mode: the coral-only ones only in CORAL, BEACH RATINGS not in CORAL. */
export const offered = (m: Mode): KmLayer[] => KM_LAYERS.filter((l) => (m === 'coral' ? l.id !== 'rating' : !l.coralOnly)).map((l) => l.id);

export type Orders = Partial<Record<Mode, KmLayer[]>>;
const KEY = 'ft.km.layers';
type Store = Pick<Storage, 'getItem' | 'setItem'> | undefined;

/** Saved layer lists, junk dropped (unknown ids, duplicates, layers not offered in that mode, lists left empty). */
export function loadOrders(storage: Store): Orders {
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? '{}');
    const out: Orders = {};
    if (raw && typeof raw === 'object')
      for (const m of MODES) {
        const v = (raw as Record<string, unknown>)[m];
        if (!Array.isArray(v)) continue;
        const ok = offered(m);
        // An empty list (every layer switched off, or only ids an older build used) opens the mode's standard layers
        // instead of a blank map that only Reset fixes (review 2026-11-16: Snorkel opened with every layer off).
        const list = [...new Set(v.filter((x): x is KmLayer => isKmLayer(x) && ok.includes(x)))];
        if (list.length) out[m] = list;
      }
    return out;
  } catch {
    return {};
  }
}
export function saveOrders(storage: Store, o: Orders) {
  try {
    storage?.setItem(KEY, JSON.stringify(o));
  } catch {
    /* private mode */
  }
}
export const orderOf = (o: Orders, m: Mode): KmLayer[] => (o[m] ?? PRESETS[m]).slice();
export const isCustom = (o: Orders, m: Mode) => {
  const a = orderOf(o, m), b = PRESETS[m];
  return a.length !== b.length || a.some((x, i) => x !== b[i]);
};
/** Switch a layer on (at the top, as the newest) or off. */
export function toggleLayer(list: readonly KmLayer[], id: KmLayer): KmLayer[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}
/** Move a layer up (-1, draws over more) or down (+1). */
export function moveLayer(list: readonly KmLayer[], id: KmLayer, by: number): KmLayer[] {
  const i = list.indexOf(id);
  if (i < 0) return list.slice();
  const j = Math.max(0, Math.min(list.length - 1, i + by));
  const out = list.slice();
  out.splice(i, 1);
  out.splice(j, 0, id);
  return out;
}

/** The old map's LAYERS preset for each activity (snorkel and dive share DIVE): CONDITIONS groups follow it. */
export const OLD_PRESET = { fish: 'fishing', surf: 'surf', swim: 'swim', snorkel: 'dive', dive: 'dive', spear: 'spear', sail: 'sail', paddle: 'paddle' } as const;

/**
 * The map's activity for an activity picked in Expand data (the old CONDITIONS panel), so the panel and the map agree
 * (review 2026-11-16, 4.5). DIVE covers snorkel, dive and spear, so the map stays on whichever of those it is on; BOAT
 * is sailing; ALL leaves the map as it is (null).
 */
export function mapActForCond(c: 'all' | 'fish' | 'dive' | 'boat' | 'surf', cur: FcActivity | null): FcActivity | null {
  const want: FcActivity | null = c === 'fish' ? 'fish' : c === 'surf' ? 'surf' : c === 'boat' ? 'sail' : c === 'dive' ? (cur === 'snorkel' || cur === 'spear' ? cur : 'dive') : null;
  return want === cur ? null : want;
}

/* ---------- 30-day scrubber geometry ---------- */

/** The three bands as shares of the track: a week of hours gets most of it (mockup G). */
export const ZONES = [
  { band: 'forecast', a: 0, b: 168, step: 1, w: 0.58 },
  { band: 'lowconf', a: 168, b: 384, step: 3, w: 0.26 },
  { band: 'outlook', a: 384, b: 720, step: 24, w: 0.16 },
] as const;

/** Track x (0..width) for an offset in hours. */
export function xOfOffset(o: number, width: number): number {
  let x = 0;
  for (const z of ZONES) {
    if (o <= z.b) return x + ((Math.max(z.a, o) - z.a) / (z.b - z.a)) * z.w * width;
    x += z.w * width;
  }
  return width;
}
/** Offset in hours for a track x; the inverse of xOfOffset. */
export function offsetOfX(x: number, width: number): number {
  let x0 = 0;
  for (const z of ZONES) {
    const zw = z.w * width;
    if (x <= x0 + zw) return z.a + (Math.max(0, x - x0) / zw) * (z.b - z.a);
    x0 += zw;
  }
  return 720;
}
/** The slots the scrubber draws a bar for: every hour, then every 3 h, then every day. */
export function slots(): { o: number; band: (typeof ZONES)[number]['band']; w: number }[] {
  const out: { o: number; band: (typeof ZONES)[number]['band']; w: number }[] = [];
  for (const z of ZONES) for (let o = z.a; o < z.b; o += z.step) out.push({ o, band: z.band, w: z.step });
  return out;
}

/* ---------- coast ribbons ---------- */

export interface Mask {
  /** 1 = land, row-major from the north-west corner. */
  z: Uint8Array;
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
}
const DEG_M = 111_320;
/**
 * The coastline within `radiusM` of a point, traced from a land mask with marching squares (cell corners are the
 * mask's cell centres) and joined into polylines. Returns the polyline that passes nearest the point, cut to the
 * radius, as [lng, lat] pairs; empty when no coast is near.
 */
export function coastNear(mask: Mask, at: readonly [number, number], radiusM: number): [number, number][] {
  const cosL = Math.cos((at[1] * Math.PI) / 180);
  const rc = Math.ceil(radiusM / (mask.dlon * DEG_M * cosL)) + 2;
  const rr = Math.ceil(radiusM / (mask.dlat * DEG_M)) + 2;
  const c0 = Math.round((at[0] - mask.lon0) / mask.dlon) - rc, r0 = Math.round((mask.lat0 - at[1]) / mask.dlat) - rr;
  const W = 2 * rc + 1, Hh = 2 * rr + 1;
  const v = (c: number, r: number) => {
    const cc = c0 + c, rw = r0 + r;
    if (cc < 0 || rw < 0 || cc >= mask.cols || rw >= mask.rows) return 0;
    return mask.z[rw * mask.cols + cc];
  };
  const ll = (c: number, r: number): [number, number] => [mask.lon0 + (c0 + c) * mask.dlon, mask.lat0 - (r0 + r) * mask.dlat];
  // Segments between edge midpoints, keyed so they can be chained.
  const key = (p: [number, number]) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  const segs: [[number, number], [number, number]][] = [];
  for (let r = 0; r < Hh - 1; r++)
    for (let c = 0; c < W - 1; c++) {
      const a = v(c, r), b = v(c + 1, r), d = v(c, r + 1), e = v(c + 1, r + 1);
      const k = a | (b << 1) | (e << 2) | (d << 3);
      if (k === 0 || k === 15) continue;
      const top = ll(c + 0.5, r), right = ll(c + 1, r + 0.5), bot = ll(c + 0.5, r + 1), left = ll(c, r + 0.5);
      const E: Record<number, [number, number][][]> = {
        1: [[left, top]], 2: [[top, right]], 3: [[left, right]], 4: [[right, bot]], 5: [[left, top], [right, bot]], 6: [[top, bot]], 7: [[left, bot]],
        8: [[bot, left]], 9: [[bot, top]], 10: [[top, right], [bot, left]], 11: [[bot, right]], 12: [[right, left]], 13: [[right, top]], 14: [[top, left]],
      };
      for (const s of E[k]) segs.push([s[0], s[1]]);
    }
  if (!segs.length) return [];
  // Chain segments into polylines.
  const ends = new Map<string, number[]>();
  segs.forEach((s, i) => s.forEach((p) => (ends.get(key(p)) ?? ends.set(key(p), []).get(key(p))!).push(i)));
  const used = new Uint8Array(segs.length);
  const lines: [number, number][][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line: [number, number][] = [segs[i][0], segs[i][1]];
    for (const dir of [1, -1]) {
      for (;;) {
        const tip = dir === 1 ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) ?? []).find((j) => !used[j]);
        if (next === undefined) break;
        used[next] = 1;
        const s = segs[next];
        const p = key(s[0]) === key(tip) ? s[1] : s[0];
        if (dir === 1) line.push(p);
        else line.unshift(p);
      }
    }
    lines.push(line);
  }
  const dist = (p: readonly [number, number]) => Math.hypot((p[0] - at[0]) * cosL, p[1] - at[1]) * DEG_M;
  let best: [number, number][] | null = null, bestD = Infinity;
  for (const l of lines) {
    const d = Math.min(...l.map(dist));
    if (d < bestD) (bestD = d), (best = l);
  }
  if (!best || bestD > radiusM) return [];
  // Keep the run around the nearest vertex that stays inside the radius.
  const i0 = best.reduce((bi, p, i) => (dist(p) < dist(best![bi]) ? i : bi), 0);
  let a = i0, b = i0;
  while (a > 0 && dist(best[a - 1]) <= radiusM) a--;
  while (b < best.length - 1 && dist(best[b + 1]) <= radiusM) b++;
  return best.slice(a, b + 1);
}

/* ---------- pins ---------- */

/** A spot's number chip on screen: centred on the spot, in stage px. `rank` decides who keeps a chip when two would touch. */
export interface ChipBox { id: string; x: number; y: number; w: number; h: number; rank: number }
export interface Rect { x: number; y: number; w: number; h: number }
/** Half the size of a spot's dot plus a finger's slack, in px. */
export const DOT_R = 6;

/**
 * Which spots show their number chip (Joseph 2026-11-16, option B of the spot-marker workshop). Each chip sits on its
 * spot; the `chosen` spot goes first, then the best rank. A chip is kept where it touches no chip already kept, covers
 * no better spot's dot, misses the `obstacles` (the map's own panels and buttons) and stays inside `bounds`; otherwise
 * the spot is a plain dot. A worse spot whose dot falls under a kept chip is `covered` (drawn not at all) until a
 * closer zoom pulls them apart, so the best number in a cluster always shows. Nothing is drawn away from its beach. Pure.
 */
export function placeChips(chips: readonly ChipBox[], bounds: { w: number; h: number }, obstacles: readonly Rect[] = [], chosen: string | null = null, gap = 2): { chips: Set<string>; covered: Set<string> } {
  const shown = new Set<string>(), covered = new Set<string>(), dots: Rect[] = [];
  const kept: Rect[] = [];
  const over = (a: Rect, b: Rect, g: number) => a.x < b.x + b.w + g && b.x < a.x + a.w + g && a.y < b.y + b.h + g && b.y < a.y + a.h + g;
  const dotOf = (c: ChipBox) => ({ x: c.x - DOT_R, y: c.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R });
  const sorted = [...chips].sort((a, b) => (b.id === chosen ? 1 : 0) - (a.id === chosen ? 1 : 0) || b.rank - a.rank);
  for (const c of sorted) {
    const box = { x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h };
    const fits = box.x >= 0 && box.y >= 0 && box.x + box.w <= bounds.w && box.y + box.h <= bounds.h;
    if (fits && !kept.some((k) => over(box, k, gap)) && !obstacles.some((o) => over(box, o, gap)) && !dots.some((d) => over(box, d, 0))) {
      kept.push(box);
      shown.add(c.id);
    } else if (kept.some((k) => over(dotOf(c), k, 0))) covered.add(c.id);
    else dots.push(dotOf(c));
  }
  return { chips: shown, covered };
}

/* ---------- private coral sites ---------- */

/** The 0.05° cell (about 5 km) a private site falls in, by its south-west corner: never the site itself. */
export const CELL_DEG = 0.05;
export function privateCells(sites: readonly { lng: number; lat: number }[]): { lng: number; lat: number; n: number }[] {
  const m = new Map<string, { lng: number; lat: number; n: number }>();
  for (const s of sites) {
    if (!Number.isFinite(s.lng) || !Number.isFinite(s.lat)) continue;
    const lng = Math.floor(s.lng / CELL_DEG + 1e-9) * CELL_DEG, lat = Math.floor(s.lat / CELL_DEG + 1e-9) * CELL_DEG;
    const k = `${lng.toFixed(2)},${lat.toFixed(2)}`;
    const c = m.get(k);
    if (c) c.n++;
    else m.set(k, { lng: +lng.toFixed(2), lat: +lat.toFixed(2), n: 1 });
  }
  return [...m.values()];
}
