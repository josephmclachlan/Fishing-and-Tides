/**
 * Daily history archive (PLAN 8.1): the rows the data build saves every hour, so the app can show
 * the past later (docs/HISTORY.md). Pure functions, no DOM and no runtime imports, so the Node
 * script (scripts/archive.ts) can load this file directly.
 *
 * One row = one value at one place and time: valid time, site, source, model, variable, value and,
 * for forecasts, when the forecast was issued. Rows are stored as CSV, one file per UTC day of the
 * valid time, and appended to: a row whose key (everything but the value) is already in the file
 * is skipped, so re-running the build hour after hour never duplicates anything.
 */

export interface Row {
  /** Valid time (forecasts) or observation time, epoch ms. */
  t: number;
  /** A named spot (`CAHUITA`), a station (`MRLM`, `limon`), a storm id, or `lng;lat` for a grid cell. */
  site: string;
  /** Feed or service: `wind`, `waves`, `metar`, `gauge`, `openmeteo`, ... */
  source: string;
  /** Model id where a source has several (`gfs_seamless`), else empty. */
  model: string;
  /** Variable, with the unit in the feed's own convention (docs/HISTORY.md lists them). */
  v: string;
  value: number;
  /** When a forecast was issued (run time, else fetch time), epoch ms. Absent for observations. */
  issued?: number;
}

export const HEADER = 't,site,source,model,var,value,issued';

const minute = (ms: number) => new Date(ms).toISOString().slice(0, 16) + 'Z';
/** Five significant figures: enough for every feed (Int16 packing already rounds harder). */
const num = (x: number) => String(Number(x.toPrecision(5)));
/** Commas and line breaks would break the CSV; sites and variables never need them. */
const clean = (s: string) => s.replace(/[,\r\n]/g, ';');

export const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function rowKey(r: Row): string {
  return [minute(r.t), clean(r.site), r.source, r.model, r.v, r.issued === undefined ? '' : minute(r.issued)].join(',');
}

export function toLine(r: Row): string {
  const [t, site, source, model, v, issued] = rowKey(r).split(',');
  return [t, site, source, model, v, num(r.value), issued].join(',');
}

/** A stored line's key: every column but the value. */
function lineKey(line: string): string {
  const c = line.split(',');
  return [...c.slice(0, 5), c[6] ?? ''].join(',');
}

export function parseCsv(text: string): Row[] {
  const out: Row[] = [];
  for (const line of text.split('\n')) {
    if (!line || line === HEADER) continue;
    const [t, site, source, model, v, value, issued] = line.split(',');
    out.push({ t: Date.parse(t), site, source, model, v, value: +value, ...(issued ? { issued: Date.parse(issued) } : {}) });
  }
  return out;
}

/**
 * Append `rows` to a day file's text (undefined = new file), skipping non-finite values and keys
 * already present. Returns the new text and how many rows were added.
 */
export function mergeDay(existing: string | undefined, rows: readonly Row[]): { text: string; added: number } {
  const seen = new Set<string>();
  let text = existing && existing.length ? existing : HEADER + '\n';
  if (!text.endsWith('\n')) text += '\n';
  for (const line of text.split('\n')) if (line && line !== HEADER) seen.add(lineKey(line));
  let added = 0;
  const lines: string[] = [];
  for (const r of rows) {
    if (!Number.isFinite(r.value) || !Number.isFinite(r.t)) continue;
    const k = rowKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    lines.push(toLine(r));
    added++;
  }
  return { text: text + (lines.length ? lines.join('\n') + '\n' : ''), added };
}

/** Group rows by the UTC day of their valid time. */
export function byDay(rows: readonly Row[]): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    if (!Number.isFinite(r.t)) continue;
    const d = dayOf(r.t);
    (m.get(d) ?? m.set(d, []).get(d)!).push(r);
  }
  return m;
}

/**
 * The valid times of a forecast series to keep: from the issue hour to `horizonH` later, every
 * `stepH` hours. Short leads are what bias correction (PLAN 7.10) and "what did we predict for
 * that day" need; keeping all 16 days of every run would be ~5 MB a day.
 */
export function forecastTimes(times: readonly number[], issued: number, horizonH = 24, stepH = 3): number[] {
  const start = Math.floor(issued / 3.6e6) * 3.6e6;
  return times.filter((t) => t >= start && t <= start + horizonH * 3.6e6 && Math.round((t - start) / 3.6e6) % stepH === 0);
}

export interface Site {
  name: string;
  lngLat: readonly [number, number];
}

/** Sample variables at sites and times with `at` (the script passes frames.ts scalarAt). */
export function sampleRows(
  at: (v: string, lng: number, lat: number, t: number) => number,
  o: { sites: readonly Site[]; times: readonly number[]; vars: readonly string[]; source: string; model?: string; issued?: number },
): Row[] {
  const out: Row[] = [];
  for (const t of o.times)
    for (const s of o.sites)
      for (const v of o.vars) {
        const value = at(v, s.lngLat[0], s.lngLat[1], t);
        if (Number.isFinite(value)) out.push({ t, site: s.name, source: o.source, model: o.model ?? '', v, value, ...(o.issued !== undefined ? { issued: o.issued } : {}) });
      }
  return out;
}

/**
 * Sargassum cells with weed in one daily map, plus how many cells were seen at all (a day with
 * no weed rows and few cells seen was cloudy, not clear). `cells` is the map's values (NaN = not
 * seen), row 0 north.
 */
