/**
 * Satellite passes (PLAN 2.12, 2.14): the raw SST and chlorophyll maps over Gandoca–Limón, cloud
 * holes and all, and the ASCAT scatterometer wind swaths just offshore, each stamped with when the
 * satellite actually flew over (scripts/forecast/satellite.ts). Where 2.4's gap-filled maps say what
 * the sea is probably like, these say what was seen and when, for LIVE OBS (2.13), the verify
 * cross-checks against the analysis and the forecast model, and the bias correction (7.10).
 *
 * ASCAT is radar, so cloud does not stop it; its holes are the gaps between swaths and a ~20 km
 * band along the coast it cannot see. It comes from Copernicus Marine with an account (docs/OBSERVATIONS.md).
 */
import type { GridSeries } from './pack';
import { validateMeta } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { observedAt, type SatelliteData } from './satellite';
import { freshness, inRange, type Check, type Outcome } from '../verify/types';

export interface PassData {
  sst: GridSeries | null;
  chl: GridSeries | null;
  /** ASCAT wind, vars u and v (m/s). */
  scat?: GridSeries | null;
  fetchedAt: number;
}

export async function fetchPasses(opts: LoadOptions = {}): Promise<PassData> {
  const got = await Promise.allSettled([loadSeries('sst-pass', opts), loadSeries('chl-pass', opts), loadSeries('scat-pass', opts)]);
  const ages = got.flatMap((g) => (g.status === 'fulfilled' ? [g.value.fetchedAt] : []));
  const [sst, chl, scat] = got.map((g) => (g.status === 'fulfilled' ? g.value.series : null));
  return { sst, chl, scat, fetchedAt: ages.length ? Math.min(...ages) : NaN };
}

export interface Pass {
  /** When the satellite flew over, epoch ms. */
  obsMs: number;
  /** Share of the sea that was seen (not cloud), 0..1. */
  clear: number;
  /** Mean of what was seen, NaN if nothing was. */
  mean: number;
  /** Source name from the manifest (e.g. afternoon or night pass). */
  source: string;
}

/**
 * Cells seen clear in at least one pass of the series. Used to count what a pass saw (land never has
 * a value, so seen cells are sea), and as the sea count when the manifest has no `seaCells`.
 */
export function seaCells(s: GridSeries, v: string): Uint8Array {
  const fs = s.values[v];
  const sea = new Uint8Array(fs[0]?.length ?? 0);
  for (const f of fs) for (let i = 0; i < f.length; i++) if (Number.isFinite(f[i])) sea[i] = 1;
  return sea;
}

/** One summary per pass, oldest first: when, how much of the sea was clear, and the mean value. */
export function passList(s: GridSeries | null, v: string): Pass[] {
  if (!s || !s.values[v]) return [];
  const sea = seaCells(s, v);
  // The build counts the sea from the depth grid; without that, the cells ever seen stand in for it.
  const nSea = Math.max(s.meta.seaCells ?? 0, sea.reduce((a, b) => a + b, 0));
  return s.values[v].map((f, k) => {
    let n = 0, sum = 0;
    for (let i = 0; i < f.length; i++) if (Number.isFinite(f[i])) (n++, (sum += f[i]));
    const ms = s.meta.times[k];
    const src = s.meta.sources.find((x) => ms >= x.fromMs && ms <= x.toMs) ?? s.meta.sources[0];
    return { obsMs: ms, clear: nSea ? n / nSea : 0, mean: n ? sum / n : NaN, source: src?.name ?? '' };
  });
}

/** Share of the sea clear below which a pass counts as clouded out. */
export const CLOUDED_OUT = 0.1;

/**
 * The newest pass at or before `ms` that saw this point (the cell or one of its neighbours), with
 * its value and time; null if every pass was cloudy there.
 */
export function latestSeen(s: GridSeries | null, v: string, lng: number, lat: number, ms = Date.now()): { value: number; obsMs: number } | null {
  if (!s || !s.values[v]) return null;
  const g = s.meta.grid;
  const c = Math.round((lng - g.lon0) / g.dlon), r = Math.round((g.lat0 - lat) / g.dlat);
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return null;
  for (let k = s.meta.times.length - 1; k >= 0; k--) {
    if (s.meta.times[k] > ms) continue;
    const f = s.values[v][k];
    let n = 0, sum = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= g.rows || cc >= g.cols) continue;
        const x = f[rr * g.cols + cc];
        if (Number.isFinite(x)) (n++, (sum += x));
      }
    if (n) return { value: sum / n, obsMs: s.meta.times[k] };
  }
  return null;
}

