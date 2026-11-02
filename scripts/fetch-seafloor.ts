/**
 * Builds the offline seafloor assets in public/data/seafloor/ (PLAN 2.6).
 *
 *   npm run data:seafloor
 *
 * Sources (see docs/SEAFLOOR.md for licences and why each was picked):
 *  - GEBCO 2026 Grid, 15 arc-second elevation + type identifier (TID), via download.gebco.net.
 *  - Allen Coral Atlas geomorphic zones and benthic cover, via its public WFS.
 *  - OpenStreetMap named reefs and seamarks (wrecks, lights, harbours), via the OSM API.
 *
 * Output is small, static and versioned in git so the app (and its service worker) can
 * precache it and work offline. Re-run to refresh; the manifest records when each was fetched.
 * Needs Node 22.18+ (runs TypeScript directly). No dependencies.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { REGION } from '../src/region.ts';

const OUT = 'public/data/seafloor';
/** Raw downloads are kept here so re-runs while tuning don't hit the APIs again. Delete to refresh. */
const CACHE = 'node_modules/.cache/seafloor';
const UA = 'fishing-and-tides seafloor build (github.com/josephmclachlan/Fishing-and-Tides)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, init: RequestInit = {}, tries = 4): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } });
      if (res.ok) return res;
      throw new Error(`${res.status} ${url}`);
    } catch (err) {
      if (i >= tries - 1) throw err;
      await sleep(2000 * 2 ** i);
    }
  }
}

// ---------- GEBCO ----------

interface AscGrid { cols: number; rows: number; x0: number; y0: number; cs: number; nodata: number; v: Float32Array }

function parseAsc(text: string): AscGrid {
  const lines = text.split('\n');
  const h: Record<string, number> = {};
  for (let i = 0; i < 6; i++) {
    const [k, val] = lines[i].trim().split(/\s+/);
    h[k.toLowerCase()] = Number(val);
  }
  const v = new Float32Array(h.ncols * h.nrows);
  let n = 0;
  for (let i = 6; i < lines.length; i++) for (const tok of lines[i].split(' ')) if (tok) v[n++] = Number(tok);
  if (n !== v.length) throw new Error(`asc: expected ${v.length} values, got ${n}`);
  return { cols: h.ncols, rows: h.nrows, x0: h.xllcorner, y0: h.yllcorner, cs: h.cellsize, nodata: h.nodata_value, v };
}

