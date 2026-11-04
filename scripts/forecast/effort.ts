/**
 * Fishing effort (PLAN 7.19): apparent fishing hours from Global Fishing Watch's AIS fishing-effort
 * dataset (4Wings report API, `public-global-fishing-effort:latest`), summed over the last year at
 * 0.1° over EFFORT_BOX, as one frame. Needs the free API token in the `GFW_TOKEN` Actions secret
 * (non-commercial use only). Only vessels with AIS show: industrial longliners, seiners and
 * trawlers, not the local pangas. GFW data runs about 4 days late.
 */
import { EFFORT_BOX } from '../../src/region.ts';
import { effortGrid, unzipFirst } from '../../src/adapters/effort-parse.ts';
import { get, writeSeries } from './common.ts';

const API = 'https://gateway.api.globalfishingwatch.org/v3/4wings/report';
const DATASET = 'public-global-fishing-effort:latest';
const DAYS = 365;
const LAG_DAYS = 4;

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function buildEffort(dir: string): Promise<string> {
  const token = process.env.GFW_TOKEN;
  if (!token) throw new Error('no Global Fishing Watch token (GFW_TOKEN)');
  const end = Date.now() - LAG_DAYS * 864e5, start = end - DAYS * 864e5;
  const [[w, s], [e, n]] = EFFORT_BOX;
  const polygon = { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] };
  const q = new URLSearchParams({
    'spatial-resolution': 'LOW', 'temporal-resolution': 'ENTIRE', 'group-by': 'FLAG', format: 'JSON',
    'datasets[0]': DATASET, 'date-range': `${day(start)},${day(end)}`,
  });
  // One report at a time per user (429 while another runs); `get` backs off and retries.
  const res = await get(`${API}?${q}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // A bare geometry, as the official Python client sends it.
    body: JSON.stringify({ geojson: polygon }),
  }, 3);
  const text = new TextDecoder().decode(await unzipFirst(new Uint8Array(await res.arrayBuffer())));
  const json = JSON.parse(text);
  const g = effortGrid(json, EFFORT_BOX);
  // No rows is possible (little AIS fishing here) but also what a changed response shape looks like: log the shape, never the token.
  if (!g.rows) console.warn(`effort: no rows; response ${text.length} B, keys ${Object.keys(json ?? {}).join(',')}, total ${json?.total}, start ${text.slice(0, 300)}`);
  const cellsWithFishing = g.hours.filter((h) => h > 0).length;
  const mid = Math.round((start + end) / 2);
  const size = writeSeries(dir, {
    feed: 'effort', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times: [mid],
    vars: [{ name: 'hours', unit: 'h', scale: 0.1, offset: 0 }],
    sources: [{ id: DATASET, name: `Global Fishing Watch AIS fishing effort, ${day(start)} to ${day(end)}, ${cellsWithFishing} cells with fishing`, fromMs: start, toMs: end }],
    licence: 'Global Fishing Watch, CC BY-NC 4.0 (globalfishingwatch.org), non-commercial use',
  }, { hours: [g.hours.map((h) => Math.min(h, 3000))] });
  const total = g.hours.reduce((a, b) => a + b, 0);
  return `effort: ${g.grid.cols}×${g.grid.rows}, ${g.rows} rows, ${Math.round(total)} h, top flags ${g.flags.slice(0, 3).map((f) => `${f.flag} ${Math.round(f.hours)}`).join(', ') || 'none'}, ${Math.round(size / 1024)} KB`;
}