/** Pass SST minus the MUR analysis over every clear cell of the newest usable passes: mean bias and count. */
export function passBias(p: GridSeries, analysis: SatelliteData, passes = 4): { bias: number; n: number } {
  const g = p.meta.grid;
  let s = 0, n = 0;
  const frames = p.values.sst;
  for (let k = Math.max(0, frames.length - passes); k < frames.length; k++) {
    const ms = p.meta.times[k];
    for (let r = 0; r < g.rows; r += 2)
      for (let c = 0; c < g.cols; c += 2) {
        const x = frames[k][r * g.cols + c];
        if (!Number.isFinite(x)) continue;
        const lng = g.lon0 + c * g.dlon, lat = g.lat0 - r * g.dlat;
        const a = observedAt(analysis.sstCoast, 'sst', lng, lat, ms)?.value ?? observedAt(analysis.sst, 'sst', lng, lat, ms)?.value;
        if (a === undefined || !Number.isFinite(a)) continue;
        s += x - a;
        n++;
      }
  }
  return { bias: n ? s / n : NaN, n };
}

const RAD = Math.PI / 180;

export interface ScatMean {
  /** Vector-mean wind, m/s. */
  u: number;
  v: number;
  /** Direction the vector-mean wind comes FROM, degrees true. */
  fromDeg: number;
  /** Mean of the cell speeds, m/s (the vector mean understates a wind that varies across the box). */
  speed: number;
  n: number;
}

/** The mean wind of what pass `k` saw; null if it saw nothing. */
export function scatMean(s: GridSeries, k: number): ScatMean | null {
  const U = s.values.u?.[k], V = s.values.v?.[k];
  if (!U || !V) return null;
  let n = 0, su = 0, sv = 0, sp = 0;
  for (let i = 0; i < U.length; i++)
    if (Number.isFinite(U[i]) && Number.isFinite(V[i])) (n++, (su += U[i]), (sv += V[i]), (sp += Math.hypot(U[i], V[i])));
  if (!n) return null;
  const u = su / n, v = sv / n;
  return { u, v, fromDeg: (Math.atan2(-u, -v) / RAD + 360) % 360, speed: sp / n, n };
}

/** Up to `max` cells pass `k` saw, spread evenly through them, as [lng, lat, u, v], for the model comparison. */
export function scatSamples(s: GridSeries, k: number, max = 12): [number, number, number, number][] {
  const g = s.meta.grid, U = s.values.u[k], V = s.values.v[k];
  const seen: number[] = [];
  for (let i = 0; i < U.length; i++) if (Number.isFinite(U[i]) && Number.isFinite(V[i])) seen.push(i);
  const step = Math.max(1, seen.length / max);
  const out: [number, number, number, number][] = [];
  for (let j = 0; j < seen.length && out.length < max; j += step) {
    const i = seen[Math.floor(j)];
    out.push([+(g.lon0 + (i % g.cols) * g.dlon).toFixed(4), +(g.lat0 - Math.floor(i / g.cols) * g.dlat).toFixed(4), U[i], V[i]]);
  }
  return out;
}

/** Open-Meteo best match (the model behind the wind feed) at those points, hourly, back far enough to cover `obsMs`. */
export function scatModelUrl(pts: readonly (readonly number[])[], obsMs: number, now = Date.now()): string {
  const past = Math.min(7, Math.max(1, Math.ceil((now - obsMs) / 864e5) + 1));
  return `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p[1]).join(',')}&longitude=${pts.map((p) => p[0]).join(',')}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&past_days=${past}&forecast_days=1&cell_selection=nearest&timeformat=unixtime&timezone=GMT`;
}

/**
 * Model u, v at `obsMs` for each point of an Open-Meteo multi-point answer, interpolated between
 * the hours either side; [NaN, NaN] where the model has no value.
 */
