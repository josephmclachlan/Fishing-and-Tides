/**
 * NASA GPM IMERG satellite rain over the river catchments (PLAN 7.51). IMERG Early Run, half-hourly,
 * 0.1° (GPM_3IMERGHHE V07): rain merged from every passive-microwave satellite and filled between
 * passes with geostationary infrared, about 4 to 6 hours after the fact. The data build
 * (scripts/forecast/rain-imerg.ts) reads one small OPeNDAP subset per half hour and averages the cells
 * of each river's `rainBox`; the app (adapters/catchment-rain.ts) uses those means for the past hours
 * and the weather model for the rest. Import-free apart from types, so it is type-checked and tested
 * with the app and loaded by the Node build directly.
 *
 * The Early Run has no rain-gauge correction (the Final Run, which has, comes months later), so it
 * can miss the heaviest mountain rain. It is still a measurement over the whole catchment, where the
 * model's rain at one point is a forecast at one point.
 */

/** The IMERG grid: 0.1° cells, centres from −179.95 (3600 columns) and −89.95 (1800 rows), south first. */
export const IMERG = { step: 0.1, lon0: -179.95, lat0: -89.95, cols: 3600, rows: 1800 } as const;
export const IMERG_DATASET = 'GPM_3IMERGHHE.07';
export const IMERG_NAME = 'NASA GPM IMERG Early Run half-hourly 0.1° V07 (Huffman et al., NASA GES DISC, doi:10.5067/GPM/IMERG/3B-HH-E/07)';
export const IMERG_LICENCE = 'NASA open data, no restrictions; cite the dataset DOI.';
const HALF_H = 1800e3;

type Box = readonly [readonly [number, number], readonly [number, number]];
export interface RainRiver {
  name: string;
  rainBox: Box;
}

/** Grid indices of the cells whose centres lie inside `box` (its edges on the 0.1° lines): lon index, lat index. */
export function boxCells(box: Box): [number, number][] {
  const [[w, s], [e, n]] = box;
  // Edges sit halfway between centres, so rounding the half-cell-in edge gives the first and last centre.
  const i0 = Math.round((w + IMERG.step / 2 - IMERG.lon0) / IMERG.step), i1 = Math.round((e - IMERG.step / 2 - IMERG.lon0) / IMERG.step);
  const j0 = Math.round((s + IMERG.step / 2 - IMERG.lat0) / IMERG.step), j1 = Math.round((n - IMERG.step / 2 - IMERG.lat0) / IMERG.step);
  const out: [number, number][] = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push([i, j]);
  return out;
}

/** The one rectangle of indices that covers every river's cells, for a single subset per file. */
export function subsetOf(rivers: readonly RainRiver[]): { i0: number; i1: number; j0: number; j1: number } {
  const cells = rivers.flatMap((r) => boxCells(r.rainBox));
  if (!cells.length) throw new Error('imerg: no cells');
  return {
    i0: Math.min(...cells.map((c) => c[0])), i1: Math.max(...cells.map((c) => c[0])),
    j0: Math.min(...cells.map((c) => c[1])), j1: Math.max(...cells.map((c) => c[1])),
  };
}

/** The OPeNDAP constraint for that rectangle (brackets and colons percent-encoded). */
export const subsetQuery = (b: ReturnType<typeof subsetOf>) => `precipitation%5B0%5D%5B${b.i0}%3A${b.i1}%5D%5B${b.j0}%3A${b.j1}%5D`;

/**
 * An OPeNDAP ASCII answer for `precipitation[0][i0:i1][j0:j1]` to rain rates, mm/h, lon-major
 * (index (i − i0)·nLat + (j − j0)). Lines look like `precipitation[0][3], 0, 0.42, …`, one per lon
 * along lat. Fill values (−9999.9) and anything negative become NaN.
 */
export function parseImergAscii(text: string, nLon: number, nLat: number): Float64Array {
  const out = new Float64Array(nLon * nLat).fill(NaN);
  const seen = new Set<number>();
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:[\w.]*\.)?precipitation\[\d+\]\[(\d+)\]\s*,(.*)$/);
    if (!m) continue;
    const i = Number(m[1]);
    const v = m[2].split(',').map((x) => Number(x.trim()));
    if (i >= nLon || v.length !== nLat) throw new Error(`imerg: row ${i} has ${v.length} values, expected ${nLat}`);
    v.forEach((x, j) => (out[i * nLat + j] = Number.isFinite(x) && x >= 0 ? x : NaN));
    seen.add(i);
  }
  if (seen.size !== nLon) throw new Error(`imerg: ${seen.size} of ${nLon} rows in the answer`);
  return out;
}

/**
 * Mean rain rate over each river's cells, mm/h, from one parsed subset. Null when fewer than half
 * the cells have a value (IMERG leaves a cell out where no sensor saw it).
 */