/** Minimal zip reader (central directory; stored or deflated entries). */
function unzip(buf: Buffer): Map<string, Buffer> {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('zip: no end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const local = buf.readUInt32LE(p + 42);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    out.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

async function fetchGebco() {
  const [[w, s], [e, n]] = REGION.maxBounds;
  const base = 'https://download.gebco.net/api';
  const cached = `${CACHE}/gebco.zip`;
  const grids = (await (await get(`${base}/grids`)).json()) as { id: number; name: string; group_name: string; data_sources: { id: number; name: string }[] }[];
  const global = grids.find((g) => /_global$/.test(g.name));
  if (!global) throw new Error('GEBCO: no global grid listed');
  const elev = global.data_sources.find((d) => !/sub_ice|tid/.test(d.name))!;
  const tid = global.data_sources.find((d) => /tid/.test(d.name))!;
  const ascii = 3; // GET /api/formats: 3 = ASCII grid
  const basket = {
    id: '0', email: null, submission_date: new Date().toISOString(), processing_status: 'new',
    items: [{ id: 0, grid_id: global.id, data_source_ids: [elev.id, tid.id], formats: [ascii], left: w, right: e, top: n, bottom: s }],
  };
  if (!existsSync(cached)) writeFileSync(cached, await queueGebco(base, basket));
  const zip = unzip(readFileSync(cached));
  const pick = (re: RegExp) => {
    const name = [...zip.keys()].find((k) => re.test(k));
    if (!name) throw new Error(`GEBCO: ${re} not in zip (${[...zip.keys()].join(', ')})`);
    return parseAsc(zip.get(name)!.toString('latin1'));
  };
  return { version: global.group_name, elev: pick(/^gebco_\d+_n.*\.asc$/), tid: pick(/_tid_.*\.asc$/) };
}

/** GEBCO's download app queues a basket, builds it, then serves a zip. */
async function queueGebco(base: string, basket: object): Promise<Buffer> {
  const q = (await (await get(`${base}/queue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(basket) })).json()) as { basketId: string };
  console.log(`GEBCO: basket ${q.basketId}`);
  for (let i = 0; ; i++) {
    const st = (await (await get(`${base}/queue/status/${q.basketId}`)).json()) as { status: string };
    if (st.status === 'finished') break;
    if (i > 120) throw new Error(`GEBCO: still ${st.status} after 10 min`);
    await sleep(5000);
  }
  return Buffer.from(await (await get(`${base}/queue/download/${q.basketId}`)).arrayBuffer());
}

interface GridMeta { file: string; type: 'i16' | 'u8' | 'rle16'; cols: number; rows: number; lon0: number; lat0: number; dlon: number; dlat: number }

/** Crop `g` to `bounds` (whole cells), optionally averaging `f`×`f` blocks. Row 0 = north. */
function pack(g: AscGrid, bounds: [[number, number], [number, number]], f: number, type: 'i16' | 'u8', file: string) {
  const [[w, s], [e, n]] = bounds;
  const yTop = g.y0 + g.rows * g.cs;
  const c0 = Math.max(0, Math.floor((w - g.x0) / g.cs + 1e-6));
  const c1 = Math.min(g.cols, Math.ceil((e - g.x0) / g.cs - 1e-6));
  const r0 = Math.max(0, Math.floor((yTop - n) / g.cs + 1e-6));
  const r1 = Math.min(g.rows, Math.ceil((yTop - s) / g.cs - 1e-6));
  const cols = Math.floor((c1 - c0) / f);
  const rows = Math.floor((r1 - r0) / f);
  const out = type === 'i16' ? new Int16Array(cols * rows) : new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let k = 0;
      for (let dr = 0; dr < f; dr++)
        for (let dc = 0; dc < f; dc++) {
          const v = g.v[(r0 + r * f + dr) * g.cols + c0 + c * f + dc];
          if (v !== g.nodata) (sum += v), k++;
        }
      out[r * cols + c] = k ? Math.round(sum / k) : type === 'i16' ? -32768 : 255;
    }
  const cs = g.cs * f;
  const meta: GridMeta = {
    file, type, cols, rows,
    lon0: round(g.x0 + c0 * g.cs + cs / 2, 7),
    lat0: round(yTop - r0 * g.cs - cs / 2, 7),
    dlon: round(cs, 9),
    dlat: round(cs, 9),
  };
  writeFileSync(`${OUT}/${file}`, Buffer.from(out.buffer));
  return meta;
}

// ---------- Allen Coral Atlas ----------

type Ring = [number, number][];
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** Douglas–Peucker on a closed ring, tolerance in degrees. */
function simplify(ring: Ring, tol: number): Ring {
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [[0, ring.length - 1]];
  // A closed ring's first and last points coincide, so split it at its farthest point first.
  let far = 0;
  let farD = -1;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
    if (d > farD) (farD = d), (far = i);
  }
  if (far) (keep[far] = 1), stack.splice(0, 1, [0, far], [far, ring.length - 1]);
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const L = Math.hypot(bx - ax, by - ay) || 1e-12;
    let idx = -1;
    let max = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - ring[i][1]) - (ax - ring[i][0]) * (by - ay)) / L;
      if (d > max) (max = d), (idx = i);
    }
    if (idx > 0) (keep[idx] = 1), stack.push([a, idx], [idx, b]);
  }
  return ring.filter((_, i) => keep[i]).map(([x, y]) => [round(x, 5), round(y, 5)] as [number, number]);
}

async function fetchCoralAtlas() {
  const [[w, s], [e, n]] = REGION.bounds;
  const features: object[] = [];
  for (const [layer, type] of [['zone', 'geomorphic'], ['bottom', 'benthic']] as const) {
    const url =
      'https://allencoralatlas.org/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature' +
      `&typeNames=coral-atlas:${type}_data_verbose&outputFormat=application/json&bbox=${s},${w},${n},${e},urn:ogc:def:crs:EPSG::4326`;
    const fc = (await (await get(url)).json()) as { features: { geometry: { type: string; coordinates: Ring[][] | Ring[] }; properties: { class_name: string; area_sqkm: number } }[] };
    let kept = 0;
    for (const f of fc.features) {
      // Drop specks under 200 m² (a few Allen Coral Atlas pixels): noise at any zoom we draw, <0.3% of reef area.
      if (f.properties.area_sqkm < 2e-4) continue;
      const polys = (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]) as Ring[][];
      // ~5.5 m tolerance removes the pixel staircase without moving edges more than a pixel or so.
      const out = polys.map((p) => p.map((r) => simplify(r, 5e-5)).filter((r) => r.length >= 4)).filter((p) => p.length);
      if (!out.length) continue;
      kept++;
      features.push({
        type: 'Feature',
        properties: { layer, cls: f.properties.class_name.toUpperCase() },
        geometry: { type: 'MultiPolygon', coordinates: out },
      });
    }
    console.log(`Allen Coral Atlas ${type}: ${kept}/${fc.features.length} polygons kept`);
  }
  return { type: 'FeatureCollection', features };
}

// ---------- OpenStreetMap ----------

/** OSM API map calls over 0.05° boxes that hold coastline or nearshore water (from the GEBCO grid). */
async function fetchOsm(elev: AscGrid) {
  const [[w, s], [e, n]] = REGION.bounds;
  const step = 0.05;
  const yTop = elev.y0 + elev.rows * elev.cs;
  const at = (x: number, y: number) => elev.v[Math.floor((yTop - y) / elev.cs) * elev.cols + Math.floor((x - elev.x0) / elev.cs)];
  const nodes = new Map<string, { lon: number; lat: number; tags: Record<string, string> }>();
  const ways = new Map<string, { refs: string[]; tags: Record<string, string> }>();
  let boxes = 0;
  for (let x = w; x < e - 1e-9; x += step)
    for (let y = s; y < n - 1e-9; y += step) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let xx = x; xx < x + step; xx += elev.cs) for (let yy = y; yy < y + step; yy += elev.cs) (lo = Math.min(lo, at(xx, yy))), (hi = Math.max(hi, at(xx, yy)));
      // Coast and nearshore only: some cell near sea level, some shallower than 60 m.
      if (!(lo < 5 && hi > -60)) continue;
      const bbox = [x, y, x + step, y + step].map((v) => round(v, 3)).join(',');
      const cached = `${CACHE}/osm-${bbox}.xml`;
      let xml: string;
      if (existsSync(cached)) xml = readFileSync(cached, 'utf8');
      else {
        xml = await (await get(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`)).text();
        writeFileSync(cached, xml);
        await sleep(1000); // OSM API usage policy: keep it gentle
      }
      boxes++;
      for (const m of xml.matchAll(/<(node|way) id="(\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g)) {
        const [, kind, id, attrs, , body = ''] = m;
        const tags: Record<string, string> = {};
        for (const t of body.matchAll(/<tag k="([^"]+)" v="([^"]*)"\/>/g)) tags[t[1]] = decode(t[2]);
        if (kind === 'node') {
          const lat = Number(/lat="([^"]+)"/.exec(attrs)?.[1]);
          const lon = Number(/lon="([^"]+)"/.exec(attrs)?.[1]);
          nodes.set(id, { lat, lon, tags });
        } else ways.set(id, { refs: [...body.matchAll(/<nd ref="(\d+)"\/>/g)].map((r) => r[1]), tags });
      }
    }
  console.log(`OSM: ${boxes} boxes, ${nodes.size} nodes, ${ways.size} ways`);

  // Coastline ways (land on the left) for the land mask.
  const coast: [number, number][][] = [];
  for (const wy of ways.values())
    if (wy.tags.natural === 'coastline') coast.push(wy.refs.map((r) => nodes.get(r)).filter((x) => !!x).map((x) => [x!.lon, x!.lat]));

  const features: object[] = [];
  const point = (lngLat: [number, number], props: Record<string, string>) =>
    features.push({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: lngLat.map((v) => round(v, 6)) } });
  const kindOf = (t: Record<string, string>): string | null => {
    const st = t['seamark:type'] ?? '';
    if (t.natural === 'reef') return 'reef';
    if (st === 'wreck' || t.historic === 'wreck') return 'wreck';
    if (/^(rock|obstruction)$/.test(st)) return 'hazard';
    if (t.man_made === 'lighthouse' || /^light/.test(st)) return 'light';
    if (/^(buoy|beacon)_/.test(st)) return 'buoy';
    if (st === 'harbour') return 'harbour';
    return null;
  };
  const props = (kind: string, t: Record<string, string>) => {
    const p: Record<string, string> = { kind, name: label(kind, t) };
    if (kind === 'light') p.info = lightInfo(t);
    return p;
  };
  for (const nd of nodes.values()) {
    const kind = kindOf(nd.tags);
    if (kind && kind !== 'reef') point([nd.lon, nd.lat], props(kind, nd.tags));
  }
  for (const wy of ways.values()) {
    const kind = kindOf(wy.tags);
    if (!kind) continue;
    const ring = wy.refs.map((r) => nodes.get(r)).filter((x) => !!x).map((x) => [x!.lon, x!.lat] as [number, number]);
    if (ring.length < 2) continue;
    const c = centroid(ring);
    if (c[0] < w || c[0] > e || c[1] < s || c[1] > n) continue;
    if (kind === 'reef' && ring.length >= 4 && wy.refs[0] === wy.refs.at(-1)) {
      features.push({ type: 'Feature', properties: { kind: 'reef-area', name: label(kind, wy.tags) }, geometry: { type: 'Polygon', coordinates: [ring.map(([x, y]) => [round(x, 6), round(y, 6)])] } });
    }
    point(c, props(kind, wy.tags));
  }
  return { marks: { type: 'FeatureCollection', features }, coast };
}