export function modelWindAt(json: unknown, obsMs: number): [number, number][] {
  const arr = (Array.isArray(json) ? json : [json]) as { hourly?: { time?: number[]; wind_speed_10m?: (number | null)[]; wind_direction_10m?: (number | null)[] } }[];
  return arr.map((p) => {
    const h = p.hourly, t = h?.time ?? [];
    const uv = (i: number): [number, number] => {
      const sp = h?.wind_speed_10m?.[i], d = h?.wind_direction_10m?.[i];
      return typeof sp === 'number' && typeof d === 'number' ? [-sp * Math.sin(d * RAD), -sp * Math.cos(d * RAD)] : [NaN, NaN];
    };
    const x = obsMs / 1000;
    const i = t.findIndex((s, j) => s <= x && (t[j + 1] ?? -Infinity) > x);
    if (i < 0) return [NaN, NaN];
    const f = (x - t[i]) / (t[i + 1] - t[i]);
    const [a, b] = [uv(i), uv(i + 1)];
    return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
  });
}

/** Satellite minus model over paired points: RMS vector difference and mean speed bias, m/s. */
export function scatVsModel(obs: readonly (readonly number[])[], model: readonly (readonly number[])[]): { rms: number; speedBias: number; n: number } {
  let n = 0, sq = 0, sb = 0;
  obs.forEach((o, i) => {
    const m = model[i];
    if (!m || !Number.isFinite(m[0]) || !Number.isFinite(m[1])) return;
    n++;
    sq += (o[2] - m[0]) ** 2 + (o[3] - m[1]) ** 2;
    sb += Math.hypot(o[2], o[3]) - Math.hypot(m[0], m[1]);
  });
  return { rms: n ? Math.sqrt(sq / n) : NaN, speedBias: n ? sb / n : NaN, n };
}

/** Days since the newest pass that saw at least CLOUDED_OUT of the sea. */
function lastClear(list: Pass[], now: number): number {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].clear >= CLOUDED_OUT) return (now - list[i].obsMs) / 864e5;
  return Infinity;
}

