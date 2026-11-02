/**
 * Seafloor adapter (PLAN 2.6): GEBCO depth grids, Allen Coral Atlas reef zones and OSM
 * reefs/seamarks, prebuilt by `npm run data:seafloor` into public/data/seafloor/ and
 * precached by the service worker, so it works offline from the first visit.
 */
import type { FeatureCollection } from 'geojson';
import type { Grid } from '../physics/bathy';

interface GridMeta { file: string; type: 'i16' | 'u8' | 'rle16'; cols: number; rows: number; lon0: number; lat0: number; dlon: number; dlat: number }

export interface SeafloorSource { id: string; name: string; detail: string; licence: string; url: string; fetchedAt: string }

interface Manifest {
  grids: { region: GridMeta; regionTid: GridMeta; macro: GridMeta; land: GridMeta };
  reefs: string;
  marks: string;
  sources: SeafloorSource[];
}

export interface Seafloor {
  /** GEBCO elevation, 15″, Gandoca–Limón. */
  region: Grid;
  /** GEBCO type identifier for each `region` cell (where its depth came from). */
  regionTid: Grid;
  /** GEBCO elevation, 1′ block means, western Caribbean. */
  macro: Grid;
  /** 1 = land, 0 = water, ~33 m cells over Gandoca–Limón, from the OSM coastline. Keeps depth off the beach. */
  land: Grid;
  /** Allen Coral Atlas polygons: properties { layer: 'zone' | 'bottom', cls }. */
  reefs: FeatureCollection;
  /** OSM points { kind, name, info? } and reef outlines (kind 'reef-area'). */
  marks: FeatureCollection;
  sources: SeafloorSource[];
}

const DIR = 'data/seafloor/';

export async function fetchSeafloor(base: string = import.meta.env.BASE_URL): Promise<{ data: Seafloor; fetchedAt: number }> {
  const url = (f: string) => `${base}${DIR}${f}`;
  const get = async (f: string) => {
    const res = await fetch(url(f));
    if (!res.ok) throw new Error(`seafloor: ${res.status} ${f}`);
    return res;
  };
  const m = (await (await get('manifest.json')).json()) as Manifest;
  const grid = async (g: GridMeta): Promise<Grid> => {
    const buf = await (await get(g.file)).arrayBuffer();
    const z = g.type === 'i16' ? new Int16Array(buf) : g.type === 'rle16' ? unRle(new Uint16Array(buf), g.cols, g.rows) : new Uint8Array(buf);
    if (z.length !== g.cols * g.rows) throw new Error(`seafloor: ${g.file} has ${z.length} cells, expected ${g.cols * g.rows}`);
    return { cols: g.cols, rows: g.rows, lon0: g.lon0, lat0: g.lat0, dlon: g.dlon, dlat: g.dlat, z };
  };
  const [region, regionTid, macro, land, reefs, marks] = await Promise.all([
    grid(m.grids.region),
    grid(m.grids.regionTid),
    grid(m.grids.macro),
    grid(m.grids.land),
    get(m.reefs).then((r) => r.json() as Promise<FeatureCollection>),
    get(m.marks).then((r) => r.json() as Promise<FeatureCollection>),
  ]);
  // A static dataset: its age is that of the oldest source in the build.
  const fetchedAt = Math.min(...m.sources.map((s) => Date.parse(s.fetchedAt)));
  return { data: { region, regionTid, macro, land, reefs, marks, sources: m.sources }, fetchedAt };
}

/** Row run lengths (alternating 0/1, each row starting with 0) → one byte per cell. */
export function unRle(runs: Uint16Array, cols: number, rows: number): Uint8Array {
  const z = new Uint8Array(cols * rows);
  let i = 0;
  let v = 0;
  let inRow = 0;
  for (const len of runs) {
    if (v) z.fill(1, i, i + len);
    i += len;
    inRow += len;
    if (inRow >= cols) (inRow = 0), (v = 0);
    else v ^= 1;
  }
  return z;
}