/** Land mask cell size, degrees (~33 m): fine enough to keep depth shading and contours off the beach at the spot tier. */
const MASK_CELL = 0.0003;

/**
 * Land (1) / water (0) raster over REGION.bounds from OSM coastline ways: draw the coastline
 * into the grid, then flood-fill water (4-connected, so an 8-connected line seals it) from
 * cells GEBCO puts deeper than 40 m. Whatever the flood can't reach is land.
 * Stored as run lengths per row (uint16, alternating water/land, each row starting with water).
 */
function landMask(coast: [number, number][][], elev: AscGrid): { meta: GridMeta; land: number } {
  const [[w, s], [e, n]] = REGION.bounds;
  const cols = Math.round((e - w) / MASK_CELL);
  const rows = Math.round((n - s) / MASK_CELL);
  const lineCell = new Uint8Array(cols * rows);
  const fx = (lon: number) => (lon - w) / MASK_CELL;
  const fy = (lat: number) => (n - lat) / MASK_CELL;
  for (const line of coast)
    for (let i = 0; i < line.length - 1; i++) {
      const x0 = fx(line[i][0]), y0 = fy(line[i][1]), x1 = fx(line[i + 1][0]), y1 = fy(line[i + 1][1]);
      const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
      for (let k = 0; k <= steps; k++) {
        const c = Math.floor(x0 + ((x1 - x0) * k) / steps);
        const r = Math.floor(y0 + ((y1 - y0) * k) / steps);
        if (c >= 0 && r >= 0 && c < cols && r < rows) lineCell[r * cols + c] = 1;
      }
    }
  const yTop = elev.y0 + elev.rows * elev.cs;
  const gebco = (lon: number, lat: number) => elev.v[Math.floor((yTop - lat) / elev.cs) * elev.cols + Math.floor((lon - elev.x0) / elev.cs)];
  const water = new Uint8Array(cols * rows);
  const queue = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      // Seeds well offshore: GEBCO is too coarse to trust its shallow cells on the right side of the beach.
      if (!lineCell[i] && gebco(w + (c + 0.5) * MASK_CELL, n - (r + 0.5) * MASK_CELL) < -40) (water[i] = 1), (queue[tail++] = i);
    }
  while (head < tail) {
    const i = queue[head++];
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (const j of [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1])
      if (j >= 0 && !water[j] && !lineCell[j]) (water[j] = 1), (queue[tail++] = j);
  }
  if (process.env.SEAFLOOR_DEBUG) writeFileSync(`${CACHE}/mask-debug.u8`, Buffer.from(water.map((v, i) => (lineCell[i] ? 2 : v))));
  // The coastline cells themselves count as water, so the mask hugs the shore rather than eating into the sea.
  const runs: number[] = [];
  let land = 0;
  for (let r = 0; r < rows; r++) {
    let v = 0;
    let len = 0;
    for (let c = 0; c < cols; c++) {
      const isLand = water[r * cols + c] || lineCell[r * cols + c] ? 0 : 1;
      land += isLand;
      if (isLand === v) len++;
      else (runs.push(len), (v = isLand), (len = 1));
    }
    runs.push(len);
  }
  const file = 'land-mask.rle16';
  writeFileSync(`${OUT}/${file}`, Buffer.from(new Uint16Array(runs).buffer));
  const meta: GridMeta = { file, type: 'rle16', cols, rows, lon0: round(w + MASK_CELL / 2, 7), lat0: round(n - MASK_CELL / 2, 7), dlon: MASK_CELL, dlat: MASK_CELL };
  return { meta, land: land / (cols * rows) };
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** HUD-style caps label: "Arrecife Coralino de Punta Cahuita" → "PUNTA CAHUITA". */
function label(kind: string, t: Record<string, string>) {
  const name = (t['seamark:name'] ?? t.name ?? '').replace(/^Arrecife( Coralino)?( de)?\s+/i, '').replace(/\s+lighthouse$/i, '');
  const fallback = { reef: 'REEF', wreck: 'WRECK', hazard: 'HAZARD', light: 'LIGHT', buoy: 'BUOY', harbour: 'HARBOUR' }[kind] ?? kind;
  return (name || fallback).toUpperCase();
}