type PassKind = 'sst' | 'chl' | 'scat';
const getJson = async (url: string): Promise<unknown> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} from Open-Meteo`);
  return r.json();
};

/**
 * Verify checks: manifest, relay age, newest pass, the newest clear pass, range, pass SST against
 * the MUR analysis, and ASCAT wind against the forecast model at the pass time (`fetchJson` is
 * injectable for tests).
 */
export function passChecks(load: () => Promise<PassData>, loadAnalysis?: () => Promise<SatelliteData>, fetchJson: (url: string) => Promise<unknown> = getJson): Check[] {
  let cached: Promise<PassData> | null = null;
  const need = async (k: PassKind) => {
    const s = (await (cached ??= load()))[k];
    if (!s) throw new Error(`no ${k} passes published`);
    return s;
  };
  const feed = (k: PassKind) => `${k}-pass`;
  const lag = (k: PassKind, warn: number, fail: number) => async (): Promise<Outcome> => {
    const s = await need(k);
    const d = (Date.now() - s.meta.times[s.meta.times.length - 1]) / 864e5;
    return { status: d > fail ? 'fail' : d > warn ? 'warn' : 'pass', detail: `newest pass ${d.toFixed(1)} d ago` };
  };
  // Cloud is weather, not a fault: a week with no clear pass is amber, never red.
  const clear = (k: PassKind, v: string, warn: number) => async (): Promise<Outcome> => {
    const list = passList(await need(k), v);
    const d = lastClear(list, Date.now());
    const share = list.length ? Math.round(100 * list[list.length - 1].clear) : 0;
    return { status: d > warn ? 'warn' : 'pass', detail: `${Number.isFinite(d) ? `last clear pass ${d.toFixed(1)} d ago` : 'no clear pass this week'}; newest ${share}% clear` };
  };
  const schema = (k: PassKind) => async (): Promise<Outcome> => {
    const p = validateMeta((await need(k)).meta);
    return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
  };
  const all = (s: GridSeries, v: string) => s.values[v].flatMap((f) => Array.from(f));
  const checks: Check[] = [
    { feed: feed('sst'), kind: 'schema', label: 'Manifest is well formed', run: schema('sst') },
    { feed: feed('sst'), kind: 'fresh', label: 'Relayed within the last 12 h', run: async () => freshness(Date.now() - Date.parse((await need('sst')).meta.fetchedAt), 6 * 3.6e6) },
    { feed: feed('sst'), kind: 'fresh', label: 'Newest pass under 2 days old', run: lag('sst', 2, 4) },
    { feed: feed('sst'), kind: 'fresh', label: 'A clear pass in the last 3 days', run: clear('sst', 'sst', 3) },
    // Cloudy cells are NaN, so allow up to 100% missing; the clear-pass check covers that.
    { feed: feed('sst'), kind: 'range', label: 'Values within 15..35 °C', run: async () => inRange(all(await need('sst'), 'sst'), 15, 35, '°C', 1) },
    { feed: feed('chl'), kind: 'schema', label: 'Manifest is well formed', run: schema('chl') },
    { feed: feed('chl'), kind: 'fresh', label: 'Newest pass under 5 days old', run: lag('chl', 5, 10) },
    { feed: feed('chl'), kind: 'fresh', label: 'A clear pass in the last 7 days', run: clear('chl', 'chl', 7) },
    { feed: feed('scat'), kind: 'schema', label: 'Manifest is well formed', run: schema('scat') },
    // A stale relay here usually means the Copernicus Marine login failed in the data build.
    { feed: feed('scat'), kind: 'fresh', label: 'Relayed within the last 12 h', run: async () => freshness(Date.now() - Date.parse((await need('scat')).meta.fetchedAt), 6 * 3.6e6) },
    // Interim daily files: the newest pass is usually 12 to 36 h old.
    { feed: feed('scat'), kind: 'fresh', label: 'Newest pass under 2 days old', run: lag('scat', 2, 4) },
    // Swath gaps, not cloud: a few days with no swath over the box is unusual but not a fault.
    { feed: feed('scat'), kind: 'fresh', label: 'A covering pass in the last 3 days', run: clear('scat', 'u', 3) },
    { feed: feed('scat'), kind: 'range', label: 'Speeds within 0..50 m/s', run: async () => {
      const s = await need('scat');
      const sp: number[] = [];
      s.values.u.forEach((u, k) => u.forEach((x, i) => Number.isFinite(x) && sp.push(Math.hypot(x, s.values.v[k][i]))));
      return sp.length ? inRange(sp, 0, 50, 'm/s', 1) : { status: 'warn', detail: 'no cells seen' };
    } },
    { feed: feed('scat'), kind: 'agree', label: 'Satellite wind matches the forecast model', run: async () => {
      const s = await need('scat');
      const list = passList(s, 'u');
      let k = list.length - 1;
      while (k >= 0 && list[k].clear < CLOUDED_OUT) k--;
      if (k < 0) return { status: 'warn', detail: 'no covering pass to compare' };
      const pts = scatSamples(s, k);
      const { rms, speedBias, n } = scatVsModel(pts, modelWindAt(await fetchJson(scatModelUrl(pts, s.meta.times[k])), s.meta.times[k]));
      if (!n) return { status: 'warn', detail: 'no model wind at the pass time' };
      // ASCAT against a global model is typically 1.5 to 2.5 m/s RMS vector difference in open sea;
      // squalls under the swath can push one pass past that, so amber first.
      const detail = `RMS ${rms.toFixed(1)} m/s over ${n} cells, speed ${speedBias >= 0 ? '+' : ''}${speedBias.toFixed(1)} m/s vs model`;
      return { status: rms > 6 ? 'fail' : rms > 3.5 ? 'warn' : 'pass', detail };
    } },
  ];
  if (loadAnalysis)
    checks.push({ feed: feed('sst'), kind: 'agree', label: 'Pass SST matches the MUR analysis', run: async () => {
      const { bias, n } = passBias(await need('sst'), await loadAnalysis());
      if (!n) return { status: 'warn', detail: 'no clear cells to compare' };
      // Afternoon skin SST runs a few tenths warm of the foundation analysis on calm days.
      const a = Math.abs(bias);
      return { status: a > 1.5 ? 'fail' : a > 0.8 ? 'warn' : 'pass', detail: `mean pass − MUR ${bias >= 0 ? '+' : ''}${bias.toFixed(2)} °C over ${n} cells` };
    } });
  return checks;
}