export function sargassumRows(
  t: number,
  cells: ArrayLike<number>,
  g: { cols: number; rows: number; lon0: number; lat0: number; dlon: number; dlat: number },
): Row[] {
  const out: Row[] = [];
  let seen = 0;
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      const x = cells[r * g.cols + c];
      if (!Number.isFinite(x)) continue;
      seen++;
      if (x > 0) out.push({ t, site: `${(g.lon0 + c * g.dlon).toFixed(3)};${(g.lat0 - r * g.dlat).toFixed(3)}`, source: 'sargassum', model: '', v: 'cover', value: x });
    }
  out.push({ t, site: 'SARG_BOX', source: 'sargassum', model: '', v: 'cellsSeen', value: seen });
  return out;
}

export interface MetarObs {
  t: number;
  windFromDeg: number | null;
  windKt: number | null;
  gustKt: number | null;
  tempC: number | null;
  dewC: number | null;
  pressureHpa: number | null;
}

/** Every number in each METAR report (a calm or variable wind has no direction, so none is kept). */
export function metarRows(station: string, obs: readonly MetarObs[]): Row[] {
  const out: Row[] = [];
  for (const o of obs)
    for (const v of ['windFromDeg', 'windKt', 'gustKt', 'tempC', 'dewC', 'pressureHpa'] as const) {
      const value = o[v];
      if (typeof value === 'number' && Number.isFinite(value)) out.push({ t: o.t, site: station, source: 'metar', model: '', v, value });
    }
  return out;
}

/**
 * Tide gauge readings as `binMin`-minute means of the level above MSL, each with the predicted
 * tide at the bin centre (so the weather's share, level − tide, can be read later). Bins with
 * fewer than half their minutes are dropped.
 */
export function gaugeRows(site: string, readings: readonly { t: number; levelM: number }[], predict: (t: number) => number, binMin = 10): Row[] {
  const bin = binMin * 60e3;
  const sums = new Map<number, { s: number; n: number }>();
  for (const r of readings) {
    if (!Number.isFinite(r.levelM)) continue;
    const k = Math.floor(r.t / bin) * bin;
    const b = sums.get(k) ?? sums.set(k, { s: 0, n: 0 }).get(k)!;
    b.s += r.levelM;
    b.n++;
  }
  const out: Row[] = [];
  for (const [k, b] of [...sums].sort((a, z) => a[0] - z[0])) {
    if (b.n < binMin / 2) continue;
    const t = k + bin / 2;
    out.push({ t, site, source: 'gauge', model: '', v: 'levelM', value: b.s / b.n });
    out.push({ t, site, source: 'gauge', model: '', v: 'tideM', value: predict(t) });
  }
  return out;
}

/** IOC Sea Level Monitoring rows → readings for one sensor, put on mean sea level. */
export function parseIocRows(rows: unknown, sensor: string, mslOnSensorM: number): { t: number; levelM: number }[] {
  if (!Array.isArray(rows)) throw new Error('gauge: response is not a list');
  const out: { t: number; levelM: number }[] = [];
  for (const r of rows as { slevel?: unknown; stime?: unknown; sensor?: unknown }[]) {
    if (r.sensor !== sensor || typeof r.slevel !== 'number' || typeof r.stime !== 'string') continue;
    const t = Date.parse(r.stime.replace(' ', 'T') + 'Z');
    if (Number.isFinite(t) && Number.isFinite(r.slevel)) out.push({ t, levelM: r.slevel - mslOnSensorM });
  }
  return out;
}

/**
 * One Open-Meteo multi-model point response (hourly keys `<var>_<model>`, unix times) → rows
 * for each model and variable, all stamped with the same issue time.
 */
export function modelRows(json: unknown, site: string, models: readonly string[], vars: readonly string[], issued: number, horizonH = 24): Row[] {
  const h = (json as { hourly?: Record<string, (number | null)[]> & { time?: number[] } } | null)?.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error('open-meteo: no hourly block');
  const out: Row[] = [];
  const start = Math.floor(issued / 3.6e6) * 3.6e6;
  h.time.forEach((sec, i) => {
    const t = sec * 1000;
    if (t < start || t > start + horizonH * 3.6e6) return;
    for (const m of models)
      for (const v of vars) {
        const value = h[`${v}_${m}`]?.[i];
        if (typeof value === 'number' && Number.isFinite(value)) out.push({ t, site, source: 'openmeteo', model: m, v, value });
      }
  });
  return out.map((r) => ({ ...r, issued }));
}

export interface StormObs {
  id: string;
  windKt: number;
  pressureMb: number;
  lngLat: [number, number];
  movementDeg: number;
  movementKt: number;
  updatedMs: number;
}

/** Each active storm's advisory position and strength, at its advisory time. */
export function stormRows(storms: readonly StormObs[]): Row[] {
  const out: Row[] = [];
  for (const s of storms) {
    const vals: Record<string, number> = { lng: s.lngLat[0], lat: s.lngLat[1], windKt: s.windKt, pressureMb: s.pressureMb, movementDeg: s.movementDeg, movementKt: s.movementKt };
    for (const [v, value] of Object.entries(vals)) if (Number.isFinite(value)) out.push({ t: s.updatedMs, site: s.id, source: 'nhc', model: '', v, value });
  }
  return out;
}
