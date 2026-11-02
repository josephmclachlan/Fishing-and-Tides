/**
 * Satellite sea surface temperature and ocean colour (PLAN 2.4), from NOAA CoastWatch ERDDAP.
 * ERDDAP sends no CORS headers, so the data build relays the last week of daily maps as packed
 * series (kind 'observed') for src/adapters/satellite.ts. Datasets and why: docs/OBSERVATIONS.md.
 *
 *  - `sst`, `sst-coast`: MUR SST v4.1 (JPL), a gap-free daily analysis at 0.01°, about 2 days
 *    late. 0.05° over the macro view, full 0.01° over Gandoca–Limón.
 *  - `chl`: chlorophyll-a, gap-filled (DINEOF) VIIRS NOAA-20/S-NPP, 9 km, about 3 days late.
 *  - `kd490`: diffuse attenuation at 490 nm, gap-filled VIIRS + OLCI, 2 km over the coast,
 *    science quality so about 10 days late. Clarity (PLAN 6.1) builds on it.
 *
 * Gap-filled products are used because cloud hides this coast most afternoons; the raw passes
 * with their holes come with PLAN 2.12.
 */
import { REGION } from '../../src/region.ts';
import type { SourceSpan } from '../../src/adapters/pack.ts';
import { erddapToGrid, type ErddapGrid } from '../../src/adapters/erddap-parse.ts';
import { get, writeSeries } from './common.ts';

const PFEG = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/';
const CW = 'https://coastwatch.noaa.gov/erddap/griddap/';
/** The coastal nest, the same box as the currents nest. [[w, s], [e, n]] */
export const COAST_BOX: [[number, number], [number, number]] = [[-83.5, 9.3], [-82.25, 10.3]];
const DAYS = 7;
const LICENCE = 'NOAA CoastWatch ERDDAP, public domain; credit NOAA/NESDIS, NASA JPL (MUR)';

/** griddap query for the last `DAYS` time steps over a box. `latDesc`: the dataset stores latitude north to south. */
function query(server: string, id: string, v: string, box: [[number, number], [number, number]], stride: number, opts: { altitude?: boolean; latDesc?: boolean }) {
  const [[w, s], [e, n]] = box;
  const lat = opts.latDesc ? `[(${n}):${stride}:(${s})]` : `[(${s}):${stride}:(${n})]`;
  const sel = `${v}[last-${DAYS - 1}:1:last]${opts.altitude ? '[0]' : ''}${lat}[(${w}):${stride}:(${e})]`;
  return `${server}${id}.json?${encodeURI(sel).replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
}

async function fetchGrid(url: string, min: number, max: number): Promise<ErddapGrid> {
  const body = (await (await get(url, {}, 4)).json()) as { table: { columnNames: string[]; rows: unknown[][] } };
  return erddapToGrid(body.table, min, max);
}

const span = (id: string, name: string, times: number[]): SourceSpan[] => [{ id, name, fromMs: times[0], toMs: times[times.length - 1] }];
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const kb = (b: number) => `${Math.round(b / 1024)} KB`;

export async function buildSst(dir: string): Promise<string> {
  const fetchedAt = new Date().toISOString();
  const out: string[] = [];
  for (const [feed, box, stride] of [['sst', REGION.maxBounds, 5], ['sst-coast', COAST_BOX, 1]] as const) {
    const g = await fetchGrid(query(PFEG, 'jplMURSST41', 'analysed_sst', box, stride, {}), -2, 40);
    const size = writeSeries(dir, {
      feed, kind: 'observed', fetchedAt, grid: g.grid, times: g.times,
      vars: [{ name: 'sst', unit: '°C', scale: 0.01, offset: 0 }],
      sources: span('jplMURSST41', 'MUR SST v4.1 (JPL), daily analysis', g.times), licence: LICENCE,
    }, { sst: g.frames });
    out.push(`${feed} ${g.grid.cols}×${g.grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, ${kb(size)}`);
  }
  return `sst: ${out.join('; ')}`;
}

export async function buildChl(dir: string): Promise<string> {
  const id = 'noaacwNPPN20VIIRSDINEOFDaily';
  const g = await fetchGrid(query(CW, id, 'chlor_a', REGION.maxBounds, 1, { altitude: true, latDesc: true }), 0.001, 100);
  const size = writeSeries(dir, {
    feed: 'chl', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times: g.times,
    // Linear at 0.002 mg/m³ keeps the clear-water values (0.05 to 0.2) distinct and reaches 65 in river plumes.
    vars: [{ name: 'chl', unit: 'mg/m³', scale: 0.002, offset: 0 }],
    sources: span(id, 'VIIRS chlorophyll-a, gap-filled (DINEOF), NRT 9 km', g.times), licence: LICENCE,
  }, { chl: g.frames });
  return `chl: ${g.grid.cols}×${g.grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, ${kb(size)}`;
}

export async function buildKd490(dir: string): Promise<string> {
  const id = 'noaacwNPPN20S3AkdSCIDINEOF2kmDaily';
  // valid_max is 6 m⁻¹; the files also carry +6.5534 where the fill should be.
  const g = await fetchGrid(query(CW, id, 'kd_490', COAST_BOX, 1, { altitude: true, latDesc: true }), 0.01, 6);
  const size = writeSeries(dir, {
    feed: 'kd490', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times: g.times,
    vars: [{ name: 'kd490', unit: '1/m', scale: 0.0002, offset: 0 }],
    sources: span(id, 'VIIRS + OLCI Kd490, gap-filled (DINEOF), science quality 2 km', g.times), licence: LICENCE,
  }, { kd490: g.frames });
  return `kd490: ${g.grid.cols}×${g.grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, ${kb(size)}`;
}