/** Light characteristic as charts print it, e.g. "W 10S 12M 12NM" (colour, period, height, range). */
function lightInfo(t: Record<string, string>) {
  const g = (k: string) => t[`seamark:light:1:${k}`] ?? t[`seamark:light:${k}`];
  const colour = g('colour')?.[0]?.toUpperCase();
  const parts = [g('character'), colour, g('period') && `${g('period')}S`, g('height') && `${g('height')}M`, g('range') && `${Math.round(Number(g('range')))}NM`];
  return parts.filter(Boolean).join(' ');
}

/** Area centroid of a ring (falls back to the vertex mean for lines/degenerate rings). */
function centroid(ring: [number, number][]): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const k = x0 * y1 - x1 * y0;
    (a += k), (cx += (x0 + x1) * k), (cy += (y0 + y1) * k);
  }
  if (Math.abs(a) < 1e-12) return [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  return [cx / (3 * a), cy / (3 * a)];
}

// ---------- main ----------

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CACHE, { recursive: true });
  const gebco = await fetchGebco();
  const gebcoAt = new Date().toISOString();
  const grids: Record<string, GridMeta> = {
    // Full 15″ resolution where the app zooms in; 1′ blocks for the wide Caribbean view.
    region: pack(gebco.elev, REGION.bounds, 1, 'i16', 'gebco-region.i16'),
    regionTid: pack(gebco.tid, REGION.bounds, 1, 'u8', 'gebco-region-tid.u8'),
    macro: pack(gebco.elev, REGION.maxBounds, 4, 'i16', 'gebco-macro.i16'),
  };
  const reefs = await fetchCoralAtlas();
  const acaAt = new Date().toISOString();
  writeFileSync(`${OUT}/reefs.geojson`, JSON.stringify(reefs));
  const { marks, coast } = await fetchOsm(gebco.elev);
  const osmAt = new Date().toISOString();
  writeFileSync(`${OUT}/marks.geojson`, JSON.stringify(marks));
  const mask = landMask(coast, gebco.elev);
  console.log(`land mask: ${mask.meta.cols}×${mask.meta.rows}, ${coast.length} coastline ways, ${(mask.land * 100).toFixed(1)}% land`);
  grids.land = mask.meta;

  const manifest = {
    grids,
    reefs: 'reefs.geojson',
    marks: 'marks.geojson',
    sources: [
      { id: 'gebco', name: `${gebco.version} Grid`, detail: '15 arc-second (~460 m) elevation + TID', licence: 'Public domain (GEBCO terms of use); not for navigation', url: 'https://www.gebco.net/', fetchedAt: gebcoAt },
      { id: 'aca', name: 'Allen Coral Atlas', detail: 'Geomorphic zones + benthic cover, 5 m pixels', licence: 'CC BY 4.0', url: 'https://allencoralatlas.org/', fetchedAt: acaAt },
      { id: 'osm', name: 'OpenStreetMap', detail: 'natural=reef, seamark:* (wrecks, lights, harbours), coastline land mask', licence: 'ODbL 1.0', url: 'https://www.openstreetmap.org/copyright', fetchedAt: osmAt },
    ],
  };
  writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${OUT}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