export function catchmentMeans(rates: Float64Array, b: ReturnType<typeof subsetOf>, rivers: readonly RainRiver[]): Record<string, number | null> {
  const nLat = b.j1 - b.j0 + 1;
  const out: Record<string, number | null> = {};
  for (const r of rivers) {
    const cells = boxCells(r.rainBox);
    let s = 0, n = 0;
    for (const [i, j] of cells) {
      const x = rates[(i - b.i0) * nLat + (j - b.j0)];
      if (Number.isFinite(x)) (s += x), n++;
    }
    out[r.name] = n * 2 >= cells.length && n > 0 ? Math.round((s / n) * 1000) / 1000 : null;
  }
  return out;
}

/** `3B-HHR-E.MS.MRG.3IMERG.20261110-S123000-E125959.0750.V07C.HDF5` → its start, epoch ms; NaN for other names. */
export function imergFileStart(name: string): number {
  const m = name.match(/^3B-HHR-E\.MS\.MRG\.3IMERG\.(\d{4})(\d{2})(\d{2})-S(\d{2})(\d{2})\d{2}-E\d{6}\.\d{4}\.V\w+\.HDF5$/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN;
}

/** The half-hour files in a GES DISC directory listing (HTML), each once, with their starts. */
export function listingFiles(html: string): { name: string; start: number }[] {
  const names = new Set(html.match(/3B-HHR-E\.MS\.MRG\.3IMERG\.\d{8}-S\d{6}-E\d{6}\.\d{4}\.V\w+?\.HDF5(?![.\w])/g) ?? []);
  return [...names].map((name) => ({ name, start: imergFileStart(name) })).filter((f) => Number.isFinite(f.start)).sort((a, b) => a.start - b.start);
}

/** The published feed, data/forecast/rain-imerg.json. */
export interface RainImerg {
  feed: 'rain-imerg';
  fetchedAt: string;
  source: { id: string; name: string };
  licence: string;
  /** Cells averaged per river. */
  cells: Record<string, number>;
  /** Half-hour starts read so far, epoch ms, ascending. A half hour IMERG hasn't published yet is absent. */
  times: number[];
  /** River name → mean rain rate over its cells, mm/h, per entry of `times`; null where too few cells had a value. */
  byRiver: Record<string, (number | null)[]>;
}

/** Previous feed plus new half hours, sorted, a repeated start keeping the newer, older than `fromMs` dropped. */
export function mergeHalfHours(prev: RainImerg | null, add: { start: number; means: Record<string, number | null> }[], rivers: readonly RainRiver[], fromMs: number): Pick<RainImerg, 'times' | 'byRiver'> {
  const at = new Map<number, Record<string, number | null>>();
  if (prev) prev.times.forEach((t, k) => at.set(t, Object.fromEntries(rivers.map((r) => [r.name, prev.byRiver[r.name]?.[k] ?? null]))));
  for (const a of add) at.set(a.start, a.means);
  const times = [...at.keys()].filter((t) => t >= fromMs).sort((a, b) => a - b);
  return { times, byRiver: Object.fromEntries(rivers.map((r) => [r.name, times.map((t) => at.get(t)![r.name] ?? null)])) };
}

/**
 * Hourly rain, mm, per river, from the half hours: an hour counts only when both its half hours
 * have a value (the mean of the two rates). Hour starts, ascending.
 */
export function imergHourly(f: Pick<RainImerg, 'times' | 'byRiver'>): { times: number[]; byRiver: Record<string, number[]> } {
  const hours = [...new Set(f.times.map((t) => Math.floor(t / 3.6e6) * 3.6e6))].sort((a, b) => a - b);
  const idx = new Map(f.times.map((t, k) => [t, k]));
  const byRiver: Record<string, number[]> = {};
  for (const [name, xs] of Object.entries(f.byRiver)) {
    byRiver[name] = hours.map((h) => {
      const a = xs[idx.get(h) ?? -1], b = xs[idx.get(h + HALF_H) ?? -1];
      return typeof a === 'number' && typeof b === 'number' ? (a + b) / 2 : NaN;
    });
  }
  return { times: hours, byRiver };
}

/**
 * Daily rain per river, mm, for each UTC day that is over and has at least `minHalfHours` of its 48
 * half hours (the mean rate of those times 24 h). For the history archive.
 */
export function imergDaily(f: Pick<RainImerg, 'times' | 'byRiver'>, nowMs: number, minHalfHours = 44): { day: number; river: string; mm: number; halfHours: number }[] {
  const out: { day: number; river: string; mm: number; halfHours: number }[] = [];
  const days = [...new Set(f.times.map((t) => Math.floor(t / 864e5) * 864e5))].sort((a, b) => a - b);
  for (const day of days) {
    // IMERG Early arrives about 5 h late, so wait half a day before calling a day complete.
    if (day + 864e5 + 12 * 3.6e6 > nowMs) continue;
    for (const [river, xs] of Object.entries(f.byRiver)) {
      let s = 0, n = 0;
      f.times.forEach((t, k) => {
        const x = xs[k];
        if (t >= day && t < day + 864e5 && typeof x === 'number') (s += x), n++;
      });
      if (n >= minHalfHours) out.push({ day, river, mm: (s / n) * 24, halfHours: n });
    }
  }
  return out;
}
